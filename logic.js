// The rules of SI Geweer, kept identical to the Android app (Model.kt): same JSON, same days, same merge.
// No DOM in here, so Node can test it (test/logic.test.mjs).

export const APP_TAG = 'si-geweer';
export const COURSE_DAYS = 7;
export const GRADES = ['GOOD', 'FAIR', 'POOR'];
export const PHASES = [
  { key: 'before', title: 'Voor het schieten', short: 'Voor' },
  { key: 'during', title: 'Tijdens het schieten', short: 'Tijdens' },
  { key: 'after', title: 'Na het schieten', short: 'Na' },
];

// ------------------------------------------------------------------ dates
// Dates are 'YYYY-MM-DD' strings; arithmetic runs in UTC so a DST change never shifts a day.

const pad = (n) => String(n).padStart(2, '0');
export const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const fmtDate = (dt) => dt.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = parseDate(s); d.setUTCDate(d.getUTCDate() + n); return fmtDate(d); };
/** 0 = maandag .. 6 = zondag */
export const weekday = (s) => (parseDate(s).getUTCDay() + 6) % 7;
export const isWeekend = (s) => weekday(s) >= 5;
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
export const todayStr = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** Seven working days from the start date; Saturdays and Sundays are skipped. */
export function courseDates(start) {
  const out = [];
  let d = start;
  while (out.length < COURSE_DAYS) {
    if (!isWeekend(d)) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export function nextWorkday(s) {
  let d = s;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

/** ISO week number (Dutch weeks are ISO weeks). */
export function isoWeek(s) {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); // the Thursday of this week
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + 3); // the Thursday of week 1
  return 1 + Math.round((d - jan4) / (7 * 86400000));
}

/** Monday of ISO week [week], in the year that puts it closest to [today] (week 2 typed in October = next January). */
export function mondayOfWeek(week, today) {
  const y0 = Number(today.slice(0, 4));
  let best = null;
  let bestDist = Infinity;
  for (const y of [y0 - 1, y0, y0 + 1]) {
    if (week < 1 || week > isoWeek(`${y}-12-28`)) continue; // Dec 28 always sits in the last week
    const jan4 = `${y}-01-04`; // always in week 1
    const monday = addDays(addDays(jan4, -weekday(jan4)), (week - 1) * 7);
    const dist = Math.abs(daysBetween(today, monday));
    if (dist < bestDist) { best = monday; bestDist = dist; }
  }
  return best;
}

/** today | upcoming | between (a weekend inside the course) | finished */
export function dayStatus(start, today) {
  const days = courseDates(start);
  const i = days.indexOf(today);
  if (i >= 0) return { kind: 'today', day: i + 1, date: today };
  if (today < days[0]) return { kind: 'upcoming', first: days[0], daysUntil: daysBetween(today, days[0]) };
  if (today > days[COURSE_DAYS - 1]) return { kind: 'finished', last: days[COURSE_DAYS - 1] };
  const next = days.findIndex((d) => d > today);
  return { kind: 'between', lastDay: next, nextDay: next + 1, nextDate: days[next] };
}

/** The day a new beoordeling is for when nobody picks one. */
export function defaultDay(st) {
  switch (st.kind) {
    case 'upcoming': return 1;
    case 'today': return st.day;
    case 'between': return st.lastDay;
    default: return COURSE_DAYS;
  }
}

// ------------------------------------------------------------------ Dutch text

const DAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const DAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const nl = {
  weekday: (s) => DAY_SHORT[weekday(s)],
  weekdayAt: (i) => DAY_SHORT[i],
  weekdayLongAt: (i) => DAY_NAMES[i],
  /** "dinsdag 14 oktober" */
  long: (s) => { const d = parseDate(s); return `${DAY_NAMES[weekday(s)]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; },
  /** "di 14 okt" */
  short: (s) => { const d = parseDate(s); return `${DAY_SHORT[weekday(s)]} ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`; },
  /** "5-10" */
  dm: (s) => { const d = parseDate(s); return `${d.getUTCDate()}-${d.getUTCMonth() + 1}`; },
  time: (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; },
  /** "vandaag 17:32", "gisteren 09:05", "di 14 okt 17:32" */
  moment: (ms, today = todayStr()) => {
    const day = todayStr(new Date(ms));
    const label = day === today ? 'vandaag' : day === addDays(today, -1) ? 'gisteren' : nl.short(day);
    return `${label} ${nl.time(ms)}`;
  },
  count: (n, one, many) => `${n} ${n === 1 ? one : many}`,
};

export const cap = (s) => s.charAt(0).toLocaleUpperCase('nl') + s.slice(1);

// ------------------------------------------------------------------ names

// longest first, so "van der" wins over "van"
const PREFIXES = [
  'van der', 'van den', 'van de', 'van het', "van 't", "in 't", 'in het', 'in de', 'op de', 'op den',
  'op het', 'uit de', 'uit den', 'aan de', 'van', 'de', 'der', 'den', 'het', "'t", 'te', 'ten', 'ter',
];
const collator = new Intl.Collator('nl', { sensitivity: 'accent' });

/** Dutch phone-book order: "de Vries" sorts under V, "van der Linden" under L. */
export function sortKey(name) {
  const n = name.trim().toLocaleLowerCase('nl');
  for (const p of PREFIXES) {
    if (n.startsWith(p + ' ')) {
      const rest = n.slice(p.length).trim();
      if (rest) return rest;
    }
  }
  return n;
}

export const byName = (a, b) => collator.compare(sortKey(a.name), sortKey(b.name)) || collator.compare(a.name, b.name);

/** Instructeurs carry a rank ("Sgt1 Jansen"): sort them by the last word. */
export const byLastWord = (a, b) =>
  collator.compare(a.name.trim().split(' ').pop(), b.name.trim().split(' ').pop()) || collator.compare(a.name, b.name);

/** Pasted lists ("Jansen, de Vries\nBakker") become separate names. */
export const splitNames = (input) => input.split(/[\n,;\t]/).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);

// ------------------------------------------------------------------ course helpers

export const courseTitle = (c) => `SI Geweer (week ${c.week})`;
export const activeStudents = (c) => c.students.filter((s) => !s.deleted).sort(byName);
export function activeRatings(c) {
  const live = new Set(c.students.filter((s) => !s.deleted).map((s) => s.id));
  return c.ratings.filter((r) => !r.deleted && live.has(r.studentId));
}
/** The instructeurs on the team (the cursusleider is not a member). */
export const instructors = (c) => c.members.filter((m) => !m.removed && m.id !== c.leaderId).sort(byLastWord);
export const student = (c, id) => c.students.find((s) => s.id === id);
export const ratingGrades = (r) => PHASES.map((p) => r[p.key].grade).filter(Boolean);
export const phaseEmpty = (p) => !p.grade && !p.note.trim();
export const ratingEmpty = (r) => PHASES.every((p) => phaseEmpty(r[p.key]));

export const standardOf = (c, id) => (id === c.leaderId ? c.leaderStandard : c.members.find((m) => m.id === id)?.standard) ?? null;
/** Course days are weekdays; anything else counts as available. */
export const standardAvailableOn = (std, date) => { const i = weekday(date); return i < 5 ? std.weekdays[i] ?? true : true; };
/** 0 = maandag */
export const offDays = (std) => (std ? std.weekdays.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0) : []);

/** A rooster cell: what the cursusleider set for this day, else the person's own standard week, else available. */
export function rosterCell(c, personId, day, set = new Map(c.availability.map((a) => [akey(a), a]))) {
  const a = set.get(`${personId}/${day}`);
  if (a) return { available: a.available, source: 'CURSUSLEIDER' };
  const std = standardOf(c, personId);
  if (!std) return { available: true, source: 'NONE' };
  return { available: standardAvailableOn(std, courseDates(c.startDate)[day - 1]), source: 'STANDARD' };
}
const akey = (a) => `${a.memberId}/${a.day}`;

// ------------------------------------------------------------------ scores + sorting

export function summary(ratings) {
  let good = 0, fair = 0, poor = 0;
  for (const r of ratings) {
    for (const g of ratingGrades(r)) {
      if (g === 'GOOD') good++;
      else if (g === 'FAIR') fair++;
      else poor++;
    }
  }
  const total = good + fair + poor;
  const average = total ? (good + 0.5 * fair) / total : null;
  const grade = average == null ? null : average >= 0.75 ? 'GOOD' : average >= 0.45 ? 'FAIR' : 'POOR';
  return { good, fair, poor, total, average, grade };
}

export const SORTS = [
  { key: 'BEST_FIRST', label: 'Goed → slecht' },
  { key: 'WORST_FIRST', label: 'Slecht → goed' },
  { key: 'ALPHABETICAL', label: 'A – Z' },
];

/** Students without any colour go last in both good/bad orders; ties keep the alphabet. */
export function rank(students, ratings, mode) {
  const alpha = [...students].sort(byName);
  if (mode === 'ALPHABETICAL') return alpha;
  const per = new Map();
  for (const r of ratings) (per.get(r.studentId) ?? per.set(r.studentId, []).get(r.studentId)).push(r);
  const avg = new Map(alpha.map((s) => [s.id, summary(per.get(s.id) ?? []).average]));
  const rated = alpha.filter((s) => avg.get(s.id) != null);
  const unrated = alpha.filter((s) => avg.get(s.id) == null);
  rated.sort((a, b) => (mode === 'BEST_FIRST' ? avg.get(b.id) - avg.get(a.id) : avg.get(a.id) - avg.get(b.id)));
  return [...rated, ...unrated];
}

// ------------------------------------------------------------------ files from other phones

const phase = (p) => ({ grade: GRADES.includes(p?.grade) ? p.grade : null, note: typeof p?.note === 'string' ? p.note : '' });
const std = (s) => (s && Array.isArray(s.weekdays) ? { weekdays: [0, 1, 2, 3, 4].map((i) => s.weekdays[i] !== false), updatedAt: s.updatedAt ?? 0 } : null);

/** Fill the fields older versions of either app leave out, so the rest of the code can rely on them. */
export function normalizeCourse(c) {
  return {
    id: c.id,
    week: c.week,
    startDate: c.startDate,
    leaderId: c.leaderId,
    leaderName: c.leaderName ?? '',
    createdAt: c.createdAt ?? 0,
    updatedAt: c.updatedAt ?? 0,
    students: (c.students ?? []).map((s) => ({
      id: s.id, name: String(s.name ?? ''), updatedAt: s.updatedAt ?? 0, deleted: !!s.deleted,
      gender: s.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
    })),
    ratings: (c.ratings ?? []).map((r) => ({
      id: r.id, studentId: r.studentId, day: r.day, authorId: r.authorId, authorName: r.authorName ?? '',
      createdAt: r.createdAt ?? 0, updatedAt: r.updatedAt ?? 0,
      before: phase(r.before), during: phase(r.during), after: phase(r.after), deleted: !!r.deleted,
    })),
    members: (c.members ?? []).map((m) => ({
      id: m.id, name: String(m.name ?? ''), lastSync: m.lastSync ?? 0, updatedAt: m.updatedAt ?? 0,
      removed: !!m.removed, standard: std(m.standard),
    })),
    availability: (c.availability ?? []).map((a) => ({ memberId: a.memberId, day: a.day, available: !!a.available, updatedAt: a.updatedAt ?? 0 })),
    leaderStandard: std(c.leaderStandard),
    leaderPlatform: c.leaderPlatform ?? null,
  };
}

/** Read a sync file (the Android app writes the same thing). Throws a Dutch message for anything else. */
export function parseSyncFile(text) {
  let msg;
  try { msg = JSON.parse(text); } catch { throw new Error('geen SI Geweer-bestand'); }
  if (!msg || msg.app !== APP_TAG) throw new Error('geen SI Geweer-bestand');
  if (!msg.course) throw new Error('er staat geen cursus in');
  return { ...msg, course: normalizeCourse(msg.course), standard: std(msg.standard) };
}

// ------------------------------------------------------------------ merge

const ktList = (l) => `[${l.join(', ')}]`; // Kotlin's List.toString(), so a tie breaks the same way on both apps

export function newerStandard(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return ktList(a.weekdays) >= ktList(b.weekdays) ? a : b;
}

/**
 * Union by id, newest updatedAt wins. Deleting is an edit (a tombstone), so a deletion travels like any
 * other change. The result does not depend on the order phones are merged in, so everyone converges.
 */
export function merge(local, incoming) {
  if (local.id !== incoming.id) throw new Error('different courses');
  let newS = 0, updS = 0, newR = 0, updR = 0, roster = 0;

  const students = new Map(local.students.map((s) => [s.id, s]));
  for (const s of incoming.students) {
    const cur = students.get(s.id);
    if (!cur) { students.set(s.id, s); if (!s.deleted) newS++; }
    else if (s.updatedAt > cur.updatedAt) { students.set(s.id, s); updS++; }
  }

  const ratings = new Map(local.ratings.map((r) => [r.id, r]));
  for (const r of incoming.ratings) {
    const cur = ratings.get(r.id);
    if (!cur) { ratings.set(r.id, r); if (!r.deleted) newR++; }
    else if (r.updatedAt > cur.updatedAt) { ratings.set(r.id, r); updR++; }
  }

  const members = new Map(local.members.map((m) => [m.id, m]));
  for (const m of incoming.members) {
    const cur = members.get(m.id);
    members.set(m.id, !cur ? m : {
      ...(m.updatedAt > cur.updatedAt ? m : cur),
      lastSync: Math.max(m.lastSync, cur.lastSync),
      standard: newerStandard(m.standard, cur.standard),
    });
  }

  const avail = new Map(local.availability.map((a) => [akey(a), a]));
  for (const a of incoming.availability) {
    const cur = avail.get(akey(a));
    if (!cur || a.updatedAt > cur.updatedAt) {
      avail.set(akey(a), a);
      if ((cur ? cur.available : true) !== a.available) roster++;
    }
  }

  const meta = incoming.updatedAt > local.updatedAt ? incoming : local;
  const course = {
    ...meta,
    students: [...students.values()],
    ratings: [...ratings.values()],
    members: [...members.values()],
    availability: [...avail.values()],
    leaderStandard: newerStandard(local.leaderStandard, incoming.leaderStandard),
    leaderPlatform: local.leaderPlatform ?? incoming.leaderPlatform ?? null,
  };
  const stats = { newRatings: newR, updatedRatings: updR, newStudents: newS, updatedStudents: updS, roster };
  stats.changed = newR + updR + newS + updS + roster > 0;
  return { course, stats };
}

/** Someone synced: on the team (again), under their current name, keeping the newest standard week. */
export function withMember(c, id, name, at, standard = null) {
  if (id === c.leaderId) return c;
  const cur = c.members.find((m) => m.id === id);
  const m = {
    ...(cur ?? { id, name, lastSync: 0, updatedAt: 0, removed: false, standard: null }),
    name, lastSync: at, updatedAt: at, removed: false,
    standard: newerStandard(cur?.standard ?? null, standard),
  };
  return { ...c, members: [...c.members.filter((x) => x.id !== id), m] };
}
