import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, crownsFor, defaultStage, recordScore, bestCrowns, courseState, loadStage, saveStage } from '../js/game.js';

const targets = [
  { t: 1.0, note: 60 },
  { t: 1.5, note: 62 },
  { t: 2.0, note: 64 },
  { t: 2.0, note: 67 }, // chord
  { t: 3.0, note: 65 },
];

test('hits are judged by timing: perfect, great, good', () => {
  const g = new GameSession(targets);
  assert.equal(g.hit(60, 1.02), 'perfect');
  assert.equal(g.hit(62, 1.58), 'great');
  assert.equal(g.hit(64, 1.87), 'good');
  assert.equal(g.combo, 3);
  assert.equal(g.score, 100 + 70 + 40);
});

test('wrong notes and mashing break the combo; unplayed notes become misses', () => {
  const g = new GameSession(targets);
  g.hit(60, 1.0);
  assert.equal(g.hit(61, 1.5), 'extra', 'wrong key');
  assert.equal(g.combo, 0);
  g.update(1.8); // 62 at 1.5 went by
  assert.equal(g.counts.miss, 1);
  g.hit(64, 2.0);
  g.hit(67, 2.01);
  const s = g.finish(); // 65 never played
  assert.equal(s.counts.miss, 2);
  assert.equal(s.counts.perfect, 3);
  assert.equal(s.counts.extra, 1);
  assert.equal(s.accuracy, 60);
  assert.equal(s.crowns, 1, '60% earns one crown');
  assert.equal(s.maxCombo, 2);
});

test('combo raises the multiplier up to 4x', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ t: i * 0.5, note: 60 }));
  const g = new GameSession(many);
  many.forEach((n) => g.hit(60, n.t));
  assert.equal(g.multiplier, 4);
  // 10 at 1x, 10 at 2x, 10 at 3x, 10 at 4x
  assert.equal(g.score, 100 * (10 + 20 + 30 + 40));
  assert.equal(g.finish().crowns, 5);
});

test('drums are judged by drum: a rim shot counts for the snare', () => {
  const g = new GameSession([{ t: 1, note: 38 }, { t: 1.5, note: 42 }], { drums: true });
  assert.equal(g.hit(40, 1.01), 'perfect');
  assert.equal(g.hit(46, 1.5), 'perfect', 'open hat for a closed-hat note');
});

test('slower practice speed gives looser windows', () => {
  const g = new GameSession([{ t: 1, note: 60 }], { rate: 0.5 });
  assert.equal(g.hit(60, 1.09), 'perfect', '90 ms of song time at half speed is 45 ms real');
});

test('crowns by accuracy', () => {
  assert.deepEqual([40, 50, 70, 85, 95, 100].map(crownsFor), [0, 1, 2, 3, 4, 5]);
});

test('scores, personal bests and the leaderboard', () => {
  const stage = defaultStage();
  const r1 = recordScore(stage, 'mary', '0', 'p1', { score: 900, accuracy: 70, crowns: 2, maxCombo: 9 }, 1);
  assert.deepEqual(r1, { rank: 1, best: true });
  const r2 = recordScore(stage, 'mary', '0', 'p2', { score: 1200, accuracy: 85, crowns: 3, maxCombo: 20 }, 2);
  assert.equal(r2.rank, 1);
  const r3 = recordScore(stage, 'mary', '0', 'p1', { score: 800, accuracy: 60, crowns: 1, maxCombo: 5 }, 3);
  assert.deepEqual(r3, { rank: 3, best: false });
  assert.equal(bestCrowns(stage, 'mary', '0', 'p1'), 2);
  assert.equal(bestCrowns(stage, 'mary', '9', 'p1'), 0);
});

test('courses unlock the next song after a crown', () => {
  const stage = defaultStage();
  const songs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  let c = courseState(stage, songs, '0', 'p1');
  assert.deepEqual(c.map((x) => x.unlocked), [true, false, false]);
  recordScore(stage, 'a', '0', 'p1', { score: 1, accuracy: 55, crowns: 1, maxCombo: 1 });
  c = courseState(stage, songs, '0', 'p1');
  assert.deepEqual(c.map((x) => x.unlocked), [true, true, false]);
  assert.deepEqual(courseState(stage, songs, '0', 'p2').map((x) => x.unlocked), [true, false, false], 'per player');
});

test('stage saves and loads', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const stage = defaultStage();
  stage.players[0].name = 'DeAndre';
  saveStage(stage, storage);
  assert.equal(loadStage(storage).players[0].name, 'DeAndre');
  assert.equal(loadStage({ getItem: () => '{bad' }).players.length, 3, 'bad data falls back');
});
