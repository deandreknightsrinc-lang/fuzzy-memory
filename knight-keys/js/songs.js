// Built-in song library: public-domain melodies, arranged for Knight Keys.
// Melodies are public domain; these arrangements are free to use.
//
// Notation (spaces separate tokens):
//   melody: <note><octave>[:<beats>]  e.g. E4 D4:0.5 G4:2   r:1 is a rest (default 1 beat)
//   chords: <symbol>:<beats>          e.g. C:4 G:2 C:2      - :2 means no chord
//   Chord symbols: C, Cm, C7, Cm7, Cmaj7, with # or b (F#, Bb).
// Channel 1 = melody (right hand), 2 = chords (left hand), 10 = drums.

import { writeMidi } from './midi-file.js';

export const SONGS = [
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 100,
    drums: 'straight',
    about: 'Three notes (E, D, C) for most of the song. A great first song for the right hand.',
    melody: `E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 |
             E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4`,
    chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4',
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 96,
    drums: 'straight',
    about: 'Steps up and down the C major scale, two notes at a time.',
    melody: `C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 |
             G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 |
             C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2`,
    chords: `C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2
             C:4 F:2 C:2 F:2 C:2 G:2 C:2`,
  },
  {
    id: 'joyful',
    title: 'Joyful, Joyful (Ode to Joy)',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 108,
    drums: 'straight',
    about: 'Beethoven\'s melody, sung in church as "Joyful, Joyful, We Adore Thee". Five fingers, one hand position.',
    melody: `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 |
             E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2 |
             D4 D4 E4 C4 | D4 E4:0.5 F4:0.5 E4 C4 | D4 E4:0.5 F4:0.5 E4 D4 | C4 D4 G3:2 |
             E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2`,
    chords: `C:4 G:4 C:4 C:2 G:2 C:4 G:4 C:4 G:2 C:2
             G:2 C:2 G:2 C:2 G:4 C:2 G:2
             C:4 G:4 C:4 G:2 C:2`,
  },
  {
    id: 'saints',
    title: 'When the Saints Go Marching In',
    level: 'Easy',
    key: 0,
    time: [4, 4],
    bpm: 120,
    drums: 'twostep',
    about: 'The classic up-tempo spiritual. Each phrase starts after a rest, so count "1" and come in on "2".',
    melody: `r:1 C4 E4 F4 | G4:4 | r:1 C4 E4 F4 | G4:4 | r:1 C4 E4 F4 | G4:2 E4:2 | C4:2 E4:2 | D4:4 |
             r:1 E4 E4 D4 | C4:3 C4 | E4:2 G4 G4 | F4:4 | r:2 E4 F4 | G4:2 E4:2 | C4:2 D4:2 | C4:4`,
    chords: 'C:4 C:4 C:4 C:4 C:4 C:4 C:4 G:4 C:4 C7:4 F:4 F:4 C:4 C:4 G:4 C:4',
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    level: 'Easy',
    key: 0,
    time: [3, 4],
    bpm: 100,
    drums: 'waltz',
    about: 'In 3/4 time: count "1-2-3". It starts with two pickup notes before the first full bar.',
    melody: `r:2 G4:0.75 G4:0.25 | A4 G4 C5 | B4:2 G4:0.75 G4:0.25 | A4 G4 D5 | C5:2 G4:0.75 G4:0.25 |
             G5 E5 C5 | B4 A4 F5:0.75 F5:0.25 | E5 C5 D5 | C5:3`,
    chords: '-:3 C:3 G:3 G:3 C:3 C:3 F:3 C:2 G:1 C:3',
  },
  {
    id: 'amazing',
    title: 'Amazing Grace',
    level: 'Intermediate',
    key: 1,
    time: [3, 4],
    bpm: 80,
    drums: 'waltz',
    about: 'The hymn tune "New Britain" in G major (one sharp: F#). Slow 3/4 with a pickup note.',
    melody: `r:2 D4 | G4:2 B4:0.5 G4:0.5 | B4:2 A4 | G4:2 E4 | D4:2 D4 |
             G4:2 B4:0.5 G4:0.5 | B4:2 A4:0.5 B4:0.5 | D5:5 B4 |
             D5:2 B4:0.5 G4:0.5 | B4:2 A4 | G4:2 E4 | D4:2 D4 |
             G4:2 B4:0.5 G4:0.5 | B4:2 A4 | G4:3`,
    chords: '-:3 G:3 G:3 C:3 G:3 G:3 G:3 D:3 D:3 G:3 G:3 C:3 G:3 G:3 D:3 G:3',
  },
  {
    id: 'doxology',
    title: 'Doxology (Old Hundredth)',
    level: 'Intermediate',
    key: 1,
    time: [4, 4],
    bpm: 76,
    drums: null,
    about: '"Praise God from whom all blessings flow". Each line starts and ends on a long note. Played in many churches every Sunday.',
    melody: `G4:2 G4 F#4 E4 D4 G4 A4 B4:2 |
             B4:2 B4 B4 A4 G4 C5 B4 A4:2 |
             G4:2 A4 B4 A4 G4 E4 F#4 G4:2 |
             D5:2 B4 G4 A4 C5 B4 A4 G4:4`,
    chords: `G:2 G:1 D:1 C:1 G:1 Em:1 D:1 G:2
             G:2 G:1 Em:1 D:1 Em:1 C:1 G:1 D:2
             G:2 D:1 G:1 D:1 Em:1 C:1 D:1 G:2
             G:2 G:1 Em:1 D:1 C:1 G:1 D:1 G:4`,
  },
];

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F#4" -> 66 */
export function parsePitch(token) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(token);
  if (!m) throw new Error(`Bad note "${token}"`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function tokens(str) {
  return str.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
}

/** Melody string -> [{ beat, beats, note }] (rests skipped). */
export function parseMelody(str) {
  const out = [];
  let beat = 0;
  for (const t of tokens(str)) {
    const [p, d] = t.split(':');
    const beats = d ? Number(d) : 1;
    if (p !== 'r') out.push({ beat, beats, note: parsePitch(p) });
    beat += beats;
  }
  return out;
}

const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] };

/** "Bb" / "F#m7" -> left-hand notes around C3, root lowest. */
export function chordNotes(symbol) {
  const m = /^([A-G])([#b]?)(maj7|m7|m|7)?$/.exec(symbol);
  if (!m) throw new Error(`Bad chord "${symbol}"`);
  const pc = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  let root = 48 + pc; // C3..B3
  if (root > 55) root -= 12; // keep the left hand between G#2 and G3
  return QUALITY[m[3] || ''].map((i) => root + i);
}

/** Chord string -> [{ beat, beats, notes }]. */
export function parseChords(str) {
  const out = [];
  let beat = 0;
  for (const t of tokens(str)) {
    const [sym, d] = t.split(':');
    const beats = Number(d);
    if (sym !== '-') out.push({ beat, beats, notes: chordNotes(sym), symbol: sym });
    beat += beats;
  }
  return out;
}

/** Simple drum parts so drummers can learn along too. Hits: [beatInBar, note, velocity]. */
const DRUM_STYLES = {
  straight: { beats: 4, hits: [[0, 36, 90], [1, 38, 80], [2, 36, 85], [3, 38, 80], ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b) => [b, 42, b % 1 ? 45 : 60])] },
  twostep: { beats: 4, hits: [[0, 36, 95], [1, 38, 85], [2, 36, 90], [3, 38, 85], [1, 54, 60], [3, 54, 60], ...[0, 1, 2, 3].map((b) => [b, 42, 55])] },
  waltz: { beats: 3, hits: [[0, 36, 85], [1, 42, 50], [2, 42, 50], [1, 37, 55], [2, 37, 55]] },
};

/** Build a format-0 MIDI file for a library song. */
export function songToMidi(song) {
  const spb = 60 / song.bpm; // seconds per beat
  const ev = [];
  const add = (beat, bytes) => ev.push({ time: beat * spb, bytes });
  add(0, [0xff, 0x59, 0x02, song.key & 0xff, 0x00]);
  add(0, [0xff, 0x58, 0x04, song.time[0], Math.log2(song.time[1]), 0x18, 0x08]);
  add(0, [0xc0, 0]); // melody: piano
  add(0, [0xc1, 0]); // chords: piano
  add(0, [0xb1, 7, 92]); // chords a little softer in the mix

  const melody = parseMelody(song.melody);
  for (const n of melody) {
    add(n.beat, [0x90, n.note, 92]);
    add(n.beat + n.beats * 0.95, [0x80, n.note, 0]);
  }
  for (const c of parseChords(song.chords)) {
    for (const note of c.notes) {
      add(c.beat, [0x91, note, 62]);
      add(c.beat + c.beats * 0.97, [0x81, note, 0]);
    }
  }
  const end = Math.max(...melody.map((n) => n.beat + n.beats));
  const style = DRUM_STYLES[song.drums];
  if (style) {
    // Drums start on the first full bar (after any pickup) and stop at the last bar.
    const firstNote = melody[0].beat;
    const start = Math.ceil(firstNote / style.beats - 1e-9) * style.beats;
    for (let bar = start; bar < end - 0.01; bar += style.beats) {
      for (const [b, note, vel] of style.hits) {
        if (bar + b >= end) continue;
        add(bar + b, [0x99, note, vel]);
        add(bar + b + 0.1, [0x89, note, 0]);
      }
    }
  }
  return writeMidi(ev, { bpm: song.bpm, name: song.title });
}
