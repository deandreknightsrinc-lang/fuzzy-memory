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

/**
 * Microphone listener: start(ctx) asks for the mic, then calls onNote(on, midi).
 * Anyone can also listen to the raw pitch (for meters and the Vocal Booth):
 * addPitchListener(fn) gets fn(exactNote | null, dt) on every frame.
 */
export class PitchListener {
  constructor(onNote) {
    this.tracker = new NoteTracker(onNote);
    this.pitchListeners = new Set();
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

  async start(ctx) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
    this.source = src;
    const buf = new Float32Array(this.analyser.fftSize);
    this.timer = setInterval(() => {
      this.analyser.getFloatTimeDomainData(buf);
      const p = detectPitch(buf, ctx.sampleRate);
      this.tracker.push(p ? freqToMidi(p.freq) : null);
      const exact = p ? freqToNote(p.freq) : null;
      for (const fn of this.pitchListeners) fn(exact, 0.03);
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
