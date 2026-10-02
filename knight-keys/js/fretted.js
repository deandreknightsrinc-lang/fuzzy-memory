// Guitar and bass: tunings, where notes are on the neck, open chord shapes,
// and play-along chord charts for the guitar and bass courses.

import { parseChordSymbol, parseChords } from './songs.js';
import { writeMidi } from './midi-file.js';

/** Open strings by string number (1 = the thinnest, highest string), standard tuning. */
export const TUNINGS = {
  guitar: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }, // E4 B3 G3 D3 A2 E2
  bass: { 1: 43, 2: 38, 3: 33, 4: 28 }, // G2 D2 A1 E1
};
export const STRING_NAMES = {
  guitar: { 1: 'high E', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'low E' },
  bass: { 1: 'G', 2: 'D', 3: 'A', 4: 'E' },
};

/** The note a string and fret play. */
export const fretNote = (instrument, string, fret) => TUNINGS[instrument][string] + fret;

/**
 * Open chord shapes for guitar: frets from string 6 (low E) to string 1
 * (-1 = don't play that string), and the finger for each (1 index .. 4 pinky).
 */
export const CHORD_SHAPES = {
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
  'D/F#': { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  F: { frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1] }, // the easy F (no full barre)
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: 2 },
};

/**
 * The shape to show for a chord symbol: its own, else the plain major/minor
 * chord with the same root (Gmaj7 -> G), else null.
 */
export function chordShape(symbol) {
  if (CHORD_SHAPES[symbol]) return { name: symbol, ...CHORD_SHAPES[symbol] };
  let c;
  try {
    c = parseChordSymbol(symbol);
  } catch {
    return null;
  }
  const minor = c.intervals.includes(3) && !c.intervals.includes(4);
  const name = Object.keys(CHORD_SHAPES).find((k) => {
    const s = parseChordSymbol(k);
    return s.root === c.root && !k.includes('/') && (minor ? k.endsWith('m') : /^[A-G]$/.test(k));
  });
  return name ? { name, ...CHORD_SHAPES[name] } : null;
}

/** The notes a shape sounds (low to high). */
export const shapeNotes = (shape) => shape.frets.map((f, i) => (f < 0 ? null : fretNote('guitar', 6 - i, f))).filter((n) => n !== null);

/** Root (pitch class) and major/minor of a chord symbol, as the chord detector hears it. */
export function chordTarget(symbol) {
  const c = parseChordSymbol(symbol);
  const minor = c.intervals.includes(3) && !c.intervals.includes(4);
  // Suspended chords have no third: the 4th (or 2nd) takes its place.
  const sus = !c.intervals.includes(3) && !c.intervals.includes(4) ? (c.intervals.includes(5) ? 5 : c.intervals.includes(2) ? 2 : 0) : 0;
  const middle = sus || (minor ? 3 : 4);
  return { root: c.root, bass: c.bass ?? c.root, quality: minor ? 'm' : '', sus: !!sus, pcs: [c.root, (c.root + middle) % 12, (c.root + 7) % 12] };
}

/** Where to play a pitch class low on the neck: [string, fret] (bass: E then A string, frets 0-5). */
export function rootPosition(instrument, pc) {
  const strings = instrument === 'bass' ? [4, 3, 2] : [6, 5, 4];
  for (const s of strings) {
    const fret = (((pc - TUNINGS[instrument][s]) % 12) + 12) % 12;
    if (fret <= 5) return [s, fret];
  }
  return [strings[0], (((pc - TUNINGS[instrument][strings[0]]) % 12) + 12) % 12];
}

/**
 * A play-along chart: either a list of chords (each `beats` long) or a library
 * song's chords. Returns the windows in song seconds (after a one-bar count-in)
 * and a click-track MIDI file to play under you.
 */
export function chartTimeline(step, songs = []) {
  let chords;
  let bpm = step.bpm;
  let time = step.time || [4, 4];
  if (step.song) {
    const song = songs.find((s) => s.id === step.song);
    chords = parseChords(song.chords).map((c) => ({ symbol: c.symbol, beat: c.beat, beats: c.beats }));
    bpm ??= song.bpm;
    time = song.time;
    const first = chords[0]?.beat || 0;
    chords = chords.map((c) => ({ ...c, beat: c.beat - first }));
  } else {
    let beat = 0;
    chords = step.chords.map((symbol) => {
      const c = { symbol, beat, beats: step.beats || 4 };
      beat += c.beats;
      return c;
    });
  }
  const reps = step.repeat || 1;
  const length = chords.reduce((m, c) => Math.max(m, c.beat + c.beats), 0);
  const all = [];
  for (let r = 0; r < reps; r++) for (const c of chords) all.push({ ...c, beat: c.beat + r * length });
  const beatsPerBar = (time[0] * 4) / time[1];
  const spb = 60 / bpm;
  const countIn = beatsPerBar;
  const windows = all.map((c) => ({ symbol: c.symbol, start: (countIn + c.beat) * spb, end: (countIn + c.beat + c.beats) * spb, ...chordTarget(c.symbol) }));
  const ev = [{ time: 0, bytes: [0xff, 0x58, 0x04, time[0], Math.log2(time[1]), 0x18, 0x08] }, { time: 0, bytes: [0xc0, 115] }];
  const total = countIn + length * reps;
  for (let b = 0; b < total; b++) {
    const accent = b % beatsPerBar === 0;
    ev.push({ time: b * spb, bytes: [0x90, accent ? 84 : 79, accent ? 100 : 65] });
    ev.push({ time: (b + 0.1) * spb, bytes: [0x80, accent ? 84 : 79, 0] });
  }
  return { bpm, windows, countIn: countIn * spb, bytes: writeMidi(ev, { bpm, name: step.name || 'Play along' }) };
}

/**
 * Scores a play-along: each chord window passes when the right chord (or, for
 * bass, the right root note) is heard in enough of it. Feed it frame(t, ok).
 */
export class ChartJudge {
  constructor(windows, { need = 0.25 } = {}) {
    this.windows = windows.map((w) => ({ ...w, frames: 0, good: 0 }));
    this.need = need;
  }

  current(t) {
    return this.windows.find((w) => t >= w.start && t < w.end) || null;
  }

  /** One listening frame at song time t: ok says whether it matched that moment's chord. */
  frame(t, ok) {
    const w = this.current(t);
    if (!w) return null;
    w.frames++;
    if (ok) w.good++;
    return w;
  }

  passed(w) {
    return w.frames > 0 && w.good / w.frames >= this.need;
  }

  get done() {
    return this.windows.filter((w) => this.passed(w)).length;
  }

  get accuracy() {
    return Math.round((100 * this.done) / (this.windows.length || 1));
  }
}
