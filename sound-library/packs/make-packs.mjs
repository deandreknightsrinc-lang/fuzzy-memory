#!/usr/bin/env node
// Makes the Knight Lyfe Sound Packs: original, royalty-free sounds synthesized from
// scratch (no samples from anyone else), plus MIDI grooves and chord progressions.
//
//   node make-packs.mjs [OUTDIR]      (default: ./Knight Lyfe Sound Packs)
//
// Packs:
//   Knight Lyfe Drums Vol 1   kicks, snares, claps, hi-hats, cymbals, toms, percussion,
//                             808s in all 12 keys (24-bit WAV, 44.1 kHz)
//   Knight Lyfe Gospel MIDI   the Knight Keys gospel drum grooves and chord
//                             progressions in all 12 keys
// The same seed always makes the same sounds, so every build ships the same pack.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GROOVES, compileGroove } from '../../knight-keys/js/grooves.js';
import { writeMidi } from '../../knight-keys/js/midi-file.js';

export const SR = 44100;

// ---- Sound building blocks -------------------------------------------------------------

/** A repeatable random generator (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RBJ biquad filter, in place. type: lowpass | highpass | bandpass | peak */
export function biquad(x, type, freq, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
  const cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') [b0, b1, b2, a0, a1, a2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
  else if (type === 'highpass') [b0, b1, b2, a0, a1, a2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
  else if (type === 'bandpass') [b0, b1, b2, a0, a1, a2] = [alpha, 0, -alpha, 1 + alpha, -2 * cos, 1 - alpha];
  else [b0, b1, b2, a0, a1, a2] = [1 + alpha * A, -2 * cos, 1 - alpha * A, 1 + alpha / A, -2 * cos, 1 - alpha / A];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
}

const buf = (seconds) => new Float32Array(Math.round(seconds * SR));

function noise(len, rand) {
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) x[i] = rand() * 2 - 1;
  return x;
}

/** Soft saturation, keeping the peak near 1. */
function drive(x, amount) {
  if (amount <= 1) return x;
  const n = Math.tanh(amount);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * amount) / n;
  return x;
}

function mixInto(dst, src, gain = 1, offset = 0) {
  for (let i = 0; i < src.length && i + offset < dst.length; i++) dst[i + offset] += src[i] * gain;
  return dst;
}

/** A small room (Schroeder: four combs, two allpasses) mixed in at `wet`. */
function room(x, wet = 0.15, size = 1) {
  const out = new Float32Array(x.length);
  for (const d of [1557, 1617, 1491, 1422]) {
    const len = Math.round(d * size), line = new Float32Array(len);
    let idx = 0, lp = 0;
    for (let i = 0; i < x.length; i++) {
      const y = line[idx];
      lp = y * 0.6 + lp * 0.4;
      line[idx] = x[i] + lp * 0.78;
      out[i] += y * 0.25;
      idx = (idx + 1) % len;
    }
  }
  for (const d of [225, 556]) {
    const line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const v = line[idx], inp = out[i];
      line[idx] = inp + v * 0.5;
      out[i] = v - inp * 0.5;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < x.length; i++) x[i] = x[i] * (1 - wet) + out[i] * wet;
  return x;
}

/** Trim the silent tail, fade the end, normalize to -0.5 dBFS. */
export function finish(x, { floorDb = -66, fadeMs = 8 } = {}) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  if (peak === 0) return x;
  const floor = peak * Math.pow(10, floorDb / 20);
  let end = x.length;
  while (end > 1 && Math.abs(x[end - 1]) < floor) end--;
  const y = x.slice(0, Math.min(x.length, end + Math.round(0.01 * SR)));
  const fade = Math.min(y.length, Math.round((fadeMs / 1000) * SR));
  for (let i = 0; i < fade; i++) y[y.length - 1 - i] *= i / fade;
  const g = 0.944 / peak;
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return y;
}

/** 24-bit mono WAV. */
export function wav(x) {
  const data = Buffer.alloc(x.length * 3);
  for (let i = 0; i < x.length; i++) {
    const v = Math.max(-8388608, Math.min(8388607, Math.round(x[i] * 8388607)));
    data.writeIntLE(v, i * 3, 3);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 3, 28); h.writeUInt16LE(3, 32); h.writeUInt16LE(24, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// ---- Instruments -------------------------------------------------------------------------

/** A pitched body: sine (or triangle) gliding from f0 to f1, decaying. */
function body(seconds, { f0, f1, glide, decay, shape = 'sine', attack = 0.0015 }) {
  const x = buf(seconds);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / glide);
    ph += (2 * Math.PI * f) / SR;
    const s = shape === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph);
    x[i] = s * Math.exp(-t / decay) * Math.min(1, t / attack);
  }
  return x;
}

/** Noise with an exponential decay, filtered. */
function hiss(seconds, rand, { decay, hp = 0, lp = 0, bp = 0, q = 1, attack = 0.0008 }) {
  const x = noise(Math.round(seconds * SR), rand);
  if (hp) biquad(x, 'highpass', hp, 0.7);
  if (lp) biquad(x, 'lowpass', lp, 0.7);
  if (bp) biquad(x, 'bandpass', bp, q);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] *= Math.exp(-t / decay) * Math.min(1, t / attack);
  }
  return x;
}

/** The classic six-square metallic tone behind drum-machine hats and cymbals. */
function metal(seconds, { base = 1, decay, hp = 7000, bp = 10000 }) {
  const ratios = [205.3, 304.4, 369.6, 522.7, 540, 800];
  const x = buf(seconds);
  for (const r of ratios) {
    const f = r * base;
    for (let i = 0; i < x.length; i++) x[i] += ((i * f) / SR) % 1 < 0.5 ? 1 : -1;
  }
  biquad(x, 'bandpass', bp, 0.8);
  biquad(x, 'highpass', hp, 0.7);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / SR / decay) / ratios.length;
  return x;
}

function kick(p, rand) {
  const x = body(1.2, { f0: p.f0, f1: p.f1, glide: p.glide, decay: p.decay, shape: p.shape });
  if (p.click) mixInto(x, hiss(0.012, rand, { decay: 0.003, hp: 2500 }), p.click);
  drive(x, p.drive || 1);
  if (p.lp) biquad(x, 'lowpass', p.lp, 0.7);
  if (p.dust) mixInto(x, hiss(0.4, rand, { decay: 0.08, bp: 1800, q: 0.5 }), p.dust);
  return x;
}

function snare(p, rand) {
  const x = body(0.8, { f0: p.tone * 1.6, f1: p.tone, glide: 0.012, decay: p.toneDecay });
  mixInto(x, body(0.8, { f0: p.tone * 2.9, f1: p.tone * 1.85, glide: 0.01, decay: p.toneDecay * 0.7 }), 0.5);
  for (let i = 0; i < x.length; i++) x[i] *= p.toneLevel;
  mixInto(x, hiss(0.8, rand, { decay: p.noiseDecay, hp: p.hp, lp: p.lp }), p.noiseLevel);
  drive(x, p.drive || 1.2);
  if (p.room) room(x, p.room, p.size || 1);
  return x;
}

function clap(p, rand) {
  const x = buf(0.9);
  for (let k = 0; k < p.bursts; k++) mixInto(x, hiss(0.02, rand, { decay: 0.006, bp: p.bp, q: 0.9 }), 1 - k * 0.12, Math.round(k * p.spread * SR));
  mixInto(x, hiss(0.9, rand, { decay: p.tail, bp: p.bp, q: 0.7 }), 0.7, Math.round(p.bursts * p.spread * SR));
  if (p.room) room(x, p.room, p.size || 1);
  return x;
}

function hat(p, rand) {
  const x = metal(p.length, { base: p.base, decay: p.decay, hp: p.hp || 7000, bp: p.bp || 10000 });
  mixInto(x, hiss(p.length, rand, { decay: p.decay * 0.8, hp: 8000 }), p.noise ?? 0.35);
  return x;
}

function cymbal(p, rand) {
  const x = metal(p.length, { base: p.base, decay: p.decay, hp: p.hp || 4000, bp: p.bp || 8000 });
  mixInto(x, hiss(p.length, rand, { decay: p.decay, hp: p.hp || 4000, lp: 14000 }), p.wash);
  if (p.bell) mixInto(x, body(p.length, { f0: p.bell, f1: p.bell, glide: 1, decay: p.decay * 0.6 }), p.bellLevel || 0.25);
  return x;
}

function tom(p, rand) {
  const x = body(1.4, { f0: p.f * 1.7, f1: p.f, glide: 0.05, decay: p.decay });
  mixInto(x, hiss(0.2, rand, { decay: 0.03, bp: p.f * 6, q: 0.8 }), 0.18);
  drive(x, 1.6);
  if (p.room) room(x, p.room);
  return x;
}

const PERC = {
  rim: (r) => { const x = body(0.2, { f0: 1700, f1: 1650, glide: 0.01, decay: 0.012, shape: 'tri' }); return mixInto(x, hiss(0.05, r, { decay: 0.004, hp: 3000 }), 0.6); },
  shaker: (r) => { const x = hiss(0.25, r, { decay: 0.05, bp: 6500, q: 1.2, attack: 0.03 }); return x; },
  tambourine: (r) => { const x = metal(0.6, { base: 3.1, decay: 0.12, hp: 6000, bp: 9000 }); return mixInto(x, hiss(0.6, r, { decay: 0.1, hp: 7000, attack: 0.004 }), 0.8); },
  cowbell: () => { const x = buf(0.5); for (const f of [540, 800]) for (let i = 0; i < x.length; i++) x[i] += (((i * f) / SR) % 1 < 0.5 ? 1 : -1) * Math.exp(-i / SR / 0.09); return biquad(x, 'bandpass', 900, 1.4); },
  conga: () => body(0.6, { f0: 420, f1: 330, glide: 0.02, decay: 0.09 }),
  bongo: () => body(0.4, { f0: 620, f1: 520, glide: 0.012, decay: 0.06 }),
  snap: (r) => { const x = hiss(0.2, r, { decay: 0.012, bp: 2800, q: 2 }); return mixInto(x, body(0.1, { f0: 2200, f1: 1900, glide: 0.005, decay: 0.006 }), 0.4); },
  clave: () => body(0.3, { f0: 2500, f1: 2450, glide: 0.01, decay: 0.03 }),
  triangle: () => { const x = buf(1.6); for (const f of [5000, 7350, 9200]) for (let i = 0; i < x.length; i++) x[i] += Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-i / SR / 0.5) / 3; return x; },
  woodblock: () => body(0.25, { f0: 1100, f1: 1000, glide: 0.006, decay: 0.025, shape: 'tri' }),
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function eightOhEight(midi, dirt, rand) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const x = body(3.2, { f0: f * 2.2, f1: f, glide: 0.025, decay: 0.9 });
  mixInto(x, hiss(0.01, rand, { decay: 0.002, hp: 1500 }), 0.25);
  drive(x, dirt);
  biquad(x, 'lowpass', dirt > 3 ? 2400 : 1200, 0.7);
  return x;
}

// ---- The drum pack ----------------------------------------------------------------------

const KICKS = [
  ['Punch', { f0: 180, f1: 52, glide: 0.03, decay: 0.22, click: 0.5, drive: 2 }],
  ['Deep', { f0: 120, f1: 42, glide: 0.05, decay: 0.45, click: 0.2, drive: 1.4 }],
  ['Tight', { f0: 220, f1: 60, glide: 0.018, decay: 0.12, click: 0.7, drive: 2.5 }],
  ['Gospel Live', { f0: 140, f1: 55, glide: 0.035, decay: 0.2, click: 0.35, drive: 1.6, lp: 3500 }],
  ['Trap Sub', { f0: 160, f1: 45, glide: 0.04, decay: 0.7, click: 0.3, drive: 2.2 }],
  ['Dusty', { f0: 150, f1: 50, glide: 0.03, decay: 0.25, click: 0.3, drive: 3, lp: 1800, dust: 0.08 }],
  ['Knock', { f0: 250, f1: 58, glide: 0.022, decay: 0.16, click: 0.9, drive: 3.5 }],
  ['Round', { f0: 110, f1: 48, glide: 0.06, decay: 0.3, click: 0.1, drive: 1.2, shape: 'tri', lp: 900 }],
  ['Club', { f0: 200, f1: 50, glide: 0.028, decay: 0.32, click: 0.6, drive: 2.8 }],
  ['Soft', { f0: 100, f1: 50, glide: 0.04, decay: 0.2, click: 0.05, drive: 1.1, lp: 700 }],
  ['Hard', { f0: 260, f1: 55, glide: 0.02, decay: 0.24, click: 1, drive: 4.5 }],
  ['Boom Bap', { f0: 170, f1: 54, glide: 0.03, decay: 0.28, click: 0.5, drive: 2.4, lp: 2500, dust: 0.04 }],
];
const SNARES = [
  ['Crack', { tone: 200, toneDecay: 0.06, toneLevel: 0.6, noiseDecay: 0.14, noiseLevel: 0.9, hp: 1500, lp: 9000, drive: 1.8 }],
  ['Fat', { tone: 170, toneDecay: 0.1, toneLevel: 0.9, noiseDecay: 0.2, noiseLevel: 0.7, hp: 900, lp: 7000, drive: 1.6 }],
  ['Tight', { tone: 240, toneDecay: 0.04, toneLevel: 0.5, noiseDecay: 0.08, noiseLevel: 0.9, hp: 2000, lp: 10000, drive: 2 }],
  ['Gospel Room', { tone: 190, toneDecay: 0.08, toneLevel: 0.7, noiseDecay: 0.18, noiseLevel: 0.85, hp: 1200, lp: 8000, room: 0.28 }],
  ['Trap', { tone: 220, toneDecay: 0.05, toneLevel: 0.4, noiseDecay: 0.12, noiseLevel: 1, hp: 2500, lp: 12000, drive: 2.4 }],
  ['Dusty', { tone: 185, toneDecay: 0.07, toneLevel: 0.6, noiseDecay: 0.16, noiseLevel: 0.8, hp: 1000, lp: 4500, drive: 2.6 }],
  ['Brush', { tone: 210, toneDecay: 0.03, toneLevel: 0.15, noiseDecay: 0.22, noiseLevel: 1, hp: 2500, lp: 7000, drive: 1 }],
  ['Pop', { tone: 280, toneDecay: 0.05, toneLevel: 0.8, noiseDecay: 0.1, noiseLevel: 0.6, hp: 1800, lp: 9000, drive: 2.2 }],
  ['Big Room', { tone: 175, toneDecay: 0.1, toneLevel: 0.7, noiseDecay: 0.25, noiseLevel: 0.9, hp: 900, lp: 8000, room: 0.4, size: 1.3 }],
  ['Rimshot', { tone: 420, toneDecay: 0.03, toneLevel: 1, noiseDecay: 0.06, noiseLevel: 0.6, hp: 2500, lp: 11000, drive: 3 }],
];
const CLAPS = [
  ['Classic', { bursts: 4, spread: 0.011, bp: 1200, tail: 0.12 }],
  ['Tight', { bursts: 3, spread: 0.007, bp: 1500, tail: 0.06 }],
  ['Wide', { bursts: 5, spread: 0.014, bp: 1000, tail: 0.18, room: 0.25 }],
  ['Church Hands', { bursts: 6, spread: 0.018, bp: 1100, tail: 0.2, room: 0.35, size: 1.2 }],
  ['Trap', { bursts: 4, spread: 0.009, bp: 1800, tail: 0.1 }],
  ['Room', { bursts: 4, spread: 0.012, bp: 1300, tail: 0.15, room: 0.4 }],
];
const HATS = [
  ['Closed Tight', { length: 0.15, decay: 0.025, base: 1 }],
  ['Closed', { length: 0.2, decay: 0.04, base: 1.05 }],
  ['Closed Crisp', { length: 0.2, decay: 0.035, base: 1.2, noise: 0.6 }],
  ['Closed Dark', { length: 0.2, decay: 0.045, base: 0.9, bp: 7500, hp: 5000 }],
  ['Closed Trap', { length: 0.12, decay: 0.02, base: 1.3, noise: 0.5 }],
  ['Pedal', { length: 0.2, decay: 0.03, base: 0.95, bp: 8000 }],
  ['Open', { length: 1, decay: 0.3, base: 1 }],
  ['Open Long', { length: 1.6, decay: 0.55, base: 1.05 }],
  ['Open Dark', { length: 1.2, decay: 0.35, base: 0.9, bp: 7500, hp: 5000 }],
  ['Open Short', { length: 0.6, decay: 0.15, base: 1.15, noise: 0.5 }],
];
const CYMBALS = [
  ['Crash', { length: 3.2, decay: 1.0, base: 1.3, wash: 0.8 }],
  ['Crash Dark', { length: 3.2, decay: 1.1, base: 1.1, wash: 0.7, hp: 3000, bp: 6000 }],
  ['Crash Short', { length: 1.8, decay: 0.5, base: 1.4, wash: 0.9 }],
  ['Ride', { length: 2.8, decay: 0.9, base: 1.6, wash: 0.25, bell: 3100, bellLevel: 0.2 }],
  ['Ride Bell', { length: 2.4, decay: 0.8, base: 2, wash: 0.1, bell: 2400, bellLevel: 0.6 }],
  ['Splash', { length: 1.4, decay: 0.35, base: 1.8, wash: 0.8 }],
];
const TOMS = [
  ['High', { f: 210, decay: 0.22 }],
  ['Mid', { f: 160, decay: 0.26 }],
  ['Low', { f: 120, decay: 0.3 }],
  ['Floor', { f: 90, decay: 0.38 }],
  ['High Room', { f: 220, decay: 0.2, room: 0.3 }],
  ['Floor Room', { f: 85, decay: 0.35, room: 0.3 }],
];

/** Every file in the drum pack: [folder, file name, render(rand)]. */
export function drumPack() {
  const items = [];
  const n = (i) => String(i + 1).padStart(2, '0');
  KICKS.forEach(([name, p], i) => items.push(['Kicks', `KL Kick ${n(i)} ${name}`, (r) => kick(p, r)]));
  SNARES.forEach(([name, p], i) => items.push(['Snares', `KL Snare ${n(i)} ${name}`, (r) => snare(p, r)]));
  CLAPS.forEach(([name, p], i) => items.push(['Claps', `KL Clap ${n(i)} ${name}`, (r) => clap(p, r)]));
  HATS.forEach(([name, p], i) => items.push(['Hi-Hats', `KL Hi-Hat ${n(i)} ${name}`, (r) => hat(p, r)]));
  CYMBALS.forEach(([name, p], i) => items.push(['Cymbals', `KL Cymbal ${n(i)} ${name}`, (r) => cymbal(p, r)]));
  TOMS.forEach(([name, p], i) => items.push(['Toms', `KL Tom ${n(i)} ${name}`, (r) => tom(p, r)]));
  Object.entries(PERC).forEach(([name, fn], i) => items.push(['Percussion', `KL Perc ${n(i)} ${name[0].toUpperCase()}${name.slice(1)}`, fn]));
  // 808s from E1 up to D#2, the range most 808 packs cover.
  for (let k = 0; k < 12; k++) {
    const midi = 28 + k; // E1 = 28
    const name = NOTE_NAMES[midi % 12];
    items.push(['808s', `KL 808 Clean ${name}`, (r) => eightOhEight(midi, 1.8, r)]);
    items.push(['808s', `KL 808 Dirty ${name}`, (r) => eightOhEight(midi, 5, r)]);
  }
  return items;
}

// ---- The MIDI pack ------------------------------------------------------------------------

const ON = 0x90, OFF = 0x80;

/** A gospel drum groove: 3 bars of the main pattern and a bar of the fill, on channel 10. */
export function grooveMidi(g) {
  const c = compileGroove(g);
  const qbpm = g.bpm * (g.beatUnit || 1);
  const stepSec = (c.stepBeats * 60) / qbpm;
  const events = [];
  for (let bar = 0; bar < 4; bar++) {
    const pat = bar === 3 && Object.keys(g.fill || {}).length ? c.fill : c.main;
    pat.hits.forEach((hits, s) => {
      const t = (bar * c.steps + s) * stepSec;
      for (const h of hits) {
        events.push({ time: t, bytes: [ON | 9, h.note, h.vel] }, { time: t + stepSec * 0.5, bytes: [OFF | 9, h.note, 0] });
      }
    });
  }
  return writeMidi(events, { bpm: qbpm, name: `KL Drum Groove ${g.name}` });
}

// Progressions as [root offset from the key, chord tones above the root, bass offset]
// per chord, two beats or four beats each. Voicings sit around middle C.
const MAJ9 = [4, 7, 11, 14], MIN9 = [3, 7, 10, 14], DOM13 = [4, 10, 14, 21], MAJ = [4, 7, 12], MIN = [3, 7, 12], ADD9 = [4, 7, 14], MIN7 = [3, 7, 10], DOM7 = [4, 7, 10], DOM7B9 = [4, 10, 13, 19], SIX9 = [4, 9, 14], SUS = [5, 7, 10, 14];
export const PROGRESSIONS = [
  { id: 'worship-1564', name: 'Worship 1-5-6-4', bpm: 72, beats: 4, chords: [[0, ADD9], [7, MAJ], [9, MIN7], [5, ADD9]] },
  { id: 'gospel-251', name: 'Gospel 2-5-1', bpm: 76, beats: 4, chords: [[2, MIN9], [7, DOM13], [0, MAJ9], [0, SIX9]] },
  { id: 'church-1415', name: 'Church 1-4-1-5', bpm: 84, beats: 4, chords: [[0, MAJ], [5, MAJ, 0], [0, MAJ], [7, DOM7]] },
  { id: 'turnaround-1625', name: 'Turnaround 1-6-2-5', bpm: 80, beats: 2, chords: [[0, MAJ9], [9, MIN7], [2, MIN9], [7, DOM7B9], [0, MAJ9], [9, MIN7], [2, MIN9], [7, DOM13]] },
  { id: 'neosoul-4361', name: 'Neo-Soul 4-3-6-2-5', bpm: 70, beats: 4, chords: [[5, MAJ9], [4, MIN7], [9, MIN9], [2, MIN9], [7, SUS]] },
  { id: 'praise-vamp', name: 'Praise Vamp 1-4', bpm: 120, beats: 4, chords: [[0, DOM7], [5, DOM7], [0, DOM7], [5, DOM7]] },
  { id: 'hymn-14515', name: 'Hymn 1-4-5-1', bpm: 66, beats: 4, chords: [[0, MAJ], [5, MAJ], [7, DOM7], [0, MAJ]] },
  { id: 'minor-gospel', name: 'Minor Gospel 6-2-5-1', bpm: 74, beats: 4, chords: [[9, MIN9], [2, MIN9], [7, DOM7B9], [0, MAJ9]] },
];
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A chord progression in a key: chords around middle C, the bass an octave or two below. */
export function progressionMidi(p, key) {
  const beat = 60 / p.bpm;
  const events = [];
  let t = 0;
  for (const [root, tones, bassOff] of p.chords) {
    const len = p.beats * beat;
    const r = (key + root) % 12;
    const base = 60 + r - (r > 5 ? 12 : 0); // chord root between F#3 and F4, so voicings sit around middle C
    const notes = [base, ...tones.map((x) => base + x)].map((n) => (n > 79 ? n - 12 : n));
    const bass = 36 + ((key + (bassOff ?? root)) % 12);
    for (const n of new Set([bass, ...notes])) {
      events.push({ time: t, bytes: [ON, n, n === bass ? 92 : 78] }, { time: t + len * 0.96, bytes: [OFF, n, 0] });
    }
    t += len;
  }
  return writeMidi(events, { bpm: p.bpm, name: `KL Chords ${p.name} in ${KEY_NAMES[key]}` });
}

// ---- Writing the packs ----------------------------------------------------------------------

const LICENSE = `Knight Lyfe Sound Packs - license

These sounds and MIDI files were made from scratch by Knight Lyfe (BAC Ministries)
with the Knight Lyfe Sound Packs generator. No samples from anyone else are in them.

You may use them free of charge in your own music, videos, church services,
lessons and productions, commercial or not, without crediting anyone.
Please don't sell or give away the sounds themselves as a sample pack or
library (as they are or lightly changed). Share the link instead.
`;

/** A name that works as a file name on a Mac ("6/8 Ballad" -> "6-8 Ballad"). */
export const safe = (name) => name.replace(/[/:\\]/g, '-');

export function makePacks(outDir, { log = () => {} } = {}) {
  const drumsDir = join(outDir, 'Knight Lyfe Drums Vol 1');
  const midiDir = join(outDir, 'Knight Lyfe Gospel MIDI');
  const written = [];
  let seed = 1;
  for (const [folder, name, render] of drumPack()) {
    const dir = join(drumsDir, folder);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${name}.wav`);
    writeFileSync(file, wav(finish(render(rng(seed++)))));
    written.push(file);
  }
  log(`  drums: ${written.length} sounds`);
  const gDir = join(midiDir, 'Drum Grooves');
  mkdirSync(gDir, { recursive: true });
  for (const g of GROOVES) {
    const file = join(gDir, `KL Drum Groove - ${safe(g.name)} (${g.bpm} bpm).mid`);
    writeFileSync(file, grooveMidi(g));
    written.push(file);
  }
  for (const p of PROGRESSIONS) {
    const dir = join(midiDir, 'Chord Progressions', p.name);
    mkdirSync(dir, { recursive: true });
    for (let key = 0; key < 12; key++) {
      const file = join(dir, `KL Chords - ${p.name} in ${KEY_NAMES[key]} (${p.bpm} bpm).mid`);
      writeFileSync(file, progressionMidi(p, key));
      written.push(file);
    }
  }
  log(`  MIDI: ${GROOVES.length} grooves, ${PROGRESSIONS.length * 12} chord progressions`);
  for (const dir of [drumsDir, midiDir]) writeFileSync(join(dir, 'LICENSE.txt'), LICENSE);
  writeFileSync(join(outDir, 'README.txt'), `Knight Lyfe Sound Packs

Knight Lyfe Drums Vol 1
  Kicks, snares, claps, hi-hats, cymbals, toms, percussion and 808s in all 12 keys
  (clean and dirty), 24-bit WAV. Drag them into Logic's Drum Machine Designer,
  Quick Sampler or the Knight Lyfe Kit Rack.

Knight Lyfe Gospel MIDI
  Drum Grooves: the Knight Keys gospel grooves (3 bars + a fill) - drop on a
  Drum Kit or Knight Lyfe Ultimate track.
  Chord Progressions: worship, gospel, church, neo-soul and hymn progressions
  in all 12 keys - drop on any keys track.

The Sound Library setup puts these into your library automatically
(bash setup-library.sh). See LICENSE.txt in each pack.
`);
  return written;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), 'Knight Lyfe Sound Packs');
  console.log(`Making the Knight Lyfe Sound Packs in ${out}`);
  const files = makePacks(out, { log: console.log });
  console.log(`Done: ${files.length} files.`);
}
