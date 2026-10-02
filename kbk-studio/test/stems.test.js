import test from 'node:test';
import assert from 'node:assert/strict';
import { splitStems, fft, instrumental } from '../js/stems.js';

const energy = (a) => a.reduce((s, v) => s + v * v, 0);

test('fft round trip', () => {
  const re = Float32Array.from({ length: 64 }, (_, i) => Math.sin(i)), im = new Float32Array(64);
  const orig = re.slice();
  fft(re, im); fft(re, im, true);
  for (let i = 0; i < 64; i++) assert.ok(Math.abs(re[i] / 64 - orig[i]) < 1e-4);
});

test('stems split tones, bass, hits and sum back to the mix', () => {
  const rate = 22050, n = rate * 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  const vocal = new Float32Array(n), bass = new Float32Array(n), drums = new Float32Array(n), side = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    vocal[i] = 0.3 * Math.sin((2 * Math.PI * 660 * i) / rate);
    bass[i] = 0.3 * Math.sin((2 * Math.PI * 55 * i) / rate);
    side[i] = 0.2 * Math.sin((2 * Math.PI * 1500 * i) / rate);
  }
  for (let t = 0; t < n; t += rate / 4) for (let i = 0; i < 400 && t + i < n; i++) drums[t + i] = (Math.random() * 2 - 1) * Math.exp(-i / 60);
  for (let i = 0; i < n; i++) { L[i] = vocal[i] + bass[i] + drums[i] + side[i]; R[i] = vocal[i] + bass[i] + drums[i] - side[i]; }
  const s = splitStems(L, R, rate);
  const mid = (a) => a.subarray(rate / 4, n - rate / 4);
  // sums back to the mix
  let err = 0;
  for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(s.vocals[0][i] + s.drums[0][i] + s.bass[0][i] + s.other[0][i] - L[i]));
  assert.ok(err < 1e-4, `sum error ${err}`);
  // each source lands mostly in its stem
  assert.ok(energy(mid(s.bass[0])) > 0.6 * energy(mid(bass)), 'bass');
  assert.ok(energy(mid(s.vocals[0])) > 0.5 * energy(mid(vocal)), 'vocal');
  assert.ok(energy(mid(s.vocals[0])) < 2 * energy(mid(vocal)), 'vocal not everything');
  assert.ok(energy(mid(s.other[0])) > 0.5 * energy(mid(side)), 'wide part goes to other');
  assert.ok(energy(mid(s.drums[0])) > 0.3 * energy(mid(drums)), 'drums');
  assert.equal(instrumental(s).length, 2);
});
