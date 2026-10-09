// Video lessons: every lesson of an instrument has a video slot. A video opens
// when you reach its lesson (like the lessons themselves), you watch it in the
// Home video player or inside the lesson, and what each player has watched is
// remembered. Lessons without a video yet show their teacher's script, ready
// to paste into an AI video tool, and take a link or a file right there.

import { unitsFor, pathState } from './lessons.js';
import { instrumentById } from './home.js';

/** The video for a lesson: one attached to it (Course Studio / Home), else a video step's own link. */
export function lessonVideo(lesson, videos = {}) {
  const attached = videos[lesson.id];
  if (attached?.src) return { src: attached.src, name: attached.name || '' };
  const step = lesson.steps?.find((s) => s.type === 'video' && s.src);
  return step ? { src: step.src, name: '' } : null;
}

/**
 * The video lessons of an instrument, in course order:
 * [{ lesson, course, unit, key, video | null, unlocked, passed, watched }].
 *   progress: { lessonId: stars }; videos: loadVideos() map; watched: { key: date }.
 */
export function videoLessons(instrumentId, { progress = {}, videos = {}, watched = {}, unlockAll = false } = {}) {
  const out = [];
  for (const course of instrumentById(instrumentId).courses) {
    const state = new Map(pathState(progress, course).map((p) => [p.lesson.id, p]));
    for (const unit of unitsFor(course))
      for (const lesson of unit.lessons) {
        const p = state.get(lesson.id);
        out.push({
          lesson,
          course,
          unit,
          key: lesson.id,
          video: lessonVideo(lesson, videos),
          unlocked: unlockAll || !!p?.unlocked,
          passed: (p?.stars || 0) > 0,
          watched: !!watched[lesson.id],
        });
      }
  }
  return out;
}

/** { total, made (have a video), watched (of those made), open (unlocked and made) }. */
export function videoSummary(list) {
  const made = list.filter((v) => v.video);
  return { total: list.length, made: made.length, watched: made.filter((v) => v.watched).length, open: made.filter((v) => v.unlocked).length };
}

/**
 * Which videos to show first: new videos you can watch, then videos you've
 * watched, then lessons still waiting for a video (script only), then locked.
 */
export function videosToShow(list, max = 8) {
  const rank = (v) => (!v.unlocked ? 3 : v.video && !v.watched ? 0 : v.video ? 1 : 2);
  return list
    .map((v, i) => ({ v, i }))
    .sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i)
    .slice(0, max)
    .map((x) => x.v);
}

/** A player's watched videos ({ key: date }), kept in the Stage state with their scores. */
export function watchedBy(stage, playerId) {
  return ((stage.watched ??= {})[playerId] ??= {});
}

/** Remember that a player watched a lesson's video. Returns true the first time. */
export function markWatched(stage, playerId, key, date = Date.now()) {
  const w = watchedBy(stage, playerId);
  if (w[key]) return false;
  w[key] = date;
  return true;
}
