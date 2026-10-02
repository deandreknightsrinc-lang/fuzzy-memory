// The church platform setup (church/setup.html): fill in a church file with a
// live preview, then download it or open it on this device.

import { blankChurch, normalizeChurch, validateChurch, setupChecklist, churchToFile, slugify, PROGRAMS, ACADEMY_COURSES, DAYS, FLAGSHIP_ID } from './profile.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const frame = $('preview');
let church = loadDraft() || blankChurch();
let idTouched = false;
let flagshipEmail = '';

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem('kc.draft') || 'null');
    return d ? normalizeChurch(d) : null;
  } catch {
    return null;
  }
}

function saveDraft() {
  try {
    localStorage.setItem('kc.draft', JSON.stringify(church));
  } catch {
    // private window: the draft just isn't kept
  }
}

const getPath = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);
function setPath(o, path, v) {
  const ks = path.split('.');
  const last = ks.pop();
  ks.reduce((x, k) => (x[k] ??= {}), o)[last] = v;
}

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

function fillFields() {
  for (const input of form.querySelectorAll('[data-k]')) {
    const v = getPath(church, input.dataset.k);
    if (input.type === 'checkbox') input.checked = !!v;
    else input.value = v ?? '';
  }
  renderTimes();
  renderPrograms();
  renderList('sermons', [['title', 'Title'], ['speaker', 'Speaker'], ['date', 'Date'], ['video', 'Video link (YouTube, Vimeo, Facebook…)']], { title: '', speaker: '', date: '', video: '' });
  renderList('events', [['title', 'Event'], ['date', 'When'], ['text', 'Details']], { title: '', date: '', text: '' });
}

function renderTimes() {
  const box = $('times');
  box.innerHTML = '';
  church.times.forEach((t, i) => {
    const day = el('select', { title: 'Day' }, ...DAYS.map((d) => new Option(d, d)));
    day.value = t.day;
    day.onchange = () => ((t.day = day.value), changed());
    const time = el('input', { value: t.time, placeholder: '11:00 AM', maxLength: 20 });
    time.oninput = () => ((t.time = time.value), changed());
    const label = el('input', { value: t.label, placeholder: 'Worship service', maxLength: 60 });
    label.oninput = () => ((t.label = label.value), changed());
    const del = el('button', { type: 'button', className: 'su-mini', textContent: '✕', title: 'Remove' });
    del.onclick = () => (church.times.splice(i, 1), renderTimes(), changed());
    box.append(el('div', { className: 'su-item' }, day, time, del), el('div', { className: 'su-item', style: 'grid-template-columns:1fr' }, label));
  });
}

function renderPrograms() {
  const box = $('programs');
  box.innerHTML = '';
  for (const [k, p] of Object.entries(PROGRAMS)) {
    const cb = el('input', { type: 'checkbox', checked: !!church.programs[k] });
    cb.onchange = () => ((church.programs[k] = cb.checked), changed());
    box.append(el('label', { className: 'su-check' }, cb, `${p.icon} ${p.label}`));
  }
  const ac = $('academy');
  ac.innerHTML = '';
  for (const c of ACADEMY_COURSES) {
    const cb = el('input', { type: 'checkbox', checked: church.academy.includes(c.id) });
    cb.onchange = () => {
      church.academy = ACADEMY_COURSES.map((x) => x.id).filter((id) => (id === c.id ? cb.checked : church.academy.includes(id)));
      changed();
    };
    ac.append(el('label', { className: 'su-check' }, cb, `${c.icon} ${c.name}`));
  }
}

function renderList(key, fields, empty) {
  const box = $(key);
  box.innerHTML = '';
  church[key].forEach((item, i) => {
    const row = el('div', { className: 'su-item wide' });
    for (const [f, ph] of fields) {
      const input = el(f === 'text' ? 'textarea' : 'input', { value: item[f] || '', placeholder: ph });
      if (f === 'text') input.style.minHeight = '50px';
      input.oninput = () => ((item[f] = input.value), changed());
      row.append(input);
    }
    const del = el('button', { type: 'button', className: 'su-mini', textContent: 'Remove' });
    del.onclick = () => (church[key].splice(i, 1), renderList(key, fields, empty), changed());
    row.append(del);
    box.append(row);
  });
  $(key === 'sermons' ? 'addSermon' : 'addEvent').onclick = () => {
    church[key].unshift({ ...empty });
    renderList(key, fields, empty);
    changed();
  };
}

let previewTimer = 0;
function sendPreview() {
  frame.contentWindow?.postMessage({ church: normalizeChurch(church) }, location.origin);
}

function changed() {
  saveDraft();
  const c = normalizeChurch(church);
  const errors = validateChurch(c);
  $('errors').textContent = errors.join(' ');
  const todo = setupChecklist(c);
  $('todo').innerHTML = '';
  for (const t of todo) $('todo').append(el('li', { textContent: t }));
  $('todoBox').hidden = !todo.length;
  if (!errors.length && !todo.length) $('errors').append(el('div', { className: 'su-ok', textContent: '✓ Your page is complete.' }));
  const id = c.id || 'your-church';
  $('idHint').textContent = `Your page: …/church/?c=${id}`;
  $('netUrl').textContent = `${new URL('./', location.href).href}?c=${id}`;
  $('fileName').textContent = `${id}.json`;
  $('homeId').textContent = `"${id}"`;
  $('download').disabled = $('tryIt').disabled = errors.length > 0;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(sendPreview, 120);
}

form.addEventListener('input', (e) => {
  const k = e.target.dataset?.k;
  if (!k) return;
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  setPath(church, k, v);
  if (k === 'id') idTouched = true;
  if (k === 'name' && !idTouched) {
    church.id = slugify(v);
    form.querySelector('[data-k=id]').value = church.id;
  }
  changed();
});
form.addEventListener('submit', (e) => e.preventDefault());

window.addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.previewReady) sendPreview();
});

function start(c) {
  church = normalizeChurch(c);
  idTouched = !!church.id && church.id !== slugify(church.name);
  fillFields();
  changed();
}

$('startBlank').onclick = () => {
  if (church.name && !confirm('Start over with a new church? (Download your file first if you want to keep this one.)')) return;
  idTouched = false;
  start(blankChurch());
};
$('startBac').onclick = async () => {
  try {
    const r = await fetch(`churches/${FLAGSHIP_ID}.json`, { cache: 'no-cache' });
    start(await r.json());
  } catch {
    alert('Couldn\'t load the BAC Ministries file.');
  }
};
$('openFile').onclick = () => $('fileInput').click();
$('fileInput').onchange = async () => {
  const f = $('fileInput').files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const errors = validateChurch(data);
    if (errors.length && data?.format !== 'knight-church') return alert(errors.join('\n'));
    start(data);
  } catch {
    alert('That file isn\'t a church.json.');
  }
  $('fileInput').value = '';
};

$('download').onclick = () => {
  const c = normalizeChurch(church);
  const url = URL.createObjectURL(new Blob([churchToFile(c)], { type: 'application/json' }));
  el('a', { href: url, download: `${c.id || 'church'}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
$('tryIt').onclick = () => {
  try {
    localStorage.setItem('kc.local', churchToFile(church));
  } catch {
    return alert('This browser won\'t keep it (private window?).');
  }
  window.open('index.html?c=local', '_blank');
};
$('viewDesktop').onclick = () => frame.classList.remove('phone');
$('viewPhone').onclick = () => frame.classList.add('phone');

// How to send BAC Ministries the file: from BAC's own church file (its email).
fetch(`churches/${FLAGSHIP_ID}.json`, { cache: 'no-cache' })
  .then((r) => r.json())
  .then((bac) => {
    flagshipEmail = normalizeChurch(bac).links.email;
    if (flagshipEmail) {
      $('joinHow').textContent = ' at ';
      $('joinHow').append(el('a', { href: `mailto:${flagshipEmail}?subject=${encodeURIComponent('Join the church network')}`, textContent: flagshipEmail }));
    }
  })
  .catch(() => {});

fillFields();
changed();
