import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../js/songs.js';
import { COURSES, UNITS, ALL_LESSONS, unitsFor, pathState, addCourse, removeCourse } from '../js/lessons.js';
import { TEACHERS, COURSE_TEACHERS, teacherById, characterBrief } from '../js/teachers.js';
import { BUNDLED_PACKS } from '../js/course-packs.js';
import { newCourse, courseToPack, validateCourse, videoSource, lessonScript, scriptsCsv, loadCourses, saveCourses } from '../js/courses.js';

const songIds = new Set(SONGS.map((s) => s.id));

test('the teachers are complete original characters, one for every course', () => {
  assert.ok(TEACHERS.length >= 5);
  assert.equal(new Set(TEACHERS.map((t) => t.id)).size, TEACHERS.length);
  for (const t of TEACHERS) {
    for (const k of ['name', 'role', 'look', 'voice', 'color', 'emoji']) assert.ok(t[k], `${t.id}.${k}`);
    for (const k of ['hello', 'praise', 'bye']) assert.ok(t.style[k], `${t.id} says ${k}`);
    assert.ok(characterBrief(t).includes('original Knight Lyfe character'));
  }
  for (const c of COURSES.filter((x) => !x.custom)) assert.ok(TEACHERS.some((t) => t.id === COURSE_TEACHERS[c.id]), `${c.id} has a teacher`);
});

test('every built-in course works as a course pack (the template)', () => {
  for (const c of COURSES.filter((x) => !x.custom)) {
    const pack = courseToPack(c, unitsFor(c.id));
    assert.deepEqual(validateCourse(pack, { songIds }), [], c.id);
    assert.ok(JSON.parse(JSON.stringify(pack)).units.length > 0, 'survives saving as a file');
  }
  assert.deepEqual(validateCourse(newCourse('Bible Basics')), []);
});

test('pack validation catches mistakes', () => {
  const p = newCourse('Test');
  p.units[0].lessons[0].steps.push({ type: 'quiz', question: 'Q?', choices: ['a'], answer: 0 }, { type: 'video' }, { type: 'song', song: 'nope', part: '0', text: 'x' }, { type: 'dance' });
  const errors = validateCourse(p, { songIds });
  assert.ok(errors.some((e) => /quiz needs/.test(e)));
  assert.ok(errors.some((e) => /video needs/.test(e)));
  assert.ok(errors.some((e) => /no song "nope"/.test(e)));
  assert.ok(errors.some((e) => /unknown step type "dance"/.test(e)));
  assert.deepEqual(validateCourse({ title: 'x' }), ['Not a Knight course pack (.kcourse).']);
});

test('a course pack joins the lessons under its own tab, and leaves again', () => {
  const before = { courses: COURSES.length, units: UNITS.length, lessons: ALL_LESSONS.length };
  const pack = newCourse('Bible Basics', 'professor-note');
  pack.units[0].lessons.push({ id: 'l2', title: 'Quiz time', steps: [{ type: 'quiz', question: 'How many books are in the Bible?', choices: ['39', '66', '27'], answer: 1, explain: '39 in the Old Testament and 27 in the New.' }] });
  addCourse(pack);
  assert.equal(COURSES.length, before.courses + 1);
  const path = pathState({}, pack.id);
  assert.equal(path.length, 2);
  assert.ok(path[0].unlocked && !path[1].unlocked, 'opens one lesson at a time like the others');
  assert.ok(path.every((x) => x.lesson.id.startsWith(`${pack.id}/`)), 'lesson ids never clash with other courses');
  addCourse(pack); // saving again replaces it
  assert.equal(COURSES.length, before.courses + 1);
  removeCourse(pack.id);
  assert.deepEqual({ courses: COURSES.length, units: UNITS.length, lessons: ALL_LESSONS.length }, before);
});

test('video links: YouTube, Vimeo and files', () => {
  assert.deepEqual(videoSource('https://youtu.be/abcDEF12345'), { kind: 'youtube', embed: 'https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0' });
  assert.equal(videoSource('https://www.youtube.com/watch?v=abcDEF12345&t=3').kind, 'youtube');
  assert.equal(videoSource('https://vimeo.com/123456789').embed, 'https://player.vimeo.com/video/123456789');
  assert.equal(videoSource('https://cdn.example.org/lesson1.mp4').kind, 'file');
  assert.equal(videoSource(''), null);
});

test('lesson scripts for AI teacher videos, in the teacher\'s voice', () => {
  const lesson = unitsFor('piano')[0].lessons[1]; // C, D and E
  const s = lessonScript(lesson, { teacher: 'maestro-k', course: 'Piano', unit: 'Meet the keyboard', number: 2 });
  assert.ok(s.text.startsWith('LESSON 2 · C, D and E'));
  assert.ok(s.text.includes('MAESTRO K: Welcome back to the keys, family.'));
  assert.ok(s.text.includes('C, D, E'), 'reads the notes out');
  assert.ok(s.text.includes('[ON SCREEN] Highlight'));
  assert.ok(s.text.trim().endsWith(teacherById('maestro-k').style.bye));
  assert.ok(s.seconds > 10 && s.seconds < 300);
  const csv = scriptsCsv(courseToPack(COURSES.find((c) => c.id === 'drums'), unitsFor('drums')));
  const rows = csv.split('\n');
  assert.equal(rows[0], '"course","unit","lesson_id","lesson","teacher","est_seconds","script"');
  assert.equal(rows.length, 1 + unitsFor('drums').reduce((a, u) => a + u.lessons.length, 0));
  assert.ok(rows[1].includes('"Beat Knight"'));
});

test('your courses save and load', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const p = newCourse('Youth Choir');
  saveCourses([p], storage);
  assert.equal(loadCourses(storage)[0].title, 'Youth Choir');
  assert.equal(loadCourses(storage)[0].by, 'BAC Ministries');
  storage.setItem('kk.courses', 'not json');
  assert.deepEqual(loadCourses(storage), []);
});

test('bundled courses (Worship Team Training) are valid packs', () => {
  for (const p of BUNDLED_PACKS) {
    assert.deepEqual(validateCourse(p, { songIds }), [], p.id);
    assert.ok(p.by.includes('BAC Ministries'));
    assert.ok(TEACHERS.some((t) => t.id === p.teacher));
  }
});
