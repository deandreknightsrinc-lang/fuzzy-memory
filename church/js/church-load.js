// Which church a page is for (shared by the home page and the Bible):
//   ?c=<id>     a church on the network (churches/<id>.json)
//   ?c=local    the church saved on this device by the setup
//   (nothing)   the home church named in churches/index.json (BAC Ministries)

import { normalizeChurch, networkList, validateChurch, slugify, FLAGSHIP_ID } from './profile.js';

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/** -> { church (normalized) | null, network, id, error } */
export async function loadChurch(params = new URLSearchParams(location.search)) {
  let index = { home: FLAGSHIP_ID, churches: [] };
  try {
    index = await getJson('churches/index.json');
  } catch {
    // no directory: just the church itself
  }
  const network = networkList(index);
  const id = params.get('c') || index.home || FLAGSHIP_ID;
  if (id === 'local') {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('kc.local') || 'null');
    } catch {
      saved = null;
    }
    if (!saved || validateChurch(saved).length) return { church: null, network, id, error: 'No church is saved on this device yet. Make one in the setup.' };
    return { church: normalizeChurch(saved), network, id };
  }
  try {
    const raw = await getJson(`churches/${slugify(id)}.json`);
    if (validateChurch(raw).length) throw new Error('invalid');
    return { church: normalizeChurch(raw), network, id };
  } catch {
    return { church: null, network, id, error: `We couldn't find the church "${id}" on this network.` };
  }
}
