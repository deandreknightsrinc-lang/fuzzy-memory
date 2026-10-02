// Quick stem split that runs in the browser (no server, no AI model).
//
// One pass of STFT masking:
//  - drums  = the percussive part (harmonic/percussive separation: median
//             filter across time keeps sustained tones, across frequency keeps hits)
//  - bass   = the sustained part below ~160 Hz
//  - vocals = the sustained part in the voice band that sits in the center of
//             the stereo image (where lead vocals are mixed)
//  - other  = everything left (keys, guitars, pads, wide backing vocals)
// The four masks add up to 1, so the stems sum back to the original mix.
// It's a fast sketch, not Demucs: for clean stems use Pro split (KBK helper).

const N = 2048;
const HOP = 512;
const BINS = N / 2 + 1;
const K_TIME = 17; // median length across frames
const K_FREQ = 17; // median length across bins

function hann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

// In-place radix-2 complex FFT. inverse=true does the unscaled inverse.
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

function median(buf, len) {
  // insertion sort: tiny arrays, fastest in practice
  for (let i = 1; i < len; i++) {
    const v = buf[i];
    let j = i - 1;
    while (j >= 0 && buf[j] > v) { buf[j + 1] = buf[j]; j--; }
    buf[j + 1] = v;
  }
  return buf[len >> 1];
}

// left/right: Float32Array (pass the same array twice for mono).
// Returns { vocals, drums, bass, other } each [L, R].
export function splitStems(left, right, sampleRate, { onProgress, bassHz = 160, vocalLowHz = 180, vocalHighHz = 9000 } = {}) {
  const len = left.length;
  const win = hann(N);
  const norm = 1 / 1.5; // hann analysis * hann synthesis at 75% overlap sums to 1.5
  const pad = N;
  const total = len + 2 * pad;
  const frames = Math.ceil((total - N) / HOP) + 1;
  const outLen = (frames - 1) * HOP + N;
  const mono = left === right;

  const names = ['vocals', 'drums', 'bass'];
  const out = {};
  for (const s of names) out[s] = [new Float32Array(outLen), new Float32Array(outLen)];

  // ring buffers of spectra, so the time median can look ahead
  const half = K_TIME >> 1;
  const ring = Array.from({ length: K_TIME }, () => ({
    lr: new Float32Array(N), li: new Float32Array(N), rr: new Float32Array(N), ri: new Float32Array(N), mag: new Float32Array(BINS), used: false,
  }));

  const binHz = sampleRate / N;
  const bassW = new Float32Array(BINS);
  const vocW = new Float32Array(BINS);
  for (let k = 0; k < BINS; k++) {
    const f = k * binHz;
    bassW[k] = f <= bassHz ? 1 : f >= bassHz * 1.5 ? 0 : 1 - (f - bassHz) / (bassHz * 0.5);
    vocW[k] = f < vocalLowHz * 0.7 || f > vocalHighHz * 1.3 ? 0
      : f < vocalLowHz ? (f - vocalLowHz * 0.7) / (vocalLowHz * 0.3)
        : f > vocalHighHz ? 1 - (f - vocalHighHz) / (vocalHighHz * 0.3) : 1;
  }

  const sample = (arr, i) => { const j = i - pad; return j >= 0 && j < len ? arr[j] : 0; };
  const tb = new Float32Array(K_TIME);
  const fb = new Float32Array(K_FREQ);
  const harm = new Float32Array(BINS);
  const mL = { vocals: new Float32Array(BINS), drums: new Float32Array(BINS), bass: new Float32Array(BINS) };
  const yr = new Float32Array(N), yi = new Float32Array(N);

  const analyse = (f) => {
    const slot = ring[f % K_TIME];
    slot.used = f < frames;
    if (!slot.used) { slot.mag.fill(0); return; }
    const off = f * HOP;
    for (let i = 0; i < N; i++) {
      slot.lr[i] = sample(left, off + i) * win[i]; slot.li[i] = 0;
      slot.rr[i] = mono ? 0 : sample(right, off + i) * win[i]; slot.ri[i] = 0;
    }
    fft(slot.lr, slot.li);
    if (!mono) fft(slot.rr, slot.ri);
    for (let k = 0; k < BINS; k++) {
      const a = Math.hypot(slot.lr[k], slot.li[k]);
      slot.mag[k] = mono ? a : 0.5 * (a + Math.hypot(slot.rr[k], slot.ri[k]));
    }
  };

  const synth = (f, slot) => {
    const off = f * HOP;
    for (const s of names) {
      const m = mL[s];
      for (let c = 0; c < 2; c++) {
        const sr = c === 0 || mono ? slot.lr : slot.rr;
        const si = c === 0 || mono ? slot.li : slot.ri;
        for (let k = 0; k < BINS; k++) { yr[k] = sr[k] * m[k]; yi[k] = si[k] * m[k]; }
        for (let k = 1; k < N / 2; k++) { yr[N - k] = yr[k]; yi[N - k] = -yi[k]; }
        fft(yr, yi, true);
        const dst = out[s][c];
        for (let i = 0; i < N; i++) dst[off + i] += (yr[i] / N) * win[i] * norm;
      }
    }
  };

  for (let f = 0; f < half; f++) analyse(f);
  let lastReport = 0;
  for (let f = 0; f < frames; f++) {
    analyse(f + half);
    const slot = ring[f % K_TIME];
    // harmonic estimate: median over time per bin
    for (let k = 0; k < BINS; k++) {
      let n = 0;
      for (let d = -half; d <= half; d++) {
        const g = f + d;
        if (g < 0) continue;
        tb[n++] = ring[g % K_TIME].mag[k];
      }
      harm[k] = median(tb, n);
    }
    const fh = K_FREQ >> 1;
    for (let k = 0; k < BINS; k++) {
      let n = 0;
      for (let d = -fh; d <= fh; d++) { const j = k + d; if (j >= 0 && j < BINS) fb[n++] = slot.mag[j]; }
      const P = median(fb, n);
      const H = harm[k];
      const h2 = H * H, p2 = P * P;
      const mh = h2 + p2 > 1e-20 ? h2 / (h2 + p2) : 0.5;
      // how centered this bin is: 1 when L and R match
      let center = 1;
      if (!mono) {
        const dr = slot.lr[k] - slot.rr[k], di = slot.li[k] - slot.ri[k];
        const sumMag = Math.hypot(slot.lr[k], slot.li[k]) + Math.hypot(slot.rr[k], slot.ri[k]);
        center = sumMag > 1e-12 ? 1 - Math.min(1, Math.hypot(dr, di) / sumMag) : 0;
        center = center * center * center * center;
      }
      mL.drums[k] = 1 - mh;
      mL.bass[k] = mh * bassW[k];
      mL.vocals[k] = mh * (1 - bassW[k]) * vocW[k] * center;
    }
    synth(f, slot);
    if (onProgress && f - lastReport > 200) { lastReport = f; onProgress(f / frames); }
  }

  const result = {};
  for (const s of names) result[s] = out[s].map((c) => c.slice(pad, pad + len));
  // other = mix - the rest (the masks sum to 1, so this is exact up to rounding)
  result.other = [0, 1].map((c) => {
    const src = c === 0 || mono ? left : right;
    const o = new Float32Array(len);
    for (let i = 0; i < len; i++) o[i] = src[i] - result.vocals[c][i] - result.drums[c][i] - result.bass[c][i];
    return o;
  });
  if (onProgress) onProgress(1);
  return result;
}

// Stems for a two-way split: vocals and everything else.
export function instrumental(stems) {
  return [0, 1].map((c) => {
    const n = stems.other[c].length;
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = stems.drums[c][i] + stems.bass[c][i] + stems.other[c][i];
    return o;
  });
}
