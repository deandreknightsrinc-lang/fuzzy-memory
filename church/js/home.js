// The church home page (church/index.html). Which church:
//   ?c=<id>     a church on the network (churches/<id>.json)
//   ?c=local    the church saved on this device by the setup
//   (nothing)   the home church named in churches/index.json (BAC Ministries)
//   ?preview    the setup's live preview (the setup sends the church file)

import { normalizeChurch, networkList, validateChurch, slugify, FLAGSHIP_ID } from './profile.js';
import { renderHome, themeCss } from './render.js';
import { FACE_CSS } from '../../knight-keys/js/ai-teacher.js';

const params = new URLSearchParams(location.search);
const root = document.getElementById('page');
const theme = document.head.appendChild(document.createElement('style'));
document.head.append(Object.assign(document.createElement('style'), { textContent: FACE_CSS }));

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function show(church, network) {
  const c = normalizeChurch(church);
  theme.textContent = themeCss(c);
  document.title = c.name || 'Church';
  root.innerHTML = renderHome(c, { network });
}

function showError(text) {
  root.innerHTML = `<section class="kc-hero"><h1>Church not found</h1><p class="kc-tagline"></p><div class="kc-actions"><a class="kc-btn primary" href="./">Go to the home church</a><a class="kc-btn" href="setup.html">Set up a church</a></div></section>`;
  root.querySelector('.kc-tagline').textContent = text;
}

async function main() {
  let index = { home: FLAGSHIP_ID, churches: [] };
  try {
    index = await getJson('churches/index.json');
  } catch {
    // no directory: just the church itself
  }
  const network = networkList(index);
  if (params.has('preview')) {
    window.addEventListener('message', (e) => {
      if (e.origin === location.origin && e.data?.church) show(e.data.church, network);
    });
    window.parent?.postMessage({ previewReady: true }, location.origin);
    return;
  }
  const id = params.get('c') || index.home || FLAGSHIP_ID;
  if (id === 'local') {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('kc.local') || 'null');
    } catch {
      saved = null;
    }
    if (!saved || validateChurch(saved).length) return showError('No church is saved on this device yet. Make one in the setup.');
    return show(saved, network);
  }
  try {
    const church = await getJson(`churches/${slugify(id)}.json`);
    if (validateChurch(church).length) throw new Error('invalid');
    show(church, network);
  } catch {
    showError(`We couldn't find the church "${id}" on this network.`);
  }
}

main();
