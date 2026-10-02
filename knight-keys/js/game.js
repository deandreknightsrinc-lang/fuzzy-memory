// Stage: the game side of Knight Keys. Play a part of a song in real time and
// get judged on every note, Guitar Hero style: Perfect / Great / Good / Miss,
// combos, a score multiplier and 1-5 crowns. Plus family profiles, scores and
// unlockable courses, kept in this browser.

import { sameDrum } from './drumkit.js';

/** Timing windows (seconds, at normal speed). */
export const WINDOWS = { perfect: 0.05, great: 0.1, good: 0.16 };
export const POINTS = { perfect: 100, great: 70, good: 40 };
const WEIGHT = { perfect: 1, great: 0.8, good: 0.5 };

/** Accuracy (0-100) needed for each crown. One crown passes the song. */
export const CROWNS = [50, 65, 80, 90, 97];

export const crownsFor = (accuracy) => CROWNS.filter((a) => accuracy >= a).length;

/**
 * One play of one part of a song.
 *   targets: [{ t, note }] (song seconds), drums: compare drums by drum, not exact note
 *   rate: playback speed (timing windows stretch with it)
 */
export class GameSession {
  constructor(targets, { drums = false, rate = 1 } = {}) {
    this.targets = targets
      .map((x) => ({ ...x, result: null, delta: 0 }))
      .sort((a, b) => a.t - b.t);
    this.drums = drums;
    this.scale = Math.max(1, 1 / rate); // slower songs get looser windows (in song time)
    this.next = 0; // first target not yet judged or missed
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0, extra: 0 };
    this.events = []; // judgements for the display: { target, result, at }
  }

  get multiplier() {
    return Math.min(4, 1 + Math.floor(this.combo / 10));
  }

  get judged() {
    const c = this.counts;
    return c.perfect + c.great + c.good + c.miss;
  }

  /** 0-100 over the notes judged so far (or the whole song at the end). */
  get accuracy() {
    const total = this.judged;
    if (!total) return 100;
    const c = this.counts;
    return (100 * (c.perfect * WEIGHT.perfect + c.great * WEIGHT.great + c.good * WEIGHT.good)) / total;
  }

  get done() {
    return this.next >= this.targets.length;
  }

  matches(target, note) {
    return this.drums ? sameDrum(target.note, note) : target.note === note;
  }

  /** You played `note` at song time `t`. Returns the judgement ('perfect'…, or 'extra'). */
  hit(note, t, at = t) {
    const win = WINDOWS.good * this.scale;
    let best = null;
    for (let i = this.next; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (target.t > t + win) break;
      if (target.result || target.t < t - win || !this.matches(target, note)) continue;
      if (!best || Math.abs(target.t - t) < Math.abs(best.t - t)) best = target;
    }
    if (!best) {
      // A hit that matches nothing breaks the combo (no mashing), but costs no accuracy.
      this.counts.extra++;
      this.combo = 0;
      this.events.push({ target: null, note, result: 'extra', at });
      return 'extra';
    }
    const d = Math.abs(best.t - t) / this.scale;
    const result = d <= WINDOWS.perfect ? 'perfect' : d <= WINDOWS.great ? 'great' : 'good';
    best.result = result;
    best.delta = t - best.t;
    this.counts[result]++;
    this.score += POINTS[result] * this.multiplier; // the streak before this note sets the multiplier
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.events.push({ target: best, note, result, at });
    this.advance();
    return result;
  }

  /** Call as the song plays: notes that went past without being played are misses. */
  update(t, at = t) {
    const win = WINDOWS.good * this.scale;
    for (let i = this.next; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (target.t >= t - win) break;
      if (!target.result) {
        target.result = 'miss';
        this.counts.miss++;
        this.combo = 0;
        this.events.push({ target, note: target.note, result: 'miss', at });
      }
    }
    this.advance();
  }

  /** The song ended: anything left is a miss. */
  finish() {
    this.update(Infinity);
    return this.summary();
  }

  advance() {
    while (this.next < this.targets.length && this.targets[this.next].result) this.next++;
  }

  summary() {
    const accuracy = Math.round(this.accuracy * 10) / 10;
    return {
      score: this.score,
      accuracy,
      crowns: crownsFor(accuracy),
      maxCombo: this.maxCombo,
      counts: { ...this.counts },
      notes: this.targets.length,
    };
  }
}

// ---- Profiles, scores and courses ---------------------------------------------

const KEY = 'kk.stage';
export const PLAYER_COLORS = ['#4f8cff', '#ff7a45', '#73d13d', '#f759ab', '#fadb14', '#b37feb'];

export function defaultStage() {
  return {
    players: [
      { id: 'p1', name: 'Dad', color: PLAYER_COLORS[0] },
      { id: 'p2', name: 'Son 1', color: PLAYER_COLORS[1] },
      { id: 'p3', name: 'Son 2', color: PLAYER_COLORS[2] },
    ],
    current: 'p1',
    scores: {}, // `${songKey}|${part}` -> [{ player, score, accuracy, crowns, maxCombo, date }]
    calibration: 0, // seconds added to your hits (audio/MIDI latency)
  };
}

export function loadStage(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage?.getItem(KEY) || 'null');
    if (s && Array.isArray(s.players) && s.players.length) return { ...defaultStage(), ...s };
  } catch {
    /* fall through */
  }
  return defaultStage();
}

export function saveStage(stage, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(stage));
  } catch {
    /* storage unavailable */
  }
}

export const scoreKey = (songKey, part) => `${songKey}|${part}`;

/** Adds a result; returns { rank (1-based in this song's board), best (new personal best) }. */
export function recordScore(stage, songKey, part, playerId, summary, date = Date.now()) {
  const key = scoreKey(songKey, part);
  const board = stage.scores[key] || [];
  const prevBest = Math.max(0, ...board.filter((r) => r.player === playerId).map((r) => r.score));
  const entry = { player: playerId, score: summary.score, accuracy: summary.accuracy, crowns: summary.crowns, maxCombo: summary.maxCombo, date };
  board.push(entry);
  board.sort((a, b) => b.score - a.score || a.date - b.date);
  stage.scores[key] = board.slice(0, 20);
  return { rank: stage.scores[key].indexOf(entry) + 1, best: summary.score > prevBest };
}

/** A player's best crowns on a song part (0 if never played). */
export function bestCrowns(stage, songKey, part, playerId) {
  return Math.max(0, ...(stage.scores[scoreKey(songKey, part)] || []).filter((r) => r.player === playerId).map((r) => r.crowns));
}

/**
 * Courses: the songs in order for one instrument part. The first song is open;
 * each next one opens when you earn at least one crown on the one before it.
 */
export function courseState(stage, songs, part, playerId) {
  let open = true;
  return songs.map((song) => {
    const crowns = bestCrowns(stage, song.id, part, playerId);
    const entry = { song, crowns, unlocked: open };
    open = crowns > 0;
    return entry;
  });
}
