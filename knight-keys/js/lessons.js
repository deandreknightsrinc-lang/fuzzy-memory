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
// Info steps can show notes on the staff too (`staff: [...]`); song steps with
// `noHints` don't light the keys, so you read the music instead.
// Stars: 3 for a clean step, fewer for mistakes. Pass a lesson to open the next.
// Each course (piano, voice) opens its own lessons one at a time.

// Note numbers: middle C = 60. Fingers: 1 thumb, 2 index, 3 middle, 4 ring, 5 pinky.
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, B3 = 59;
const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, C5 = 72;

export const COURSES = [
  { id: 'piano', name: 'Piano', icon: '🎹' },
  { id: 'voice', name: 'Voice', icon: '🎤' },
  { id: 'reading', name: 'Read music', icon: '📖' },
];

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
];

for (const u of UNITS) u.course ??= 'piano';
export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.id, course: u.course })));
export const unitsFor = (course) => UNITS.filter((u) => u.course === course);

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
