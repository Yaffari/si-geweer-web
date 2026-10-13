// SI Geweer for iPhone: the Android app's screens as an offline web app (home-screen app on iOS).
// One render function per screen; clicks are routed through data-act, typing through data-input.
import * as L from './logic.js';
import { Store } from './store.js';

const VERSION = '2026.10.13-1013';
const S = new Store();
const $app = document.getElementById('app');
const $dlg = document.getElementById('dialog');
const $toast = document.getElementById('toast');

const ui = {
  stack: [{ name: S.me.name ? 'home' : 'welcome' }],
  tab: 'RATINGS',
  draft: S.draft, // the beoordeling being filled in (also on disk)
  dialog: null,
};

// ------------------------------------------------------------------ helpers

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => L.todayStr();
const cur = () => S.active();
const screen = () => ui.stack[ui.stack.length - 1];
const GRADE_LABEL = { GOOD: 'Goed', FAIR: 'Matig', POOR: 'Onvoldoende' };
const GENDER_LABEL = { MALE: 'man', FEMALE: 'vrouw' };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// Material icon paths (Apache 2.0)
const PATHS = {
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  chev: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  sync: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  cal: 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
  share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  camera: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
};
const icon = (n, size = 24) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[n]}"/></svg>`;

/** The male (blue) or female (pink) symbol, the same drawing as on Android. */
function genderIcon(g, size = 20) {
  const body = g === 'FEMALE'
    ? '<circle cx="12" cy="8.64" r="6"/><path d="M12 14.64V22.56M7.92 18.48H16.08"/>'
    : '<circle cx="9.6" cy="14.4" r="6"/><path d="M13.84 10.16L20.64 3.36M20.64 3.36H14.16M20.64 3.36V9.84"/>';
  return `<svg class="gi ${g === 'FEMALE' ? 'female' : 'male'}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

/** The app icon: a target whose outer ring holds the three rating colours. */
const mark = (size) => `<div class="appmark" style="width:${size}px;height:${size}px"><svg viewBox="22 22 64 64" aria-hidden="true">
  <path d="M58.17,30.36 A24,24 0 0,1 76.55,62.21" stroke="#3FB561"/><path d="M72.39,69.43 A24,24 0 0,1 35.62,69.43" stroke="#F5A524"/>
  <path d="M31.45,62.21 A24,24 0 0,1 49.83,30.36" stroke="#E5484D"/><circle cx="54" cy="54" r="13" class="ring"/><circle cx="54" cy="54" r="4.8" class="dot"/></svg></div>`;

function topBar({ title, sub = null, back = false, close = false, actions = '' }) {
  const nav = back
    ? `<button class="iconbtn" data-act="back" aria-label="Terug">${icon('back')}</button>`
    : close ? `<button class="iconbtn" data-act="rate-close" aria-label="Stoppen">${icon('close')}</button>` : '<span class="navpad"></span>';
  return `<header class="top">${nav}<div class="titles"><div class="title">${esc(title)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div><div class="actions">${actions}</div></header>`;
}

const attrs = (data) => Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');

function big({ act, data = {}, title, sub = null, ic = null, primary = false }) {
  return `<button class="big${primary ? ' primary' : ''}" data-act="${act}" ${attrs(data)}>
    ${ic ? `<span class="bigicon">${icon(ic, primary ? 32 : 26)}</span>` : ''}
    <span class="bigtext"><span class="bigtitle">${esc(title)}</span>${sub ? `<span class="bigsub">${esc(sub)}</span>` : ''}</span>
    <span class="chev">${icon('chev')}</span></button>`;
}

const tile = (act, data, ic, title, sub) =>
  `<button class="tile" data-act="${act}" ${attrs(data)}><span class="tileicon">${icon(ic, 28)}</span><span class="tiletitle">${esc(title)}</span><span class="tilesub">${esc(sub)}</span></button>`;

const info = (text, title = null, kind = '') =>
  `<div class="info ${kind}">${title ? `<div class="infotitle">${esc(title)}</div>` : ''}<div class="infotext">${esc(text)}</div></div>`;

/** One day of one cursist: voor | tijdens | na stripes, one band per beoordeling. */
function cell(ratings, cls = '') {
  if (!ratings.length) return `<div class="cell empty ${cls}"></div>`;
  return `<div class="cell ${cls}">${ratings.map((r) => `<div class="band">${L.PHASES.map((p) => `<i class="g-${r[p.key].grade ?? 'none'}"></i>`).join('')}</div>`).join('')}</div>`;
}

function pbar(sum, cls = '') {
  if (!sum.total) return `<div class="pbar empty ${cls}"></div>`;
  const w = (n) => `${(100 * n) / sum.total}%`;
  return `<div class="pbar ${cls}"><i class="g-GOOD" style="width:${w(sum.good)}"></i><i class="g-FAIR" style="width:${w(sum.fair)}"></i><i class="g-POOR" style="width:${w(sum.poor)}"></i></div>`;
}

function installHint() {
  if (!isIOS || standalone) return '';
  return info(
    "Tik in Safari op Deel (het vierkantje met de pijl omhoog) en kies 'Zet op beginscherm'. Open de app daarna altijd via dat icoon: " +
      'dan werkt hij zonder internet. Let op: Safari en de app op het beginscherm bewaren hun gegevens apart.',
    'Zet SI Geweer op je beginscherm',
    'warn',
  );
}

let toastTimer = 0;
function toast(text) {
  $toast.textContent = text;
  $toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('on'), 3200);
}

// ------------------------------------------------------------------ navigation

const INIT = {
  welcome(s) { s.nameText = S.me.name; },
  newCourse(s) { s.start = L.nextWorkday(today()); s.weekText = String(L.isoWeek(s.start)); },
  editCourse(s) { const c = S.courses.get(s.id); s.start = c.startDate; s.weekText = String(c.week); },
  students(s) { s.gender = 'MALE'; s.input = ''; },
  scan(s) { s.text = ''; s.rows = []; s.skipped = []; },
  settings(s) { s.nameText = S.me.name; },
};

function go(name, params = {}) {
  const s = { name, ...params };
  INIT[name]?.(s);
  ui.stack.push(s);
  render(true);
}

function replace(name, params = {}) {
  const s = { name, ...params };
  INIT[name]?.(s);
  ui.stack[ui.stack.length - 1] = s;
  render(true);
}

function back() {
  if (ui.stack.length > 1) {
    ui.stack.pop();
    render(true);
  }
}

function home() {
  ui.stack = [{ name: 'home' }];
  ui.tab = 'RATINGS';
  render(true);
}

function render(top = false) {
  const s = screen();
  $app.innerHTML = (SCREENS[s.name] ?? SCREENS.home)(s);
  if (top) window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ dialogs

function openDialog(d) {
  ui.dialog = d;
  renderDialog();
}

function closeDialog() {
  ui.dialog = null;
  renderDialog();
}

function renderDialog() {
  const d = ui.dialog;
  if (!d) {
    $dlg.innerHTML = '';
    return;
  }
  const buttons = (d.buttons ?? []).map((b) => `<button class="text${b.danger ? ' danger' : ''}" data-act="${b.act}" ${attrs(b.data ?? {})}>${esc(b.label)}</button>`).join('');
  $dlg.innerHTML = `<div class="scrim" data-act="dlg-close"></div><div class="dialog" role="dialog" aria-modal="true">
    ${d.title ? `<h2>${esc(d.title)}</h2>` : ''}<div class="dlgbody">${d.body ?? ''}</div><div class="dlgbtns">${buttons}</div></div>`;
  $dlg.querySelector('input')?.focus();
}

function confirm({ title, text, ok, cancel = 'Annuleren', danger = false, onOk }) {
  openDialog({
    title,
    body: `<p>${esc(text)}</p>`,
    buttons: [{ label: cancel, act: 'dlg-close' }, { label: ok, act: 'dlg-ok', danger }],
    onOk,
  });
}

function dayPicker(c, selected, onPick) {
  const st = L.dayStatus(c.startDate, today());
  const todayDay = st.kind === 'today' ? st.day : 0;
  const rows = L.courseDates(c.startDate).map((d, i) => {
    const day = i + 1;
    return `<button class="pickrow${day === selected ? ' on' : ''}" data-act="dlg-pick" data-day="${day}"><span class="radio"></span>
      <span>Dag ${day} · ${esc(L.nl.short(d))}${day === todayDay ? ' <b>(vandaag)</b>' : ''}</span></button>`;
  }).join('');
  openDialog({ title: 'Welke dag?', body: `<div class="picklist">${rows}</div>`, buttons: [{ label: 'Sluiten', act: 'dlg-close' }], onPick });
}

function menu() {
  const c = cur();
  const leader = c && S.isLeader(c);
  const item = (label, to, data = {}) => `<button class="menuitem" data-act="menu-go" data-to="${to}" ${attrs(data)}>${esc(label)}</button>`;
  openDialog({
    title: null,
    body: `<div class="menu">${item('Cursussen', 'courses')}${leader ? item('Cursus wijzigen', 'editCourse', { id: c.id }) : ''}${item('Synchroniseren', 'sync')}${item('Instellingen', 'settings')}</div>`,
    buttons: [{ label: 'Sluiten', act: 'dlg-close' }],
  });
}

// ------------------------------------------------------------------ screens

const SCREENS = {
  welcome(s) {
    return `<main class="page narrow">
      ${installHint()}
      <div class="markwrap">${mark(72)}</div>
      <h1 class="display">SI Geweer</h1>
      <p class="muted">Beoordelingen voor de cursus, op je eigen telefoon. Alles blijft op de telefoon; aan het eind van de dag synchroniseer je met de cursusleider.</p>
      <label class="field"><span>Je naam</span>
        <input id="welcome-name" data-input="nameText" value="${esc(s.nameText)}" placeholder="bijv. Sgt1 Jansen" maxlength="40" autocomplete="off" autocapitalize="words" enterkeyhint="done"></label>
      <p class="hint">Deze naam staat bij je beoordelingen.</p>
      <button class="btn primary wide" data-act="welcome-done">Verder</button>
    </main>`;
  },

  home() {
    const c = cur();
    if (!c) return startScreen();
    const leader = S.isLeader(c);
    const body = ui.tab === 'ROSTER' ? rosterTab(c, leader) : ui.tab === 'TEAM' ? teamTab(c, leader) : ratingsTab(c, leader);
    const tabs = [['RATINGS', 'edit', 'Beoordelen'], ['ROSTER', 'cal', 'Rooster'], ['TEAM', 'person', 'Team']]
      .map(([k, ic, label]) => `<button class="tab${ui.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}"><span class="tabicon">${icon(ic)}</span><span>${label}</span></button>`)
      .join('');
    return topBar({
      title: L.courseTitle(c),
      sub: `${leader ? 'Cursusleider' : 'Instructeur'} · ${S.me.name}`,
      actions: `<button class="iconbtn" data-act="menu" aria-label="Menu">${icon('more')}</button>`,
    }) + `<main class="page tabbed">${body}</main><nav class="tabbar">${tabs}</nav>`;
  },

  newCourse(s) { return courseEdit(s, null); },
  editCourse(s) { return courseEdit(s, S.courses.get(s.id)); },

  students(s) {
    const c = S.courses.get(s.id);
    if (!c) return SCREENS.home();
    return topBar({
      title: 'Cursisten', sub: L.courseTitle(c), back: true,
      actions: `<button class="textbtn" data-act="go" data-to="editCourse" data-id="${c.id}">Cursus</button>`,
    }) + `<main class="page">
      <div class="addrow">
        <button id="add-gender" class="gtoggle ${s.gender === 'FEMALE' ? 'female' : 'male'}" data-act="toggle-add-gender" aria-label="${GENDER_LABEL[s.gender]}, tik om te wisselen">${genderIcon(s.gender, 26)}<span>${GENDER_LABEL[s.gender]}</span></button>
        <textarea id="add-name" data-input="input" rows="1" placeholder="Achternaam" autocapitalize="words" autocomplete="off" enterkeyhint="done">${esc(s.input)}</textarea>
        <button class="fab" data-act="add-students" aria-label="Toevoegen">${icon('plus')}</button>
      </div>
      <p class="hint">Man of vrouw kies je met het knopje links (standaard man); in de lijst tik je op het teken om te wisselen. Tip: plak een hele lijst, één naam per regel.</p>
      <button class="btn outline wide" data-act="go" data-to="scan" data-id="${c.id}">${icon('camera')} Namen van een foto</button>
      <div id="student-list">${studentList(c)}</div>
    </main>
    <div class="bottombar"><button class="btn primary wide" data-act="list-done">${icon('check')} Lijst klaar</button></div>`;
  },

  /** A name list from a photo: iOS reads the text itself (Live Text), the app turns it into cursisten. */
  scan(s) {
    const c = S.courses.get(s.id);
    if (!c) return SCREENS.home();
    return topBar({ title: 'Namen van een foto', sub: L.courseTitle(c), back: true }) + `<main class="page">
      ${info("1. Tik in het vak hieronder en kies 'Scan tekst' (zie je die knop niet, houd dan je vinger in het vak). Richt de camera op de namenlijst en tik op 'Voeg in'.\n" +
        "2. Staat de lijst al op een foto? Open hem in Foto's, houd je vinger op een naam, kies 'Selecteer alles' en 'Kopieer', en plak hier.\n" +
        'De iPhone leest de tekst zelf, zonder internet. Daarna controleer je de namen.', 'Zo zet je een namenlijst erin')}
      <label class="field"><span>Gelezen tekst</span><textarea id="scan-text" data-input="scanText" rows="5" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Tik hier en kies Scan tekst">${esc(s.text)}</textarea></label>
      <div id="scan-preview">${scanPreview(s)}</div>
    </main>
    <div class="bottombar"><button id="scan-add" class="btn primary wide" data-act="scan-add">${scanAddLabel(s)}</button></div>`;
  },

  pick(s) {
    const c = cur();
    if (!c) return SCREENS.home();
    const me = S.me.deviceId;
    const st = L.dayStatus(c.startDate, today());
    const isToday = st.kind === 'today' && st.day === s.day;
    const date = L.courseDates(c.startDate)[s.day - 1];
    const per = new Map();
    for (const r of L.activeRatings(c).filter((r) => r.day === s.day).sort((a, b) => a.createdAt - b.createdAt)) {
      (per.get(r.studentId) ?? per.set(r.studentId, []).get(r.studentId)).push(r);
    }
    const students = L.activeStudents(c);
    const rows = students.map((st2) => {
      const rs = per.get(st2.id) ?? [];
      const mine = rs.filter((r) => r.authorId === me).length;
      const sub = rs.length
        ? `${L.nl.count(rs.length, 'beoordeling', 'beoordelingen')}${isToday ? ' vandaag' : ' op deze dag'}${mine ? ` (${mine === rs.length ? 'door jou' : `${mine} door jou`})` : ''}`
        : '';
      return `<button class="row tall" data-act="start-rating" data-id="${st2.id}" data-day="${s.day}">${genderIcon(st2.gender, 22)}
        <span class="rowtext"><span class="rowtitle">${esc(st2.name)}</span>${sub ? `<span class="rowsub">${esc(sub)}</span>` : ''}</span>
        ${rs.length ? cell(rs, 'mini') : ''}<span class="chev">${icon('chev')}</span></button>`;
    }).join('');
    return topBar({ title: 'Kies cursist', sub: 'Nieuwe beoordeling', back: true }) + `<main class="page flush">
      <button class="daybar" data-act="pick-day">${icon('cal')}<span class="daybartext"><b>Dag ${s.day}${isToday ? ' · vandaag' : ''}</b><span>${esc(L.cap(L.nl.long(date)))}</span></span><span class="link">Andere dag</span></button>
      ${students.length ? '' : `<div class="padx">${info(S.isLeader(c) ? 'Er staan nog geen cursisten op de lijst. Voeg ze toe via Cursisten op het startscherm.' : 'Er staan nog geen cursisten op de lijst. Lees het bestand van de cursusleider in via Synchroniseren.')}</div>`}
      <div class="list">${rows}</div>
    </main>`;
  },

  rate() {
    const d = ui.draft;
    const c = d && S.courses.get(d.courseId);
    const stu = c && L.student(c, d.studentId);
    if (!d || !c || !stu) {
      setDraft(null);
      ui.stack.pop();
      return SCREENS[screen().name](screen());
    }
    const editing = !!d.ratingId;
    const ph = L.PHASES[d.page];
    const sel = d[ph.key].grade;
    const steps = L.PHASES.map((p, i) => `<button class="step${i === d.page ? ' on' : ''}" data-act="rate-page" data-page="${i}"><i class="dot g-${d[p.key].grade ?? 'none'}"></i>${i + 1}. ${p.short}</button>`).join('');
    const grades = L.GRADES.map((g) => `<button class="grade g-${g}${sel === g ? ' on' : ''}" data-act="grade" data-g="${g}" aria-pressed="${sel === g}">
      <span class="gdot">${sel === g ? icon('check', 28) : ''}</span><span class="glabel">${GRADE_LABEL[g]}</span></button>`).join('');
    return topBar({
      title: stu.name,
      sub: `Dag ${d.day} · ${L.nl.short(L.courseDates(c.startDate)[d.day - 1])}${editing ? ' · aanpassen' : ''}`,
      close: true,
      actions: `<button class="textbtn" data-act="rate-day">Dag ${d.day}</button>`,
    }) + `<main class="page">
      <div class="stepper">${steps}</div>
      <h1 class="phase">${ph.title}</h1>
      <div class="grades">${grades}</div>
      <label class="field"><span>Notities (optioneel)</span><textarea id="note" data-input="note" rows="4" autocapitalize="sentences">${esc(d[ph.key].note)}</textarea></label>
      <p class="hint">Een kleur en notities zijn niet verplicht. Tik nog eens op een gekozen kleur om hem weg te halen.</p>
    </main>
    <div class="bottombar two">${d.page > 0 ? '<button class="btn outline" data-act="rate-prev">Vorige</button>' : ''}
      <button class="btn primary" data-act="rate-next">${d.page < 2 ? `Volgende ${icon('chev')}` : `${icon('check')} Opslaan`}</button></div>`;
  },

  overview() {
    const c = cur();
    if (!c) return SCREENS.home();
    const st = L.dayStatus(c.startDate, today());
    const todayDay = st.kind === 'today' ? st.day : 0;
    const ratings = L.activeRatings(c);
    const per = new Map();
    for (const r of [...ratings].sort((a, b) => a.createdAt - b.createdAt)) (per.get(r.studentId) ?? per.set(r.studentId, []).get(r.studentId)).push(r);
    const mode = S.sortMode;
    const students = L.rank(L.activeStudents(c), ratings, mode);
    const days = L.courseDates(c.startDate);
    const seg = L.SORTS.map((x) => `<button class="${mode === x.key ? 'on' : ''}" data-act="sort" data-sort="${x.key}">${x.label}</button>`).join('');
    const head = days.map((d, i) => `<div class="dh${i + 1 === todayDay ? ' today' : ''}"><b>${i + 1}</b><span>${L.nl.weekday(d)}</span></div>`).join('');
    const rows = students.map((s) => {
      const rs = per.get(s.id) ?? [];
      const cells = days.map((_, i) => cell(rs.filter((r) => r.day === i + 1), i + 1 === todayDay ? 'today' : '')).join('');
      return `<button class="grid gridrow" data-act="go" data-to="student" data-id="${s.id}">
        <span class="namecol"><span class="nm">${genderIcon(s.gender, 14)}<span>${esc(s.name)}</span></span>${pbar(L.summary(rs))}</span>${cells}</button>`;
    }).join('');
    const sample = { before: { grade: 'GOOD' }, during: { grade: 'FAIR' }, after: { grade: 'POOR' } };
    return topBar({ title: 'Overzicht', sub: `${L.courseTitle(c)} · ${L.nl.count(ratings.length, 'beoordeling', 'beoordelingen')}`, back: true }) + `<main class="page flush">
      <div class="seg">${seg}</div>
      <div class="grid gridhead"><span class="namecol muted small">Cursist</span>${head}</div>
      ${students.length ? rows : `<div class="padx">${info('Nog geen cursisten op de lijst.')}</div>`}
      <div class="legend">
        <div class="legrow">${cell([sample], 'sample')}<span>Elk vakje is één dag, met drie strepen: voor, tijdens en na het schieten. Meer beoordelingen op één dag staan onder elkaar.</span></div>
        <div class="legrow wrap">${L.GRADES.map((g) => `<span class="lg"><i class="dot g-${g}"></i>${GRADE_LABEL[g]}</span>`).join('')}<span class="lg"><i class="dot g-none"></i>geen kleur</span></div>
        <p class="hint">De balk onder een naam: verhouding groen / oranje / rood over alle dagen. Goed → slecht sorteert op dat gemiddelde; cursisten zonder kleur staan onderaan.</p>
      </div>
    </main>`;
  },

  student(s) {
    const c = cur();
    const stu = c && L.student(c, s.id);
    if (!c || !stu || stu.deleted) {
      ui.stack.pop();
      return SCREENS[screen().name](screen());
    }
    const me = S.me.deviceId;
    const leader = S.isLeader(c);
    const st = L.dayStatus(c.startDate, today());
    const todayDay = st.kind === 'today' ? st.day : 0;
    const rs = L.activeRatings(c).filter((r) => r.studentId === s.id).sort((a, b) => a.createdAt - b.createdAt);
    const sum = L.summary(rs);
    const days = L.courseDates(c.startDate);
    const strip = days.map((_, i) => `<div class="stripday">${cell(rs.filter((r) => r.day === i + 1), i + 1 === todayDay ? 'today' : '')}<span>${i + 1}</span></div>`).join('');
    let sections = '';
    for (let day = 1; day <= 7; day++) {
      const dayRs = rs.filter((r) => r.day === day);
      if (!dayRs.length) continue;
      sections += `<h3 class="dayhead">Dag ${day} · ${esc(L.nl.long(days[day - 1]))}</h3>` + dayRs.map((r) => ratingCard(r, r.authorId === me, leader)).join('');
    }
    return topBar({ title: stu.name, sub: L.courseTitle(c), back: true }) + `<main class="page">
      <section class="card">
        <div class="sumhead">${genderIcon(stu.gender, 20)}<b>${sum.total ? `${sum.good} goed · ${sum.fair} matig · ${sum.poor} onvoldoende` : 'Nog geen kleuren gegeven'}</b></div>
        ${pbar(sum, 'thick')}
        <div class="strip">${strip}</div>
      </section>
      ${rs.length ? sections : `<p class="muted center">Nog geen beoordelingen voor ${esc(stu.name)}.</p>`}
      <div class="fabspace"></div>
    </main>
    <button class="efab" data-act="start-rating" data-id="${stu.id}" data-day="${L.defaultDay(st)}">${icon('plus')} Nieuwe beoordeling</button>`;
  },

  sync() {
    const c = cur();
    const leader = c && S.isLeader(c);
    const steps = leader
      ? '1. Laat de instructeurs hun bestand naar jou sturen (WhatsApp, mail of AirDrop).\n' +
        "2. Bewaar de ontvangen bestanden in Bestanden (in WhatsApp: tik op het bestand, dan Deel en 'Bewaar in Bestanden') en lees ze hier allemaal in.\n" +
        "3. Tik op 'Bestand versturen' en stuur het totaal naar iedereen, bijvoorbeeld in de WhatsApp-groep.\n" +
        "4. Op Android tikken de instructeurs op het bestand en kiezen 'Openen met SI Geweer'."
      : "1. Tik op 'Bestand versturen' en stuur het naar de cursusleider (WhatsApp, mail of AirDrop).\n" +
        '2. Krijg je het totaalbestand van de cursusleider? Bewaar het in Bestanden en lees het hier in.';
    return topBar({ title: 'Synchroniseren', sub: c ? L.courseTitle(c) : null, back: true }) + `<main class="page">
      <p class="lead">Op de iPhone gaat synchroniseren met een bestand: zo werkt het met iedere telefoon, ook met Android.</p>
      ${c ? big({ act: 'share-file', title: 'Bestand versturen', sub: leader ? 'Alles wat op jouw telefoon staat, voor de instructeurs' : 'Jouw beoordelingen, voor de cursusleider', ic: 'share', primary: true }) : ''}
      ${big({ act: 'import-files', title: 'Bestanden inlezen', sub: 'Kies één of meer ontvangen bestanden', ic: 'download', primary: !c })}
      ${info(steps, 'Zo werkt het')}
    </main>${filePicker()}`;
  },

  join() {
    return topBar({ title: 'Deelnemen aan een cursus', back: true }) + `<main class="page">
      <p class="lead">Vraag de cursusleider om het cursusbestand, via WhatsApp, mail of AirDrop. Bewaar het in Bestanden en kies het hier: dan heb je de cursus en de namen.</p>
      ${big({ act: 'import-files', title: 'Bestand kiezen', sub: 'Het bestand van de cursusleider', ic: 'download', primary: true })}
    </main>${filePicker()}`;
  },

  courses() {
    const list = [...S.courses.values()].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    const active = cur();
    const cards = list.map((c) => {
      const days = L.courseDates(c.startDate);
      return `<div class="ccard${c.id === active?.id ? ' on' : ''}"><button class="ccmain" data-act="set-active" data-id="${c.id}">
        <b>${esc(L.courseTitle(c))}</b><span>${esc(L.nl.short(days[0]))} – ${esc(L.nl.short(days[6]))} · ${S.isLeader(c) ? 'jij bent cursusleider' : `cursusleider ${esc(c.leaderName)}`}</span>
        <span class="muted small">${L.nl.count(L.activeStudents(c).length, 'cursist', 'cursisten')} · ${L.nl.count(L.activeRatings(c).length, 'beoordeling', 'beoordelingen')}${c.id === active?.id ? ' · open' : ''}</span></button>
        <button class="iconbtn" data-act="delete-course" data-id="${c.id}" aria-label="Van deze telefoon verwijderen">${icon('trash')}</button></div>`;
    }).join('');
    return topBar({ title: 'Cursussen', sub: 'Op deze telefoon', back: true }) + `<main class="page">${cards}
      ${big({ act: 'go', data: { to: 'newCourse' }, title: 'Nieuwe cursus aanmaken', sub: 'Je wordt de cursusleider', ic: 'plus' })}
      ${big({ act: 'go', data: { to: 'join' }, title: 'Deelnemen aan een cursus', sub: 'Lees het cursusbestand van de cursusleider in', ic: 'download' })}</main>`;
  },

  settings(s) {
    const off = L.offDays(S.standard);
    return topBar({ title: 'Instellingen', back: true }) + `<main class="page">
      ${installHint()}
      <label class="field"><span>Je naam</span><input id="settings-name" data-input="nameText" value="${esc(s.nameText)}" maxlength="40" autocapitalize="words" autocomplete="off"></label>
      <p class="hint">Staat bij nieuwe beoordelingen en is zichtbaar voor de cursusleider.</p>
      <button class="btn primary" data-act="save-name">Opslaan</button>
      ${big({ act: 'go', data: { to: 'myRoster' }, title: 'Mijn standaardrooster', sub: off.length ? `Niet op ${off.map(L.nl.weekdayAt).join(', ')}` : 'Elke werkdag beschikbaar', ic: 'cal' })}
      ${info('De app gebruikt geen internet en bewaart alles op deze telefoon. Synchroniseren gaat met een bestand dat je zelf verstuurt.', 'Alles blijft op deze telefoon')}
      <p class="muted small">Versie ${VERSION}</p>
    </main>`;
  },

  myRoster() {
    const days = S.standard?.weekdays ?? [true, true, true, true, true];
    const off = days.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const tiles = days.map((ok, i) => `<button class="stdday ${ok ? 'yes' : 'no'}" data-act="std-toggle" data-i="${i}" aria-label="${L.nl.weekdayLongAt(i)}: ${ok ? 'beschikbaar' : 'niet beschikbaar'}">
      <b>${L.nl.weekdayAt(i)}</b>${icon(ok ? 'check' : 'close', 26)}</button>`).join('');
    return topBar({ title: 'Mijn standaardrooster', sub: 'Wanneer ben je normaal beschikbaar?', back: true }) + `<main class="page">
      <p class="lead">Tik op een dag om hem aan of uit te zetten.</p>
      <div class="stdrow">${tiles}</div>
      <p class="strong">${off.length ? `Niet beschikbaar op ${off.map(L.nl.weekdayLongAt).join(', ')}.` : 'Je bent elke werkdag beschikbaar.'}</p>
      ${info("De cursusleider ziet dit in het rooster van elke cursus waar je aan meedoet, ook als je pas later deelneemt. De cursusleider kan het per dag aanpassen. Het gaat mee in elk bestand dat je verstuurt.")}
    </main>`;
  },
};

function startScreen() {
  return topBar({ title: 'SI Geweer', sub: S.me.name, actions: `<button class="iconbtn" data-act="go" data-to="settings" aria-label="Instellingen">${icon('settings')}</button>` }) + `<main class="page">
    ${installHint()}
    <div class="markwrap">${mark(56)}</div>
    <h2 class="h2">Nog geen cursus op deze telefoon</h2>
    ${big({ act: 'go', data: { to: 'newCourse' }, title: 'Nieuwe cursus aanmaken', sub: 'Je wordt de cursusleider', ic: 'plus', primary: true })}
    ${big({ act: 'go', data: { to: 'join' }, title: 'Deelnemen aan een cursus', sub: 'Lees het cursusbestand van de cursusleider in', ic: 'download' })}
    ${big({ act: 'go', data: { to: 'myRoster' }, title: 'Mijn standaardrooster', sub: 'Op welke dagen ben je normaal beschikbaar?', ic: 'cal' })}
  </main>`;
}

function dayCard(c, st) {
  const days = L.courseDates(c.startDate);
  let head;
  switch (st.kind) {
    case 'today': head = `<div class="dc-big">Dag ${st.day} van 7</div><div class="dc-sub">${esc(L.cap(L.nl.long(st.date)))}</div>`; break;
    case 'upcoming': head = `<div class="dc-mid">Begint ${esc(L.nl.long(st.first))}</div><div class="dc-sub">${st.daysUntil === 1 ? 'Morgen' : `Over ${st.daysUntil} dagen`}</div>`; break;
    case 'between': head = `<div class="dc-big">Weekend</div><div class="dc-sub">Dag ${st.nextDay} is ${esc(L.nl.long(st.nextDate))}</div>`; break;
    default: head = `<div class="dc-mid">Cursus afgerond</div><div class="dc-sub">Laatste dag was ${esc(L.nl.long(st.last))}</div>`;
  }
  const current = st.kind === 'today' ? st.day : 0;
  const done = st.kind === 'today' ? st.day - 1 : st.kind === 'between' ? st.lastDay : st.kind === 'finished' ? 7 : 0;
  const pills = days.map((d, i) => `<div class="pill${i + 1 === current ? ' cur' : i + 1 <= done ? ' done' : ''}"><b>${i + 1}</b><span>${L.nl.weekday(d)}</span></div>`).join('');
  return `<section class="daycard">${head}<div class="pills">${pills}</div></section>`;
}

function ratingsTab(c, leader) {
  const st = L.dayStatus(c.startDate, today());
  const students = L.activeStudents(c);
  const n = L.activeRatings(c).length;
  const last = S.lastSync(c.id);
  let out = dayCard(c, st);
  const d = ui.draft;
  if (d && d.courseId === c.id) {
    const who = L.student(c, d.studentId)?.name ?? 'cursist';
    out += `<div class="draft"><div><span class="small">Niet afgemaakt</span><b>${esc(who)} · dag ${d.day}</b></div>
      <button class="text" data-act="draft-discard">Weggooien</button><button class="btn primary" data-act="draft-continue">Verder</button></div>`;
  }
  if (st.kind === 'today') {
    out += big({ act: 'pick', data: { day: st.day }, title: 'Nieuwe beoordeling', sub: `Dag ${st.day} · ${L.nl.short(st.date)}`, ic: 'plus', primary: true });
  } else if (st.kind !== 'upcoming') {
    out += big({ act: 'pick', data: { day: L.defaultDay(st) }, title: 'Nieuwe beoordeling', sub: 'Voor een cursusdag die al geweest is', ic: 'plus' });
  }
  out += `<div class="tiles">${tile('go', { to: 'overview' }, 'list', 'Overzicht', L.nl.count(n, 'beoordeling', 'beoordelingen'))}${tile('go', { to: 'sync' }, 'sync', 'Synchroniseren', last ? L.nl.moment(last) : 'nog niet gedaan')}</div>`;
  if (leader) {
    out += big({ act: 'go', data: { to: 'students', id: c.id }, title: 'Cursisten', sub: students.length ? `${L.nl.count(students.length, 'cursist', 'cursisten')} op de lijst` : 'Nog niemand op de lijst', ic: 'group' });
  }
  if (!students.length) {
    out += info(leader
      ? 'Zet eerst de cursisten op de lijst. Stuur daarna het cursusbestand naar de instructeurs (Synchroniseren).'
      : 'Nog geen namen. Lees het bestand van de cursusleider in via Synchroniseren.', 'Lijst met cursisten');
  }
  return out;
}

function courseEdit(s, existing) {
  const days = L.courseDates(s.start);
  return topBar({ title: existing ? 'Cursus wijzigen' : 'Nieuwe cursus', back: true }) + `<main class="page">
    <h2 class="h2" id="ce-title">${esc(courseEditTitle(s))}</h2>
    <label class="field"><span>Weeknummer</span><input id="week" data-input="week" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${esc(s.weekText)}" autocomplete="off"></label>
    <p class="hint" id="ce-weekhint">${courseEditValid(s) ? 'Week en startdatum passen zich aan elkaar aan.' : 'Geen geldig weeknummer'}</p>
    <label class="field"><span>Eerste cursusdag</span><input id="start" type="date" data-input="start" value="${s.start}"></label>
    <p class="hint" id="ce-startlabel">${esc(L.cap(L.nl.long(s.start)))} ${s.start.slice(0, 4)}</p>
    <div class="label">De 7 cursusdagen (zaterdag en zondag tellen niet mee)</div>
    <div class="card" id="ce-days">${days.map((d, i) => `<div class="dayline"><b>Dag ${i + 1}</b><span>${esc(L.cap(L.nl.long(d)))}</span></div>`).join('')}</div>
  </main>
  <div class="bottombar"><button class="btn primary wide" data-act="course-save">${existing ? 'Opslaan' : 'Cursus aanmaken'}</button></div>`;
}

const courseEditValid = (s) => Number(s.weekText) === L.isoWeek(s.start);
const courseEditTitle = (s) => `SI Geweer (week ${courseEditValid(s) ? s.weekText : '?'})`;

/** Refresh what depends on the week and the date without touching the field being typed in. */
function refreshCourseEdit(s, skip) {
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('ce-title', esc(courseEditTitle(s)));
  set('ce-weekhint', courseEditValid(s) ? 'Week en startdatum passen zich aan elkaar aan.' : 'Geen geldig weeknummer');
  set('ce-startlabel', `${esc(L.cap(L.nl.long(s.start)))} ${s.start.slice(0, 4)}`);
  set('ce-days', L.courseDates(s.start).map((d, i) => `<div class="dayline"><b>Dag ${i + 1}</b><span>${esc(L.cap(L.nl.long(d)))}</span></div>`).join(''));
  if (skip !== 'week') document.getElementById('week').value = s.weekText;
  if (skip !== 'start') document.getElementById('start').value = s.start;
}

function studentList(c) {
  const students = L.activeStudents(c);
  return `<div class="label">${L.nl.count(students.length, 'cursist', 'cursisten')}</div><div class="list">${students.map((s) => `<div class="row">
    <button class="iconbtn" data-act="flip-gender" data-id="${s.id}" aria-label="${GENDER_LABEL[s.gender]}, tik om te wisselen">${genderIcon(s.gender, 24)}</button>
    <span class="rowtext"><span class="rowtitle">${esc(s.name)}</span></span>
    <button class="iconbtn" data-act="rename-student" data-id="${s.id}" aria-label="Naam wijzigen">${icon('edit')}</button>
    <button class="iconbtn" data-act="delete-student" data-id="${s.id}" aria-label="Verwijderen">${icon('trash')}</button></div>`).join('')}</div>`;
}

function scanPreview(s) {
  if (!s.rows.length) return s.text.trim() ? '<p class="muted">Nog geen namen herkend in deze tekst.</p>' : '';
  const rows = s.rows.map((r, i) => `<div class="srow${r.include ? '' : ' off'}">
    <button class="check${r.include ? ' on' : ''}" data-act="scan-include" data-i="${i}" aria-label="${r.include ? 'Wordt toegevoegd' : 'Wordt overgeslagen'}">${r.include ? icon('check', 20) : ''}</button>
    <button class="iconbtn" data-act="scan-gender" data-i="${i}" aria-label="${GENDER_LABEL[r.gender]}, tik om te wisselen">${genderIcon(r.gender, 22)}</button>
    <span class="snamewrap"><input class="sname" data-input="scanName" data-i="${i}" value="${esc(r.name)}" autocapitalize="words" autocomplete="off">${r.exists ? '<span class="small muted">staat al op de lijst</span>' : ''}</span></div>`).join('');
  return `<div class="label">${L.nl.count(s.rows.length, 'naam', 'namen')} gevonden. Controleer ze: tik op het teken voor man of vrouw, verbeter een naam of vink hem uit.</div>
    <div class="list">${rows}</div>${s.skipped.length ? `<p class="hint">Overgeslagen: ${esc(s.skipped.join(' · '))}</p>` : ''}`;
}

const scanAddLabel = (s) => `${icon('check')} Voeg ${L.nl.count(s.rows.filter((r) => r.include && r.name.trim()).length, 'cursist', 'cursisten')} toe`;

function refreshScan(s) {
  document.getElementById('scan-preview').innerHTML = scanPreview(s);
  document.getElementById('scan-add').innerHTML = scanAddLabel(s);
}

function parseScan(s) {
  const have = new Set(L.activeStudents(S.courses.get(s.id)).map((x) => x.name.toLocaleLowerCase('nl')));
  const p = L.parseNameList(s.text);
  s.rows = p.names.map((n) => {
    const exists = have.has(n.name.toLocaleLowerCase('nl'));
    return { name: n.name, gender: n.gender ?? 'MALE', include: !exists, exists };
  });
  s.skipped = p.skipped;
}

function ratingCard(r, mine, leader) {
  const phases = L.PHASES.map((p) => {
    const ps = r[p.key];
    return `<div class="rphase"><i class="dot g-${ps.grade ?? 'none'}"></i><div><div class="rpt">${p.title}${ps.grade ? ` · ${GRADE_LABEL[ps.grade]}` : ''}</div>${ps.note.trim() ? `<div class="rpn">${esc(ps.note)}</div>` : ''}</div></div>`;
  }).join('');
  const btns = mine || leader
    ? `<div class="rcbtns">${`<button class="text danger" data-act="delete-rating" data-id="${r.id}">Verwijderen</button>`}${mine ? `<button class="text" data-act="edit-rating" data-id="${r.id}">Aanpassen</button>` : ''}</div>`
    : '';
  return `<div class="rcard"><div class="rchead"><b>${esc(r.authorName)}${mine ? ' (jij)' : ''}</b><span>${esc(L.nl.moment(r.createdAt))}${r.updatedAt - r.createdAt > 60000 ? ' · aangepast' : ''}</span></div>${phases}${btns}</div>`;
}

function rosterTab(c, leader) {
  const me = S.me.deviceId;
  const st = L.dayStatus(c.startDate, today());
  const todayDay = st.kind === 'today' ? st.day : 0;
  const people = [[c.leaderId, c.leaderName], ...L.instructors(c).map((m) => [m.id, m.name])];
  const set = new Map(c.availability.map((a) => [`${a.memberId}/${a.day}`, a]));
  const cells = new Map(people.map(([id]) => [id, [1, 2, 3, 4, 5, 6, 7].map((d) => L.rosterCell(c, id, d, set))]));
  const days = L.courseDates(c.startDate);
  const head = days.map((d, i) => `<div class="dh${i + 1 === todayDay ? ' today' : ''}"><b>${i + 1}</b><span>${L.nl.weekday(d)}</span><span>${L.nl.dm(d)}</span></div>`).join('');
  const rows = people.map(([id, name]) => {
    const off = L.offDays(L.standardOf(c, id));
    const rc = cells.get(id).map((x, i) => {
      const fromStd = !x.available && x.source === 'STANDARD';
      return `<button class="rc ${x.available ? 'yes' : 'no'}${i + 1 === todayDay ? ' today' : ''}" data-act="roster-toggle" data-id="${esc(id)}" data-day="${i + 1}"
        aria-label="${esc(name)}, dag ${i + 1}: ${x.available ? 'beschikbaar' : 'niet beschikbaar'}${fromStd ? ' (standaardrooster)' : ''}">${icon(x.available ? 'check' : 'close', 20)}${fromStd ? '<i class="stddot"></i>' : ''}</button>`;
    }).join('');
    return `<div class="grid rosterrow"><span class="namecol"><span class="nm${id === me ? ' me' : ''}">${esc(name)}</span>
      <span class="small muted">${id === c.leaderId ? 'cursusleider' : 'instructeur'}${id === me ? ' · jij' : ''}</span>
      ${off.length ? `<span class="small bad">standaard niet op ${off.map(L.nl.weekdayAt).join(', ')}</span>` : ''}</span>${rc}</div>`;
  }).join('');
  const counts = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const n = people.filter(([id]) => cells.get(id)[i].available).length;
    return `<span class="count${n < people.length ? ' bad' : ''}">${n}/${people.length}</span>`;
  }).join('');
  return `<p class="muted">${leader
    ? 'Tik op een vakje om iemand beschikbaar of niet beschikbaar te zetten. De instructeurs zien het na het synchroniseren.'
    : 'De cursusleider maakt het rooster. Wijzigingen komen binnen als je synchroniseert.'}</p>
    <div class="bleed"><div class="grid gridhead"><span class="namecol"></span>${head}</div>${rows}
    <div class="grid totals"><span class="namecol"><b>Aanwezig</b></span>${counts}</div></div>
    ${L.instructors(c).length ? '' : info("Nog geen instructeurs in het team. Ze komen erbij zodra ze een bestand naar de cursusleider sturen, of de cursus ophalen ('Deelnemen aan een cursus').")}
    <div class="legend"><div class="legrow wrap"><span class="lg"><span class="rc yes mini">${icon('check', 14)}</span>beschikbaar</span><span class="lg"><span class="rc no mini">${icon('close', 14)}</span>niet beschikbaar</span></div>
    <div class="legrow"><span class="lg"><span class="rc no mini">${icon('close', 14)}<i class="stddot"></i></span>uit het eigen standaardrooster van die persoon</span></div></div>
    <button class="text" data-act="go" data-to="myRoster">Mijn standaardrooster instellen</button>`;
}

function teamTab(c, leader) {
  const me = S.me.deviceId;
  const counts = new Map();
  for (const r of L.activeRatings(c)) counts.set(r.authorId, (counts.get(r.authorId) ?? 0) + 1);
  const team = L.instructors(c);
  const person = (name, isMe, lead, line, removeId = null) => `<div class="person${lead ? ' lead' : ''}"><span class="initial">${esc((name.trim().split(' ').pop() || '?').charAt(0).toUpperCase())}</span>
    <span class="rowtext"><span class="rowtitle">${esc(name)}${isMe ? ' (jij)' : ''}</span><span class="rowsub">${esc(line)}</span></span>
    ${removeId ? `<button class="iconbtn" data-act="remove-member" data-id="${removeId}" aria-label="Uit het team halen">${icon('trash')}</button>` : ''}</div>`;
  return `<h3 class="h3">Cursusleider</h3>${person(c.leaderName, c.leaderId === me, true, L.nl.count(counts.get(c.leaderId) ?? 0, 'beoordeling', 'beoordelingen'))}
    <h3 class="h3">Instructeurs (${team.length})</h3>${team.length ? '' : '<p class="muted">Nog niemand.</p>'}
    ${team.map((m) => person(m.name, m.id === me, false,
      `${L.nl.count(counts.get(m.id) ?? 0, 'beoordeling', 'beoordelingen')} · ${m.lastSync > 0 ? `gesynchroniseerd ${L.nl.moment(m.lastSync)}` : 'nog niet gesynchroniseerd'}`,
      leader ? m.id : null)).join('')}
    ${info("Instructeurs komen in het team zodra ze een bestand naar de cursusleider sturen of de cursus ophalen ('Deelnemen aan een cursus').")}`;
}

function filePicker() {
  return '<input type="file" id="filepick" data-input="files" accept=".txt,.json,text/plain,application/json" multiple hidden>';
}

// ------------------------------------------------------------------ beoordelen

function setDraft(d) {
  ui.draft = d;
  S.draft = d;
}

function startRating(courseId, studentId, day) {
  const empty = () => ({ grade: null, note: '' });
  setDraft({ courseId, studentId, day, ratingId: null, page: 0, before: empty(), during: empty(), after: empty() });
  go('rate');
}

function saveDraft() {
  const d = ui.draft;
  const c = S.courses.get(d.courseId);
  const old = d.ratingId ? c.ratings.find((r) => r.id === d.ratingId) : null;
  const t = Date.now();
  const clean = (p) => ({ grade: p.grade, note: p.note.trim() });
  S.saveRating(c.id, {
    id: old?.id ?? S.newRatingId(),
    studentId: d.studentId,
    day: d.day,
    authorId: old?.authorId ?? S.me.deviceId,
    authorName: old?.authorName ?? S.me.name,
    createdAt: old?.createdAt ?? t,
    updatedAt: t,
    before: clean(d.before),
    during: clean(d.during),
    after: clean(d.after),
    deleted: false,
  });
  const name = L.student(c, d.studentId)?.name ?? 'cursist';
  setDraft(null);
  ui.stack.pop();
  render(true);
  toast(`${old ? 'Aangepast' : 'Opgeslagen'}: ${name} · dag ${d.day}`);
}

function draftEmpty(d) { return L.PHASES.every((p) => L.phaseEmpty(d[p.key])); }

// ------------------------------------------------------------------ files

function shareFile() {
  const c = cur();
  if (!c) return;
  const msg = S.syncMessage(c);
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const who = S.me.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'telefoon';
  const name = `SI-Geweer-week${c.week}_${who}_${p(now.getDate())}-${p(now.getMonth() + 1)}_${p(now.getHours())}${p(now.getMinutes())}.txt`;
  const file = new File([JSON.stringify(msg)], name, { type: 'text/plain' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: `${L.courseTitle(c)} – ${S.me.name}` }).catch((e) => {
      if (e.name !== 'AbortError') download(file);
    });
  } else {
    download(file);
  }
}

function download(file) {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('Bestand opgeslagen: ' + file.name);
}

async function importFiles(files) {
  const lines = [];
  const errors = [];
  let joined = null;
  for (const f of files) {
    try {
      const msg = L.parseSyncFile(await f.text());
      const r = S.receive(msg.course, msg.fromId, msg.fromName, msg.standard);
      if (r.joined) joined = r.title;
      const s = r.stats;
      let line;
      if (r.joined) line = `${msg.fromName}: ${r.title} toegevoegd (${L.nl.count(s.newStudents, 'cursist', 'cursisten')}, ${L.nl.count(s.newRatings, 'beoordeling', 'beoordelingen')})`;
      else if (s.changed) {
        line = `${msg.fromName}: ${L.nl.count(s.newRatings, 'nieuwe beoordeling', 'nieuwe beoordelingen')}` +
          (s.updatedRatings ? `, ${s.updatedRatings} bijgewerkt` : '') +
          (s.newStudents ? `, ${L.nl.count(s.newStudents, 'nieuwe cursist', 'nieuwe cursisten')}` : '') +
          (s.roster ? ', rooster bijgewerkt' : '');
      } else line = `${msg.fromName}: ${r.teamNote ?? 'niets nieuws'}`;
      if (r.teamNote && (r.joined || s.changed)) line += `, ${r.teamNote}`;
      lines.push(line);
    } catch (e) {
      errors.push(`${f.name}: ${e.message}`);
    }
  }
  openDialog({
    title: errors.length ? 'Bestanden inlezen' : 'Bestand ingelezen',
    body: lines.map((l) => `<p>✓ ${esc(l)}</p>`).join('') + errors.map((l) => `<p class="bad">✗ ${esc(l)}</p>`).join('') +
      (joined ? `<p>Je doet nu mee met ${esc(joined)}.</p>` : ''),
    buttons: [{ label: 'OK', act: joined ? 'dlg-home' : 'dlg-close' }],
  });
  render();
}

// ------------------------------------------------------------------ events

const ACT = {
  back,
  go: (d) => go(d.to, { id: d.id }),
  tab: (d) => { ui.tab = d.tab; render(true); },
  menu,
  'menu-go': (d) => { closeDialog(); go(d.to, { id: d.id }); },

  'welcome-done': () => {
    const s = screen();
    if (!s.nameText?.trim()) return toast('Vul je naam in');
    S.setName(s.nameText);
    home();
  },

  pick: (d) => go('pick', { day: Number(d.day) }),
  'pick-day': () => {
    const s = screen();
    dayPicker(cur(), s.day, (day) => replace('pick', { day }));
  },
  'start-rating': (d) => startRating(cur().id, d.id, Number(d.day)),
  'draft-continue': () => go('rate'),
  'draft-discard': () => { setDraft(null); render(); },

  grade: (d) => {
    const dr = ui.draft;
    const key = L.PHASES[dr.page].key;
    const g = dr[key].grade === d.g ? null : d.g;
    setDraft({ ...dr, [key]: { ...dr[key], grade: g } });
    render();
  },
  'rate-page': (d) => { setDraft({ ...ui.draft, page: Number(d.page) }); render(true); },
  'rate-prev': () => { setDraft({ ...ui.draft, page: ui.draft.page - 1 }); render(true); },
  'rate-next': () => {
    const dr = ui.draft;
    if (dr.page < 2) {
      setDraft({ ...dr, page: dr.page + 1 });
      render(true);
    } else if (draftEmpty(dr)) {
      confirm({
        title: 'Niets ingevuld', text: 'Er is geen kleur en geen notitie gegeven. Een lege beoordeling wordt niet opgeslagen.',
        ok: 'Weggooien', cancel: 'Terug', onOk: () => { setDraft(null); back(); },
      });
    } else {
      saveDraft();
    }
  },
  'rate-close': () => {
    const dr = ui.draft;
    if (dr && draftEmpty(dr) && !dr.ratingId) { setDraft(null); back(); return; }
    const name = L.student(S.courses.get(dr.courseId), dr.studentId)?.name ?? 'deze cursist';
    confirm({
      title: dr.ratingId ? 'Wijzigingen weggooien?' : 'Beoordeling weggooien?',
      text: dr.ratingId ? 'De beoordeling blijft zoals hij was.' : `Wat je hebt ingevuld voor ${name} wordt niet opgeslagen.`,
      ok: 'Weggooien', cancel: 'Doorgaan', danger: true, onOk: () => { setDraft(null); back(); },
    });
  },
  'rate-day': () => dayPicker(S.courses.get(ui.draft.courseId), ui.draft.day, (day) => { setDraft({ ...ui.draft, day }); render(); }),

  'edit-rating': (d) => {
    const c = cur();
    const r = c.ratings.find((x) => x.id === d.id);
    setDraft({ courseId: c.id, studentId: r.studentId, day: r.day, ratingId: r.id, page: 0, before: { ...r.before }, during: { ...r.during }, after: { ...r.after } });
    go('rate');
  },
  'delete-rating': (d) => {
    const c = cur();
    const r = c.ratings.find((x) => x.id === d.id);
    confirm({
      title: 'Beoordeling verwijderen?',
      text: `De beoordeling van dag ${r.day} door ${r.authorName} verdwijnt, ook op de andere telefoons na het synchroniseren.`,
      ok: 'Verwijderen', danger: true, onOk: () => { S.deleteRating(c.id, r.id); render(); toast('Beoordeling verwijderd'); },
    });
  },

  sort: (d) => { S.sortMode = d.sort; render(); },

  'course-save': () => {
    const s = screen();
    if (!courseEditValid(s)) return toast('Geen geldig weeknummer');
    if (s.name === 'newCourse') {
      const c = S.createCourse(Number(s.weekText), s.start);
      replace('students', { id: c.id });
    } else {
      S.editCourse(s.id, Number(s.weekText), s.start);
      back();
      toast('Cursus aangepast');
    }
  },

  'toggle-add-gender': () => {
    const s = screen();
    s.gender = s.gender === 'MALE' ? 'FEMALE' : 'MALE';
    refreshAddGender(s);
  },
  'add-students': () => addStudents(),
  'scan-include': (d) => { const s = screen(); const r = s.rows[Number(d.i)]; r.include = !r.include; refreshScan(s); },
  'scan-gender': (d) => { const s = screen(); const r = s.rows[Number(d.i)]; r.gender = r.gender === 'MALE' ? 'FEMALE' : 'MALE'; refreshScan(s); },
  'scan-add': () => {
    const s = screen();
    const chosen = s.rows.filter((r) => r.include && r.name.trim());
    if (!chosen.length) return toast('Geen namen om toe te voegen');
    const added = S.addStudentList(s.id, chosen.map((r) => ({ name: r.name.trim().replace(/\s+/g, ' '), gender: r.gender })));
    back();
    toast(`${L.nl.count(added, 'cursist', 'cursisten')} toegevoegd`);
  },
  'flip-gender': (d) => {
    const s = screen();
    const st = L.student(S.courses.get(s.id), d.id);
    S.editStudent(s.id, d.id, { gender: st.gender === 'MALE' ? 'FEMALE' : 'MALE' });
    document.getElementById('student-list').innerHTML = studentList(S.courses.get(s.id));
  },
  'rename-student': (d) => {
    const s = screen();
    const st = L.student(S.courses.get(s.id), d.id);
    openDialog({
      title: 'Naam wijzigen',
      body: `<input class="dlginput" id="rename" value="${esc(st.name)}" autocapitalize="words" autocomplete="off">`,
      buttons: [{ label: 'Annuleren', act: 'dlg-close' }, { label: 'Opslaan', act: 'dlg-ok' }],
      onOk: () => {
        const v = document.getElementById('rename').value.trim();
        if (v) S.editStudent(s.id, d.id, { name: v });
        document.getElementById('student-list').innerHTML = studentList(S.courses.get(s.id));
      },
    });
  },
  'delete-student': (d) => {
    const s = screen();
    const c = S.courses.get(s.id);
    const st = L.student(c, d.id);
    const n = L.activeRatings(c).filter((r) => r.studentId === d.id).length;
    confirm({
      title: `${st.name} verwijderen?`,
      text: n ? `${st.name} heeft ${L.nl.count(n, 'beoordeling', 'beoordelingen')}. Die verdwijnen ook uit het overzicht, op alle telefoons na het synchroniseren.`
        : `${st.name} gaat van de lijst, op alle telefoons na het synchroniseren.`,
      ok: 'Verwijderen', danger: true,
      onOk: () => { S.editStudent(s.id, d.id, { deleted: true }); document.getElementById('student-list').innerHTML = studentList(S.courses.get(s.id)); },
    });
  },
  'list-done': () => {
    const c = S.courses.get(screen().id);
    const n = L.activeStudents(c).length;
    if (!n) return toast('Zet eerst iemand op de lijst');
    home();
    openDialog({
      title: 'Lijst klaar',
      body: `<p>De instructeurs krijgen de ${L.nl.count(n, 'naam', 'namen')} als ze jouw cursusbestand inlezen. Stuur het nu via Synchroniseren, bijvoorbeeld in de WhatsApp-groep.</p>`,
      buttons: [{ label: 'Later', act: 'dlg-close' }, { label: 'Nu versturen', act: 'menu-go', data: { to: 'sync' } }],
    });
  },

  'share-file': () => shareFile(),
  'import-files': () => document.getElementById('filepick')?.click(),

  'set-active': (d) => { S.setActive(d.id); home(); },
  'delete-course': (d) => {
    const c = S.courses.get(d.id);
    confirm({
      title: `${L.courseTitle(c)} verwijderen?`,
      text: 'De cursus en alle beoordelingen verdwijnen van deze telefoon. Andere telefoons houden hun eigen kopie.',
      ok: 'Verwijderen', danger: true,
      onOk: () => { S.deleteCourse(c.id); if (ui.draft?.courseId === c.id) setDraft(null); render(); },
    });
  },

  'save-name': () => {
    const s = screen();
    if (!s.nameText?.trim()) return toast('Vul je naam in');
    S.setName(s.nameText);
    toast('Naam opgeslagen');
  },

  'std-toggle': (d) => {
    const days = [...(S.standard?.weekdays ?? [true, true, true, true, true])];
    days[Number(d.i)] = !days[Number(d.i)];
    S.setStandard({ weekdays: days, updatedAt: Date.now() });
    render();
  },

  'roster-toggle': (d) => {
    const c = cur();
    if (!S.isLeader(c)) return toast('Alleen de cursusleider past het rooster aan');
    const now = L.rosterCell(c, d.id, Number(d.day));
    S.setAvailable(c.id, d.id, Number(d.day), !now.available);
    render();
  },
  'remove-member': (d) => {
    const c = cur();
    const m = c.members.find((x) => x.id === d.id);
    confirm({
      title: `${m.name} uit het team halen?`,
      text: `${m.name} verdwijnt uit het team en het rooster, op alle telefoons na het synchroniseren. De beoordelingen blijven staan. Stuurt die telefoon later weer een bestand, dan komt de naam terug.`,
      ok: 'Uit team halen', danger: true, onOk: () => { S.removeMember(c.id, m.id); render(); },
    });
  },

  'dlg-close': () => closeDialog(),
  'dlg-ok': () => { const f = ui.dialog?.onOk; closeDialog(); f?.(); },
  'dlg-pick': (d) => { const f = ui.dialog?.onPick; closeDialog(); f?.(Number(d.day)); },
  'dlg-home': () => { closeDialog(); home(); },
};

let scanTimer = 0;

const INPUT = {
  nameText: (v) => { screen().nameText = v; },
  input: (v) => { screen().input = v; },
  scanText: (v) => {
    const s = screen();
    s.text = v;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => { parseScan(s); refreshScan(s); }, 250);
  },
  scanName: (v, el) => {
    const s = screen();
    s.rows[Number(el.dataset.i)].name = v;
    document.getElementById('scan-add').innerHTML = scanAddLabel(s);
  },
  note: (v) => {
    const dr = ui.draft;
    const key = L.PHASES[dr.page].key;
    setDraft({ ...dr, [key]: { ...dr[key], note: v } });
  },
  week: (v, el) => {
    const s = screen();
    s.weekText = v.replace(/\D/g, '').slice(0, 2);
    if (el.value !== s.weekText) el.value = s.weekText;
    const monday = s.weekText ? L.mondayOfWeek(Number(s.weekText), today()) : null;
    if (monday) s.start = monday; // a typed week moves the start to its Monday
    refreshCourseEdit(s, 'week');
  },
  start: (v) => {
    if (!v) return;
    const s = screen();
    const day = L.nextWorkday(v);
    if (day !== v) toast(`Een cursus begint op een werkdag: ${L.nl.long(day)}`);
    s.start = day;
    s.weekText = String(L.isoWeek(day)); // a picked date sets the week
    refreshCourseEdit(s, day === v ? 'start' : null);
  },
  files: (_, el) => {
    const files = [...el.files];
    el.value = '';
    if (files.length) importFiles(files);
  },
};

function refreshAddGender(s) {
  const b = document.getElementById('add-gender');
  if (!b) return;
  b.className = `gtoggle ${s.gender === 'FEMALE' ? 'female' : 'male'}`;
  b.setAttribute('aria-label', `${GENDER_LABEL[s.gender]}, tik om te wisselen`);
  b.innerHTML = `${genderIcon(s.gender, 26)}<span>${GENDER_LABEL[s.gender]}</span>`;
}

function addStudents() {
  const s = screen();
  const names = L.splitNames(s.input ?? '');
  if (!names.length) return;
  const added = S.addStudents(s.id, names, s.gender);
  s.input = '';
  s.gender = 'MALE';
  const field = document.getElementById('add-name');
  if (field) field.value = '';
  refreshAddGender(s);
  document.getElementById('student-list').innerHTML = studentList(S.courses.get(s.id));
  const skipped = names.length - added;
  if (skipped && !added) toast('Die naam staat al op de lijst');
  else if (skipped) toast(`${L.nl.count(added, 'naam', 'namen')} toegevoegd, ${skipped} stond(en) er al op`);
  else if (added > 1) toast(`${L.nl.count(added, 'naam', 'namen')} toegevoegd`);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = ACT[el.dataset.act];
  if (f) {
    e.preventDefault();
    f(el.dataset, el, e);
  }
});

const onInput = (e) => {
  const k = e.target.dataset?.input;
  if (k && INPUT[k]) INPUT[k](e.target.value, e.target);
};
document.addEventListener('input', (e) => { if (e.target.type !== 'file' && e.target.type !== 'date') onInput(e); });
document.addEventListener('change', (e) => { if (e.target.type === 'file' || e.target.type === 'date') onInput(e); });

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  if (e.target.id === 'add-name') { e.preventDefault(); addStudents(); }
  else if (e.target.id === 'welcome-name') { e.preventDefault(); ACT['welcome-done'](); }
  else if (e.target.id === 'rename') { e.preventDefault(); ACT['dlg-ok'](); }
});

// the day changes while the app sleeps in the background
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !document.activeElement?.matches('input, textarea')) render();
});

// ------------------------------------------------------------------ start

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('Nieuwe versie geïnstalleerd: sluit de app en open hem opnieuw');
  });
}
navigator.storage?.persist?.().catch(() => {});
render();
