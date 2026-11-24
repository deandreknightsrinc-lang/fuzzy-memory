// Run: node --test caller-guard/tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../lookup.js');

test('blocked and hidden callers', () => {
  for (const s of ['Blocked', 'No Caller ID', 'Private', 'unknown', 'Restricted']) {
    assert.strictEqual(L.lookup(s).type, 'hidden', s);
  }
  assert.strictEqual(L.speakable('Blocked'), 'Blocked caller. No caller ID.');
});

test('formats and places U.S. numbers', () => {
  const r = L.lookup('+1 (760) 256-4410');
  assert.strictEqual(r.number.display, '(760) 256-4410');
  assert.strictEqual(r.place, 'California');
  assert.strictEqual(L.speakable('7602564410'), '7 6 0, 2 5 6, 4 4 1 0');
});

test('flags one-ring Caribbean, premium and spoofed numbers', () => {
  assert.strictEqual(L.lookup('876-555-2222').risk, 'high');
  assert.strictEqual(L.lookup('900-555-2222').risk, 'high');
  assert.strictEqual(L.lookup('760-055-2222').risk, 'high');
  assert.strictEqual(L.lookup('800-555-1212').type, 'toll-free');
});

test('neighbor spoofing against your own number', () => {
  const r = L.lookup('760-256-0000', '760-256-1111');
  assert.strictEqual(r.risk, 'caution');
  assert.strictEqual(L.lookup('760-256-1111', '760-256-1111').risk, 'unknown');
});

test('international and short codes', () => {
  assert.strictEqual(L.lookup('+44 20 7946 0958').type, 'international');
  assert.strictEqual(L.lookup('011 44 20 7946 0958').type, 'international');
  assert.strictEqual(L.lookup('22395').type, 'short code');
});

test('no area code is listed twice', () => {
  const seen = {};
  for (const [place, codes] of Object.entries(L.AREA)) {
    for (const c of codes.split(' ')) {
      assert.ok(!seen[c], c + ' in ' + seen[c] + ' and ' + place);
      assert.ok(!L.CARIBBEAN[c], c + ' also Caribbean');
      seen[c] = place;
    }
  }
});
