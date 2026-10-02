// Talks to the KBK helper server (server/kbk_server.py) for the jobs a
// browser can't do alone: reading sites that block other sites (CORS),
// pulling audio out of video pages (yt-dlp), Demucs stems and ffmpeg formats.

import { isMixedContent, filenameFromDisposition } from './url-tools.js';

export const DEFAULT_HELPER = 'http://localhost:8765';

export class Helper {
  constructor(base = DEFAULT_HELPER) {
    this.base = base;
    this.info = null;
  }

  setBase(url) {
    this.base = String(url || '').trim().replace(/\/+$/, '') || DEFAULT_HELPER;
    this.info = null;
  }

  // Served by the helper itself? Then use the same origin.
  static sameOrigin() {
    return typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && location.port === '8765' ? location.origin : null;
  }

  blockedReason() {
    if (typeof location !== 'undefined' && isMixedContent(location.protocol, this.base)) {
      return `This page is https but the helper is ${this.base} (http). Browsers block that. Run the helper on this computer (localhost), or open the studio from the helper: ${this.base}/`;
    }
    return '';
  }

  async check() {
    const why = this.blockedReason();
    if (why) { this.info = null; throw new Error(why); }
    const r = await fetch(`${this.base}/health`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Helper answered ${r.status}`);
    this.info = await r.json();
    return this.info;
  }

  get online() { return !!this.info; }

  async fetchUrl(url, signal) {
    const r = await fetch(`${this.base}/fetch?url=${encodeURIComponent(url)}`, { signal });
    if (!r.ok) throw new Error(await errorText(r));
    const name = filenameFromDisposition(r.headers.get('Content-Disposition')) || r.headers.get('X-Title') || '';
    return { bytes: await r.arrayBuffer(), name };
  }

  // body: WAV ArrayBuffer. Returns { name: url } of stem WAVs.
  async stems(wav, { model = 'htdemucs', twoStems = false, filename = 'song.wav' } = {}, signal) {
    const q = new URLSearchParams({ model, name: filename });
    if (twoStems) q.set('two', 'vocals');
    const r = await fetch(`${this.base}/stems?${q}`, { method: 'POST', body: wav, signal, headers: { 'Content-Type': 'audio/wav' } });
    if (!r.ok) throw new Error(await errorText(r));
    const j = await r.json();
    const out = {};
    for (const [k, v] of Object.entries(j.stems)) out[k] = new URL(v, `${this.base}/`).href;
    return out;
  }

  async getFile(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await errorText(r));
    return r.arrayBuffer();
  }

  // ffmpeg conversion for formats the browser can't write (FLAC, M4A, OGG, Opus).
  async convert(bytes, { format, rate, channels, kbps, filename = 'audio' }, signal) {
    const q = new URLSearchParams({ format, name: filename });
    if (rate) q.set('rate', rate);
    if (channels) q.set('channels', channels);
    if (kbps) q.set('kbps', kbps);
    const r = await fetch(`${this.base}/convert?${q}`, { method: 'POST', body: bytes, signal });
    if (!r.ok) throw new Error(await errorText(r));
    return r.arrayBuffer();
  }
}

async function errorText(r) {
  try {
    const j = await r.json();
    return j.error || `Helper error ${r.status}`;
  } catch {
    return `Helper error ${r.status}`;
  }
}
