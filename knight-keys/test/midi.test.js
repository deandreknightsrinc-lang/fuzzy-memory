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
