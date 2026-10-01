// Running inside the Knight Lyfe Ultimate plug-in / standalone app (JUCE WebView).
//
// In that case the C++ engine makes all the sound, so it goes through Logic's mixer:
// HostSynth has the same interface as Synth, but forwards every note to the
// backend with its delay instead of playing it with WebAudio. MIDI that the host
// receives (Logic, or devices in the standalone app) comes back to the page as
// "hostMidi" events so the keyboard, chords, score and learn mode follow along.

import { Synth, DRUM_CHANNEL, GROOVE_CHANNEL, LIVE_CHANNEL, LIVE_LEFT_CHANNEL } from './synth.js';

export const juce = typeof window !== 'undefined' && window.__JUCE__?.backend ? window.__JUCE__ : null;
export const IN_HOST = !!juce;

const LIVE = new Set([LIVE_CHANNEL, LIVE_LEFT_CHANNEL]);

export class HostSynth extends Synth {
  constructor() {
    super();
    this.fromHost = false; // true while handling MIDI that the host already played
    this.outbox = [];
    this.samplesState = 'ready';
    this.loadedLayers = new Set([4, 8, 12, 16]);
  }

  get now() {
    return performance.now() / 1000;
  }

  /** No audio output here; just a context for decoding files (Audio → MIDI). */
  ensure() {
    this.decodeCtx ??= new OfflineAudioContext(2, 44100, 44100);
    return this.decodeCtx;
  }

  loadSamples() {}
  setPianoQuality(q) {
    this.pianoQuality = q;
    this.post({ q });
  }
  wantedLayers() {
    return [4, 8, 12, 16];
  }

  post(msg) {
    this.outbox.push(msg);
    if (this.outbox.length === 1) queueMicrotask(() => this.flush());
  }

  flush() {
    const batch = this.outbox;
    this.outbox = [];
    if (batch.length) juce.backend.emitEvent('kk', { batch });
  }

  send(ch, status, d1, d2, time) {
    if (this.fromHost && (LIVE.has(ch) || ch === GROOVE_CHANNEL || ch === DRUM_CHANNEL)) return;
    const delay = Math.max(0, (time ?? this.now) - this.now) * 1000;
    this.post({ m: [ch, status, d1, d2, Math.round(delay * 10) / 10] });
  }

  noteOn(ch, note, vel, time) {
    const c = this.channels[ch];
    if (c.soft) vel = Math.max(1, Math.round(vel * 0.65));
    this.send(ch, 0x90, note, vel, time);
  }

  noteOff(ch, note, time) {
    this.send(ch, 0x80, note, 0, time);
  }

  control(ch, cc, value, time) {
    super.control(ch, cc, value, time); // keep channel state (sustain, volume…) for the UI
    this.send(ch, 0xb0, cc, value, time);
  }

  program(ch, program) {
    super.program(ch, program);
  }

  pitchBend(ch, value, time) {
    this.channels[ch].bend = value / 8192;
    const v = value + 8192;
    this.send(ch, 0xe0, v & 0x7f, v >> 7, time);
  }

  updateChannelGain(ch) {
    const c = this.channels[ch];
    const level = c.muted ? 0 : (c.volume / 127) ** 2 * (c.expression / 127) * c.mix;
    this.post({ g: [ch, Math.round(level * 1000) / 1000] });
  }

  channelInput() {
    return null;
  }

  setMaster(v) {
    this.masterLevel = v;
    if (juce) this.post({ v });
  }

  allNotesOff(time = this.now) {
    this.post({ off: Math.max(0, (time - this.now) * 1000) });
  }

  cancelOneShots(time, ch) {
    this.post({ cancel: ch ?? -1, at: Math.max(0, (time - this.now) * 1000) });
  }

  panic() {
    for (const c of this.channels) Object.assign(c, { sustain: false, sostenuto: false, soft: false, bend: 0 });
    this.post({ panic: 1 });
  }

  prune() {}
}

/** Listen for MIDI the host received: [[status, d1, d2], ...]. */
export function onHostMidi(fn) {
  juce?.backend.addEventListener('hostMidi', (msgs) => fn(msgs));
}

/** Save a file through the app's native save dialog. */
export function hostSave(bytes, filename) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  juce.backend.emitEvent('kkSave', { name: filename, data: btoa(s) });
}
