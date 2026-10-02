// Turns whatever link gets pasted into something the studio can actually load.
//
// The usual reasons "paste a URL, load it into a pad" breaks:
//  1. Share links point at a web page, not the audio file (Dropbox ?dl=0,
//     Google Drive /view, GitHub /blob/). Rewritten here to the direct file.
//  2. The site doesn't allow other sites to read its files (CORS), so the
//     browser blocks fetch(). Those go through the KBK helper server.
//  3. Video/music pages (YouTube, SoundCloud, TikTok...) are pages, not files.
//     Only the helper (yt-dlp) can pull the audio out of them.
//  4. An http:// link on the https:// studio is blocked as mixed content.

const AUDIO_EXT = /\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|aifc|caf|weba|webm|mp4|m4v|mov|3gp)$/i;

const PAGE_HOSTS = [
  'youtube.com', 'youtu.be', 'music.youtube.com', 'soundcloud.com', 'on.soundcloud.com', 'tiktok.com',
  'instagram.com', 'facebook.com', 'fb.watch', 'x.com', 'twitter.com', 'vimeo.com', 'bandcamp.com',
  'mixcloud.com', 'audiomack.com', 'twitch.tv', 'dailymotion.com', 'reddit.com', 'v.redd.it',
];

// Streaming services with DRM: nothing can pull audio from these.
const DRM_HOSTS = ['spotify.com', 'open.spotify.com', 'music.apple.com', 'tidal.com', 'deezer.com', 'music.amazon.com'];

const hostIs = (host, list) => list.some((h) => host === h || host.endsWith(`.${h}`));

export function normalizeAudioUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Paste a link first.');
  if (/^(blob|data):/i.test(raw)) return { url: raw, kind: 'direct', host: '', note: '' };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(raw)) raw = `https://${raw}`;
    else throw new Error('That does not look like a web link.');
  }
  let u;
  try { u = new URL(raw); } catch { throw new Error('That does not look like a web link.'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http:// and https:// links can be read.');
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  let note = '';

  if (hostIs(host, DRM_HOSTS)) {
    return { url: u.href, kind: 'drm', host, note: 'Streaming services lock their audio (DRM), so it cannot be pulled from a link. Use a file you own instead.' };
  }

  // Dropbox: ?dl=0 shows a preview page; dl=1 is the file.
  if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) {
    if (host !== 'dl.dropboxusercontent.com') {
      u.searchParams.delete('dl');
      u.searchParams.set('raw', '1');
      note = 'Dropbox share link changed to the direct file.';
    }
  }

  // Google Drive: /file/d/<id>/view or open?id=<id> -> direct download.
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/);
    const id = m ? m[1] : u.searchParams.get('id');
    if (id) {
      u = new URL(`https://drive.google.com/uc?export=download&id=${id}`);
      note = 'Google Drive share link changed to the direct download. Google Drive blocks other sites from reading files, so this one needs the KBK helper.';
      return { url: u.href, kind: 'helper', host, note };
    }
  }

  // GitHub: /blob/ pages -> raw file.
  if (host === 'github.com') {
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
    if (m) {
      u = new URL(`https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`);
      note = 'GitHub page link changed to the raw file.';
    }
  }

  // OneDrive / 1drv: add download=1.
  if (host === '1drv.ms' || host.endsWith('onedrive.live.com') || host.endsWith('sharepoint.com')) {
    u.searchParams.set('download', '1');
    note = 'OneDrive link changed to download the file.';
  }

  if (hostIs(host, PAGE_HOSTS)) {
    return { url: u.href, kind: 'page', host, note: note || 'This is a video/music page, not an audio file. The KBK helper pulls the audio out of it.' };
  }

  const kind = AUDIO_EXT.test(u.pathname) ? 'direct' : 'unknown';
  return { url: u.href, kind, host, note };
}

export function isMixedContent(pageProtocol, url) {
  return pageProtocol === 'https:' && /^http:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);
}

export function filenameFromUrl(url, fallback = 'audio') {
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    if (v) return `youtube-${v}`;
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    const base = last.replace(/\.[a-z0-9]{2,5}$/i, '');
    return base || u.hostname.replace(/^www\./, '') || fallback;
  } catch {
    return fallback;
  }
}

// Picks the file name out of a Content-Disposition header.
export function filenameFromDisposition(header) {
  if (!header) return '';
  const star = header.match(/filename\*\s*=\s*[^']*''([^;]+)/i);
  if (star) { try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch { /* fall through */ } }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : '';
}

// What a fetched body really is, from its first bytes. Catches the classic
// failure where a "download" link hands back an HTML page.
export function sniffAudio(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const s = (o, n) => String.fromCharCode(...b.subarray(o, o + n));
  if (b.length < 4) return 'empty';
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WAVE') return 'wav';
  if (s(0, 4) === 'FORM' && /AIF[FC]/.test(s(8, 4))) return 'aiff';
  if (s(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
  if (s(0, 4) === 'OggS') return 'ogg';
  if (s(0, 4) === 'fLaC') return 'flac';
  if (s(4, 4) === 'ftyp') return 'mp4';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  if (s(0, 4) === 'caff') return 'caf';
  const head = s(0, Math.min(256, b.length)).trimStart().toLowerCase();
  if (head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<?xml') || head.startsWith('<')) return 'html';
  if (head.startsWith('{') || head.startsWith('[')) return 'json';
  return 'unknown';
}
