// Scales & Chords practice: pick an instrument, a key and a scale or chord, and
// get a drill that runs in the lesson player (same highlights, microphone or MIDI
// listening and stars as the lessons). Or a chord quiz: random chords to find.
// Everything here is plain data in, lesson steps out; main.js shows and runs them.

import { TUNINGS, CHORD_SHAPES, chordShape } from './fretted.js';

export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']; // index = pitch class

export const SCALES = {
  major: { name: 'Major', ints: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Natural minor', ints: [0, 2, 3, 5, 7, 8, 10] },
  harmonic: { name: 'Harmonic minor', ints: [0, 2, 3, 5, 7, 8, 11] },
  pentMajor: { name: 'Major pentatonic', ints: [0, 2, 4, 7, 9] },
  pentMinor: { name: 'Minor pentatonic', ints: [0, 3, 5, 7, 10] },
  blues: { name: 'Blues', ints: [0, 3, 5, 6, 7, 10] },
};

export const CHORDS = {
  maj: { name: 'Major', symbol: '', ints: [0, 4, 7] },
  min: { name: 'Minor', symbol: 'm', ints: [0, 3, 7] },
  dom7: { name: 'Seventh', symbol: '7', ints: [0, 4, 7, 10] },
  maj7: { name: 'Major 7th', symbol: 'maj7', ints: [0, 4, 7, 11] },
  min7: { name: 'Minor 7th', symbol: 'm7', ints: [0, 3, 7, 10] },
  sus2: { name: 'Sus2', symbol: 'sus2', ints: [0, 2, 7] },
  sus4: { name: 'Sus4', symbol: 'sus4', ints: [0, 5, 7] },
  dim: { name: 'Diminished', symbol: 'dim', ints: [0, 3, 6] },
  aug: { name: 'Augmented', symbol: 'aug', ints: [0, 4, 8] },
};

export const INSTRUMENTS = ['piano', 'guitar', 'bass'];

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteLabel = (midi) => NAMES[((midi % 12) + 12) % 12];
export const chordName = (root, type) => `${KEYS[root]}${CHORDS[type].symbol}`;

// ---- Piano ---------------------------------------------------------------------

// One-octave fingerings for the scales beginners learn first (right hand going up;
// the left hand going up is its mirror). Others are shown without finger numbers.
const RH_FINGERS = {
  major: { 0: [1, 2, 3, 1, 2, 3, 4, 5], 7: [1, 2, 3, 1, 2, 3, 4, 5], 2: [1, 2, 3, 1, 2, 3, 4, 5], 9: [1, 2, 3, 1, 2, 3, 4, 5], 4: [1, 2, 3, 1, 2, 3, 4, 5], 5: [1, 2, 3, 4, 1, 2, 3, 4] },
  minor: { 9: [1, 2, 3, 1, 2, 3, 4, 5], 4: [1, 2, 3, 1, 2, 3, 4, 5], 2: [1, 2, 3, 1, 2, 3, 4, 5] },
  harmonic: { 9: [1, 2, 3, 1, 2, 3, 4, 5], 4: [1, 2, 3, 1, 2, 3, 4, 5], 2: [1, 2, 3, 1, 2, 3, 4, 5] },
};
const LH_FINGERS = {
  major: { 0: [5, 4, 3, 2, 1, 3, 2, 1], 7: [5, 4, 3, 2, 1, 3, 2, 1], 2: [5, 4, 3, 2, 1, 3, 2, 1], 9: [5, 4, 3, 2, 1, 3, 2, 1], 4: [5, 4, 3, 2, 1, 3, 2, 1], 5: [5, 4, 3, 2, 1, 3, 2, 1] },
  minor: { 9: [5, 4, 3, 2, 1, 3, 2, 1], 4: [5, 4, 3, 2, 1, 3, 2, 1], 2: [5, 4, 3, 2, 1, 3, 2, 1] },
  harmonic: { 9: [5, 4, 3, 2, 1, 3, 2, 1], 4: [5, 4, 3, 2, 1, 3, 2, 1], 2: [5, 4, 3, 2, 1, 3, 2, 1] },
};

/** Piano scale going up: { notes, fingers | null }. Right hand from middle C's octave, left hand an octave lower. */
export function pianoScale(root, scale, { octaves = 1, hand = 'right' } = {}) {
  const start = (hand === 'left' ? 48 : 60) + root;
  const ints = SCALES[scale].ints;
  const notes = [];
  for (let o = 0; o < octaves; o++) for (const i of ints) notes.push(start + 12 * o + i);
  notes.push(start + 12 * octaves);
  const table = (hand === 'left' ? LH_FINGERS : RH_FINGERS)[scale];
  const fingers = octaves === 1 && table?.[root] ? table[root] : null;
  return { notes, fingers };
}

/** A chord's notes on the piano (root position, from middle C's octave) and its inversions. */
export function pianoChord(root, type, { hand = 'right' } = {}) {
  const base = (hand === 'left' ? 48 : 60) + root;
  const notes = CHORDS[type].ints.map((i) => base + i);
  const inversions = [notes];
  for (let k = 1; k < notes.length; k++) {
    const prev = inversions[k - 1];
    inversions.push([...prev.slice(1), prev[0] + 12]);
  }
  return { notes, inversions };
}

// ---- Guitar and bass -------------------------------------------------------------

const lowToHigh = (instrument) => Object.keys(TUNINGS[instrument]).map(Number).sort((a, b) => TUNINGS[instrument][a] - TUNINGS[instrument][b]);
const minorish = (ints) => ints[1] === 3 || (ints.length > 2 && ints[2] === 3);

/**
 * Where to play a scale (or arpeggio) going up in one hand position on guitar or
 * bass: [[string, fret], ...] with a finger for each (0 = open). The root starts
 * on the lowest string (or the next one when that would be high up the neck);
 * major-type shapes put finger 2 on the root, minor-type shapes finger 1.
 * Returns null if it doesn't fit one position.
 */
export function fretScale(instrument, root, ints, { octaves = 1 } = {}) {
  const strings = lowToHigh(instrument);
  const fretOn = (i) => (((root - TUNINGS[instrument][strings[i]]) % 12) + 12) % 12;
  // Start on the lowest string, or the next one when the root is high up the neck there.
  const order = fretOn(0) > 8 ? [1, 0] : [0, 1];
  for (const first of order)
    // Open position keeps to frets 0-3 (open strings where they fit), reaching fret 4 only if it must.
    for (const reach of fretOn(first) === 0 ? [3, 4] : [3]) {
      const found = fretScaleFrom(instrument, strings, first, fretOn(first), ints, octaves, reach);
      if (found) return found;
    }
  return null;
}

function fretScaleFrom(instrument, strings, first, rootFret, ints, octaves, reach) {
  const open = rootFret === 0;
  const w = open ? 0 : minorish(ints) ? rootFret : Math.max(1, rootFret - 1);
  const lo = open ? 0 : w - 1; // finger 1 may stretch back one fret
  const hi = open ? reach : w + reach;
  const start = TUNINGS[instrument][strings[first]] + rootFret;
  const pitches = [];
  for (let o = 0; o < octaves; o++) for (const i of ints) pitches.push(start + 12 * o + i);
  pitches.push(start + 12 * octaves);
  const notes = [];
  const fingers = [];
  let s = first;
  for (const p of pitches) {
    let fret = p - TUNINGS[instrument][strings[s]];
    while (fret > hi && s < strings.length - 1) fret = p - TUNINGS[instrument][strings[++s]];
    if (fret < lo || fret > hi) return null;
    notes.push([strings[s], fret]);
    fingers.push(fret === 0 ? 0 : open ? Math.min(4, fret) : Math.min(4, Math.max(1, fret - w + 1)));
  }
  return { notes, fingers, position: w };
}

/** Guitar chord shapes the practice can use (the ones the app has diagrams for). */
export const guitarChordSymbols = () => Object.keys(CHORD_SHAPES);

/** The notes of a guitar chord shape as [string, fret] from the lowest string (for picking it as an arpeggio). */
export function shapeArpeggio(symbol) {
  const shape = chordShape(symbol);
  if (!shape) return null;
  const notes = [];
  const fingers = [];
  shape.frets.forEach((f, i) => {
    if (f < 0) return;
    notes.push([6 - i, f]);
    fingers.push(shape.fingers[i] || 0);
  });
  return { notes, fingers };
}

// ---- Drills (lesson steps) -------------------------------------------------------

const reverse = (list) => (list ? [...list].reverse() : undefined);

/**
 * A practice drill as a lesson the lesson player can run.
 *   { instrument: 'piano'|'guitar'|'bass', kind: 'scale'|'chord', root (0-11),
 *     scale | chord (keys of SCALES / CHORDS), octaves, hand ('right'|'left'), symbol (guitar chord) }
 * Returns { id, title, course, practice: true, steps } or null if it can't be played there.
 */
export function practiceLesson(opts) {
  const { instrument, kind, root = 0, hand = 'right' } = opts;
  const octaves = instrument === 'bass' ? 1 : opts.octaves || 1; // two octaves don't fit one bass position
  const course = instrument;
  const steps = [];
  let title;
  if (kind === 'scale') {
    const sc = SCALES[opts.scale];
    title = `${KEYS[root]} ${sc.name.toLowerCase()} scale`;
    if (instrument === 'piano') {
      const { notes, fingers } = pianoScale(root, opts.scale, { octaves, hand });
      const names = notes.map(noteLabel).join(' ');
      steps.push({ type: 'info', keys: notes, text: `${title}${hand === 'left' ? ' (left hand)' : ''}: ${names}.${fingers ? ` Fingers: ${fingers.join(' ')}${hand === 'right' ? ' (the thumb tucks under after finger 3)' : ' (finger 3 crosses over the thumb)'}.` : ''}` });
      steps.push({ type: 'notes', notes, ...(fingers && { fingers }), text: `Up the scale: ${names}.` });
      steps.push({ type: 'notes', notes: reverse(notes), ...(fingers && { fingers: reverse(fingers) }), text: 'And back down.' });
    } else {
      const pos = fretScale(instrument, root, sc.ints, { octaves });
      if (!pos) return null;
      const names = pos.notes.map(([s, f]) => noteLabel(TUNINGS[instrument][s] + f)).join(' ');
      steps.push({ type: 'info', text: `${title}: ${names}. ${pos.position ? `One hand position at fret ${pos.position}: one finger per fret.` : 'Open position: open strings and the first frets.'}`, fretboard: { instrument, dots: pos.notes.map(([s, f], i) => [s, f, pos.fingers[i] || 'o']) } });
      steps.push({ type: 'fret', instrument, notes: pos.notes, fingers: pos.fingers, text: `Up the scale: ${names}.` });
      steps.push({ type: 'fret', instrument, notes: reverse(pos.notes), fingers: reverse(pos.fingers), text: 'And back down.' });
    }
  } else if (kind === 'chord') {
    if (instrument === 'guitar') {
      const symbol = opts.symbol;
      const arp = shapeArpeggio(symbol);
      if (!arp) return null;
      title = `${symbol} chord`;
      steps.push({ type: 'info', chord: symbol, text: `${symbol}: put your fingers on the dots, then strum. Strings marked × aren't played.` });
      steps.push({ type: 'strum', chords: [symbol, symbol, symbol], text: `Strum ${symbol} three times: lift your hand off and put the shape back each time.` });
      steps.push({ type: 'fret', instrument: 'guitar', notes: arp.notes, fingers: arp.fingers, text: `Pick it one string at a time, low to high: every string should ring clearly.` });
    } else {
      const ch = CHORDS[opts.chord];
      const name = chordName(root, opts.chord);
      title = `${name} chord`;
      if (instrument === 'piano') {
        const { notes, inversions } = pianoChord(root, opts.chord, { hand });
        const letters = notes.map(noteLabel).join(' ');
        steps.push({ type: 'info', keys: notes, text: `${name} (${ch.name.toLowerCase()}): ${letters}. Play the keys together.` });
        steps.push({ type: 'chords', chords: [notes, notes, notes], names: [name, name, name], text: `${name} three times: lift your hand off between them.` });
        const invNames = inversions.map((c, k) => (k === 0 ? name : `${name}/${noteLabel(c[0])}`));
        steps.push({ type: 'chords', chords: inversions, names: invNames, text: `Inversions: the same notes in a new order. ${invNames.join(', ')}.` });
        const arp = [...notes, notes[0] + 12];
        steps.push({ type: 'notes', notes: [...arp, ...arp.slice(0, -1).reverse()], text: `Arpeggio: one note at a time, up and back: ${arp.map(noteLabel).join(' ')}.` });
      } else {
        const pos = fretScale('bass', root, ch.ints, { octaves: 1 });
        if (!pos) return null;
        const names = pos.notes.map(([s, f]) => noteLabel(TUNINGS.bass[s] + f)).join(' ');
        steps.push({ type: 'info', text: `${name} arpeggio: ${names}. Bass players outline a chord one note at a time.`, fretboard: { instrument: 'bass', dots: pos.notes.map(([s, f], i) => [s, f, pos.fingers[i] || 'o']) } });
        steps.push({ type: 'fret', instrument: 'bass', notes: pos.notes, fingers: pos.fingers, text: `Up: ${names}.` });
        steps.push({ type: 'fret', instrument: 'bass', notes: reverse(pos.notes), fingers: reverse(pos.fingers), text: 'And back down.' });
      }
    }
  } else return null;
  return { id: `practice:${instrument}:${kind}:${root}:${opts.scale || opts.chord || opts.symbol}:${octaves}:${hand}`, title: `Practice: ${title}`, course, practice: true, steps };
}

/** Chord pools for the quiz. Piano and bass use roots × types; guitar uses shapes. */
export const QUIZ_POOLS = {
  piano: { 'Major chords': ['maj'], 'Major and minor': ['maj', 'min'], 'Seventh chords': ['dom7', 'maj7', 'min7'], 'Everything': Object.keys(CHORDS) },
  guitar: { 'First chords': ['G', 'C', 'D', 'Em', 'Am'], 'Open chords': ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'Dm'], 'Sevenths': ['G7', 'C7', 'D7', 'E7', 'A7', 'B7'], 'Everything': Object.keys(CHORD_SHAPES) },
  bass: { 'Notes on E and A': [0, 1, 2], 'Every note': [0, 1, 2, 3] },
};

/**
 * A quiz: `count` random chords (piano, guitar) or notes to find (bass), never the
 * same one twice in a row. `rand` returns 0..1 (Math.random, or a seeded one for tests).
 */
export function quizLesson(instrument, poolName, { count = 8, rand = Math.random } = {}) {
  const pool = QUIZ_POOLS[instrument][poolName];
  const pick = (list, prev) => {
    let x;
    do x = list[Math.floor(rand() * list.length)];
    while (list.length > 1 && x === prev);
    return x;
  };
  const steps = [];
  if (instrument === 'piano') {
    const chords = [];
    const names = [];
    let prev = null;
    for (let i = 0; i < count; i++) {
      let key;
      do {
        key = `${Math.floor(rand() * 12)}:${pick(pool)}`;
      } while (key === prev);
      prev = key;
      const [root, type] = key.split(':');
      chords.push(pianoChord(Number(root), type).notes);
      names.push(chordName(Number(root), type));
    }
    steps.push({ type: 'chords', chords, names, text: 'Play each chord as it lights up: all its keys together.' });
  } else if (instrument === 'guitar') {
    const chords = [];
    for (let i = 0; i < count; i++) chords.push(pick(pool, chords[i - 1]));
    steps.push({ type: 'strum', chords, text: 'Strum each chord as it comes up. The diagram shows the shape if you need it.' });
  } else {
    const strings = pool.map((i) => lowToHigh('bass')[i]);
    const notes = [];
    for (let i = 0; i < count; i++) {
      let n;
      do n = [pick(strings), Math.floor(rand() * 6)];
      while (notes.length && n[0] === notes.at(-1)[0] && n[1] === notes.at(-1)[1]);
      notes.push(n);
    }
    steps.push({ type: 'fret', instrument: 'bass', notes, text: `Find each note: ${notes.map(([s, f]) => noteLabel(TUNINGS.bass[s] + f)).join(', ')}.` });
  }
  return { id: `practice:quiz:${instrument}`, title: `${instrument === 'bass' ? 'Note' : 'Chord'} quiz: ${poolName}`, course: instrument, practice: true, quiz: { instrument, poolName, count }, steps };
}
