// Filming scripts for the drum and bass video lessons: what the teacher says,
// what the camera shows and what appears on screen, scene by scene. Written to
// match each lesson's steps exactly, so the video teaches what the lesson then
// asks you to play. Paste one into an AI video tool (HeyGen, Synthesia,
// Higgsfield...) or film it yourself; then add the video to the lesson
// (Home → 🎬 Video lessons → ＋ Add video).
//
// A scene: { shot: camera direction, say: the teacher's words, screen: on-screen text (optional) }.
// Lessons without a script here fall back to the script made from their steps
// (lessonScript in courses.js).

import { teacherById } from './teachers.js';

const BEAT = 'beat-knight';
const JORDAN = 'strings-jordan';

export const VIDEO_SCRIPTS = {
  // ---- Drums: Meet the kit ---------------------------------------------------------
  'd-kit': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot behind the e-kit, sticks up, orange lights pulsing.', say: 'What\'s up, drummers! Sticks up, let\'s get this groove going. Today you meet the three drums behind almost every song you know.' },
      { shot: 'Wide shot from the side: thighs level, both feet on the pedals.', say: 'First, sit right. Thighs level, so you can reach every pad without stretching. Right foot on the kick pedal, left foot on the hi-hat pedal.', screen: 'Right foot: kick · Left foot: hi-hat' },
      { shot: 'Close-up on the right hand holding a stick a third of the way up.', say: 'Hold the sticks loose, between your thumb and first finger, about a third of the way up. Loose! Let the stick bounce. If you squeeze, the drum chokes.', screen: 'Grip a third of the way up · Let it bounce' },
      { shot: 'Close-up of the kick pedal; the beater hits and springs back.', say: 'Number one: the kick. Your right foot. Low and deep: boom. Press, and let the beater bounce back off the head. Boom, boom, boom, boom.', screen: 'KICK = "boom"' },
      { shot: 'Overhead on the snare pad, right stick hitting the centre.', say: 'Number two: the snare, right in front of you. Hit the middle: crack! Crack, crack, crack, crack.', screen: 'SNARE = "crack"' },
      { shot: 'Medium shot: right hand crosses over the left to the hi-hat.', say: 'Number three: the hi-hat, the two cymbals on the stand on your left. Your right hand crosses over and keeps time: tick, tick, tick, tick.', screen: 'HI-HAT = "tick"' },
      { shot: 'Back to medium shot, Beat Knight pointing at the camera.', say: 'Boom, crack, tick. Now it\'s your turn: four kicks, four snares, four hi-hats. The app hears every hit. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-toms': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot behind the kit.', say: 'What\'s up, drummers! You\'ve got kick, snare and hi-hat. Now let\'s meet the rest of the family: the toms and the cymbals.' },
      { shot: 'Slow pan across tom 1, tom 2 and the floor tom, each lighting up.', say: 'These round drums are the toms. Tom 1 is the highest, then tom 2, and down here on your right, the floor tom, the lowest. Listen: high, middle, low.', screen: 'Tom 1 (high) · Tom 2 · Floor tom (low)' },
      { shot: 'Close-up as he plays tom 1, tom 2, floor tom, then back up.', say: 'Down the toms: one, two, floor. And back up: floor, two, one. That\'s the sound of every drum fill you love.' },
      { shot: 'Medium shot, stick pointing to the crash (left, high), then the ride (right).', say: 'Two cymbals. The crash, up on your left, is the big accent: crash! The ride, on your right, keeps steady time in the big parts of a song: ding, ding, ding.', screen: 'CRASH = accent · RIDE = steady time' },
      { shot: 'Wide shot: kick and crash hit together, cymbal shaking.', say: 'And the biggest sound on the kit: kick and crash at exactly the same time. Boom-crash! That\'s how a chorus begins.', screen: 'Kick + crash together' },
      { shot: 'Back to medium shot.', say: 'Your turn: down the toms, back up, crash, ride, and two big kick-crashes. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-sticking': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, sticks crossed in an X.', say: 'What\'s up, drummers! Today we talk hands. Drummers have a secret code for which hand plays what. It\'s called sticking.' },
      { shot: 'Graphic over the snare: R L R L.', say: 'R means right hand. L means left hand. When you see R L R L, that\'s single strokes: right, left, right, left.', screen: 'R = right · L = left' },
      { shot: 'Close-up on both sticks over the snare, at the same height.', say: 'Here\'s the trick: keep both sticks at the same height. Same height, same sound. If one hand is lower, you\'ll hear it.', screen: 'Same height = same sound' },
      { shot: 'Overhead: eight even single strokes on the snare, counting.', say: 'Listen. Right, left, right, left, right, left, right, left. Even, like a clock.' },
      { shot: 'Wide shot: two hits on each drum around the kit.', say: 'Now take it around the kit, two hits per drum: snare, snare, tom one, tom one, tom two, tom two, floor, floor. Right, left the whole way.', screen: 'SN SN · T1 T1 · T2 T2 · FT FT' },
      { shot: 'Medium shot.', say: 'Slow and even beats fast and messy, every time. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },

  // ---- Drums: Your first beats -------------------------------------------------------
  'd-quarter': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, Beat Knight nodding to a click.', say: 'What\'s up, drummers! Today you play your first real beat. Two drums, four counts. Let\'s go.' },
      { shot: 'Graphic: 1 2 3 4, with kick on 1 and 3, snare on 2 and 4.', say: 'Count out loud with me: one, two, three, four. Kick on one and three. Snare on two and four.', screen: '1 kick · 2 snare · 3 kick · 4 snare' },
      { shot: 'Close-up of the kick foot and the snare stick, playing slowly.', say: 'Boom, crack, boom, crack. One, two, three, four.' },
      { shot: 'Medium shot, hand on heart.', say: 'That snare on two and four is called the backbeat. It\'s the heartbeat of almost every song on the radio and in church.', screen: 'Backbeat = snare on 2 and 4' },
      { shot: 'Over-the-shoulder view of the app\'s drum highway.', say: 'First the app waits for every hit, so take your time. Then it plays a click: one bar to listen, then you join in and stay with the click.' },
      { shot: 'Medium shot.', say: 'Keep counting out loud. If you can count it, you can play it. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-rock': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, big smile.', say: 'What\'s up, drummers! This is the big one. The basic beat. This one beat plays thousands of songs.' },
      { shot: 'Graphic: 1 and 2 and 3 and 4 and, a hi-hat on each.', say: 'Count with me, faster now: one and two and three and four and. Eight counts. Your right hand plays the hi-hat on every one of them.', screen: '1 & 2 & 3 & 4 & = 8 hi-hats' },
      { shot: 'Close-up, hi-hat only, eight even notes.', say: 'Tick, tick, tick, tick, tick, tick, tick, tick. Nice and even.' },
      { shot: 'Medium shot, adding the kick and snare.', say: 'Now add what you know. Kick on one and three. Snare on two and four with your left hand.', screen: 'Kick 1 & 3 · Snare 2 & 4 (left hand)' },
      { shot: 'Slow motion: stick and foot landing together on beat 1.', say: 'On one, two, three and four, your hand and foot land together. On the "ands", just the hi-hat.' },
      { shot: 'Full speed, the groove playing.', say: 'Listen: boom-tick, tick, crack-tick, tick, boom-tick, tick, crack-tick, tick. Locked in! That\'s the pocket!' },
      { shot: 'Medium shot.', say: 'Learn it slowly with the app first, then play it in time. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-worship': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, warm lights.', say: 'What\'s up, drummers! Let\'s take the basic beat to church. This is the worship beat.' },
      { shot: 'Graphic: 1 and 2 AND 3 and 4 and, with 1, the AND of 2 and 3 in bold.', say: 'Modern worship pushes the kick. Count: one and two AND three and four and. Kick on one, on the "and" after two, and on three.', screen: 'Kick: 1 · "and" of 2 · 3' },
      { shot: 'Close-up on the kick foot playing 1, and-of-2, 3.', say: 'Boom, ba-boom. Boom, ba-boom. That extra kick right before three is what makes it feel like it\'s moving forward.' },
      { shot: 'Medium shot, full groove.', say: 'Hands stay the same as the basic beat: hi-hat on every count, snare on two and four. Only the foot changes.', screen: 'Hands: same as the basic beat' },
      { shot: 'Medium shot.', say: 'Learn it with the app, then play it in time. Listen to a worship song this week and hear that kick. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },

  // ---- Drums: Crashes and fills ------------------------------------------------------
  'd-crash': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot.', say: 'What\'s up, drummers! How do you tell the whole band the chorus is here? With the crash.' },
      { shot: 'Wide shot: kick and crash on beat 1, then the basic beat.', say: 'When a new part of the song starts, from verse to chorus, play the crash and kick together on beat one, instead of the hi-hat. Then straight back into the beat.', screen: 'New section: crash + kick on 1' },
      { shot: 'Close-up on the right hand moving from crash back to hi-hat.', say: 'The tricky part is the trip back. Crash on one, then your right hand comes right back to the hi-hat for "and". Don\'t wait.' },
      { shot: 'Medium shot, playing two bars.', say: 'Crash, tick, crack, tick, boom, tick, crack, tick. Then a normal bar. Then crash again.' },
      { shot: 'Medium shot.', say: 'Your turn, in time with the click. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-fill1': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, sticks spinning.', say: 'What\'s up, drummers! Today you play your first fill. A fill is a little drum break that leads the song into the next part.' },
      { shot: 'Graphic: beats 1 2 3 = groove, beat 4 = "4 e and a" on the snare.', say: 'The easiest fill: play the beat for three counts. Then on four, four quick snare hits: four-e-and-a. Right, left, right, left. Then crash on one.', screen: 'Beat for 1 2 3 · Snare "4 e & a" (R L R L) · Crash on 1' },
      { shot: 'Close-up on the snare, the four sixteenths slowly.', say: 'Slowly: four, e, and, a. Even, like single strokes, just squeezed into one beat.' },
      { shot: 'Medium shot: beat, fill, crash at full speed.', say: 'All together: one, two, three, four-e-and-a, CRASH! That\'s the sound of the band going into the chorus.' },
      { shot: 'Medium shot, serious face.', say: 'Most important rule of fills: land on one. Whatever happens in the fill, the crash comes exactly on one.', screen: 'Always land on 1' },
      { shot: 'Medium shot.', say: 'Learn it with the app, then play a bar of beat and a bar with the fill. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-tomfill': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot.', say: 'What\'s up, drummers! You\'ve got a snare fill. Now let\'s use the whole kit. Around the toms!' },
      { shot: 'Overhead, eighth notes moving down the drums.', say: 'Two hits on each drum, going down: snare, snare, tom one, tom one, tom two, tom two, floor, floor. Then crash on one.', screen: 'SN SN · T1 T1 · T2 T2 · FT FT · CRASH' },
      { shot: 'Close-up, sticking R L on each drum.', say: 'It\'s your single strokes from before: right, left on every drum. Your arms just travel.' },
      { shot: 'Medium shot: one bar of beat, the tom fill, crash.', say: 'In a song: a bar of the beat, then the fill, then crash. Boom crack, boom crack, da-da da-da da-da da-da, CRASH!' },
      { shot: 'Medium shot.', say: 'Keep it even, going down the drums, and land that crash on one. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },

  // ---- Drums: Church grooves -------------------------------------------------------
  'd-hymn': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, softer lighting, brushes-quiet energy.', say: 'What\'s up, drummers! Some of the best songs in church don\'t count to four. They count to three. Let\'s play a hymn.' },
      { shot: 'Graphic: 1 2 3, 1 2 3.', say: 'Amazing Grace and Silent Night are in three-four. Count: one, two, three. One, two, three. Like a waltz.', screen: '3/4: count 1 2 3' },
      { shot: 'Close-up: stick laid across the snare, tip on the head, hitting the rim.', say: 'Here\'s a new sound: the cross-stick. Lay your stick across the snare and click it on the rim. Soft, woody, perfect for a hymn.', screen: 'Cross-stick: stick across the snare, click the rim' },
      { shot: 'Medium shot, playing gently.', say: 'Kick on one. Cross-stick on two and three. Hi-hat on every beat. Boom, click, click. Boom, click, click.', screen: 'Kick 1 · Cross-stick 2 & 3 · Hi-hat every beat' },
      { shot: 'Medium shot, hand on chest.', say: 'And play it soft. In a hymn, your job is to support the singers, not cover them.' },
      { shot: 'Medium shot.', say: 'Learn the hymn waltz, then play it in time. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-shuffle': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, bouncing in his seat.', say: 'What\'s up, drummers! This one bounces. The gospel shuffle.' },
      { shot: 'Graphic: each beat split into three: 1 trip-let.', say: 'In a shuffle every beat splits into three. Say it: one-trip-let, two-trip-let, three-trip-let, four-trip-let.', screen: 'Each beat = 3: "1 trip-let"' },
      { shot: 'Close-up on the hi-hat playing the first and last of each three.', say: 'The hi-hat plays the first and the last of every three: one . a, two . a. Skip the middle. Hear the bounce? Ting, ga-ting, ga-ting.', screen: 'Hi-hat: "1 . a 2 . a"' },
      { shot: 'Medium shot, adding kick on 1 and 3 and snare on 2 and 4.', say: 'Kick on one and three, snare on two and four, just like the basic beat. Only the hi-hat swings.' },
      { shot: 'Full groove at tempo.', say: 'That swing is the bounce of a lot of gospel and blues. Locked in! That\'s the pocket!' },
      { shot: 'Medium shot.', say: 'Learn it, then play it in time and feel the bounce. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-twostep': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, high energy, lights brighter.', say: 'What\'s up, drummers! You know that moment in church when the whole place starts moving? That\'s the praise break. That\'s the two-step.' },
      { shot: 'Close-up on the kick foot on every beat.', say: 'The kick plays on every beat: one, two, three, four. We call it four on the floor.', screen: 'Kick on every beat: "four on the floor"' },
      { shot: 'Medium shot, adding hi-hat eighths and snare on 2 and 4.', say: 'Hi-hats on every "and" too, eight per bar. Snare on two and four. Boom-crack, boom-crack, all night long.', screen: 'Hi-hat 8ths · Snare 2 & 4' },
      { shot: 'Medium shot, slowing down.', say: 'Start slow. In church this can go really fast, but fast comes from slow. Get it steady first.' },
      { shot: 'Medium shot.', say: 'Learn it, play it in time, then go speed it up on Stage. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-song-jesus': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot.', say: 'What\'s up, drummers! Time to play a whole song. Jesus Loves Me.' },
      { shot: 'Over-the-shoulder on the app, the drum highway scrolling.', say: 'You\'re playing the drum part from start to finish. The notes come down the highway, and the song waits for every hit. So there\'s no rush.', screen: 'The song waits for you' },
      { shot: 'Medium shot, playing along gently.', say: 'You\'ll hear the beats you already know. Listen to the singers, and play soft enough that the words come through.' },
      { shot: 'Medium shot.', say: 'When you can play it all the way through, take it to Stage and earn your crowns. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-song-amazing': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, softer lighting.', say: 'What\'s up, drummers! Remember the hymn waltz? Let\'s play it in a real song: Amazing Grace.' },
      { shot: 'Graphic: 1 2 3.', say: 'Three-four time. One, two, three. Kick on one, cross-stick on two and three.', screen: '3/4 · soft and steady' },
      { shot: 'Medium shot, playing gently along with the song.', say: 'Soft and steady. You are the floor the singers stand on. Steady matters more than loud.' },
      { shot: 'Close-up on Beat Knight listening, head tilted, still playing.', say: 'Listen to the words while you play. When the song gets to the last line, keep the same soft beat all the way to the end. No big fill, no rushing. Just land it.', screen: 'Same soft beat to the very end' },
      { shot: 'Medium shot.', say: 'The song waits for every hit, so take your time. Then try it on Stage. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },

  // ---- Bass: Getting started ---------------------------------------------------------
  'b-tune': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up on the stool, bass on the lap, warm lamps behind.', say: 'Hey friend, grab your bass, let\'s play something good. First things first: let\'s hold it and tune it.' },
      { shot: 'Close-up on the four strings, each lighting up from thickest to thinnest.', say: 'Four strings. From the thickest to the thinnest: E, A, D, G. Same as the four lowest strings on a guitar, just an octave lower.', screen: 'E A D G (thickest → thinnest)' },
      { shot: 'Close-up on the right hand: thumb resting on the pickup, two fingers plucking.', say: 'Rest your thumb on the pickup. Pluck with your first two fingers, taking turns: index, middle, index, middle. Pull through the string, don\'t lift it.', screen: 'Thumb on the pickup · Index, middle' },
      { shot: 'Over the shoulder: the app\'s tuner needle as a string is plucked and a peg turned.', say: 'Now tune. Turn on the microphone and put it near your amp. Pluck a string and turn its peg slowly until the needle sits right in the middle.', screen: '🎤 on · Needle in the middle' },
      { shot: 'Close-up on the tuning pegs.', say: 'Go slow. A tiny turn makes a big change. E, then A, then D, then G.' },
      { shot: 'Medium close-up.', say: 'Tune every time you pick it up. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-open': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. Today we play without pressing down anything: open strings.' },
      { shot: 'Close-up on the right hand plucking E, A, D, G.', say: 'Open means you just pluck it, no left hand. Listen: E, A, D, G. Feel how low that E is.', screen: 'Open strings: E A D G' },
      { shot: 'Extreme close-up: index and middle finger alternating on the E string.', say: 'Now the real secret of bass: alternate your fingers. Index, middle, index, middle. Never the same finger twice.', screen: 'Index · middle · index · middle' },
      { shot: 'Medium shot: four on E, four on A.', say: 'Four on the E string, then four on the A. Even, steady, every note the same volume. Sweet, that rang out clean!' },
      { shot: 'Medium close-up.', say: 'Steady and even beats a lot of notes. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Bass: Notes on the neck -------------------------------------------------------
  'b-e-a': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. Time to use that left hand.' },
      { shot: 'Close-up on the left hand, four fingers over frets 1 to 4.', say: 'One finger per fret. Index on fret one, middle on two, ring on three, pinky on four. Your hand stays in one place and the fingers do the work.', screen: 'One finger per fret' },
      { shot: 'Fretboard graphic: E string, frets 0, 1, 3.', say: 'On the E string: open is E. First fret is F. Third fret is G. E, F, G.', screen: 'E string: open E · fret 1 F · fret 3 G' },
      { shot: 'Fretboard graphic: A string, frets 0, 2, 3, 5.', say: 'On the A string: open is A. Second fret, B. Third fret, C. Fifth fret, D. A, B, C, D.', screen: 'A string: open A · 2 B · 3 C · 5 D' },
      { shot: 'Medium shot, playing them slowly.', say: 'Press just behind the fret, not on top of it. Most church songs live right here, on these two strings.' },
      { shot: 'Medium close-up.', say: 'Play them with the app: it shows you where each note is. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-roots': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. Today you learn the bass player\'s main job.' },
      { shot: 'Graphic: a G chord symbol with an arrow to the note G.', say: 'Every chord has a name: G, C, D. That name is the root. Your job: play the root of each chord, on beat one. For a G chord, play G. For C, play C. For E minor, play E.', screen: 'Chord G → play G · C → C · Em → E' },
      { shot: 'Fretboard graphic with G, C, D, E marked.', say: 'Where are they? G is the E string, third fret. C is the A string, third fret. D is the A string, fifth fret. And E is just the open E string.', screen: 'G: E str 3 · C: A str 3 · D: A str 5 · E: open' },
      { shot: 'Medium shot, playing G, D, E, C slowly.', say: 'Now the worship four, roots only: G, D, E, C. That\'s the chord pattern of hundreds of worship songs.', screen: 'Worship four: G D E C' },
      { shot: 'Medium close-up.', say: 'Roots on beat one hold the whole band together. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-fifth': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. You\'ve got roots. Now let\'s give them a partner: the fifth.' },
      { shot: 'Fretboard graphic: root on the E string fret 3, fifth on the A string fret 5.', say: 'Here\'s the shape. From the root, the fifth is two frets up on the next string. G on the E string, third fret. Its fifth, D, on the A string, fifth fret.', screen: 'Fifth = next string, two frets up' },
      { shot: 'Close-up, playing G-D, G-D.', say: 'Root, fifth, root, fifth. G, D, G, D. That bounce is the classic country and gospel bass.', screen: 'G-D G-D' },
      { shot: 'Close-up: the same shape moved to C on the A string.', say: 'Same shape anywhere. C on the A string, third fret, and its fifth, G, on the D string, fifth fret. C, G, C, G.', screen: 'C-G C-G' },
      { shot: 'Medium close-up.', say: 'One shape, every chord. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Bass: Play along in time --------------------------------------------------------
  'b-chart-gcd': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, foot tapping.', say: 'Hey friend, grab your bass, let\'s play something good. Today we play in time, with a click.' },
      { shot: 'Graphic: a bar with four beats, a root on each.', say: 'Play the root on every beat: four notes per bar. When the chord changes, change right on the bar line.', screen: 'Root on every beat · change on the bar line' },
      { shot: 'Over the shoulder on the app chart: G, C, G, D, G, C, D, G.', say: 'The chords are G, C, G, D, then G, C, D, G. Watch the chart, and look ahead: know where your hand goes before the bar line comes.' },
      { shot: 'Medium shot, playing steady quarter notes.', say: 'Steady and even beats a lot of notes. Four, even, with the click. Sweet, that rang out clean!' },
      { shot: 'Medium close-up.', say: 'There\'s a bar of clicks first, so you can get ready. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-worship-flow': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. Let\'s play a whole song: Worship Flow.' },
      { shot: 'Graphic: G, D/F#, Em, C.', say: 'It\'s the one-five-six-four: G, D, E minor, C. One twist: the D chord has F sharp in the bass, D over F sharp. So you play F sharp, not D.', screen: 'Roots: G · F# (D/F#) · E · C' },
      { shot: 'Fretboard close-up: G (E string 3), F# (E string 2), E (open).', say: 'And look how smooth that is. G on the third fret, F sharp on the second, then open E. The bass walks down step by step.', screen: 'G → F# → E: walking down' },
      { shot: 'Medium shot, playing along with the song.', say: 'Then C on the A string, third fret, and round again into the chorus.' },
      { shot: 'Medium close-up.', say: 'The app follows the chart and listens for your roots. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-amazing': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, soft lamp light.', say: 'Hey friend, grab your bass, let\'s play something good. Let\'s play a hymn: Amazing Grace.' },
      { shot: 'Graphic: 1 2 3, a long note on 1.', say: 'This one\'s in three-four: one, two, three. Here\'s the bass part: one root per bar, on beat one, and let it ring all the way through two and three.', screen: '3/4 · one root per bar · let it ring' },
      { shot: 'Close-up on G, C and D on the fretboard.', say: 'The chords are G, C and D. You know these: G on the E string, C and D on the A string.' },
      { shot: 'Medium shot, playing long notes with the song.', say: 'Fewer notes, more feeling. Let each note fill the room.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
};

/** The filming script for a lesson, or null if it has none here. */
export const videoScriptFor = (lessonId) => VIDEO_SCRIPTS[lessonId] || null;

/** Rough speaking time in seconds (145 words a minute, like lessonScript). */
export function scriptSeconds(script) {
  const words = script.scenes.reduce((n, s) => n + s.say.split(/\s+/).filter(Boolean).length, 0);
  return Math.round((words / 145) * 60);
}

/**
 * The script as text for an AI video tool or a camera operator: header, the
 * teacher's look, then numbered scenes with [SHOT], the line and [ON SCREEN].
 */
export function filmingScriptText(lesson, script, { number = 0, course = '', unit = '' } = {}) {
  const t = teacherById(script.teacher);
  const who = t.name.toUpperCase();
  const secs = scriptSeconds(script);
  const lines = [
    `LESSON ${number ? `${number} · ` : ''}${lesson.title}${course ? `  (${course}${unit ? ` › ${unit}` : ''})` : ''}`,
    `Teacher: ${t.name} (${t.role}) · about ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
    `[LOOK] ${t.look}`,
    `[VOICE] ${t.voice}`,
    '',
  ];
  script.scenes.forEach((s, i) => {
    lines.push(`SCENE ${i + 1}`);
    lines.push(`[SHOT] ${s.shot}`);
    lines.push(`${who}: ${s.say}`);
    if (s.screen) lines.push(`[ON SCREEN] ${s.screen}`);
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

/** Spoken words only, one paragraph (for tools that take just the narration). */
export const spokenText = (script) => script.scenes.map((s) => s.say).join(' ');

/** CSV for bulk AI video tools: one row per lesson. */
export function scriptsCsvFor(entries) {
  const rows = [['lesson_id', 'lesson', 'unit', 'teacher', 'est_seconds', 'narration', 'full_script']];
  for (const { lesson, unit, number, course } of entries) {
    const script = videoScriptFor(lesson.id);
    if (!script) continue;
    rows.push([lesson.id, lesson.title, unit?.title || '', teacherById(script.teacher).name, scriptSeconds(script), spokenText(script), filmingScriptText(lesson, script, { number, course, unit: unit?.title })]);
  }
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}
