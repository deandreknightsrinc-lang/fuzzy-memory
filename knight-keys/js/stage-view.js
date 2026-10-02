// Draws one moment of a service (a "frame" from church.js) as a big slide:
// used by the stream screen (stage.html) and the preview in the Church window.

import { videoSource } from './courses.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Render `frame` into `el`. Videos keep playing if the same one is shown again. */
export function renderStage(el, frame, { muted = false } = {}) {
  if (!frame) return;
  el.style.setProperty('--church', frame.color || '#7c3aed');
  const v = videoSource(frame.video);
  const key = `${frame.kind}|${frame.title}|${frame.video}`;
  const keepVideo = el.dataset.key === key && el.querySelector('.st-video');
  el.dataset.key = key;
  const media = keepVideo ? el.querySelector('.st-video').outerHTML : v ? (v.kind === 'file' ? `<video class="st-video" src="${esc(v.embed)}" autoplay playsinline controls ${muted ? 'muted' : ''}></video>` : `<iframe class="st-video" src="${esc(v.embed)}${v.embed.includes('?') ? '&' : '?'}autoplay=1${muted ? '&mute=1' : ''}" allow="autoplay; fullscreen" allowfullscreen></iframe>`) : '';
  const existing = keepVideo ? el.querySelector('.st-video') : null;
  const lyric = frame.lyricNow ? `<div class="st-lyric">${esc(frame.lyricNow)}</div><div class="st-lyric-next">${esc(frame.lyricNext)}</div>` : '';
  el.innerHTML = `
    <div class="st-top">${frame.logo ? `<img class="st-logo" src="${esc(frame.logo)}" alt="" />` : ''}<span class="st-church">${esc(frame.church)}</span></div>
    <div class="st-body st-${esc(frame.kind)}">
      ${frame.title ? `<div class="st-title">${esc(frame.title)}</div>` : ''}
      ${media ? '<div class="st-media"></div>' : ''}
      ${lyric}
      ${frame.text ? `<div class="st-text">${esc(frame.text).replace(/\n/g, '<br>')}</div>` : ''}
      ${frame.reference ? `<div class="st-ref">${esc(frame.reference)}</div>` : ''}
    </div>
    <div class="st-foot"><span>${esc(frame.footer)}</span>${frame.poweredBy ? '<span class="st-powered">Powered by BAC Ministries · Knight Lyfe</span>' : ''}</div>`;
  const slot = el.querySelector('.st-media');
  if (slot) {
    if (existing) slot.append(existing);
    else slot.innerHTML = media;
  }
}

export const STAGE_CSS = `
.stage { --church: #7c3aed; position: relative; width: 100%; height: 100%; overflow: hidden; color: #fff; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: radial-gradient(ellipse at 30% 10%, color-mix(in srgb, var(--church) 70%, #000) 0%, #07060c 75%); display: flex; flex-direction: column; container-type: size; }
.st-top { display: flex; align-items: center; gap: 1.2cqh; padding: 2.5cqh 3cqw 0; font-weight: 700; font-size: 3cqh; letter-spacing: .04em; opacity: .9; }
.st-logo { height: 6cqh; }
.st-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2cqh 6cqw; gap: 2.4cqh; min-height: 0; }
.st-title { font-size: 7cqh; font-weight: 800; line-height: 1.1; text-shadow: 0 0.4cqh 2cqh rgba(0,0,0,.5); }
.st-text { font-size: 4.4cqh; line-height: 1.35; max-width: 85cqw; opacity: .95; }
.st-scripture .st-text, .st-benediction .st-text { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 4.6cqh; }
.st-ref { font-size: 3.4cqh; font-weight: 700; color: color-mix(in srgb, var(--church) 40%, #fff); }
.st-lyric { font-size: 7.5cqh; font-weight: 800; line-height: 1.15; text-shadow: 0 0.4cqh 2cqh rgba(0,0,0,.6); }
.st-lyric-next { font-size: 4.2cqh; opacity: .6; }
.st-media { width: min(80cqw, 120cqh); aspect-ratio: 16 / 9; flex: 0 1 auto; max-height: 58cqh; }
.st-video { width: 100%; height: 100%; border: 0; border-radius: 1.5cqh; background: #000; box-shadow: 0 1cqh 4cqh rgba(0,0,0,.5); }
.st-foot { display: flex; justify-content: space-between; padding: 0 3cqw 2.2cqh; font-size: 2.4cqh; opacity: .75; }
.st-powered { opacity: .8; }
`;
