import test from 'node:test';
import assert from 'node:assert/strict';
import { VIDEO_SCRIPTS, videoScriptFor, scriptSeconds, filmingScriptText, spokenText, scriptsCsvFor } from '../js/video-scripts.js';
import { ALL_LESSONS, unitsFor } from '../js/lessons.js';
import { COURSE_TEACHERS, teacherById } from '../js/teachers.js';

const lessonsOf = (course) => unitsFor(course).flatMap((u) => u.lessons.map((lesson) => ({ lesson, unit: u })));

test('every drum, bass and guitar lesson has a filming script by its course teacher', () => {
  for (const course of ['drums', 'bass', 'guitar']) {
    const list = lessonsOf(course);
    assert.ok(list.length > 0);
    for (const { lesson } of list) {
      const s = videoScriptFor(lesson.id);
      assert.ok(s, `${lesson.id} has a script`);
      assert.equal(s.teacher, COURSE_TEACHERS[course], `${lesson.id}: taught by the ${course} teacher`);
    }
  }
  for (const { lesson } of lessonsOf('piano').filter((e) => e.unit.id === 'scales')) assert.equal(videoScriptFor(lesson.id)?.teacher, COURSE_TEACHERS.piano, `${lesson.id}: Maestro K`);
  for (const { lesson } of lessonsOf('voice').filter((e) => ['voice-technique', 'voice-ear', 'voice-worship'].includes(e.unit.id))) assert.equal(videoScriptFor(lesson.id)?.teacher, COURSE_TEACHERS.voice, `${lesson.id}: Melody Grace`);
  const ids = new Set(ALL_LESSONS.map((l) => l.id));
  for (const id of Object.keys(VIDEO_SCRIPTS)) assert.ok(ids.has(id), `${id} is a real lesson`);
});

test('scripts are complete, filmable and a sensible length', () => {
  for (const [id, s] of Object.entries(VIDEO_SCRIPTS)) {
    assert.ok(s.scenes.length >= 4, `${id}: at least 4 scenes`);
    for (const scene of s.scenes) {
      assert.ok(scene.shot?.length > 10, `${id}: every scene has a camera direction`);
      assert.ok(scene.say?.length > 10, `${id}: every scene has lines`);
    }
    const secs = scriptSeconds(s);
    assert.ok(secs >= 35 && secs <= 150, `${id}: ${secs}s is between 35 s and 2.5 min`);
    const t = teacherById(s.teacher);
    assert.ok(s.scenes[0].say.startsWith(t.style.hello.split(',')[0]), `${id}: opens with ${t.name}'s hello`);
    assert.ok(s.scenes.at(-1).say.endsWith(t.style.bye), `${id}: ends with ${t.name}'s goodbye`);
  }
});

test('script text, narration and CSV', () => {
  const { lesson, unit } = lessonsOf('drums')[0];
  const s = videoScriptFor(lesson.id);
  const text = filmingScriptText(lesson, s, { number: 1, course: 'Drums', unit: unit.title });
  assert.match(text, /^LESSON 1 · Kick, snare and hi-hat {2}\(Drums › Meet the kit\)/);
  assert.match(text, /\[LOOK\] .*e-kit|\[LOOK\] .*drum kit/);
  assert.equal((text.match(/^SCENE \d+$/gm) || []).length, s.scenes.length);
  assert.ok(text.includes('BEAT KNIGHT: What\'s up, drummers!'));
  assert.ok(text.includes('[ON SCREEN] KICK = "boom"'));
  assert.ok(!spokenText(s).includes('[SHOT]'), 'narration is only the spoken words');

  const entries = lessonsOf('bass').map((e, i) => ({ ...e, number: i + 1, course: 'Bass' }));
  const csv = scriptsCsvFor([...entries, { lesson: { id: 'no-script', title: 'x' }, unit: null }]);
  assert.ok(csv.startsWith('"lesson_id","lesson","unit","teacher","est_seconds","narration","full_script"'));
  assert.equal(csv.split(/\n(?="b-)/).length - 1, entries.length, 'one row per bass lesson, none for lessons without a script');
  const drums = scriptsCsvFor(lessonsOf('drums').slice(0, 1).map((e) => ({ ...e, number: 1, course: 'Drums' })));
  assert.ok(drums.includes('KICK = ""boom""'), 'quotes inside fields are doubled');
});
