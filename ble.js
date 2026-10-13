// Bluetooth to the Android app. A web page cannot wait to be found, but in a browser with Web Bluetooth
// (Bluefy on the iPhone, Chrome on Android) it can connect to an Android phone that waits on the screen
// "Synchroniseren met iPhone". The two talk in the same SyncMessage JSON as the files. Mirrors BleProto in BleSync.kt.

export const SERVICE = '1be30000-e6ea-485c-bb58-2d8b795595ec';
const INFO = '1be30001-e6ea-485c-bb58-2d8b795595ec';
const OUT = '1be30002-e6ea-485c-bb58-2d8b795595ec';
const IN = '1be30003-e6ea-485c-bb58-2d8b795595ec';

export const VERSION = 1;
const MAX_VALUE = 512; // the longest value one Bluetooth LE read or write may carry
const OP = { PULL: 1, PUSH_BEGIN: 2, PUSH_DATA: 3, DONE: 4 };
export const ENC = { JSON: 0, GZIP: 1 };

export const available = () => typeof navigator !== 'undefined' && !!navigator.bluetooth?.requestDevice;

// ------------------------------------------------------------------ wire format (pure, tested in node)

export const canGzip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeMessage(msg, gzip = canGzip()) {
  const json = new TextEncoder().encode(JSON.stringify(msg));
  return gzip ? { enc: ENC.GZIP, body: await pipe(json, new CompressionStream('gzip')) } : { enc: ENC.JSON, body: json };
}

/** The message's JSON text. */
export async function decodeMessage(enc, body) {
  const raw = enc === ENC.GZIP ? await pipe(body, new DecompressionStream('gzip')) : body;
  return new TextDecoder().decode(raw);
}

/** The writes that carry one message: PUSH_BEGIN [id:4][length:4][encoding] data, then PUSH_DATA data. */
export function pushFrames(id, enc, body, max = MAX_VALUE) {
  const frames = [];
  const first = new Uint8Array(Math.min(max, 10 + body.length));
  const dv = new DataView(first.buffer);
  first[0] = OP.PUSH_BEGIN;
  dv.setInt32(1, id);
  dv.setInt32(5, body.length);
  first[9] = enc;
  let pos = first.length - 10;
  first.set(body.subarray(0, pos), 10);
  frames.push(first);
  while (pos < body.length) {
    const n = Math.min(max - 1, body.length - pos);
    const f = new Uint8Array(1 + n);
    f[0] = OP.PUSH_DATA;
    f.set(body.subarray(pos, pos + n), 1);
    frames.push(f);
    pos += n;
  }
  return frames;
}

/** Collects OUT reads: [encoding][length:4][body]. add() returns { enc, body } once complete. */
export class PullReader {
  constructor() {
    this.buf = new Uint8Array(0);
    this.total = -1;
  }

  add(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length);
    b.set(this.buf);
    b.set(chunk, this.buf.length);
    this.buf = b;
    if (this.total < 0 && b.length >= 5) this.total = new DataView(b.buffer).getInt32(1);
    if (this.total < 0 || b.length < 5 + this.total) return null;
    return { enc: b[0], body: b.slice(5, 5 + this.total) };
  }
}

export function newMessageId() {
  const a = new Int32Array(1);
  do crypto.getRandomValues(a); while (a[0] === 0);
  return a[0];
}

// ------------------------------------------------------------------ the connection

const bytes = (dv) => new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(p, ms, message) {
  let t;
  return Promise.race([p, new Promise((_, no) => { t = setTimeout(() => no(new Error(message)), ms); })]).finally(() => clearTimeout(t));
}

/** Shows the browser's list of nearby SI Geweer phones; null when the user closes it. */
export async function pickPhone() {
  try {
    return await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE] }] });
  } catch (e) {
    // closing the list is a NotFoundError too; Bluetooth being off says something about the adapter
    if (e?.name === 'AbortError') return null;
    if (e?.name === 'NotFoundError' && !/adapter|available|powered|turned off/i.test(e.message ?? '')) return null;
    throw e;
  }
}

/** One Android phone. Every Bluetooth step waits for the previous one. */
export class Link {
  constructor(device) {
    this.device = device;
    this.chars = null;
    this.queue = Promise.resolve();
    this.mtu = 0; // the packet size the Android phone agreed with this phone; 0 = not known
  }

  get connected() { return !!(this.chars && this.device.gatt?.connected); }

  run(step) {
    const p = this.queue.then(step);
    this.queue = p.catch(() => {});
    return p;
  }

  connect() {
    return this.run(async () => {
      if (this.connected) return;
      this.chars = null;
      const server = await withTimeout(this.device.gatt.connect(), 15000,
        "Verbinden lukt niet. Staat 'Synchroniseren met iPhone' open op die telefoon? Tik dan op Verbind en kies hem opnieuw; staat hij twee keer in de lijst, kies dan de andere.");
      const svc = await server.getPrimaryService(SERVICE);
      const info = await svc.getCharacteristic(INFO);
      const out = await svc.getCharacteristic(OUT);
      const inn = await svc.getCharacteristic(IN);
      this.chars = { info, out, in: inn };
    });
  }

  disconnect() {
    this.chars = null;
    try { this.device.gatt?.disconnect(); } catch { /* already gone */ }
  }

  write(value) {
    const c = this.chars.in;
    return c.writeValueWithResponse ? c.writeValueWithResponse(value) : c.writeValue(value);
  }

  readInfo() {
    return this.run(async () => {
      const info = JSON.parse(new TextDecoder().decode(bytes(await this.chars.info.readValue())));
      this.mtu = info.mtu > 23 ? info.mtu : 0;
      return info;
    });
  }

  /** The Android phone's own state: the JSON text of its SyncMessage. */
  pull() {
    return this.run(async () => {
      await this.write(Uint8Array.of(OP.PULL, canGzip() ? 1 : 0));
      const r = new PullReader();
      for (;;) {
        const v = bytes(await this.chars.out.readValue());
        if (!v.length) throw new Error('De gegevens kwamen niet compleet binnen.');
        const done = r.add(v);
        if (done) return decodeMessage(done.enc, done.body);
      }
    });
  }

  /** Sends a SyncMessage; returns its id (the Android phone reports it in INFO once taken in). */
  push(msg) {
    return this.run(async () => {
      const id = newMessageId();
      const { enc, body } = await encodeMessage(msg);
      // writes that fit one packet when the size is known; otherwise 512 and Bluetooth splits them ("long write")
      const size = this.mtu ? Math.max(20, Math.min(MAX_VALUE, this.mtu - 3)) : MAX_VALUE;
      for (const f of pushFrames(id, enc, body, size)) await this.write(f);
      return id;
    });
  }

  /** Waits until the Android phone has taken message [id] in; returns its INFO. */
  async waitTaken(id, ms = 10000) {
    const until = Date.now() + ms;
    for (;;) {
      const info = await this.readInfo();
      if (info.got === id) return info;
      if (Date.now() > until) throw new Error('De Android-telefoon reageert niet.');
      await sleep(250);
    }
  }

  done() {
    return this.run(() => this.write(Uint8Array.of(OP.DONE)));
  }
}

/** Plain Dutch for what Web Bluetooth throws. */
export function describe(e) {
  const m = e?.message ?? String(e);
  if (e?.name === 'NetworkError') return 'De verbinding viel weg. Houd de telefoons dicht bij elkaar en probeer opnieuw.';
  if (e?.name === 'SecurityError' || e?.name === 'NotAllowedError') return 'Bluetooth mag niet gebruikt worden. Geef de app toestemming voor Bluetooth.';
  if (e?.name === 'NotFoundError') return /adapter|available|bluetooth/i.test(m) ? 'Bluetooth staat uit. Zet het aan en probeer opnieuw.' : m;
  if (e?.name === 'NotSupportedError') return 'Deze telefoon of browser ondersteunt dit niet.';
  return m;
}
