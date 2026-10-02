// Piano Path: a guided, step-by-step piano course (in the spirit of apps like
// Simply Piano). Units of short lessons; each lesson is a few steps:
//   info    - read a short explanation (keys light up)
//   notes   - play these notes in order, one at a time
//   chords  - play these chords (all notes held together)
//   song    - play a part of a library song in Learn mode (it waits for you)
// Stars: 3 for a clean step, fewer for mistakes. Pass a lesson to open the next.

// Note numbers: middle C = 60. Fingers: 1 thumb, 2 index, 3 middle, 4 ring, 5 pinky.
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B3 = 59;
const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55;

export const UNITS = [
  {
    id: 'meet',
    title: 'Meet the keyboard',
    icon: '🎹',
    lessons: [
      {
        id: 'middle-c',
        title: 'Find middle C',
        steps: [
          { type: 'info', keys: [C4], text: 'The black keys come in groups of two and three. Every white key just left of a group of two is a C. The C nearest the middle of your keyboard is middle C. It is lit up in yellow.' },
          { type: 'notes', text: 'Put your right thumb (finger 1) on middle C and play it 4 times.', notes: [C4, C4, C4, C4], fingers: [1, 1, 1, 1] },
        ],
      },
      {
        id: 'cde',
        title: 'C, D and E',
        steps: [
          { type: 'info', keys: [C4, D4, E4], text: 'Your right hand: thumb (1) on C, index finger (2) on D, middle finger (3) on E. Keep your fingers curved, like holding a ball.' },
          { type: 'notes', text: 'Walk up: C, D, E.', notes: [C4, D4, E4], fingers: [1, 2, 3] },
          { type: 'notes', text: 'Walk down: E, D, C.', notes: [E4, D4, C4], fingers: [3, 2, 1] },
          { type: 'notes', text: 'Up and back: C D E D C.', notes: [C4, D4, E4, D4, C4], fingers: [1, 2, 3, 2, 1] },
        ],
      },
      {
        id: 'mary',
        title: 'First song: Mary Had a Little Lamb',
        steps: [
          { type: 'info', keys: [C4, D4, E4, G4], text: 'This song uses C, D, E and one G. Keep your thumb on C. The song waits for you at every note, so take your time.' },
          { type: 'song', song: 'mary', part: '0', text: 'Play the melody with your right hand. The yellow key is next.' },
        ],
      },
    ],
  },
  {
    id: 'five',
    title: 'Five-finger position',
    icon: '🖐',
    lessons: [
      {
        id: 'cdefg',
        title: 'C D E F G',
        steps: [
          { type: 'info', keys: [C4, D4, E4, F4, G4], text: 'One finger per key: 1 on C, 2 on D, 3 on E, 4 on F, 5 (pinky) on G. This is "C position". Many songs fit right under your hand.' },
          { type: 'notes', text: 'Up the five fingers.', notes: [C4, D4, E4, F4, G4], fingers: [1, 2, 3, 4, 5] },
          { type: 'notes', text: 'And back down.', notes: [G4, F4, E4, D4, C4], fingers: [5, 4, 3, 2, 1] },
          { type: 'notes', text: 'Skipping: C E D F E G.', notes: [C4, E4, D4, F4, E4, G4], fingers: [1, 3, 2, 4, 3, 5] },
        ],
      },
      {
        id: 'joyful',
        title: 'Joyful, Joyful',
        steps: [{ type: 'song', song: 'joyful', part: '0', text: 'Beethoven\'s melody, all in C position. At the end of line 3 your pinky reaches down to G below middle C.' }],
      },
      {
        id: 'twinkle',
        title: 'Twinkle, Twinkle',
        steps: [
          { type: 'info', keys: [A4], text: 'This song reaches one key past your pinky: A. Stretch your pinky to it, then come back.' },
          { type: 'song', song: 'twinkle', part: '0', text: 'Play the melody with your right hand.' },
        ],
      },
    ],
  },
  {
    id: 'left',
    title: 'Left hand',
    icon: '🤚',
    lessons: [
      {
        id: 'lh-c',
        title: 'Left hand C position',
        steps: [
          { type: 'info', keys: [C3, D3, E3, F3, G3], text: 'Left hand fingers are numbered from the thumb too: thumb (1) on G, then 2 on F, 3 on E, 4 on D, and pinky (5) on the C below middle C.' },
          { type: 'notes', text: 'Pinky to thumb: C D E F G.', notes: [C3, D3, E3, F3, G3], fingers: [5, 4, 3, 2, 1] },
          { type: 'notes', text: 'Thumb back to pinky.', notes: [G3, F3, E3, D3, C3], fingers: [1, 2, 3, 4, 5] },
        ],
      },
      {
        id: 'bass',
        title: 'Bass notes C, F and G',
        steps: [
          { type: 'info', keys: [C3, F3, G3], text: 'The left hand often plays one low note per chord: C, F and G are the "1, 4 and 5" of the key of C, the three most common chords in church music.' },
          { type: 'notes', text: 'C, F, G, C.', notes: [C3, F3, G3, C3], fingers: [5, 2, 1, 5] },
          { type: 'notes', text: 'C, C, F, F, G, G, C.', notes: [C3, C3, F3, F3, G3, G3, C3], fingers: [5, 5, 2, 2, 1, 1, 5] },
        ],
      },
      {
        id: 'lh-song',
        title: 'Left hand chords: Jesus Loves Me',
        steps: [{ type: 'song', song: 'jesusloves', part: '1', text: 'Play the left-hand chords while the melody plays for you. Press all the yellow keys together.' }],
      },
    ],
  },
  {
    id: 'chords',
    title: 'Chords',
    icon: '🎼',
    lessons: [
      {
        id: 'c-chord',
        title: 'The C chord',
        steps: [
          { type: 'info', keys: [C4, E4, G4], text: 'A chord is three or more notes played together. C major is C, E and G: fingers 1, 3 and 5 of your right hand. Skip a key, play a key.' },
          { type: 'chords', text: 'Play the C chord 3 times (all three keys together).', chords: [[C4, E4, G4], [C4, E4, G4], [C4, E4, G4]], names: ['C', 'C', 'C'] },
        ],
      },
      {
        id: 'c-f-g',
        title: 'C, F and G chords',
        steps: [
          { type: 'info', keys: [C4, F4, A4], text: 'Church players move between chords without jumping: from C (C E G), keep your thumb on C and move up to F (C F A). For G, move your thumb down to B (B D G).' },
          { type: 'chords', text: 'C, then F.', chords: [[C4, E4, G4], [C4, F4, A4]], names: ['C', 'F'] },
          { type: 'chords', text: 'C, then G.', chords: [[C4, E4, G4], [B3, D4, G4]], names: ['C', 'G'] },
          { type: 'chords', text: 'The 1-4-1-5-1 progression: C F C G C.', chords: [[C4, E4, G4], [C4, F4, A4], [C4, E4, G4], [B3, D4, G4], [C4, E4, G4]], names: ['C', 'F', 'C', 'G', 'C'] },
        ],
      },
      {
        id: 'hymnstyle',
        title: 'Hymn style chords',
        steps: [{ type: 'song', song: 'hymnstyle', part: '0', text: 'Play the right-hand chords of a hymn-style progression in F. The bass plays for you.' }],
      },
    ],
  },
  {
    id: 'church',
    title: 'Church keys',
    icon: '⛪',
    lessons: [
      { id: 'jesus-rh', title: 'Jesus Loves Me', steps: [{ type: 'song', song: 'jesusloves', part: '0', text: 'The melody, all in C position until the chorus reaches up to high C.' }] },
      { id: 'worship', title: 'Worship Flow chords', steps: [{ type: 'song', song: 'worshipflow', part: '0', text: 'The 1-5-6-4 progression in G: G, D/F#, Em, C. Right hand plays the chords.' }] },
      { id: 'amazing', title: 'Amazing Grace', steps: [{ type: 'song', song: 'amazing', part: '0', text: 'In G major (F is F#) and 3/4 time: count 1-2-3.' }] },
      { id: 'jesus-both', title: 'Both hands: Jesus Loves Me', steps: [{ type: 'song', song: 'jesusloves', part: '0,1', text: 'Melody in the right hand, chords in the left. Go slow; the song waits for both hands.' }] },
    ],
  },
  {
    id: 'rhythm',
    title: 'Rhythm and counting',
    icon: '🥁',
    lessons: [
      {
        id: 'counting',
        title: 'Counting beats: When the Saints',
        steps: [
          { type: 'info', text: 'Notes last for beats: a quarter note is 1 beat, a half note 2, a whole note 4. "When the Saints" starts after a rest: count "1", then come in on "2".' },
          { type: 'song', song: 'saints', part: '0', text: 'Play the melody. Hold the long notes for their full count.' },
        ],
      },
      {
        id: 'silent',
        title: '3/4 time: Silent Night',
        steps: [{ type: 'song', song: 'silentnight', part: '0', text: 'Three beats in each bar: "1-2-3, 1-2-3". Feel the long-short "Si-lent" rhythm.' }],
      },
      { id: 'joyful-both', title: 'Both hands: Joyful, Joyful', steps: [{ type: 'song', song: 'joyful', part: '0,1', text: 'Your graduation song: both hands together.' }] },
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.id })));

/** Stars for an exercise step from the number of wrong notes. */
export const starsForMistakes = (mistakes, length) => (mistakes <= Math.max(0, Math.floor(length / 8)) ? 3 : mistakes <= Math.max(2, Math.floor(length / 3)) ? 2 : 1);
/** Stars for a song step from Learn-mode accuracy (0-100). */
export const starsForAccuracy = (acc) => (acc >= 90 ? 3 : acc >= 70 ? 2 : 1);

/** A lesson's stars: the average of its steps (info steps don't count), rounded down. */
export function lessonStars(stepStars) {
  const scored = stepStars.filter((s) => s > 0);
  if (!scored.length) return 3;
  return Math.max(1, Math.floor(scored.reduce((a, b) => a + b, 0) / scored.length));
}

/** Course map state for a player: [{ lesson, stars, unlocked }] in order. */
export function pathState(progress = {}) {
  let open = true;
  return ALL_LESSONS.map((lesson) => {
    const stars = progress[lesson.id] || 0;
    const entry = { lesson, stars, unlocked: open };
    open = stars > 0;
    return entry;
  });
}

/** Practice streak: days in a row with at least one lesson. `today` as 'YYYY-MM-DD'. */
export function updateStreak(record = {}, today) {
  if (record.last === today) return record;
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  return { last: today, streak: record.last === y ? (record.streak || 0) + 1 : 1 };
}

/** The streak to show today (0 if the last practice was before yesterday). */
export function currentStreak(record = {}, today) {
  if (!record.last) return 0;
  if (record.last === today) return record.streak || 0;
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return record.last === yesterday.toISOString().slice(0, 10) ? record.streak || 0 : 0;
}
