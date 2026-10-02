// The church home page (church/index.html). Which church: see church-load.js.
//   ?preview    the setup's live preview (the setup sends the church file)

import { normalizeChurch, networkList } from './profile.js';
import { loadChurch } from './church-load.js';
import { renderHome, themeCss } from './render.js';
import { FACE_CSS } from '../../knight-keys/js/ai-teacher.js';

const params = new URLSearchParams(location.search);
const root = document.getElementById('page');
const theme = document.head.appendChild(document.createElement('style'));
document.head.append(Object.assign(document.createElement('style'), { textContent: FACE_CSS }));

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
  if (params.has('preview')) {
    let network = [];
    try {
      network = networkList(await (await fetch('churches/index.json')).json());
    } catch {
      network = [];
    }
    window.addEventListener('message', (e) => {
      if (e.origin === location.origin && e.data?.church) show(e.data.church, network);
    });
    window.parent?.postMessage({ previewReady: true }, location.origin);
    return;
  }
  const { church, network, error } = await loadChurch(params);
  if (church) show(church, network);
  else showError(error);
}

main();
