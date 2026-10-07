// node --test web/test/  (the Android unit tests, ported; plus the cross-platform fixture check)
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import * as L from '../logic.js';

const FIX = new URL('../../fixtures/', import.meta.url);
const MON = '2026-10-12'; // a Monday

test('seven workdays skip the weekend', () => {
  assert.deepEqual(L.courseDates(MON).map((d) => Number(d.slice(8))), [12, 13, 14, 15, 16, 19, 20]);
  assert.equal(L.courseDates('2026-10-10')[0], MON); // a start on Saturday begins on Monday
});

test('today is detected', () => {
  assert.deepEqual(L.dayStatus(MON, '2026-10-14'), { kind: 'today', day: 3, date: '2026-10-14' });
  assert.deepEqual(L.dayStatus(MON, '2026-10-19'), { kind: 'today', day: 6, date: '2026-10-19' });
  const sat = L.dayStatus(MON, '2026-10-17');
  assert.deepEqual(sat, { kind: 'between', lastDay: 5, nextDay: 6, nextDate: '2026-10-19' });
  assert.equal(L.defaultDay(sat), 5);
  assert.deepEqual(L.dayStatus(MON, '2026-10-11'), { kind: 'upcoming', first: MON, daysUntil: 1 });
  assert.equal(L.dayStatus(MON, '2026-10-21').kind, 'finished');
  assert.equal(L.isoWeek(MON), 42);
});

test('a typed week gives its Monday', () => {
  const today = '2026-10-07';
  assert.equal(L.mondayOfWeek(43, today), '2026-10-19');
  assert.equal(L.mondayOfWeek(41, today), '2026-10-05');
  assert.equal(L.mondayOfWeek(2, today), '2027-01-11'); // an early week typed in autumn: next year
  assert.equal(L.mondayOfWeek(53, today), '2026-12-28'); // 2026 has a week 53
  assert.equal(L.mondayOfWeek(0, today), null);
  assert.equal(L.mondayOfWeek(54, today), null);
  for (let w = 1; w <= 52; w++) assert.equal(L.isoWeek(L.mondayOfWeek(w, today)), w);
  // ISO edge cases: 1 Jan 2027 is a Friday in week 53 of 2026; 29 Dec 2025 is in week 1 of 2026
  assert.equal(L.isoWeek('2027-01-01'), 53);
  assert.equal(L.isoWeek('2025-12-29'), 1);
});

test('Dutch names sort like a phone book', () => {
  assert.equal(L.sortKey('de Vries'), 'vries');
  assert.equal(L.sortKey('van der Linden'), 'linden');
  assert.equal(L.sortKey('Van Den Berg'), 'berg');
  assert.equal(L.sortKey('de'), 'de');
  const names = ['de Vries', 'Bakker', 'van der Linden', 'Jansen', 'de Boer', 'Visser'];
  assert.deepEqual(names.map((name) => ({ name })).sort(L.byName).map((s) => s.name),
    ['Bakker', 'de Boer', 'Jansen', 'van der Linden', 'Visser', 'de Vries']);
  assert.deepEqual(L.splitNames('Jansen, de Vries\nBakker;  Smit '), ['Jansen', 'de Vries', 'Bakker', 'Smit']);
});

const phase = (g = null) => ({ grade: g, note: '' });
const rating = (id, studentId, day, g, at = 1, author = 'a') => ({
  id, studentId, day, authorId: author, authorName: author, createdAt: at, updatedAt: at,
  before: phase(g[0]), during: phase(g[1]), after: phase(g[2]), deleted: false,
});

test('ranking good/bad, unrated last', () => {
  const students = ['Jansen', 'Bakker', 'de Vries', 'Smit'].map((n) => ({ id: n, name: n }));
  const r = [
    rating('1', 'Jansen', 1, ['GOOD', 'GOOD', 'FAIR']),
    rating('2', 'Bakker', 1, ['POOR', 'FAIR', null]),
    rating('3', 'de Vries', 1, ['GOOD', 'GOOD', 'GOOD']),
  ];
  assert.deepEqual(L.rank(students, r, 'BEST_FIRST').map((s) => s.name), ['de Vries', 'Jansen', 'Bakker', 'Smit']);
  assert.deepEqual(L.rank(students, r, 'WORST_FIRST').map((s) => s.name), ['Bakker', 'Jansen', 'de Vries', 'Smit']);
  assert.deepEqual(L.rank(students, r, 'ALPHABETICAL').map((s) => s.name), ['Bakker', 'Jansen', 'Smit', 'de Vries']);
  const sum = L.summary(r);
  assert.deepEqual([sum.good, sum.fair, sum.poor], [5, 2, 1]);
  assert.equal(L.summary([]).average, null);
});

const course = (over = {}) => L.normalizeCourse({
  id: 'c', week: 42, startDate: MON, leaderId: 'L', leaderName: 'Leider', createdAt: 1, updatedAt: 1, ...over,
});
const canon = (c) => JSON.stringify({
  ...c,
  students: [...c.students].sort((a, b) => (a.id < b.id ? -1 : 1)),
  ratings: [...c.ratings].sort((a, b) => (a.id < b.id ? -1 : 1)),
  members: [...c.members].sort((a, b) => (a.id < b.id ? -1 : 1)),
  availability: [...c.availability].sort((a, b) => (`${a.memberId}/${a.day}` < `${b.memberId}/${b.day}` ? -1 : 1)),
}, Object.keys(c).sort().concat(['id', 'name', 'updatedAt', 'deleted', 'gender', 'studentId', 'day', 'authorId', 'authorName', 'createdAt',
  'before', 'during', 'after', 'grade', 'note', 'lastSync', 'removed', 'standard', 'weekdays', 'memberId', 'available']).sort());

test('merge converges in any order', () => {
  const leader = course({ ratings: [rating('L1', 'x', 1, ['GOOD'], 10)], students: [{ id: 'x', name: 'Jansen', updatedAt: 5 }] });
  const a = course({ ratings: [rating('A1', 'x', 1, ['POOR'], 11), rating('L1', 'x', 1, ['GOOD'], 10)] });
  const b = course({ ratings: [{ ...rating('B1', 'x', 2, ['FAIR'], 20), deleted: true, updatedAt: 30 }] });
  const oldB = course({ ratings: [rating('B1', 'x', 2, ['FAIR'], 20)] });
  const m1 = L.merge(leader, a);
  assert.equal(m1.stats.newRatings, 1);
  const one = L.merge(L.merge(L.merge(m1.course, oldB).course, b).course, a).course;
  const two = L.merge(L.merge(L.merge(leader, b).course, a).course, oldB).course;
  assert.equal(canon(one), canon(two));
  assert.equal(one.ratings.find((r) => r.id === 'B1').deleted, true); // the newer deletion wins
  assert.equal(L.activeRatings(one).length, 2);
  assert.equal(L.merge(one, two).stats.changed, false);
});

test('team and rooster converge', () => {
  const leaderSide = course({
    members: [{ id: 'm1', name: 'Sgt Bakker', lastSync: 50, updatedAt: 50 }],
    availability: [{ memberId: 'm1', day: 2, available: false, updatedAt: 60 }],
  });
  const memberSide = course({
    members: [{ id: 'm1', name: 'Bakker' }, { id: 'm2', name: 'Kpl Smit' }],
    availability: [{ memberId: 'm1', day: 2, available: true, updatedAt: 10 }, { memberId: 'm2', day: 1, available: false, updatedAt: 5 }],
  });
  const a = L.merge(leaderSide, memberSide);
  const b = L.merge(memberSide, leaderSide);
  assert.equal(canon(a.course), canon(b.course));
  assert.equal(a.course.members.find((m) => m.id === 'm1').name, 'Sgt Bakker');
  assert.equal(a.stats.roster, 1);
  assert.equal(b.stats.roster, 1);
  assert.deepEqual(L.instructors(a.course).map((m) => m.id), ['m1', 'm2']);
  const removed = { ...a.course, members: a.course.members.map((m) => (m.id === 'm2' ? { ...m, removed: true, updatedAt: 99 } : m)) };
  assert.deepEqual(L.instructors(L.merge(b.course, removed).course).map((m) => m.id), ['m1']);
});

test('a standard week fills the rooster', () => {
  const noFridays = { weekdays: [true, true, true, true, false], updatedAt: 5 };
  let c = L.withMember(course(), 'm1', 'Sgt Bakker', 10, noFridays);
  assert.deepEqual(L.rosterCell(c, 'm1', 5), { available: false, source: 'STANDARD' });
  assert.deepEqual(L.rosterCell(c, 'm1', 6), { available: true, source: 'STANDARD' });
  assert.deepEqual(L.rosterCell(c, 'L', 5), { available: true, source: 'NONE' });
  c = { ...c, availability: [{ memberId: 'm1', day: 5, available: true, updatedAt: 20 }] };
  assert.deepEqual(L.rosterCell(c, 'm1', 5), { available: true, source: 'CURSUSLEIDER' });
  const again = L.withMember(c, 'm1', 'Sgt Bakker', 30);
  assert.deepEqual(again.members[0].standard, noFridays);
  const allWeek = { weekdays: [true, true, true, true, true], updatedAt: 40 };
  const other = { ...c, members: c.members.map((m) => ({ ...m, standard: allWeek })) };
  assert.deepEqual(L.merge(again, other).course.members[0].standard, allWeek);
  assert.deepEqual(L.merge(other, again).course.members[0].standard, allWeek);
  const led = { ...c, leaderStandard: noFridays };
  assert.deepEqual(L.merge(c, led).course.leaderStandard, noFridays);
  assert.deepEqual(L.rosterCell(led, 'L', 5), { available: false, source: 'STANDARD' });
});

// ------------------------------------------------------------------ iPhone <-> Android

/** What an iPhone cursusleider's file looks like; the Android unit test reads this (CrossPlatformTest.kt). */
const WEB = L.normalizeCourse({
  id: 'c-xplat', week: 41, startDate: '2026-10-05', leaderId: 'web-cl', leaderName: 'Kap de Vries (iPhone)', createdAt: 1000, updatedAt: 1000,
  students: [
    { id: 's1', name: 'de Vries', updatedAt: 1000, gender: 'MALE' },
    { id: 's2', name: 'Bakker', updatedAt: 1000, gender: 'FEMALE' },
    { id: 's3', name: 'van der Linden', updatedAt: 1500, deleted: true },
  ],
  ratings: [
    { id: 'r-web-1', studentId: 's1', day: 1, authorId: 'web-cl', authorName: 'Kap de Vries (iPhone)', createdAt: 2000, updatedAt: 2000,
      before: { grade: 'GOOD', note: 'Briefing helder — veiligheid goed benoemd' }, during: phase(), after: { grade: 'FAIR', note: 'Patronen nageteld, één vergeten' } },
    { id: 'r-shared', studentId: 's2', day: 2, authorId: 'and-1', authorName: 'Sgt Bakker', createdAt: 3000, updatedAt: 3000,
      before: { grade: 'POOR', note: 'oud' }, during: phase('POOR'), after: phase() },
  ],
  members: [{ id: 'and-1', name: 'Sgt Bakker', lastSync: 4000, updatedAt: 4000, standard: { weekdays: [true, true, true, true, false], updatedAt: 100 } }],
  availability: [{ memberId: 'and-1', day: 3, available: false, updatedAt: 5000 }],
  leaderStandard: { weekdays: [false, true, true, true, true], updatedAt: 200 },
  leaderPlatform: 'web',
});

test('the iPhone file for Android is written', () => {
  const msg = { app: 'si-geweer', version: 1, type: 'file', fromId: 'web-cl', fromName: 'Kap de Vries (iPhone)', sentAt: 6000, course: WEB, standard: WEB.leaderStandard };
  writeFileSync(new URL('web_export.json', FIX), JSON.stringify(msg));
  assert.equal(L.parseSyncFile(JSON.stringify(msg)).course.students[1].gender, 'FEMALE');
});

const androidFiles = existsSync(new URL('android_export.json', FIX)) && existsSync(new URL('android_merged.json', FIX));
test('Android files read and merge exactly like on Android', { skip: !androidFiles && 'run the Android unit tests first' }, () => {
  const msg = L.parseSyncFile(readFileSync(new URL('android_export.json', FIX), 'utf8'));
  assert.equal(msg.fromName, 'Sgt Bakker');
  assert.deepEqual(msg.standard, { weekdays: [true, true, true, true, false], updatedAt: 300 });
  const android = msg.course;
  const kotlinMerged = L.normalizeCourse(JSON.parse(readFileSync(new URL('android_merged.json', FIX), 'utf8')));
  assert.equal(canon(L.merge(android, WEB).course), canon(kotlinMerged));
  assert.equal(canon(L.merge(WEB, android).course), canon(kotlinMerged));
  const m = L.merge(WEB, android).course;
  assert.equal(m.ratings.find((r) => r.id === 'r-shared').before.note, 'aangepast'); // the newer Android edit wins
  assert.equal(m.students.find((s) => s.id === 's3').deleted, true); // the newer iPhone deletion wins
  assert.equal(L.rosterCell(m, 'and-1', 3).available, false); // the cursusleider's day beats the older one
  assert.deepEqual(m.members.find((x) => x.id === 'and-1').standard.updatedAt, 300);
  assert.equal(m.leaderPlatform, 'web');
});
