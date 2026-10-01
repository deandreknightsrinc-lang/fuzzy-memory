// Note spelling, key signatures, chord recognition and solfege.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MINOR_KEYS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

export const SHARP = '♯';
export const FLAT = '♭';
export const NATURAL = '♮';

const ACC_TEXT = { '-2': FLAT + FLAT, '-1': FLAT, 0: '', 1: SHARP, 2: '\u{1D12A}' };

/** Display name for a key signature (sf = -7..7). */
export function keyName(sf, minor = false) {
  const name = (minor ? MINOR_KEYS : MAJOR_KEYS)[sf + 7];
  return prettyAcc(name) + (minor ? ' minor' : ' major');
}

export function prettyAcc(name) {
  return name.replace(/#/g, SHARP).replace(/b(?=$|\d)/g, FLAT).replace(/^([A-G])b/, '$1' + FLAT);
}

/** Alteration (-1, 0, 1) of each letter in the key signature. */
export function keyAccidentals(sf) {
  const acc = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (sf > 0) SHARP_ORDER.slice(0, sf).forEach((l) => (acc[l] = 1));
  if (sf < 0) FLAT_ORDER.slice(0, -sf).forEach((l) => (acc[l] = -1));
  return acc;
}

/** Pitch class of the major tonic for a key signature. */
export function tonicPc(sf) {
  return (((sf * 7) % 12) + 12) % 12;
}

/**
 * Spell a pitch class. mode: 'auto' (follow the key), 'sharps' or 'flats'.
 * Returns { letter, alter } where alter is -2..2.
 */
export function spellPc(pc, sf = 0, mode = 'auto') {
  pc = ((pc % 12) + 12) % 12;
  if (mode === 'sharps' || mode === 'flats') {
    const natural = LETTER_PC.indexOf(pc);
    if (natural >= 0) return { letter: LETTERS[natural], alter: 0 };
    if (mode === 'sharps') return { letter: LETTERS[LETTER_PC.indexOf(pc - 1)], alter: 1 };
    return { letter: LETTERS[LETTER_PC.indexOf((pc + 1) % 12)], alter: -1 };
  }
  const acc = keyAccidentals(sf);
  // Diatonic to the key: spell exactly as the key signature does.
  for (let i = 0; i < 7; i++) {
    const l = LETTERS[i];
    if ((((LETTER_PC[i] + acc[l]) % 12) + 12) % 12 === pc) return { letter: l, alter: acc[l] };
  }
  // Chromatic: plain natural first, otherwise the key's direction.
  const natural = LETTER_PC.indexOf(pc);
  if (natural >= 0) return { letter: LETTERS[natural], alter: 0 };
  if (sf >= 0) return { letter: LETTERS[LETTER_PC.indexOf(pc - 1)], alter: 1 };
  return { letter: LETTERS[LETTER_PC.indexOf((pc + 1) % 12)], alter: -1 };
}

export function pcName(pc, sf = 0, mode = 'auto') {
  const s = spellPc(pc, sf, mode);
  return s.letter + ACC_TEXT[s.alter];
}

/** Spell a MIDI note with octave and staff step (C-1 = step 0). */
export function spellNote(midi, sf = 0, mode = 'auto') {
  const s = spellPc(midi % 12, sf, mode);
  const naturalMidi = midi - s.alter;
  const octave = Math.floor(naturalMidi / 12) - 1;
  const letterIndex = LETTERS.indexOf(s.letter);
  return {
    ...s,
    octave,
    step: (octave + 1) * 7 + letterIndex,
    name: s.letter + ACC_TEXT[s.alter] + octave,
  };
}

export function noteName(midi, sf = 0, mode = 'auto') {
  return spellNote(midi, sf, mode).name;
}

// ---- Chords ---------------------------------------------------------------

// [suffix, intervals]. Earlier entries win ties, so simpler names come first.
const CHORDS = [
  ['', [0, 4, 7]],
  ['m', [0, 3, 7]],
  ['dim', [0, 3, 6]],
  ['aug', [0, 4, 8]],
  ['sus4', [0, 5, 7]],
  ['sus2', [0, 2, 7]],
  ['5', [0, 7]],
  ['7', [0, 4, 7, 10]],
  ['maj7', [0, 4, 7, 11]],
  ['m7', [0, 3, 7, 10]],
  ['6', [0, 4, 7, 9]],
  ['m6', [0, 3, 7, 9]],
  ['m7' + FLAT + '5', [0, 3, 6, 10]],
  ['dim7', [0, 3, 6, 9]],
  ['m(maj7)', [0, 3, 7, 11]],
  ['7sus4', [0, 5, 7, 10]],
  ['add9', [0, 2, 4, 7]],
  ['m(add9)', [0, 2, 3, 7]],
  ['aug7', [0, 4, 8, 10]],
  ['maj7' + SHARP + '5', [0, 4, 8, 11]],
  ['7' + FLAT + '5', [0, 4, 6, 10]],
  ['9', [0, 2, 4, 7, 10]],
  ['maj9', [0, 2, 4, 7, 11]],
  ['m9', [0, 2, 3, 7, 10]],
  ['6/9', [0, 2, 4, 7, 9]],
  ['m6/9', [0, 2, 3, 7, 9]],
  ['7' + FLAT + '9', [0, 1, 4, 7, 10]],
  ['7' + SHARP + '9', [0, 3, 4, 7, 10]],
  ['9sus4', [0, 2, 5, 7, 10]],
  ['m(maj9)', [0, 2, 3, 7, 11]],
  ['maj7' + SHARP + '11', [0, 4, 6, 7, 11]],
  ['7' + SHARP + '11', [0, 4, 6, 7, 10]],
  ['11', [0, 2, 4, 5, 7, 10]],
  ['m11', [0, 2, 3, 5, 7, 10]],
  ['maj9' + SHARP + '11', [0, 2, 4, 6, 7, 11]],
  ['13', [0, 2, 4, 7, 9, 10]],
  ['maj13', [0, 2, 4, 7, 9, 11]],
  ['m13', [0, 2, 3, 7, 9, 10]],
  ['13sus4', [0, 2, 5, 7, 9, 10]],
  ['7' + FLAT + '13', [0, 4, 7, 8, 10]],
  ['7' + SHARP + '9' + FLAT + '13', [0, 3, 4, 8, 10]],
  ['7' + FLAT + '9' + FLAT + '13', [0, 1, 4, 8, 10]],
];

// Variants with common omissions (no 5th, no 9th/11th in 13ths, no 3rd in 11ths).
const TEMPLATES = [];
CHORDS.forEach(([suffix, ivs], rank) => {
  const add = (set, penalty) => {
    const key = [...set].sort((a, b) => a - b).join(',');
    TEMPLATES.push({ suffix, set: new Set(set), key, rank, penalty, size: set.length });
  };
  add(ivs, 0);
  const has = (i) => ivs.includes(i);
  if (ivs.length >= 4 && has(7)) add(ivs.filter((i) => i !== 7), 1);
  if (suffix === '11' || suffix === 'm11') add(ivs.filter((i) => i !== 7 && i !== 4 && i !== 3), 1);
  if (suffix.startsWith('13') || suffix.startsWith('maj13') || suffix.startsWith('m13')) {
    add(ivs.filter((i) => i !== 2), 1);
    add(ivs.filter((i) => i !== 2 && i !== 7), 2);
  }
});

const INTERVAL_NAMES = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'];
const INTERVAL_LONG = [
  'unison',
  'minor 2nd',
  'major 2nd',
  'minor 3rd',
  'major 3rd',
  'perfect 4th',
  'tritone',
  'perfect 5th',
  'minor 6th',
  'major 6th',
  'minor 7th',
  'major 7th',
];

/**
 * Identify the chord formed by a set of MIDI notes.
 * Returns { name, root, bass, suffix, inversion, intervals } or null.
 */
export function detectChord(midiNotes, sf = 0, mode = 'auto') {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (notes.length === 0) return null;
  const bass = notes[0] % 12;
  const pcs = [...new Set(notes.map((n) => n % 12))];

  if (pcs.length === 1) {
    return { name: pcName(bass, sf, mode), root: bass, bass, suffix: '', inversion: notes.length > 1 ? 'octaves' : 'single note', kind: 'note' };
  }
  if (pcs.length === 2 && notes.length >= 2) {
    const iv = (((notes[notes.length - 1] - notes[0]) % 12) + 12) % 12;
    const other = notes.map((n) => n % 12).find((pc) => pc !== bass);
    // Power chord reads better as a chord name.
    if (iv === 7) {
      return { name: pcName(bass, sf, mode) + '5', root: bass, bass, suffix: '5', inversion: 'root position', kind: 'chord' };
    }
    const ivPc = (((other - bass) % 12) + 12) % 12;
    return {
      name: `${pcName(bass, sf, mode)} + ${pcName(other, sf, mode)}`,
      root: bass,
      bass,
      suffix: '',
      inversion: INTERVAL_LONG[ivPc],
      interval: INTERVAL_NAMES[ivPc],
      kind: 'interval',
    };
  }

  let best = null;
  for (const root of pcs) {
    const ivSet = pcs.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b);
    const key = ivSet.join(',');
    for (const t of TEMPLATES) {
      if (t.key !== key) continue;
      const score = (root === bass ? 0 : 10) + t.penalty * 3 + t.rank * 0.1;
      if (!best || score < best.score) best = { root, t, score };
    }
  }
  if (!best) return null;

  const { root, t } = best;
  const bassIv = (bass - root + 12) % 12;
  let inversion = 'root position';
  if (bassIv !== 0) {
    if (bassIv === 3 || bassIv === 4) inversion = '1st inversion';
    else if (bassIv === 6 || bassIv === 7 || bassIv === 8) inversion = '2nd inversion';
    else if ((bassIv === 9 && t.suffix.includes('dim7')) || bassIv === 10 || bassIv === 11) inversion = '3rd inversion';
    else inversion = 'slash chord';
  }
  const rootName = pcName(root, sf, mode);
  const name = rootName + t.suffix + (bassIv !== 0 ? '/' + pcName(bass, sf, mode) : '');
  return {
    name,
    root,
    bass,
    suffix: t.suffix,
    inversion,
    intervals: [...t.set].sort((a, b) => a - b).map((i) => INTERVAL_NAMES[i]),
    kind: 'chord',
  };
}

// ---- Solfege ---------------------------------------------------------------

const FIXED_SHARP = ['Do', 'Do' + SHARP, 'Re', 'Re' + SHARP, 'Mi', 'Fa', 'Fa' + SHARP, 'Sol', 'Sol' + SHARP, 'La', 'La' + SHARP, 'Si'];
const FIXED_FLAT = ['Do', 'Re' + FLAT, 'Re', 'Mi' + FLAT, 'Mi', 'Fa', 'Sol' + FLAT, 'Sol', 'La' + FLAT, 'La', 'Si' + FLAT, 'Si'];
const MOVABLE_UP = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti'];
const MOVABLE_DOWN = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Se', 'Sol', 'Le', 'La', 'Te', 'Ti'];

/**
 * mode 'fixed': Do is always C (European convention, Si for B).
 * mode 'movable': Do is the key's tonic (Kodaly / tonic sol-fa).
 */
export function solfege(midi, sf = 0, mode = 'fixed') {
  const pc = midi % 12;
  if (mode === 'fixed') return (sf < 0 ? FIXED_FLAT : FIXED_SHARP)[pc];
  const degree = (pc - tonicPc(sf) + 12) % 12;
  return (sf < 0 ? MOVABLE_DOWN : MOVABLE_UP)[degree];
}

export function isBlack(midi) {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}
