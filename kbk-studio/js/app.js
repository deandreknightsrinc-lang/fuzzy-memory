// KBK Studio: pads, URL reader, stem split, converter, library.
import { Engine } from './engine.js';
import {
  peaks, slice, clipDuration, encodeWav, encodeAiff, encodeMp3, mp3Rate, decodeWav, normalize, trimSilence,
  toMono, toStereo, detectOnsets, equalStarts, autoChop, chopRanges, safeFileName, formatTime, fadeEdges,
} from './audio-utils.js';
import { normalizeAudioUrl, isMixedContent, filenameFromUrl, sniffAudio } from './url-tools.js';
import {
  parseMidi, routeNote, defaultPadNotes, velocityGain, noteName, bendSemitones, pitchRate,
  GRID_ORDER, padForKey, keyForPad, DEFAULT_BASE_NOTE,
} from './midi-map.js';
import * as store from './store.js';
import { Helper, DEFAULT_HELPER } from './helper.js';

const $ = (id) => document.getElementById(id);
const engine = new Engine();
const helper = new Helper(Helper.sameOrigin() || DEFAULT_HELPER);

const state = {
  selected: 0,
  mode: 'pads',
  padNotes: defaultPadNotes(),
  velocity: true,
  learnPad: -1,       // pad waiting for a MIDI note, -2 = learning the base note
  bend: 0,
  sustain: false,
  sustained: new Set(),
  held: new Map(),     // note -> voice
  library: [],
  reader: null,        // { clip, source }
  stemSource: null,
  converted: [],
  midiInput: 'all',
};

// ---------------------------------------------------------------- formats --
const FORMATS = [
  { id: 'wav16', label: 'WAV 16-bit', ext: 'wav' },
  { id: 'wav24', label: 'WAV 24-bit', ext: 'wav' },
  { id: 'wav32', label: 'WAV 32-bit float', ext: 'wav' },
  { id: 'aiff16', label: 'AIFF 16-bit', ext: 'aif' },
  { id: 'aiff24', label: 'AIFF 24-bit', ext: 'aif' },
  { id: 'mp3-320', label: 'MP3 320 kbps', ext: 'mp3' },
  { id: 'mp3-192', label: 'MP3 192 kbps', ext: 'mp3' },
  { id: 'mp3-128', label: 'MP3 128 kbps', ext: 'mp3' },
  { id: 'flac', label: 'FLAC (helper)', ext: 'flac', helper: true },
  { id: 'm4a', label: 'M4A / AAC (helper)', ext: 'm4a', helper: true },
  { id: 'ogg', label: 'OGG Vorbis (helper)', ext: 'ogg', helper: true },
  { id: 'opus', label: 'Opus (helper)', ext: 'opus', helper: true },
];

function fillFormatSelects() {
  for (const sel of document.querySelectorAll('.fmt-select')) {
    sel.innerHTML = '';
    for (const f of FORMATS) sel.append(new Option(f.label, f.id));
    sel.value = 'wav24';
  }
}

async function encodeAs(clip, fmtId) {
  const f = FORMATS.find((x) => x.id === fmtId) || FORMATS[1];
  let bytes;
  if (f.id.startsWith('wav')) bytes = encodeWav(clip, { bitDepth: Number(f.id.slice(3)) });
  else if (f.id.startsWith('aiff')) bytes = encodeAiff(clip, { bitDepth: Number(f.id.slice(4)) });
  else if (f.id.startsWith('mp3')) {
    if (!window.lamejs) throw new Error('The MP3 encoder did not load. Reload the page.');
    const rate = mp3Rate(clip.sampleRate);
    const c = rate === clip.sampleRate ? clip : await resampleClip(clip, rate);
    bytes = encodeMp3(c.channels.length > 2 ? toStereo(c) : c, window.lamejs, { kbps: Number(f.id.split('-')[1]) });
  } else {
    await requireHelper(`${f.label.replace(' (helper)', '')} files`);
    bytes = await helper.convert(encodeWav(clip, { bitDepth: 24 }), { format: f.id, filename: clip.name });
  }
  return { bytes, ext: f.ext };
}

async function resampleClip(clip, rate) {
  try { return await engine.renderResampled(clip, rate); } catch { return (await import('./audio-utils.js')).resample(clip, rate); }
}

function download(bytes, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const type = { wav: 'audio/wav', aif: 'audio/aiff', mp3: 'audio/mpeg', flac: 'audio/flac', m4a: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/ogg' }[ext] || 'application/octet-stream';
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---------------------------------------------------------------- UI bits --
function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  $('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3500);
}

function drawWave(canvas, clip, { start = 0, end = 1, color = '#e8b931', playhead = null, slices = null } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(10, canvas.clientWidth), h = Math.max(10, canvas.clientHeight);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  if (!clip) return;
  const cols = Math.floor(w);
  const pk = canvas._peaks && canvas._peaksFor === clip && canvas._peaks.length === cols * 2 ? canvas._peaks : peaks(clip, cols);
  canvas._peaks = pk; canvas._peaksFor = clip;
  const mid = h / 2;
  const a = Math.min(start, end) * w, b = Math.max(start, end) * w;
  for (let x = 0; x < cols; x++) {
    const inside = x >= a && x <= b;
    g.fillStyle = inside ? color : '#3a3f4d';
    const lo = pk[x * 2], hi = pk[x * 2 + 1];
    g.fillRect(x, mid - hi * mid * 0.95, 1, Math.max(1, (hi - lo) * mid * 0.95));
  }
  if (start > 0 || end < 1) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, a, h); g.fillRect(b, 0, w - b, h);
    g.fillStyle = '#f6d77a';
    g.fillRect(a, 0, 1.5, h); g.fillRect(b - 1.5, 0, 1.5, h);
  }
  if (slices) {
    g.fillStyle = 'rgba(139,92,246,0.9)';
    for (const s of slices) g.fillRect(s * w, 0, 1, h);
  }
  if (playhead != null) { g.fillStyle = '#fff'; g.fillRect(playhead * w, 0, 1.5, h); }
}

function padOptions(sel, preferEmpty = true) {
  const keep = sel.value;
  sel.innerHTML = '';
  engine.pads.forEach((p, i) => sel.append(new Option(`Pad ${i + 1}${p.name ? ` · ${p.name}` : ' · empty'}`, String(i))));
  const firstEmpty = engine.pads.findIndex((p) => !p.clip);
  sel.value = keep !== '' && keep != null && sel.querySelector(`option[value="${keep}"]`) ? keep : String(preferEmpty && firstEmpty >= 0 ? firstEmpty : state.selected);
}

function libOptions(sel, placeholder) {
  sel.innerHTML = '';
  sel.append(new Option(placeholder, ''));
  for (const e of state.library) sel.append(new Option(`${e.name} (${formatTime(clipDuration(e.clip))})`, e.id));
}

// ------------------------------------------------------------------- tabs --
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('on', s.id === `tab-${name}`));
  requestAnimationFrame(() => {
    if (name === 'pads') { renderEditor(); refreshPadCanvases(); }
    if (name === 'reader') renderReaderWave();
    if (name === 'library') renderLibrary();
    if (name === 'stems') document.querySelectorAll('#stResults canvas').forEach((c) => drawWave(c, c._clip, { color: c._color }));
  });
}

// ------------------------------------------------------------------- pads --
const padEls = [];

function buildPads() {
  const grid = $('padGrid');
  grid.innerHTML = '';
  for (const i of GRID_ORDER) {
    const el = document.createElement('div');
    el.className = 'pad';
    el.dataset.pad = i;
    el.innerHTML = `<div class="pad-top"><span class="pad-num">${i + 1}</span><span class="pad-key">${keyForPad(i)}</span></div><canvas></canvas><div class="pad-name"></div><span class="pad-note"></span>`;
    padEls[i] = el;
    grid.append(el);

    let voice = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      selectPad(i);
      // lower on the pad = softer, like a velocity-sensitive pad
      const r = el.getBoundingClientRect();
      const vel = state.velocity ? Math.round(40 + 87 * (1 - (e.clientY - r.top) / r.height) ** 0.5) : 127;
      voice = engine.trigger(i, { velocityGain: velocityGain(vel, state.velocity) });
    });
    const up = () => { if (voice) { engine.release(voice); voice = null; } };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    // drop a file or a link right onto a pad
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragover'); });
    el.addEventListener('dragleave', () => el.classList.remove('dragover'));
    el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('dragover'); selectPad(i); handleDropOnPad(e, i); });
  }
  refreshPads();
}

function refreshPads() {
  engine.pads.forEach((p, i) => {
    const el = padEls[i];
    if (!el) return;
    el.style.setProperty('--c', p.color);
    el.classList.toggle('loaded', !!p.clip);
    el.classList.toggle('sel', i === state.selected);
    el.classList.toggle('learn', state.learnPad === i);
    el.querySelector('.pad-name').textContent = p.name || 'empty';
    el.querySelector('.pad-note').textContent = noteName(state.padNotes[i]);
  });
  refreshPadCanvases();
}

function refreshPadCanvases() {
  engine.pads.forEach((p, i) => { const c = padEls[i]?.querySelector('canvas'); if (c) drawWave(c, p.clip, { start: p.start, end: p.end, color: p.color }); });
}

function flashPad(i) {
  const el = padEls[i];
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('hit'), 110);
}

engine.onTrigger = (i) => flashPad(i);

function selectPad(i) {
  state.selected = i;
  refreshPads();
  renderEditor();
}

const saveTimers = {};
function persistPad(i) {
  clearTimeout(saveTimers[i]);
  saveTimers[i] = setTimeout(() => persistNow(i), 300);
}

function persistNow(i) {
  clearTimeout(saveTimers[i]);
  delete saveTimers[i];
  return store.savePad(i, engine.pads[i]).catch(() => {});
}

// don't lose a just-made change when the tab is closed or hidden
function flushSaves() { for (const k of Object.keys(saveTimers)) persistNow(Number(k)); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSaves(); });
window.addEventListener('pagehide', flushSaves);

function setPad(i, patch) {
  engine.setPad(i, patch);
  persistPad(i);
  refreshPads();
  if (i === state.selected) renderEditor();
}

function loadOntoPad(i, clip, name) {
  engine.ensure();
  engine.loadPad(i, clip, name);
  persistPad(i);
  refreshPads();
  if (i === state.selected) renderEditor();
}

// ---- chop across the pads ----
// how: 'auto' (smart), 'hits', or a slice count. Returns null for a one-shot.
function spreadToPads(clip, how = 'auto') {
  const dur = clipDuration(clip);
  let kind = 'loop', bpm = 0, ranges;
  if (how === 'auto') ({ kind, bpm, ranges } = autoChop(clip));
  else {
    const st = how === 'hits' ? detectOnsets(clip, { max: 16 }) : equalStarts(clip, Number(how));
    ranges = st.map((a, i) => [a, i + 1 < st.length ? st[i + 1] : dur]);
  }
  if (kind === 'oneshot') return null;
  engine.ensure();
  engine.stopAll();
  state.undoKit = engine.pads.map((p) => ({ ...p }));
  const parts = chopRanges(clip, ranges, clip.name);
  const cut = $('chopCut').checked;
  for (let i = 0; i < 16; i++) {
    if (i < parts.length) {
      engine.loadPad(i, parts[i], parts[i].name);
      engine.setPad(i, { mode: 'oneshot', choke: cut ? 4 : 0, tune: 0, gain: 0.8 });
    } else engine.clearPad(i);
    persistNow(i);
  }
  $('undoChop').hidden = false;
  selectPad(0);
  return { kind, bpm, ranges, count: parts.length };
}

function chopMessage(r, name) {
  const how = r.kind === 'song' ? ` (${Math.round(r.bpm)} BPM, one bar each, picked from across the whole song)` : r.kind === 'loop' ? ' at the hits' : '';
  return `Chopped "${name}" into ${r.count} pads${how}. Play them from your keyboard or pads.`;
}

function undoChop() {
  if (!state.undoKit) return;
  engine.stopAll();
  state.undoKit.forEach((p, i) => { engine.pads[i] = p; engine.rebuild(i); persistNow(i); });
  state.undoKit = null;
  $('undoChop').hidden = true;
  refreshPads(); renderEditor();
  toast('Pads put back the way they were');
}

// Loads a clip the way the Auto-chop switch says: spread or one pad.
function placeClip(clip, i, name) {
  if ($('autoChop').checked) {
    const r = spreadToPads(clip);
    if (r) { const msg = chopMessage(r, name || clip.name); editorStatus(msg, 'ok'); toast(msg, 'ok'); return; }
  }
  loadOntoPad(i, clip, name);
  editorStatus(`Pad ${i + 1}: ${name || clip.name} (${formatTime(clipDuration(clip))})`, 'ok');
}

function renderEditor() {
  const i = state.selected;
  const p = engine.pads[i];
  $('edTitle').textContent = `Pad ${i + 1}${p.name ? ` · ${p.name}` : ''}`;
  $('edEmpty').hidden = !!p.clip;
  drawWave($('edWave'), p.clip, { start: p.start, end: p.end, color: p.color });
  $('edStart').value = p.start; $('edEnd').value = p.end;
  $('edGain').value = p.gain; $('edGainOut').textContent = `${Math.round(p.gain * 100)}%`;
  $('edTune').value = p.tune; $('edTuneOut').textContent = `${p.tune > 0 ? '+' : ''}${p.tune} st`;
  $('edPan').value = p.pan; $('edPanOut').textContent = p.pan === 0 ? 'C' : `${p.pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(p.pan) * 100)}`;
  $('edMode').value = p.mode;
  $('edChoke').value = String(p.choke);
  $('edReverse').checked = p.reverse;
  $('edNote').textContent = `${noteName(state.padNotes[i])} (${state.padNotes[i]})`;
  $('edLearn').textContent = state.learnPad === i ? 'Press a key…' : 'Learn note';
  ['edPlay', 'edDownload', 'edToLib'].forEach((id) => { $(id).disabled = !p.clip; });
  libOptions($('edFromLib'), 'From library…');
}

function editorStatus(msg, kind = '') {
  const el = $('edStatus');
  el.textContent = msg;
  el.className = `status-line ${kind}`;
}

async function handleDropOnPad(e, i) {
  const file = e.dataTransfer.files?.[0];
  if (file) return loadFileToPad(file, i);
  const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
  if (text) {
    const url = text.split('\n').find((l) => l && !l.startsWith('#'))?.trim();
    if (url) return loadUrlToPad(url, i);
  }
}

async function loadFileToPad(file, i) {
  editorStatus(`Loading ${file.name}…`);
  try {
    const clip = await decodeBytes(await file.arrayBuffer(), file.name);
    placeClip(clip, i, safeFileName(file.name));
  } catch (err) {
    editorStatus(err.message, 'err');
  }
}

async function loadUrlToPad(url, i) {
  editorStatus('Reading link…');
  try {
    const { clip } = await readUrl(url, (msg) => editorStatus(msg));
    placeClip(clip, i, clip.name);
  } catch (err) {
    editorStatus(err.message, 'err');
  }
}

function wireEditor() {
  const sel = () => state.selected;
  $('edPlay').onclick = () => { const v = engine.trigger(sel()); if (v && engine.pads[sel()].mode !== 'oneshot') setTimeout(() => engine.release(v), 1500); };
  $('edStart').oninput = (e) => setPad(sel(), { start: Number(e.target.value) });
  $('edEnd').oninput = (e) => setPad(sel(), { end: Number(e.target.value) });
  $('edGain').oninput = (e) => setPad(sel(), { gain: Number(e.target.value) });
  $('edTune').oninput = (e) => setPad(sel(), { tune: Number(e.target.value) });
  $('edPan').oninput = (e) => setPad(sel(), { pan: Number(e.target.value) });
  $('edMode').onchange = (e) => setPad(sel(), { mode: e.target.value });
  $('edChoke').onchange = (e) => setPad(sel(), { choke: Number(e.target.value) });
  $('edReverse').onchange = (e) => setPad(sel(), { reverse: e.target.checked });
  $('edUrlLoad').onclick = () => { engine.ensure(); loadUrlToPad($('edUrl').value, sel()); };
  $('edUrl').onkeydown = (e) => { if (e.key === 'Enter') $('edUrlLoad').click(); };
  $('edFile').onchange = (e) => { const f = e.target.files[0]; if (f) loadFileToPad(f, sel()); e.target.value = ''; };
  $('edFromLib').onchange = (e) => {
    const entry = state.library.find((x) => x.id === e.target.value);
    if (entry) placeClip(entry.clip, sel(), entry.name);
  };
  $('edChop').onclick = () => {
    const p = engine.pads[sel()];
    if (!p.clip) { editorStatus('Load a song or loop on this pad first.', 'err'); return; }
    const r = spreadToPads(p.clip, clipDuration(p.clip) <= 1.5 ? 'hits' : 'auto');
    if (r) { const msg = chopMessage(r, p.name || p.clip.name); editorStatus(msg, 'ok'); toast(msg, 'ok'); }
  };
  $('undoChop').onclick = undoChop;
  for (const id of ['autoChop', 'chopCut']) $(id).onchange = (e) => store.setSetting(id, e.target.checked);
  $('edClear').onclick = () => { engine.clearPad(sel()); store.savePad(sel(), engine.pads[sel()]).catch(() => {}); refreshPads(); renderEditor(); editorStatus(''); };
  $('edLearn').onclick = () => { state.learnPad = state.learnPad === sel() ? -1 : sel(); refreshPads(); renderEditor(); if (state.learnPad >= 0) toast(`Press the key or pad that should play pad ${sel() + 1}`); };
  $('edDownload').onclick = () => {
    const p = engine.pads[sel()];
    const d = clipDuration(p.clip);
    let c = slice(p.clip, Math.min(p.start, p.end) * d, Math.max(p.start, p.end) * d);
    if (p.reverse) c = { ...c, channels: c.channels.map((x) => x.slice().reverse()) };
    download(encodeWav(c, { bitDepth: 24 }), safeFileName(p.name || `pad ${sel() + 1}`, 'wav'));
  };
  $('edToLib').onclick = () => { const p = engine.pads[sel()]; addToLibrary(p.clip, p.name || `Pad ${sel() + 1}`, 'pad'); };

  const wrap = $('edWave').parentElement;
  wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('dragover'); });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('dragover'));
  wrap.addEventListener('drop', (e) => { e.preventDefault(); wrap.classList.remove('dragover'); handleDropOnPad(e, sel()); });

  document.querySelectorAll('#playMode button').forEach((b) => {
    b.onclick = () => setMode(b.dataset.mode);
  });
  const base = $('baseNote');
  for (let n = 0; n <= 112; n++) base.append(new Option(`${noteName(n)} (${n})`, String(n)));
  base.onchange = () => setBaseNote(Number(base.value));
  $('learnBase').onclick = () => { state.learnPad = state.learnPad === -2 ? -1 : -2; $('learnBase').textContent = state.learnPad === -2 ? 'Press a key…' : 'Learn from key'; };
  $('velocity').onchange = (e) => { state.velocity = e.target.checked; store.setSetting('velocity', state.velocity); };
  $('stopAll').onclick = () => engine.stopAll();
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('#playMode button').forEach((x) => x.classList.toggle('on', x.dataset.mode === mode));
  store.setSetting('mode', mode);
  const hints = {
    pads: 'Pads: 16 keys from the pad-1 note play pads 1–16. Pad controllers and drum pads usually start at C1 (36).',
    keys: `Keys: your whole keyboard plays pad ${state.selected + 1} in pitch. C3 (middle C) plays it as recorded.`,
    split: `Split: pads on the 16 keys from ${noteName(state.padNotes[0])}, pad ${state.selected + 1} in pitch on every key above.`,
  };
  $('modeHint').textContent = hints[mode];
}

function setBaseNote(n) {
  state.padNotes = defaultPadNotes(n);
  $('baseNote').value = String(n);
  store.setSetting('padNotes', state.padNotes);
  refreshPads(); renderEditor(); setMode(state.mode);
}

// ------------------------------------------------------------------- MIDI --
let midiAccess = null;

async function initMidi() {
  if (!navigator.requestMIDIAccess) {
    setMidiStatus('No MIDI in this browser', 'warn', 'This browser has no Web MIDI (Safari doesn\'t have it). Open KBK Studio in Chrome, Edge or Firefox to play the pads from your keyboard. Mouse and computer keys still work.');
    return;
  }
  if (!window.isSecureContext) {
    setMidiStatus('MIDI needs https', 'warn', 'Browsers only allow MIDI on https:// pages or on localhost. Open the studio from GitHub Pages, or from the helper at http://localhost:8765.');
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
  } catch (err) {
    setMidiStatus('MIDI blocked', 'warn', `MIDI was blocked (${err.message || err.name}). Click the lock icon next to the address, allow MIDI devices, then Rescan.`);
    return;
  }
  midiAccess.onstatechange = (e) => {
    const p = e.port;
    if (p.type === 'input') {
      if (p.state === 'connected' && p.connection !== 'open') toast(`Keyboard connected: ${p.name}`, 'ok');
      if (p.state === 'disconnected') toast(`Keyboard unplugged: ${p.name}`);
    }
    attachInputs();
  };
  attachInputs();
}

function attachInputs() {
  const inputs = midiAccess ? [...midiAccess.inputs.values()] : [];
  const sel = $('midiIn');
  sel.innerHTML = '';
  sel.append(new Option('All keyboards and pads', 'all'));
  for (const i of inputs) sel.append(new Option(i.name || 'MIDI input', i.id));
  sel.value = inputs.some((i) => i.id === state.midiInput) ? state.midiInput : 'all';
  for (const i of inputs) {
    const on = sel.value === 'all' || sel.value === i.id;
    i.onmidimessage = on ? (e) => onMidi(e.data, i) : null;
    if (on && i.connection !== 'open') i.open?.().catch(() => {});
  }
  const live = inputs.filter((i) => i.state === 'connected');
  if (!live.length) setMidiStatus('No keyboard', 'warn', 'No MIDI keyboard found. Plug it in (USB) and it shows up here by itself. If it doesn\'t, unplug and replug it, or press Rescan.');
  else {
    const name = sel.value === 'all' ? (live.length === 1 ? live[0].name : `${live.length} MIDI devices`) : (live.find((i) => i.id === sel.value)?.name || 'MIDI');
    setMidiStatus(name, 'on', `Connected: ${live.map((i) => i.name).join(', ')}. Play a key; the light flashes and the last note shows below.`);
  }
}

function setMidiStatus(label, led, msg) {
  $('midiLabel').textContent = label;
  $('midiLed').className = `led ${led}`;
  $('midiMsg').textContent = msg;
}

let ledTimer = 0;
function onMidi(data) {
  const m = parseMidi(data);
  if (m.type === 'other') return; // clock, active sensing
  const led = $('midiLed');
  led.classList.add('hit');
  clearTimeout(ledTimer);
  ledTimer = setTimeout(() => led.classList.remove('hit'), 90);

  if (m.type === 'noteon') {
    $('midiLast').textContent = `${noteName(m.note)} (${m.note}) · velocity ${m.velocity} · ch ${m.channel}`;
    if (state.learnPad === -2) { state.learnPad = -1; $('learnBase').textContent = 'Learn from key'; setBaseNote(m.note); toast(`Pad 1 is now ${noteName(m.note)}`, 'ok'); return; }
    if (state.learnPad >= 0) { learnNote(state.learnPad, m.note); return; }
    noteOn(m.note, m.velocity);
  } else if (m.type === 'noteoff') {
    noteOff(m.note);
  } else if (m.type === 'cc') {
    $('midiLast').textContent = `CC ${m.cc} = ${m.value} · ch ${m.channel}`;
    if (m.cc === 64) {
      state.sustain = m.value >= 64;
      if (!state.sustain) { for (const v of state.sustained) engine.release(v); state.sustained.clear(); }
    } else if (m.cc === 7) {
      const v = m.value / 127;
      $('master').value = v; engine.setMaster(v);
    } else if (m.cc === 120 || m.cc === 123) engine.stopAll();
  } else if (m.type === 'pitchbend') {
    state.bend = bendSemitones(m.value, 2);
    for (const v of state.held.values()) if (v?.baseRate) v.src.playbackRate.setTargetAtTime(v.baseRate * pitchRate(state.bend), engine.ctx.currentTime, 0.01);
    for (const v of state.sustained) if (v?.baseRate) v.src.playbackRate.setTargetAtTime(v.baseRate * pitchRate(state.bend), engine.ctx.currentTime, 0.01);
  }
}

function learnNote(pad, note) {
  const other = state.padNotes.indexOf(note);
  if (other >= 0 && other !== pad) state.padNotes[other] = state.padNotes[pad];
  state.padNotes[pad] = note;
  state.learnPad = -1;
  store.setSetting('padNotes', state.padNotes);
  toast(`Pad ${pad + 1} plays on ${noteName(note)}`, 'ok');
  refreshPads(); renderEditor();
}

function noteOn(note, velocity) {
  if (!engine.running) { engine.ensure(); }
  const r = routeNote(note, { mode: state.mode, padNotes: state.padNotes, selected: state.selected, bend: 0 });
  if (!r) return;
  const prev = state.held.get(note);
  if (prev) engine.release(prev);
  const chromatic = r.rate !== 1 || state.mode === 'keys' || (state.mode === 'split' && state.padNotes.indexOf(note) < 0);
  const rate = chromatic ? r.rate * pitchRate(state.bend) : r.rate;
  const voice = engine.trigger(r.pad, { velocityGain: velocityGain(velocity, state.velocity), rate, note });
  if (voice && chromatic) {
    voice.baseRate = voice.src.playbackRate.value / pitchRate(state.bend);
  }
  state.held.set(note, voice);
  if (state.mode !== 'keys' && r.pad !== state.selected && r.rate === 1 && document.querySelector('#tab-pads.on')) selectPad(r.pad);
}

function noteOff(note) {
  const v = state.held.get(note);
  state.held.delete(note);
  if (!v) return;
  if (state.sustain) state.sustained.add(v);
  else engine.release(v);
}

// computer keys
const keyVoices = new Map();
function wireKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.matches?.('input[type="url"], input[type="text"], select, textarea') || t.isContentEditable) return;
    if (e.key === ' ') { e.preventDefault(); engine.stopAll(); return; }
    const pad = padForKey(e.key);
    if (pad < 0 || !document.querySelector('#tab-pads.on')) return;
    e.preventDefault();
    selectPad(pad);
    keyVoices.set(e.key.toLowerCase(), engine.trigger(pad));
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    const v = keyVoices.get(k);
    if (v) { engine.release(v); keyVoices.delete(k); }
  });
}

// ---------------------------------------------------------------- reading --
// Turns a file's bytes into a clip: the browser's decoder first, then our own
// WAV reader, then the helper (ffmpeg) for anything the browser can't open.
async function decodeBytes(bytes, name) {
  const kind = sniffAudio(new Uint8Array(bytes, 0, Math.min(512, bytes.byteLength)));
  if (kind === 'html' || kind === 'json') throw new Error('That is a web page, not an audio file. Copy the link to the file itself (often "Download" → right-click → Copy link).');
  if (kind === 'empty') throw new Error('The file is empty.');
  const clean = safeFileName(name);
  try {
    return await engine.decode(bytes, clean);
  } catch (err) {
    if (kind === 'wav') { try { return decodeWav(bytes, clean); } catch { /* fall through */ } }
    if (helper.online) {
      const wav = await helper.convert(bytes, { format: 'wav', filename: clean });
      return decodeWav(wav, clean);
    }
    throw new Error(`This browser can't open this ${kind === 'unknown' ? '' : `${kind.toUpperCase()} `}file. Start the KBK helper to open any format.`);
  }
}

async function requireHelper(what) {
  if (helper.online) return;
  try { await helper.check(); setHelperStatus(); return; } catch (err) {
    setHelperStatus(err.message);
    throw new Error(`${what} need the KBK helper, and it isn't running. ${helper.blockedReason() || 'Start it (Helper button at the top) and try again.'}`);
  }
}

// Reads any link into a clip. log(msg) reports each step.
async function readUrl(input, log = () => {}) {
  const info = normalizeAudioUrl(input);
  if (info.note) log(info.note);
  if (info.kind === 'drm') throw new Error(info.note);
  const name = filenameFromUrl(info.url);
  let bytes = null;
  let fileName = name;

  const tryHelper = async (why) => {
    log(why);
    await requireHelper('Links like this');
    log(`KBK helper is fetching the audio${info.kind === 'page' ? ' (yt-dlp; a long video takes a moment)' : ''}…`);
    const r = await helper.fetchUrl(info.url);
    bytes = r.bytes;
    if (r.name) fileName = r.name;
  };

  if (info.kind === 'direct' || info.kind === 'unknown') {
    if (isMixedContent(location.protocol, info.url)) {
      await tryHelper('The link is http:// and this page is https://, so the browser won\'t read it directly.');
    } else {
      log('Downloading in the browser…');
      let fetched = null;
      let failure = null;
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 60000);
        const r = await fetch(info.url, { signal: ctl.signal, redirect: 'follow' });
        clearTimeout(timer);
        if (r.ok) fetched = await r.arrayBuffer();
        else failure = Object.assign(new Error(`The site answered ${r.status} ${r.statusText || ''}`.trim()), { http: true });
      } catch (err) {
        failure = err;
      }
      if (fetched) {
        const kind = sniffAudio(new Uint8Array(fetched, 0, Math.min(512, fetched.byteLength)));
        if (kind === 'html' || kind === 'json') await tryHelper('The link opened a web page instead of an audio file.');
        else bytes = fetched;
      } else if (failure.http && !helper.online) {
        throw new Error(`${failure.message}. Check the link opens in a new tab.`);
      } else {
        await tryHelper(failure.name === 'AbortError' ? 'The download timed out.'
          : failure.http ? `${failure.message}.`
            : 'The site doesn\'t let other sites read its files (CORS), so the browser can\'t load it directly.');
      }
    }
  } else {
    await tryHelper(info.note || 'This link needs the KBK helper.');
  }

  log(`Got ${(bytes.byteLength / 1048576).toFixed(1)} MB. Decoding…`);
  const clip = await decodeBytes(bytes, fileName);
  return { clip, url: info.url };
}

// ---------------------------------------------------------------- reader tab --
function readerLog(msg, kind = '') {
  const li = document.createElement('li');
  li.textContent = msg;
  if (kind) li.className = kind;
  $('rdLog').append(li);
}

async function doRead() {
  engine.ensure();
  const input = $('rdUrl').value;
  $('rdLog').innerHTML = '';
  $('rdGo').disabled = true;
  try {
    const { clip, url } = await readUrl(input, (m) => readerLog(m));
    readerLog(`Ready: ${clip.name}, ${formatTime(clipDuration(clip))}, ${clip.channels.length === 1 ? 'mono' : 'stereo'}, ${clip.sampleRate} Hz.`, 'ok');
    setReader(clip, url);
    if ($('rdAuto').checked) chopReader('auto');
  } catch (err) {
    readerLog(err.message, 'err');
  } finally {
    $('rdGo').disabled = false;
  }
}

function setReader(clip, source) {
  state.reader = { clip, source, slices: null };
  $('rdResult').hidden = false;
  $('rdName').textContent = clip.name;
  $('rdInfo').textContent = `${formatTime(clipDuration(clip))} · ${clip.channels.length === 1 ? 'mono' : 'stereo'} · ${clip.sampleRate} Hz`;
  $('rdStart').value = 0; $('rdEnd').value = 1;
  padOptions($('rdPad'));
  renderReaderWave();
}

function readerRange() {
  const d = clipDuration(state.reader.clip);
  const a = Number($('rdStart').value), b = Number($('rdEnd').value);
  return [Math.min(a, b) * d, Math.max(a, b) * d];
}

function readerSelection() {
  const [a, b] = readerRange();
  const c = fadeEdges(slice(state.reader.clip, a, b));
  const whole = a === 0 && b >= clipDuration(state.reader.clip) - 1e-6;
  c.name = whole ? state.reader.clip.name : `${state.reader.clip.name} ${formatTime(a)}`;
  return c;
}

function chopReader(how) {
  const sel = readerSelection();
  const r = spreadToPads(sel, how);
  if (!r) {
    const i = Number($('rdPad').value);
    loadOntoPad(i, sel);
    toast(`That's a one-shot, so it went on pad ${i + 1}`, 'ok');
    return;
  }
  const [a] = readerRange();
  const d = clipDuration(state.reader.clip);
  state.reader.slices = r.ranges.map(([s]) => (a + s) / d);
  renderReaderWave();
  padOptions($('rdPad'));
  const msg = chopMessage(r, state.reader.clip.name);
  readerLog(msg, 'ok');
  toast(msg, 'ok');
}

function renderReaderWave(playhead = null) {
  const r = state.reader;
  if (!r) return;
  const [a, b] = readerRange();
  $('rdStartOut').textContent = formatTime(a);
  $('rdEndOut').textContent = formatTime(b);
  const d = clipDuration(r.clip);
  drawWave($('rdWave'), r.clip, { start: Number($('rdStart').value), end: Number($('rdEnd').value), playhead: playhead == null ? null : playhead / d, slices: r.slices });
}

function animatePreview(redraw) {
  const tick = () => {
    const pos = engine.previewPosition();
    if (pos == null) { redraw(null); return; }
    redraw(pos);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function wireReader() {
  $('rdGo').onclick = doRead;
  $('rdUrl').onkeydown = (e) => { if (e.key === 'Enter') doRead(); };
  $('rdStart').oninput = () => renderReaderWave();
  $('rdEnd').oninput = () => renderReaderWave();
  $('rdPlay').onclick = () => {
    const [a, b] = readerRange();
    engine.playClip(state.reader.clip, { start: a, end: b });
    animatePreview(renderReaderWave);
  };
  $('rdStop').onclick = () => engine.stopPreview();
  $('rdToPad').onclick = () => {
    const i = Number($('rdPad').value);
    loadOntoPad(i, readerSelection());
    toast(`Put on pad ${i + 1}`, 'ok');
    padOptions($('rdPad'));
  };
  $('rdChop').onclick = () => chopReader($('rdChopN').value);
  $('rdAuto').onchange = (e) => store.setSetting('rdAuto', e.target.checked);
  $('rdToLib').onclick = () => addToLibrary(readerSelection(), null, 'url');
  $('rdToStems').onclick = () => { setStemSource(readerSelection()); showTab('stems'); };
  $('rdDownload').onclick = async () => {
    const btn = $('rdDownload');
    btn.disabled = true;
    try {
      const c = readerSelection();
      const { bytes, ext } = await encodeAs(c, $('rdFmt').value);
      download(bytes, safeFileName(c.name, ext));
    } catch (err) { toast(err.message, 'err'); } finally { btn.disabled = false; }
  };
}

// ------------------------------------------------------------------ stems --
function setStemSource(clip) {
  state.stemSource = clip;
  $('stSource').textContent = `Song: ${clip.name} · ${formatTime(clipDuration(clip))}`;
}

const STEM_COLORS = { vocals: '#f472b6', drums: '#e8b931', bass: '#8b5cf6', other: '#38bdf8', instrumental: '#38bdf8', guitar: '#fb923c', piano: '#a3e635' };

async function doStems() {
  const src = state.stemSource;
  if (!src) { toast('Pick a song first.', 'err'); return; }
  engine.ensure();
  const eng = $('stEngine').value;
  const two = $('stCount').value === '2';
  const prog = $('stProgress');
  const bar = prog.querySelector('i'), label = prog.querySelector('span');
  const setP = (p, text) => { bar.style.width = `${Math.round(p * 100)}%`; label.textContent = text; };
  prog.hidden = false;
  $('stGo').disabled = true;
  $('stResults').innerHTML = '';
  const base = src.name;
  try {
    let stems;
    if (eng === 'quick') {
      setP(0, 'Splitting in the browser…');
      const st = src.channels.length > 1 ? src : toStereo(src);
      stems = await new Promise((resolve, reject) => {
        const w = new Worker(new URL('./stems-worker.js', import.meta.url), { type: 'module' });
        w.onmessage = (e) => {
          if (e.data.progress != null) setP(e.data.progress, `Splitting… ${Math.round(e.data.progress * 100)}%`);
          if (e.data.error) { w.terminate(); reject(new Error(e.data.error)); }
          if (e.data.done) { w.terminate(); resolve(e.data.stems); }
        };
        w.onerror = (e) => { w.terminate(); reject(new Error(e.message || 'Stem split failed')); };
        w.postMessage({ left: st.channels[0].slice(), right: st.channels[1].slice(), sampleRate: st.sampleRate, twoStems: two });
      });
      stems = Object.fromEntries(Object.entries(stems).map(([k, chs]) => [k, { name: `${base} - ${k}`, sampleRate: src.sampleRate, channels: chs }]));
    } else {
      await requireHelper('Pro stems');
      setP(0.05, 'Sending to the helper…');
      let t = 0.05;
      const pulse = setInterval(() => { t = Math.min(0.92, t + 0.004); setP(t, 'Demucs is splitting on the helper (a few minutes on CPU)…'); }, 1000);
      try {
        const urls = await helper.stems(encodeWav(src, { bitDepth: 24 }), { model: eng, twoStems: two, filename: safeFileName(base, 'wav') });
        stems = {};
        for (const [k, u] of Object.entries(urls)) {
          setP(0.95, `Loading ${k}…`);
          const name = k === 'no_vocals' ? 'instrumental' : k;
          stems[name] = decodeWav(await helper.getFile(u), `${base} - ${name}`);
        }
      } finally { clearInterval(pulse); }
    }
    setP(1, 'Done');
    renderStems(stems);
  } catch (err) {
    setP(0, err.message);
    toast(err.message, 'err');
  } finally {
    $('stGo').disabled = false;
  }
}

function renderStems(stems) {
  const list = $('stResults');
  list.innerHTML = '';
  for (const [k, clip] of Object.entries(stems)) {
    const row = document.createElement('div');
    row.className = `row stem-${k}`;
    row.innerHTML = `<div class="name">${k[0].toUpperCase() + k.slice(1)}<small>${formatTime(clipDuration(clip))}</small></div><canvas></canvas>
      <div class="actions"><button data-a="play">▶</button><button data-a="stop">■</button><select data-a="pad"></select><button data-a="topad">To pad</button><button data-a="lib">Library</button><select data-a="fmt" class="fmt-select"></select><button data-a="dl" class="primary">Download</button></div>`;
    list.append(row);
    const canvas = row.querySelector('canvas');
    canvas._clip = clip; canvas._color = STEM_COLORS[k] || '#e8b931';
    requestAnimationFrame(() => drawWave(canvas, clip, { color: canvas._color }));
    const padSel = row.querySelector('[data-a="pad"]');
    padOptions(padSel);
    const fmt = row.querySelector('[data-a="fmt"]');
    for (const f of FORMATS) fmt.append(new Option(f.label, f.id));
    fmt.value = 'wav24';
    row.querySelector('[data-a="play"]').onclick = () => {
      engine.playClip(clip);
      animatePreview((pos) => drawWave(canvas, clip, { color: canvas._color, playhead: pos == null ? null : pos / clipDuration(clip) }));
    };
    row.querySelector('[data-a="stop"]').onclick = () => engine.stopPreview();
    row.querySelector('[data-a="topad"]').onclick = () => { const i = Number(padSel.value); loadOntoPad(i, clip); toast(`${k} on pad ${i + 1}`, 'ok'); padOptions(padSel); };
    row.querySelector('[data-a="lib"]').onclick = () => addToLibrary(clip, clip.name, 'stem');
    row.querySelector('[data-a="dl"]').onclick = async (e) => {
      e.target.disabled = true;
      try { const { bytes, ext } = await encodeAs(clip, fmt.value); download(bytes, safeFileName(clip.name, ext)); } catch (err) { toast(err.message, 'err'); } finally { e.target.disabled = false; }
    };
  }
}

function wireStems() {
  $('stFile').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) await stemFromFile(f);
  };
  $('stFromLib').onchange = (e) => { const entry = state.library.find((x) => x.id === e.target.value); if (entry) setStemSource(entry.clip); };
  $('stGo').onclick = doStems;
  dropZone($('stDrop'), (files) => files[0] && stemFromFile(files[0]));
}

async function stemFromFile(f) {
  $('stSource').textContent = `Loading ${f.name}…`;
  try { setStemSource(await decodeBytes(await f.arrayBuffer(), f.name)); } catch (err) { $('stSource').textContent = err.message; }
}

function dropZone(el, onFiles) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragover'); });
  el.addEventListener('dragleave', () => el.classList.remove('dragover'));
  el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('dragover'); onFiles([...e.dataTransfer.files]); });
}

// -------------------------------------------------------------- converter --
function wireConverter() {
  const add = (files) => {
    for (const f of files) {
      const item = { file: f, state: 'ready', out: null };
      state.converted.push(item);
    }
    renderConvertList();
  };
  $('cvFiles').onchange = (e) => { add([...e.target.files]); e.target.value = ''; };
  dropZone($('cvDrop'), add);
  $('cvGo').onclick = convertAll;
  $('cvAll').onclick = () => state.converted.filter((x) => x.out).forEach((x, k) => setTimeout(() => download(x.out.bytes, x.out.name), k * 400));
}

function renderConvertList() {
  const list = $('cvList');
  list.innerHTML = '';
  state.converted.forEach((item, k) => {
    const row = document.createElement('div');
    row.className = 'row';
    const cls = item.state.startsWith('Error') ? 'err' : item.out ? 'ok' : '';
    row.innerHTML = `<div class="name"></div><div class="state ${cls}"></div><div class="actions"></div>`;
    row.querySelector('.name').textContent = item.file.name;
    row.querySelector('.name').append(Object.assign(document.createElement('small'), { textContent: `${(item.file.size / 1048576).toFixed(1)} MB` }));
    row.querySelector('.state').textContent = item.out ? `${item.out.name} · ${(item.out.bytes.byteLength / 1048576).toFixed(1)} MB` : item.state;
    const acts = row.querySelector('.actions');
    if (item.out) {
      const dl = Object.assign(document.createElement('button'), { className: 'primary', textContent: 'Download' });
      dl.onclick = () => download(item.out.bytes, item.out.name);
      const lib = Object.assign(document.createElement('button'), { textContent: 'Library' });
      lib.onclick = () => item.clip && addToLibrary(item.clip, item.clip.name, 'convert');
      acts.append(dl, lib);
    }
    const rm = Object.assign(document.createElement('button'), { className: 'ghost', textContent: '✕', title: 'Remove' });
    rm.onclick = () => { state.converted.splice(k, 1); renderConvertList(); };
    acts.append(rm);
    list.append(row);
  });
  $('cvAll').disabled = !state.converted.some((x) => x.out);
}

async function convertAll() {
  engine.ensure();
  const fmt = $('cvFmt').value;
  const rate = Number($('cvRate').value) || 0;
  const ch = Number($('cvCh').value) || 0;
  $('cvGo').disabled = true;
  for (const item of state.converted) {
    if (item.out) continue;
    try {
      item.state = 'Reading…'; renderConvertList();
      let clip = await decodeBytes(await item.file.arrayBuffer(), item.file.name);
      if (ch === 1) clip = toMono(clip);
      if (ch === 2) clip = toStereo(clip);
      if (rate && rate !== clip.sampleRate) { item.state = 'Resampling…'; renderConvertList(); clip = await resampleClip(clip, rate); }
      if ($('cvTrim').checked) clip = trimSilence(clip);
      if ($('cvNorm').checked) clip = normalize(clip, -1);
      clip.name = safeFileName(item.file.name);
      item.state = 'Encoding…'; renderConvertList();
      const { bytes, ext } = await encodeAs(clip, fmt);
      item.clip = clip;
      item.out = { bytes, name: safeFileName(item.file.name, ext) };
      item.state = 'Done';
    } catch (err) {
      item.state = `Error: ${err.message}`;
    }
    renderConvertList();
  }
  $('cvGo').disabled = false;
}

// ---------------------------------------------------------------- library --
async function addToLibrary(clip, name, source) {
  if (!clip) return;
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name || clip.name, clip, source, added: Date.now() };
  state.library.unshift(entry);
  try { await store.saveClip(entry); } catch (err) { toast(`Saved for this session only (${err.message})`, 'err'); }
  toast(`Saved "${entry.name}" to the library`, 'ok');
  refreshLibraryViews();
}

function refreshLibraryViews() {
  $('libCount').textContent = state.library.length;
  libOptions($('stFromLib'), '…or a song from the library');
  if (document.querySelector('#tab-library.on')) renderLibrary();
  if (document.querySelector('#tab-pads.on')) renderEditor();
}

function renderLibrary() {
  const list = $('libList');
  list.innerHTML = '';
  $('libEmpty').hidden = state.library.length > 0;
  for (const e of state.library) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div class="name"></div><canvas></canvas><div class="actions"><button data-a="play">▶</button><button data-a="stop">■</button><select data-a="pad"></select><button data-a="topad">To pad</button><button data-a="chop">Chop to pads</button><button data-a="open">Open in reader</button><select data-a="fmt" class="fmt-select"></select><button data-a="dl" class="primary">Download</button><button data-a="del" class="ghost danger" title="Delete">✕</button></div>`;
    row.querySelector('.name').textContent = e.name;
    row.querySelector('.name').append(Object.assign(document.createElement('small'), { textContent: `${formatTime(clipDuration(e.clip))} · ${e.source || ''}` }));
    list.append(row);
    const canvas = row.querySelector('canvas');
    requestAnimationFrame(() => drawWave(canvas, e.clip));
    const padSel = row.querySelector('[data-a="pad"]');
    padOptions(padSel);
    const fmt = row.querySelector('[data-a="fmt"]');
    for (const f of FORMATS) fmt.append(new Option(f.label, f.id));
    fmt.value = 'wav24';
    row.querySelector('[data-a="play"]').onclick = () => { engine.playClip(e.clip); animatePreview((pos) => drawWave(canvas, e.clip, { playhead: pos == null ? null : pos / clipDuration(e.clip) })); };
    row.querySelector('[data-a="stop"]').onclick = () => engine.stopPreview();
    row.querySelector('[data-a="topad"]').onclick = () => { const i = Number(padSel.value); loadOntoPad(i, e.clip, e.name); toast(`On pad ${i + 1}`, 'ok'); padOptions(padSel); };
    row.querySelector('[data-a="chop"]').onclick = () => {
      const r = spreadToPads(e.clip, clipDuration(e.clip) <= 1.5 ? 'hits' : 'auto');
      if (r) { toast(chopMessage(r, e.name), 'ok'); showTab('pads'); } else toast('That one is a one-shot. Use "To pad".');
    };
    row.querySelector('[data-a="open"]').onclick = () => { setReader(e.clip, 'library'); showTab('reader'); };
    row.querySelector('[data-a="dl"]').onclick = async (ev) => {
      ev.target.disabled = true;
      try { const { bytes, ext } = await encodeAs(e.clip, fmt.value); download(bytes, safeFileName(e.name, ext)); } catch (err) { toast(err.message, 'err'); } finally { ev.target.disabled = false; }
    };
    row.querySelector('[data-a="del"]').onclick = async () => {
      state.library = state.library.filter((x) => x !== e);
      await store.deleteClip(e.id).catch(() => {});
      refreshLibraryViews(); renderLibrary();
    };
  }
}

function wireLibrary() {
  $('libImport').onchange = async (ev) => {
    const files = [...ev.target.files];
    ev.target.value = '';
    engine.ensure();
    for (const f of files) {
      try { await addToLibrary(await decodeBytes(await f.arrayBuffer(), f.name), safeFileName(f.name), 'file'); } catch (err) { toast(`${f.name}: ${err.message}`, 'err'); }
    }
  };
}

// ----------------------------------------------------------------- helper --
function setHelperStatus(err) {
  const led = $('helperLed');
  if (helper.online) {
    const t = helper.info.tools || {};
    const missing = Object.entries(t).filter(([, v]) => !v).map(([k]) => k);
    led.className = `led ${missing.length ? 'warn' : 'on'}`;
    $('helperMsg').textContent = `Connected to ${helper.base}.${missing.length ? ` Missing: ${missing.join(', ')} (run setup-helper.sh; add --stems for Demucs).` : ' ffmpeg, yt-dlp and Demucs are ready.'}`;
    $('helperMsg').className = 'status-line ok';
  } else {
    led.className = 'led';
    $('helperMsg').textContent = err ? `Not connected: ${err}` : 'Not connected.';
    $('helperMsg').className = 'status-line err';
  }
}

async function checkHelper(quiet = true) {
  try { await helper.check(); setHelperStatus(); if (!quiet) toast('KBK helper connected', 'ok'); } catch (err) {
    setHelperStatus(err.message === 'Failed to fetch' ? `nothing answering at ${helper.base}` : err.message);
    if (!quiet) toast('KBK helper is not answering', 'err');
  }
}

function wireDialogs() {
  $('midiChip').onclick = () => { engine.ensure(); $('midiDlg').showModal(); };
  $('helperChip').onclick = () => { $('helperUrl').value = helper.base; $('helperDlg').showModal(); };
  document.querySelectorAll('[data-open-helper]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); $('helperChip').click(); }; });
  document.querySelectorAll('.dlg [data-close]').forEach((b) => { b.onclick = () => b.closest('dialog').close(); });
  $('midiIn').onchange = (e) => { state.midiInput = e.target.value; store.setSetting('midiInput', state.midiInput); attachInputs(); };
  $('midiRescan').onclick = () => { if (midiAccess) attachInputs(); else initMidi(); };
  $('helperTest').onclick = async () => {
    helper.setBase($('helperUrl').value);
    store.setSetting('helperUrl', helper.base);
    await checkHelper(false);
  };
}

// ------------------------------------------------------------------- boot --
function wireMaster() {
  $('master').oninput = (e) => { engine.setMaster(Number(e.target.value)); store.setSetting('master', Number(e.target.value)); };
  const fill = $('meterFill');
  const loop = () => {
    fill.style.width = `${Math.min(100, engine.level() * 100)}%`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function wireAudioGate() {
  // Any first click/key starts audio; the overlay only shows if a keyboard is
  // played before the page was ever clicked.
  const start = () => { engine.ensure(); $('audioGate').hidden = true; };
  window.addEventListener('pointerdown', start, { once: true, capture: true });
  window.addEventListener('keydown', start, { once: true, capture: true });
  $('audioGateBtn').onclick = start;
  setInterval(() => {
    if (engine.ctx && engine.ctx.state !== 'running' && state.held.size) $('audioGate').hidden = false;
  }, 500);
}

async function restore() {
  try {
    state.mode = await store.getSetting('mode', 'pads');
    state.padNotes = await store.getSetting('padNotes', defaultPadNotes(DEFAULT_BASE_NOTE));
    state.velocity = await store.getSetting('velocity', true);
    state.midiInput = await store.getSetting('midiInput', 'all');
    for (const id of ['autoChop', 'chopCut', 'rdAuto']) $(id).checked = await store.getSetting(id, true);
    const master = await store.getSetting('master', 0.9);
    $('master').value = master; engine.setMaster(master);
    const url = await store.getSetting('helperUrl', null);
    if (url && !Helper.sameOrigin()) helper.setBase(url);
    const pads = await store.loadPads();
    pads.forEach((p, i) => { if (p) engine.pads[i] = { ...engine.pads[i], ...p }; });
    state.library = await store.loadLibrary();
    if (engine.ctx) engine.pads.forEach((p, i) => engine.rebuild(i));
  } catch (err) {
    console.warn('restore failed', err);
  }
  $('velocity').checked = state.velocity;
  $('baseNote').value = String(state.padNotes[0]);
  setMode(state.mode);
  refreshPads();
  renderEditor();
  refreshLibraryViews();
}

function boot() {
  fillFormatSelects();
  buildPads();
  wireEditor();
  wireReader();
  wireStems();
  wireConverter();
  wireLibrary();
  wireDialogs();
  wireMaster();
  wireKeys();
  wireAudioGate();
  document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
  window.addEventListener('resize', () => { renderEditor(); refreshPadCanvases(); renderReaderWave(); });
  restore();
  initMidi();
  checkHelper();
}

boot();
