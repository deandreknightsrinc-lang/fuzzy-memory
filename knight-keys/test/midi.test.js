import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi, buildSong, writeMidi } from '../js/midi-file.js';
import { createDemoMidi } from '../js/demo.js';
import { Player } from '../js/player.js';

test('write → parse round trip keeps notes and timing', () => {
  const bytes = writeMidi(
    [
      { time: 0, bytes: [0xc0, 4] },
      { time: 0, bytes: [0x90, 60, 100] },
      { time: 0.5, bytes: [0x80, 60, 0] },
      { time: 0.5, bytes: [0x90, 64, 90] },
      { time: 1.25, bytes: [0x90, 64, 0] }, // note-on vel 0 = off
    ],
    { bpm: 100 },
  );
  const song = buildSong(parseMidi(bytes));
  assert.equal(song.notes.length, 2);
  assert.equal(song.notes[0].note, 60);
  assert.ok(Math.abs(song.notes[0].dur - 0.5) < 0.002);
  assert.ok(Math.abs(song.notes[1].time - 0.5) < 0.002);
  assert.ok(Math.abs(song.notes[1].dur - 0.75) < 0.002);
  assert.ok(Math.abs(song.bpm - 100) < 0.01);
  assert.equal(song.firstProgram[0], 4);
});

test('tempo changes are honoured', () => {
  // Hand-built format-0 file: ppq 96, 120 bpm then 60 bpm at tick 96.
  const track = [
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, // 500000us
    0x00, 0x90, 60, 100,
    0x60, 0xff, 0x51, 0x03, 0x0f, 0x42, 0x40, // tick 96: 1000000us
    0x00, 0x80, 60, 0,
    0x00, 0x90, 62, 100,
    0x60, 62, 0, // running status note-on vel 0 at tick 192
    0x00, 0xff, 0x2f, 0x00,
  ];
  const bytes = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, track.length, ...track,
  ]);
  const song = buildSong(parseMidi(bytes));
  assert.equal(song.notes.length, 2);
  assert.ok(Math.abs(song.notes[0].dur - 0.5) < 1e-6);
  assert.ok(Math.abs(song.notes[1].time - 0.5) < 1e-6);
  assert.ok(Math.abs(song.notes[1].dur - 1.0) < 1e-6);
});

test('demo song parses with key signature and three channels', () => {
  const song = buildSong(parseMidi(createDemoMidi()));
  assert.deepEqual(song.channels, [0, 1, 9]);
  assert.deepEqual(song.keySig, { sf: 0, minor: false });
  assert.ok(song.duration > 24);
  assert.equal(song.title.startsWith('Knight Keys Demo'), true);
});

function fakeClock() {
  let now = 0;
  const log = [];
  const hooks = {
    now: () => now,
    noteOn: (ch, note, vel, at) => log.push(['on', note, at]),
    noteOff: (ch, note, at) => log.push(['off', note, at]),
    control() {},
    program() {},
    pitch() {},
    allNotesOff: (at) => log.push(['alloff', null, at]),
    onEnd: () => log.push(['end']),
  };
  return { hooks, log, advance: (dt) => (now += dt) };
}

test('player schedules notes, transposes and loops A–B', () => {
  const song = buildSong(parseMidi(writeMidi([
    { time: 0, bytes: [0x90, 60, 100] }, { time: 0.4, bytes: [0x80, 60, 0] },
    { time: 1, bytes: [0x90, 62, 100] }, { time: 1.4, bytes: [0x80, 62, 0] },
    { time: 2, bytes: [0x90, 64, 100] }, { time: 2.4, bytes: [0x80, 64, 0] },
  ])));
  const { hooks, log, advance } = fakeClock();
  const p = new Player(hooks);
  p.load(song);
  p.transpose = 2;
  p.loop = { enabled: true, a: 0.9, b: 1.6 };
  p.seek(0.9);
  p.play();
  clearInterval(p.timer); // drive ticks manually
  for (let i = 0; i < 120; i++) {
    advance(0.025);
    p.tick();
  }
  const ons = log.filter((e) => e[0] === 'on').map((e) => e[1]);
  assert.ok(ons.length >= 3, 'loop repeats the note');
  assert.ok(ons.every((n) => n === 64), 'only the looped note (62 + 2) plays');
  assert.ok(p.time >= 0.9 && p.time < 1.6);
  p.pause();
});

test('player rate scales timing', () => {
  const song = buildSong(parseMidi(writeMidi([
    { time: 1, bytes: [0x90, 60, 100] }, { time: 1.5, bytes: [0x80, 60, 0] },
  ])));
  const { hooks, log, advance } = fakeClock();
  const p = new Player(hooks);
  p.load(song);
  p.setRate(0.5);
  p.play();
  clearInterval(p.timer);
  for (let i = 0; i < 160; i++) {
    advance(0.025);
    p.tick();
  }
  const on = log.find((e) => e[0] === 'on');
  assert.ok(Math.abs(on[2] - (0.05 + 2)) < 1e-6, `note at half speed lands at 2.05s, got ${on[2]}`);
});

import { GROOVES, compileGroove, GroovePlayer } from '../js/grooves.js';

test('every groove pattern row has the right number of steps', () => {
  for (const g of GROOVES) {
    const c = compileGroove(g); // throws on a bad row length
    assert.equal(c.main.hits.length, g.beatsPerBar * g.stepsPerBeat, g.id);
    assert.ok(c.main.hits.some((h) => h.length), `${g.id} has hits`);
    assert.ok(c.fill.hits.some((h) => h.length), `${g.id} has a fill`);
  }
});

test('groove player keeps time, plays a fill and crashes after it', () => {
  let now = 0;
  const hits = [];
  const steps = [];
  const gp = new GroovePlayer({
    now: () => now,
    hit: (note, vel, at) => hits.push({ note, vel, at }),
    step: (step, inFill, at) => steps.push({ step, inFill, at }),
  });
  gp.setGroove('halftime');
  gp.bpm = 60; // 16th = 0.25s, bar = 4s
  gp.start();
  clearInterval(gp.timer);
  gp.fill();
  for (let i = 0; i < 560; i++) {
    now += 0.025;
    gp.tick();
  }
  gp.stop();
  // Bar 1 was already scheduled by start(), so the fill takes bar 2.
  const bar = (n) => steps.filter((s) => s.at >= 0.06 + 4 * (n - 1) - 1e-9 && s.at < 0.06 + 4 * n - 1e-9);
  assert.equal(bar(1).length, 16);
  assert.ok(bar(1).every((s) => !s.inFill));
  assert.ok(bar(2).length === 16 && bar(2).every((s) => s.inFill), 'the queued fill replaces the next bar');
  assert.ok(bar(3).length === 16 && bar(3).every((s) => !s.inFill));
  assert.ok(Math.abs(steps[1].at - steps[0].at - 0.25) < 1e-9);
  const crash = hits.find((h) => h.note === 49);
  assert.ok(crash && Math.abs(crash.at - (0.06 + 8)) < 1e-9, 'crash on the downbeat after the fill');
});

test('light intensity drops ghost notes', () => {
  let now = 0;
  const vels = [];
  const gp = new GroovePlayer({ now: () => now, hit: (n, v) => vels.push(v), step() {} });
  gp.setGroove('neosoul');
  gp.intensity = 'light';
  gp.start();
  clearInterval(gp.timer);
  for (let i = 0; i < 100; i++) {
    now += 0.025;
    gp.tick();
  }
  gp.stop();
  assert.ok(vels.length > 0 && vels.every((v) => v >= 60 * 0.72));
});

test('song beat clock follows tempo changes', () => {
  // 120 bpm for 2 beats (1s), then 60 bpm.
  const track = [
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
    0x00, 0x90, 60, 100,
    0x81, 0x40, 0xff, 0x51, 0x03, 0x0f, 0x42, 0x40, // tick 192 (2 beats at ppq 96)
    0x60, 0x80, 60, 0,
    0x00, 0xff, 0x2f, 0x00,
  ];
  const bytes = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, track.length, ...track,
  ]);
  const song = buildSong(parseMidi(bytes));
  assert.ok(Math.abs(song.beatAt(0.5) - 1) < 1e-9);
  assert.ok(Math.abs(song.beatAt(1) - 2) < 1e-9);
  assert.ok(Math.abs(song.beatAt(2) - 3) < 1e-9);
  assert.ok(Math.abs(song.secAt(3) - 2) < 1e-9);
  assert.equal(Math.round(song.bpmAt(1.5)), 60);
});

test('locked groove lands on song beats through tempo, rate and loops', () => {
  // One-bar song at 120 bpm (bar = 2s) with notes so it has a duration.
  const song = buildSong(parseMidi(writeMidi([
    { time: 0, bytes: [0x90, 60, 100] }, { time: 7.9, bytes: [0x80, 60, 0] },
  ], { bpm: 120 })));
  let now = 0;
  const kicks = [];
  const gp = new GroovePlayer({
    now: () => now,
    hit: (note, vel, at) => note === 36 && kicks.push(at),
    step() {},
  });
  gp.setGroove('praise'); // kick on every beat
  gp.setLocked(true);
  gp.start();
  clearInterval(gp.timer);
  const player = new Player({
    now: () => now, noteOn() {}, noteOff() {}, control() {}, program() {}, pitch() {},
    allNotesOff() {}, onEnd() {},
    span: (from, to, ctxAt) => gp.scheduleSpan(from, to, ctxAt, song),
  });
  player.load(song);
  player.setRate(0.5); // half speed: beats every 1s instead of 0.5s
  player.loop = { enabled: true, a: 1, b: 2 }; // beats 2–4
  player.seek(1);
  player.play();
  clearInterval(player.timer);
  for (let i = 0; i < 200; i++) {
    now += 0.025;
    player.tick();
  }
  player.pause();
  gp.stop();
  // Song starts at ctx 0.05 on beat 2; at half speed a beat is 1s; the loop is 2 beats long.
  const expected = [];
  for (let n = 0; n < 5; n++) expected.push(0.05 + n * 1);
  for (const e of expected) assert.ok(kicks.some((k) => Math.abs(k - e) < 1e-6), `kick near ${e}: ${kicks.join(', ')}`);
  for (let i = 1; i < kicks.length; i++) assert.ok(Math.abs(kicks[i] - kicks[i - 1] - 1) < 1e-6, 'kicks stay one beat apart across the loop');
});

import { notesToMidiEvents, TRANSCRIBE_PRESETS } from '../js/transcribe.js';

test('transcribed notes become a playable MIDI file', () => {
  const notes = [
    { time: 0, dur: 0.9, note: 60, vel: 98 },
    { time: 1, dur: 0.9, note: 63, vel: 101 },
  ];
  const song = buildSong(parseMidi(writeMidi(notesToMidiEvents(notes))));
  assert.deepEqual(song.notes.map((n) => [n.note, n.vel]), [[60, 98], [63, 101]]);
  assert.ok(Math.abs(song.notes[1].time - 1) < 0.002 && Math.abs(song.notes[1].dur - 0.9) < 0.002);
  assert.equal(song.firstProgram[0], 0);
  for (const p of Object.values(TRANSCRIBE_PRESETS)) assert.ok(p.lo < p.hi && p.onset > 0 && p.frame > 0);
});

import { SONGS, LEVELS, songToMidi, parseMelody, parseChords, chordNotes, parsePitch, chartToChords, parseChordSymbol, validateSong, loadMySongs, saveMySongs } from '../js/songs.js';

test('library songs parse, line up and become MIDI', () => {
  const total = (items) => Math.max(...items.map((i) => i.beat + i.beats));
  for (const s of SONGS) {
    const melody = parseMelody(s.melody);
    const chords = parseChords(s.chords);
    const barBeats = (s.time[0] * 4) / s.time[1];
    if (melody.length) assert.ok(Math.abs(total(melody) - total(chords)) < 1e-9, `${s.id}: melody and chords end together`);
    if (!melody.length) assert.ok(Math.abs(total(chords) / barBeats - Math.round(total(chords) / barBeats)) < 1e-9, `${s.id}: whole bars`);
    assert.ok(['church', 'starter'].includes(s.category), `${s.id}: has a category`);
    const song = buildSong(parseMidi(songToMidi(s)));
    if (melody.length) assert.equal(song.notes.filter((n) => n.ch === 0).length, melody.length, `${s.id}: every melody note`);
    else assert.ok(song.notes.some((n) => n.ch === 0) && song.notes.some((n) => n.ch === 1), `${s.id}: chords in the right hand, bass in the left`);
    assert.deepEqual(song.keySig, { sf: s.key, minor: !!s.minor });
    assert.ok(Math.abs(song.bpm - s.bpm) < 0.01);
  }
  assert.equal(parsePitch('F#4'), 66);
  assert.equal(parsePitch('Bb3'), 58);
  assert.deepEqual(chordNotes('G'), [55, 59, 62]);
  assert.deepEqual(chordNotes('Em'), [52, 55, 59]);
  assert.deepEqual(chordNotes('C7'), [48, 52, 55, 58]);
});

test('worship chord names: sus, add9, slash chords and more', () => {
  assert.deepEqual(parseChordSymbol('D/F#'), { root: 2, intervals: [0, 4, 7], quality: '', bass: 6 });
  assert.deepEqual(chordNotes('D/F#'), [42, 50, 54, 57], 'F# in the bass under the D chord');
  assert.deepEqual(chordNotes('Csus4'), [48, 53, 55]);
  assert.equal(parseChordSymbol('Gadd9').intervals.includes(14), true);
  assert.equal(parseChordSymbol('Bbmaj7').root, 10);
  assert.equal(parseChordSymbol('F#m7b5').quality, 'm7b5');
  assert.equal(parseChordSymbol('CM7').quality, 'maj7', 'alias');
  assert.throws(() => parseChordSymbol('H7'));
});

test('chord charts become songs', () => {
  const chart = `Verse:
| G | D/F# | Em C |
[Chorus] G D Em C x2
| C:2 D:2 | % | N.C. |`;
  const { chords, bars, errors } = chartToChords(chart, 4);
  assert.deepEqual(errors, []);
  assert.equal(bars, 14);
  assert.ok(chords.startsWith('G:4 D/F#:4 Em:2 C:2 G:4 D:4 Em:4 C:4 G:4'));
  assert.ok(chords.endsWith('C:2 D:2 D:4 -:4'), '% repeats the last chord');
  assert.equal(chartToChords('Bm G | D A', 3).chords, 'Bm:1.5 G:1.5 D:1.5 A:1.5', '6/8: two chords share a bar');
  assert.match(chartToChords('G Hm').errors[0], /Hm/);
});

test('arrangement levels add parts but keep the song the same length', () => {
  for (const id of ['jesusloves', 'worshipflow', 'silentnight']) {
    const s = SONGS.find((x) => x.id === id);
    const songs = LEVELS.map((level) => buildSong(parseMidi(songToMidi(s, { level }))));
    const count = (song, ch) => song.notes.filter((n) => n.ch === ch).length;
    assert.ok(Math.abs(songs[0].duration - songs[2].duration) < 0.5, `${id}: same length`);
    assert.ok(count(songs[1], 0) > count(songs[0], 0) && count(songs[2], 0) >= count(songs[1], 0) * 0.6, `${id}: fuller right hand`);
    assert.ok(Math.min(...songs[2].notes.filter((n) => n.ch === 1).map((n) => n.note)) < 44, `${id}: advanced has a low octave bass`);
    assert.ok(count(songs[2], 9) > count(songs[0], 9), `${id}: busier drums`);
  }
});

test('your songs are checked and saved', () => {
  assert.deepEqual(validateSong({ title: 'Way', bpm: 70, chords: 'G:4 C:4' }), []);
  assert.ok(validateSong({ title: '', bpm: 70, chords: 'G:4' }).length);
  assert.ok(validateSong({ title: 'X', bpm: 70, chords: '' }).length);
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveMySongs([{ id: 'my-1', title: 'Sunday', chords: 'G:4' }], storage);
  assert.equal(loadMySongs(storage)[0].title, 'Sunday');
  assert.deepEqual(loadMySongs({ getItem: () => 'nope' }), []);
});

test('learn mode waits for the target part and lets the rest play', () => {
  const song = buildSong(parseMidi(songToMidi(SONGS.find((s) => s.id === 'mary'))));
  let now = 0;
  const sounded = [];
  const waits = [];
  const player = new Player({
    now: () => now, noteOn: (ch, note) => sounded.push([ch, note]), noteOff() {}, control() {}, program() {}, pitch() {},
    allNotesOff() {}, onEnd() {},
    onWait: (notes) => waits.push(notes),
  });
  player.load(song);
  player.learn = { isTarget: (e) => e.ch === 0 };
  player.play();
  clearInterval(player.timer);
  for (let i = 0; i < 40; i++) {
    now += 0.025;
    player.tick();
  }
  assert.deepEqual(waits, [[64]], 'waits for the first melody note (E4) right away');
  assert.ok(player.waiting && !player.playing);
  assert.ok(sounded.every(([ch]) => ch !== 0), 'the melody you play is never sounded for you');
  // Play the right note: it carries on, then waits for the next one (D4).
  player.resumeWait();
  clearInterval(player.timer);
  for (let i = 0; i < 40; i++) {
    now += 0.025;
    player.tick();
  }
  assert.deepEqual(waits[1], [62]);
  assert.ok(sounded.some(([ch]) => ch === 1), 'the left-hand chords played along');
  assert.deepEqual(player.nextTargets(player.waiting.time), [60]);
});

import { HostTransport } from '../js/host.js';

test("host transport: position, tempo, jitter and jumps", () => {
  let now = 10;
  const tr = new HostTransport(() => now);
  assert.equal(tr.known, false);
  tr.update({ playing: true, bpm: 120, ppq: 4, age: 0 });
  assert.equal(tr.epoch, 1);
  now += 1;
  assert.ok(Math.abs(tr.ppqAt(now) - 6) < 1e-9, 'two beats a second at 120 bpm');
  assert.ok(Math.abs(tr.timeAt(8) - 12) < 1e-9);
  tr.update({ playing: true, bpm: 120, ppq: 6.004, age: 0 }); // a few ms of jitter
  assert.ok(Math.abs(tr.ppqAt(now) - 6) < 1e-9, 'jitter keeps the anchor');
  assert.equal(tr.epoch, 1);
  tr.update({ playing: true, bpm: 120, ppq: 5.85, age: 100 }); // measured 100 ms ago, 50 ms ahead
  assert.ok(Math.abs(tr.ppqAt(now) - 6.05) < 1e-9, 'age places the report on our clock');
  assert.equal(tr.epoch, 1, 'a small correction is not a jump');
  tr.update({ playing: true, bpm: 120, ppq: 0, age: 0 }); // cycle back to bar 1
  assert.equal(tr.epoch, 2);
  tr.update({ playing: false, bpm: 120, ppq: 0.5 });
  assert.equal(tr.epoch, 3);
  now += 1;
  assert.equal(tr.ppqAt(now), 0.5, 'stopped: the position holds');
});

test('player follows Logic: song beats on Logic beats, ahead of time, and cycles', () => {
  // Song at 120 bpm: beat 2 (1 s) and beat 3 (1.5 s). Logic plays at 60 bpm.
  const song = buildSong(parseMidi(writeMidi([
    { time: 1, bytes: [0x90, 60, 100] }, { time: 1.2, bytes: [0x80, 60, 0] },
    { time: 1.5, bytes: [0x90, 62, 100] }, { time: 1.7, bytes: [0x80, 62, 0] },
  ])));
  const { hooks, log, advance } = fakeClock();
  const p = new Player(hooks);
  p.load(song);
  p.setFollow(true);
  const tr = new HostTransport(() => hooks.now());
  const start = hooks.now();
  tr.update({ playing: true, bpm: 60, ppq: 0 });
  let epoch = -1;
  const frame = () => {
    const t = hooks.now();
    const jump = tr.epoch !== epoch;
    epoch = tr.epoch;
    p.syncTo(song.secAt(tr.ppqAt(t)), tr.playing, {
      ahead: song.secAt(tr.ppqAt(t + 0.12)),
      ctxAt: (sec) => tr.timeAt(song.beatAt(sec)),
      jump,
    });
  };
  for (let i = 0; i < 200; i++) {
    frame();
    advance(0.016);
  }
  const ons = log.filter((e) => e[0] === 'on');
  assert.deepEqual(ons.map((e) => e[1]), [60, 62]);
  assert.ok(Math.abs(ons[0][2] - (start + 2)) < 1e-6, `beat 2 at 60 bpm is 2 s in, got ${ons[0][2] - start}`);
  assert.ok(Math.abs(ons[1][2] - (start + 3)) < 1e-6, 'beat 3 is 3 s in');

  // Logic's cycle jumps back to beat 1: everything stops and the song replays from there.
  log.length = 0;
  tr.update({ playing: true, bpm: 60, ppq: 1 });
  for (let i = 0; i < 100; i++) {
    frame();
    advance(0.016);
  }
  assert.equal(log[0][0], 'alloff', 'jump silences what was playing');
  assert.equal(log.filter((e) => e[0] === 'on')[0][1], 60, 'the first note plays again');

  // Stop in Logic: silence.
  log.length = 0;
  tr.update({ playing: false, bpm: 60, ppq: 2.5 });
  frame();
  assert.equal(log[0][0], 'alloff');
});

import { splitHands } from '../js/midi-file.js';

test('hymn files with both hands on one track split at middle C', () => {
  const one = buildSong(parseMidi(writeMidi([
    { time: 0, bytes: [0x90, 72, 90] }, { time: 0, bytes: [0x90, 48, 80] }, { time: 0, bytes: [0x99, 36, 100] },
    { time: 0.5, bytes: [0x80, 72, 0] }, { time: 0.5, bytes: [0x80, 48, 0] }, { time: 0.1, bytes: [0x89, 36, 0] },
    { time: 0.75, bytes: [0x90, 60, 90] }, { time: 1.25, bytes: [0x80, 60, 0] },
  ], { bpm: 90 })));
  const split = buildSong(parseMidi(splitHands(one, 60)));
  const by = (ch) => split.notes.filter((n) => n.ch === ch).map((n) => n.note);
  assert.deepEqual(by(0), [72, 60], 'middle C and up: right hand');
  assert.deepEqual(by(1), [48], 'below: left hand');
  assert.deepEqual(by(9), [36], 'drums stay drums');
  const c = split.notes.find((n) => n.note === 60);
  assert.ok(Math.abs(c.time - 0.75) < 0.01 && Math.abs(c.dur - 0.5) < 0.01, 'timing kept');
});
