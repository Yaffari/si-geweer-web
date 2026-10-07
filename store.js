// Everything lives in this phone's browser storage (the home-screen app has its own). Nothing leaves the phone
// by itself; files go out only when the user shares one. Mirrors Repo.kt on Android.
import * as L from './logic.js';

const P = 'si.';
const read = (k, def) => {
  try {
    const v = localStorage.getItem(P + k);
    return v == null ? def : JSON.parse(v);
  } catch {
    return def;
  }
};
const write = (k, v) => (v == null ? localStorage.removeItem(P + k) : localStorage.setItem(P + k, JSON.stringify(v)));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
  return (c === 'x' ? r : (r & 3) | 8).toString(16);
}));
const now = () => Date.now();

export class Store {
  constructor() {
    this.profile = read('profile', null) ?? { deviceId: uuid(), name: '', activeCourseId: null };
    write('profile', this.profile);
    this.courses = new Map();
    for (const id of read('courseIds', [])) {
      const c = read('course.' + id, null);
      if (c) this.courses.set(id, L.normalizeCourse(c));
    }
    this.standard = read('standard', null);
  }

  get me() { return this.profile; }

  /** The course on screen: the chosen one, else the newest. */
  active() {
    const chosen = this.profile.activeCourseId && this.courses.get(this.profile.activeCourseId);
    if (chosen) return chosen;
    let newest = null;
    for (const c of this.courses.values()) if (!newest || c.createdAt > newest.createdAt) newest = c;
    return newest;
  }

  isLeader(c) { return c.leaderId === this.profile.deviceId; }

  // ---------------------------------------------------------------- profile

  setName(name) {
    this.profile = { ...this.profile, name: name.trim() };
    write('profile', this.profile);
    for (const c of this.courses.values()) {
      if (c.leaderId === this.profile.deviceId && c.leaderName !== this.profile.name) {
        this.save({ ...c, leaderName: this.profile.name, updatedAt: now() });
      }
    }
  }

  setActive(id) {
    this.profile = { ...this.profile, activeCourseId: id };
    write('profile', this.profile);
  }

  get sortMode() { return read('sort', 'BEST_FIRST'); }
  set sortMode(v) { write('sort', v); }
  lastSync(courseId) { return read('sync.' + courseId, 0); }
  markSynced(courseId) { write('sync.' + courseId, now()); }

  /** Save the standard week and put it in every course on this phone; the other phones get it with the next sync. */
  setStandard(s) {
    this.standard = s;
    write('standard', s);
    for (const c of [...this.courses.values()]) this.save(this.withMyStandard(c));
  }

  withMyStandard(c) {
    const s = this.standard;
    const me = this.profile;
    if (!s) return c;
    if (c.leaderId === me.deviceId) return { ...c, leaderStandard: L.newerStandard(c.leaderStandard, s) };
    const mine = c.members.find((m) => m.id === me.deviceId);
    // an instructeur sees itself on the team at once; the cursusleider's record of it wins later (updatedAt 0)
    if (!mine) return { ...c, members: [...c.members, { id: me.deviceId, name: me.name, lastSync: 0, updatedAt: 0, removed: false, standard: s }] };
    const std = L.newerStandard(mine.standard, s);
    return std === mine.standard ? c : { ...c, members: c.members.map((m) => (m.id === me.deviceId ? { ...m, standard: std } : m)) };
  }

  // ---------------------------------------------------------------- courses

  save(c) {
    this.courses.set(c.id, c);
    write('course.' + c.id, c);
    write('courseIds', [...this.courses.keys()]);
  }

  update(id, fn) {
    const c = this.courses.get(id);
    if (!c) return null;
    const n = fn(c);
    this.save(n);
    return n;
  }

  createCourse(week, start) {
    const t = now();
    const c = {
      id: uuid(), week, startDate: start, leaderId: this.profile.deviceId, leaderName: this.profile.name,
      createdAt: t, updatedAt: t, students: [], ratings: [], members: [], availability: [],
      leaderStandard: this.standard, leaderPlatform: 'web',
    };
    this.save(c);
    this.setActive(c.id);
    return c;
  }

  editCourse(id, week, start) {
    return this.update(id, (c) => ({ ...c, week, startDate: start, leaderName: this.profile.name, updatedAt: now() }));
  }

  deleteCourse(id) {
    this.courses.delete(id);
    write('course.' + id, null);
    write('courseIds', [...this.courses.keys()]);
    if (this.profile.activeCourseId === id) this.setActive(null);
    if (this.draft?.courseId === id) this.draft = null;
  }

  // ---------------------------------------------------------------- cursisten (cursusleider)

  /** Returns how many were added; names already on the list are skipped. */
  addStudents(id, names, gender = 'MALE') {
    let added = 0;
    this.update(id, (c) => {
      const have = new Set(c.students.filter((s) => !s.deleted).map((s) => s.name.toLocaleLowerCase('nl')));
      const t = now();
      const fresh = [];
      for (const n of names) {
        const k = n.toLocaleLowerCase('nl');
        if (have.has(k)) continue;
        have.add(k);
        fresh.push({ id: uuid(), name: n, updatedAt: t, deleted: false, gender });
      }
      added = fresh.length;
      return { ...c, students: [...c.students, ...fresh] };
    });
    return added;
  }

  editStudent(id, studentId, change) {
    return this.update(id, (c) => ({
      ...c,
      students: c.students.map((s) => (s.id === studentId ? { ...s, ...change, updatedAt: now() } : s)),
    }));
  }

  // ---------------------------------------------------------------- beoordelingen

  saveRating(id, r) {
    return this.update(id, (c) => ({ ...c, ratings: [...c.ratings.filter((x) => x.id !== r.id), r] }));
  }

  deleteRating(id, ratingId) {
    return this.update(id, (c) => ({
      ...c,
      ratings: c.ratings.map((r) => (r.id === ratingId ? { ...r, deleted: true, updatedAt: now() } : r)),
    }));
  }

  newRatingId() { return uuid(); }

  // ---------------------------------------------------------------- team + rooster (cursusleider)

  setAvailable(id, memberId, day, available) {
    return this.update(id, (c) => ({
      ...c,
      availability: [...c.availability.filter((a) => !(a.memberId === memberId && a.day === day)), { memberId, day, available, updatedAt: now() }],
    }));
  }

  removeMember(id, memberId) {
    return this.update(id, (c) => ({
      ...c,
      members: c.members.map((m) => (m.id === memberId ? { ...m, removed: true, updatedAt: now() } : m)),
    }));
  }

  // ---------------------------------------------------------------- sync

  /** Merge a course from another phone (a file). An unknown course is joined. */
  receive(incoming, fromId, fromName, standard = null) {
    const me = this.profile;
    const t = now();
    const local = this.courses.get(incoming.id);
    let result;
    let stats;
    if (!local) {
      result = incoming;
      stats = {
        newRatings: incoming.ratings.filter((r) => !r.deleted).length, updatedRatings: 0,
        newStudents: incoming.students.filter((s) => !s.deleted).length, updatedStudents: 0, roster: 0, changed: true,
      };
    } else {
      ({ course: result, stats } = L.merge(local, incoming));
    }
    const before = local?.members.find((m) => m.id === fromId);
    if (fromId !== me.deviceId) result = L.withMember(result, fromId, fromName, t, standard);
    const after = result.members.find((m) => m.id === fromId);
    let teamNote = null;
    if (after && fromId !== me.deviceId) {
      if (!before || before.removed) teamNote = 'nieuw in het team' + (after.standard ? ', met standaardrooster' : '');
      else if (JSON.stringify(after.standard) !== JSON.stringify(before.standard)) teamNote = 'standaardrooster bijgewerkt';
    }
    if (result.leaderId !== me.deviceId && !result.members.some((m) => m.id === me.deviceId)) {
      // an instructeur sees itself on the team at once; the cursusleider's record of it wins later (updatedAt 0)
      result = { ...result, members: [...result.members, { id: me.deviceId, name: me.name, lastSync: 0, updatedAt: 0, removed: false, standard: null }] };
    }
    result = this.withMyStandard(result);
    this.save(result);
    if (!local) this.setActive(result.id);
    this.markSynced(result.id);
    return { courseId: result.id, title: L.courseTitle(result), joined: !local, stats, teamNote };
  }

  /** The file this phone sends: its whole course, like the Android app. */
  syncMessage(c) {
    return {
      app: L.APP_TAG, version: 1, type: 'file', fromId: this.profile.deviceId, fromName: this.profile.name,
      sentAt: now(), course: c, standard: this.standard,
    };
  }

  // ---------------------------------------------------------------- draft

  get draft() { return read('draft', null); }
  set draft(d) { write('draft', d); }
}
