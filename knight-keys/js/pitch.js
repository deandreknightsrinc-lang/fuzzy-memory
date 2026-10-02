// Listening with the microphone: hears single notes from any piano or keyboard
// (no USB needed) and turns them into note-on / note-off events.
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

/** Microphone listener: start(ctx) asks for the mic, then calls onNote(on, midi). */
export class PitchListener {
  constructor(onNote) {
    this.tracker = new NoteTracker(onNote);
    this.timer = null;
    this.stream = null;
  }

  get active() {
    return !!this.timer;
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
