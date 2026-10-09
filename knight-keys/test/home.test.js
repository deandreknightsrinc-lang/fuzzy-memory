import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, instrumentById, instrumentForCourse, instrumentHome, songsToShow, tunerLesson, rankFor, isSongLesson } from '../js/home.js';
import { COURSES, ALL_LESSONS, pathState } from '../js/lessons.js';
import { defaultStage, recordScore } from '../js/game.js';

test('every lesson course belongs to exactly one instrument', () => {
  for (const c of COURSES) assert.equal(INSTRUMENTS.filter((i) => i.courses.includes(c.id)).length, 1, c.id);
  assert.equal(instrumentForCourse('reading'), 'piano', 'reading music is part of piano');
  assert.equal(instrumentById('nope').id, 'piano', 'unknown falls back to piano');
});

test('a new player starts at the first lesson of each instrument', () => {
  for (const inst of INSTRUMENTS) {
    const h = instrumentHome(inst.id);
    assert.ok(h.lessons.total > 0, `${inst.id} has lessons`);
    assert.equal(h.lessons.done, 0);
    assert.equal(h.lessons.rank, 'New');
    assert.equal(h.next.lesson.id, pathState({}, inst.courses[0])[0].lesson.id, `${inst.id} starts at its first lesson`);
    assert.ok(h.units.length > 0 && h.units[0].unlocked, 'the first unit is open');
    assert.equal(h.units.filter((u) => u.unlocked).length, inst.courses.length, 'only the first unit of each course is open');
  }
});

test('progress moves the next lesson on and counts stars', () => {
  const path = pathState({}, 'drums');
  const progress = { [path[0].lesson.id]: 3, [path[1].lesson.id]: 2 };
  const h = instrumentHome('drums', { progress });
  assert.equal(h.lessons.done, 2);
  assert.equal(h.lessons.stars, 5);
  assert.equal(h.lessons.maxStars, path.length * 3);
  assert.equal(h.next.lesson.id, path[2].lesson.id);
  const unit = h.units.find((u) => u.unit.lessons.some((l) => l.id === path[0].lesson.id));
  assert.ok(unit.done >= 1 && unit.stars >= 3);
});

test('piano includes reading music, after the piano course', () => {
  const pianoLessons = pathState({}, 'piano');
  const allPiano = Object.fromEntries(pianoLessons.map((p) => [p.lesson.id, 3]));
  const h = instrumentHome('piano', { progress: allPiano });
  assert.equal(h.next.course, 'reading', 'all piano passed: next is reading music');
  assert.equal(h.lessons.total, pianoLessons.length + pathState({}, 'reading').length);
});

test('songs: lesson songs unlock along the path, Stage songs with crowns', () => {
  const g = instrumentHome('guitar');
  assert.ok(g.songs.length > 0 && g.songs.every((s) => s.kind === 'lesson' && s.course === 'guitar'), 'guitar songs are its play-along lessons');
  assert.ok(g.songs.every((s) => isSongLesson(s.lesson)));

  const stage = defaultStage();
  const songs = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }];
  const opts = { stage, playerId: 'p1', stageSongs: () => songs };
  let d = instrumentHome('drums', opts).songs.filter((s) => s.kind === 'stage');
  assert.deepEqual(d.map((s) => s.unlocked), [true, false, false], 'only the first Stage song is open');
  recordScore(stage, 'a', '9', 'p1', { score: 900, accuracy: 85, crowns: 3, maxCombo: 20 });
  d = instrumentHome('drums', opts).songs.filter((s) => s.kind === 'stage');
  assert.deepEqual(d.map((s) => s.unlocked), [true, true, false], 'a crown opens the next');
  assert.equal(d[0].crowns, 3);
  assert.equal(instrumentHome('drums', { ...opts, playerId: 'p2' }).songs.filter((s) => s.kind === 'stage' && s.unlocked).length, 1, 'per player');
  assert.ok(instrumentHome('drums', { ...opts, unlockAll: true }).songs.every((s) => s.unlocked), 'unlock all');
});

test('songs to show: next to play first, then what is coming, then passed ones', () => {
  const s = (title, unlocked, stars) => ({ kind: 'lesson', title, unlocked, stars });
  const shown = songsToShow([s('done', true, 3), s('ready', true, 0), s('l1', false, 0), s('l2', false, 0), s('l3', false, 0)]);
  assert.deepEqual(shown.map((x) => x.title), ['ready', 'l1', 'l2', 'done']);
  assert.equal(songsToShow(Array.from({ length: 20 }, (_, i) => s(`x${i}`, true, 0)), 5).length, 5);
});

test('tuners, ranks and tools', () => {
  assert.equal(tunerLesson('guitar').steps.find((st) => st.tune).instrument, 'guitar');
  assert.equal(tunerLesson('bass').steps.find((st) => st.tune).instrument, 'bass');
  assert.equal(tunerLesson('piano'), null);
  assert.deepEqual([0, 0.2, 0.5, 0.8, 1].map(rankFor), ['New', 'Beginner', 'Improving', 'Confident', 'Graduate']);
  const known = ['practice', 'songs', 'score', 'learn', 'grooves', 'kit', 'booth', 'lyrics', 'mic', 'tuner'];
  for (const inst of INSTRUMENTS) for (const t of inst.tools) assert.ok(known.includes(t), `${inst.id}: ${t}`);
  assert.ok(ALL_LESSONS.length > 0);
});
