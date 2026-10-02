// Drum kit model shared by the Kit Rack window, the drum highway and learn mode:
// which MIDI notes belong to which drum (General MIDI plus the extra notes
// e-kits like the Alesis Nitro Max send for rims, edges and bells), the
// built-in kits, and storage for your own samples.

/**
 * Highway lanes: what you hit on a kit. A song's note counts as the lane's
 * drum whichever of these notes your kit sends (snare rim = snare, open or
 * closed hat = hi-hat, crash edge = crash...).
 */
export const LANES = [
  { id: 'crash', name: 'Crash', short: 'CR', color: '#f759ab', notes: [49, 57, 55, 52] },
  { id: 'hihat', name: 'Hi-hat', short: 'HH', color: '#fadb14', notes: [42, 44, 46, 22, 26] },
  { id: 'snare', name: 'Snare', short: 'SN', color: '#4f8cff', notes: [38, 40, 37, 39] },
  { id: 'tom1', name: 'Tom 1', short: 'T1', color: '#36cfc9', notes: [50, 48] },
  { id: 'tom2', name: 'Tom 2', short: 'T2', color: '#13c2c2', notes: [47, 45] },
  { id: 'tom3', name: 'Floor', short: 'T3', color: '#08979c', notes: [43, 41, 58] },
  { id: 'ride', name: 'Ride', short: 'RD', color: '#b37feb', notes: [51, 59, 53] },
  { id: 'kick', name: 'Kick', short: 'K', color: '#ff7a45', notes: [36, 35] },
];

const LANE_OF = new Map();
LANES.forEach((lane, i) => lane.notes.forEach((n) => LANE_OF.set(n, i)));

/** Lane index (0..7) for a drum note, or -1 for percussion outside the kit. */
export const laneOf = (note) => LANE_OF.get(note) ?? -1;

/** Learn mode: does the note you hit count as the note the song wants? */
export const sameDrum = (a, b) => a === b || (laneOf(a) >= 0 && laneOf(a) === laneOf(b));

/**
 * Kit Rack pieces: the sounds you can tune, shape or replace with a sample.
 * Each piece covers every note that plays that sound.
 */
export const PIECES = [
  { id: 'kick', name: 'Kick', notes: [36, 35] },
  { id: 'snare', name: 'Snare', notes: [38, 40] },
  { id: 'stick', name: 'Side stick', notes: [37] },
  { id: 'clap', name: 'Clap', notes: [39] },
  { id: 'hhc', name: 'Hi-hat closed', notes: [42, 22] },
  { id: 'hhp', name: 'Hi-hat pedal', notes: [44] },
  { id: 'hho', name: 'Hi-hat open', notes: [46, 26] },
  { id: 'tom1', name: 'Tom 1', notes: [50, 48] },
  { id: 'tom2', name: 'Tom 2', notes: [47, 45] },
  { id: 'tom3', name: 'Floor tom', notes: [43, 41, 58] },
  { id: 'crash', name: 'Crash', notes: [49, 57, 55, 52] },
  { id: 'ride', name: 'Ride', notes: [51, 59] },
  { id: 'bell', name: 'Ride bell', notes: [53] },
  { id: 'tamb', name: 'Tambourine', notes: [54] },
  { id: 'cowbell', name: 'Cowbell', notes: [56] },
];

export const pieceOf = (note) => PIECES.find((p) => p.notes.includes(note));

/** The plug-in's multi-output channel for a drum note (matches DrumSynth::groupFor). */
export const OUTPUTS = ['Kick', 'Snare', 'Hi-Hat', 'Toms', 'Cymbals', 'Percussion'];
export function outputFor(note) {
  if ([35, 36].includes(note)) return 'Kick';
  if ([37, 38, 40].includes(note)) return 'Snare';
  if ([22, 26, 42, 44, 46].includes(note)) return 'Hi-Hat';
  if ([41, 43, 45, 47, 48, 50, 58].includes(note)) return 'Toms';
  if ([49, 51, 52, 53, 55, 57, 59].includes(note)) return 'Cymbals';
  return 'Percussion';
}

// ---- Per-drum routing (the plug-in's Multi-Output version) ------------------------
// Matches DrumSynth::setRoute / outputFor in the plug-in: a route is ROUTE_DEFAULT (the
// drum's group output above), ROUTE_MAIN (the main mix) or a drum output 1-15.

export const DRUM_OUTPUTS = 15;
export const ROUTE_DEFAULT = -1;
export const ROUTE_MAIN = 0;

/** The name Logic shows for an output (0 = the main mix). */
export function outputName(out) {
  if (out === ROUTE_MAIN) return 'Main mix';
  return out <= OUTPUTS.length ? OUTPUTS[out - 1] : `Drums ${out}`;
}

/** Logic's channel numbers for an output: the main mix is 1-2, drum output 1 is 3-4. */
export const logicChannels = (out) => `${2 * out + 1}-${2 * out + 2}`;

/** The output a note plays on with a route (like DrumSynth::outputFor). */
export function routeOutput(note, route = ROUTE_DEFAULT) {
  if (route === ROUTE_MAIN || (route >= 1 && route <= DRUM_OUTPUTS)) return route;
  return OUTPUTS.indexOf(outputFor(note)) + 1;
}

/** Ready-made routings: by drum type (the default), every drum on its own output, all on the main mix. */
export const ROUTE_PRESETS = {
  group: {},
  // Outputs 1-6 keep their names (Kick, Snare, Hi-Hat, Toms, Cymbals, Percussion); the rest go on 7-15.
  each: Object.fromEntries(['kick', 'snare', 'hhc', 'tom1', 'crash', 'clap', 'stick', 'hhp', 'hho', 'tom2', 'tom3', 'ride', 'bell', 'tamb', 'cowbell'].map((id, i) => [id, i + 1])),
  main: Object.fromEntries(PIECES.map((p) => [p.id, ROUTE_MAIN])),
};

/** { pieceId: route } -> rows for the plug-in: [[note, route], ...] for every note of every piece. */
export function routeRows(routes = {}) {
  const rows = [];
  for (const p of PIECES) {
    const r = routes[p.id];
    const route = Number.isInteger(r) && (r === ROUTE_MAIN || (r >= 1 && r <= DRUM_OUTPUTS)) ? r : ROUTE_DEFAULT;
    for (const n of p.notes) rows.push([n, route]);
  }
  return rows;
}

/** The plug-in's routing ({ "<note>": route }) -> { pieceId: route } (by each piece's first note). */
export function routesFromHost(byNote = {}) {
  const out = {};
  for (const p of PIECES) {
    const r = byNote[String(p.notes[0])];
    if (Number.isInteger(r)) out[p.id] = r;
  }
  return out;
}

export const DEFAULT_PIECE = { tune: 0, decay: 1, level: 1 };

/** Built-in kits: the synthesized drums, tuned and shaped differently. */
export const KITS = [
  { id: 'studio', name: 'Knight Studio', about: 'The stock Knight Keys kit: balanced and clean.', colors: ['#2b2f3a', '#ff7a45'], pieces: {} },
  {
    id: 'gospel', name: 'Gospel Live', about: 'Fat snare, singing toms and a long crash for Sunday morning.', colors: ['#3a2410', '#fadb14'],
    pieces: { kick: { tune: -1, decay: 1.2 }, snare: { tune: -2, decay: 1.4, level: 1.1 }, tom1: { tune: -2, decay: 1.5 }, tom2: { tune: -2, decay: 1.5 }, tom3: { tune: -2, decay: 1.6 }, crash: { decay: 1.4 }, hho: { decay: 1.3 } },
  },
  {
    id: 'trap', name: '808 Trap', about: 'Long booming kick, tight snappy snare and crisp hats.', colors: ['#1a0f2e', '#b37feb'],
    pieces: { kick: { tune: -5, decay: 3.5, level: 1.2 }, snare: { tune: 3, decay: 0.6 }, clap: { level: 1.2 }, hhc: { tune: 4, decay: 0.6 }, hho: { tune: 3, decay: 0.7 } },
  },
  {
    id: 'funk', name: 'Tight Funk', about: 'Dry and punchy, high-tuned snare, short hats.', colors: ['#10302a', '#36cfc9'],
    pieces: { kick: { tune: 2, decay: 0.6 }, snare: { tune: 4, decay: 0.7 }, hhc: { decay: 0.7 }, hho: { decay: 0.6 }, tom1: { tune: 3, decay: 0.7 }, tom2: { tune: 3, decay: 0.7 }, tom3: { tune: 3, decay: 0.7 } },
  },
  {
    id: 'rock', name: 'Big Room', about: 'Deep toms, roomy snare and big cymbals.', colors: ['#301010', '#ff4d4f'],
    pieces: { kick: { tune: -2, decay: 1.4, level: 1.1 }, snare: { tune: -3, decay: 1.8 }, tom1: { tune: -4, decay: 1.8 }, tom2: { tune: -4, decay: 1.8 }, tom3: { tune: -5, decay: 2 }, crash: { decay: 1.8, level: 1.1 }, ride: { decay: 1.5 } },
  },
];

export const kitById = (id) => KITS.find((k) => k.id === id) || KITS[0];

/** The settings for every piece: the kit's values with your own changes on top. */
export function resolveKit(kitId, custom = {}) {
  const kit = kitById(kitId);
  const out = {};
  for (const p of PIECES) out[p.id] = { ...DEFAULT_PIECE, ...(kit.pieces[p.id] || {}), ...(custom[p.id] || {}) };
  return out;
}

/** Per-note list for the sound engines: [[note, tune, decay, level], ...]. */
export function kitNoteParams(resolved) {
  const rows = [];
  for (const p of PIECES) {
    const v = resolved[p.id];
    for (const n of p.notes) rows.push([n, v.tune, v.decay, v.level]);
  }
  return rows;
}

// ---- Your own samples (IndexedDB) ---------------------------------------------

const DB = 'knight-keys-kit';
const STORE = 'samples';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no IndexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

/** Saved samples: { pieceId: { name, bytes: ArrayBuffer } }. */
export async function loadSavedSamples() {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const out = {};
      const req = db.transaction(STORE).objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve(out);
        out[c.key] = c.value;
        c.continue();
      };
      req.onerror = () => resolve(out);
    });
  } catch {
    return {};
  }
}

export async function saveSample(pieceId, name, bytes) {
  try {
    await tx('readwrite', (s) => s.put({ name, bytes }, pieceId));
  } catch {
    /* storage unavailable: the sample still works until you reload */
  }
}

export async function deleteSample(pieceId) {
  try {
    await tx('readwrite', (s) => s.delete(pieceId));
  } catch {
    /* nothing saved */
  }
}
