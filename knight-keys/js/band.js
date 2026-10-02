// Band Room: turns any song into a full worship band and choir - lead vocal,
// keys, guitar, bass, organ, drums and soprano/alto/tenor/bass - so whoever
// shows up can rehearse, and the "AI session musicians" fill in every part
// nobody is playing or singing.

import { parseChords, DRUM_STYLES, fillHits } from './songs.js';
import { guessChord, voiceChord, melodyLine } from './choir.js';
import { chordShape, shapeNotes } from './fretted.js';
import { writeMidiTickTracks, metaEvent } from './midi-file.js';

/** The parts of the band and choir, each on its own MIDI channel. */
export const ROLES = [
  { id: 'lead', name: 'Lead vocal (melody)', group: 'band', ch: 0, program: 53, icon: '🎤' },
  { id: 'keys', name: 'Keys', group: 'band', ch: 1, program: 0, icon: '🎹' },
  { id: 'guitar', name: 'Guitar', group: 'band', ch: 2, program: 25, icon: '🎸' },
  { id: 'bass', name: 'Bass', group: 'band', ch: 3, program: 33, icon: '🎸' },
  { id: 'organ', name: 'Organ / pad', group: 'band', ch: 8, program: 19, icon: '⛪' },
  { id: 'drums', name: 'Drums', group: 'band', ch: 9, program: 0, icon: '🥁' },
  { id: 'soprano', name: 'Soprano', group: 'choir', ch: 4, program: 52, icon: 'S' },
  { id: 'alto', name: 'Alto', group: 'choir', ch: 5, program: 52, icon: 'A' },
  { id: 'tenor', name: 'Tenor', group: 'choir', ch: 6, program: 52, icon: 'T' },
  { id: 'choirbass', name: 'Bass (choir)', group: 'choir', ch: 7, program: 52, icon: 'B' },
  { id: 'click', name: 'Click (metronome)', group: 'extra', ch: 11, program: 115, icon: '⏱' },
];
const COUNT_IN_CH = 12;

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const pc = (n) => ((n % 12) + 12) % 12;

/** A chord as the band needs it: when, how long, root, chord tones, bass note and a symbol. */
function chord(beat, beats, root, intervals, bass, symbol) {
  const minor = intervals.includes(3) && !intervals.includes(4);
  const third = intervals.includes(4) ? 4 : intervals.includes(3) ? 3 : intervals.includes(5) ? 5 : intervals.includes(2) ? 2 : 4;
  return {
    beat,
    beats,
    root,
    bass: bass ?? root,
    quality: minor ? 'm' : '',
    pcs: [...new Set(intervals.map((i) => (root + i) % 12))],
    triad: [root, (root + third) % 12, (root + 7) % 12],
    symbol: symbol || `${NAMES[root]}${minor ? 'm' : ''}`,
  };
}

/** Chords of a library song or one of your songs (its chord chart). */
export function chordsFromChart(chordText) {
  return parseChords(chordText).map((c) => chord(c.beat, c.beats, c.chord.root, c.chord.intervals, c.chord.bass, c.symbol));
}

/**
 * Chords of any song from its notes: every `window` beats, the triad that best
 * explains what's sounding (repeats merged).
 */
export function chordsFromNotes(notes, totalBeats, { window = 2 } = {}) {
  const out = [];
  for (let b = 0; b < totalBeats - 1e-6; b += window) {
    const sounding = notes.filter((n) => n.beat < b + window - 1e-6 && n.beat + n.beats > b + 1e-6).map((n) => n.note);
    const g = sounding.length ? guessChord(sounding) : null;
    const prev = out[out.length - 1];
    if (!g) {
      if (prev) prev.beats += window;
      continue;
    }
    const c = chord(b, window, g.root, g.quality === 'm' ? [0, 3, 7] : g.quality === 'dim' ? [0, 3, 6] : [0, 4, 7], g.bass);
    if (prev && prev.symbol === c.symbol && prev.bass === c.bass && prev.beat + prev.beats >= b - 1e-6) prev.beats += window;
    else out.push(c);
  }
  return out;
}

// Small, repeatable variations so the AI players don't sound like a machine.
function humanizer(seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return { time: (amount = 0.012) => (rand() - 0.5) * 2 * amount, vel: (v, spread = 7) => Math.max(1, Math.min(127, Math.round(v + (rand() - 0.5) * 2 * spread))) };
}

/** Close voicing of chord tones near `center`, moving as little as possible. */
function voicing(pcs, center) {
  return [...new Set(pcs.map((p) => {
    let n = center - 6 + pc(p - (center - 6));
    if (n > center + 6) n -= 12;
    return n;
  }))].sort((a, b) => a - b);
}

const nearest = (target, prev, lo, hi) => {
  let best = null;
  for (let n = lo; n <= hi; n++) if (pc(n) === pc(target) && (best === null || Math.abs(n - prev) < Math.abs(best - prev))) best = n;
  return best ?? lo + pc(target - lo);
};

/**
 * Arrange a song for the band.
 *   song: { bpm, timeSig, keySig, title, notes: [{ beat, beats, note, vel, ch }] }  (beats, not seconds)
 *   opts: { chords, melody: [{ beat, beats, note, vel }] | null, level: 0 simple | 1 full | 2 gospel,
 *           drums: style id, countIn: true }
 * Returns { tracks: [{ role, name, ch, program, notes }], chords, beats, offset, bpm, timeSig, keySig }.
 */
export function arrangeBand(song, opts = {}) {
  const level = opts.level ?? 1;
  const ts = song.timeSig || { num: 4, den: 4 };
  const bar = (ts.num * 4) / ts.den;
  const offset = opts.countIn === false ? 0 : bar; // one bar of count-in clicks first
  const melody = opts.melody || [];
  const lastNote = Math.max(0, ...song.notes.map((n) => n.beat + n.beats), ...melody.map((n) => n.beat + n.beats));
  const chords = (opts.chords?.length ? opts.chords : chordsFromNotes(song.notes.filter((n) => n.ch !== 9), lastNote)).filter((c) => c.beats > 0);
  const end = Math.max(lastNote, ...chords.map((c) => c.beat + c.beats));
  const totalBars = Math.ceil(end / bar - 1e-6);
  const h = humanizer(11);
  const parts = Object.fromEntries(ROLES.map((r) => [r.id, []]));
  const add = (role, beat, beats, note, vel, jitter = 0.012) => {
    if (note < 0 || note > 127 || beats <= 0) return;
    parts[role].push({ beat: Math.max(0, offset + beat + h.time(jitter)), beats, note, vel: h.vel(vel) });
  };

  // Lead vocal: the melody.
  for (const m of melody) add('lead', m.beat, m.beats * 0.97, m.note, 92, 0);

  // Keys: chords in the middle of the keyboard, the root low in the left hand.
  let center = 62;
  for (const c of chords) {
    const v = voicing(level >= 2 ? c.pcs.filter((p) => p !== c.root || c.pcs.length <= 3) : c.triad, center);
    center = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    center = Math.max(58, Math.min(66, center));
    const hits = level === 0 ? [0] : level === 1 ? (bar === 3 ? [0] : [0, 2]) : bar === 3 ? [0, 1, 2] : [0, 1.5, 2, 3.5];
    for (let b = 0; b < c.beats - 1e-6; b += bar) {
      for (const hb of hits) {
        if (b + hb >= c.beats - 1e-6) continue;
        const next = hits.find((x) => x > hb) ?? bar;
        const len = Math.min(next - hb, c.beats - b - hb) * 0.95;
        for (const n of v) add('keys', c.beat + b + hb, len, n, hb === 0 ? 72 : 60);
      }
    }
    add('keys', c.beat, c.beats * 0.95, nearest(c.bass, 43, 36, 47), 70);
  }

  // Guitar: strummed open chords (down on the beats; ups in between when it's busier).
  const strums = level === 0 ? (bar === 3 ? [[0, 'D']] : [[0, 'D'], [2, 'D']]) : level === 1 ? Array.from({ length: bar }, (_, i) => [i, 'D']) : bar === 3 ? [[0, 'D'], [1, 'D'], [1.5, 'U'], [2, 'D'], [2.5, 'U']] : [[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3, 'D'], [3.5, 'U']];
  for (const c of chords) {
    const shape = chordShape(c.symbol) || chordShape(`${NAMES[c.root]}${c.quality}`);
    const notes = shape ? shapeNotes(shape) : voicing(c.triad, 57).concat(voicing(c.triad, 64)).filter((n, i, a) => a.indexOf(n) === i);
    for (let b = 0; b < c.beats - 1e-6; b += bar) {
      strums.forEach(([sb, dir], i) => {
        if (b + sb >= c.beats - 1e-6) return;
        const nextB = strums[i + 1]?.[0] ?? bar;
        const len = Math.min(nextB - sb, c.beats - b - sb) * 0.9;
        const strings = dir === 'D' ? notes : notes.slice(-3).reverse(); // ups catch the top strings
        strings.forEach((n, k) => add('guitar', c.beat + b + sb + k * 0.02, len, n, dir === 'D' ? 68 : 52, 0.006));
      });
    }
  }

  // Bass: the root (or the slash-chord bass) on 1, the fifth on 3, walking into the next chord.
  let prevBass = 36;
  chords.forEach((c, i) => {
    const root = nearest(c.bass, prevBass, 28, 43);
    prevBass = root;
    const fifth = nearest(c.root + 7, root + 7, 28, 50);
    for (let b = 0; b < c.beats - 1e-6; b += bar) {
      const left = c.beats - b;
      if (level === 0) add('bass', c.beat + b, Math.min(bar, left) * 0.95, root, 88);
      else {
        add('bass', c.beat + b, Math.min(bar === 3 ? 2 : 1.5, left) * 0.95, root, 90);
        if (bar === 4 && left > 2) add('bass', c.beat + b + 2, Math.min(1.5, left - 2) * 0.95, level >= 2 ? fifth : root, 80);
      }
    }
    const next = chords[i + 1];
    if (level >= 2 && next && c.beats >= 2) {
      const target = nearest(next.bass, root, 28, 43);
      const approach = target + (target > root ? -1 : 1);
      add('bass', c.beat + c.beats - 0.5, 0.45, approach, 76);
    }
  });

  // Organ / pad: the chord held underneath.
  let organCenter = 60;
  for (const c of chords) {
    const v = voicing(c.triad, organCenter);
    organCenter = Math.max(56, Math.min(64, Math.round(v.reduce((a, b) => a + b, 0) / v.length)));
    for (const n of v) add('organ', c.beat, c.beats * 0.98, n, 58, 0);
  }

  // Drums: the song's groove, fills every 4th bar and a crash coming out of them.
  const styleId = opts.drums === undefined ? (bar === 3 ? 'waltz' : 'straight') : opts.drums; // null or '' = no drums
  const style = DRUM_STYLES[styleId];
  if (style) {
    for (let k = 0; k < totalBars; k++) {
      const start = k * bar;
      const last = k === totalBars - 1;
      const fill = level > 0 && !last && k % 4 === 3;
      const crash = level > 0 && k % 4 === 0 && k > 0;
      const fillFrom = fill ? bar - (level >= 2 ? 2 : 1) : Infinity;
      for (const [b, n, vel] of level >= 2 ? style.pro : style.hits) {
        if (b >= bar || b >= fillFrom - 1e-9) continue;
        if (crash && b === 0 && (n === 42 || n === 51)) continue;
        add('drums', start + b, 0.1, n, vel, 0.008);
      }
      if (crash) add('drums', start, 0.1, 49, 100, 0);
      if (fill) for (const [b, n, vel] of fillHits(bar, level >= 2)) add('drums', start + b, 0.1, n, vel, 0.006);
      if (last) add('drums', start, 0.1, 49, 95, 0);
    }
  }

  // Choir: four-part harmony on the melody, or "oohs" on the chords when there's no melody.
  const chordAt = (beat) => chords.find((c) => beat >= c.beat - 1e-6 && beat < c.beat + c.beats - 1e-6) || chords[chords.length - 1];
  const choirPart = { soprano: 'soprano', alto: 'alto', tenor: 'tenor', bass: 'choirbass' };
  let prev = null;
  if (melody.length) {
    const sorted = melody.map((m) => m.note).sort((a, b) => a - b);
    const shift = 12 * Math.round((69 - sorted[Math.floor(sorted.length / 2)]) / 12);
    for (const m of melody) {
      let s = m.note + shift;
      while (s < 60) s += 12;
      while (s > 81) s -= 12;
      const c = chordAt(m.beat);
      if (!c) continue;
      const v = voiceChord(s, { pcs: c.triad, bass: c.bass, root: c.root }, prev);
      prev = v;
      for (const [part, role] of Object.entries(choirPart)) add(role, m.beat, m.beats * 0.97, v[part], part === 'soprano' ? 84 : 74, 0);
    }
  } else {
    let s = 67;
    for (const c of chords) {
      s = nearest(c.triad.reduce((best, p) => (Math.abs(nearest(p, s, 64, 74) - s) < Math.abs(nearest(best, s, 64, 74) - s) ? p : best)), s, 64, 74);
      const v = voiceChord(s, { pcs: c.triad, bass: c.bass, root: c.root }, prev);
      prev = v;
      for (const [part, role] of Object.entries(choirPart)) add(role, c.beat, c.beats * 0.98, v[part], 66, 0);
    }
  }
  // Repeated notes in the lower choir parts become one held note.
  for (const role of ['alto', 'tenor', 'choirbass']) {
    const merged = [];
    for (const n of parts[role].sort((a, b) => a.beat - b.beat)) {
      const p = merged[merged.length - 1];
      if (p && p.note === n.note && Math.abs(p.beat + p.beats / 0.97 - n.beat) < 0.06 && n.beats < 2) p.beats = n.beat + n.beats - p.beat;
      else merged.push({ ...n });
    }
    parts[role] = merged;
  }

  // Click on every beat (off unless you want it).
  for (let b = 0; b < totalBars * bar; b++) parts.click.push({ beat: offset + b, beats: 0.1, note: b % bar === 0 ? 84 : 79, vel: b % bar === 0 ? 90 : 60 });

  const tracks = ROLES.map((r) => ({ role: r.id, name: r.name, ch: r.ch, program: r.program, notes: parts[r.id].sort((a, b) => a.beat - b.beat) }));
  // The count-in bar: always heard, on its own channel.
  const countIn = Array.from({ length: offset ? bar : 0 }, (_, b) => ({ beat: b, beats: 0.1, note: b === 0 ? 84 : 79, vel: b === 0 ? 100 : 70 }));
  tracks.push({ role: 'countin', name: 'Count-in', ch: COUNT_IN_CH, program: 115, notes: countIn });
  return { tracks, chords: chords.map((c) => ({ ...c, beat: c.beat + offset })), beats: offset + totalBars * bar, offset, bpm: song.bpm || 90, timeSig: ts, keySig: song.keySig || null, title: song.title || 'Song' };
}

/** The band as a MIDI file: one named track per part (play it here, or drag it into Logic). */
export function bandMidi(arr, ppq = 480) {
  const us = Math.round(60e6 / arr.bpm);
  const conductor = [metaEvent(0x03, `${arr.title} (band)`), metaEvent(0x51, [(us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff]), metaEvent(0x58, [arr.timeSig.num, Math.log2(arr.timeSig.den), 0x18, 0x08])];
  if (arr.keySig) conductor.push(metaEvent(0x59, [arr.keySig.sf & 0xff, arr.keySig.minor ? 1 : 0]));
  const tracks = [{ events: conductor.map((bytes) => ({ tick: 0, bytes })) }];
  for (const t of arr.tracks) {
    if (!t.notes.length) continue;
    const events = [{ tick: 0, bytes: metaEvent(0x03, t.name) }];
    if (t.ch !== 9) events.push({ tick: 0, bytes: [0xc0 | t.ch, t.program] });
    for (const n of t.notes) {
      events.push({ tick: n.beat * ppq, bytes: [0x90 | t.ch, n.note, n.vel] });
      events.push({ tick: (n.beat + n.beats) * ppq, bytes: [0x80 | t.ch, n.note, 0] });
    }
    tracks.push({ events });
  }
  return writeMidiTickTracks(tracks, ppq);
}

/** A loaded song (seconds) in beats, for arranging; the melody comes from `melodyChannel`. */
export function songInBeats(song, melodyChannel = null) {
  const beatAt = song.beatAt || ((sec) => (sec * (song.bpm || 120)) / 60);
  const notes = song.notes.map((n) => ({ beat: beatAt(n.time), beats: beatAt(n.time + n.dur) - beatAt(n.time), note: n.note, vel: n.vel, ch: n.ch }));
  const melody = melodyChannel === null ? null : melodyLine(song, [melodyChannel]).map((m) => ({ beat: beatAt(m.time), beats: beatAt(m.time + m.dur) - beatAt(m.time), note: m.note, vel: m.vel }));
  return { song: { bpm: song.bpm, timeSig: song.timeSig, keySig: song.keySig, title: song.title, notes }, melody };
}

/** A chord symbol moved by `semitones` (G/B up 2 -> A/C#). */
export function transposeSymbol(symbol, semitones) {
  if (!semitones) return symbol;
  const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const move = (letter, acc) => SHARP[pc(PCS[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + semitones)];
  return symbol.replace(/^([A-G])([#b]?)/, (m, l, a) => move(l, a)).replace(/\/([A-G])([#b]?)$/, (m, l, a) => `/${move(l, a)}`);
}
