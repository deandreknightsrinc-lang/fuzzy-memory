// How MIDI keyboards and pad controllers reach the 16 pads.
//
// Play modes:
//   pads  - 16 keys starting at the base note play pads 1-16 (MPC layout:
//           note 36 / C1 = pad 1). Any other key plays nothing.
//   keys  - the whole keyboard plays the selected pad chromatically, like a
//           sampler instrument (the root key plays it at its own pitch).
//   split - the 16 keys from the base note are pads, every key above them
//           plays the selected pad chromatically.

export const PAD_COUNT = 16;
export const DEFAULT_BASE_NOTE = 36;
export const DEFAULT_ROOT_NOTE = 60;

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Middle C (60) = C3, the way Logic, Ableton and most keyboards label it.
export function noteName(n) {
  return `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 2}`;
}

export function parseMidi(data) {
  const [status = 0, d1 = 0, d2 = 0] = data;
  const type = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  if (type === 0x90 && d2 > 0) return { type: 'noteon', channel, note: d1, velocity: d2 };
  if (type === 0x80 || (type === 0x90 && d2 === 0)) return { type: 'noteoff', channel, note: d1, velocity: d2 };
  if (type === 0xb0) return { type: 'cc', channel, cc: d1, value: d2 };
  if (type === 0xe0) return { type: 'pitchbend', channel, value: ((d2 << 7) | d1) - 8192 };
  if (type === 0xa0) return { type: 'aftertouch', channel, note: d1, value: d2 };
  if (type === 0xc0) return { type: 'program', channel, program: d1 };
  return { type: 'other', channel };
}

export function defaultPadNotes(base = DEFAULT_BASE_NOTE) {
  return Array.from({ length: PAD_COUNT }, (_, i) => base + i);
}

// What a note should do. Returns { pad, rate } or null.
//   padNotes: the note for each pad (can be custom after MIDI learn)
//   selected: the pad keys/split mode plays
export function routeNote(note, { mode = 'pads', padNotes = defaultPadNotes(), selected = 0, root = DEFAULT_ROOT_NOTE, bend = 0 } = {}) {
  const pad = padNotes.indexOf(note);
  if (mode === 'pads') return pad >= 0 ? { pad, rate: 1 } : null;
  if (mode === 'split') {
    if (pad >= 0) return { pad, rate: 1 };
    const top = Math.max(...padNotes);
    if (note <= top) return null;
  }
  return { pad: selected, rate: pitchRate(note - root + bend) };
}

export function pitchRate(semitones) {
  return Math.pow(2, semitones / 12);
}

// Pitch-bend value (-8192..8191) to semitones over a +/- range.
export function bendSemitones(value, range = 2) {
  return (value / 8192) * range;
}

// Soft velocity curve: light hits stay audible, hard hits reach full level.
export function velocityGain(velocity, sensitive = true) {
  if (!sensitive) return 1;
  const v = Math.max(1, Math.min(127, velocity)) / 127;
  return Math.pow(v, 1.6) * 0.9 + 0.1;
}

// The pad grid is drawn MPC-style: pad 1 bottom-left, pad 16 top-right.
export const GRID_ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];

// Computer keys in the same shape as the grid, top row first.
export const COMPUTER_KEYS = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'];

export function padForKey(key) {
  const i = COMPUTER_KEYS.indexOf(String(key).toLowerCase());
  return i >= 0 ? GRID_ORDER[i] : -1;
}

export function keyForPad(pad) {
  const i = GRID_ORDER.indexOf(pad);
  return i >= 0 ? COMPUTER_KEYS[i].toUpperCase() : '';
}
