import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi, routeNote, defaultPadNotes, pitchRate, bendSemitones, velocityGain, noteName, padForKey, keyForPad, GRID_ORDER } from '../js/midi-map.js';

test('parses keyboard messages on any channel', () => {
  assert.deepEqual(parseMidi([0x90, 60, 100]), { type: 'noteon', channel: 1, note: 60, velocity: 100 });
  assert.equal(parseMidi([0x99, 36, 0]).type, 'noteoff');
  assert.equal(parseMidi([0x99, 36, 64]).channel, 10);
  assert.equal(parseMidi([0x82, 60, 0]).type, 'noteoff');
  assert.deepEqual(parseMidi([0xb0, 64, 127]), { type: 'cc', channel: 1, cc: 64, value: 127 });
  assert.equal(parseMidi([0xe0, 0, 64]).value, 0);
  assert.equal(parseMidi([0xe0, 127, 127]).value, 8191);
});

test('pads mode: 16 notes from C1 (36)', () => {
  assert.deepEqual(routeNote(36), { pad: 0, rate: 1 });
  assert.deepEqual(routeNote(51), { pad: 15, rate: 1 });
  assert.equal(routeNote(60), null);
  assert.deepEqual(routeNote(48, { padNotes: defaultPadNotes(48) }), { pad: 0, rate: 1 });
});

test('keys mode plays the selected pad chromatically', () => {
  assert.deepEqual(routeNote(60, { mode: 'keys', selected: 5 }), { pad: 5, rate: 1 });
  assert.ok(Math.abs(routeNote(72, { mode: 'keys', selected: 5 }).rate - 2) < 1e-9);
  assert.ok(Math.abs(routeNote(60, { mode: 'keys', selected: 0, bend: 2 }).rate - pitchRate(2)) < 1e-9);
});

test('split mode: pads at the bottom, keys above', () => {
  assert.deepEqual(routeNote(40, { mode: 'split' }), { pad: 4, rate: 1 });
  assert.equal(routeNote(30, { mode: 'split' }), null);
  assert.equal(routeNote(72, { mode: 'split', selected: 2 }).pad, 2);
});

test('helpers', () => {
  assert.equal(noteName(60), 'C3');
  assert.equal(noteName(36), 'C1');
  assert.equal(bendSemitones(8192, 2), 2);
  assert.ok(velocityGain(1) > 0.09 && velocityGain(127) === 1);
  assert.equal(velocityGain(10, false), 1);
  assert.equal(padForKey('z'), 0);
  assert.equal(padForKey('4'), 15);
  assert.equal(keyForPad(0), 'Z');
  assert.equal(new Set(GRID_ORDER).size, 16);
});
