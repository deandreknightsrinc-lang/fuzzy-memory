import test from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, COURSES, ALL_LESSONS, unitsFor, readNotes, grooveHits, grooveMidi, DrumJudge, GROOVE_ROWS, pathState, lessonStars, starsForMistakes, starsForAccuracy, starsForSinging, updateStreak, currentStreak } from '../js/lessons.js';
import { SONGS, songToMidi } from '../js/songs.js';
import { detectPitch, freqToMidi, freqToCents, centsFromTarget, midiToFreq, NoteTracker, SingJudge, RangeFinder, voiceType } from '../js/pitch.js';
import { parseMidi, buildSong } from '../js/midi-file.js';
import { laneOf, sameDrum } from '../js/drumkit.js';
import { makeChoirParts, choirMidi, guessChord, diatonicChord, PARTS } from '../js/choir.js';

test('every lesson step is valid and points at real songs', () => {
  const ids = new Set();
  for (const lesson of ALL_LESSONS) {
    assert.ok(!ids.has(lesson.id), `unique id ${lesson.id}`);
    ids.add(lesson.id);
    assert.ok(lesson.steps.length > 0);
    for (const step of lesson.steps) {
      assert.ok(['info', 'notes', 'chords', 'song', 'sing', 'range', 'read', 'hits', 'groove'].includes(step.type), step.type);
      if (step.type === 'hits') {
        for (const h of step.hits) for (const n of [].concat(h)) assert.ok(laneOf(n) >= 0, `${lesson.id}: ${n} is a drum on the highway`);
        if (step.sticking) assert.equal(step.sticking.length, step.hits.length);
      }
      if (step.type === 'groove') {
        assert.ok(['learn', 'time'].includes(step.mode), `${lesson.id}: groove mode`);
        assert.ok(step.bpm >= 40 && step.bpm <= 140);
        for (const bar of step.bars) {
          assert.ok(Object.keys(bar).every((k) => k === 'steps' || k in GROOVE_ROWS), `${lesson.id}: known drum rows`);
          for (const k of Object.keys(GROOVE_ROWS)) assert.ok(!bar[k] || bar[k].replace(/\s/g, '').length <= bar.steps, `${lesson.id}: ${k} fits in ${bar.steps} steps`);
        }
        assert.ok(grooveHits(step).length > 0, `${lesson.id}: the groove has hits`);
      }
      if (step.type === 'read') {
        assert.ok(step.notes || (step.pool?.length && step.count > 0), `${lesson.id}: notes or a pool to read`);
        const list = readNotes(step);
        assert.ok(list.length > 0 && list.every((n) => n >= 40 && n <= 84), `${lesson.id}: readable notes`);
        if (step.clef === 'bass') assert.ok(list.every((n) => n < 61), `${lesson.id}: bass clef notes stay on the bass staff`);
        else assert.ok(list.every((n) => n >= 60), `${lesson.id}: treble clef notes stay on the treble staff`);
      }
      if (step.type === 'sing') {
        assert.ok(step.notes.length > 0 && step.notes.every((n) => n >= 40 && n <= 84), `${lesson.id}: singable notes`);
        if (step.names) assert.equal(step.names.length, step.notes.length, `${lesson.id}: a name for every note`);
      }
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
  for (const u of UNITS) assert.ok(COURSES.some((c) => c.id === u.course), `${u.id} is in a course`);
  assert.ok(unitsFor('voice').length >= 4, 'a voice course');
  assert.ok(unitsFor('voice').some((u) => u.lessons.some((l) => l.steps.some((s) => s.type === 'range'))));
});

test('each course opens its own lessons', () => {
  const piano = pathState({});
  const voice = pathState({}, 'voice');
  assert.equal(piano[0].lesson.course, 'piano');
  assert.equal(voice[0].lesson.course, 'voice');
  assert.ok(voice[0].unlocked && !voice[1].unlocked, 'the first voice lesson is open without any piano lessons');
  const reading = pathState({}, 'reading');
  assert.ok(reading[0].unlocked && reading.length >= 10, 'a reading course');
  const drums = pathState({}, 'drums');
  assert.ok(drums[0].unlocked && drums.length >= 12, 'a drum course');
  assert.equal(piano.length + voice.length + reading.length + drums.length, ALL_LESSONS.length);
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

test('cents: how far off a note you are', () => {
  assert.deepEqual(freqToCents(440), { midi: 69, cents: 0 });
  assert.deepEqual(freqToCents(440 * 2 ** (20 / 1200)), { midi: 69, cents: 20 });
  assert.deepEqual(freqToCents(261.63 * 2 ** (-30 / 1200)), { midi: 60, cents: -30 });
  assert.ok(Math.abs(midiToFreq(60) - 261.63) < 0.01);
  assert.equal(Math.round(centsFromTarget(48.1, 60, true)), 10, 'an octave lower counts for singers');
  assert.equal(Math.round(centsFromTarget(48.1, 60, false)), -1190);
});

test('sing judge: hold each note in tune', () => {
  const j = new SingJudge([60, 64], { hold: 0.3, tolerance: 40 });
  const frames = (n, exact) => {
    let r = null;
    for (let i = 0; i < n; i++) r = j.push(exact, 0.03) || r;
    return r;
  };
  assert.equal(frames(5, 60.1), null, 'not held long enough yet');
  assert.equal(frames(6, 60.1), 'hit');
  assert.equal(j.target, 64);
  assert.equal(frames(60, 62), 'miss', 'a whole step off is a miss');
  assert.equal(frames(11, 52.05), 'done', 'an octave down counts');
  assert.ok(j.averageCents < 15);
  assert.equal(starsForSinging(j.averageCents, j.misses), 3);
  assert.equal(starsForSinging(35, 0), 1);
  assert.equal(starsForSinging(10, 4), 2);
});

test('range finder and voice types', () => {
  const r = new RangeFinder({ stable: 3 });
  for (const n of [50, 50, 50, 70, 55, 55, 55, 55, 67, 67, 67, null, 72]) r.push(n);
  assert.deepEqual([r.low, r.high], [50, 67], 'stray notes and squeaks do not count');
  assert.equal(voiceType(43, 64).id, 'bass');
  assert.equal(voiceType(48, 69).id, 'tenor');
  assert.equal(voiceType(53, 73).id, 'alto');
  assert.equal(voiceType(60, 81).id, 'soprano');
});

test('chord guessing', () => {
  assert.equal(guessChord([48, 52, 55]).quality, '');
  assert.equal(guessChord([57, 60, 64]).quality, 'm');
  assert.equal(guessChord([52, 60, 67]).bass, 4, 'C/E keeps the E in the bass');
  assert.deepEqual(diatonicChord(71, 1).pcs, [7, 11, 2], 'B in G major gets a G chord');
  assert.deepEqual(diatonicChord(65, 0).pcs, [5, 9, 0], 'F in C major gets an F chord');
});

test('choir parts: four singable parts in the right order, from chord tones', () => {
  for (const id of ['amazing', 'jesusloves', 'joyful', 'silentnight', 'worshipflow']) {
    const song = buildSong(parseMidi(songToMidi(SONGS.find((s) => s.id === id))));
    const parts = makeChoirParts(song);
    assert.ok(parts.soprano.length > 8, id);
    for (const p of PARTS) for (const n of parts[p.id]) assert.ok(n.note >= p.low && n.note <= p.high, `${id}: ${p.name} ${n.note} in range`);
    const at = (part, t) => parts[part].find((n) => n.time <= t + 1e-6 && n.time + n.dur > t + 1e-6)?.note;
    parts.soprano.forEach((s, i) => {
      const [S, A, T, B] = ['soprano', 'alto', 'tenor', 'bass'].map((p) => at(p, s.time));
      assert.ok(S > A && A > T && T > B, `${id} chord ${i}: ${S} ${A} ${T} ${B} in order`);
      const c = parts.chords[i];
      const pcs = (c.quality === 'm' ? [0, 3, 7] : c.quality === 'dim' ? [0, 3, 6] : [0, 4, 7]).map((x) => (x + c.root) % 12);
      for (const n of [A, T, B]) assert.ok(pcs.includes(n % 12), `${id} chord ${i}: ${n} is a chord tone`);
    });
    // The MIDI file has a named track per part on its own channel, with the choir sound.
    const back = buildSong(parseMidi(choirMidi(parts, { bpm: song.bpm, keySig: song.keySig })));
    assert.deepEqual(back.trackNames.slice(1), ['Soprano', 'Alto', 'Tenor', 'Bass']);
    assert.deepEqual(back.channels, [0, 1, 2, 3]);
    assert.equal(back.firstProgram[0], 52);
    assert.equal(back.notes.filter((n) => n.ch === 0).length, parts.soprano.length);
    assert.ok(Math.abs(back.bpm - song.bpm) < 0.01);
  }
});

test('reading drills: random notes from the pool, never twice in a row', () => {
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const list = readNotes({ pool: [60, 62, 64], count: 30 }, rand);
  assert.equal(list.length, 30);
  assert.ok(list.every((n, i) => [60, 62, 64].includes(n) && n !== list[i - 1]));
  assert.deepEqual(readNotes({ notes: [60, 67] }), [60, 67]);
});

test('drum grooves: grid -> hits -> MIDI with a count-in bar', () => {
  const step = { bpm: 60, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }], repeat: 2 };
  const hits = grooveHits(step);
  assert.equal(hits.length, (8 + 2 + 2) * 2);
  assert.deepEqual(hits.filter((h) => h.note === 38).map((h) => h.beat), [1, 3, 5, 7]);
  const g = grooveMidi(step);
  assert.equal(g.countIn, 4, 'one bar of 4 clicks at 60 bpm');
  const song = buildSong(parseMidi(g.bytes));
  const drums = song.notes.filter((n) => n.ch === 9);
  assert.equal(drums.length, hits.length);
  assert.ok(Math.abs(drums.find((n) => n.note === 38).time - 5) < 0.01, 'the first snare is on beat 2 after the count-in');
  assert.equal(song.notes.filter((n) => n.ch === 0).length, 12, 'a click on every beat, count-in included');
  // 3/4 and triplet grids
  assert.deepEqual(grooveHits({ time: [3, 4], bars: [{ steps: 3, kk: 'x..' }] }).map((h) => h.beat), [0]);
  assert.deepEqual(grooveHits({ bars: [{ steps: 12, hh: 'x.x' }] }).map((h) => +h.beat.toFixed(3)), [0, 0.667]);
});

test('drum timing judge', () => {
  const j = new DrumJudge([{ time: 1, note: 36 }, { time: 1.5, note: 38 }, { time: 2, note: 42 }], sameDrum);
  assert.equal(j.hit(35, 1.02), 'perfect', 'any kick note counts');
  assert.equal(j.hit(40, 1.6), 'good', 'snare rim, 100 ms late');
  assert.equal(j.hit(38, 1.6), 'extra', 'each note only once');
  assert.equal(j.missedBy(2.5), 1);
  assert.equal(j.accuracy, Math.round((100 * (2 - 0.5)) / 3));
  assert.equal(j.averageOffsetMs, 60);
});
