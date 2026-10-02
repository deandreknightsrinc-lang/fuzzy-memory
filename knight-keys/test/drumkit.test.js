import test from 'node:test';
import assert from 'node:assert/strict';
import { LANES, laneOf, sameDrum, PIECES, KITS, resolveKit, kitNoteParams, outputFor, DRUM_OUTPUTS, ROUTE_DEFAULT, ROUTE_MAIN, ROUTE_PRESETS, outputName, logicChannels, routeOutput, routeRows, routesFromHost } from '../js/drumkit.js';

test('e-kit notes land in the right highway lane (Alesis Nitro Max and General MIDI)', () => {
  const lane = (n) => LANES[laneOf(n)]?.id;
  assert.equal(lane(36), 'kick');
  assert.equal(lane(38), 'snare');
  assert.equal(lane(40), 'snare', 'snare rim');
  assert.equal(lane(48), 'tom1', 'Nitro tom 1');
  assert.equal(lane(45), 'tom2', 'Nitro tom 2');
  assert.equal(lane(43), 'tom3', 'Nitro tom 3');
  assert.equal(lane(58), 'tom3', 'Nitro tom 3 rim');
  assert.equal(lane(22), 'hihat', 'closed hat edge');
  assert.equal(lane(26), 'hihat', 'open hat edge');
  assert.equal(lane(44), 'hihat', 'hat pedal');
  assert.equal(lane(55), 'crash', 'crash edge');
  assert.equal(lane(59), 'ride', 'ride edge');
  assert.equal(laneOf(56), -1, 'cowbell is not on the kit');
});

test('learn mode accepts any note of the same drum', () => {
  assert.ok(sameDrum(38, 40), 'rim shot counts as snare');
  assert.ok(sameDrum(42, 46), 'open or closed hat counts as hi-hat');
  assert.ok(sameDrum(49, 55), 'crash edge counts as crash');
  assert.ok(sameDrum(56, 56), 'same percussion note');
  assert.ok(!sameDrum(36, 38), 'kick is not snare');
  assert.ok(!sameDrum(56, 54), 'different percussion');
});

test('kits resolve to per-note settings for the sound engines', () => {
  const trap = resolveKit('trap', { snare: { level: 0.5 } });
  assert.equal(trap.kick.tune, -5, 'kit value');
  assert.equal(trap.snare.level, 0.5, 'your change wins');
  assert.equal(trap.snare.tune, 3, 'kit value kept for other knobs');
  assert.deepEqual(trap.cowbell, { tune: 0, decay: 1, level: 1 }, 'untouched piece is stock');
  const rows = kitNoteParams(trap);
  const notes = rows.map((r) => r[0]);
  assert.equal(new Set(notes).size, notes.length, 'each note once');
  for (const p of PIECES) for (const n of p.notes) assert.ok(notes.includes(n), `note ${n} covered`);
  assert.deepEqual(rows.find((r) => r[0] === 40), [40, 3, 0.6, 0.5], 'snare rim follows the snare');
  assert.ok(KITS.length >= 5);
  assert.equal(resolveKit('nope').kick.tune, 0, 'unknown kit falls back to the stock kit');
});

test('multi-output names match the plug-in groups', () => {
  assert.deepEqual([36, 40, 46, 58, 59, 56].map(outputFor), ['Kick', 'Snare', 'Hi-Hat', 'Toms', 'Cymbals', 'Percussion']);
});

test('per-drum routing for the plug-in\'s multi-output version', () => {
  assert.equal(DRUM_OUTPUTS, 15);
  // Same numbers as DrumSynth::outputFor in the plug-in.
  assert.equal(routeOutput(36), 1, 'kick by default on the Kick output');
  assert.equal(routeOutput(59), 5, 'ride on Cymbals');
  assert.equal(routeOutput(59, 15), 15);
  assert.equal(routeOutput(59, ROUTE_MAIN), ROUTE_MAIN);
  assert.equal(routeOutput(36, 99), 1, 'an output that does not exist means the default');
  assert.deepEqual([0, 1, 6, 7, 15].map(outputName), ['Main mix', 'Kick', 'Percussion', 'Drums 7', 'Drums 15'], 'the names Logic shows');
  assert.deepEqual([0, 1, 15].map(logicChannels), ['1-2', '3-4', '31-32']);
  // Rows cover every note of every piece.
  const rows = routeRows({ kick: 9, snare: ROUTE_MAIN, ride: 'x' });
  assert.equal(rows.length, PIECES.reduce((a, p) => a + p.notes.length, 0));
  assert.deepEqual(rows.filter(([n]) => n === 35 || n === 36).map(([, r]) => r), [9, 9], 'both kick notes go together');
  assert.deepEqual(rows.find(([n]) => n === 40), [40, ROUTE_MAIN]);
  assert.deepEqual(rows.find(([n]) => n === 51), [51, ROUTE_DEFAULT], 'bad values fall back to the default');
  // Presets: 15 drums, 15 outputs, one each.
  assert.equal(PIECES.length, DRUM_OUTPUTS);
  assert.deepEqual(new Set(Object.values(ROUTE_PRESETS.each)).size, 15);
  assert.deepEqual(Object.keys(ROUTE_PRESETS.each).sort(), PIECES.map((p) => p.id).sort(), 'every drum gets an output');
  for (const p of PIECES) if (ROUTE_PRESETS.each[p.id] <= 6) assert.equal(outputName(ROUTE_PRESETS.each[p.id]), outputName(routeOutput(p.notes[0])), `${p.name} sits on an output named for it`);
  assert.ok(routeRows(ROUTE_PRESETS.group).every(([, r]) => r === ROUTE_DEFAULT));
  assert.ok(routeRows(ROUTE_PRESETS.main).every(([, r]) => r === ROUTE_MAIN));
  // Reading the plug-in's saved routing back.
  assert.deepEqual(routesFromHost({ 36: 9, 35: 9, 49: 0 }), { kick: 9, crash: 0 });
});
