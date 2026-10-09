// Lessons: guided, step-by-step courses (in the spirit of apps like Simply
// Piano) for piano and voice. Units of short lessons; each lesson is a few steps:
//   info    - read a short explanation (keys light up)
//   notes   - play these notes in order, one at a time
//   chords  - play these chords (all notes held together)
//   song    - play a part of a library song in Learn mode (it waits for you);
//             with `voice: true` you sing it into the microphone, any octave
//   sing    - sing these notes into the microphone, holding each one in tune
//   range   - sing your lowest and highest notes to find your choir part
//   read    - a note appears on the staff (no keys lit): play or sing it.
//             `notes` in order, or `pool` + `count` for a random drill
//   hits    - hit these drums in order (an array is drums hit together)
//   groove  - a drum beat written as a grid: mode 'learn' waits for every hit,
//             mode 'time' plays along with a click and scores your timing
//   fret    - guitar/bass: play these notes ([string, fret]) in order, shown on the neck
//   strum   - guitar: strum these chords (heard by the microphone, or held on keys)
//   chart   - play along: chords (or a library song's chords) in time with a click;
//             match 'chord' for guitar, 'root' for bass (the chord's root note)
// Sing steps with `tune: true` tune an instrument's open strings.
// Info steps can show notes on the staff too (`staff: [...]`); song steps with
// `noHints` don't light the keys, so you read the music instead.
// Stars: 3 for a clean step, fewer for mistakes. Pass a lesson to open the next.
// Each course (piano, voice) opens its own lessons one at a time.

// Note numbers: middle C = 60. Fingers: 1 thumb, 2 index, 3 middle, 4 ring, 5 pinky.
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, B3 = 59;
import { writeMidi, clickBeats } from './midi-file.js';

const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, C5 = 72;

export const COURSES = [
  { id: 'piano', name: 'Piano', icon: '🎹' },
  { id: 'voice', name: 'Voice', icon: '🎤' },
  { id: 'reading', name: 'Read music', icon: '📖' },
  { id: 'drums', name: 'Drums', icon: '🥁' },
  { id: 'guitar', name: 'Guitar', icon: '🎸' },
  { id: 'bass', name: 'Bass', icon: '🎸' },
];

// Drums (General MIDI notes).
const K = 36, S = 38, H = 42, T1 = 48, T2 = 45, FT = 43, CR = 49, RD = 51;
/** Grid rows of a groove bar: row name -> drum note. */
export const GROOVE_ROWS = { kk: 36, sn: 38, ss: 37, hh: 42, ho: 46, ph: 44, cr: 49, rd: 51, t1: 48, t2: 45, ft: 43 };

// White keys in a range, for the reading drills.
const whites = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((n) => ![1, 3, 6, 8, 10].includes(n % 12));

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

  // ---- Voice ----------------------------------------------------------------
  // Sing steps count any octave, so men, women and kids all sing the same lessons.
  {
    id: 'voice-start',
    course: 'voice',
    title: 'Find your voice',
    icon: '🎤',
    lessons: [
      {
        id: 'v-breath',
        title: 'Breathing and your first note',
        steps: [
          { type: 'info', text: 'Stand or sit tall, shoulders relaxed. Breathe in low, so your belly and sides move out, not your shoulders. Let the air out slowly on "sss" for 8 counts. That steady air is what holds a note in tune.' },
          { type: 'info', text: 'Turn on the microphone (🎤 button above) and use headphones if you can. When you sing, the meter shows your note and how close you are: the needle in the middle means right in tune.' },
          { type: 'sing', notes: [C4], hear: true, text: 'Press 🔊 to hear the note, then sing "ah" on it and hold it until the bar fills up. Any octave counts.' },
          { type: 'sing', notes: [C4, C4], hear: true, hold: 1.2, text: 'Now hold it longer: twice, with a breath in between.' },
        ],
      },
      {
        id: 'v-range',
        title: 'Your range: which part do you sing?',
        steps: [
          { type: 'info', text: 'Your range is from your lowest comfortable note to your highest. In a choir it decides your part: soprano (high women and kids), alto (lower women), tenor (high men) and bass (low men). Never strain: comfortable is the goal.' },
          { type: 'range', text: 'Sing "ah" from a low, comfortable note sliding slowly up to a high one, then back down. Hold the lowest and highest for a second each.' },
        ],
      },
      {
        id: 'v-match',
        title: 'Match the note',
        steps: [
          { type: 'info', keys: [C4, E4, G4], text: 'Singing in tune is listening first. You hear a note, then match it. These are the three notes of a C chord: C, E and G.' },
          { type: 'sing', notes: [C4, E4, G4], hear: true, text: 'Listen to each note (🔊), then sing it back.' },
          { type: 'sing', notes: [G4, E4, C4], hear: true, text: 'And back down: G, E, C.' },
        ],
      },
    ],
  },
  {
    id: 'voice-scales',
    course: 'voice',
    title: 'Steps and scales',
    icon: '🎶',
    lessons: [
      {
        id: 'v-doremi',
        title: 'Do, Re, Mi, Fa, Sol',
        steps: [
          { type: 'info', keys: [C4, D4, E4, F4, G4], text: 'Singers name scale notes Do, Re, Mi, Fa, Sol, La, Ti, Do. Each one is a step up. Sing the name or just "ah".' },
          { type: 'sing', notes: [C4, D4, E4, F4, G4], hear: true, names: ['Do', 'Re', 'Mi', 'Fa', 'Sol'], text: 'Up: Do Re Mi Fa Sol.' },
          { type: 'sing', notes: [G4, F4, E4, D4, C4], hear: true, names: ['Sol', 'Fa', 'Mi', 'Re', 'Do'], text: 'Down: Sol Fa Mi Re Do.' },
        ],
      },
      {
        id: 'v-scale',
        title: 'The whole major scale',
        steps: [
          { type: 'sing', notes: [C4, D4, E4, F4, G4, A4, B4, C5], hear: true, names: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do'], text: 'All eight notes, up. Ti to Do is a small step: lean up into it.' },
          { type: 'sing', notes: [C5, B4, A4, G4, F4, E4, D4, C4], names: ['Do', 'Ti', 'La', 'Sol', 'Fa', 'Mi', 'Re', 'Do'], text: 'Now down, without the reference notes this time.' },
        ],
      },
      {
        id: 'v-leaps',
        title: 'Leaps: 1, 3, 5',
        steps: [
          { type: 'info', keys: [C4, E4, G4, C5], text: 'Melodies jump, too. "Do Mi Sol Do" skips notes: hear the next note in your head before you sing it.' },
          { type: 'sing', notes: [C4, E4, G4, C5, G4, E4, C4], hear: true, names: ['Do', 'Mi', 'Sol', 'Do', 'Sol', 'Mi', 'Do'], text: 'Do Mi Sol Do, and back.' },
        ],
      },
    ],
  },
  {
    id: 'voice-songs',
    course: 'voice',
    title: 'Sing a song',
    icon: '⛪',
    lessons: [
      { id: 'v-jesus', title: 'Sing: Jesus Loves Me', steps: [{ type: 'song', song: 'jesusloves', part: '0', voice: true, text: 'Sing the melody with the microphone on. The song waits for each note: any octave counts. (No mic? Play it on the keys.)' }] },
      { id: 'v-amazing', title: 'Sing: Amazing Grace', steps: [{ type: 'song', song: 'amazing', part: '0', voice: true, text: '3/4 time, long notes: let each one ring and breathe at the ends of the lines.' }] },
      { id: 'v-silent', title: 'Sing: Silent Night', steps: [{ type: 'song', song: 'silentnight', part: '0', voice: true, text: 'Soft and steady. Keep the long "Si-lent" notes in tune all the way through.' }] },
    ],
  },
  {
    id: 'voice-harmony',
    course: 'voice',
    title: 'Harmony and choir parts',
    icon: '🎼',
    lessons: [
      {
        id: 'v-amen',
        title: 'Four-part "Amen"',
        steps: [
          { type: 'info', keys: [F3, A3, C4, C3, E3, G3], text: 'A choir sings four parts at once: soprano (melody), alto, tenor and bass. Here is the "Amen" at the end of a hymn. Learn every part; then your family can sing it together.' },
          { type: 'sing', notes: [C4, C4], hear: true, names: ['A-', 'men'], text: 'Soprano: C, C (the melody).' },
          { type: 'sing', notes: [A3, G3], hear: true, names: ['A-', 'men'], text: 'Alto: A down to G.' },
          { type: 'sing', notes: [F3, E3], hear: true, names: ['A-', 'men'], text: 'Tenor: F down to E.' },
          { type: 'sing', notes: [F3, C3], hear: true, names: ['A-', 'men'], text: 'Bass: F down to C.' },
        ],
      },
      {
        id: 'v-parts',
        title: 'Your part in any song',
        steps: [
          { type: 'info', text: 'Open a song, then the 🎙 Vocal Booth. "Make choir parts" writes soprano, alto, tenor and bass for it (one chord under every melody note, hymn style) and plays it with the choir sound.' },
          { type: 'info', text: 'In the Booth, pick your part and press "Learn my part": the song waits for you to sing each note, like the song lessons. The live pitch line shows you sliding into each note, like Melodyne.' },
          { type: 'info', text: 'Download the choir MIDI: four named tracks for Logic, ACE Studio or a choir library like Spitfire\'s choirs. Always check the parts by ear: the harmony is a good start, not a hymnal.' },
        ],
      },
    ],
  },
  {
    id: 'voice-production',
    course: 'voice',
    title: 'Vocal production in Logic',
    icon: '🎛',
    lessons: [
      {
        id: 'v-record',
        title: 'Recording a vocal',
        steps: [
          { type: 'info', text: 'Mic about a hand-width away (with a pop filter), headphones on so the track doesn\'t leak into the mic. In Logic: create an Audio track, choose your interface input and turn on Input Monitoring.' },
          { type: 'info', text: 'Set the interface gain so your loudest singing peaks around -12 dB on Logic\'s meter: never in the red. Room matters more than the mic: a closet of clothes beats a bare room.' },
          { type: 'info', text: 'Record 3 or 4 full takes (Cycle mode records them as a take folder), then swipe the best phrase from each (Quick Swipe Comping). Fixing pitch comes after: start from a good take.' },
        ],
      },
      {
        id: 'v-flex',
        title: 'Flex Pitch: Logic\'s Melodyne',
        steps: [
          { type: 'info', text: 'Flex Pitch is built into Logic and works like Melodyne: every sung note becomes a blob you can drag. Turn on Flex (Cmd-F), set the track\'s Flex mode to Flex Pitch, then double-click the region.' },
          { type: 'info', text: 'Drag a blob up or down to change the note. The handles on a blob fix drift (pitch moving inside a note), vibrato, gain and the slide between notes. Double-clicking a blob snaps it to the exact note.' },
          { type: 'info', text: 'Gospel tip: fix only the notes that are clearly off and leave the slides, runs and vibrato alone. Snapping everything to perfect pitch takes the soul out.' },
        ],
      },
      {
        id: 'v-tune',
        title: 'Pitch Correction: Logic\'s Auto-Tune',
        steps: [
          { type: 'info', text: 'Pitch Correction is Logic\'s Auto-Tune-style plug-in: it corrects while the track plays. Insert it on the vocal, set the Root and Scale to the song\'s key (Amazing Grace in G: G major).' },
          { type: 'info', text: 'Response sets how fast it corrects: slow (around 100 ms) sounds natural, 0 ms is the robotic "T-Pain" effect. Use the keyboard in the plug-in to turn off notes the song never uses.' },
          { type: 'info', text: 'Live use: it works on stage too, but the singer still has to be close. It can\'t fix a note that\'s a whole step off without sounding strange.' },
        ],
      },
      {
        id: 'v-pro',
        title: 'Melodyne, Auto-Tune, OVox, AVOX and ACE Studio',
        steps: [
          { type: 'info', text: 'Melodyne (Celemony) is the deep editor: like Flex Pitch with more control, and it opens right in Logic\'s track (ARA). Auto-Tune (Antares) is the classic real-time tuner: Pro and Artist for studio and stage, plus EFX for the hard-tune sound.' },
          { type: 'info', text: 'AVOX (Antares) is a set of vocal tools: Harmony Engine and Choir make extra voices from one singer, Duo doubles a part, Throat changes the tone of the voice. OVox (Waves) turns your voice into a vocoder, talkbox or synth-harmony sound that follows the chords you play.' },
          { type: 'info', text: 'ACE Studio is an AI singer: give it MIDI notes and type the lyrics, pick a voice, and it sings the part. Export choir parts from the Vocal Booth, import the MIDI into ACE Studio, and bring the rendered voices back into Logic as audio tracks.' },
          { type: 'info', text: 'These are commercial apps from their makers (not included with Knight Keys). Everything in these lessons also works with Logic\'s own Flex Pitch and Pitch Correction.' },
        ],
      },
    ],
  },

  // ---- Reading music -----------------------------------------------------------
  // A note shows on the staff and the keys stay dark: you find it by reading.
  {
    id: 'read-treble',
    course: 'reading',
    title: 'The treble clef (right hand)',
    icon: '🎼',
    lessons: [
      {
        id: 'r-staff',
        title: 'The staff and middle C',
        steps: [
          { type: 'info', text: 'Music is written on a staff: 5 lines and the 4 spaces between them. The higher a note sits on the staff, the higher it sounds. Each line and each space is one white key.' },
          { type: 'info', staff: [C4, G4, C5], text: 'The treble clef (top staff, the curly sign) is for the right hand. Its curl wraps around the second line from the bottom: that line is G. Middle C sits on its own short line below the staff. High C is in the third space.' },
          { type: 'read', notes: [C4, G4, C5, G4, C4], text: 'Play the note you see on the staff. The keys won\'t light up: read it!' },
        ],
      },
      {
        id: 'r-lines',
        title: 'Lines: Every Good Boy Does Fine',
        steps: [
          { type: 'info', staff: [E4, G4, B4, D4 + 12, F4 + 12], text: 'The five lines of the treble staff, bottom to top, are E, G, B, D, F: "Every Good Boy Does Fine".' },
          { type: 'read', notes: [E4, G4, B4, D4 + 12, F4 + 12], text: 'Up the lines: E G B D F.' },
          { type: 'read', pool: [E4, G4, B4, D4 + 12, F4 + 12], count: 8, text: 'Mixed up. Count lines from the bottom if you need to.' },
        ],
      },
      {
        id: 'r-spaces',
        title: 'Spaces spell FACE',
        steps: [
          { type: 'info', staff: [F4, A4, C5, E4 + 12], text: 'The four spaces, bottom to top, spell F A C E: "FACE".' },
          { type: 'read', notes: [F4, A4, C5, E4 + 12], text: 'Up the spaces: F A C E.' },
          { type: 'read', pool: [F4, A4, C5, E4 + 12], count: 8, text: 'Mixed up.' },
        ],
      },
      {
        id: 'r-treble-mix',
        title: 'Treble clef drill',
        steps: [{ type: 'read', pool: whites(C4, G4 + 12), count: 12, text: 'Lines and spaces together, from middle C to high G. Take your time: accuracy first, speed later.' }],
      },
    ],
  },
  {
    id: 'read-bass',
    course: 'reading',
    title: 'The bass clef (left hand)',
    icon: '🎼',
    lessons: [
      {
        id: 'r-bass',
        title: 'Bass clef landmarks',
        steps: [
          { type: 'info', staff: [F3, C3, C4], clef: 'bass', text: 'The bass clef (bottom staff) is for the left hand. Its two dots surround the fourth line: that line is F, below middle C. C is in the second space. Middle C sits on a short line above the bass staff.' },
          { type: 'read', notes: [F3, C3, F3, C3], clef: 'bass', text: 'Play F and C from the bass staff.' },
        ],
      },
      {
        id: 'r-bass-lines',
        title: 'Lines: Good Boys Do Fine Always',
        steps: [
          { type: 'info', staff: [43, 47, D3, F3, A3], clef: 'bass', text: 'Bass staff lines, bottom to top: G, B, D, F, A: "Good Boys Do Fine Always".' },
          { type: 'read', notes: [43, 47, D3, F3, A3], clef: 'bass', text: 'Up the lines.' },
          { type: 'read', pool: [43, 47, D3, F3, A3], count: 8, clef: 'bass', text: 'Mixed up.' },
        ],
      },
      {
        id: 'r-bass-spaces',
        title: 'Spaces: All Cows Eat Grass',
        steps: [
          { type: 'info', staff: [45, C3, E3, G3], clef: 'bass', text: 'Bass staff spaces, bottom to top: A, C, E, G: "All Cows Eat Grass".' },
          { type: 'read', notes: [45, C3, E3, G3], clef: 'bass', text: 'Up the spaces.' },
          { type: 'read', pool: whites(43, 57), count: 12, clef: 'bass', text: 'The whole bass staff, lines and spaces.' },
        ],
      },
    ],
  },
  {
    id: 'read-more',
    course: 'reading',
    title: 'Sharps, flats and rhythm',
    icon: '♯',
    lessons: [
      {
        id: 'r-sharps',
        title: 'Sharps and flats',
        steps: [
          { type: 'info', staff: [F4 + 1, B4 - 1], text: 'A sharp (♯) means the very next key up, usually a black key: F♯ is just right of F. A flat (♭) is the very next key down: B♭ is just left of B.' },
          { type: 'read', notes: [F4 + 1, B4 - 1, C4 + 1, E4 - 1, G4 + 1], text: 'Play the sharps and flats you see.' },
        ],
      },
      {
        id: 'r-keysig',
        title: 'Key signatures',
        steps: [
          { type: 'info', staff: [G4, F4 + 1], sf: 1, text: 'A sharp at the start of every line is the key signature: here one sharp on the F line means every F in the song is F♯ (the key of G, like Amazing Grace), even with no sign beside the note.' },
          { type: 'read', notes: [G4, A4, B4, C5, D4 + 12, F4 + 13, G4 + 12], sf: 1, text: 'The G major scale, reading with the key signature: remember F♯!' },
        ],
      },
      {
        id: 'r-rhythm',
        title: 'Note lengths and counting',
        steps: [
          { type: 'info', text: 'The shape of a note shows how long it lasts. Whole note (open, no stem): 4 beats. Half note (open, with a stem): 2 beats. Quarter note (filled in): 1 beat. Eighth notes (with a flag or a beam): half a beat each.' },
          { type: 'info', text: 'The time signature at the start says how to count: 4/4 is 4 quarter-note beats in every bar ("1 2 3 4"); 3/4 is 3 ("1 2 3", like Amazing Grace and Silent Night). A dot after a note adds half its length. A curved line (a tie) joins two notes into one long one.' },
          { type: 'info', text: 'Rests are silences of the same lengths. Open the 📜 Score window with any song to see all of this in real music; it follows along while the song plays.' },
        ],
      },
    ],
  },
  {
    id: 'read-songs',
    course: 'reading',
    title: 'Read and play songs',
    icon: '📜',
    lessons: [
      { id: 'r-mary', title: 'Read: Mary Had a Little Lamb', steps: [{ type: 'song', song: 'mary', part: '0', noHints: true, text: 'No lit keys this time: read the notes on the score panel and play them. The song waits for you.' }] },
      { id: 'r-joyful', title: 'Read: Joyful, Joyful', steps: [{ type: 'song', song: 'joyful', part: '0', noHints: true, text: 'Read the melody from the staff. Tip: open 📜 Score to see the whole song as sheet music.' }] },
      { id: 'r-jesus-lh', title: 'Read: bass clef chords', steps: [{ type: 'song', song: 'jesusloves', part: '1', noHints: true, text: 'Left hand, read from the bass staff: the chords of Jesus Loves Me.' }] },
    ],
  },

  // ---- Drums ---------------------------------------------------------------
  // Hit steps take any note of the right drum (snare rim = snare, hi-hat edge =
  // hi-hat), so e-kits like the Alesis Nitro Max and the on-screen pads both work.
  {
    id: 'drums-kit',
    course: 'drums',
    title: 'Meet the kit',
    icon: '🥁',
    lessons: [
      {
        id: 'd-kit',
        title: 'Kick, snare and hi-hat',
        steps: [
          { type: 'info', text: 'Sit so your thighs are level and you can reach every pad. Right foot on the kick pedal, left foot on the hi-hat pedal. Hold the sticks loosely between thumb and first finger, about a third of the way up, and let them bounce.' },
          { type: 'info', text: 'The three drums of almost every beat: the kick (bass drum, right foot) is the low "boom", the snare (in front of you) is the "crack", and the hi-hat (left, two cymbals on a stand) keeps time with "tick tick tick".' },
          { type: 'hits', hits: [K, K, K, K], text: 'Kick: press the pedal with your right foot, 4 times. Let the beater bounce back off the head.' },
          { type: 'hits', hits: [S, S, S, S], text: 'Snare: hit the middle of the snare pad 4 times, right stick.' },
          { type: 'hits', hits: [H, H, H, H], text: 'Hi-hat: hit the hi-hat 4 times with your right stick, crossing over your left hand.' },
        ],
      },
      {
        id: 'd-toms',
        title: 'Toms and cymbals',
        steps: [
          { type: 'info', text: 'The toms are the round drums above the kick and on your right: tom 1 is the highest, the floor tom the lowest. The crash (left, high) is the big accent cymbal; the ride (right) is for steady time in bigger parts of a song.' },
          { type: 'hits', hits: [T1, T2, FT], text: 'Down the toms: tom 1, tom 2, floor tom.' },
          { type: 'hits', hits: [FT, T2, T1], text: 'And back up.' },
          { type: 'hits', hits: [CR, RD, CR, RD], text: 'Crash, ride, crash, ride.' },
          { type: 'hits', hits: [[K, CR], [K, CR]], text: 'The big accent: kick and crash at the same time. Twice.' },
        ],
      },
      {
        id: 'd-sticking',
        title: 'Sticking: right, left',
        steps: [
          { type: 'info', text: 'Drummers write which hand plays each note: R for right, L for left. "Single strokes" go R L R L. Keep both sticks at the same height so every hit sounds the same.' },
          { type: 'hits', hits: [S, S, S, S, S, S, S, S], sticking: 'RLRLRLRL', text: 'Single strokes on the snare: R L R L R L R L.' },
          { type: 'hits', hits: [S, S, T1, T1, T2, T2, FT, FT], sticking: 'RLRLRLRL', text: 'Around the kit, two hits per drum: snare, tom 1, tom 2, floor tom.' },
        ],
      },
    ],
  },
  {
    id: 'drums-beats',
    course: 'drums',
    title: 'Your first beats',
    icon: '🎵',
    lessons: [
      {
        id: 'd-quarter',
        title: 'Kick and snare: 1 2 3 4',
        steps: [
          { type: 'info', text: 'Count "1 2 3 4" out loud. Kick on 1 and 3, snare on 2 and 4: "boom crack boom crack". The snare on 2 and 4 is the backbeat, the heartbeat of most songs.' },
          { type: 'groove', mode: 'learn', bpm: 60, bars: [{ steps: 4, kk: 'x.x.', sn: '.x.x' }], repeat: 2, text: 'Learn it: the beat waits for every hit. Follow the highway.' },
          { type: 'groove', mode: 'time', bpm: 60, bars: [{ steps: 4, kk: 'x.x.', sn: '.x.x' }], repeat: 4, text: 'Now in time with the click (one bar of clicks first). Stay with the click!' },
        ],
      },
      {
        id: 'd-rock',
        title: 'The basic beat (8 hi-hats)',
        steps: [
          { type: 'info', text: 'Add the hi-hat on every "1 and 2 and 3 and 4 and" (8 per bar) with your right hand. Kick on 1 and 3, snare on 2 and 4 with your left hand. This one beat plays thousands of songs.' },
          { type: 'groove', mode: 'learn', bpm: 60, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }], repeat: 2, text: 'Learn it slowly. Hands and foot land together on 1, 2, 3 and 4.' },
          { type: 'groove', mode: 'time', bpm: 66, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }], repeat: 4, text: 'Play it in time.' },
        ],
      },
      {
        id: 'd-worship',
        title: 'Worship beat',
        steps: [
          { type: 'info', text: 'Modern worship songs push the kick: 1, the "and" of 2, and 3. Count "1 and 2 AND 3 and 4 and" and kick on the bold ones.' },
          { type: 'groove', mode: 'learn', bpm: 66, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x..xx...', sn: '..x...x.' }], repeat: 2, text: 'Learn the worship beat.' },
          { type: 'groove', mode: 'time', bpm: 72, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x..xx...', sn: '..x...x.' }], repeat: 4, text: 'Play it in time.' },
        ],
      },
    ],
  },
  {
    id: 'drums-fills',
    course: 'drums',
    title: 'Crashes and fills',
    icon: '💥',
    lessons: [
      {
        id: 'd-crash',
        title: 'Crash on 1',
        steps: [
          { type: 'info', text: 'A new part of a song (verse to chorus) starts with a crash and kick together on beat 1, instead of the hi-hat.' },
          { type: 'groove', mode: 'time', bpm: 66, bars: [{ steps: 8, cr: 'x.......', hh: '.xxxxxxx', kk: 'x...x...', sn: '..x...x.' }, { steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }], repeat: 2, text: 'Crash on the first beat, then the basic beat. Twice.' },
        ],
      },
      {
        id: 'd-fill1',
        title: 'Your first fill',
        steps: [
          { type: 'info', text: 'A fill is a short break that leads into the next part. The easiest: play the beat for 3 beats, then four snare hits on "4 and" (R L R L as 16ths: "4 e and a"), then crash on 1.' },
          { type: 'groove', mode: 'learn', bpm: 60, bars: [{ steps: 16, hh: 'x.x.x.x.x.x.....', kk: 'x.......x.......', sn: '....x.......xxxx' }, { steps: 16, cr: 'x...............', kk: 'x...............' }], repeat: 1, text: 'Learn it: beat, fill, crash.' },
          { type: 'groove', mode: 'time', bpm: 60, bars: [{ steps: 16, hh: 'x.x.x.x.x.x.x.x.', kk: 'x.......x.......', sn: '....x.......x...' }, { steps: 16, hh: 'x.x.x.x.x.x.....', kk: 'x.......x.......', sn: '....x.......xxxx' }, { steps: 16, cr: 'x...............', kk: 'x...............' }], repeat: 1, text: 'One bar of beat, one bar with the fill, crash.' },
        ],
      },
      {
        id: 'd-tomfill',
        title: 'Around the toms',
        steps: [
          { type: 'groove', mode: 'learn', bpm: 60, bars: [{ steps: 8, sn: 'xx', t1: '..xx', t2: '....xx', ft: '......xx' }, { steps: 8, cr: 'x', kk: 'x' }], repeat: 1, text: 'Eighth notes around the kit: snare, snare, tom 1, tom 1, tom 2, tom 2, floor, floor, then crash.' },
          { type: 'groove', mode: 'time', bpm: 66, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }, { steps: 8, sn: 'xx', t1: '..xx', t2: '....xx', ft: '......xx' }, { steps: 8, cr: 'x', kk: 'x' }], repeat: 1, text: 'Beat, tom fill, crash: in time.' },
        ],
      },
    ],
  },
  {
    id: 'drums-church',
    course: 'drums',
    title: 'Church grooves',
    icon: '⛪',
    lessons: [
      {
        id: 'd-hymn',
        title: 'Hymn in 3/4',
        steps: [
          { type: 'info', text: 'Amazing Grace and Silent Night are in 3/4: count "1 2 3". Kick on 1, cross-stick (stick laid across the snare, hitting the rim) or snare on 2 and 3, hi-hat on every beat. Play soft: support the singers.' },
          { type: 'groove', mode: 'learn', bpm: 66, time: [3, 4], bars: [{ steps: 3, hh: 'xxx', kk: 'x..', ss: '.xx' }], repeat: 2, text: 'Learn the hymn waltz.' },
          { type: 'groove', mode: 'time', bpm: 72, time: [3, 4], bars: [{ steps: 3, hh: 'xxx', kk: 'x..', ss: '.xx' }], repeat: 4, text: 'Play it in time.' },
        ],
      },
      {
        id: 'd-shuffle',
        title: 'Gospel shuffle',
        steps: [
          { type: 'info', text: 'The shuffle swings: each beat splits in three ("1 trip-let") and the hi-hat plays the first and last: "1 . a 2 . a". Kick on 1 and 3, snare on 2 and 4. It\'s the bounce of a lot of gospel and blues.' },
          { type: 'groove', mode: 'learn', bpm: 66, bars: [{ steps: 12, hh: 'x.xx.xx.xx.x', kk: 'x.....x.....', sn: '...x.....x..' }], repeat: 2, text: 'Learn the shuffle.' },
          { type: 'groove', mode: 'time', bpm: 72, bars: [{ steps: 12, hh: 'x.xx.xx.xx.x', kk: 'x.....x.....', sn: '...x.....x..' }], repeat: 4, text: 'Play it in time: feel the bounce.' },
        ],
      },
      {
        id: 'd-twostep',
        title: 'Gospel two-step',
        steps: [
          { type: 'info', text: 'The praise-break feel: kick on every beat ("four on the floor"), snare on 2 and 4, hi-hats in 8ths. Start slow; in church it can go very fast.' },
          { type: 'groove', mode: 'learn', bpm: 72, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x.x.x.x.', sn: '..x...x.' }], repeat: 2, text: 'Learn the two-step.' },
          { type: 'groove', mode: 'time', bpm: 88, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x.x.x.x.', sn: '..x...x.' }], repeat: 4, text: 'In time. Speed it up later on Stage.' },
        ],
      },
      { id: 'd-song-jesus', title: 'Drums for a song: Jesus Loves Me', steps: [{ type: 'song', song: 'jesusloves', part: '9', text: 'Play the drum part of a whole song. It waits for every hit, so learn it at your own speed; then try it on Stage.' }] },
      { id: 'd-song-amazing', title: 'Drums for a song: Amazing Grace', steps: [{ type: 'song', song: 'amazing', part: '9', text: 'The hymn waltz in a real song: 3/4, soft and steady.' }] },
    ],
  },
  {
    id: 'drums-color',
    course: 'drums',
    title: 'Colour and control',
    icon: '🎨',
    lessons: [
      {
        id: 'd-openhat',
        title: 'Open hi-hat',
        steps: [
          { type: 'info', text: 'Lift your left foot a little and the two hi-hat cymbals open: a longer "tssss". Open it for the "and" of 4, the last hit of the bar, then press your foot down again right on the next 1 to close it.' },
          { type: 'groove', mode: 'learn', bpm: 60, bars: [{ steps: 8, hh: 'xxxxxxx.', ho: '.......x', kk: 'x...x...', sn: '..x...x.' }], repeat: 2, text: 'The basic beat with an open hi-hat on the "and" of 4.' },
          { type: 'groove', mode: 'time', bpm: 66, bars: [{ steps: 8, hh: 'xxxxxxx.', ho: '.......x', kk: 'x...x...', sn: '..x...x.' }], repeat: 4, text: 'In time: open on the "and" of 4, closed on 1.' },
        ],
      },
      {
        id: 'd-ride',
        title: 'Ride for the chorus',
        steps: [
          { type: 'info', text: 'Verses are often on the hi-hat; the chorus moves to the ride cymbal on your right for a bigger, wider sound. Same beat, your right hand just changes cymbals. Start the chorus with a crash on 1.' },
          { type: 'groove', mode: 'learn', bpm: 66, bars: [{ steps: 8, rd: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }], repeat: 2, text: 'The basic beat on the ride.' },
          { type: 'groove', mode: 'time', bpm: 66, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }, { steps: 8, cr: 'x.......', rd: '.xxxxxxx', kk: 'x...x...', sn: '..x...x.' }], repeat: 2, text: 'A bar on the hi-hat (verse), then crash into the ride (chorus).' },
        ],
      },
      {
        id: 'd-16ths',
        title: 'Sixteenth-note hi-hats',
        steps: [
          { type: 'info', text: 'Sixteenths: four hi-hats per beat. Count "1 e and a, 2 e and a". At slow tempos play them with your right hand; snare on 2 and 4, kick on 1 and 3. It makes a slow song feel busy and alive.' },
          { type: 'groove', mode: 'learn', bpm: 50, bars: [{ steps: 16, hh: 'xxxxxxxxxxxxxxxx', kk: 'x.......x.......', sn: '....x.......x...' }], repeat: 2, text: 'Learn it slowly: 16 hi-hats per bar.' },
          { type: 'groove', mode: 'time', bpm: 56, bars: [{ steps: 16, hh: 'xxxxxxxxxxxxxxxx', kk: 'x.......x.......', sn: '....x.......x...' }], repeat: 4, text: 'In time. Keep the hi-hats even and light.' },
        ],
      },
      {
        id: 'd-accents',
        title: 'Accents',
        steps: [
          { type: 'info', text: 'An accent is one note played louder than the rest. Sixteenths on the snare, R L R L, with an accent on every beat: the "1", "2", "3" and "4" are loud (stick starts high), the "e and a" are soft (stick starts low).' },
          { type: 'groove', mode: 'learn', bpm: 56, bars: [{ steps: 16, sn: 'XxxxXxxxXxxxXxxx' }], repeat: 2, text: 'Learn it: loud, soft, soft, soft. The app checks your timing; your ears check the accents.' },
          { type: 'groove', mode: 'time', bpm: 62, bars: [{ steps: 16, sn: 'XxxxXxxxXxxxXxxx' }], repeat: 4, text: 'In time with the click.' },
        ],
      },
    ],
  },
  {
    id: 'drums-church2',
    course: 'drums',
    title: 'More church drumming',
    icon: '🙌',
    lessons: [
      {
        id: 'd-68',
        title: 'The 6/8 worship ballad',
        steps: [
          { type: 'info', text: 'Many slow worship songs and altar calls are in 6/8: count "1 2 3 4 5 6", felt in two big beats (1 and 4). Hi-hat on all six, kick on 1, snare on 4. Let it breathe.' },
          { type: 'groove', mode: 'learn', bpm: 60, time: [6, 8], bars: [{ steps: 6, hh: 'xxxxxx', kk: 'x.....', sn: '...x..' }], repeat: 2, text: 'Learn the 6/8 groove.' },
          { type: 'groove', mode: 'time', bpm: 66, time: [6, 8], bars: [{ steps: 6, hh: 'xxxxxx', kk: 'x.....', sn: '...x..' }], repeat: 4, text: 'In time: the click pulses on 1 and 4.' },
        ],
      },
      {
        id: 'd-stops',
        title: 'Hits and stops',
        steps: [
          { type: 'info', text: 'Bands love "hits": everyone plays the same notes together, then stops. You play kick and crash on the hits and leave the silence empty. Here: 1 and the "and" of 2, then nothing until the next bar.' },
          { type: 'groove', mode: 'learn', bpm: 60, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }, { steps: 8, cr: 'x..x....', kk: 'x..x....' }], repeat: 1, text: 'A bar of beat, then the two hits.' },
          { type: 'groove', mode: 'time', bpm: 66, bars: [{ steps: 8, hh: 'xxxxxxxx', kk: 'x...x...', sn: '..x...x.' }, { steps: 8, cr: 'x..x....', kk: 'x..x....' }], repeat: 3, text: 'In time. Count through the silence: don\'t rush back in.' },
        ],
      },
      { id: 'd-song-saints', title: 'Drums for a song: When the Saints', steps: [{ type: 'song', song: 'saints', part: '9', text: 'A bright, happy church song. It waits for every hit; then speed it up on Stage.' }] },
      { id: 'd-song-praise', title: 'Drums for a song: Praise Break', steps: [{ type: 'song', song: 'praisebreak', part: '9', text: 'The shout music: the two-step at full energy. Learn it here at your own speed, then take it to Stage.' }] },
    ],
  },

  // ---- Guitar ------------------------------------------------------------------
  // The microphone hears single notes and strummed chords (acoustic guitar, or an
  // electric through an amp or interface). Strings: 1 = thinnest (high E), 6 = thickest.
  {
    id: 'guitar-start',
    course: 'guitar',
    title: 'Getting started',
    icon: '🎸',
    lessons: [
      {
        id: 'g-tune',
        title: 'Hold it and tune it',
        steps: [
          { type: 'info', text: 'Sit with the guitar\'s body on your right leg, the neck pointing left and a little up. Your left hand presses the strings on the neck (thumb behind it); your right hand strums or picks over the sound hole.' },
          { type: 'info', fretboard: { instrument: 'guitar', open: [1, 2, 3, 4, 5, 6] }, text: 'The six strings, from the thickest (6, low E) to the thinnest (1, high E): E A D G B E. Remember them with "Eddie Ate Dynamite, Good Bye Eddie".' },
          { type: 'sing', tune: true, instrument: 'guitar', notes: [40, 45, 50, 55, 59, 64], names: ['6 E', '5 A', '4 D', '3 G', '2 B', '1 E'], hear: true, hold: 1, tolerance: 12, text: 'Tune each string: pluck it and turn its tuning peg slowly until the needle sits in the middle. Turn the microphone on first (🎤).' },
        ],
      },
      {
        id: 'g-open',
        title: 'The open strings',
        steps: [
          { type: 'info', fretboard: { instrument: 'guitar', open: [1, 2, 3, 4, 5, 6] }, text: 'An "open" string is played without pressing any fret. Pick one string at a time with your right thumb or a pick, and let it ring.' },
          { type: 'fret', instrument: 'guitar', notes: [[6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0]], text: 'Pick each open string, thickest to thinnest: E A D G B E.' },
          { type: 'fret', instrument: 'guitar', notes: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]], text: 'And back: thinnest to thickest.' },
        ],
      },
    ],
  },
  {
    id: 'guitar-notes',
    course: 'guitar',
    title: 'First notes and melodies',
    icon: '🎶',
    lessons: [
      {
        id: 'g-frets',
        title: 'Frets 1 and 3',
        steps: [
          { type: 'info', fretboard: { instrument: 'guitar', dots: [[1, 1, 1], [1, 3, 3]] }, text: 'Press just behind the metal fret wire with the tip of your finger. Finger 1 (index) plays fret 1, finger 3 (ring) plays fret 3. High E string: open is E, fret 1 is F, fret 3 is G.' },
          { type: 'fret', instrument: 'guitar', notes: [[1, 0], [1, 1], [1, 3], [1, 1], [1, 0]], fingers: [0, 1, 3, 1, 0], text: 'E F G F E on the high E string.' },
          { type: 'fret', instrument: 'guitar', notes: [[2, 0], [2, 1], [2, 3], [2, 1], [2, 0]], fingers: [0, 1, 3, 1, 0], text: 'Same on the B string: B C D C B.' },
        ],
      },
      {
        id: 'g-mary',
        title: 'Melody: Mary Had a Little Lamb',
        steps: [{ type: 'fret', instrument: 'guitar', notes: [[1, 0], [2, 3], [2, 1], [2, 3], [1, 0], [1, 0], [1, 0], [2, 3], [2, 3], [2, 3], [1, 0], [1, 3], [1, 3]], fingers: [0, 3, 1, 3, 0, 0, 0, 3, 3, 3, 0, 3, 3], text: 'E D C D E E E, D D D, E G G: high E and B strings.' }],
      },
      {
        id: 'g-joyful',
        title: 'Melody: Joyful, Joyful',
        steps: [{ type: 'fret', instrument: 'guitar', notes: [[1, 0], [1, 0], [1, 1], [1, 3], [1, 3], [1, 1], [1, 0], [2, 3], [2, 1], [2, 1], [2, 3], [1, 0], [1, 0], [2, 3], [2, 3]], fingers: [0, 0, 1, 3, 3, 1, 0, 3, 1, 1, 3, 0, 0, 3, 3], text: 'Beethoven\'s "Ode to Joy" melody, the tune of Joyful, Joyful, We Adore Thee.' }],
      },
    ],
  },
  {
    id: 'guitar-chords',
    course: 'guitar',
    title: 'First chords',
    icon: '🎼',
    lessons: [
      {
        id: 'g-em',
        title: 'E minor and A minor',
        steps: [
          { type: 'info', chord: 'Em', text: 'Em, the easiest chord: fingers 2 and 3 on the 2nd fret of the A and D strings. Strum all six strings, top to bottom.' },
          { type: 'strum', chords: ['Em', 'Em'], text: 'Strum Em, let it ring, strum it again.' },
          { type: 'info', chord: 'Am', text: 'Am: the same shape moved down one string, plus finger 1 on the 1st fret of the B string. Don\'t play the low E string (×).' },
          { type: 'strum', chords: ['Am', 'Em', 'Am', 'Em'], text: 'Change between Am and Em.' },
        ],
      },
      {
        id: 'g-gcd',
        title: 'G, C and D',
        steps: [
          { type: 'info', chord: 'G', text: 'G: three fingers spread wide. Low E 3rd fret (finger 2), A 2nd fret (finger 1), high E 3rd fret (finger 3).' },
          { type: 'strum', chords: ['G', 'G'], text: 'Strum G twice.' },
          { type: 'info', chord: 'C', text: 'C: fingers 3, 2, 1 step down from the A string: A 3rd fret, D 2nd fret, B 1st fret. Skip the low E string.' },
          { type: 'strum', chords: ['C', 'G', 'C', 'G'], text: 'C to G and back.' },
          { type: 'info', chord: 'D', text: 'D: a small triangle on the top three strings (G 2nd, high E 2nd, B 3rd). Strum only the top four strings.' },
          { type: 'strum', chords: ['G', 'C', 'D', 'G'], text: 'G, C, D, G: the three chords of hundreds of hymns and worship songs.' },
        ],
      },
      {
        id: 'g-worship4',
        title: 'The worship four: G D Em C',
        steps: [
          { type: 'info', chord: 'D/F#', text: 'Worship players often use D/F#: a D chord with your thumb (or finger 1) on the 2nd fret of the low E string, so the bass walks down G, F#, E. Plain D works too.' },
          { type: 'strum', chords: ['G', 'D', 'Em', 'C'], text: 'The 1-5-6-4 progression in G: G, D, Em, C.' },
        ],
      },
    ],
  },
  {
    id: 'guitar-playalong',
    course: 'guitar',
    title: 'Strum along in time',
    icon: '⏱',
    lessons: [
      {
        id: 'g-strum-em-am',
        title: 'Strumming on the beat',
        steps: [
          { type: 'info', text: 'Strum down on every beat: "1 2 3 4". Keep your strumming hand moving like a pendulum even between chords, and change chords on beat 4 so the new one is ready on 1.' },
          { type: 'chart', match: 'chord', chords: ['Em', 'Am', 'Em', 'Am'], beats: 4, bpm: 60, text: 'Em and Am, one bar each, with the click. The chord to play lights up.' },
        ],
      },
      {
        id: 'g-strum-gcd',
        title: 'G, C, D in time',
        steps: [{ type: 'chart', match: 'chord', chords: ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'], beats: 4, bpm: 66, text: 'Eight bars, one chord each. Change on beat 4!' }],
      },
      {
        id: 'g-worship-flow',
        title: 'Play along: Worship Flow',
        steps: [{ type: 'chart', match: 'chord', song: 'worshipflow', bpm: 66, text: 'The 1-5-6-4 worship progression from the song library: G, D/F#, Em, C, then the chorus.' }],
      },
      {
        id: 'g-amazing',
        title: 'Play along: Amazing Grace',
        steps: [
          { type: 'info', text: 'Amazing Grace is in 3/4: strum "DOWN down down" (1 2 3) in every bar. Chords: G, C and D.' },
          { type: 'chart', match: 'chord', song: 'amazing', bpm: 70, text: 'Strum the hymn in G.' },
        ],
      },
    ],
  },

  // ---- Bass ----------------------------------------------------------------------
  // Strings: 1 = thinnest (G), 4 = thickest (low E). The microphone listens lower in
  // these lessons (a bass amp or an interface works best; a bass alone is quiet).
  {
    id: 'bass-start',
    course: 'bass',
    title: 'Getting started',
    icon: '🎸',
    lessons: [
      {
        id: 'b-tune',
        title: 'Hold it and tune it',
        steps: [
          { type: 'info', fretboard: { instrument: 'bass', open: [1, 2, 3, 4] }, text: 'Four strings, thickest to thinnest: E A D G (the same as the four lowest guitar strings, an octave lower). Pluck with the first two fingers of your right hand, alternating, resting your thumb on the pickup.' },
          { type: 'sing', tune: true, instrument: 'bass', notes: [28, 33, 38, 43], names: ['4 E', '3 A', '2 D', '1 G'], hear: true, hold: 1, tolerance: 12, text: 'Tune each string until the needle sits in the middle. Turn the microphone on first (🎤); put it near the amp.' },
        ],
      },
      {
        id: 'b-open',
        title: 'Open strings and alternate plucking',
        steps: [
          { type: 'fret', instrument: 'bass', notes: [[4, 0], [3, 0], [2, 0], [1, 0]], text: 'E A D G: pluck each open string.' },
          { type: 'fret', instrument: 'bass', notes: [[4, 0], [4, 0], [4, 0], [4, 0], [3, 0], [3, 0], [3, 0], [3, 0]], text: 'Four on E, four on A, alternating fingers: index, middle, index, middle.' },
        ],
      },
    ],
  },
  {
    id: 'bass-notes',
    course: 'bass',
    title: 'Notes on the neck',
    icon: '🎶',
    lessons: [
      {
        id: 'b-e-a',
        title: 'Notes on the E and A strings',
        steps: [
          { type: 'info', fretboard: { instrument: 'bass', dots: [[4, 1, 1], [4, 3, 3], [3, 2, 2], [3, 3, 3], [3, 5, 4]] }, text: 'One finger per fret. E string: fret 1 is F, fret 3 is G. A string: fret 2 is B, fret 3 is C, fret 5 is D. Most church songs live right here.' },
          { type: 'fret', instrument: 'bass', notes: [[4, 0], [4, 1], [4, 3]], fingers: [0, 1, 3], text: 'E, F, G on the E string.' },
          { type: 'fret', instrument: 'bass', notes: [[3, 0], [3, 2], [3, 3], [3, 5]], fingers: [0, 1, 2, 4], text: 'A, B, C, D on the A string.' },
        ],
      },
      {
        id: 'b-roots',
        title: 'Find the roots: G, C, D, Em',
        steps: [
          { type: 'info', text: 'The bass player\'s main job: play the root (the name) of each chord, on beat 1. For a G chord play G, for C play C, for Em play E.' },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [3, 3], [3, 5], [4, 0]], fingers: [2, 2, 4, 0], text: 'G (E string, 3rd fret), C (A string, 3rd fret), D (A string, 5th fret), E (open E).' },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [3, 5], [4, 0], [3, 3]], fingers: [2, 4, 0, 2], text: 'The worship four, roots only: G, D, E, C.' },
        ],
      },
      {
        id: 'b-fifth',
        title: 'Root and fifth',
        steps: [
          { type: 'info', fretboard: { instrument: 'bass', dots: [[4, 3, 'R'], [3, 5, '5']] }, text: 'The fifth is two frets up on the next string. Root-fifth is the classic country and gospel bass pattern: G then D.' },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [3, 5], [4, 3], [3, 5], [3, 3], [2, 5], [3, 3], [2, 5]], fingers: [2, 4, 2, 4, 2, 4, 2, 4], text: 'G-D G-D, then C-G C-G.' },
        ],
      },
    ],
  },
  {
    id: 'bass-playalong',
    course: 'bass',
    title: 'Play along in time',
    icon: '⏱',
    lessons: [
      {
        id: 'b-chart-gcd',
        title: 'Roots in time: G, C, D',
        steps: [
          { type: 'info', text: 'Play the root on every beat (four per bar) and change on the bar line. Steady and even beats a lot of notes.' },
          { type: 'chart', match: 'root', instrument: 'bass', chords: ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'], beats: 4, bpm: 66, text: 'Roots of G, C, D with the click.' },
        ],
      },
      { id: 'b-worship-flow', title: 'Play along: Worship Flow', steps: [{ type: 'chart', match: 'root', instrument: 'bass', song: 'worshipflow', bpm: 66, text: 'Roots of the 1-5-6-4: G, F# (for D/F#), E, C, then the chorus.' }] },
      { id: 'b-amazing', title: 'Play along: Amazing Grace', steps: [{ type: 'chart', match: 'root', instrument: 'bass', song: 'amazing', bpm: 70, text: 'One root per bar on beat 1, let it ring: G, C, D in 3/4.' }] },
    ],
  },
  {
    id: 'bass-feel',
    course: 'bass',
    title: 'Rhythm and feel',
    icon: '🎵',
    lessons: [
      {
        id: 'b-eighths',
        title: 'Driving eighth notes',
        steps: [
          { type: 'info', text: 'Eight notes per bar instead of four: count "1 and 2 and 3 and 4 and" and play the root on every count. Index, middle, index, middle. It pushes a song forward, great for upbeat choruses.' },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [4, 3], [4, 3], [4, 3], [3, 3], [3, 3], [3, 3], [3, 3]], fingers: [2, 2, 2, 2, 2, 2, 2, 2], text: 'Four on G, four on C. Even and steady.' },
          { type: 'chart', match: 'root', instrument: 'bass', chords: ['G', 'G', 'C', 'C', 'G', 'G', 'D', 'G'], beats: 4, bpm: 72, text: 'Eight roots per bar with the click: G, C, D.' },
        ],
      },
      {
        id: 'b-octave',
        title: 'Root and octave',
        steps: [
          { type: 'info', text: 'The octave is the same note, higher: two strings up and two frets up. G on the E string (3rd fret), its octave on the D string (5th fret). Root on 1, octave on 3: the classic disco and gospel bounce.', fretboard: { instrument: 'bass', dots: [[4, 3, 'R'], [2, 5, '8']] } },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [2, 5], [4, 3], [2, 5], [3, 3], [1, 5], [3, 3], [1, 5]], fingers: [1, 3, 1, 3, 1, 3, 1, 3], text: 'G and its octave, then C and its octave.' },
          { type: 'chart', match: 'root', instrument: 'bass', chords: ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'], beats: 4, bpm: 66, text: 'Root on 1, octave on 3, with the click.' },
        ],
      },
      {
        id: 'b-scale',
        title: 'The G major scale',
        steps: [
          { type: 'info', text: 'Every note of the key of G, in one hand position: G A B C D E F# G. Start with your middle finger on G (E string, 3rd fret); one finger per fret, and your hand never moves.', fretboard: { instrument: 'bass', dots: [[4, 3, 2], [4, 5, 4], [3, 2, 1], [3, 3, 2], [3, 5, 4], [2, 2, 1], [2, 4, 3], [2, 5, 4]] } },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [4, 5], [3, 2], [3, 3], [3, 5], [2, 2], [2, 4], [2, 5]], fingers: [2, 4, 1, 2, 4, 1, 3, 4], text: 'Up the scale: G A B C D E F# G.' },
          { type: 'fret', instrument: 'bass', notes: [[2, 5], [2, 4], [2, 2], [3, 5], [3, 3], [3, 2], [4, 5], [4, 3]], fingers: [4, 3, 1, 4, 2, 1, 4, 2], text: 'And back down: G F# E D C B A G.' },
        ],
      },
      {
        id: 'b-approach',
        title: 'Walking to the next chord',
        steps: [
          { type: 'info', text: 'Instead of jumping to the next root, walk to it through the scale. From G to C: G, A, B, then C right on the new chord. From C back to G: C, B, A, G. Play the walk on beats 2, 3 and 4.' },
          { type: 'fret', instrument: 'bass', notes: [[4, 3], [4, 5], [3, 2], [3, 3]], fingers: [2, 4, 1, 2], text: 'Walk up: G A B C.' },
          { type: 'fret', instrument: 'bass', notes: [[3, 3], [3, 2], [3, 0], [4, 3]], fingers: [2, 1, 0, 2], text: 'Walk down: C B A G.' },
          { type: 'chart', match: 'root', instrument: 'bass', chords: ['G', 'C', 'G', 'C', 'G', 'C', 'G', 'G'], beats: 4, bpm: 66, text: 'Land on each root on beat 1; walk on 2, 3, 4.' },
        ],
      },
    ],
  },
  {
    id: 'bass-church',
    course: 'bass',
    title: 'Church bass',
    icon: '⛪',
    lessons: [
      {
        id: 'b-68walk',
        title: 'Walking down: the 6/8 ballad',
        steps: [
          { type: 'info', text: 'A chord like A/C# ("A over C sharp") means: the band plays A, you play C#. Slash chords make the bass walk smoothly: D, C#, B is a walk down on the A string (frets 5, 4, 2). This song is in 6/8: one note per bar, let it ring.' },
          { type: 'fret', instrument: 'bass', notes: [[3, 5], [3, 4], [3, 2]], fingers: [4, 3, 1], text: 'The walk down: D, C#, B.' },
          { type: 'chart', match: 'root', instrument: 'bass', song: 'ballad68', bpm: 60, text: 'Play along: the 6/8 worship ballad in D. Follow the bass notes of the slash chords.' },
        ],
      },
      {
        id: 'b-saints',
        title: 'Play along: When the Saints',
        steps: [
          { type: 'info', text: 'C, G and F. You know C (A string, 3rd fret) and G (E string, 3rd fret). F is the E string, 1st fret. The F part is the big moment of the song: dig in.', fretboard: { instrument: 'bass', dots: [[3, 3, 'C'], [4, 3, 'G'], [4, 1, 'F']] } },
          { type: 'chart', match: 'root', instrument: 'bass', song: 'saints', bpm: 96, text: 'Roots with the click: C, G, C7 (still C), F.' },
        ],
      },
      {
        id: 'b-251',
        title: 'The gospel 2-5-1',
        steps: [
          { type: 'info', text: 'The sound of gospel: the 2-5-1. In the key of C that\'s Dm7, G7, Cmaj7: roots D, G, C, falling by fifths. This vamp adds A7, F and Em7 too: A is the open A string, F the E string 1st fret, E the open E string.', fretboard: { instrument: 'bass', dots: [[3, 5, 'D'], [4, 3, 'G'], [3, 3, 'C']] } },
          { type: 'fret', instrument: 'bass', notes: [[3, 5], [4, 3], [3, 3]], fingers: [4, 2, 2], text: 'The 2-5-1 roots: D, G, C.' },
          { type: 'chart', match: 'root', instrument: 'bass', song: 'gospelvamp', bpm: 72, text: 'Play along: the gospel 2-5-1 vamp in C.' },
        ],
      },
    ],
  },
];

for (const u of UNITS) u.course ??= 'piano';
export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.id, course: u.course })));
export const unitsFor = (course) => UNITS.filter((u) => u.course === course);

/**
 * Add a course pack (your own courses) to the lessons: its units and lessons join
 * the built-in ones under their own tab. Lesson ids get the course id in front so
 * they never clash. Returns the course id.
 */
export function addCourse(pack) {
  removeCourse(pack.id);
  COURSES.push({ id: pack.id, name: pack.title, icon: pack.icon || '📘', custom: true, teacher: pack.teacher, by: pack.by || '' });
  for (const u of pack.units) {
    const unit = { id: `${pack.id}/${u.id}`, course: pack.id, title: u.title, icon: u.icon || '⭐', lessons: u.lessons.map((l) => ({ ...l, id: `${pack.id}/${l.id}` })) };
    UNITS.push(unit);
    for (const l of unit.lessons) ALL_LESSONS.push({ ...l, unit: unit.id, course: pack.id });
  }
  return pack.id;
}

/** Take a course pack's lessons out again. */
export function removeCourse(id) {
  const drop = (arr, keep) => {
    for (let i = arr.length - 1; i >= 0; i--) if (!keep(arr[i])) arr.splice(i, 1);
  };
  drop(COURSES, (c) => !(c.custom && c.id === id));
  drop(UNITS, (u) => u.course !== id || !u.id.includes('/'));
  drop(ALL_LESSONS, (l) => l.course !== id || !l.id.includes('/'));
}

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

/** The notes of a reading drill: its fixed notes, or `count` random ones from its pool (never the same twice in a row). */
export function readNotes(step, rand = Math.random) {
  if (step.notes) return step.notes;
  const out = [];
  while (out.length < step.count) {
    const n = step.pool[Math.floor(rand() * step.pool.length)];
    if (n !== out[out.length - 1] || step.pool.length === 1) out.push(n);
  }
  return out;
}

/**
 * The hits of a groove step, in beats: [{ beat, note, vel }], bar after bar.
 * Each bar is a grid: `steps` slots per bar and one string per drum
 * ('x' hit, 'X' accent, anything else rest; missing slots are rests).
 */
export function grooveHits(step) {
  const beatsPerBar = ((step.time?.[0] || 4) * 4) / (step.time?.[1] || 4);
  const out = [];
  let bar = 0;
  for (let r = 0; r < (step.repeat || 1); r++) {
    for (const g of step.bars) {
      const slot = beatsPerBar / g.steps;
      for (const [row, note] of Object.entries(GROOVE_ROWS)) {
        const pattern = (g[row] || '').replace(/\s/g, '');
        for (let i = 0; i < Math.min(pattern.length, g.steps); i++) {
          if (pattern[i] === 'x' || pattern[i] === 'X') out.push({ beat: bar * beatsPerBar + i * slot, note, vel: pattern[i] === 'X' ? 115 : note === 42 ? 70 : 95 });
        }
      }
      bar++;
    }
  }
  return out.sort((a, b) => a.beat - b.beat || a.note - b.note);
}

/**
 * MIDI for a groove step: one bar of count-in clicks, then the beat on the
 * drum channel with a click (woodblock, channel 1) on every beat.
 * Returns { bytes, countIn (seconds), hits: [{ time, note }] }.
 */
export function grooveMidi(step, name = 'Drum lesson') {
  const bpm = step.bpm || 70;
  const spb = 60 / bpm;
  const [num, den] = step.time || [4, 4];
  const beatsPerBar = (num * 4) / den;
  const hits = grooveHits(step);
  const bars = (step.repeat || 1) * step.bars.length;
  const ev = [];
  const add = (beat, bytes) => ev.push({ time: beat * spb, bytes });
  add(0, [0xff, 0x58, 0x04, num, Math.log2(den), 0x18, 0x08]);
  add(0, [0xc0, 115]); // woodblock click
  for (let bar = 0; bar <= bars; bar++)
    for (const c of clickBeats([num, den])) {
      const accent = c === 0;
      add(bar * beatsPerBar + c, [0x90, accent ? 84 : 79, accent ? 100 : 70]);
      add(bar * beatsPerBar + c + 0.1, [0x80, accent ? 84 : 79, 0]);
    }
  for (const h of hits) {
    add(beatsPerBar + h.beat, [0x99, h.note, h.vel]);
    add(beatsPerBar + h.beat + 0.1, [0x89, h.note, 0]);
  }
  return { bytes: writeMidi(ev, { bpm, name }), countIn: beatsPerBar * spb, hits: hits.map((h) => ({ time: (beatsPerBar + h.beat) * spb, note: h.note })) };
}

/**
 * Playing in time: every expected hit can be matched once, by a hit on the same
 * drum within `window` seconds. sameDrum(a, b) says whether two notes are one drum.
 */
export class DrumJudge {
  constructor(expected, sameDrum, { window = 0.13, perfect = 0.05 } = {}) {
    this.expected = expected.map((e) => ({ ...e, hit: false }));
    this.sameDrum = sameDrum;
    this.window = window;
    this.perfect = perfect;
    this.hits = 0;
    this.perfects = 0;
    this.extra = 0;
    this.offsets = [];
  }

  /** A hit at song time `t`: 'perfect', 'good', or 'extra' (nothing to match). */
  hit(note, t) {
    let best = null;
    for (const e of this.expected) {
      if (e.hit || !this.sameDrum(e.note, note)) continue;
      const d = Math.abs(e.time - t);
      if (d <= this.window && (!best || d < Math.abs(best.time - t))) best = e;
    }
    if (!best) {
      this.extra++;
      return 'extra';
    }
    best.hit = true;
    this.hits++;
    this.offsets.push(t - best.time);
    if (Math.abs(t - best.time) <= this.perfect) {
      this.perfects++;
      return 'perfect';
    }
    return 'good';
  }

  /** Expected hits already too late to play (as of song time `t`). */
  missedBy(t) {
    return this.expected.filter((e) => !e.hit && e.time < t - this.window).length;
  }

  /** 0-100: hits matched, less a little for extra hits. */
  get accuracy() {
    const total = this.expected.length || 1;
    return Math.max(0, Math.round((100 * (this.hits - this.extra * 0.5)) / total));
  }

  /** Are you early or late on average (ms, negative = early)? */
  get averageOffsetMs() {
    return this.offsets.length ? Math.round((1000 * this.offsets.reduce((a, b) => a + b, 0)) / this.offsets.length) : 0;
  }
}

/** Stars for a singing step from the average distance off center of your notes (cents) and misses. */
export const starsForSinging = (avgCents, misses = 0) => Math.max(1, (avgCents <= 15 ? 3 : avgCents <= 28 ? 2 : 1) - (misses > 2 ? 1 : 0));

/** Course map state for a player: [{ lesson, stars, unlocked }] in order. */
export function pathState(progress = {}, course = 'piano') {
  let open = true;
  return ALL_LESSONS.filter((l) => l.course === course).map((lesson) => {
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
