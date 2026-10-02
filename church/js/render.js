// The church's home page, built from its church file. Pure (returns HTML text) so
// it can be tested; every value from the file is escaped, since church files come
// from many churches.

import { PROGRAMS, ACADEMY_COURSES, FLAGSHIP_ID, normalizeChurch, safeUrl, embedFor, appLink, bibleLink } from './profile.js';
import { teacherById } from '../../knight-keys/js/teachers.js';
import { teacherFaceSvg } from '../../knight-keys/js/ai-teacher.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const link = (href, label, cls = '') => {
  const u = safeUrl(href);
  if (!u) return '';
  const ext = /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';
  return `<a class="${cls}" href="${esc(u)}"${ext}>${label}</a>`;
};

const SOCIAL = [
  ['youtube', '▶ YouTube'],
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
];

function embed(url, title) {
  const e = embedFor(url);
  if (!e) return '';
  if (e.kind === 'file') return `<video class="kc-video" src="${esc(e.src)}" controls preload="metadata" title="${esc(title)}"></video>`;
  return `<iframe class="kc-video" src="${esc(e.src)}" title="${esc(title)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}

/**
 * The home page for a church.
 * opts.network: [{ id, name, city, tagline, flagship }] (shown on the flagship's page)
 * opts.app: path to Knight Keys; opts.home: path to the church home page
 */
export function renderHome(raw, { network = [], app = '../knight-keys/', home = './' } = {}) {
  const c = normalizeChurch(raw);
  const flagship = c.id === FLAGSHIP_ID;
  const L = c.links;
  const p = c.programs;
  const name = esc(c.name || 'Your church');
  const out = [];

  // Top bar
  out.push(`<header class="kc-top">
  <a class="kc-brand" href="#top">${c.logo && safeUrl(c.logo) ? `<img src="${esc(safeUrl(c.logo))}" alt="" />` : '<span class="kc-mark">✝</span>'}<span>${name}</span></a>
  <nav>${[p.online && '<a href="#watch">Watch</a>', p.bible && `<a href="${esc(bibleLink(c))}">Bible</a>`, (p.academy || p.band || p.courses) && '<a href="#learn">Learn</a>', (c.times.length || c.address) && '<a href="#visit">Visit</a>', L.giving && '<a href="#give">Give</a>'].filter(Boolean).join('')}</nav>
</header>`);

  // Hero
  // Percent-encode the characters that could end the CSS url('...') before HTML-escaping.
  const heroUrl = safeUrl(c.heroImage).replace(/['"()\\\s<>]/g, (ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`);
  const hero = heroUrl ? ` style="--hero: url('${esc(heroUrl)}')"` : '';
  out.push(`<section class="kc-hero" id="top"${hero}>
  <h1>${name}</h1>
  ${c.tagline ? `<p class="kc-tagline">${esc(c.tagline)}</p>` : ''}
  <div class="kc-actions">
    ${L.live ? link(L.live, '▶ Watch live', 'kc-btn primary') : p.online ? `<a class="kc-btn primary" href="#watch">▶ Worship online</a>` : ''}
    ${c.times.length || c.address ? '<a class="kc-btn" href="#visit">🕊 Plan a visit</a>' : ''}
    ${L.giving ? '<a class="kc-btn" href="#give">💝 Give</a>' : ''}
  </div>
</section>`);

  // Service times and place
  if (c.times.length || c.address) {
    out.push(`<section class="kc-section" id="visit">
  <h2>Join us</h2>
  <div class="kc-times">${c.times.map((t) => `<div class="kc-time"><b>${esc(t.day)}</b><span>${esc(t.time)}</span><small>${esc(t.label)}</small></div>`).join('')}</div>
  ${c.address ? `<p class="kc-address">📍 ${esc(c.address)} ${link(`https://maps.google.com/?q=${encodeURIComponent(c.address)}`, 'Directions', 'kc-small')}</p>` : ''}
</section>`);
  } else out.push('<span id="visit"></span>');

  // Online church
  if (p.online) {
    const latest = c.sermons.find((s) => embedFor(s.video));
    out.push(`<section class="kc-section" id="watch">
  <h2>${PROGRAMS.online.icon} Online church</h2>
  <p>${esc(PROGRAMS.online.text)}</p>
  ${latest ? `<figure class="kc-feature">${embed(latest.video, latest.title)}<figcaption><b>${esc(latest.title)}</b>${latest.speaker ? ` · ${esc(latest.speaker)}` : ''}${latest.date ? ` · ${esc(latest.date)}` : ''}</figcaption></figure>` : ''}
  <div class="kc-actions">
    ${link(L.live, '🔴 Live service', 'kc-btn primary')}
    ${link(L.youtube, '▶ Past services on YouTube', 'kc-btn')}
    ${link(L.facebook, 'Facebook Live', 'kc-btn')}
    <a class="kc-btn" href="${esc(appLink(c, 'church', app))}">⛪ Run a virtual service</a>
  </div>
  ${c.sermons.length > 1 ? `<div class="kc-sermons">${c.sermons.filter((s) => s !== latest).slice(0, 6).map((s) => `<div class="kc-sermon">${link(s.video, `▶ ${esc(s.title || 'Message')}`) || `<b>${esc(s.title)}</b>`}<small>${[s.speaker, s.date].filter(Boolean).map(esc).join(' · ')}</small></div>`).join('')}</div>` : ''}
</section>`);
  }

  // The Bible
  if (p.bible) {
    const start = [['Gen.1', 'In the beginning', 'Genesis 1'], ['Ps.23', 'The Lord is my shepherd', 'Psalm 23'], ['John.3', 'For God so loved the world', 'John 3'], ['Rev.21', 'All things new', 'Revelation 21']];
    out.push(`<section class="kc-section" id="bible">
  <h2>${PROGRAMS.bible.icon} The Bible: read, listen, watch</h2>
  <p>${esc(PROGRAMS.bible.text)}</p>
  <div class="kc-bible">${start.map(([at, line, ref]) => `<a class="kc-verse" href="${esc(bibleLink(c, at))}"><b>${esc(line)}</b><small>${esc(ref)}</small></a>`).join('')}</div>
  <div class="kc-actions"><a class="kc-btn primary" href="${esc(bibleLink(c))}">📖 Open the Bible</a><a class="kc-btn" href="${esc(bibleLink(c, 'listen'))}">🎧 Audio Bible</a><a class="kc-btn" href="${esc(bibleLink(c, 'watch'))}">🎬 Watch</a></div>
</section>`);
  }

  // Learn: music academy, band & choir, courses
  if (p.academy || p.band || p.courses) {
    const courses = ACADEMY_COURSES.filter((x) => c.academy.includes(x.id) && (x.id === 'worship-team' ? p.courses : p.academy));
    out.push(`<section class="kc-section" id="learn">
  <h2>${PROGRAMS.academy.icon} Learn and grow</h2>
  <p>Free lessons for everyone at ${name}, taught by the Knight Lyfe AI teachers (AI characters). Practice at home on a computer, tablet or keyboard.</p>
  ${courses.length ? `<div class="kc-courses">${courses.map((x) => {
    const t = teacherById(x.teacher);
    return `<a class="kc-course" href="${esc(appLink(c, `lessons=${x.id}`, app))}"><div class="kc-face">${teacherFaceSvg(t)}</div><b>${x.icon} ${esc(x.name)}</b><small>with ${esc(t.name)}</small></a>`;
  }).join('')}</div>` : ''}
  <div class="kc-actions">
    ${p.band ? `<a class="kc-btn" href="${esc(appLink(c, 'band', app))}">${PROGRAMS.band.icon} ${PROGRAMS.band.label}</a>` : ''}
    ${p.academy ? `<a class="kc-btn" href="${esc(appLink(c, 'lessons', app))}">🎓 All lessons</a>` : ''}
  </div>
  ${p.band ? `<p class="kc-small">${esc(PROGRAMS.band.text)}</p>` : ''}
</section>`);
  }

  if (p.kids) {
    out.push(`<section class="kc-section" id="kids">
  <h2>${PROGRAMS.kids.icon} Kids</h2>
  <p>${esc(PROGRAMS.kids.text)}</p>
  <div class="kc-actions"><a class="kc-btn" href="${esc(appLink(c, 'lessons=piano', app))}">🎹 Kids' piano</a><a class="kc-btn" href="${esc(appLink(c, 'lessons=voice', app))}">🎤 Sing with Melody Grace</a></div>
</section>`);
  }

  // About
  if (c.about || c.leader.name) {
    out.push(`<section class="kc-section" id="about">
  <h2>About us</h2>
  <div class="kc-about">
    ${c.leader.name ? `<div class="kc-leader">${c.leader.photo && safeUrl(c.leader.photo) ? `<img src="${esc(safeUrl(c.leader.photo))}" alt="" />` : ''}<b>${esc(c.leader.name)}</b><small>${esc(c.leader.title)}</small></div>` : ''}
    <div>${esc(c.about).split(/\n{2,}/).map((x) => `<p>${x.replace(/\n/g, '<br>')}</p>`).join('')}</div>
  </div>
</section>`);
  }

  // Events
  if (c.events.length) {
    out.push(`<section class="kc-section" id="events">
  <h2>📅 Coming up</h2>
  <div class="kc-events">${c.events.map((e) => `<div class="kc-event"><small>${esc(e.date)}</small><b>${esc(e.title)}</b>${e.text ? `<p>${esc(e.text)}</p>` : ''}</div>`).join('')}</div>
</section>`);
  }

  // Prayer and contact
  const contact = [link(L.prayer, '🙏 Send a prayer request', 'kc-btn'), link(L.email, '✉ Email us', 'kc-btn'), L.phone ? `<a class="kc-btn" href="tel:${esc(L.phone.replace(/[^\d+]/g, ''))}">📞 ${esc(L.phone)}</a>` : '', link(L.website, '🌐 Our website', 'kc-btn')].filter(Boolean);
  if (contact.length) out.push(`<section class="kc-section" id="contact"><h2>We'd love to hear from you</h2><div class="kc-actions">${contact.join('')}</div></section>`);

  // Giving
  if (L.giving) {
    out.push(`<section class="kc-section kc-give" id="give">
  <h2>💝 Give</h2>
  <p>Thank you for supporting the ministry of ${name}. Your giving helps us reach more people with the Gospel.</p>
  <div class="kc-actions">${link(L.giving, 'Give online', 'kc-btn primary')}</div>
</section>`);
  }

  // The church network (on the flagship's page)
  if (flagship) {
    const partners = network.filter((x) => !x.flagship);
    out.push(`<section class="kc-section kc-network" id="network">
  <h2>🤝 The ${name} church network</h2>
  <p>Small church, big reach: any church can have this platform for free, with its own name, colors, online services, music academy, band and choir rehearsal, and courses.</p>
  ${partners.length ? `<div class="kc-partners">${partners.map((x) => `<a class="kc-partner" href="${esc(`${home}?c=${encodeURIComponent(x.id)}`)}"><b>${esc(x.name)}</b><small>${esc([x.city, x.tagline].filter(Boolean).join(' · '))}</small></a>`).join('')}</div>` : ''}
  <div class="kc-actions"><a class="kc-btn primary" href="setup.html">✨ Start your church's free platform</a></div>
</section>`);
  }

  // Footer
  const social = SOCIAL.map(([k, label]) => link(L[k], label)).filter(Boolean).join('');
  out.push(`<footer class="kc-foot">
  ${social ? `<div class="kc-social">${social}</div>` : ''}
  <div>© ${name}</div>
  ${!flagship && c.poweredBy ? `<div class="kc-powered">Powered by <a href="${esc(`${home}?c=${FLAGSHIP_ID}`)}">BAC Ministries</a> · <a href="setup.html">Get a free church platform</a></div>` : ''}
</footer>`);

  return out.join('\n');
}

/** The church's colors as CSS variables for the page. */
export function themeCss(raw) {
  const c = normalizeChurch(raw);
  return `:root { --kc-color: ${c.color}; --kc-accent: ${c.accent}; }`;
}
