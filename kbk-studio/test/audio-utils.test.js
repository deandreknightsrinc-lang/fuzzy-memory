import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  makeClip, encodeWav, decodeWav, encodeAiff, readExtended, writeExtended, resample, normalize, peak,
  trimSilence, slice, toMono, toStereo, detectOnsets, chop, equalStarts, encodeMp3, mp3Rate, safeFileName, peaks, clipDuration,
} from '../js/audio-utils.js';

const sine = (n, f, rate = 44100, a = 0.5) => Float32Array.from({ length: n }, (_, i) => a * Math.sin((2 * Math.PI * f * i) / rate));

test('WAV round trip at 16, 24 and 32-bit float', () => {
  const clip = makeClip([sine(1000, 440), sine(1000, 220)], 48000, 'x');
  for (const [bitDepth, tol] of [[16, 1e-4], [24, 1e-6], [32, 1e-7]]) {
    const back = decodeWav(encodeWav(clip, { bitDepth }));
    assert.equal(back.sampleRate, 48000);
    assert.equal(back.channels.length, 2);
    assert.equal(back.channels[0].length, 1000);
    for (let i = 0; i < 1000; i += 37) assert.ok(Math.abs(back.channels[1][i] - clip.channels[1][i]) < tol, `bit ${bitDepth}`);
  }
});

test('decodeWav rejects a web page', () => {
  assert.throws(() => decodeWav(new TextEncoder().encode('<!doctype html><html>').buffer), /Not a WAV/);
});

test('AIFF header carries channels, frames and sample rate', () => {
  const clip = makeClip([sine(500, 440)], 44100);
  const buf = encodeAiff(clip, { bitDepth: 24 });
  const v = new DataView(buf);
  assert.equal(String.fromCharCode(...new Uint8Array(buf, 0, 4)), 'FORM');
  assert.equal(v.getUint16(20), 1);
  assert.equal(v.getUint32(22), 500);
  assert.equal(v.getUint16(26), 24);
  assert.equal(readExtended(v, 28), 44100);
  assert.deepEqual([...new Uint8Array(buf, 28, 4)], [0x40, 0x0e, 0xac, 0x44]);
  assert.equal(buf.byteLength, 54 + 500 * 3);
});

test('extended float round trips common rates', () => {
  const v = new DataView(new ArrayBuffer(10));
  for (const r of [8000, 22050, 44100, 48000, 88200, 96000, 192000]) { writeExtended(v, 0, r); assert.equal(readExtended(v, 0), r); }
});

test('resample changes rate and length', () => {
  const c = resample(makeClip([sine(44100, 100)], 44100), 48000);
  assert.equal(c.sampleRate, 48000);
  assert.equal(c.channels[0].length, 48000);
});

test('normalize hits the target peak', () => {
  const c = normalize(makeClip([sine(1000, 100, 44100, 0.1)], 44100), -1);
  assert.ok(Math.abs(peak(c) - Math.pow(10, -1 / 20)) < 1e-3);
});

test('trimSilence cuts quiet ends', () => {
  const ch = new Float32Array(44100);
  ch.set(sine(4410, 300), 22050);
  const c = trimSilence(makeClip([ch], 44100), -50, 0);
  assert.ok(Math.abs(clipDuration(c) - 0.1) < 0.01);
});

test('slice, mono, stereo', () => {
  const c = makeClip([sine(44100, 100), sine(44100, 200)], 44100);
  assert.equal(slice(c, 0.25, 0.5).channels[0].length, 11025);
  assert.equal(toMono(c).channels.length, 1);
  assert.equal(toStereo(toMono(c)).channels.length, 2);
  assert.equal(peaks(c, 10).length, 20);
});

test('onsets find drum hits and chop makes pieces', () => {
  const rate = 44100;
  const ch = new Float32Array(rate * 2);
  const hits = [0.25, 0.75, 1.25];
  for (const t of hits) for (let i = 0; i < 3000; i++) ch[Math.round(t * rate) + i] = Math.exp(-i / 400) * (Math.random() * 2 - 1);
  const on = detectOnsets(makeClip([ch], rate), { max: 8 });
  for (const t of hits) assert.ok(on.some((o) => Math.abs(o - t) < 0.03), `hit at ${t}: ${on}`);
  const parts = chop(makeClip([ch], rate, 'loop'), equalStarts(makeClip([ch], rate), 4));
  assert.equal(parts.length, 4);
  assert.equal(parts[3].name, 'loop 4');
  assert.ok(Math.abs(clipDuration(parts[0]) - 0.5) < 0.001);
});

test('MP3 encodes with lamejs', () => {
  globalThis.window = globalThis;
  // eslint-disable-next-line no-eval
  (0, eval)(readFileSync(new URL('../vendor/lamejs/lame.min.js', import.meta.url), 'utf8'));
  const mp3 = new Uint8Array(encodeMp3(makeClip([sine(44100, 440), sine(44100, 440)], 44100), globalThis.lamejs, { kbps: 128 }));
  assert.ok(mp3.length > 10000 && mp3.length < 30000, `${mp3.length}`);
  assert.equal(mp3[0], 0xff);
  assert.equal(mp3Rate(96000), 48000);
  assert.equal(mp3Rate(44100), 44100);
});

test('safe file names', () => {
  assert.equal(safeFileName('My Beat: v2/final.mp3', 'wav'), 'My Beat_ v2_final.wav');
  assert.equal(safeFileName('', 'wav'), 'audio.wav');
});

test('autoChop: one-shots stay whole, loops cut at hits, songs spread across the track', async () => {
  const { autoChop, chopRanges, estimateTempo } = await import('../js/audio-utils.js');
  const rate = 22050;
  const hitAt = (ch, t, len = 2500) => { const s = Math.round(t * rate); for (let i = 0; i < len && s + i < ch.length; i++) ch[s + i] += Math.exp(-i / 300) * Math.sin(i * 0.3) * 0.8; };

  assert.equal(autoChop(makeClip([sine(rate, 200, rate)], rate)).kind, 'oneshot');

  const loop = new Float32Array(rate * 4);
  const hits = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  hits.forEach((h) => hitAt(loop, h));
  const lc = autoChop(makeClip([loop], rate));
  assert.equal(lc.kind, 'loop');
  assert.equal(lc.ranges.length, 8, JSON.stringify(lc.ranges));
  for (const h of hits) assert.ok(lc.ranges.some(([a]) => Math.abs(a - h) < 0.03), `hit ${h}`);

  // 64 s "song" at 100 BPM: a hit on every beat, louder on beat 1
  const song = new Float32Array(rate * 64);
  for (let b = 0; b * 0.6 < 63.5; b++) hitAt(song, b * 0.6, b % 4 === 0 ? 4000 : 2500);
  for (let i = 0; i < song.length; i++) song[i] += 0.05 * Math.sin((2 * Math.PI * 220 * i) / rate);
  const clip = makeClip([song], rate, 'song');
  const bpm = estimateTempo(clip);
  assert.ok(Math.abs(bpm - 100) <= 2, `bpm ${bpm}`);
  const sc = autoChop(clip);
  assert.equal(sc.kind, 'song');
  assert.equal(sc.ranges.length, 16);
  // spread through the whole song, in order
  assert.ok(sc.ranges[0][0] < 4 && sc.ranges[15][0] > 56, JSON.stringify(sc.ranges.map((r) => r[0].toFixed(1))));
  for (let i = 1; i < 16; i++) assert.ok(sc.ranges[i][0] > sc.ranges[i - 1][0]);
  // each chop starts on a hit and lasts about a bar (2.4 s)
  for (const [a, b] of sc.ranges) {
    assert.ok(Math.abs(a / 0.6 - Math.round(a / 0.6)) < 0.05, `start ${a} on a beat`);
    assert.ok(b - a > 1.7 && b - a < 2.7, `length ${b - a}`);
  }
  const parts = chopRanges(clip, sc.ranges);
  assert.equal(parts.length, 16);
  assert.equal(parts[15].name, 'song 16');
});
