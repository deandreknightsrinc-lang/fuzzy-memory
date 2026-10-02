// Built-in song library: public-domain melodies, arranged for Knight Keys.
// Melodies are public domain; these arrangements are free to use.
//
// Notation (spaces separate tokens):
//   melody: <note><octave>[:<beats>]  e.g. E4 D4:0.5 G4:2   r:1 is a rest (default 1 beat)
//   chords: <symbol>:<beats>          e.g. C:4 G:2 C:2      - :2 means no chord
//   Chord symbols: C, Cm, C7, Cm7, Cmaj7, with # or b (F#, Bb).
// Channel 1 = melody (right hand), 2 = chords (left hand), 10 = drums.

import { writeMidi, metaEvent } from './midi-file.js';
import { parseLyricTokens, lyricEventText, lineLyricEvents } from './lyrics.js';

export const SONGS = [
  {
    id: 'mary',
    category: 'starter',
    title: 'Mary Had a Little Lamb',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 100,
    drums: 'straight',
    about: 'Three notes (E, D, C) for most of the song. A great first song for the right hand.',
    melody: `E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 |
             E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4`,
    chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4',
    lyrics: 'Ma- ry had a lit- tle lamb, / lit- tle lamb, lit- tle lamb, / Ma- ry had a lit- tle lamb, / its fleece was white as snow.',
  },
  {
    id: 'twinkle',
    category: 'starter',
    title: 'Twinkle, Twinkle, Little Star',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 96,
    drums: 'straight',
    about: 'Steps up and down the C major scale, two notes at a time.',
    melody: `C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 |
             G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 |
             C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2`,
    chords: `C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2
             C:4 F:2 C:2 F:2 C:2 G:2 C:2`,
    lyrics: 'Twin- kle, twin- kle, lit- tle star, / how I won- der what you are! / Up a- bove the world so high, / like a dia- mond in the sky. / Twin- kle, twin- kle, lit- tle star, / how I won- der what you are!',
  },
  {
    id: 'saints',
    category: 'church',
    title: 'When the Saints Go Marching In',
    level: 'Easy',
    key: 0,
    time: [4, 4],
    bpm: 120,
    drums: 'twostep',
    about: 'The classic up-tempo spiritual. Each phrase starts after a rest, so count "1" and come in on "2".',
    melody: `r:1 C4 E4 F4 | G4:4 | r:1 C4 E4 F4 | G4:4 | r:1 C4 E4 F4 | G4:2 E4:2 | C4:2 E4:2 | D4:4 |
             r:1 E4 E4 D4 | C4:3 C4 | E4:2 G4 G4 | F4:2 F4:2 | r:2 E4 F4 | G4:2 E4:2 | C4:2 D4:2 | C4:4`,
    chords: 'C:4 C:4 C:4 C:4 C:4 C:4 C:4 G:4 C:4 C7:4 F:4 F:4 C:4 C:4 G:4 C:4',
    lyrics: 'Oh, when the saints / go march- ing in, / oh, when the saints go march- ing in, / oh, Lord, I want to be in that num- ber, / when the saints go march- ing in.',
  },
  {
    id: 'birthday',
    category: 'starter',
    title: 'Happy Birthday',
    level: 'Easy',
    key: 0,
    time: [3, 4],
    bpm: 100,
    drums: 'waltz',
    about: 'In 3/4 time: count "1-2-3". It starts with two pickup notes before the first full bar.',
    melody: `r:2 G4:0.75 G4:0.25 | A4 G4 C5 | B4:2 G4:0.75 G4:0.25 | A4 G4 D5 | C5:2 G4:0.75 G4:0.25 |
             G5 E5 C5 | B4 A4 F5:0.75 F5:0.25 | E5 C5 D5 | C5:3`,
    chords: '-:3 C:3 G:3 G:3 C:3 C:3 F:3 C:2 G:1 C:3',
    lyrics: 'Hap- py birth- day to you, / hap- py birth- day to you, / hap- py birth- day, dear friend _ / hap- py birth- day to you!',
  },
  {
    id: 'amazing',
    category: 'church',
    title: 'Amazing Grace',
    level: 'Intermediate',
    key: 1,
    time: [3, 4],
    bpm: 80,
    drums: 'waltz',
    about: 'The hymn tune "New Britain" in G major (one sharp: F#). Slow 3/4 with a pickup note.',
    melody: `r:2 D4 | G4:2 B4:0.5 G4:0.5 | B4:2 A4 | G4:2 E4 | D4:2 D4 |
             G4:2 B4:0.5 G4:0.5 | B4:2 A4:0.5 B4:0.5 | D5:5 B4 |
             D5:2 B4:0.5 G4:0.5 | B4:2 A4 | G4:2 E4 | D4:2 D4 |
             G4:2 B4:0.5 G4:0.5 | B4:2 A4 | G4:3`,
    chords: '-:3 G:3 G:3 C:3 G:3 G:3 G:3 D:3 D:3 G:3 G:3 C:3 G:3 G:3 D:3 G:3',
    lyrics: 'A- ma- zing _ grace, how sweet the sound / that saved _ a wretch like _ me! / I once _ was lost, but now am found, / was blind, _ but now I see.',
    verses: ['\'Twas grace that taught my heart to fear,\nand grace my fears relieved;\nhow precious did that grace appear\nthe hour I first believed!', 'Through many dangers, toils and snares,\nI have already come;\n\'tis grace hath brought me safe thus far,\nand grace will lead me home.', 'When we\'ve been there ten thousand years,\nbright shining as the sun,\nwe\'ve no less days to sing God\'s praise\nthan when we\'d first begun.'],
  },
  {
    id: 'doxology',
    category: 'church',
    title: 'Doxology (Old Hundredth)',
    level: 'Intermediate',
    key: 1,
    time: [4, 4],
    bpm: 76,
    drums: null,
    about: '"Praise God from whom all blessings flow". Each line starts and ends on a long note. Played in many churches every Sunday.',
    melody: `G4:2 G4 F#4 E4 D4 G4 A4 B4:2 |
             B4:2 B4 B4 A4 G4 C5 B4 A4:2 |
             G4:2 A4 B4 A4 G4 E4 F#4 G4:2 |
             D5:2 B4 G4 A4 C5 B4 A4 G4:4`,
    chords: `G:2 G:1 D:1 C:1 G:1 Em:1 D:1 G:2
             G:2 G:1 Em:1 D:1 Em:1 C:1 G:1 D:2
             G:2 D:1 G:1 D:1 Em:1 C:1 D:1 G:2
             G:2 G:1 Em:1 D:1 C:1 G:1 D:1 G:4`,
    lyrics: 'Praise God, from whom all bless- ings flow; / praise Him, all crea- tures here be- low; / praise Him a- bove, ye heav\'n- ly host; / praise Fa- ther, Son, and Ho- ly Ghost.',
  },
  {
    id: 'jesusloves',
    category: 'church',
    title: 'Jesus Loves Me',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 92,
    drums: 'straight',
    about: 'William Bradbury\'s 1862 children\'s hymn. The verse uses five notes; the chorus "Yes, Jesus loves me" reaches up to high C.',
    melody: `G4 E4 E4 D4 | E4 G4 G4:2 | A4 A4 C5 A4 | A4 G4 G4:2 |
             G4 E4 E4 D4 | E4 G4 G4:2 | A4 A4 G4 C4 | E4 D4 C4:2 |
             G4:2 E4 G4 | A4:2 C5:2 | G4:2 E4 G4 | A4:2 C5:2 |
             G4:2 E4 G4 | A4:2 C5:2 | A4 A4 G4 C4 | E4 D4 C4:2`,
    chords: `C:4 C:4 F:4 C:4 C:4 C:4 F:2 C:2 G:2 C:2
             C:4 F:4 C:4 F:4 C:4 F:4 F:2 C:2 G:2 C:2`,
    lyrics: 'Je- sus loves me! this I know, / for the Bi- ble tells me so. / Lit- tle ones to Him be- long; / they are weak, but He is strong. / Yes, Je- sus loves me! / Yes, Je- sus loves me! / Yes, Je- sus loves me! / The Bi- ble tells me so. _',
    verses: ['Jesus loves me! He who died\nheaven\'s gate to open wide;\nHe will wash away my sin,\nlet His little child come in.', 'Jesus loves me! He will stay\nclose beside me all the way;\nif I love Him, when I die\nHe will take me home on high.'],
  },
  {
    id: 'michael',
    category: 'church',
    title: 'Michael, Row the Boat Ashore',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 104,
    drums: 'twostep',
    about: 'A spiritual from the Sea Islands of South Carolina. Call and answer: every line ends with "Hallelujah!"',
    melody: `C4 E4 G4:2 | E4 G4 A4:2 | G4:4 | E4 G4 A4:2 | G4:4 |
             E4 G4 G4:2 | E4 F4 E4:2 | D4:4 | C4 D4 E4:2 | D4:2 C4:2 |
             C4 E4 G4:2 | E4 G4 A4:2 | G4:4 | E4 G4 A4:2 | G4:4 |
             E4 G4 G4:2 | E4 F4 E4:2 | D4:4 | C4 D4 E4:2 | D4:2 C4:2`,
    chords: `C:4 C:4 C:4 F:4 C:4 C:4 C:4 G:4 C:4 G:2 C:2
             C:4 C:4 C:4 F:4 C:4 C:4 C:4 G:4 C:4 G:2 C:2`,
    lyrics: 'Mi- chael, row the boat a- shore, hal- le- lu- jah! / Mi- chael, row the boat a- shore, hal- le- lu- _ jah! / Sis- ter, help to trim the sail, hal- le- lu- jah! / Sis- ter, help to trim the sail, hal- le- lu- _ jah!',
  },
  {
    id: 'joyful',
    category: 'church',
    title: 'Joyful, Joyful (Ode to Joy)',
    level: 'Beginner',
    key: 0,
    time: [4, 4],
    bpm: 108,
    drums: 'straight',
    about: 'Beethoven\'s melody, sung in church as "Joyful, Joyful, We Adore Thee". Five fingers, one hand position.',
    melody: `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 |
             E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2 |
             D4 D4 E4 C4 | D4 E4:0.5 F4:0.5 E4 C4 | D4 E4:0.5 F4:0.5 E4 D4 | C4 D4 G3:2 |
             E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2`,
    chords: `C:4 G:4 C:4 C:2 G:2 C:4 G:4 C:4 G:2 C:2
             G:2 C:2 G:2 C:2 G:4 C:2 G:2
             C:4 G:4 C:4 G:2 C:2`,
    lyrics: 'Joy- ful, joy- ful, we a- dore Thee, / God of glo- ry, Lord of love; / hearts un- fold like flowers be- fore Thee, / op\'- ning to the sun a- bove. / Melt the clouds of sin and _ sad- ness; / drive the _ dark of doubt a- way; / Giv- er of im- mor- tal glad- ness, / fill us with the light of day!',
    verses: ['All Thy works with joy surround Thee,\nearth and heaven reflect Thy rays,\nstars and angels sing around Thee,\ncenter of unbroken praise.'],
  },
  {
    id: 'silentnight',
    category: 'church',
    title: 'Silent Night',
    level: 'Easy',
    key: 0,
    time: [3, 4],
    bpm: 84,
    drums: 'waltz',
    about: 'Franz Gruber\'s 1818 carol, for the Christmas Eve service. A gentle 3/4 with the long-short "Si-lent" rhythm.',
    melody: `G4:1.5 A4:0.5 G4 | E4:3 | G4:1.5 A4:0.5 G4 | E4:3 | D5:2 D5 | B4:3 | C5:2 C5 | G4:3 |
             A4:2 A4 | C5:1.5 B4:0.5 A4 | G4:1.5 A4:0.5 G4 | E4:3 | A4:2 A4 | C5:1.5 B4:0.5 A4 | G4:1.5 A4:0.5 G4 | E4:3 |
             D5:2 D5 | F5:1.5 D5:0.5 B4 | C5:3 | E5:3 | C5:1.5 G4:0.5 E4 | G4:1.5 F4:0.5 D4 | C4:6`,
    chords: `C:3 C:3 C:3 C:3 G7:3 G7:3 C:3 C:3
             F:3 F:3 C:3 C:3 F:3 F:3 C:3 C:3
             G7:3 G7:3 C:3 C:3 C:3 G7:3 C:6`,
    lyrics: 'Si- lent night, _ ho- ly night, _ / all is calm, all is bright / round yon vir- gin moth- er and child. _ / Ho- ly in- fant so ten- der and mild, / sleep in heav- en- ly peace, / sleep in heav- en- ly _ _ peace.',
    verses: ['Silent night, holy night,\nshepherds quake at the sight;\nglories stream from heaven afar,\nheavenly hosts sing Alleluia!\nChrist the Savior is born,\nChrist the Savior is born!', 'Silent night, holy night,\nSon of God, love\'s pure light;\nradiant beams from Thy holy face\nwith the dawn of redeeming grace,\nJesus, Lord, at Thy birth,\nJesus, Lord, at Thy birth.'],
  },
  {
    id: 'worshipflow',
    category: 'church',
    title: 'Worship Flow (1-5-6-4 in G)',
    level: 'Easy',
    key: 1,
    time: [4, 4],
    bpm: 72,
    drums: 'straight',
    practice: true,
    about: 'The progression behind many modern worship songs: G, D/F#, Em, C. Right hand plays the chords, left hand the bass. Learn it here, then use it on Sunday.',
    chords: `G:4 D/F#:4 Em:4 C:4 G:4 D/F#:4 Em:4 C:4
             Em:4 D:4 C:4 C:4 Em:4 D:4 C:4 Dsus4:2 D:2`,
  },
  {
    id: 'gospelvamp',
    category: 'church',
    title: 'Gospel 2-5-1 Vamp in C',
    level: 'Intermediate',
    key: 0,
    time: [4, 4],
    bpm: 84,
    drums: 'shuffle',
    practice: true,
    about: 'Dm7, G7, Cmaj7 and the A7 turnaround: the vamp for praise breaks, altar calls and shout music. Try it on Advanced for gospel voicings and a walking bass.',
    chords: `Dm7:4 G7:4 Cmaj7:4 A7:4 Dm7:4 G7:4 Cmaj7:2 C7:2 Fmaj7:4
             Fm6:4 Em7:2 A7:2 Dm7:2 G7:2 Cmaj7:4`,
  },
  {
    id: 'ballad68',
    category: 'church',
    title: '6/8 Worship Ballad in D',
    level: 'Intermediate',
    key: 2,
    time: [6, 8],
    bpm: 66,
    drums: 'ballad68',
    practice: true,
    about: 'A slow 6/8 progression for meditation and offering: D, G/D, Bm, A, with a sus resolution. Count "1-2-3-4-5-6".',
    chords: `D:3 G/D:3 D:3 A/C#:3 Bm:3 G:3 Asus4:1.5 A:1.5 D:3
             G:3 A:3 F#m:3 Bm:3 G:3 A:3 D:3 D:3`,
  },
  {
    id: 'praisebreak',
    category: 'church',
    title: 'Praise Break (Shout Music) in Ab',
    level: 'Intermediate',
    key: -4,
    time: [4, 4],
    bpm: 132,
    drums: 'twostep',
    practice: true,
    about: 'Up-tempo shout music: Ab, Db/Ab and Eb7 with a gospel walk-down (Db, Dbm, Ab/Eb). On Advanced the bass walks and the drums drive.',
    chords: `Ab:4 Db/Ab:4 Ab:4 Eb7:4 Ab:4 Db/Ab:4 Eb7:4 Ab:4
             Db:4 Ebsus4:2 Eb:2 Ab:4 Ab7:4 Db:2 Dbm:2 Ab/Eb:2 Eb7:2 Ab:4 Ab:4`,
  },
  {
    id: 'gospelballad',
    category: 'church',
    title: 'Gospel Ballad 1-3-4 in Ab',
    level: 'Intermediate',
    key: -4,
    time: [4, 4],
    bpm: 66,
    drums: 'straight',
    practice: true,
    about: 'The slow gospel sound: Ab, Cm7, Db with 2-5 passing chords and the Dbm6 "church" chord before home. Great for learning voicings on Advanced.',
    chords: `Ab:4 Cm7:4 Db:4 Eb/Db:4 Cm7:2 Fm7:2 Bbm7:2 Eb7:2 Ab:2 Ab/C:2 Db:2 Ebsus4:1 Eb:1
             Ab:4 Ab7:4 Db:4 Dbm6:4 Ab/Eb:2 F7:2 Bbm7:2 Eb7:2 Ab:4 Ab:4`,
  },
  {
    id: 'hymnstyle',
    category: 'church',
    title: 'Hymn Style 1-4-5 with Amen (F)',
    level: 'Easy',
    key: -1,
    time: [4, 4],
    bpm: 80,
    drums: null,
    practice: true,
    about: 'How most hymns move: F, Bb and C7, with a 2-5 (Gm, C7) and the plagal "A-men" (Bb to F) at the end. Play it before you learn a real hymn.',
    chords: `F:4 Bb:2 F:2 C:4 F:4 F:4 Bb:2 F:2 C7:4 F:4
             Bb:4 F:4 Gm:2 C7:2 F:4 Bb:4 F:4`,
  },
  {
    id: 'altarcall',
    category: 'church',
    title: 'Altar Call 6/8 in Bb',
    level: 'Intermediate',
    key: -2,
    time: [6, 8],
    bpm: 58,
    drums: 'ballad68',
    practice: true,
    about: 'A slow 6/8 for prayer and altar call: Bb, Eb/Bb, F/A, Gm with a Csus resolution and the Ebm "minor four" before home.',
    chords: `Bb:3 Eb/Bb:3 Bb:3 F/A:3 Gm:3 Eb:3 Csus4:1.5 C:1.5 F:3
             Bb:3 Bb7/D:3 Eb:3 Ebm:3 Bb/F:3 F7:3 Bb:3 Bb:3`,
  },
  {
    id: 'minorvamp',
    category: 'church',
    title: 'Minor Gospel Vamp in F minor',
    level: 'Advanced',
    key: -4,
    minor: true,
    time: [4, 4],
    bpm: 96,
    drums: 'shuffle',
    practice: true,
    about: 'A minor vamp for high praise: Fm7, Bbm7, Eb, Abmaj7, Dbmaj7 and the Gm7b5 to C7 that pulls back to Fm.',
    chords: `Fm7:4 Bbm7:4 Eb:4 Abmaj7:4 Dbmaj7:4 Gm7b5:2 C7:2 Fm7:4 C7:4
             Fm7:4 Bbm7:4 Eb:4 Abmaj7:4 Dbmaj7:4 Gm7b5:2 C7:2 Fm7:4 Fm7:4`,
  },
  {
    id: 'turnaround',
    category: 'church',
    title: 'Gospel Walk-Up Turnaround in C',
    level: 'Advanced',
    key: 0,
    time: [4, 4],
    bpm: 76,
    drums: 'straight',
    practice: true,
    about: 'The church walk-up: C, C7/E, F, F#dim7, C/G, A7, Dm7, G7. The bass climbs one step at a time; it is the ending of countless gospel songs.',
    chords: `C:2 C7/E:2 F:2 F#dim7:2 C/G:2 A7:2 Dm7:2 G7:2
             C:2 C7/E:2 F:2 F#dim7:2 C/G:2 A7:2 Dm7:1 G7:1 C:2`,
  },
];

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const LEVELS = ['beginner', 'intermediate', 'advanced'];
export const LEVEL_NAMES = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

/** "F#4" -> 66 */
export function parsePitch(token) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(token);
  if (!m) throw new Error(`Bad note "${token}"`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function tokens(str) {
  return str.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
}

/** Melody string -> [{ beat, beats, note }] (rests skipped). */
export function parseMelody(str) {
  const out = [];
  let beat = 0;
  for (const t of tokens(str || '')) {
    const [p, d] = t.split(':');
    const beats = d ? Number(d) : 1;
    if (!(beats > 0)) throw new Error(`Bad length in "${t}"`);
    if (p !== 'r') out.push({ beat, beats, note: parsePitch(p) });
    beat += beats;
  }
  return out;
}

// Chord qualities as intervals above the root (9 = 14 so it sits above the octave).
const QUALITY = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7],
  7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], mmaj7: [0, 3, 7, 11],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 2: [0, 2, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], sus: [0, 5, 7],
  '7sus4': [0, 5, 7, 10], '7sus': [0, 5, 7, 10], 11: [0, 5, 7, 10, 14], 13: [0, 4, 7, 10, 14, 21],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8],
};
const ALIASES = { M7: 'maj7', Maj7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', min: 'm', mi: 'm', '-': 'm', min7: 'm7', '-7': 'm7', 'ø': 'm7b5', o: 'dim', '°': 'dim', '+': 'aug', maj: '', M: '' };

const pcOf = (letter, acc) => (PC[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12;

/** "F#m7/C#" -> { root: 6, intervals: [0,3,7,10], bass: 1, quality: 'm7' } */
export function parseChordSymbol(symbol) {
  const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(symbol);
  if (!m) throw new Error(`Bad chord "${symbol}"`);
  const quality = ALIASES[m[3]] ?? m[3];
  const intervals = QUALITY[quality];
  if (!intervals) throw new Error(`Bad chord "${symbol}"`);
  const root = pcOf(m[1], m[2]);
  return { root, intervals, quality, bass: m[4] ? pcOf(m[4], m[5]) : root };
}

/** "Bb" / "F#m7" / "D/F#" -> left-hand notes around C3, lowest first. */
export function chordNotes(symbol) {
  const c = parseChordSymbol(symbol);
  let root = 48 + c.root; // C3..B3
  if (root > 55) root -= 12; // keep the left hand between G#2 and G3
  const notes = c.intervals.filter((i) => i < 12).map((i) => root + i);
  if (c.bass !== c.root) {
    let bass = 36 + c.bass;
    while (bass + 12 < notes[0]) bass += 12;
    if (bass >= notes[0]) bass -= 12;
    notes.unshift(bass);
  }
  return notes;
}

/** Chord string -> [{ beat, beats, notes, symbol, chord }]. */
export function parseChords(str) {
  const out = [];
  let beat = 0;
  for (const t of tokens(str || '')) {
    const [sym, d] = t.split(':');
    const beats = Number(d);
    if (!(beats > 0)) throw new Error(`Bad length in "${t}"`);
    if (sym !== '-') out.push({ beat, beats, notes: chordNotes(sym), symbol: sym, chord: parseChordSymbol(sym) });
    beat += beats;
  }
  return out;
}

/**
 * A chord chart as you'd write it for the band -> the chord string above.
 *   | G | D/F# | Em C |      bars between bars lines; chords in a bar share it
 *   G D/F# Em C              without bar lines, each chord is one bar
 *   G:2 D:2                  or give beats yourself
 *   %  (or /)                repeat the last chord;  -  or N.C. for no chord
 *   Verse:  [Chorus]         section names are ignored;  x2 at the end repeats a line
 * Returns { chords, bars, errors }.
 */
export function chartToChords(chart, beatsPerBar = 4) {
  const parts = [];
  const errors = [];
  let bars = 0;
  let last = null;
  (chart || '').split(/\n/).forEach((raw, lineNo) => {
    // Drop [section] tags and "Verse 1:" style labels (a colon not followed by a beat count).
    let line = raw.replace(/\[[^\]]*\]/g, ' ').replace(/^\s*[A-Za-z][A-Za-z0-9 '-]*?\s*:(?!\d)/, ' ');
    let repeat = 1;
    line = line.replace(/\(?\s*x\s*(\d+)\s*\)?\s*$/i, (_, n) => {
      repeat = Math.max(1, Math.min(16, Number(n)));
      return '';
    });
    if (!line.trim()) return;
    const barTexts = line.includes('|') ? line.split('|').filter((b) => b.trim()) : line.trim().split(/\s+/);
    const lineParts = [];
    for (const barText of barTexts) {
      const items = barText.trim().split(/\s+/).filter(Boolean);
      if (!items.length) continue;
      const explicit = items.filter((i) => i.includes(':'));
      const free = items.length - explicit.length;
      const used = explicit.reduce((sum, i) => sum + Number(i.split(':')[1]) || 0, 0);
      const each = free ? Math.max(0.5, (beatsPerBar - used) / free) : 0;
      let barBeats = 0;
      for (const item of items) {
        let [sym, d] = item.split(':');
        const beats = d ? Number(d) : each;
        if (sym === '%' || sym === '/') sym = last || '-';
        if (/^n\.?c\.?$/i.test(sym)) sym = '-';
        if (sym !== '-') {
          try {
            parseChordSymbol(sym);
            last = sym;
          } catch {
            errors.push(`Line ${lineNo + 1}: "${sym}" isn't a chord name I know`);
            sym = '-';
          }
        }
        if (!(beats > 0)) {
          errors.push(`Line ${lineNo + 1}: "${item}" has no length`);
          continue;
        }
        lineParts.push(`${sym}:${Math.round(beats * 1000) / 1000}`);
        barBeats += beats;
      }
      bars += barBeats / beatsPerBar;
    }
    for (let r = 0; r < repeat; r++) parts.push(...lineParts);
    if (repeat > 1) bars += (repeat - 1) * (lineParts.length ? lineParts.reduce((s2, x) => s2 + Number(x.split(':')[1]), 0) / beatsPerBar : 0);
  });
  return { chords: parts.join(' '), bars: Math.round(bars * 100) / 100, errors };
}

// ---- Drums ------------------------------------------------------------------

/** Drum grooves. Hits: [beatInBar, note, velocity]; `pro` is the busier Advanced version. */
const hats = (step, beats, accent = 60, soft = 45) => Array.from({ length: Math.round(beats / step) }, (_, i) => [i * step, 42, (i * step) % 1 ? soft : accent]);
export const DRUM_STYLES = {
  straight: {
    beats: 4,
    hits: [[0, 36, 90], [1, 38, 80], [2, 36, 85], [3, 38, 80], ...hats(0.5, 4)],
    pro: [[0, 36, 95], [1.5, 36, 70], [2, 36, 88], [1, 38, 88], [3, 38, 88], [0.75, 38, 26], [2.75, 38, 26], [3.25, 38, 24], ...hats(0.5, 3.5, 70, 48), [3.5, 46, 70]],
  },
  twostep: {
    beats: 4,
    hits: [[0, 36, 95], [1, 38, 85], [2, 36, 90], [3, 38, 85], [1, 54, 60], [3, 54, 60], ...[0, 1, 2, 3].map((b) => [b, 42, 55])],
    pro: [[0, 36, 100], [1.5, 36, 75], [2, 36, 92], [1, 38, 95], [3, 38, 95], [1.75, 38, 30], [3.75, 38, 30], [1, 54, 65], [3, 54, 65], ...hats(0.5, 4, 65, 40)],
  },
  shuffle: {
    beats: 4,
    hits: [[0, 36, 90], [2, 36, 85], [1, 38, 85], [3, 38, 85], ...[0, 1, 2, 3].flatMap((b) => [[b, 42, 60], [b + 2 / 3, 42, 40]])],
    pro: [[0, 36, 95], [2, 36, 90], [2 + 2 / 3, 36, 70], [1, 38, 92], [3, 38, 92], [1 / 3, 38, 22], [2 + 1 / 3, 38, 22], [3 + 2 / 3, 38, 30], ...[0, 1, 2, 3].flatMap((b) => [[b, 51, 70], [b + 2 / 3, 51, 50]])],
  },
  waltz: {
    beats: 3,
    hits: [[0, 36, 85], [1, 42, 50], [2, 42, 50], [1, 37, 55], [2, 37, 55]],
    pro: [[0, 36, 90], [2.5, 36, 60], [0, 51, 70], [1, 51, 55], [2, 51, 55], [1, 37, 65], [2, 37, 65], [0, 44, 50]],
  },
  ballad68: {
    beats: 3,
    hits: [[0, 36, 85], [1.5, 37, 70], ...hats(0.5, 3, 55, 40)],
    pro: [[0, 36, 90], [2.5, 36, 65], [1.5, 38, 85], [1, 38, 24], [2.75, 38, 26], ...hats(0.5, 3, 60, 42), [2.5, 46, 55]],
  },
};
export const DRUM_STYLE_NAMES = { straight: 'Straight (rock / pop / worship)', twostep: 'Gospel two-step', shuffle: 'Gospel shuffle', waltz: '3/4 waltz', ballad68: '6/8 ballad', '': 'No drums' };

/** A fill on the last beat (or two) of a bar, ending into a crash on the next bar. */
export function fillHits(beats, big) {
  const len = big ? 2 : 1;
  const start = beats - len;
  const toms = [50, 48, 45, 43, 41];
  const out = [];
  const n = len * 4;
  for (let i = 0; i < n; i++) {
    const note = i < n / 2 ? 38 : toms[Math.min(toms.length - 1, Math.floor(((i - n / 2) / (n / 2)) * toms.length))];
    out.push([start + i * 0.25, note, 70 + Math.round((i / n) * 40)]);
  }
  out.push([start, 36, 80]);
  return out;
}

// ---- Arranging --------------------------------------------------------------

const chordAt = (chords, beat) => chords.find((c) => beat >= c.beat - 1e-9 && beat < c.beat + c.beats - 1e-9);
const pcsOf = (c) => c.chord.intervals.map((i) => (c.chord.root + i) % 12);

/** Chord tones below `note` for the right hand (a third or more below, within an octave). */
function harmonyBelow(note, chord, count) {
  if (!chord) return [];
  const pcs = new Set(pcsOf(chord));
  const out = [];
  let top = note;
  for (let n = note - 3; n >= Math.max(note - 12, 53) && out.length < count; n--) {
    if (pcs.has(((n % 12) + 12) % 12) && top - n >= 3) {
      out.push(n);
      top = n;
    }
  }
  return out;
}

/** Right-hand chord voicing near `center` (close position, voice-led). */
function voicing(pcs, center) {
  const notes = pcs.map((pc) => {
    let n = 60 + pc;
    while (n - center > 6) n -= 12;
    while (center - n > 6) n += 12;
    return n;
  });
  return [...new Set(notes)].sort((a, b) => a - b);
}

/** Gospel color for the Advanced right hand: 9ths on major and minor chords, 9ths on dominants. */
function colorPcs(c) {
  const { root, quality, intervals } = c.chord;
  const add = (ints) => ints.map((i) => (root + i) % 12);
  if (quality === '' || quality === 'add9') return add([4, 7, 11, 14]); // maj9 sound (no root)
  if (quality === 'm' || quality === 'm7' || quality === 'm9') return add([3, 7, 10, 14]);
  if (quality === '7' || quality === '9') return add([4, 10, 14]);
  return add(intervals.filter((i) => i !== 0));
}

/**
 * Build a MIDI file for a library song or one of your songs.
 * level: 'beginner' (as written), 'intermediate' (harmony, bass + chords, fills)
 * or 'advanced' (fuller voicings, octave bass with walk-ups, gospel grooves).
 * Songs without a melody (chord charts) get the chords in the right hand and
 * the bass in the left hand, like a church keys player.
 */
export function songToMidi(song, { level = 'beginner' } = {}) {
  const L = Math.max(0, LEVELS.indexOf(level));
  const spb = 60 / song.bpm; // seconds per beat
  const beatsPerBar = (song.time[0] * 4) / song.time[1];
  const ev = [];
  const add = (beat, bytes) => ev.push({ time: beat * spb, bytes });
  const note = (ch, beat, beats, n, vel) => {
    if (n < 21 || n > 108) return;
    add(beat, [0x90 | ch, n, vel]);
    add(beat + beats * 0.95, [0x80 | ch, n, 0]);
  };
  add(0, [0xff, 0x59, 0x02, song.key & 0xff, song.minor ? 1 : 0]);
  add(0, [0xff, 0x58, 0x04, song.time[0], Math.log2(song.time[1]), 0x18, 0x08]);
  add(0, [0xc0, 0]); // right hand: piano
  add(0, [0xc1, 0]); // left hand: piano
  add(0, [0xb1, 7, 92]); // left hand a little softer in the mix

  const melody = parseMelody(song.melody);
  const chords = parseChords(song.chords);
  const end = Math.max(0, ...melody.map((n) => n.beat + n.beats), ...chords.map((c) => c.beat + c.beats));

  // Lyrics, as MIDI lyric events: on the melody notes, or line by line over the bars for chord charts.
  if (song.lyrics && melody.length) {
    parseLyricTokens(song.lyrics).forEach((t, i) => {
      if (t && melody[i]) add(melody[i].beat, metaEvent(0x05, lyricEventText(t)));
    });
  } else if (song.lyrics) {
    for (const l of lineLyricEvents(song.lyrics, beatsPerBar, song.lyricBars || 2)) add(l.beat, metaEvent(0x05, l.text));
  }

  // Right hand
  if (melody.length) {
    for (const n of melody) {
      note(0, n.beat, n.beats, n.note, 92);
      const harmony = L === 1 && n.beats >= 1 ? 1 : L === 2 && n.beats >= 0.5 ? 2 : 0;
      for (const h of harmonyBelow(n.note, chordAt(chords, n.beat), harmony)) note(0, n.beat, n.beats, h, 70);
    }
  } else {
    let center = 64;
    for (const c of chords) {
      const v = voicing(L === 2 ? colorPcs(c) : pcsOf(c).filter((pc, i, a) => a.length < 4 || i < 4), center);
      center = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
      if (L === 0) v.forEach((n) => note(0, c.beat, c.beats, n, 78));
      else {
        // Intermediate: on every beat. Advanced: a push rhythm (1, the "and" of 2, 4 in 4/4).
        const pattern = L === 1 ? Array.from({ length: Math.ceil(c.beats) }, (_, i) => [i, 1]) : beatsPerBar === 3 ? [[0, 1.5], [1.5, 1.5]] : [[0, 1.5], [1.5, 1.5], [3, 1]];
        for (let bar = 0; bar < c.beats - 1e-9; bar += beatsPerBar) {
          for (const [b, d] of pattern) {
            if (bar + b >= c.beats - 1e-9) continue;
            v.forEach((n) => note(0, c.beat + bar + b, Math.min(d, c.beats - bar - b), n, b === 0 ? 82 : 70));
          }
        }
      }
    }
  }

  // Left hand
  chords.forEach((c, i) => {
    const bassPc = c.chord.bass;
    let bass = 36 + bassPc; // C2..B2
    if (bass > 43) bass -= 12;
    if (L === 0) {
      if (melody.length) c.notes.forEach((n) => note(1, c.beat, c.beats * 1.02, n, 62));
      else note(1, c.beat, c.beats, bass + 12, 70); // charts: the root, one note
      return;
    }
    const next = chords[i + 1];
    if (L === 1) {
      const first = Math.min(c.beats, beatsPerBar >= 4 ? 2 : 1);
      note(1, c.beat, melody.length ? first : c.beats, bass, 75);
      if (melody.length && c.beats > first) c.notes.filter((n) => n > bass).forEach((n) => note(1, c.beat + first, c.beats - first, n, 60));
      else if (!melody.length) note(1, c.beat, c.beats, bass + 12, 62);
      return;
    }
    // Advanced: octave bass, shell voicing (3rd + 7th) with a melody, and a walk into the next chord.
    const walk = next && next.beat - (c.beat + c.beats) < 1e-9 && c.beats >= 2;
    const hold = walk ? c.beats - 1 : c.beats;
    note(1, c.beat, hold, bass, 82);
    note(1, c.beat, hold, bass + 12, 70);
    if (melody.length) {
      const third = c.chord.intervals.find((x) => x === 3 || x === 4 || x === 5) ?? 4;
      const seventh = c.chord.intervals.find((x) => x === 10 || x === 11) ?? 7;
      [third, seventh].forEach((x) => note(1, c.beat, hold, 48 + ((c.chord.root + x) % 12), 58));
    }
    if (walk) {
      let target = 36 + next.chord.bass;
      if (target > 43) target -= 12;
      const approach = target - 1 >= 28 ? target - 1 : target + 1; // chromatic step into the next root
      note(1, c.beat + c.beats - 1, 1, approach, 72);
    }
  });

  // Drums
  const style = DRUM_STYLES[song.drums];
  if (style) {
    const firstBeat = Math.min(melody[0]?.beat ?? Infinity, chords[0]?.beat ?? Infinity);
    const start = Math.ceil(firstBeat / style.beats - 1e-9) * style.beats;
    const hits = L === 2 ? style.pro : style.hits;
    let barNo = 0;
    for (let bar = start; bar < end - 0.01; bar += style.beats, barNo++) {
      const lastBar = bar + style.beats >= end - 0.01;
      const fill = L > 0 && !lastBar && barNo % 4 === 3;
      const crash = L > 0 && barNo % 4 === 0 && barNo > 0;
      const fillFrom = fill ? style.beats - (L === 2 ? 2 : 1) : Infinity;
      for (const [b, n, vel] of hits) {
        if (bar + b >= end || b >= fillFrom - 1e-9) continue;
        if (crash && b === 0 && (n === 42 || n === 51)) continue; // the crash replaces the first hat
        add(bar + b, [0x99, n, vel]);
        add(bar + b + 0.1, [0x89, n, 0]);
      }
      if (crash) {
        add(bar, [0x99, 49, 100]);
        add(bar + 0.1, [0x89, 49, 0]);
      }
      if (fill) {
        for (const [b, n, vel] of fillHits(style.beats, L === 2)) {
          add(bar + b, [0x99, n, vel]);
          add(bar + b + 0.1, [0x89, n, 0]);
        }
      }
    }
  }
  return writeMidi(ev, { bpm: song.bpm, name: song.title });
}

// ---- Your songs ---------------------------------------------------------------

const MY_KEY = 'kk.mysongs';

/** Songs you entered (chord charts) or saved (MIDI files). */
export function loadMySongs(storage = globalThis.localStorage) {
  try {
    const list = JSON.parse(storage?.getItem(MY_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveMySongs(list, storage = globalThis.localStorage) {
  try {
    storage?.setItem(MY_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // full or unavailable
  }
}

/** Check a song from the Song Builder; returns a list of problems (empty = good). */
export function validateSong(song) {
  const errors = [];
  if (!song.title?.trim()) errors.push('Give the song a title.');
  if (!(song.bpm >= 30 && song.bpm <= 260)) errors.push('Tempo should be between 30 and 260 BPM.');
  try {
    if (!parseChords(song.chords).length && !parseMelody(song.melody).length) errors.push('Enter some chords (or a melody).');
  } catch (e) {
    errors.push(e.message);
  }
  try {
    const notes = parseMelody(song.melody);
    // Lyrics written for a melody need one syllable (or "_") per note.
    if (song.lyrics && notes.length) {
      const n = parseLyricTokens(song.lyrics).length;
      if (n !== notes.length) errors.push(`Lyrics: ${n} syllables for ${notes.length} melody notes (one each; "_" holds a syllable).`);
    }
  } catch (e) {
    errors.push(`Melody: ${e.message}`);
  }
  return errors;
}
