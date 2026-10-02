// The sound: 16 sample pads through a master bus with a limiter.
import { toAudioBuffer, fromAudioBuffer, clipLength } from './audio-utils.js';

export const PAD_COLORS = ['#e8b931', '#e8b931', '#e8b931', '#e8b931', '#8b5cf6', '#8b5cf6', '#8b5cf6', '#8b5cf6', '#ef4444', '#ef4444', '#ef4444', '#ef4444', '#22c55e', '#22c55e', '#22c55e', '#22c55e'];

export function emptyPad(i) {
  return { name: '', clip: null, gain: 0.8, tune: 0, pan: 0, start: 0, end: 1, mode: 'oneshot', reverse: false, choke: 0, color: PAD_COLORS[i] };
}

export class Engine {
  constructor() {
    this.ctx = null;
    this.pads = Array.from({ length: 16 }, (_, i) => emptyPad(i));
    this.buffers = new Array(16).fill(null); // decoded AudioBuffers (forward, reversed)
    this.voices = new Map(); // pad -> Set of voices
    this.masterLevel = 0.9;
    this.onTrigger = null;
    this.preview = null;
  }

  // Browsers only start audio after a click/tap/key; call this from one.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterLevel;
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -3;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.12;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.master.connect(this.limiter).connect(this.analyser).connect(this.ctx.destination);
      this.pads.forEach((p, i) => this.rebuild(i));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get running() { return !!this.ctx && this.ctx.state === 'running'; }

  async decode(arrayBuffer, name) {
    const ctx = this.ensure();
    // decodeAudioData detaches the buffer, so give it a copy
    const ab = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return fromAudioBuffer(ab, name);
  }

  setMaster(v) {
    this.masterLevel = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setPad(i, patch) {
    const before = this.pads[i];
    this.pads[i] = { ...before, ...patch };
    if ('clip' in patch || 'reverse' in patch) this.rebuild(i);
  }

  loadPad(i, clip, name = clip?.name) {
    this.stopPad(i);
    this.setPad(i, { clip, name: name || '', start: 0, end: 1, reverse: false });
  }

  clearPad(i) {
    this.stopPad(i);
    const color = this.pads[i].color;
    this.pads[i] = { ...emptyPad(i), color };
    this.buffers[i] = null;
  }

  rebuild(i) {
    const p = this.pads[i];
    if (!this.ctx || !p.clip || !clipLength(p.clip)) { this.buffers[i] = null; return; }
    const clip = p.reverse ? { ...p.clip, channels: p.clip.channels.map((c) => c.slice().reverse()) } : p.clip;
    this.buffers[i] = toAudioBuffer(this.ctx, clip);
  }

  // Plays a pad. rate: pitch multiplier from the keyboard. Returns the voice.
  trigger(i, { velocityGain = 1, rate = 1, note = null } = {}) {
    this.ensure();
    const p = this.pads[i];
    const buf = this.buffers[i];
    if (this.onTrigger) this.onTrigger(i, velocityGain);
    if (!buf) return null;
    if (p.choke) {
      this.pads.forEach((q, j) => { if (q.choke === p.choke) this.stopPad(j, 0.01); });
    }
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * Math.pow(2, p.tune / 12);
    const g = ctx.createGain();
    g.gain.value = p.gain * velocityGain;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = p.pan; src.connect(g).connect(pan).connect(this.master); } else src.connect(g).connect(this.master);
    const dur = buf.duration;
    const a = Math.min(p.start, p.end) * dur;
    const b = Math.max(p.start, p.end) * dur;
    const len = Math.max(0.005, b - a);
    if (p.mode === 'loop') {
      src.loop = true; src.loopStart = a; src.loopEnd = a + len;
      src.start(0, a);
    } else {
      src.start(0, a, len);
    }
    const voice = { src, g, pad: i, note };
    if (!this.voices.has(i)) this.voices.set(i, new Set());
    this.voices.get(i).add(voice);
    src.onended = () => { this.voices.get(i)?.delete(voice); g.disconnect(); };
    return voice;
  }

  // Key/pad released: gate and loop pads stop, one-shots ring out.
  release(voice) {
    if (!voice) return;
    const p = this.pads[voice.pad];
    if (p.mode === 'oneshot') return;
    this.fadeOut(voice, 0.03);
  }

  fadeOut(voice, t = 0.03) {
    const now = this.ctx.currentTime;
    try {
      voice.g.gain.cancelScheduledValues(now);
      voice.g.gain.setValueAtTime(voice.g.gain.value, now);
      voice.g.gain.linearRampToValueAtTime(0, now + t);
      voice.src.stop(now + t + 0.01);
    } catch { /* already stopped */ }
  }

  stopPad(i, t = 0.02) {
    const set = this.voices.get(i);
    if (!set || !this.ctx) return;
    for (const v of set) this.fadeOut(v, t);
  }

  stopAll() {
    for (const i of this.voices.keys()) this.stopPad(i);
    this.stopPreview();
  }

  // One-off playback for the URL reader, stems and library.
  playClip(clip, { start = 0, end = null, onEnd } = {}) {
    this.ensure();
    this.stopPreview();
    const src = this.ctx.createBufferSource();
    src.buffer = toAudioBuffer(this.ctx, clip);
    src.connect(this.master);
    const dur = src.buffer.duration;
    const e = end == null ? dur : Math.min(end, dur);
    src.start(0, start, Math.max(0.005, e - start));
    const startedAt = this.ctx.currentTime;
    this.preview = { src, startedAt, offset: start, clip };
    src.onended = () => { if (this.preview?.src === src) this.preview = null; onEnd && onEnd(); };
    return this.preview;
  }

  previewPosition() {
    if (!this.preview) return null;
    return this.preview.offset + (this.ctx.currentTime - this.preview.startedAt);
  }

  stopPreview() {
    if (this.preview) { try { this.preview.src.stop(); } catch { /* ok */ } this.preview = null; }
  }

  level() {
    if (!this.analyser) return 0;
    const a = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(a);
    let p = 0;
    for (const v of a) { const x = Math.abs(v); if (x > p) p = x; }
    return p;
  }

  // High-quality sample-rate conversion through the browser's resampler.
  async renderResampled(clip, rate, channels = clip.channels.length) {
    const len = Math.max(1, Math.round((clipLength(clip) * rate) / clip.sampleRate));
    const off = new OfflineAudioContext(channels, len, rate);
    const src = off.createBufferSource();
    src.buffer = toAudioBuffer(off, clip);
    src.connect(off.destination);
    src.start();
    const ab = await off.startRendering();
    return fromAudioBuffer(ab, clip.name);
  }
}
