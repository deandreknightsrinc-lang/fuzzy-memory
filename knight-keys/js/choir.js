// Choir parts: turns any song's melody into four-part harmony (soprano, alto,
// tenor, bass), hymn style - one chord under every melody note. Use it to learn
// your part, play it with the choir sound, or export it as MIDI for ACE Studio,
// a choir plug-in (Spitfire, EastWest...) or Logic's own instruments.

import { writeMidiTracks } from './midi-file.js';

export const PARTS = [
  { id: 'soprano', name: 'Soprano', low: 60, high: 81, ch: 0 },
  { id: 'alto', name: 'Alto', low: 53, high: 74, ch: 1 },
  { id: 'tenor', name: 'Tenor', low: 48, high: 69, ch: 2 },
  { id: 'bass', name: 'Bass', low: 40, high: 62, ch: 3 },
];
const RANGE = Object.fromEntries(PARTS.map((p) => [p.id, p]));

const TRIADS = [
  { q: '', ints: [0, 4, 7] },
  { q: 'm', ints: [0, 3, 7] },
  { q: 'dim', ints: [0, 3, 6] },
];
const pc = (n) => ((n % 12) + 12) % 12;

/**
 * The melody: the top note of each onset on the melody channels (a right-hand
 * part with chords under it still gives one line). Channels default to the
 * first non-drum channel in the song.
 */
export function melodyLine(song, channels = null) {
  const chs = channels || [song.notes.find((n) => n.ch !== 9)?.ch ?? 0];
  const notes = song.notes.filter((n) => chs.includes(n.ch)).sort((a, b) => a.time - b.time || b.note - a.note);
  const line = [];
  for (const n of notes) {
    const prev = line[line.length - 1];
    if (prev && n.time - prev.time < 0.04) continue; // same onset: keep the top note
    if (prev && prev.time + prev.dur > n.time) prev.dur = Math.max(0.05, n.time - prev.time);
    line.push({ time: n.time, dur: n.dur, note: n.note, vel: n.vel });
  }
  return line;
}

/** Best triad for a set of sounding notes (lowest note weighs most, as the bass). */
export function guessChord(notes) {
  if (!notes.length) return null;
  const counts = new Map();
  const low = Math.min(...notes);
  for (const n of notes) counts.set(pc(n), (counts.get(pc(n)) || 0) + (n === low ? 2 : 1));
  let best = null;
  for (let root = 0; root < 12; root++) {
    for (const t of TRIADS) {
      const pcs = t.ints.map((i) => (root + i) % 12);
      let score = 0;
      for (const [p, w] of counts) score += pcs.includes(p) ? w : -w;
      if (root === pc(low)) score += 0.5;
      if (t.q === 'dim') score -= 0.6;
      if (!best || score > best.score) best = { root, pcs, quality: t.q, bass: pc(low), score };
    }
  }
  if (!best.pcs.includes(best.bass)) best.bass = best.root;
  return best;
}

/** Chord for a melody note with nothing under it: the key's I, V, IV, vi, ii or iii that holds it. */
export function diatonicChord(note, sf = 0, minor = false) {
  const tonic = (((sf * 7) % 12) + 12 + (minor ? 9 : 0)) % 12;
  const order = minor ? [[0, 'm'], [7, ''], [5, 'm'], [8, ''], [3, ''], [10, '']] : [[0, ''], [7, ''], [5, ''], [9, 'm'], [2, 'm'], [4, 'm']];
  for (const [deg, q] of order) {
    const root = (tonic + deg) % 12;
    const pcs = TRIADS.find((t) => t.q === q).ints.map((i) => (root + i) % 12);
    if (pcs.includes(pc(note))) return { root, pcs, quality: q, bass: root };
  }
  return { root: pc(note), pcs: [0, 4, 7].map((i) => (pc(note) + i) % 12), quality: '', bass: pc(note) };
}

const inRange = (part, pcs) => {
  const out = [];
  for (let n = RANGE[part].low; n <= RANGE[part].high; n++) if (pcs.includes(pc(n))) out.push(n);
  return out;
};

/** Voice one chord under a soprano note, moving each part as little as possible. */
export function voiceChord(s, chord, prev = null) {
  const p = prev || { alto: s - 5, tenor: s - 12, bass: 48 };
  const basses = inRange('bass', [chord.bass]);
  const B = basses.reduce((a, b) => (Math.abs(b - p.bass) < Math.abs(a - p.bass) ? b : a), basses[0]);
  let best = null;
  for (const A of inRange('alto', chord.pcs)) {
    if (A >= s || s - A > 12) continue;
    for (const T of inRange('tenor', chord.pcs)) {
      if (T >= A || T <= B || A - T > 12) continue;
      const used = new Set([pc(s), pc(A), pc(T), pc(B)]);
      let cost = Math.abs(A - p.alto) + Math.abs(T - p.tenor);
      cost += (chord.pcs.length - chord.pcs.filter((x) => used.has(x)).length) * 10; // every chord tone sung
      const third = chord.pcs[1];
      cost += [s, A, T, B].filter((n) => pc(n) === third).length > 1 ? 3 : 0; // don't double the third
      if (T - B > 19) cost += 4;
      if (!best || cost < best.cost) best = { cost, alto: A, tenor: T };
    }
  }
  if (!best) {
    // Very low melody: stack chord tones downward anyway.
    const A = Math.max(RANGE.alto.low, s - 3);
    best = { alto: A, tenor: Math.max(RANGE.tenor.low, Math.min(A - 3, RANGE.tenor.high)) };
  }
  return { soprano: s, alto: best.alto, tenor: best.tenor, bass: B };
}

/**
 * Four-part harmony for a song. Chords come from the other notes sounding
 * under each melody note; where there are none, from the key.
 * Returns { soprano: [notes], alto, tenor, bass, chords: [{ time, root, quality }] }.
 */
export function makeChoirParts(song, { melodyChannels = null } = {}) {
  const line = melodyLine(song, melodyChannels);
  const melodyChs = melodyChannels || [song.notes.find((n) => n.ch !== 9)?.ch ?? 0];
  const others = song.notes.filter((n) => n.ch !== 9);
  const sf = song.keySig?.sf || 0;
  const minor = !!song.keySig?.minor;
  const out = { soprano: [], alto: [], tenor: [], bass: [], chords: [] };
  let prev = null;
  // Move the whole tune by octaves so it sits in the soprano range (per-note only if it still doesn't fit).
  const sorted = line.map((m) => m.note).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 67;
  const shift = 12 * Math.round((69 - median) / 12);
  for (const m of line) {
    let s = m.note + shift;
    while (s < RANGE.soprano.low) s += 12;
    while (s > RANGE.soprano.high) s -= 12;
    const sounding = others.filter((n) => n.time <= m.time + 0.03 && n.time + n.dur > m.time + 0.03 && !(melodyChs.includes(n.ch) && n.note === m.note && Math.abs(n.time - m.time) < 0.04)).map((n) => n.note);
    let chord = sounding.length >= 2 ? guessChord([...sounding, m.note]) : null;
    if (!chord || !chord.pcs.includes(pc(m.note))) chord = diatonicChord(m.note, sf, minor);
    const v = voiceChord(s, chord, prev);
    prev = v;
    for (const part of ['soprano', 'alto', 'tenor', 'bass']) out[part].push({ time: m.time, dur: m.dur, note: v[part], vel: part === 'soprano' ? 90 : 78 });
    out.chords.push({ time: m.time, root: chord.root, quality: chord.quality });
  }
  // Join repeated notes in a lower part into one held note (sounds like a real choir).
  for (const part of ['alto', 'tenor', 'bass']) {
    const merged = [];
    for (const n of out[part]) {
      const p = merged[merged.length - 1];
      if (p && p.note === n.note && Math.abs(p.time + p.dur - n.time) < 0.08 && n.dur < 1) p.dur = n.time + n.dur - p.time;
      else merged.push({ ...n });
    }
    out[part] = merged;
  }
  return out;
}

/**
 * MIDI file of the choir: one track per part, named Soprano/Alto/Tenor/Bass,
 * GM Choir Aahs, channels 1-4. Drag it into Logic or import it into ACE Studio.
 */
export function choirMidi(parts, { bpm = 120, title = 'Choir parts', keySig = null, timeSig = null, program = 52 } = {}) {
  const tracks = PARTS.map((p) => {
    const events = [{ time: 0, bytes: [0xc0 | p.ch, program] }];
    for (const n of parts[p.id]) {
      events.push({ time: n.time, bytes: [0x90 | p.ch, n.note, n.vel] });
      events.push({ time: n.time + n.dur * 0.98, bytes: [0x80 | p.ch, n.note, 0] });
    }
    return { name: p.name, events };
  });
  return writeMidiTracks(tracks, { bpm, name: title, keySig, timeSig });
}
