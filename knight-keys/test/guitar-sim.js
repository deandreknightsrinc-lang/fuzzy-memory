// A virtual guitar for the tests: strummed chords (Karplus-Strong plucked strings)
// and the spectrum a browser's AnalyserNode would show for them, so chord
// recognition can be checked without a real guitar.

import { CHORD_SHAPES, fretNote } from '../js/fretted.js';

/** Seeded random numbers, so every test run hears the same strum. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** One plucked string: `seconds` of audio at `sr`, starting `delay` seconds in. */
function pluck(out, sr, midi, delay, level, rand, { bright = 0.5, detuneCents = 0 } = {}) {
  const f = 440 * 2 ** ((midi - 69 + detuneCents / 100) / 12);
  const period = sr / f - 0.5; // the averaging filter adds half a sample
  const n = Math.floor(period);
  const frac = period - n; // fractional delay (all-pass) keeps the pitch exact
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(n + 1);
  for (let i = 0; i < line.length; i++) line[i] = rand() * 2 - 1;
  // Pick position (a comb filter: picked near the bridge) and the pick's softness.
  const pickAt = Math.max(1, Math.round(line.length * 0.13));
  const raw = Float32Array.from(line);
  for (let i = 0; i < line.length; i++) line[i] = raw[i] - raw[(i + pickAt) % line.length];
  for (let k = 0; k < 2; k++) for (let i = 1; i < line.length; i++) line[i] = line[i] * bright + line[i - 1] * (1 - bright);
  let idx = 0, prev = 0, ap = 0;
  const start = Math.floor(delay * sr);
  const decay = 0.996 + Math.min(0.0035, 0.5 / f); // low strings ring longer
  for (let t = start; t < out.length; t++) {
    const cur = line[idx];
    const nextIdx = (idx + 1) % line.length;
    const avg = decay * 0.5 * (cur + line[nextIdx]);
    const y = c * avg + prev - c * ap; // all-pass for the fractional part
    prev = avg;
    ap = y;
    line[idx] = y;
    idx = nextIdx;
    out[t] += cur * level;
  }
}

/**
 * Strum a chord shape (or explicit [string, fret] pairs) down from string 6:
 * returns { audio, sr }. Options: sr, seconds, strumMs (time across the strings),
 * detuneCents (an out-of-tune guitar), noise (room noise level), seed, muted (strings
 * that buzz/are damped: string numbers 1-6), bright (0.5 = a normal pick, 1 = very bright).
 */
export function strum(shape, { sr = 48000, seconds = 0.6, strumMs = 30, detuneCents = 0, noise = 0, seed = 1, muted = [], bright = 0.5 } = {}) {
  const frets = typeof shape === 'string' ? CHORD_SHAPES[shape].frets : shape;
  const rand = rng(seed);
  const audio = new Float32Array(Math.floor(sr * seconds));
  let k = 0;
  frets.forEach((fret, i) => {
    const string = 6 - i;
    if (fret < 0) return;
    const midi = fretNote('guitar', string, fret);
    const level = muted.includes(string) ? 0.05 : 0.3 * (0.8 + 0.4 * rand());
    pluck(audio, sr, midi, (k++ * strumMs) / 1000 / 5, level, rand, { bright, detuneCents: detuneCents + (rand() - 0.5) * 6 });
  });
  for (let i = 0; i < audio.length; i++) audio[i] += noise * (rand() * 2 - 1);
  return { audio, sr };
}

/** In-place radix-2 FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len)
      for (let j = 0; j < len / 2; j++) {
        const wr = Math.cos(ang * j), wi = Math.sin(ang * j);
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + len / 2] * wr - im[i + j + len / 2] * wi;
        const vi = re[i + j + len / 2] * wi + im[i + j + len / 2] * wr;
        re[i + j] = ur + vr; im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
      }
  }
}

/**
 * What AnalyserNode.getFloatFrequencyData() returns for the `fftSize` samples
 * ending at `endSec`: Blackman window, magnitude / N, in dB.
 */
export function analyserDb(audio, sr, endSec, fftSize = 8192) {
  const end = Math.min(audio.length, Math.floor(endSec * sr));
  const re = new Float64Array(fftSize), im = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    const x = audio[end - fftSize + i] ?? 0;
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / fftSize) + 0.08 * Math.cos((4 * Math.PI * i) / fftSize);
    re[i] = x * w;
  }
  fft(re, im);
  const db = new Float32Array(fftSize / 2);
  for (let k = 0; k < db.length; k++) db[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) / fftSize + 1e-12);
  return db;
}
