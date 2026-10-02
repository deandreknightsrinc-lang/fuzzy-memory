// A church on the platform is one small file (church.json, format "knight-church"):
// its name, colors, service times, links, sermons and events, and which programs
// it offers (online church, music academy, band & choir, courses). The church's
// home page, Knight Keys and the Virtual Church all read it, so every church gets
// the same free platform under its own name. BAC Ministries is the flagship
// church; every other church's platform says "Powered by BAC Ministries".

export const CHURCH_FORMAT = 'knight-church';
export const FLAGSHIP_ID = 'bac-ministries';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** What a church can offer on its platform (shown as sections of its home page). */
export const PROGRAMS = {
  online: { label: 'Online church', icon: '⛪', text: 'Worship with us live or watch past services.' },
  academy: { label: 'Music academy', icon: '🎹', text: 'Free piano, voice, drums, guitar and bass lessons with the Knight Lyfe AI teachers.' },
  band: { label: 'Band & choir rehearsal', icon: '🎶', text: 'Rehearse the songs for Sunday with AI musicians and an AI choir filling any empty spot.' },
  courses: { label: 'Courses', icon: '🎓', text: 'Worship team training and more courses for the whole church.' },
  kids: { label: 'Kids', icon: '🧒', text: 'Kids\' church with the Knight Lyfe characters.' },
};

/** Music courses the academy can feature (ids are Knight Keys course ids). */
export const ACADEMY_COURSES = [
  { id: 'piano', name: 'Piano', icon: '🎹', teacher: 'maestro-k' },
  { id: 'voice', name: 'Voice', icon: '🎤', teacher: 'melody-grace' },
  { id: 'reading', name: 'Read music', icon: '📖', teacher: 'professor-note' },
  { id: 'drums', name: 'Drums', icon: '🥁', teacher: 'beat-knight' },
  { id: 'guitar', name: 'Guitar', icon: '🎸', teacher: 'strings-jordan' },
  { id: 'bass', name: 'Bass', icon: '🎸', teacher: 'strings-jordan' },
  { id: 'worship-team', name: 'Worship Team Training', icon: '🙌', teacher: 'producer-nova' },
];

/** A church id from its name: "Grace Chapel AME" -> "grace-chapel-ame". */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** A new church to fill in. */
export function blankChurch(name = '') {
  return {
    format: CHURCH_FORMAT,
    version: 1,
    id: slugify(name),
    name,
    tagline: '',
    about: '',
    color: '#7c3aed',
    accent: '#c9a227',
    logo: '',
    heroImage: '',
    leader: { name: '', title: 'Pastor', photo: '' },
    address: '',
    times: [{ day: 'Sunday', time: '11:00 AM', label: 'Worship service' }],
    links: { live: '', giving: '', website: '', youtube: '', facebook: '', instagram: '', tiktok: '', email: '', phone: '', prayer: '' },
    programs: { online: true, academy: true, band: true, courses: true, kids: false },
    academy: ACADEMY_COURSES.map((c) => c.id),
    sermons: [],
    events: [],
    poweredBy: true,
  };
}

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const color = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : d);

/** A church file cleaned up: known fields only, with defaults for anything missing. */
export function normalizeChurch(raw) {
  const b = blankChurch();
  const r = raw && typeof raw === 'object' ? raw : {};
  const links = {};
  for (const k of Object.keys(b.links)) links[k] = str(r.links?.[k], 500);
  const programs = {};
  for (const k of Object.keys(PROGRAMS)) programs[k] = r.programs?.[k] === undefined ? b.programs[k] : !!r.programs[k];
  const known = new Set(ACADEMY_COURSES.map((c) => c.id));
  return {
    format: CHURCH_FORMAT,
    version: 1,
    id: slugify(r.id) || slugify(r.name),
    name: str(r.name, 80),
    tagline: str(r.tagline, 140),
    about: str(r.about, 2000),
    color: color(r.color, b.color),
    accent: color(r.accent, b.accent),
    logo: str(r.logo, 500),
    heroImage: str(r.heroImage, 500),
    leader: { name: str(r.leader?.name, 80), title: str(r.leader?.title, 60) || 'Pastor', photo: str(r.leader?.photo, 500) },
    address: str(r.address, 200),
    times: (Array.isArray(r.times) ? r.times : []).slice(0, 12).map((t) => ({ day: DAYS.includes(t?.day) ? t.day : 'Sunday', time: str(t?.time, 20), label: str(t?.label, 60) })).filter((t) => t.time || t.label),
    links,
    programs,
    academy: Array.isArray(r.academy) ? r.academy.filter((id) => known.has(id)) : b.academy,
    sermons: (Array.isArray(r.sermons) ? r.sermons : []).slice(0, 50).map((s) => ({ title: str(s?.title, 120), speaker: str(s?.speaker, 80), date: str(s?.date, 20), video: str(s?.video, 500) })).filter((s) => s.title || s.video),
    events: (Array.isArray(r.events) ? r.events : []).slice(0, 50).map((e) => ({ title: str(e?.title, 120), date: str(e?.date, 40), text: str(e?.text, 500) })).filter((e) => e.title),
    poweredBy: r.poweredBy !== false,
  };
}

/** Is this a link we can safely put on a page? (web, email or phone; adds https:// when left off) */
export function safeUrl(u) {
  const s = str(u, 500);
  if (!s) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(s)) return `mailto:${s}`;
  if (/^[a-z]+:/i.test(s) || s.startsWith('//')) return ''; // javascript:, data: and the like
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/i.test(s)) return `https://${s}`;
  return '';
}

/** Problems that stop the church's platform from working (empty = ready). */
export function validateChurch(raw) {
  if (!raw || raw.format !== CHURCH_FORMAT) return ['Not a church file (church.json from the church platform setup).'];
  const c = normalizeChurch(raw);
  const errors = [];
  if (!c.name) errors.push('Add your church\'s name.');
  if (!c.id) errors.push('Your church needs a short web name (letters and numbers).');
  for (const [k, v] of Object.entries(c.links)) if (v && !safeUrl(v) && k !== 'phone') errors.push(`The ${k} link doesn't look like a web address.`);
  return errors;
}

/** Friendly suggestions to finish the church's page (things missing, not errors). */
export function setupChecklist(raw) {
  const c = normalizeChurch(raw);
  const todo = [];
  if (!c.tagline) todo.push('A tagline or welcome line');
  if (!c.about) todo.push('About your church (your mission and story)');
  if (!c.logo) todo.push('Your logo (a link to the image)');
  if (!c.times.length) todo.push('Service times');
  if (!c.address) todo.push('Where you meet (address)');
  if (!c.links.live && !c.links.youtube && !c.links.facebook) todo.push('Where you go live (YouTube or Facebook)');
  if (!c.links.giving) todo.push('Your giving link');
  if (!c.links.email && !c.links.phone) todo.push('How to reach you (email or phone)');
  if (!c.leader.name) todo.push('Your pastor or leader');
  return todo;
}

/** The church file to save or share. */
export function churchToFile(raw) {
  return JSON.stringify(normalizeChurch(raw), null, 2);
}

/**
 * The church network directory (churches/index.json): the flagship first, then
 * partner churches by name.
 */
export function networkList(index) {
  const list = (Array.isArray(index?.churches) ? index.churches : [])
    .map((x) => ({ id: slugify(x?.id), name: str(x?.name, 80), city: str(x?.city, 60), tagline: str(x?.tagline, 140), flagship: slugify(x?.id) === FLAGSHIP_ID }))
    .filter((x) => x.id && x.name);
  return list.sort((a, b) => (b.flagship - a.flagship) || a.name.localeCompare(b.name));
}

/** A YouTube/Vimeo/file link -> something to embed (youtube-nocookie for privacy). */
export function embedFor(url) {
  const s = safeUrl(url);
  if (!s) return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/.exec(s);
  if (yt) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = /vimeo\.com\/(?:video\/)?(\d+)/.exec(s);
  if (vm) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|m4v|mov)(\?|$)/i.test(s)) return { kind: 'file', src: s };
  return null;
}

/** Knight Keys, opened for this church (its name and colors) at a given place. */
export function appLink(c, where = '', base = '../knight-keys/') {
  const q = c?.id ? `?church=${encodeURIComponent(c.id)}` : '';
  return `${base}${q}${where ? `#${where}` : ''}`;
}

/** The Virtual Church's "church" block for a service, from the church file. */
export function serviceBrand(raw) {
  const c = normalizeChurch(raw);
  const social = ['youtube', 'facebook', 'instagram', 'tiktok'].map((k) => c.links[k]).filter(Boolean).join(' · ');
  return { name: c.name, tagline: c.tagline, color: c.color, logo: c.logo, giving: c.links.giving, website: c.links.website, social };
}
