// The church's Bible (church/bible.html): read in many versions, listen to the
// dramatized audio Bible, and watch the cinematic version. Produced audio and
// video come from the church's media server (the AI Studio on kl-oracle makes
// them); until a chapter is produced, it's read aloud with this device's voices,
// still as a dramatized cast.
//
// Address: bible.html?c=<church>#John.3 (or #John.3.16, #listen, #watch)

import { loadChurch } from './church-load.js';
import { themeCss } from './render.js';
import { safeUrl } from './profile.js';
import { makeCatalog, parseReference, formatReference, versionFor, chapterVerses, textPath, mediaPath, stepChapter, DEFAULT_VERSION } from './bible.js';
import { CAST, draftScript, transferScript, repairScript, checkScript, draftScenes, premiumShotList, pickBrowserVoices, VISUAL_STYLE } from './drama.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // private window
    }
  },
};

const S = {
  catalog: null,
  church: null,
  media: '',
  book: 'Gen',
  chapter: 1,
  version: store.get('kb.version', DEFAULT_VERSION),
  compare: '',
  verses: [],
  produced: null, // the chapter's media json, when produced
  lines: [],
  playing: false,
  lineIdx: 0,
  theater: false,
  cache: new Map(),
};

async function getJson(url) {
  const r = await fetch(url, { cache: 'force-cache' });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function bookData(version, book) {
  const key = `${version}/${book}`;
  if (!S.cache.has(key)) S.cache.set(key, getJson(textPath(version, book)));
  return S.cache.get(key);
}

// ---- Reading -------------------------------------------------------------------------

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

function versionName(id) {
  return S.catalog.version(id)?.name || id;
}

async function openChapter(book, chapter, { verse = null, keepPlaying = false } = {}) {
  const b = S.catalog.book(book);
  if (!b) return;
  stopListening(keepPlaying);
  S.book = b.id;
  S.chapter = Math.max(1, Math.min(b.chapters, chapter));
  const v = versionFor(b, S.version);
  $('where').textContent = `${b.name} ${S.chapter}`;
  document.title = `${b.name} ${S.chapter} · ${S.church?.name || 'Bible'}`;
  history.replaceState(null, '', `${location.pathname}${location.search}#${b.id}.${S.chapter}${verse ? `.${verse}` : ''}`);
  store.set('kb.pos', { book: b.id, chapter: S.chapter });
  const shelf = S.catalog.shelves.find((s) => s.id === b.shelf);
  const note = $('shelfNote');
  note.hidden = b.shelf === 'ot' || b.shelf === 'nt';
  note.textContent = note.hidden ? '' : `${shelf.name}: ${shelf.about}`;
  if (v !== S.version) {
    note.hidden = false;
    note.textContent += `${note.textContent ? ' ' : ''}Shown in ${versionName(v)} (the only version here with this book).`;
  }

  const data = await bookData(v, b.id);
  S.verses = chapterVerses(data, S.chapter);
  S.readVersion = v;
  let cmp = null;
  if (S.compare && S.compare !== v && b.versions.includes(S.compare)) cmp = chapterVerses(await bookData(S.compare, b.id), S.chapter);
  renderReader(b, cmp);
  $('credit').textContent = `${versionName(v)}: ${S.catalog.version(v)?.about || ''} · Public domain${cmp ? ` · ${versionName(S.compare)}: public domain` : ''}`;
  await loadProduced();
  S.lines = await scriptFor();
  if (verse) {
    const target = document.querySelector(`[data-v="${verse}"]`);
    target?.classList.add('bb-hit');
    target?.scrollIntoView({ block: 'center' });
  } else if (!keepPlaying) window.scrollTo({ top: 0 });
  if (keepPlaying) startListening();
}

function renderReader(b, cmp) {
  const r = $('reader');
  r.innerHTML = '';
  r.classList.toggle('bb-two', !!cmp);
  r.append(el('h1', { textContent: `${b.name} ${S.chapter}` }));
  if (cmp) r.append(el('div', { className: 'bb-cols bb-colhead' }, el('b', { textContent: versionName(S.readVersion) }), el('b', { textContent: versionName(S.compare) })));
  const byN = new Map((cmp || []).map((v) => [v.n, v.text]));
  for (const v of S.verses) {
    const p = el('p', { className: 'bb-v' }, el('sup', { textContent: v.n }), document.createTextNode(` ${v.text}`));
    p.dataset.v = v.n;
    if (cmp) r.append(el('div', { className: 'bb-cols' }, p, el('p', { className: 'bb-v bb-alt' }, el('sup', { textContent: v.n }), document.createTextNode(` ${byN.get(v.n) || ''}`))));
    else r.append(p);
  }
  if (!S.verses.length) r.append(el('p', { textContent: 'This chapter isn\'t in this version.' }));
}

// ---- The script (who reads what) -----------------------------------------------------------

const scriptKey = () => `kb.script.${S.readVersion}.${S.book}.${S.chapter}`;

async function scriptFor() {
  const edited = store.get(scriptKey(), null);
  if (edited && !checkScript(S.verses, edited).length) return edited;
  if (S.produced?.lines?.length) return repairScript(S.verses, S.produced.lines);
  let lines = draftScript(S.verses);
  const b = S.catalog.book(S.book);
  if (!/[“”]/.test(S.verses.map((v) => v.text).join(' ')) && b.versions.includes('bsb') && S.readVersion !== 'bsb') {
    try {
      lines = transferScript(S.verses, draftScript(chapterVerses(await bookData('bsb', b.id), S.chapter)));
    } catch {
      // keep the draft
    }
  }
  return repairScript(S.verses, lines);
}

// ---- Produced audio and video ----------------------------------------------------------

function mediaBase() {
  const p = new URLSearchParams(location.search).get('media');
  if (p && safeUrl(p)) return safeUrl(p);
  if (S.church?.links?.bibleMedia) return safeUrl(S.church.links.bibleMedia);
  if (location.port === '8443') return `${location.origin}/bible-media`; // served from kl-oracle
  return '';
}

async function loadProduced() {
  S.produced = null;
  $('audioNote').textContent = '';
  const base = mediaPath(S.media, S.readVersion, S.book, S.chapter);
  if (!base) return;
  try {
    const j = await getJson(`${base}.json`);
    if (j?.format !== 'knight-bible-chapter') return;
    const dir = base.slice(0, base.lastIndexOf('/') + 1);
    const abs = (f) => (f ? new URL(f, new URL(dir, location.href)).href : '');
    S.produced = { ...j, audioUrl: abs(j.audio), videoUrl: abs(j.video), scenes: (j.scenes || []).map((s) => ({ ...s, imageUrl: abs(s.image), clipUrl: abs(s.clip) })) };
    $('audioNote').textContent = `🎧 Produced audio${j.video ? ' and 🎬 video' : ''}`;
  } catch {
    // not produced yet: read aloud with the device's voices
  }
}

// ---- Listening -------------------------------------------------------------------------

let voices = null;
function deviceVoices() {
  if (typeof speechSynthesis === 'undefined') return null;
  if (!voices || !voices.narrator) voices = pickBrowserVoices(speechSynthesis.getVoices());
  return voices;
}

function highlight(verse, line) {
  document.querySelectorAll('.bb-now').forEach((e) => e.classList.remove('bb-now'));
  const p = document.querySelector(`.bb-v[data-v="${verse}"]`);
  if (p) {
    p.classList.add('bb-now');
    if (!S.theater) p.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  if (line) showCaption(line);
}

function setPlaying(on) {
  S.playing = on;
  $('listen').textContent = on ? '■ Stop' : '▶ Listen';
  $('thPlay').textContent = on ? '❚❚' : '▶';
}

function startListening() {
  if (!S.verses.length) return;
  setPlaying(true);
  if (S.produced?.audioUrl) return playProduced();
  if (typeof speechSynthesis === 'undefined') {
    setPlaying(false);
    $('audioNote').textContent = 'This browser can\'t read aloud.';
    return;
  }
  S.lineIdx = 0;
  speakNext();
}

/** Long lines are split at sentences (some browsers stop long speech early). */
function chunks(text) {
  const parts = text.match(/[^.!?;:]+[.!?;:]*\s*/g) || [text];
  const out = [];
  for (const p of parts) {
    if (out.length && (out[out.length - 1] + p).length < 180) out[out.length - 1] += p;
    else out.push(p);
  }
  return out.filter((x) => x.trim());
}

function speakNext() {
  if (!S.playing) return;
  const line = S.lines[S.lineIdx];
  if (!line) return chapterDone();
  highlight(line.verse, line);
  const v = deviceVoices();
  const one = $('cast').value === 'narrator';
  const role = one ? 'narrator' : CAST[line.speaker]?.browser || 'narrator';
  const parts = chunks(line.text);
  let i = 0;
  const say = () => {
    if (!S.playing) return;
    if (i >= parts.length) {
      S.lineIdx++;
      return speakNext();
    }
    const u = new SpeechSynthesisUtterance(parts[i++]);
    if (v?.[role]) u.voice = v[role];
    u.rate = +$('speed').value * (role === 'deep' ? 0.92 : 1);
    u.pitch = one ? 1 : { deep: 0.7, woman: 1.1, man: line.speaker === 'satan' ? 0.75 : 0.95, narrator: 1 }[role] ?? 1;
    u.onend = say;
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') say();
    };
    speechSynthesis.speak(u);
  };
  say();
}

function playProduced() {
  const a = $('audio');
  if (a.src !== S.produced.audioUrl) a.src = S.produced.audioUrl;
  a.playbackRate = +$('speed').value;
  a.play().catch(() => setPlaying(false));
}

$('audio').addEventListener('timeupdate', () => {
  const t = $('audio').currentTime;
  const line = (S.produced?.lines || []).find((l) => t >= l.start && t < l.end);
  if (line && line !== S.currentLine) {
    S.currentLine = line;
    highlight(line.verse, line);
  }
});
$('audio').addEventListener('ended', () => chapterDone());

function chapterDone() {
  setPlaying(false);
  if (!$('keepGoing').checked) return;
  const next = stepChapter(S.catalog, S.book, S.chapter, 1);
  if (next) openChapter(next.book, next.chapter, { keepPlaying: true });
}

function stopListening(keepState = false) {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  $('audio').pause();
  if (!keepState) setPlaying(false);
  else S.playing = false;
  document.querySelectorAll('.bb-now').forEach((e) => e.classList.remove('bb-now'));
}

// ---- Watching (the cinematic version) ---------------------------------------------------

function showCaption(line) {
  if (!S.theater) return;
  const b = S.catalog.book(S.book);
  $('capRef').textContent = `${b.name} ${S.chapter}:${line.verse}`;
  const who = line.character || (line.speaker !== 'narrator' ? CAST[line.speaker]?.name : '');
  $('capWho').textContent = who || '';
  $('capText').textContent = line.text.trim();
  const scenes = S.produced?.scenes?.length ? S.produced.scenes : draftScenes(S.verses);
  const idx = Math.max(0, scenes.findIndex((s) => line.verse >= s.from && line.verse <= s.to));
  if (idx !== S.sceneIdx) {
    S.sceneIdx = idx;
    const scene = $('scene');
    const img = scenes[idx]?.imageUrl;
    scene.style.backgroundImage = img ? `url("${img.replace(/"/g, '%22')}")` : '';
    scene.classList.toggle('bb-noimg', !img);
    scene.dataset.move = scenes[idx]?.camera || 'slow push in';
    scene.style.animation = 'none';
    void scene.offsetWidth;
    scene.style.animation = '';
  }
}

function openTheater() {
  S.theater = true;
  S.sceneIdx = -1;
  const t = $('theater');
  t.hidden = false;
  t.requestFullscreen?.().catch(() => {});
  const movie = $('movie');
  if (S.produced?.videoUrl) {
    stopListening();
    movie.hidden = false;
    $('caption').hidden = true;
    movie.src = S.produced.videoUrl;
    movie.play().catch(() => {});
    return;
  }
  movie.hidden = true;
  $('caption').hidden = false;
  showCaption(S.lines[S.lineIdx] || S.lines[0] || { verse: 1, speaker: 'narrator', text: '' });
  if (!S.playing) startListening();
}

function closeTheater() {
  S.theater = false;
  $('theater').hidden = true;
  $('movie').pause();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// ---- Production (for the media team) ------------------------------------------------------

function renderProduction() {
  const b = S.catalog.book(S.book);
  $('prodWhere').textContent = `${b.name} ${S.chapter} (${versionName(S.readVersion)})`;
  $('prodCmd').textContent = `kl-bible make ${S.readVersion} ${b.id} ${S.chapter}`;
  const box = $('prodLines');
  box.innerHTML = '';
  S.lines.forEach((l, i) => {
    const sel = el('select', { title: 'Who reads this' }, ...Object.entries(CAST).map(([id, c]) => new Option(c.name, id)));
    sel.value = l.speaker;
    sel.onchange = () => {
      S.lines[i] = { ...l, speaker: sel.value };
      if (!['man', 'woman'].includes(sel.value)) delete S.lines[i].character;
      store.set(scriptKey(), S.lines);
      checkProduction();
    };
    box.append(el('div', { className: `bb-line bb-${l.speaker}` }, el('span', { className: 'bb-ln', textContent: l.verse }), sel, el('span', { textContent: `${l.character ? `(${l.character}) ` : ''}${l.text.trim()}` })));
  });
  const scenes = S.produced?.scenes?.length ? S.produced.scenes : draftScenes(S.verses, { book: b.name, chapter: S.chapter });
  $('prodScenes').innerHTML = '';
  scenes.forEach((s, i) => $('prodScenes').append(el('div', { className: 'bb-scene-card' }, el('b', { textContent: `Scene ${i + 1} · verses ${s.from}-${s.to} · ${s.camera}` }), el('p', { textContent: s.prompt }))));
  checkProduction();
}

function checkProduction() {
  const problems = checkScript(S.verses, S.lines);
  const cast = new Set(S.lines.map((l) => l.character || CAST[l.speaker]?.name));
  $('prodCheck').textContent = problems.length ? `⚠ ${problems.join(' ')}` : `✓ Faithful to the text · ${S.lines.length} lines · voices: ${[...cast].join(', ')}`;
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  el('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function productionFiles() {
  const b = S.catalog.book(S.book);
  const scenes = S.produced?.scenes?.length ? S.produced.scenes : draftScenes(S.verses, { book: b.name, chapter: S.chapter });
  const title = `${b.name} ${S.chapter} (${versionName(S.readVersion)})`;
  return { b, scenes, title, shots: premiumShotList(scenes, S.lines, { title }) };
}

// ---- Books picker ------------------------------------------------------------------------

function renderShelves() {
  const box = $('shelves');
  box.innerHTML = '';
  for (const shelf of S.catalog.shelves) {
    const books = S.catalog.shelf(shelf.id);
    if (!books.length) continue;
    const grid = el('div', { className: 'bb-books' });
    for (const b of books) {
      const btn = el('button', { className: 'bb-book', textContent: b.name, type: 'button' });
      btn.onclick = () => showChapters(b);
      grid.append(btn);
    }
    box.append(el('section', { className: 'bb-shelf' }, el('h3', { textContent: shelf.name }), el('p', { className: 'bb-small', textContent: shelf.about }), grid));
  }
}

function showChapters(b) {
  const box = $('chapters');
  box.innerHTML = '';
  box.hidden = false;
  $('shelves').hidden = true;
  const back = el('button', { className: 'bb-btn', textContent: '‹ Books', type: 'button' });
  back.onclick = () => {
    box.hidden = true;
    $('shelves').hidden = false;
  };
  box.append(el('div', { className: 'bb-dlg-head' }, back, el('b', { textContent: b.name })));
  const grid = el('div', { className: 'bb-chgrid' });
  for (let c = 1; c <= b.chapters; c++) {
    const btn = el('button', { className: 'bb-book', textContent: c, type: 'button' });
    btn.onclick = () => {
      $('booksDlg').close();
      openChapter(b.id, c);
    };
    grid.append(btn);
  }
  box.append(grid);
}

// ---- Start --------------------------------------------------------------------------------

function fromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [book, ch, v] = h.split('.');
  if (S.catalog.book(book)) return { book, chapter: +ch || 1, verse: +v || null };
  return null;
}

async function main() {
  const initialHash = location.hash;
  const [booksJson, versionsJson, loaded] = await Promise.all([getJson('bible/books.json'), getJson('bible/versions.json'), loadChurch()]);
  S.catalog = makeCatalog(booksJson, versionsJson);
  S.church = loaded.church;
  if (S.church) {
    document.head.append(el('style', { textContent: themeCss(S.church) }));
    $('brandName').textContent = S.church.name;
    const home = `./${location.search}`;
    $('brand').href = $('homeLink').href = home;
  }
  S.media = mediaBase();
  for (const v of S.catalog.versions.filter((x) => !x.extra)) {
    $('version').append(new Option(v.name, v.id));
    $('compare').append(new Option(`Compare: ${v.name}`, v.id));
  }
  if (!S.catalog.version(S.version) || S.catalog.version(S.version).extra) S.version = DEFAULT_VERSION;
  $('version').value = S.version;
  $('version').onchange = () => {
    S.version = $('version').value;
    store.set('kb.version', S.version);
    openChapter(S.book, S.chapter);
  };
  $('compare').onchange = () => {
    S.compare = $('compare').value;
    openChapter(S.book, S.chapter);
  };
  $('prev').onclick = () => {
    const p = stepChapter(S.catalog, S.book, S.chapter, -1);
    if (p) openChapter(p.book, p.chapter);
  };
  $('next').onclick = () => {
    const n = stepChapter(S.catalog, S.book, S.chapter, 1);
    if (n) openChapter(n.book, n.chapter);
  };
  $('goForm').onsubmit = (e) => {
    e.preventDefault();
    const ref = parseReference($('goTo').value, S.catalog);
    if (!ref) {
      $('goTo').setCustomValidity('Try a reference like John 3:16 or Psalm 23');
      $('goTo').reportValidity();
      return;
    }
    $('goTo').setCustomValidity('');
    $('goTo').value = formatReference(ref, S.catalog);
    openChapter(ref.book, ref.chapter, { verse: ref.from });
  };
  $('goTo').oninput = () => $('goTo').setCustomValidity('');
  $('pickBook').onclick = () => {
    renderShelves();
    $('chapters').hidden = true;
    $('shelves').hidden = false;
    $('booksDlg').showModal();
  };
  for (const d of document.querySelectorAll('dialog')) d.querySelector('[data-close]').onclick = () => d.close();
  $('listen').onclick = () => (S.playing ? stopListening() : startListening());
  $('cast').onchange = () => S.playing && !S.produced?.audioUrl && (stopListening(), startListening());
  $('speed').onchange = () => {
    $('audio').playbackRate = +$('speed').value;
  };
  $('watch').onclick = openTheater;
  $('thClose').onclick = closeTheater;
  $('thPlay').onclick = () => (S.playing ? stopListening() : startListening());
  $('thPrev').onclick = () => $('prev').click();
  $('thNext').onclick = () => $('next').click();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.theater) closeTheater();
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && S.theater && !$('theater').hidden && $('movie').hidden === false) closeTheater();
  });
  $('production').onclick = () => {
    renderProduction();
    $('prodDlg').showModal();
  };
  $('dlScript').onclick = () => {
    const { b } = productionFiles();
    download(`${S.readVersion}-${b.id}-${S.chapter}.script.json`, JSON.stringify({ format: 'knight-bible-script', version: S.readVersion, book: b.id, chapter: S.chapter, style: VISUAL_STYLE, lines: S.lines }, null, 1), 'application/json');
  };
  $('dlShots').onclick = () => {
    const { b, shots } = productionFiles();
    download(`${b.id}-${S.chapter}-shot-list.md`, shots.md, 'text/markdown');
  };
  $('dlShotsCsv').onclick = () => {
    const { b, shots } = productionFiles();
    download(`${b.id}-${S.chapter}-shot-list.csv`, shots.csv, 'text/csv');
  };
  $('resetScript').onclick = async () => {
    try {
      localStorage.removeItem(scriptKey());
    } catch {
      // nothing saved
    }
    S.lines = await scriptFor();
    renderProduction();
  };
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = () => (voices = null);

  const want = fromHash();
  const pos = store.get('kb.pos', null);
  const start = want || (pos && S.catalog.book(pos.book) ? pos : { book: 'Gen', chapter: 1 });
  await openChapter(start.book, start.chapter, { verse: start.verse });
  if (initialHash === '#watch') openTheater();
  if (initialHash === '#listen') $('listen').focus();
  window.addEventListener('hashchange', () => {
    const h = fromHash();
    if (h && (h.book !== S.book || h.chapter !== S.chapter)) openChapter(h.book, h.chapter, { verse: h.verse });
  });
}

main();
