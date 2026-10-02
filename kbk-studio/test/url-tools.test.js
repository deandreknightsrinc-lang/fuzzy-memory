import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAudioUrl, isMixedContent, filenameFromUrl, filenameFromDisposition, sniffAudio } from '../js/url-tools.js';

test('direct audio links stay direct', () => {
  const r = normalizeAudioUrl('https://example.com/kits/kick.wav?x=1');
  assert.equal(r.kind, 'direct');
  assert.equal(normalizeAudioUrl('example.com/a.mp3').url, 'https://example.com/a.mp3');
});

test('Dropbox share links become the raw file', () => {
  const r = normalizeAudioUrl('https://www.dropbox.com/s/abc123/snare.wav?dl=0');
  assert.match(r.url, /raw=1/);
  assert.doesNotMatch(r.url, /dl=0/);
  assert.equal(r.kind, 'direct');
});

test('Google Drive share links become a download through the helper', () => {
  const r = normalizeAudioUrl('https://drive.google.com/file/d/1AbC-xyz_9/view?usp=sharing');
  assert.equal(r.url, 'https://drive.google.com/uc?export=download&id=1AbC-xyz_9');
  assert.equal(r.kind, 'helper');
});

test('GitHub blob pages become raw files', () => {
  assert.equal(normalizeAudioUrl('https://github.com/me/kit/blob/main/808.wav').url, 'https://raw.githubusercontent.com/me/kit/main/808.wav');
});

test('video pages need the helper and DRM services are refused', () => {
  assert.equal(normalizeAudioUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ').kind, 'page');
  assert.equal(normalizeAudioUrl('https://youtu.be/dQw4w9WgXcQ').kind, 'page');
  assert.equal(normalizeAudioUrl('https://soundcloud.com/a/b').kind, 'page');
  assert.equal(normalizeAudioUrl('https://open.spotify.com/track/1').kind, 'drm');
  assert.equal(normalizeAudioUrl('https://example.com/song').kind, 'unknown');
});

test('bad input explains itself', () => {
  assert.throws(() => normalizeAudioUrl(''), /Paste a link/);
  assert.throws(() => normalizeAudioUrl('just words'), /web link/);
  assert.throws(() => normalizeAudioUrl('ftp://x.com/a.wav'), /http/);
});

test('mixed content', () => {
  assert.equal(isMixedContent('https:', 'http://192.168.1.5/a.wav'), true);
  assert.equal(isMixedContent('https:', 'http://localhost:8765/fetch'), false);
  assert.equal(isMixedContent('http:', 'http://x.com/a.wav'), false);
});

test('file names', () => {
  assert.equal(filenameFromUrl('https://x.com/a/My%20Kick.wav'), 'My Kick');
  assert.equal(filenameFromUrl('https://www.youtube.com/watch?v=abc'), 'youtube-abc');
  assert.equal(filenameFromDisposition('attachment; filename="snare 1.wav"'), 'snare 1.wav');
  assert.equal(filenameFromDisposition("attachment; filename*=UTF-8''caf%C3%A9.mp3"), 'café.mp3');
});

test('sniffing catches HTML pretending to be audio', () => {
  const enc = (s) => new TextEncoder().encode(s);
  assert.equal(sniffAudio(enc('<!DOCTYPE html><html>')), 'html');
  assert.equal(sniffAudio(enc('RIFF\0\0\0\0WAVEfmt ')), 'wav');
  assert.equal(sniffAudio(enc('ID3\x04\0\0')), 'mp3');
  assert.equal(sniffAudio(enc('fLaC\0\0')), 'flac');
  assert.equal(sniffAudio(enc('\0\0\0\x20ftypM4A ')), 'mp4');
  assert.equal(sniffAudio(new Uint8Array([0xff, 0xfb, 0x90, 0x00])), 'mp3');
});
