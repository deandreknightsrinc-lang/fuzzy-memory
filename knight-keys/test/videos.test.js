import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonVideo, videoLessons, videoSummary, videosToShow, watchedBy, markWatched } from '../js/videos.js';
import { pathState } from '../js/lessons.js';
import { defaultStage } from '../js/game.js';

test('every lesson of an instrument has a video slot; they open with their lesson', () => {
  const list = videoLessons('drums');
  const path = pathState({}, 'drums');
  assert.equal(list.length, path.length);
  assert.deepEqual(list.map((v) => v.unlocked), path.map((p) => p.unlocked), 'locked until you reach the lesson');
  assert.ok(list.every((v) => v.video === null && !v.watched), 'no built-in videos yet');
  const passedFirst = videoLessons('drums', { progress: { [path[0].lesson.id]: 2 } });
  assert.ok(passedFirst[1].unlocked, 'passing a lesson opens the next video');
  assert.ok(passedFirst[0].passed);
  assert.ok(videoLessons('drums', { unlockAll: true }).every((v) => v.unlocked));
  assert.equal(videoLessons('piano').some((v) => v.course === 'reading'), true, 'piano includes reading music');
});

test('a lesson\'s video: attached first, else its own video step', () => {
  const lesson = { id: 'x', steps: [{ type: 'video', src: 'https://youtu.be/abcdefg' }] };
  assert.deepEqual(lessonVideo(lesson), { src: 'https://youtu.be/abcdefg', name: '' });
  assert.deepEqual(lessonVideo(lesson, { x: { src: 'idb:x', name: 'mine.mp4' } }), { src: 'idb:x', name: 'mine.mp4' });
  assert.equal(lessonVideo({ id: 'y', steps: [{ type: 'info' }] }), null);
  assert.equal(lessonVideo({ id: 'y', steps: [{ type: 'video' }] }), null, 'a video step with only a script has no video');
});

test('watched videos are kept per player and counted', () => {
  const stage = defaultStage();
  const path = pathState({}, 'guitar');
  const first = path[0].lesson.id;
  const videos = { [first]: { src: 'https://vimeo.com/123456' } };
  assert.equal(markWatched(stage, 'p1', first, 5), true);
  assert.equal(markWatched(stage, 'p1', first, 6), false, 'only the first time counts');
  assert.equal(watchedBy(stage, 'p1')[first], 5);
  assert.deepEqual(watchedBy(stage, 'p2'), {}, 'other players start fresh');
  const list = videoLessons('guitar', { videos, watched: watchedBy(stage, 'p1') });
  assert.ok(list[0].watched && list[0].video);
  assert.deepEqual(videoSummary(list), { total: path.length, made: 1, watched: 1, open: 1 });
  const roundTrip = JSON.parse(JSON.stringify(stage));
  assert.ok(roundTrip.watched.p1[first], 'saved with the Stage state');
});

test('videos to show: new ones first, then watched, then script-only, then locked', () => {
  const v = (title, unlocked, video, watched) => ({ lesson: { title }, unlocked, video: video ? { src: 'x' } : null, watched });
  const shown = videosToShow([v('locked', false, true, false), v('script', true, false, false), v('seen', true, true, true), v('new', true, true, false)]);
  assert.deepEqual(shown.map((x) => x.lesson.title), ['new', 'seen', 'script', 'locked']);
  assert.equal(videosToShow(Array.from({ length: 20 }, (_, i) => v(`n${i}`, true, true, false)), 5).length, 5);
});
