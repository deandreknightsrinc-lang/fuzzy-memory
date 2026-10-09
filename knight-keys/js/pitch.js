// Listening with the microphone: hears single notes from any piano, keyboard or
// singer (no USB needed) and turns them into note-on / note-off events, plus the
// exact pitch in cents for singing lessons and the Vocal Booth.
// Single notes only: chords can't be pulled apart reliably from one microphone.

/**
 * Pitch of one block of audio by normalized autocorrelation.
 * Returns { freq, clarity } or null for silence / no clear pitch.
 */
export function detectPitch(buf, sampleRate, { minFreq = 55, maxFreq = 1400, gate = 0.01 } = {}) {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < gate) return null;
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2));
  const len = n - maxLag;
  const corr = new Float32Array(maxLag + 2);
  let best = -1;
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let sum = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < len; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      sum += a * b;
      e1 += a * a;
      e2 += b * b;
    }
    corr[lag] = sum / (Math.sqrt(e1 * e2) || 1);
    if (corr[lag] > best) best = corr[lag];
  }
  if (best < 0.8) return null;
  // The first peak close to the best one is the true period (avoids octave errors).
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (corr[lag] >= 0.93 * best && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      const a = corr[lag - 1];
      const b = corr[lag];
      const c = corr[lag + 1];
      const shift = (a - c) / (2 * (a - 2 * b + c) || 1); // parabolic interpolation
      return { freq: sampleRate / (lag + (Number.isFinite(shift) ? shift : 0)), clarity: b };
    }
  }
  return null;
}

export const freqToMidi = (f) => Math.round(69 + 12 * Math.log2(f / 440));
/** Exact (fractional) note number for a frequency: 60.25 is a quarter-step sharp of middle C. */
export const freqToNote = (f) => 69 + 12 * Math.log2(f / 440);
export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);

/** Nearest note and how far off it you are, in cents (-50..+50). */
export function freqToCents(f) {
  const exact = freqToNote(f);
  const midi = Math.round(exact);
  return { midi, cents: Math.round((exact - midi) * 100) };
}

/** Cents from a target note, counting any octave as the same note (men singing a song written high). */
export function centsFromTarget(exact, target, anyOctave = false) {
  let d = (exact - target) * 100;
  if (anyOctave) d = ((((d + 600) % 1200) + 1200) % 1200) - 600;
  return d;
}

/**
 * Singing exercises: hold each target note in tune for `hold` seconds.
 * push(exactNote | null, dt) after every pitch frame; returns 'hit' when a note
 * is done, 'done' after the last one. Wrong notes held for a while count as misses.
 */
export class SingJudge {
  constructor(targets, { tolerance = 40, hold = 0.6, anyOctave = true } = {}) {
    this.targets = targets;
    this.tolerance = tolerance;
    this.hold = hold;
    this.anyOctave = anyOctave;
    this.pos = 0;
    this.held = 0;
    this.off = 0;
    this.misses = 0;
    this.centsSum = 0;
    this.centsCount = 0;
    this.lastCents = null;
  }

  get target() {
    return this.targets[this.pos];
  }

  get done() {
    return this.pos >= this.targets.length;
  }

  /** How far along the current note's hold you are (0..1). */
  get progress() {
    return Math.min(1, this.held / this.hold);
  }

  /** Average distance from the center of the notes you hit, in cents. */
  get averageCents() {
    return this.centsCount ? this.centsSum / this.centsCount : 0;
  }

  push(exact, dt) {
    if (this.done) return 'done';
    if (exact === null) {
      this.lastCents = null;
      this.held = Math.max(0, this.held - dt); // breathing doesn't lose it all
      return null;
    }
    const cents = centsFromTarget(exact, this.target, this.anyOctave);
    this.lastCents = cents;
    if (Math.abs(cents) <= this.tolerance) {
      this.held += dt;
      this.off = 0;
      this.centsSum += Math.abs(cents) * dt;
      this.centsCount += dt;
      if (this.held >= this.hold) {
        this.pos++;
        this.held = 0;
        return this.done ? 'done' : 'hit';
      }
    } else {
      this.held = Math.max(0, this.held - dt * 0.5);
      this.off += dt;
      if (this.off >= 1.5) {
        this.misses++;
        this.off = 0;
        return 'miss';
      }
    }
    return null;
  }
}

/**
 * Lowest and highest notes you can sing: a note only counts once you hold it
 * steadily (stray squeaks and breaths don't).
 */
export class RangeFinder {
  constructor({ stable = 8 } = {}) {
    this.stable = stable;
    this.low = null;
    this.high = null;
    this.candidate = null;
    this.count = 0;
  }

  push(midi) {
    if (midi === null || midi !== this.candidate) {
      this.candidate = midi;
      this.count = midi === null ? 0 : 1;
      return;
    }
    if (++this.count === this.stable) {
      if (this.low === null || midi < this.low) this.low = midi;
      if (this.high === null || midi > this.high) this.high = midi;
    }
  }

  get span() {
    return this.low === null ? 0 : this.high - this.low;
  }
}

/** Choir section for a singing range (comfortable middle of the range decides). */
export const VOICE_TYPES = [
  { id: 'bass', name: 'Bass', low: 40, high: 64 },
  { id: 'baritone', name: 'Baritone', low: 43, high: 67 },
  { id: 'tenor', name: 'Tenor', low: 48, high: 69 },
  { id: 'alto', name: 'Alto', low: 53, high: 74 },
  { id: 'mezzo', name: 'Mezzo-soprano', low: 57, high: 77 },
  { id: 'soprano', name: 'Soprano', low: 60, high: 81 },
];
export function voiceType(low, high) {
  const mid = (low + high) / 2;
  return VOICE_TYPES.reduce((best, v) => (Math.abs((v.low + v.high) / 2 - mid) < Math.abs((best.low + best.high) / 2 - mid) ? v : best));
}

/**
 * Turns a stream of detected pitches into notes: a pitch has to hold for a couple
 * of frames before it counts, and silence (or a new note) ends the last one.
 */
export class NoteTracker {
  constructor(onNote, { stable = 2, release = 3 } = {}) {
    this.onNote = onNote; // (on: boolean, midi)
    this.stable = stable;
    this.release = release;
    this.current = null;
    this.candidate = null;
    this.count = 0;
    this.quiet = 0;
  }

  push(midi) {
    if (midi === null) {
      this.candidate = null;
      this.count = 0;
      if (this.current !== null && ++this.quiet >= this.release) {
        this.onNote(false, this.current);
        this.current = null;
      }
      return;
    }
    this.quiet = 0;
    if (midi === this.current) return;
    if (midi === this.candidate) this.count++;
    else {
      this.candidate = midi;
      this.count = 1;
    }
    if (this.count >= this.stable) {
      if (this.current !== null) this.onNote(false, this.current);
      this.current = midi;
      this.onNote(true, midi);
      this.candidate = null;
      this.count = 0;
    }
  }

  reset() {
    if (this.current !== null) this.onNote(false, this.current);
    this.current = null;
    this.candidate = null;
    this.count = 0;
  }
}

// ---- Chords from the microphone (guitar strumming) ---------------------------

/**
 * Pitch-class profile ("chroma") of a spectrum: how much of each of the 12 notes
 * is sounding. `db` is an analyser's getFloatFrequencyData() output.
 *
 * Tuned on strummed guitar (test/guitar-sim.js): it starts below the low E string
 * (82 Hz) and stops at 1200 Hz, because higher up the strings' overtones (5th, 7th,
 * 9th harmonics...) are as loud as real chord notes and would add notes that
 * aren't in the chord. Peaks are compressed (square root) so one loud string
 * doesn't drown the others.
 */
export function chromaFromSpectrum(db, sampleRate, { minHz = 70, maxHz = 1200 } = {}) {
  const fftSize = db.length * 2;
  const chroma = new Array(12).fill(0);
  const lo = Math.max(1, Math.floor((minHz * fftSize) / sampleRate));
  const hi = Math.min(db.length - 2, Math.ceil((maxHz * fftSize) / sampleRate));
  let loudest = -Infinity;
  for (let i = lo; i <= hi; i++) loudest = Math.max(loudest, db[i]);
  for (let i = lo; i <= hi; i++) {
    // Only spectral peaks count, so the skirts of a loud note don't leak into its neighbours.
    if (db[i] < db[i - 1] || db[i] < db[i + 1] || db[i] < -85 || db[i] < loudest - 50) continue;
    // Parabolic interpolation finds the peak between bins: much finer than the bin spacing.
    const den = db[i - 1] - 2 * db[i] + db[i + 1];
    const delta = den ? (0.5 * (db[i - 1] - db[i + 1])) / den : 0;
    const f = ((i + delta) * sampleRate) / fftSize;
    const note = 12 * Math.log2(f / 440) + 69;
    const pc = ((Math.round(note) % 12) + 12) % 12;
    // A peak halfway between two notes is probably not a note: it counts less.
    const inTune = Math.abs(note - Math.round(note)) < 0.35 ? 1 : 0.3;
    chroma[pc] += 10 ** (db[i] / 40) * inTune;
  }
  const total = chroma.reduce((a, b) => a + b, 0);
  return total > 0 ? chroma.map((c) => c / total) : chroma;
}

// A chord is heard as a template: its notes plus their first overtones (octave,
// octave + fifth, two octaves, two octaves + third), the root a little stronger.
const HARMONICS = [
  [0, 1],
  [12, 0.55],
  [19, 0.35],
  [24, 0.22],
  [28, 0.15],
];

function chordTemplate(pcs) {
  const t = new Array(12).fill(0);
  pcs.forEach((pc, k) => HARMONICS.forEach(([semis, w]) => (t[(pc + semis) % 12] += w * (k === 0 ? 1.2 : 1))));
  const norm = Math.hypot(...t);
  return t.map((v) => v / norm);
}

/** How alike a chroma and a template are (cosine similarity, 0..1). */
function similarity(chroma, template) {
  let dot = 0;
  let sq = 0;
  for (let i = 0; i < 12; i++) {
    dot += chroma[i] * template[i];
    sq += chroma[i] * chroma[i];
  }
  return sq ? dot / Math.sqrt(sq) : 0;
}

/** Every chord a guitarist is likely to play by mistake: the rivals a chord must beat. */
const CHORD_KINDS = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7] };
const VOCABULARY = [];
for (let root = 0; root < 12; root++)
  for (const [kind, ints] of Object.entries(CHORD_KINDS)) {
    const pcs = ints.map((i) => (root + i) % 12);
    VOCABULARY.push({ root, kind, pcs, template: chordTemplate(pcs) });
  }

/** The major or minor chord that best explains a chroma, with a confidence (0..1). */
export function chordFromChroma(chroma) {
  let best = null;
  for (const v of VOCABULARY) {
    if (v.kind !== '' && v.kind !== 'm') continue;
    const score = similarity(chroma, v.template);
    if (!best || score > best.score) best = { root: v.root, quality: v.kind, pcs: v.pcs, score, share: v.pcs.reduce((a, pc) => a + chroma[pc], 0) };
  }
  return best;
}

/**
 * Does a chroma sound like this chord? `notes` are all its pitch classes (root
 * first; chordTarget(symbol).notes). Without them it's the root's major or minor
 * triad, or `susPcs` for a suspended chord.
 *
 * The chord passes when it explains the sound well and no other likely chord
 * explains it better. Its own close relatives (E for E7, Am for Am7) don't count as
 * rivals, so a beginner who leaves off the 7th still passes.
 */
export function chromaMatches(chroma, root, quality, susPcs = null, notes = null) {
  const pcs = notes?.length ? notes : susPcs || (quality === 'm' ? [0, 3, 7] : [0, 4, 7]).map((i) => (root + i) % 12);
  const score = similarity(chroma, chordTemplate(pcs));
  if (score < 0.75) return false;
  const relative = (v) => v.root === root && (v.pcs.every((pc) => pcs.includes(pc)) || pcs.every((pc) => v.pcs.includes(pc)));
  return VOCABULARY.every((v) => relative(v) || similarity(chroma, v.template) <= score);
}

/**
 * Microphone listener: start(ctx) asks for the mic, then calls onNote(on, midi).
 * Anyone can also listen to the raw pitch (for meters and the Vocal Booth):
 * addPitchListener(fn) gets fn(exactNote | null, dt) on every frame, and
 * addChromaListener(fn) gets fn(chroma | null) for chord recognition.
 * setRange('bass') listens lower (down to a bass guitar's low E) with a longer window.
 */
export class PitchListener {
  constructor(onNote) {
    this.tracker = new NoteTracker(onNote);
    this.pitchListeners = new Set();
    this.chromaListeners = new Set();
    this.range = { minFreq: 55, maxFreq: 1400, fftSize: 2048 };
    this.timer = null;
    this.stream = null;
  }

  get active() {
    return !!this.timer;
  }

  addPitchListener(fn) {
    this.pitchListeners.add(fn);
    return () => this.pitchListeners.delete(fn);
  }

  addChromaListener(fn) {
    this.chromaListeners.add(fn);
    return () => this.chromaListeners.delete(fn);
  }

  /** 'bass' (bass guitar: 35-400 Hz), or 'normal' (voice, guitar, keys). */
  setRange(kind) {
    this.range = kind === 'bass' ? { minFreq: 35, maxFreq: 450, fftSize: 4096 } : { minFreq: 55, maxFreq: 1400, fftSize: 2048 };
    if (this.analyser) this.analyser.fftSize = this.range.fftSize;
  }

  async start(ctx) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = this.range.fftSize;
    this.analyser.smoothingTimeConstant = 0.5;
    src.connect(this.analyser);
    // Chords need a longer window: 8192 samples tell neighbouring low notes apart.
    this.chromaAnalyser = ctx.createAnalyser();
    this.chromaAnalyser.fftSize = 8192;
    this.chromaAnalyser.smoothingTimeConstant = 0.3;
    src.connect(this.chromaAnalyser);
    this.source = src;
    let buf = new Float32Array(this.analyser.fftSize);
    const spec = new Float32Array(this.chromaAnalyser.frequencyBinCount);
    this.timer = setInterval(() => {
      if (buf.length !== this.analyser.fftSize) {
        buf = new Float32Array(this.analyser.fftSize);
      }
      this.analyser.getFloatTimeDomainData(buf);
      const p = detectPitch(buf, ctx.sampleRate, { minFreq: this.range.minFreq, maxFreq: this.range.maxFreq });
      this.tracker.push(p ? freqToMidi(p.freq) : null);
      const exact = p ? freqToNote(p.freq) : null;
      for (const fn of this.pitchListeners) fn(exact, 0.03);
      if (this.chromaListeners.size) {
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        this.chromaAnalyser.getFloatFrequencyData(spec);
        const chroma = Math.sqrt(rms / buf.length) > 0.01 ? chromaFromSpectrum(spec, ctx.sampleRate) : null;
        for (const fn of this.chromaListeners) fn(chroma);
      }
    }, 30);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.tracker.reset();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
