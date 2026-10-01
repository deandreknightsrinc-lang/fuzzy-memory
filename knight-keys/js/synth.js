// Small polyphonic WebAudio synth with GM-style instrument families and drums.

export const PRESETS = {
  piano: {
    label: 'Grand Piano',
    waves: [{ harm: [1, 0.55, 0.32, 0.22, 0.12, 0.09, 0.05, 0.04, 0.025, 0.02] }, { type: 'sine', gain: 0.35, detune: 3 }],
    att: 0.003, dec: 1.6, sus: 0, rel: 0.3, level: 0.5,
    filter: { base: 900, vel: 5000, keytrack: 1, env: 0.6 },
    keyDecay: true,
  },
  epiano: {
    label: 'Electric Piano',
    fm: { ratio: 1, index: 1.8, decay: 0.45 },
    waves: [{ type: 'sine' }, { type: 'sine', ratio: 14, gain: 0.04 }],
    att: 0.002, dec: 2.2, sus: 0, rel: 0.35, level: 0.55, keyDecay: true,
  },
  bell: {
    label: 'Bells / Mallets',
    fm: { ratio: 3.5, index: 3, decay: 0.7 },
    waves: [{ type: 'sine' }],
    att: 0.001, dec: 2.5, sus: 0, rel: 0.6, level: 0.35,
  },
  organ: {
    label: 'Drawbar Organ',
    waves: [
      { type: 'sine', ratio: 0.5, gain: 0.5 },
      { type: 'sine', ratio: 1, gain: 0.6 },
      { type: 'sine', ratio: 2, gain: 0.45 },
      { type: 'sine', ratio: 3, gain: 0.3 },
      { type: 'sine', ratio: 4, gain: 0.25 },
    ],
    att: 0.008, dec: 0.01, sus: 1, rel: 0.05, level: 0.22, velFixed: true,
  },
  guitar: {
    label: 'Guitar / Pluck',
    waves: [{ type: 'sawtooth' }],
    att: 0.002, dec: 1.1, sus: 0, rel: 0.2, level: 0.35,
    filter: { base: 500, vel: 3500, keytrack: 0.6, env: 0.3 },
    keyDecay: true,
  },
  bass: {
    label: 'Bass',
    waves: [{ type: 'sawtooth', gain: 0.7 }, { type: 'sine', gain: 0.8 }],
    att: 0.004, dec: 0.8, sus: 0.45, rel: 0.08, level: 0.5,
    filter: { base: 300, vel: 1500, keytrack: 0.3, env: 0.25 },
  },
  strings: {
    label: 'Strings',
    waves: [{ type: 'sawtooth', detune: -8, gain: 0.5 }, { type: 'sawtooth', detune: 8, gain: 0.5 }],
    att: 0.35, dec: 0.4, sus: 0.85, rel: 0.6, level: 0.3,
    filter: { base: 1500, vel: 2000, keytrack: 0.5 },
  },
  pad: {
    label: 'Warm Pad',
    waves: [{ type: 'sawtooth', detune: -12, gain: 0.4 }, { type: 'triangle', detune: 10, gain: 0.6 }],
    att: 0.6, dec: 1, sus: 0.8, rel: 1.2, level: 0.28,
    filter: { base: 900, vel: 1200, keytrack: 0.4 },
  },
  brass: {
    label: 'Brass',
    waves: [{ type: 'sawtooth' }],
    att: 0.06, dec: 0.3, sus: 0.75, rel: 0.15, level: 0.3,
    filter: { base: 600, vel: 3500, keytrack: 0.5, env: 0.15 },
  },
  flute: {
    label: 'Flute / Reed',
    waves: [{ type: 'sine' }, { type: 'triangle', ratio: 2, gain: 0.15 }],
    att: 0.07, dec: 0.2, sus: 0.9, rel: 0.12, level: 0.4,
  },
  lead: {
    label: 'Synth Lead',
    waves: [{ type: 'square', gain: 0.5 }, { type: 'sawtooth', detune: 6, gain: 0.4 }],
    att: 0.01, dec: 0.2, sus: 0.7, rel: 0.1, level: 0.22,
    filter: { base: 1200, vel: 3000, keytrack: 0.5 },
  },
};

/** Map a General MIDI program number to one of the presets above. */
export function presetForProgram(p) {
  if (p <= 3) return 'piano';
  if (p <= 7) return 'epiano';
  if (p <= 15) return 'bell';
  if (p <= 23) return 'organ';
  if (p <= 31) return 'guitar';
  if (p <= 39) return 'bass';
  if (p <= 51) return 'strings';
  if (p <= 55) return 'pad';
  if (p <= 71) return 'brass';
  if (p <= 79) return 'flute';
  if (p <= 87) return 'lead';
  if (p <= 103) return 'pad';
  if (p <= 111) return 'guitar';
  if (p <= 119) return 'bell';
  return 'pad';
}

export const DRUM_CHANNEL = 9;
export const LIVE_CHANNEL = 16; // live input (right side / whole keyboard)
export const LIVE_LEFT_CHANNEL = 17; // live input, left side of a split
export const GROOVE_CHANNEL = 18; // groove player and drum pads
const CHANNEL_COUNT = 19;
export const isDrumChannel = (ch) => ch === DRUM_CHANNEL || ch === GROOVE_CHANNEL;
const MAX_VOICES = 96;

class Voice {
  constructor(synth, ch, note, vel, time, preset, bendCents) {
    const ctx = synth.ctx;
    this.ch = ch;
    this.note = note;
    this.start = time;
    this.released = false;
    this.preset = preset;
    this.oscs = [];
    this.waveOscs = [];
    this.modOsc = null;

    const freq = 440 * 2 ** ((note - 69) / 12);
    const v = vel / 127;
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    let dest = this.env;

    if (preset.filter) {
      const f = preset.filter;
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.Q.value = 0.7;
      const track = 2 ** (((note - 60) / 12) * (f.keytrack || 0));
      const peak = Math.min(18000, (f.base + f.vel * v) * track);
      const floor = Math.min(18000, f.base * track);
      flt.frequency.setValueAtTime(peak, time);
      if (f.env) flt.frequency.setTargetAtTime(Math.max(floor, peak * 0.35), time, f.env);
      flt.connect(this.env);
      dest = flt;
    }

    preset.waves.forEach((w, i) => {
      const o = ctx.createOscillator();
      if (w.harm) o.setPeriodicWave(synth.periodicWave(w.harm));
      else o.type = w.type;
      o.frequency.value = freq * (w.ratio || 1);
      o.detune.value = (w.detune || 0) + bendCents;
      const g = ctx.createGain();
      g.gain.value = w.gain ?? 1;
      o.connect(g).connect(dest);
      o.start(time);
      this.oscs.push(o);
      this.waveOscs.push(o);
      if (i === 0 && preset.fm) {
        const m = ctx.createOscillator();
        m.frequency.value = freq * preset.fm.ratio;
        m.detune.value = bendCents;
        const mg = ctx.createGain();
        const depth = preset.fm.index * freq * preset.fm.ratio * (0.4 + 0.6 * v);
        mg.gain.setValueAtTime(depth, time);
        mg.gain.setTargetAtTime(depth * 0.08, time, preset.fm.decay);
        m.connect(mg).connect(o.frequency);
        m.start(time);
        this.oscs.push(m);
        this.modOsc = m;
      }
    });

    this.env.connect(synth.channelInput(ch));

    const peak = preset.velFixed ? preset.level : preset.level * (0.12 + 0.88 * v ** 1.6);
    let dec = preset.dec;
    if (preset.keyDecay) dec *= Math.min(3, Math.max(0.25, 2 ** ((60 - note) / 30)));
    this.attackEnd = time + preset.att;
    const g = this.env.gain;
    g.setValueAtTime(0, time);
    g.linearRampToValueAtTime(peak, this.attackEnd);
    g.setTargetAtTime(peak * preset.sus, this.attackEnd, dec / 3);
  }

  release(time) {
    if (this.released) return;
    this.released = true;
    if (time <= this.start) {
      this.kill(this.start);
      return;
    }
    const t = Math.max(time, this.attackEnd + 0.002);
    const rel = this.preset.rel;
    this.env.gain.cancelScheduledValues(t);
    this.env.gain.setTargetAtTime(0, t, rel / 4);
    this.end = t + rel * 2 + 0.05;
    for (const o of this.oscs) o.stop(this.end);
  }

  kill(time) {
    this.released = true;
    const t = Math.max(time, this.start);
    this.env.gain.cancelScheduledValues(t);
    this.env.gain.setTargetAtTime(0, t, 0.005);
    this.end = t + 0.05;
    for (const o of this.oscs) {
      try {
        o.stop(this.end);
      } catch {
        /* already stopped */
      }
    }
  }

  bend(cents, time) {
    this.waveOscs.forEach((o, i) => o.detune.setTargetAtTime((this.preset.waves[i].detune || 0) + cents, time, 0.01));
    if (this.modOsc) this.modOsc.detune.setTargetAtTime(cents, time, 0.01);
  }
}

export class Synth {
  constructor() {
    this.ctx = null;
    this.waves = new Map();
    this.voices = [];
    this.oneShots = [];
    this.channels = [];
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      this.channels.push({
        program: 0,
        presetOverride: null,
        volume: 100,
        expression: 127,
        pan: 64,
        mix: 1,
        muted: false,
        sustain: false,
        sostenuto: false,
        soft: false,
        bendRange: 2,
        bend: 0,
        held: new Set(), // voices kept alive by sustain
        sostenutoNotes: new Set(),
        node: null,
      });
    }
    this.channels[LIVE_LEFT_CHANNEL].program = 32;
    this.masterLevel = 0.8;
  }

  /** Create the AudioContext (must happen after a user gesture). */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterLevel;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.master.connect(this.comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMaster(v) {
    this.masterLevel = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  periodicWave(harm) {
    const key = harm.join(',');
    if (!this.waves.has(key)) {
      const real = new Float32Array(harm.length + 1);
      const imag = new Float32Array(harm.length + 1);
      harm.forEach((h, i) => (imag[i + 1] = h));
      this.waves.set(key, this.ctx.createPeriodicWave(real, imag));
    }
    return this.waves.get(key);
  }

  channelInput(ch) {
    const c = this.channels[ch];
    if (!c.node) {
      const gain = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (pan) gain.connect(pan).connect(this.master);
      else gain.connect(this.master);
      c.node = { gain, pan };
      this.updateChannelGain(ch);
    }
    return c.node.gain;
  }

  updateChannelGain(ch, time = this.now) {
    const c = this.channels[ch];
    if (!c.node) return;
    const level = c.muted ? 0 : (c.volume / 127) ** 2 * (c.expression / 127) * c.mix;
    c.node.gain.gain.setTargetAtTime(level, time, 0.015);
    if (c.node.pan) c.node.pan.pan.setTargetAtTime((c.pan - 64) / 64, time, 0.015);
  }

  presetFor(ch) {
    const c = this.channels[ch];
    return PRESETS[c.presetOverride || presetForProgram(c.program)] || PRESETS.piano;
  }

  setMix(ch, mix) {
    this.channels[ch].mix = mix;
    this.updateChannelGain(ch);
  }

  setMuted(ch, muted) {
    this.channels[ch].muted = muted;
    this.updateChannelGain(ch);
  }

  setPresetOverride(ch, name) {
    this.channels[ch].presetOverride = name || null;
  }

  noteOn(ch, note, vel, time = this.now) {
    if (!this.ctx) return;
    const c = this.channels[ch];
    if (c.soft) vel = Math.max(1, Math.round(vel * 0.65));
    if (isDrumChannel(ch)) {
      this.drum(note, vel, time, ch);
      return;
    }
    // Re-striking a sustained note: release the old one first.
    for (const v of this.voices) {
      if (v.ch === ch && v.note === note && !v.released && c.held.has(v)) {
        c.held.delete(v);
        v.release(time);
      }
    }
    if (this.voices.length >= MAX_VOICES) {
      const victim = this.voices.find((v) => v.released) || this.voices[0];
      victim.kill(time);
      this.voices.splice(this.voices.indexOf(victim), 1);
    }
    const voice = new Voice(this, ch, note, vel, time, this.presetFor(ch), c.bend * c.bendRange * 100);
    this.voices.push(voice);
    this.prune();
  }

  noteOff(ch, note, time = this.now) {
    if (!this.ctx || isDrumChannel(ch)) return;
    const c = this.channels[ch];
    const voice = this.voices.find((v) => v.ch === ch && v.note === note && !v.released && !c.held.has(v));
    if (!voice) return;
    if (c.sustain || c.sostenutoNotes.has(note)) {
      c.held.add(voice);
    } else {
      voice.release(time);
    }
  }

  control(ch, cc, value, time = this.now) {
    const c = this.channels[ch];
    switch (cc) {
      case 7:
        c.volume = value;
        this.updateChannelGain(ch, time);
        break;
      case 10:
        c.pan = value;
        this.updateChannelGain(ch, time);
        break;
      case 11:
        c.expression = value;
        this.updateChannelGain(ch, time);
        break;
      case 64:
        c.sustain = value >= 64;
        if (!c.sustain) this.releaseHeld(ch, time);
        break;
      case 66: {
        const on = value >= 64;
        if (on && !c.sostenuto) {
          c.sostenutoNotes = new Set(this.voices.filter((v) => v.ch === ch && !v.released).map((v) => v.note));
        }
        c.sostenuto = on;
        if (!on) {
          c.sostenutoNotes.clear();
          this.releaseHeld(ch, time);
        }
        break;
      }
      case 67:
        c.soft = value >= 64;
        break;
      case 120:
      case 123:
        this.channelOff(ch, time, cc === 120);
        break;
      case 121:
        c.expression = 127;
        c.sustain = false;
        c.bend = 0;
        this.releaseHeld(ch, time);
        break;
      default:
        break;
    }
  }

  releaseHeld(ch, time) {
    const c = this.channels[ch];
    for (const v of [...c.held]) {
      if (!c.sustain && !c.sostenutoNotes.has(v.note)) {
        v.release(time);
        c.held.delete(v);
      }
    }
  }

  program(ch, program) {
    this.channels[ch].program = program;
  }

  /** value: -8192..8191 */
  pitchBend(ch, value, time = this.now) {
    const c = this.channels[ch];
    c.bend = value / 8192;
    const cents = c.bend * c.bendRange * 100;
    for (const v of this.voices) if (v.ch === ch && !v.released) v.bend(cents, time);
  }

  channelOff(ch, time = this.now, hard = false) {
    const c = this.channels[ch];
    c.held.clear();
    for (const v of this.voices) {
      if (v.ch !== ch) continue;
      if (hard) v.kill(time);
      else v.release(time);
    }
    if (isDrumChannel(ch)) this.cancelOneShots(time, ch);
  }

  /** Stop song playback scheduled at or after `time` (stop / seek / loop). The groove keeps going. */
  allNotesOff(time = this.now, { resetControllers = false } = {}) {
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const c = this.channels[ch];
      c.held.clear();
      if (resetControllers) {
        c.sustain = false;
        c.sostenuto = false;
        c.sostenutoNotes.clear();
        c.soft = false;
        c.bend = 0;
      }
    }
    for (const v of this.voices) v.release(time);
    this.cancelOneShots(time, DRUM_CHANNEL);
  }

  /** Panic: hard stop and controller reset. */
  panic() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const v of this.voices) v.kill(t);
    for (const s of this.oneShots) s.gain.gain.setTargetAtTime(0, t, 0.005);
    this.voices = [];
    this.oneShots = [];
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const c = this.channels[ch];
      Object.assign(c, { sustain: false, sostenuto: false, soft: false, bend: 0 });
      c.held.clear();
      c.sostenutoNotes.clear();
    }
  }

  /** Silence drum hits scheduled at or after `time`, optionally only on one channel. */
  cancelOneShots(time, ch) {
    for (const s of this.oneShots) {
      if (s.start >= time && (ch === undefined || s.ch === ch)) {
        s.gain.gain.cancelScheduledValues(0);
        s.gain.gain.setValueAtTime(0, s.start);
      }
    }
  }

  prune() {
    const t = this.now;
    this.voices = this.voices.filter((v) => !v.end || v.end > t);
    this.oneShots = this.oneShots.filter((s) => s.end > t);
  }

  // ---- Drums (GM channel 10) -------------------------------------------------

  drum(note, vel, time, ch = DRUM_CHANNEL) {
    const ctx = this.ctx;
    const v = (vel / 127) ** 1.2;
    const out = ctx.createGain();
    out.connect(this.channelInput(ch));
    const shot = { start: time, end: time + 2.5, gain: out, ch };
    this.oneShots.push(shot);
    out.gain.setValueAtTime(v, time);

    const noise = (dur, type, freq, q = 1, level = 1, decay = dur / 4) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, time);
      g.gain.setTargetAtTime(0, time + 0.002, decay);
      src.connect(f).connect(g).connect(out);
      src.start(time, Math.random() * 0.5);
      src.stop(time + dur);
      return g;
    };
    const tone = (f0, f1, dur, type = 'sine', level = 1, decay = dur / 4) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, time);
      o.frequency.exponentialRampToValueAtTime(f1, time + dur * 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, time);
      g.gain.setTargetAtTime(0, time + 0.002, decay);
      o.connect(g).connect(out);
      o.start(time);
      o.stop(time + dur);
    };

    const toms = { 41: 80, 43: 100, 45: 120, 47: 145, 48: 170, 50: 200 };
    if (note === 35 || note === 36) {
      tone(160, 45, 0.5, 'sine', 1.4, 0.12);
      noise(0.02, 'lowpass', 1200, 1, 0.3, 0.004);
    } else if (note === 37) {
      noise(0.05, 'bandpass', 1800, 2, 0.8, 0.01);
    } else if (note === 38 || note === 40) {
      tone(220, 160, 0.15, 'triangle', 0.6, 0.04);
      noise(0.25, 'highpass', 1500, 0.7, 0.8, 0.06);
    } else if (note === 39) {
      for (let i = 0; i < 3; i++) {
        const g = noise(0.2, 'bandpass', 1200, 1.5, 0.9, i === 2 ? 0.05 : 0.008);
        g.gain.setValueAtTime(0.9, time + i * 0.01);
      }
    } else if (note === 42 || note === 44) {
      this.openHat?.[ch]?.gain.setTargetAtTime(0, time, 0.01); // closed hat chokes the open hat
      noise(0.08, 'highpass', 7500, 1, 0.5, 0.015);
    } else if (note === 46) {
      this.openHat = { ...this.openHat, [ch]: noise(0.6, 'highpass', 7000, 1, 0.45, 0.12) };
    } else if (toms[note]) {
      tone(toms[note] * 1.6, toms[note], 0.5, 'sine', 1, 0.12);
    } else if (note === 49 || note === 57 || note === 52 || note === 55) {
      noise(2.2, 'highpass', 5000, 0.5, 0.45, 0.5);
    } else if (note === 51 || note === 59 || note === 53) {
      noise(1.2, 'bandpass', 8000, 0.8, 0.35, 0.3);
      tone(note === 53 ? 1300 : 900, note === 53 ? 1300 : 900, 0.8, 'sine', 0.08, 0.3);
    } else if (note === 54) {
      noise(0.2, 'highpass', 9000, 1, 0.5, 0.05);
    } else if (note === 56) {
      tone(560, 560, 0.3, 'square', 0.15, 0.06);
      tone(845, 845, 0.3, 'square', 0.15, 0.06);
    } else {
      noise(0.12, 'bandpass', 600 + (note % 24) * 150, 2, 0.6, 0.03);
    }
  }
}
