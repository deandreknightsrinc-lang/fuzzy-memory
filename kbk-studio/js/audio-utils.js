// Pure audio helpers. A "clip" is { name, sampleRate, channels: Float32Array[] }.
// Nothing here touches the Web Audio API, so it all runs (and is tested) in Node.

export function makeClip(channels, sampleRate, name = 'clip') {
  return { name, sampleRate, channels: channels.map((c) => (c instanceof Float32Array ? c : Float32Array.from(c))) };
}

export function clipLength(clip) {
  return clip.channels[0] ? clip.channels[0].length : 0;
}

export function clipDuration(clip) {
  return clip.sampleRate ? clipLength(clip) / clip.sampleRate : 0;
}

export function fromAudioBuffer(ab, name = 'clip') {
  const channels = [];
  for (let c = 0; c < ab.numberOfChannels; c++) channels.push(new Float32Array(ab.getChannelData(c)));
  return { name, sampleRate: ab.sampleRate, channels };
}

export function toAudioBuffer(ctx, clip) {
  const len = Math.max(1, clipLength(clip));
  const ab = ctx.createBuffer(clip.channels.length || 1, len, clip.sampleRate);
  clip.channels.forEach((ch, i) => ab.copyToChannel(ch, i));
  return ab;
}

// ---- editing ---------------------------------------------------------------

export function slice(clip, startSec, endSec, name = clip.name) {
  const n = clipLength(clip);
  const a = Math.max(0, Math.min(n, Math.round(startSec * clip.sampleRate)));
  const b = Math.max(a, Math.min(n, Math.round(endSec * clip.sampleRate)));
  return { name, sampleRate: clip.sampleRate, channels: clip.channels.map((c) => c.slice(a, b)) };
}

export function reverse(clip) {
  return { ...clip, channels: clip.channels.map((c) => c.slice().reverse()) };
}

export function toMono(clip) {
  if (clip.channels.length === 1) return { ...clip, channels: [clip.channels[0].slice()] };
  const n = clipLength(clip);
  const out = new Float32Array(n);
  for (const ch of clip.channels) for (let i = 0; i < n; i++) out[i] += ch[i];
  const k = 1 / clip.channels.length;
  for (let i = 0; i < n; i++) out[i] *= k;
  return { ...clip, channels: [out] };
}

export function toStereo(clip) {
  if (clip.channels.length >= 2) return { ...clip, channels: clip.channels.slice(0, 2).map((c) => c.slice()) };
  return { ...clip, channels: [clip.channels[0].slice(), clip.channels[0].slice()] };
}

export function peak(clip) {
  let p = 0;
  for (const ch of clip.channels) for (let i = 0; i < ch.length; i++) { const v = Math.abs(ch[i]); if (v > p) p = v; }
  return p;
}

export function normalize(clip, targetDb = -1) {
  const p = peak(clip);
  if (p === 0) return clip;
  const g = Math.pow(10, targetDb / 20) / p;
  return { ...clip, channels: clip.channels.map((c) => c.map((v) => v * g)) };
}

// Cut silence off both ends (anything quieter than thresholdDb).
export function trimSilence(clip, thresholdDb = -50, padSec = 0.005) {
  const th = Math.pow(10, thresholdDb / 20);
  const n = clipLength(clip);
  const loud = (i) => clip.channels.some((c) => Math.abs(c[i]) > th);
  let a = 0;
  while (a < n && !loud(a)) a++;
  if (a === n) return slice(clip, 0, 0);
  let b = n - 1;
  while (b > a && !loud(b)) b--;
  const pad = Math.round(padSec * clip.sampleRate);
  return slice(clip, Math.max(0, a - pad) / clip.sampleRate, Math.min(n, b + 1 + pad) / clip.sampleRate);
}

// Short fades so a cut never clicks.
export function fadeEdges(clip, sec = 0.003) {
  const n = clipLength(clip);
  const f = Math.min(Math.floor(n / 2), Math.round(sec * clip.sampleRate));
  const channels = clip.channels.map((c) => {
    const o = c.slice();
    for (let i = 0; i < f; i++) { const g = i / f; o[i] *= g; o[n - 1 - i] *= g; }
    return o;
  });
  return { ...clip, channels };
}

// Linear-interpolation resample. The browser uses OfflineAudioContext (better
// quality) and falls back to this.
export function resample(clip, rate) {
  if (!rate || rate === clip.sampleRate) return clip;
  const n = clipLength(clip);
  const m = Math.max(1, Math.round((n * rate) / clip.sampleRate));
  const step = clip.sampleRate / rate;
  const channels = clip.channels.map((c) => {
    const o = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      const x = i * step;
      const j = Math.floor(x);
      const t = x - j;
      const a = c[Math.min(j, n - 1)];
      const b = c[Math.min(j + 1, n - 1)];
      o[i] = a + (b - a) * t;
    }
    return o;
  });
  return { ...clip, sampleRate: rate, channels };
}

// Min/max pairs for drawing a waveform: [min0, max0, min1, max1, ...].
export function peaks(clip, buckets) {
  const n = clipLength(clip);
  const out = new Float32Array(buckets * 2);
  if (!n) return out;
  const per = n / buckets;
  for (let b = 0; b < buckets; b++) {
    const a = Math.floor(b * per);
    const e = Math.max(a + 1, Math.floor((b + 1) * per));
    let lo = 0, hi = 0;
    for (const ch of clip.channels) {
      for (let i = a; i < e && i < n; i++) { const v = ch[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    }
    out[b * 2] = lo; out[b * 2 + 1] = hi;
  }
  return out;
}

// Where the hits are: energy onsets, at most `max`, at least minGapSec apart.
// Returns times in seconds, always starting with 0.
export function detectOnsets(clip, { max = 16, minGapSec = 0.12, sensitivity = 1.8 } = {}) {
  const mono = toMono(clip).channels[0];
  const hop = 512;
  const frames = Math.floor(mono.length / hop);
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) s += mono[i] * mono[i];
    env[f] = Math.sqrt(s / hop);
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, env[f] - env[f - 1]);
  const cands = [];
  const win = 8;
  for (let f = 1; f < frames - 1; f++) {
    if (flux[f] <= flux[f - 1] || flux[f] < flux[f + 1]) continue;
    let mean = 0, cnt = 0;
    for (let k = Math.max(0, f - win); k <= Math.min(frames - 1, f + win); k++) { mean += flux[k]; cnt++; }
    mean /= cnt;
    if (flux[f] > mean * sensitivity && flux[f] > 0.005) cands.push({ t: (f * hop) / clip.sampleRate, s: flux[f] });
  }
  cands.sort((a, b) => b.s - a.s);
  const picked = [0];
  for (const c of cands) {
    if (picked.length >= max) break;
    if (picked.every((p) => Math.abs(p - c.t) >= minGapSec)) picked.push(c.t);
  }
  return picked.sort((a, b) => a - b);
}

// Cut a clip into pieces at the given start times (seconds).
export function chop(clip, starts, baseName = clip.name) {
  const end = clipDuration(clip);
  return starts.map((t, i) => fadeEdges(slice(clip, t, i + 1 < starts.length ? starts[i + 1] : end, `${baseName} ${i + 1}`)));
}

export function equalStarts(clip, count) {
  const d = clipDuration(clip);
  return Array.from({ length: count }, (_, i) => (d * i) / count);
}

// ---- encoders --------------------------------------------------------------

function interleave(clip) {
  const n = clipLength(clip);
  const ch = clip.channels.length;
  const out = new Float32Array(n * ch);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) out[i * ch + c] = clip.channels[c][i];
  return out;
}

const clamp = (v) => (v > 1 ? 1 : v < -1 ? -1 : v);

function writeStr(view, off, s) { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); }

// bitDepth 16 or 24 = PCM, 32 = 32-bit float.
export function encodeWav(clip, { bitDepth = 16 } = {}) {
  const ch = clip.channels.length;
  const data = interleave(clip);
  const bps = bitDepth / 8;
  const size = data.length * bps;
  const buf = new ArrayBuffer(44 + size);
  const v = new DataView(buf);
  writeStr(v, 0, 'RIFF'); v.setUint32(4, 36 + size, true); writeStr(v, 8, 'WAVE');
  writeStr(v, 12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, bitDepth === 32 ? 3 : 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, clip.sampleRate, true);
  v.setUint32(28, clip.sampleRate * ch * bps, true); v.setUint16(32, ch * bps, true); v.setUint16(34, bitDepth, true);
  writeStr(v, 36, 'data'); v.setUint32(40, size, true);
  let o = 44;
  for (let i = 0; i < data.length; i++, o += bps) {
    const s = clamp(data[i]);
    if (bitDepth === 32) v.setFloat32(o, s, true);
    else if (bitDepth === 24) {
      const x = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
      v.setUint8(o, x & 0xff); v.setUint8(o + 1, (x >> 8) & 0xff); v.setUint8(o + 2, (x >> 16) & 0xff);
    } else v.setInt16(o, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true);
  }
  return buf;
}

// Reads PCM 8/16/24/32 and float 32/64 WAVs (handles WAVE_FORMAT_EXTENSIBLE).
export function decodeWav(arrayBuffer, name = 'clip') {
  const v = new DataView(arrayBuffer);
  const tag = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');
  let o = 12, fmt = null;
  while (o + 8 <= v.byteLength) {
    const id = tag(o), len = v.getUint32(o + 4, true), body = o + 8;
    if (id === 'fmt ') {
      let format = v.getUint16(body, true);
      if (format === 0xfffe) format = v.getUint16(body + 24, true);
      fmt = { format, ch: v.getUint16(body + 2, true), rate: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true) };
    } else if (id === 'data' && fmt) {
      const bps = fmt.bits / 8;
      const end = Math.min(v.byteLength, body + len);
      const frames = Math.floor((end - body) / (bps * fmt.ch));
      const channels = Array.from({ length: fmt.ch }, () => new Float32Array(frames));
      let p = body;
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < fmt.ch; c++, p += bps) {
          let s;
          if (fmt.format === 3) s = fmt.bits === 64 ? v.getFloat64(p, true) : v.getFloat32(p, true);
          else if (fmt.bits === 8) s = (v.getUint8(p) - 128) / 128;
          else if (fmt.bits === 16) s = v.getInt16(p, true) / 0x8000;
          else if (fmt.bits === 24) { let x = v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getUint8(p + 2) << 16); if (x & 0x800000) x -= 0x1000000; s = x / 0x800000; }
          else s = v.getInt32(p, true) / 0x80000000;
          channels[c][i] = s;
        }
      }
      return { name, sampleRate: fmt.rate, channels };
    }
    o = body + len + (len & 1);
  }
  throw new Error('WAV has no audio data');
}

// AIFF (big-endian PCM), what Logic and older Mac tools like best.
export function encodeAiff(clip, { bitDepth = 16 } = {}) {
  const ch = clip.channels.length;
  const n = clipLength(clip);
  const bps = bitDepth / 8;
  const size = n * ch * bps;
  const buf = new ArrayBuffer(54 + size);
  const v = new DataView(buf);
  writeStr(v, 0, 'FORM'); v.setUint32(4, 46 + size); writeStr(v, 8, 'AIFF');
  writeStr(v, 12, 'COMM'); v.setUint32(16, 18);
  v.setUint16(20, ch); v.setUint32(22, n); v.setUint16(26, bitDepth);
  writeExtended(v, 28, clip.sampleRate);
  writeStr(v, 38, 'SSND'); v.setUint32(42, 8 + size); v.setUint32(46, 0); v.setUint32(50, 0);
  const data = interleave(clip);
  let o = 54;
  for (let i = 0; i < data.length; i++, o += bps) {
    const s = clamp(data[i]);
    if (bitDepth === 24) {
      const x = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
      v.setUint8(o, (x >> 16) & 0xff); v.setUint8(o + 1, (x >> 8) & 0xff); v.setUint8(o + 2, x & 0xff);
    } else v.setInt16(o, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff));
  }
  return buf;
}

// 80-bit IEEE extended float (AIFF's sample-rate field).
export function writeExtended(view, off, num) {
  if (!num) { for (let i = 0; i < 10; i++) view.setUint8(off + i, 0); return; }
  const exp = Math.floor(Math.log2(num));
  const mant = num / Math.pow(2, exp);
  view.setUint16(off, exp + 16383);
  const hi = Math.floor(mant * 2 ** 31);
  const lo = Math.floor((mant * 2 ** 31 - hi) * 2 ** 32);
  view.setUint32(off + 2, hi >>> 0);
  view.setUint32(off + 6, lo >>> 0);
}

export function readExtended(view, off) {
  const exp = (view.getUint16(off) & 0x7fff) - 16383;
  const hi = view.getUint32(off + 2), lo = view.getUint32(off + 6);
  return (hi * 2 ** -31 + lo * 2 ** -63) * Math.pow(2, exp);
}

// MP3 through lamejs (pass the global `lamejs`). Mono or stereo.
export function encodeMp3(clip, lame, { kbps = 192 } = {}) {
  if (!lame) throw new Error('MP3 encoder not loaded');
  const c = clip.channels.length > 1 ? toStereo(clip) : clip;
  const chs = c.channels.length;
  const enc = new lame.Mp3Encoder(chs, c.sampleRate, kbps);
  const toI16 = (f) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = clamp(f[i]); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; };
  const L = toI16(c.channels[0]);
  const R = chs > 1 ? toI16(c.channels[1]) : null;
  const parts = [];
  const block = 1152;
  for (let i = 0; i < L.length; i += block) {
    const l = L.subarray(i, i + block);
    const out = R ? enc.encodeBuffer(l, R.subarray(i, i + block)) : enc.encodeBuffer(l);
    if (out.length) parts.push(new Uint8Array(out));
  }
  const tail = enc.flush();
  if (tail.length) parts.push(new Uint8Array(tail));
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}

// MP3 needs one of the rates MPEG supports.
export const MP3_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
export function mp3Rate(rate) {
  return MP3_RATES.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), 44100);
}

export function safeFileName(name, ext) {
  const base = String(name || 'audio').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w\- .()]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'audio';
  return ext ? `${base}.${ext}` : base;
}

export function formatTime(sec) {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(sec < 10 ? 2 : 1)}`;
}
