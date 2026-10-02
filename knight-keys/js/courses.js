// Course packs: the template for every course (music, Bible study, any class).
// A pack is one portable JSON file (.kcourse): course info, its teacher, units,
// lessons and steps. The same pack runs here, on a hosted platform or on a
// church's own copy. Lessons can carry AI-teacher videos, and every lesson can
// write its own video script in the teacher's voice for any AI video tool.

import { TEACHERS, COURSE_TEACHERS, teacherById } from './teachers.js';

export const PACK_FORMAT = 'knight-course';
export const STEP_TYPES = ['info', 'video', 'quiz', 'notes', 'chords', 'song', 'sing', 'range', 'read', 'hits', 'groove', 'fret', 'strum', 'chart'];
export const STEP_LABELS = {
  info: 'Explain (the teacher talks)', video: 'Video', quiz: 'Quiz question', notes: 'Play notes', chords: 'Play chords', song: 'Play a song',
  sing: 'Sing notes', range: 'Find your range', read: 'Read notes', hits: 'Hit drums', groove: 'Drum groove', fret: 'Guitar/bass notes', strum: 'Strum chords', chart: 'Play along',
};

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

/** A new, empty course to start from. */
export function newCourse(title = 'New course', teacher = TEACHERS[0].id) {
  return {
    format: PACK_FORMAT,
    version: 1,
    id: `${slug(title)}-${Date.now().toString(36)}`,
    title,
    icon: '📘',
    subject: '',
    description: '',
    by: 'BAC Ministries', // credit shown with the course, wherever it's shared
    teacher,
    units: [{ id: 'unit-1', title: 'Unit 1', icon: '⭐', lessons: [{ id: 'lesson-1', title: 'Lesson 1', steps: [{ type: 'info', text: 'Welcome to the course! Here is what we will learn together.' }] }] }],
  };
}

/** A built-in course as a pack (to copy and change, or to share). */
export function courseToPack(course, units) {
  return {
    format: PACK_FORMAT,
    version: 1,
    id: course.id,
    title: course.name,
    icon: course.icon,
    subject: 'Music',
    description: '',
    by: 'BAC Ministries · Knight Lyfe',
    teacher: COURSE_TEACHERS[course.id] || TEACHERS[0].id,
    units: units.map((u) => ({ id: u.id, title: u.title, icon: u.icon, lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, steps: l.steps })) })),
  };
}

/** Problems with a pack (empty = good to use). `songIds` checks song steps. */
export function validateCourse(pack, { songIds = null } = {}) {
  const errors = [];
  if (!pack || pack.format !== PACK_FORMAT) return ['Not a Knight course pack (.kcourse).'];
  if (!pack.id || !pack.title) errors.push('The course needs an id and a title.');
  if (!Array.isArray(pack.units) || !pack.units.length) errors.push('The course needs at least one unit.');
  const ids = new Set();
  for (const u of pack.units || []) {
    if (!u.title) errors.push('Every unit needs a title.');
    for (const l of u.lessons || []) {
      if (!l.id || ids.has(l.id)) errors.push(`Lesson "${l.title || l.id}": its id must be unique.`);
      ids.add(l.id);
      if (!l.steps?.length) errors.push(`Lesson "${l.title}": add at least one step.`);
      (l.steps || []).forEach((s, i) => {
        const where = `Lesson "${l.title}", step ${i + 1}`;
        if (!STEP_TYPES.includes(s.type)) errors.push(`${where}: unknown step type "${s.type}".`);
        if (s.type === 'video' && !s.src && !s.script) errors.push(`${where}: a video needs a link or file (or a script to make it from).`);
        if (s.type === 'quiz') {
          if (!s.question || !Array.isArray(s.choices) || s.choices.length < 2) errors.push(`${where}: a quiz needs a question and at least 2 choices.`);
          else if (!(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length)) errors.push(`${where}: pick which choice is right.`);
        }
        if (s.type === 'song' && songIds && !songIds.has(s.song)) errors.push(`${where}: no song "${s.song}" in the library.`);
        if (s.type === 'notes' && !(s.notes?.length > 0)) errors.push(`${where}: add the notes to play.`);
      });
    }
  }
  return errors;
}

/** Which kind of video link this is: { kind: 'youtube'|'vimeo'|'file', embed }. */
export function videoSource(src) {
  if (!src) return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(src);
  if (yt) return { kind: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = /vimeo\.com\/(?:video\/)?(\d+)/.exec(src);
  if (vm) return { kind: 'vimeo', embed: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: 'file', embed: src };
}

// ---- Lesson scripts for AI teacher videos ------------------------------------------

const NOTE = ['C', 'C sharp', 'D', 'E flat', 'E', 'F', 'F sharp', 'G', 'A flat', 'A', 'B flat', 'B'];
const spoken = (n) => NOTE[((n % 12) + 12) % 12];

/** What the teacher says for one step (null for steps that are the video itself). */
function stepLines(step, songTitle) {
  switch (step.type) {
    case 'video':
      return null;
    case 'info':
      return [step.text];
    case 'quiz':
      return [`Quick question: ${step.question}`, `Is it ${step.choices.slice(0, -1).join(', ')}, or ${step.choices[step.choices.length - 1]}? Pick your answer on the screen.`];
    case 'notes':
      return [`Your turn. ${step.text}`, `That's ${step.notes.map(spoken).join(', ')}. Take your time, the app is listening.`];
    case 'song':
      return [`Now let's put it together with ${songTitle(step.song) || 'a song'}. ${step.text}`];
    default:
      return [`Your turn. ${step.text}`];
  }
}

/**
 * A ready-to-record video script for a lesson, in the teacher's voice, with
 * scene directions for the AI video tool. Returns { text, words, seconds }.
 */
export function lessonScript(lesson, { teacher, course = '', unit = '', number = 0, songTitle = () => '' } = {}) {
  const t = typeof teacher === 'object' ? teacher : teacherById(teacher);
  const who = t.name.toUpperCase();
  const lines = [];
  lines.push(`LESSON ${number || ''} · ${lesson.title}${course ? `  (${course}${unit ? ` › ${unit}` : ''})` : ''}`.replace('LESSON  ·', 'LESSON ·'));
  lines.push(`Teacher: ${t.name} (${t.role})`);
  lines.push(`[SCENE] ${t.look.split('.').slice(-2).join('.').trim()} Medium close-up, ${t.name} looks into the camera.`);
  lines.push('');
  const say = [];
  say.push(`${t.style.hello} Today's lesson: ${lesson.title}.`);
  for (const step of lesson.steps) {
    const l = stepLines(step, songTitle);
    if (!l) continue;
    if (step.keys?.length || step.staff?.length) lines.push(`[ON SCREEN] Highlight: ${(step.keys || step.staff).map(spoken).join(', ')}`);
    if (step.chord) lines.push(`[ON SCREEN] Chord diagram: ${step.chord}`);
    for (const x of l) {
      lines.push(`${who}: ${x}`);
      say.push(x);
    }
    lines.push('');
  }
  lines.push(`${who}: ${t.style.bye}`);
  say.push(t.style.bye);
  lines.splice(4, 0, `${who}: ${say[0]}`, '');
  const words = say.join(' ').split(/\s+/).filter(Boolean).length;
  return { text: lines.join('\n'), words, seconds: Math.round((words / 145) * 60) };
}

/** Every lesson of a course as a CSV for bulk video tools: one row per lesson. */
export function scriptsCsv(pack, songTitle = () => '') {
  const t = typeof pack.teacher === 'object' ? pack.teacher : teacherById(pack.teacher);
  const rows = [['course', 'unit', 'lesson_id', 'lesson', 'teacher', 'est_seconds', 'script']];
  let n = 0;
  for (const u of pack.units) {
    for (const l of u.lessons) {
      n++;
      const s = lessonScript(l, { teacher: t, course: pack.title, unit: u.title, number: n, songTitle });
      const spokenOnly = s.text.split('\n').filter((x) => x.startsWith(`${t.name.toUpperCase()}: `)).map((x) => x.slice(t.name.length + 2)).join(' ');
      rows.push([pack.title, u.title, l.id, l.title, t.name, s.seconds, spokenOnly]);
    }
  }
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

// ---- Your courses and videos (stored in this browser) --------------------------------

const COURSE_KEY = 'kk.courses';
const VIDEO_KEY = 'kk.videos';

export function loadCourses(storage = globalThis.localStorage) {
  try {
    const list = JSON.parse(storage?.getItem(COURSE_KEY) || '[]');
    return Array.isArray(list) ? list.filter((p) => p?.format === PACK_FORMAT) : [];
  } catch {
    return [];
  }
}

export function saveCourses(list, storage = globalThis.localStorage) {
  try {
    storage?.setItem(COURSE_KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable */
  }
}

/** Video links attached to lessons: { "course:lesson": { src, name } }. */
export function loadVideos(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(VIDEO_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveVideos(map, storage = globalThis.localStorage) {
  try {
    storage?.setItem(VIDEO_KEY, JSON.stringify(map));
  } catch {
    /* storage full or unavailable */
  }
}

// Video files you pick from your computer live in IndexedDB (too big for localStorage).
const DB = 'knight-keys-videos';
function db() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no IndexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveVideoFile(key, blob) {
  const d = await db();
  await new Promise((resolve, reject) => {
    const t = d.transaction('files', 'readwrite');
    t.objectStore('files').put(blob, key);
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}
export async function loadVideoFile(key) {
  try {
    const d = await db();
    return await new Promise((resolve) => {
      const req = d.transaction('files').objectStore('files').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
