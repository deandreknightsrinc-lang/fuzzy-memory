import test from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, ALL_LESSONS, pathState, lessonStars, starsForMistakes, starsForAccuracy, updateStreak, currentStreak } from '../js/lessons.js';
import { SONGS } from '../js/songs.js';
import { detectPitch, freqToMidi, NoteTracker } from '../js/pitch.js';

test('every lesson step is valid and points at real songs', () => {
  const ids = new Set();
  for (const lesson of ALL_LESSONS) {
    assert.ok(!ids.has(lesson.id), `unique id ${lesson.id}`);
    ids.add(lesson.id);
    assert.ok(lesson.steps.length > 0);
    for (const step of lesson.steps) {
      assert.ok(['info', 'notes', 'chords', 'song'].includes(step.type), step.type);
      assert.ok(step.text?.length > 5, `${lesson.id}: step has instructions`);
      if (step.type === 'notes') {
        assert.ok(step.notes.every((n) => n >= 36 && n <= 84));
        assert.equal(step.fingers.length, step.notes.length, `${lesson.id}: a finger for every note`);
      }
      if (step.type === 'chords') assert.equal(step.chords.length, step.names.length);
      if (step.type === 'song') {
        const song = SONGS.find((s) => s.id === step.song);
        assert.ok(song, `${lesson.id}: song ${step.song} exists`);
      }
    }
  }
  assert.ok(UNITS.length >= 6 && ALL_LESSONS.length >= 18);
});

test('the path opens one lesson at a time', () => {
  let p = pathState({});
  assert.deepEqual(p.slice(0, 3).map((x) => x.unlocked), [true, false, false]);
  p = pathState({ 'middle-c': 2 });
  assert.deepEqual(p.slice(0, 3).map((x) => x.unlocked), [true, true, false]);
});

test('stars', () => {
  assert.equal(starsForMistakes(0, 5), 3);
  assert.equal(starsForMistakes(2, 5), 2);
  assert.equal(starsForMistakes(6, 5), 1);
  assert.equal(starsForAccuracy(95), 3);
  assert.equal(starsForAccuracy(75), 2);
  assert.equal(starsForAccuracy(40), 1);
  assert.equal(lessonStars([0, 3, 2]), 2, 'info steps (0) are ignored');
  assert.equal(lessonStars([0]), 3);
});

test('daily practice streak', () => {
  let r = updateStreak({}, '2026-10-02');
  assert.deepEqual(r, { last: '2026-10-02', streak: 1 });
  r = updateStreak(r, '2026-10-02');
  assert.equal(r.streak, 1, 'same day counts once');
  r = updateStreak(r, '2026-10-03');
  assert.equal(r.streak, 2);
  assert.equal(currentStreak(r, '2026-10-04'), 2, 'still alive the next day');
  assert.equal(currentStreak(r, '2026-10-06'), 0, 'broken after a missed day');
  assert.equal(updateStreak(r, '2026-10-06').streak, 1);
});

const tone = (freq, sr = 44100, n = 2048, harmonics = [1, 0.5, 0.3, 0.2]) => {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = harmonics.reduce((s, a, h) => s + 0.2 * a * Math.sin((2 * Math.PI * freq * (h + 1) * i) / sr), 0);
  return buf;
};

test('microphone pitch detection finds piano notes', () => {
  for (const midi of [36, 48, 60, 64, 69, 76, 84]) {
    const f = 440 * 2 ** ((midi - 69) / 12);
    const p = detectPitch(tone(f), 44100);
    assert.ok(p, `heard ${midi}`);
    assert.equal(freqToMidi(p.freq), midi, `note ${midi}`);
  }
  assert.equal(detectPitch(new Float32Array(2048), 44100), null, 'silence');
  const noise = Float32Array.from({ length: 2048 }, () => Math.random() * 0.4 - 0.2);
  assert.equal(detectPitch(noise, 44100), null, 'noise has no pitch');
});

test('note tracker needs a steady pitch and ends notes on silence', () => {
  const ev = [];
  const t = new NoteTracker((on, m) => ev.push([on, m]));
  [60, null, 60, 60, 60, 62, 62, null, null, null].forEach((m) => t.push(m));
  assert.deepEqual(ev, [[true, 60], [false, 60], [true, 62], [false, 62]]);
});
