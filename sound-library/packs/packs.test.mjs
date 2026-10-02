// node --test sound-library/packs/packs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SR, rng, finish, wav, drumPack, grooveMidi, progressionMidi, PROGRESSIONS, makePacks, safe } from './make-packs.mjs';
import { GROOVES } from '../../knight-keys/js/grooves.js';
import { parseMidi, buildSong } from '../../knight-keys/js/midi-file.js';

const readWav = (b) => {
  const n = (b.length - 44) / 3;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readIntLE(44 + i * 3, 3) / 8388607;
  return x;
};
const song = (bytes) => buildSong(parseMidi(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length)));
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

test('every drum sound renders clean, normalized audio', () => {
  const items = drumPack();
  assert.equal(items.length, 84);
  const seen = new Set();
  for (const [folder, name, render] of items) {
    assert.ok(!seen.has(name), `unique name ${name}`);
    seen.add(name);
    const x = finish(render(rng(1)));
    let peak = 0;
    for (const v of x) {
      assert.ok(Number.isFinite(v), `${name}: finite samples`);
      peak = Math.max(peak, Math.abs(v));
    }
    assert.ok(Math.abs(peak - 0.944) < 0.001, `${name}: peak at -0.5 dBFS`);
    assert.ok(x.length > 0.05 * SR && x.length < 3.5 * SR, `${name}: ${x.length / SR}s long`);
    assert.ok(Math.abs(x[x.length - 1]) < 0.01, `${name}: fades to silence`);
    assert.ok(name.startsWith('KL ') && folder, name);
  }
});

test('808s are in tune', () => {
  for (const [, name, render] of drumPack().filter(([f]) => f === '808s')) {
    const note = name.split(' ').at(-1);
    const midi = 28 + ((NAMES.indexOf(note) - 4 + 12) % 12); // E1 up to D#2
    const want = 440 * Math.pow(2, (midi - 69) / 12);
    const x = render(rng(1)).subarray(Math.round(0.3 * SR), Math.round(0.8 * SR));
    let best = 0, lag = 0;
    for (let l = Math.round(SR / 90); l < SR / 35; l++) {
      let c = 0;
      for (let i = 0; i < x.length - l; i += 2) c += x[i] * x[i + l];
      if (c > best) [best, lag] = [c, l];
    }
    const got = SR / lag;
    assert.ok(Math.abs(1200 * Math.log2(got / want)) < 25, `${name}: ${got.toFixed(1)} Hz, want ${want.toFixed(1)}`);
  }
});

test('the same seed makes the same sound', () => {
  const [, , render] = drumPack()[12];
  assert.deepEqual(wav(finish(render(rng(7)))), wav(finish(render(rng(7)))));
  const w = wav(new Float32Array([0, 0.5, -0.5]));
  assert.equal(w.toString('latin1', 0, 4), 'RIFF');
  assert.equal(w.readUInt16LE(34), 24, '24-bit');
  assert.equal(w.readUInt32LE(24), 44100);
});

test('drum grooves: 4 bars on the drum channel at the groove\'s tempo', () => {
  for (const g of GROOVES) {
    const s = song(grooveMidi(g));
    assert.ok(s.notes.length > 8, g.name);
    assert.ok(s.notes.every((n) => n.ch === 9), `${g.name}: channel 10`);
    const bars = 4 * g.beatsPerBar * (g.beatUnit || 1) * (60 / (g.bpm * (g.beatUnit || 1)));
    assert.ok(Math.max(...s.notes.map((n) => n.time)) < bars, `${g.name}: within 4 bars`);
  }
});

test('chord progressions in all 12 keys', () => {
  const p = PROGRESSIONS.find((x) => x.id === 'gospel-251');
  const names = (key) => {
    const s = song(progressionMidi(p, key));
    const first = s.notes.filter((n) => n.time < 0.01).map((n) => n.note).sort((a, b) => a - b);
    return first.map((n) => NAMES[n % 12]);
  };
  assert.deepEqual(names(0), ['D', 'D', 'F', 'A', 'C', 'E'], 'Dm9 over D in C');
  assert.deepEqual(names(7), ['A', 'A', 'C', 'E', 'G', 'B'], 'Am9 over A in G');
  for (const pr of PROGRESSIONS) {
    for (let key = 0; key < 12; key++) {
      const s = song(progressionMidi(pr, key));
      assert.equal(new Set(s.notes.map((n) => n.time.toFixed(2))).size, pr.chords.length, `${pr.name} in ${key}: one change per chord`);
      assert.ok(s.notes.every((n) => n.note >= 36 && n.note <= 79), `${pr.name}: playable range`);
    }
  }
});

test('making the packs writes every file with a safe name', () => {
  assert.equal(safe('6/8 Ballad'), '6-8 Ballad');
  const dir = mkdtempSync(join(tmpdir(), 'kl-packs-'));
  try {
    const files = makePacks(dir);
    assert.equal(files.length, 84 + GROOVES.length + PROGRESSIONS.length * 12);
    assert.ok(readFileSync(join(dir, 'Knight Lyfe Drums Vol 1', 'LICENSE.txt'), 'utf8').includes('free of charge'));
    const kick = readWav(readFileSync(join(dir, 'Knight Lyfe Drums Vol 1', 'Kicks', 'KL Kick 01 Punch.wav')));
    assert.ok(kick.length > 0.2 * SR);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
