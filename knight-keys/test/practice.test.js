import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYS, SCALES, CHORDS, QUIZ_POOLS, pianoScale, pianoChord, fretScale, shapeArpeggio, practiceLesson, quizLesson, guitarChordSymbols } from '../js/practice.js';
import { TUNINGS, chordShape, chordTarget } from '../js/fretted.js';
import { rng } from './guitar-sim.js';

const pitchesOf = (inst, notes) => notes.map(([s, f]) => TUNINGS[inst][s] + f);
const expected = (start, ints, octaves) => {
  const out = [];
  for (let o = 0; o < octaves; o++) for (const i of ints) out.push(start + 12 * o + i);
  return [...out, start + 12 * octaves];
};

test('piano scales: the right notes, with the standard fingerings', () => {
  const c = pianoScale(0, 'major');
  assert.deepEqual(c.notes, [60, 62, 64, 65, 67, 69, 71, 72]);
  assert.deepEqual(c.fingers, [1, 2, 3, 1, 2, 3, 4, 5], 'thumb under after finger 3');
  assert.deepEqual(pianoScale(0, 'major', { hand: 'left' }).fingers, [5, 4, 3, 2, 1, 3, 2, 1]);
  assert.deepEqual(pianoScale(5, 'major').fingers, [1, 2, 3, 4, 1, 2, 3, 4], 'F major: thumb under after 4');
  assert.deepEqual(pianoScale(7, 'major').notes.map((n) => n % 12), [7, 9, 11, 0, 2, 4, 6, 7], 'G major has F#');
  assert.deepEqual(pianoScale(9, 'minor').notes, [69, 71, 72, 74, 76, 77, 79, 81], 'A minor: all white keys');
  assert.equal(pianoScale(1, 'major').fingers, null, 'no made-up fingerings');
  assert.equal(pianoScale(0, 'major', { octaves: 2 }).notes.length, 15);
  assert.equal(pianoScale(0, 'major', { hand: 'left' }).notes[0], 48);
});

test('piano chords and inversions', () => {
  assert.deepEqual(pianoChord(0, 'maj').notes, [60, 64, 67]);
  assert.deepEqual(pianoChord(9, 'min').notes, [69, 72, 76]);
  assert.deepEqual(pianoChord(0, 'maj').inversions, [[60, 64, 67], [64, 67, 72], [67, 72, 76]]);
  assert.equal(pianoChord(7, 'dom7').inversions.length, 4, 'a 7th chord has three inversions');
  for (const type of Object.keys(CHORDS)) for (let r = 0; r < 12; r++) for (const inv of pianoChord(r, type).inversions) assert.ok(inv.every((n, i) => i === 0 || n > inv[i - 1]), `${KEYS[r]}${type}: notes go up`);
});

test('guitar and bass scales: every key fits one hand position, notes in order', () => {
  for (const inst of ['guitar', 'bass'])
    for (let r = 0; r < 12; r++)
      for (const [name, sc] of Object.entries(SCALES))
        for (const octaves of inst === 'guitar' ? [1, 2] : [1]) {
          const pos = fretScale(inst, r, sc.ints, { octaves });
          assert.ok(pos, `${inst} ${KEYS[r]} ${name} x${octaves} fits`);
          const p = pitchesOf(inst, pos.notes);
          assert.equal(p[0] % 12, r, 'starts on the root');
          assert.deepEqual(p, expected(p[0], sc.ints, octaves), `${inst} ${KEYS[r]} ${name}: the scale's notes`);
          const fretted = pos.notes.map(([, f]) => f).filter((f) => f > 0);
          assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 4, 'no wider than a stretch');
          assert.ok(Math.max(...fretted) <= 15);
          assert.ok(pos.fingers.every((f) => f >= 0 && f <= 4));
        }
});

test('the classic shapes come out the way teachers show them', () => {
  const g = fretScale('guitar', 7, SCALES.major.ints);
  assert.deepEqual(g.notes, [[6, 3], [6, 5], [5, 2], [5, 3], [5, 5], [4, 2], [4, 4], [4, 5]], 'G major, 2nd position');
  assert.deepEqual(g.fingers, [2, 4, 1, 2, 4, 1, 3, 4]);
  const a = fretScale('guitar', 9, SCALES.pentMinor.ints, { octaves: 2 });
  assert.deepEqual(a.notes.slice(0, 6), [[6, 5], [6, 8], [5, 5], [5, 7], [4, 5], [4, 7]], 'A minor pentatonic box at fret 5');
  assert.equal(a.fingers[0], 1, 'index on the root');
  const e = fretScale('guitar', 4, SCALES.pentMinor.ints, { octaves: 2 });
  assert.deepEqual(e.notes, [[6, 0], [6, 3], [5, 0], [5, 2], [4, 0], [4, 2], [3, 0], [3, 2], [2, 0], [2, 3], [1, 0]], 'E minor pentatonic, open');
  assert.deepEqual(fretScale('bass', 7, SCALES.major.ints).notes, [[4, 3], [4, 5], [3, 2], [3, 3], [3, 5], [2, 2], [2, 4], [2, 5]], 'bass G major matches the lesson');
});

test('drills are valid lessons for every instrument, key and type', () => {
  const validFret = (inst, notes) => notes.every(([s, f]) => TUNINGS[inst][s] !== undefined && f >= 0 && f <= 15);
  for (let r = 0; r < 12; r++) {
    for (const scale of Object.keys(SCALES))
      for (const instrument of ['piano', 'guitar', 'bass']) {
        const l = practiceLesson({ instrument, kind: 'scale', root: r, scale });
        assert.ok(l && l.practice && l.steps.length === 3, `${instrument} ${KEYS[r]} ${scale}`);
        for (const st of l.steps) if (st.type === 'fret') assert.ok(validFret(st.instrument, st.notes) && st.fingers.length === st.notes.length);
        for (const st of l.steps) if (st.type === 'notes') assert.ok(!st.fingers || st.fingers.length === st.notes.length);
      }
    for (const chord of Object.keys(CHORDS))
      for (const instrument of ['piano', 'bass']) {
        const l = practiceLesson({ instrument, kind: 'chord', root: r, chord });
        assert.ok(l, `${instrument} ${KEYS[r]}${chord}`);
        for (const st of l.steps) if (st.type === 'chords') assert.equal(st.chords.length, st.names.length);
      }
  }
  assert.equal(practiceLesson({ instrument: 'bass', kind: 'scale', root: 0, scale: 'major', octaves: 2 }).steps[1].notes.length, 8, 'bass stays one octave');
  for (const symbol of guitarChordSymbols()) {
    const l = practiceLesson({ instrument: 'guitar', kind: 'chord', symbol });
    assert.ok(l && chordShape(symbol), symbol);
    const arp = shapeArpeggio(symbol);
    const pcs = new Set(pitchesOf('guitar', arp.notes).map((p) => p % 12));
    const t = chordTarget(symbol);
    for (const pc of t.pcs.slice(0, 2)) assert.ok(pcs.has(pc), `${symbol}'s shape has its root and 3rd (or sus note)`); // the 5th may be left out (C7)
  }
  assert.equal(practiceLesson({ instrument: 'guitar', kind: 'chord', symbol: 'Xyz' }), null);
});

test('quizzes: random but valid, never the same chord twice in a row', () => {
  for (const [instrument, pools] of Object.entries(QUIZ_POOLS))
    for (const pool of Object.keys(pools)) {
      const l = quizLesson(instrument, pool, { count: 12, rand: rng(7) });
      const st = l.steps[0];
      const items = st.chords || st.notes;
      assert.equal(items.length, 12, `${instrument} ${pool}`);
      for (let i = 1; i < items.length; i++) assert.notDeepEqual(items[i], items[i - 1], 'no repeats in a row');
      if (st.type === 'strum') assert.ok(st.chords.every((c) => chordShape(c)));
      if (st.type === 'chords') assert.equal(st.names.length, st.chords.length);
      if (st.type === 'fret') assert.ok(st.notes.every(([s, f]) => TUNINGS.bass[s] !== undefined && f >= 0 && f <= 5));
    }
  assert.deepEqual(quizLesson('piano', 'Major chords', { rand: rng(3) }).steps, quizLesson('piano', 'Major chords', { rand: rng(3) }).steps, 'same seed, same quiz');
  assert.match(quizLesson('bass', 'Every note').title, /^Note quiz/);
});
