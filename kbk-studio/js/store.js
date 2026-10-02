// Keeps the kit and the library on this computer (IndexedDB), so a reload
// doesn't empty the pads.

const DB = 'kbk-studio';
const VERSION = 1;
let dbp = null;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('pads')) db.createObjectStore('pads');
        if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const packClip = (clip) => clip && ({ name: clip.name, sampleRate: clip.sampleRate, channels: clip.channels.map((c) => c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength)) });
const unpackClip = (c) => c && ({ name: c.name, sampleRate: c.sampleRate, channels: c.channels.map((b) => new Float32Array(b)) });

export async function savePad(i, pad) {
  const { clip, ...rest } = pad;
  return tx('pads', 'readwrite', (s) => s.put({ ...rest, clip: packClip(clip) }, i));
}

export async function loadPads() {
  const out = [];
  const db = await open();
  await new Promise((resolve, reject) => {
    const t = db.transaction('pads', 'readonly');
    const req = t.objectStore('pads').openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      out[c.key] = { ...c.value, clip: unpackClip(c.value.clip) };
      c.continue();
    };
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
  return out;
}

export async function saveClip(entry) {
  return tx('library', 'readwrite', (s) => s.put({ ...entry, clip: packClip(entry.clip) }));
}

export async function deleteClip(id) {
  return tx('library', 'readwrite', (s) => s.delete(id));
}

export async function loadLibrary() {
  const all = await tx('library', 'readonly', (s) => s.getAll());
  return (all || []).map((e) => ({ ...e, clip: unpackClip(e.clip) })).sort((a, b) => b.added - a.added);
}

export async function getSetting(key, fallback) {
  try {
    const v = await tx('settings', 'readonly', (s) => s.get(key));
    return v === undefined ? fallback : v;
  } catch { return fallback; }
}

export async function setSetting(key, value) {
  try { await tx('settings', 'readwrite', (s) => s.put(value, key)); } catch { /* private mode */ }
}
