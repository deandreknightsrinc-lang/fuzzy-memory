// Home: one screen per instrument, in the spirit of Yousician and Simply Piano.
// Each instrument gathers its courses (lessons), the songs you unlock as you
// go (Stage songs for keys and drums, song lessons for the rest), your progress
// and the tools you practise with. This module only works out what to show;
// main.js draws it and opens the lessons, Stage and tools.

import { ALL_LESSONS, unitsFor, pathState } from './lessons.js';
import { courseState } from './game.js';

/**
 * The instruments. `courses`: lesson courses (lessons.js), in order. `stageParts`:
 * Stage parts that unlock songs (game.js) - none for instruments Stage can't judge
 * yet, whose songs are their song and play-along lessons. `tools`: practice tools
 * main.js knows how to open. `plays`: how to play along.
 */
export const INSTRUMENTS = [
  {
    id: 'piano',
    name: 'Piano',
    icon: '🎹',
    courses: ['piano', 'reading'],
    stageParts: [
      { part: '0', name: 'Right hand' },
      { part: '0,1', name: 'Both hands' },
    ],
    tools: ['practice', 'songs', 'score', 'learn'],
    plays: 'A MIDI keyboard, the keys on screen, or any piano near the microphone.',
  },
  {
    id: 'drums',
    name: 'Drums',
    icon: '🥁',
    courses: ['drums'],
    stageParts: [{ part: '9', name: 'Drums' }],
    tools: ['grooves', 'kit', 'songs'],
    plays: 'An e-kit (like the Alesis Nitro Max), drum pads, or the pads on screen.',
  },
  {
    id: 'voice',
    name: 'Voice',
    icon: '🎤',
    courses: ['voice'],
    stageParts: [],
    tools: ['booth', 'lyrics', 'mic'],
    plays: 'Sing into the microphone. Headphones help, so the speakers don\'t sing for you.',
  },
  {
    id: 'guitar',
    name: 'Guitar',
    icon: '🎸',
    courses: ['guitar'],
    stageParts: [],
    tools: ['practice', 'tuner', 'mic'],
    plays: 'An acoustic guitar near the microphone, or an electric through an audio interface. No guitar yet? Play the chords on your keyboard.',
  },
  {
    id: 'bass',
    name: 'Bass',
    icon: '🎸',
    courses: ['bass'],
    stageParts: [],
    tools: ['practice', 'tuner', 'mic'],
    plays: 'A bass through an audio interface, or near the microphone (by the amp). No bass yet? Play the root notes on your keyboard.',
  },
];

export const instrumentById = (id) => INSTRUMENTS.find((i) => i.id === id) || INSTRUMENTS[0];

/** The instrument a lesson course belongs to (reading belongs to piano). */
export const instrumentForCourse = (course) => INSTRUMENTS.find((i) => i.courses.includes(course))?.id || null;

/** A lesson that plays a whole song or a play-along chart: these are the instrument's songs. */
export const isSongLesson = (lesson) => lesson.steps?.some((s) => s.type === 'song' || s.type === 'chart');

/** The lesson that tunes this instrument (a sing step with tune: true), or null. */
export function tunerLesson(instrumentId) {
  return ALL_LESSONS.find((l) => l.steps?.some((s) => s.type === 'sing' && s.tune && s.instrument === instrumentId)) || null;
}

/** Rank names by share of lessons passed. */
const RANKS = [
  [0, 'New'],
  [0.15, 'Beginner'],
  [0.4, 'Improving'],
  [0.7, 'Confident'],
  [1, 'Graduate'],
];
export function rankFor(share) {
  let name = RANKS[0][1];
  for (const [min, n] of RANKS) if (share >= min) name = n;
  return name;
}

/**
 * Everything the home screen shows for one instrument and player.
 *   progress: { lessonId: stars } (that player's lessons)
 *   stage: Stage state (game.js) for song crowns; stageSongs: (part) => songs in
 *   Stage order, each with an `id` scores are kept under.
 * Returns { instrument, lessons: { done, total, stars, maxStars, share, rank },
 *   next: { lesson, course } | null, units: [{ unit, course, done, total, stars }],
 *   songs: [{ kind: 'stage'|'lesson', title, unlocked, crowns|stars, song|lesson, part|course }] }.
 */
export function instrumentHome(instrumentId, { progress = {}, stage = null, playerId = null, stageSongs = () => [], unlockAll = false } = {}) {
  const instrument = instrumentById(instrumentId);
  let done = 0;
  let total = 0;
  let stars = 0;
  let next = null;
  const units = [];
  const songs = [];
  for (const course of instrument.courses) {
    const path = pathState(progress, course);
    const byId = new Map(path.map((p) => [p.lesson.id, p]));
    for (const p of path) {
      total++;
      stars += p.stars;
      if (p.stars > 0) done++;
      else if (!next && (p.unlocked || unlockAll)) next = { lesson: p.lesson, course };
    }
    for (const unit of unitsFor(course)) {
      const entries = unit.lessons.map((l) => byId.get(l.id)).filter(Boolean);
      units.push({
        unit,
        course,
        done: entries.filter((e) => e.stars > 0).length,
        total: entries.length,
        stars: entries.reduce((a, e) => a + e.stars, 0),
        unlocked: unlockAll || entries.some((e) => e.unlocked),
      });
    }
    for (const p of path)
      if (isSongLesson(p.lesson)) songs.push({ kind: 'lesson', title: p.lesson.title, unlocked: unlockAll || p.unlocked, stars: p.stars, lesson: p.lesson, course });
  }
  if (stage && playerId)
    for (const { part, name } of instrument.stageParts) {
      const list = stageSongs(part);
      courseState(stage, list, part, playerId).forEach(({ song, crowns, unlocked }) => {
        songs.push({ kind: 'stage', title: song.title, part, partName: name, unlocked: unlockAll || unlocked, crowns, song });
      });
    }
  const share = total ? done / total : 0;
  return {
    instrument,
    lessons: { done, total, stars, maxStars: total * 3, share, rank: rankFor(share) },
    next,
    units,
    songs,
  };
}

/**
 * The few songs to show first: the next ones to play (unlocked, not yet passed),
 * then the next locked ones (so you see what's coming), then ones you've passed.
 */
export function songsToShow(songs, max = 6) {
  const passed = (s) => (s.kind === 'stage' ? s.crowns > 0 : s.stars > 0);
  const ready = songs.filter((s) => s.unlocked && !passed(s));
  const locked = songs.filter((s) => !s.unlocked);
  const done = songs.filter((s) => s.unlocked && passed(s));
  return [...ready, ...locked.slice(0, 2), ...done].slice(0, max);
}
