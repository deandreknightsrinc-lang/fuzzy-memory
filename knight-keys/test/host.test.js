import test from 'node:test';
import assert from 'node:assert/strict';

// Pretend to be inside the Knight Lyfe Ultimate web view.
const sent = [];
const listeners = {};
globalThis.window = {
  __JUCE__: {
    backend: {
      emitEvent: (id, payload) => sent.push([id, payload]),
      addEventListener: (id, fn) => (listeners[id] = fn),
    },
  },
};
const { HostSynth, IN_HOST, onHostMidi } = await import('../js/host.js');
const flush = () => new Promise((r) => setTimeout(r, 0));

test('inside the plug-in, notes go to the C++ engine with their delay', async () => {
  assert.equal(IN_HOST, true);
  const s = new HostSynth();
  sent.length = 0;
  s.noteOn(0, 60, 100, s.now + 0.25);
  s.noteOff(0, 60, s.now + 0.5);
  s.control(0, 64, 127);
  s.pitchBend(16, 4096);
  await flush();
  assert.equal(sent.length, 1, 'batched into one message');
  const [id, { batch }] = sent[0];
  assert.equal(id, 'kk');
  assert.deepEqual(batch[0].m.slice(0, 4), [0, 0x90, 60, 100]);
  assert.ok(Math.abs(batch[0].m[4] - 250) < 20, `about 250 ms ahead, got ${batch[0].m[4]}`);
  assert.deepEqual(batch[1].m.slice(0, 4), [0, 0x80, 60, 0]);
  assert.deepEqual(batch[2].m.slice(0, 4), [0, 0xb0, 64, 127]);
  assert.deepEqual(batch[3].m.slice(0, 4), [16, 0xe0, 0, 96], '14-bit bend, LSB then MSB');
  assert.equal(s.channels[0].sustain, true, 'channel state kept for the interface');
});

test('MIDI the host already played is not sent back (no double notes)', async () => {
  const s = new HostSynth();
  sent.length = 0;
  s.fromHost = true;
  s.noteOn(16, 64, 90); // your playing, came from Logic
  s.noteOn(18, 36, 90); // e-kit hit
  s.noteOn(0, 60, 90); // song playback still goes through
  s.fromHost = false;
  await flush();
  const notes = sent.flatMap(([, p]) => p.batch).filter((b) => b.m);
  assert.deepEqual(notes.map((b) => b.m[0]), [0]);
});

test('mixer, stop, cancel and panic messages', async () => {
  const s = new HostSynth();
  sent.length = 0;
  s.setMuted(3, true);
  s.setMix(5, 0.5);
  s.allNotesOff();
  s.cancelOneShots(s.now, 18);
  s.panic();
  await flush();
  const batch = sent.flatMap(([, p]) => p.batch);
  assert.deepEqual(batch.find((b) => b.g && b.g[0] === 3).g, [3, 0]);
  assert.ok(batch.some((b) => b.g && b.g[0] === 5 && b.g[1] > 0 && b.g[1] < 0.5));
  assert.ok(batch.some((b) => 'off' in b));
  assert.ok(batch.some((b) => b.cancel === 18));
  assert.ok(batch.some((b) => b.panic === 1));
});

test('host MIDI reaches the interface', () => {
  const got = [];
  onHostMidi((msgs) => got.push(...msgs));
  listeners.hostMidi([[0x90, 60, 100], [0x80, 60, 0]]);
  assert.deepEqual(got, [[0x90, 60, 100], [0x80, 60, 0]]);
});

test('in the app, the engine listens: notes and strummed chords reach the lessons', async () => {
  const { HostListener, hostCanListen } = await import('../js/host.js');
  const { chromaMatches } = await import('../js/pitch.js');
  const { chordTarget } = await import('../js/fretted.js');
  const { strum, analyserDb } = await import('./guitar-sim.js');

  const notes = [];
  const l = new HostListener((on, midi) => notes.push([on, midi]));
  listeners.hostInfo({ canListen: false }); // the Logic plug-in
  assert.equal(hostCanListen(), false);
  await assert.rejects(l.start(), /plug-in/, 'the plug-in explains it has no mic');

  listeners.hostInfo({ canListen: true }); // the standalone app
  sent.length = 0;
  await l.start();
  assert.deepEqual(sent.at(-1), ['kkListen', { on: true, range: 'normal' }]);
  l.setRange('bass');
  assert.deepEqual(sent.at(-1), ['kkListen', { on: true, range: 'bass' }]);

  const pitches = [];
  l.addPitchListener((exact) => pitches.push(exact));
  for (let i = 0; i < 4; i++) listeners.hostListen({ note: 57.04, rms: 0.2, sr: 48000, fftSize: 8192, db: [] });
  assert.equal(pitches[0], 57.04, 'exact pitch for singing');
  assert.deepEqual(notes[0], [true, 57], 'a steady pitch becomes a note-on');

  // A strummed G from the virtual guitar, as the engine sends it (bins up to 1500 Hz).
  const chromas = [];
  l.addChromaListener((c) => chromas.push(c));
  const { audio, sr } = strum('G', { seed: 3 });
  const db = Array.from(analyserDb(audio, sr, 0.35).slice(0, 260), (v) => Math.round(v * 10) / 10);
  listeners.hostListen({ note: null, rms: 0.2, sr, fftSize: 8192, db });
  const g = chordTarget('G');
  assert.ok(chromaMatches(chromas.at(-1), g.root, g.quality, null, g.notes), 'heard as G');
  const c = chordTarget('C');
  assert.ok(!chromaMatches(chromas.at(-1), c.root, c.quality, null, c.notes), 'not C');
  listeners.hostListen({ note: null, rms: 0.001, sr, fftSize: 8192, db });
  assert.equal(chromas.at(-1), null, 'too quiet: no chord');

  l.stop();
  assert.deepEqual(sent.at(-1), ['kkListen', { on: false }]);
  const before = pitches.length;
  listeners.hostListen({ note: 60, rms: 0.2, sr, fftSize: 8192, db });
  assert.equal(pitches.length, before, 'nothing after stop');
});
