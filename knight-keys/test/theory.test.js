import test from 'node:test';
import assert from 'node:assert/strict';
import { detectChord, noteName, spellNote, solfege, keyName } from '../js/theory.js';

const name = (notes, sf = 0, mode = 'auto') => detectChord(notes, sf, mode)?.name;

test('triads and inversions', () => {
  assert.equal(name([60, 64, 67]), 'C');
  assert.equal(name([64, 67, 72]), 'C/E');
  assert.equal(detectChord([64, 67, 72]).inversion, '1st inversion');
  assert.equal(detectChord([67, 72, 76]).inversion, '2nd inversion');
  assert.equal(name([57, 60, 64]), 'Am');
  assert.equal(name([59, 62, 65]), 'Bdim');
  assert.equal(name([60, 64, 68]), 'Caug');
  assert.equal(name([60, 65, 67]), 'Csus4');
});

test('seventh and extended chords', () => {
  assert.equal(name([36, 52, 55, 59, 62]), 'Cmaj9');
  assert.equal(name([45, 48, 52, 55, 59]), 'Am9');
  assert.equal(name([43, 53, 57, 59, 64]), 'G13');
  assert.equal(name([45, 55, 60, 61, 67]), 'A7♯9');
  assert.equal(name([43, 53, 56, 59, 62]), 'G7♭9');
  assert.equal(name([38, 53, 55, 60, 64]), 'Dm11');
  assert.equal(name([60, 64, 70]), 'C7'); // no fifth
  assert.equal(name([59, 62, 65, 69]), 'Bm7♭5');
  assert.equal(detectChord([58, 60, 64, 67]).inversion, '3rd inversion');
});

test('intervals, single notes and power chords', () => {
  assert.equal(name([60]), 'C');
  assert.equal(detectChord([60, 64]).interval, 'M3');
  assert.equal(name([40, 47]), 'E5');
  assert.equal(detectChord([]), null);
});

test('spelling follows the key', () => {
  assert.equal(noteName(70, 0), 'A♯4');
  assert.equal(noteName(70, -1), 'B♭4');
  assert.equal(noteName(66, 2), 'F♯4');
  assert.equal(noteName(65, 7), 'E♯4');
  assert.equal(noteName(60, 7), 'B♯3');
  assert.equal(noteName(70, 0, 'flats'), 'B♭4');
  assert.equal(name([70, 74, 77], -2), 'B♭');
  assert.equal(spellNote(60).step, 35);
  assert.equal(keyName(-3), 'E♭ major');
  assert.equal(keyName(3, true), 'F♯ minor');
});

test('solfege', () => {
  assert.equal(solfege(67, 0, 'fixed'), 'Sol');
  assert.equal(solfege(71, 0, 'fixed'), 'Si');
  assert.equal(solfege(67, 1, 'movable'), 'Do'); // G major tonic
  assert.equal(solfege(66, 1, 'movable'), 'Ti');
  assert.equal(solfege(63, 0, 'movable'), 'Ri');
  assert.equal(solfege(63, -3, 'movable'), 'Do');
});

import { sampleFile, nearestSample, layerFor } from '../js/synth.js';

test('piano sample mapping covers A0–C8 within a semitone and a half', () => {
  assert.equal(sampleFile(21, 4), 'A0v4.mp3');
  assert.equal(sampleFile(60, 8), 'C4v8.mp3');
  assert.equal(sampleFile(63, 12), 'Ds4v12.mp3');
  assert.equal(sampleFile(66, 16), 'Fs4v16.mp3');
  assert.equal(sampleFile(108, 8), 'C8v8.mp3');
  for (let n = 21; n <= 108; n++) assert.ok(Math.abs(nearestSample(n) - n) <= 1, `note ${n}`);
});

test('velocity picks a layer, falling back to the nearest loaded one', () => {
  const all = new Set([4, 8, 12, 16]);
  assert.equal(layerFor(20, all), 4);
  assert.equal(layerFor(44, all), 4);
  assert.equal(layerFor(60, all), 8);
  assert.equal(layerFor(90, all), 12);
  assert.equal(layerFor(127, all), 16);
  assert.equal(layerFor(127, new Set([8])), 8);
  assert.equal(layerFor(110, new Set([8, 4])), 8);
  assert.equal(layerFor(20, new Set([8, 12])), 8);
});
