// Filming scripts for the video lessons (drums, bass, guitar, and the newer piano and voice units): what the teacher says,
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
const MAESTRO = 'maestro-k';
const GRACE = 'melody-grace';

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

  // ---- Drums: Colour and control -------------------------------------------------------
  'd-openhat': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot behind the kit, left foot visible on the hi-hat pedal.', say: 'What\'s up, drummers! Today we add some sizzle to the basic beat: the open hi-hat.' },
      { shot: 'Close-up on the hi-hat as the foot lifts and the cymbals part.', say: 'Lift your left foot a little and the two cymbals come apart. Hit it now and you get a long "tssss" instead of a short "tick".', screen: 'Foot up = open "tssss"' },
      { shot: 'Graphic: 1 & 2 & 3 & 4 &, the last "&" glowing.', say: 'We open it on the very last hit of the bar: the "and" of four. One and two and three and four AND.', screen: 'Open on the "and" of 4' },
      { shot: 'Close-up on the foot pressing down exactly as the next bar starts.', say: 'Then press your foot down right on the next one to close it. Open on the "and", closed on one. Tick, tick, tick, tsss, CLOSE.', screen: 'Close it on the next 1' },
      { shot: 'Medium shot, full groove at tempo.', say: 'Listen to that. Same basic beat, but now it breathes at the end of every bar. Locked in! That\'s the pocket!' },
      { shot: 'Medium shot.', say: 'Learn it with the app, then play it in time. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-ride': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, stick tapping the ride cymbal on the right.', say: 'What\'s up, drummers! How do you make a chorus feel bigger without playing louder? Move to the ride.' },
      { shot: 'Close-up on the ride cymbal, playing eighths: ding, ding.', say: 'This is the ride cymbal, on your right. Same eighth notes your hand plays on the hi-hat, but it rings wide: ding, ding, ding, ding.', screen: 'RIDE: same 8ths, bigger sound' },
      { shot: 'Wide shot: a bar on the hi-hat, then crash and over to the ride.', say: 'Verse on the hi-hat. Then the chorus comes: crash on one, and your right hand stays out on the ride. Kick and snare don\'t change at all.', screen: 'Verse: hi-hat · Chorus: crash → ride' },
      { shot: 'Close-up on the right arm travelling from crash to ride.', say: 'The crash and the ride are close together, so it\'s a short trip. Crash, and land on the ride for the "and".' },
      { shot: 'Medium shot.', say: 'Learn the ride beat, then play a verse bar and a chorus bar. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-16ths': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, slow tempo, relaxed.', say: 'What\'s up, drummers! Slow song, but you want it to feel alive? Sixteenth notes on the hi-hat.' },
      { shot: 'Graphic: 1 e & a 2 e & a 3 e & a 4 e & a.', say: 'Four hi-hats on every beat. Count it: one-e-and-a, two-e-and-a, three-e-and-a, four-e-and-a. Sixteen per bar.', screen: '1 e & a · 2 e & a · 3 e & a · 4 e & a' },
      { shot: 'Close-up, right hand alone on the hi-hat, light and even.', say: 'At slow tempos one hand does it. Keep it light: small motions, stick close to the cymbal. Even, like rain.' },
      { shot: 'Medium shot, adding kick on 1 and 3, snare on 2 and 4.', say: 'Kick on one and three, snare on two and four, same as always. The hi-hat just got busier.', screen: 'Kick 1 & 3 · Snare 2 & 4' },
      { shot: 'Medium shot.', say: 'Slow first: the app starts you at fifty. Even beats fast. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-accents': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, sticks over the snare.', say: 'What\'s up, drummers! Today we learn to talk with the sticks. Loud and soft. It\'s called an accent.' },
      { shot: 'Close-up: one stick raised high, the other low near the head.', say: 'An accent is one note louder than the rest. The secret is height, not muscle. Loud note: stick starts high. Soft note: stick starts low, just a couple of inches.', screen: 'Loud = stick high · Soft = stick low' },
      { shot: 'Overhead: sixteenths R L R L on the snare, accents on each beat.', say: 'Sixteenths on the snare, right left right left, and an accent on every beat. ONE-e-and-a, TWO-e-and-a. Loud, soft, soft, soft.', screen: 'ONE e & a · TWO e & a' },
      { shot: 'Close-up, slow motion: after the accent the stick stops low.', say: 'After the loud note, stop the stick low, ready for the soft ones. Down-stroke, then taps.' },
      { shot: 'Medium shot.', say: 'The app checks your timing; your ears check the accents. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },

  // ---- Drums: More church drumming -----------------------------------------------------
  'd-68': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, soft warm lights, slow sway.', say: 'What\'s up, drummers! The altar call, the slow worship song that makes everybody close their eyes. A lot of those are in six-eight.' },
      { shot: 'Graphic: 1 2 3 4 5 6, with 1 and 4 big.', say: 'Count six: one, two, three, four, five, six. But feel it in two big beats: ONE two three, FOUR five six. Like a slow rocking.', screen: '6/8: 1 2 3 4 5 6 · felt on 1 and 4' },
      { shot: 'Close-up: hi-hat on all six, kick on 1, snare on 4.', say: 'Hi-hat on all six. Kick on one. Snare on four. Boom, tick, tick, crack, tick, tick.', screen: 'Hi-hat ×6 · Kick 1 · Snare 4' },
      { shot: 'Medium shot, eyes closed, playing gently.', say: 'The click only pulses on one and four, the big beats. Let it breathe. Don\'t fill every space.' },
      { shot: 'Medium shot.', say: 'Learn it, then play it in time. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-stops': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, finger to lips.', say: 'What\'s up, drummers! Here\'s something they don\'t tell beginners: what you don\'t play matters as much as what you do. Today: hits and stops.' },
      { shot: 'Wide shot: the band (graphic) hitting together, then silence.', say: 'A hit is when the whole band plays the same notes together, then stops. Your job: kick and crash on the hits, and leave the silence empty.', screen: 'Hits: everyone together · then silence' },
      { shot: 'Graphic: 1 & 2 &, hits on 1 and the "&" of 2.', say: 'Our hits are on one and on the "and" of two. Crash-kick, ... crash-kick. Then nothing till the next bar.', screen: 'Hits on 1 and the "and" of 2' },
      { shot: 'Medium shot, nodding silently through the rest.', say: 'Count through the silence in your head: three and four and. Don\'t rush back in. The space is the exciting part.' },
      { shot: 'Medium shot.', say: 'A bar of beat, then the hits. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-song-saints': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, big grin.', say: 'What\'s up, drummers! Time for a happy one. When the Saints Go Marching In.' },
      { shot: 'Over-the-shoulder on the app, the drum highway scrolling.', say: 'It\'s bright and it bounces. You\'re playing the drum part from start to finish, and the song waits for every hit, so learn it at your own speed.' },
      { shot: 'Medium shot, playing along.', say: 'Listen for the big moments and lean in with the crash. Smile while you play this one. It\'s a celebration.', screen: 'Bright · steady · celebrate' },
      { shot: 'Medium shot.', say: 'When you\'ve got it, take it to Stage and speed it up. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },
  'd-song-praise': {
    teacher: BEAT,
    scenes: [
      { shot: 'Medium shot, lights flashing orange, high energy.', say: 'What\'s up, drummers! This is it. Shout music. The Praise Break.' },
      { shot: 'Close-up on the kick foot, four on the floor.', say: 'Remember the two-step? Kick on every beat, snare on two and four, hats in eighths. Now it goes full speed: about a hundred thirty beats a minute in church.', screen: 'Two-step at full energy' },
      { shot: 'Over-the-shoulder on the app.', say: 'Here the song waits for you, so learn every hit slowly first. Fast comes from slow, every single time.' },
      { shot: 'Medium shot, wiping forehead and laughing.', say: 'Stay relaxed. Tight arms get tired, loose arms keep going. Locked in! That\'s the pocket!' },
      { shot: 'Medium shot.', say: 'Then take it to Stage and go for the crowns. Practice slow, play it clean, and I\'ll catch you on the next beat.' },
    ],
  },

  // ---- Voice: Warm-ups and technique --------------------------------------------------
  'v-liptrill': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot by the studio microphone, stained-glass light behind.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today: the warm-up every singer loves, and everyone laughs at the first time. The lip trill.' },
      { shot: 'Close-up on her lips fluttering, "brrr".', say: 'Close your lips loosely and blow, so they flutter like a little motorboat. Brrrr. Now add your voice to it.', screen: 'Lips loose · blow · add voice: "brrr"' },
      { shot: 'Close-up: fingertips pressing gently into the cheeks.', say: 'If your lips won\'t flutter, press one finger gently into each cheek. That takes the weight off and lets them buzz.' },
      { shot: 'Medium shot, trilling up and down Do Re Mi Re Do.', say: 'Why do we do this? It balances your air and your voice, so the high notes come easier and nothing gets squeezed. Do, Re, Mi, Re, Do.', screen: 'Do Re Mi Re Do · then Do Mi Sol Mi Do' },
      { shot: 'Medium shot.', say: 'If the trill stops, just sing "ah". Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-hum': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, hand on her face near the nose.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we find your ring. It starts with a hum.' },
      { shot: 'Close-up: lips closed, a slight smile.', say: 'Lips closed, teeth apart, and hum: mmmm. Can you feel a buzz on your lips and around your nose? That buzz is resonance.', screen: 'Lips closed · teeth apart · feel the buzz' },
      { shot: 'Medium shot, humming down Sol Fa Mi Re Do.', say: 'Resonance is the ring that makes your voice carry across a room without pushing. Hum down with me: Sol, Fa, Mi, Re, Do.' },
      { shot: 'Close-up, humming then opening to "ah" on one note.', say: 'Now the magic: hum on Do, then open to "ah" and keep that same buzz. Mmmm-aaah. Hear how bright it stays?', screen: '"mm…" → "…ah": keep the buzz' },
      { shot: 'Medium shot.', say: 'Yes! I heard that, right in tune! Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-vowels': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we talk about the secret of choirs that sound like one voice: vowels.' },
      { shot: 'Close-ups of her mouth shaping each vowel.', say: 'Words are carried by vowels. Tall "ah". Bright "eh". Narrow "ee". Round "oh". Small "oo".', screen: 'ah · eh · ee · oh · oo' },
      { shot: 'Medium shot, singing one note through all five vowels.', say: 'Now one note, five vowels. The pitch stays perfectly still; only your mouth changes. Ah, eh, ee, oh, oo.' },
      { shot: 'Graphic: a choir with matching mouth shapes.', say: 'When everyone in a choir shapes the same vowel the same way, the sound locks together. That\'s the blend you hear in the best choirs.', screen: 'Same vowel shape = choir blend' },
      { shot: 'Medium shot.', say: 'Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-longnotes': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, hands on her sides.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today: holding a long note, steady all the way to the end.' },
      { shot: 'Close-up: her sides and belly expanding as she breathes in.', say: 'Breathe in low. Your belly and your sides move out, your shoulders stay still. That\'s your fuel tank.', screen: 'Breathe low: belly and sides, not shoulders' },
      { shot: 'Medium shot, holding a long note, the app\'s hold bar filling.', say: 'Here\'s the secret: long notes need steady air, not more air. Let it out slowly, like you\'re trying to make it last.', screen: 'Steady air, not more air' },
      { shot: 'Close-up, the end of the note staying in tune.', say: 'Listen to the very end of the note. If it wobbles or goes flat, take a bigger breath next time and spend it slower.' },
      { shot: 'Medium shot.', say: 'Three seconds, then five. You can do it. Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-dynamics': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, leaning toward the mic softly.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we play with volume: soft and strong.' },
      { shot: 'Close-up, singing a soft, floating note.', say: 'Soft singing still needs your breath underneath it. A soft note should float and stay in tune. Not breathy, not shaky. Like a lullaby.', screen: 'Soft = supported, not breathy' },
      { shot: 'Medium shot, the same note strong and full.', say: 'Now the same note, strong. Full and bright, like the big chorus. But no shouting and no squeezing your throat. The power comes from your breath.', screen: 'Strong = full, not shouting' },
      { shot: 'Medium shot, growing louder up Do Mi Sol Do.', say: 'Let\'s grow as we climb: Do, Mi, Sol, Do, starting soft and arriving strong.' },
      { shot: 'Medium shot.', say: 'Yes! I heard that, right in tune! Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },

  // ---- Voice: Ear training ---------------------------------------------------------------
  'v-intervals': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot by the piano.', say: 'Hey singers! Let\'s warm up that beautiful voice. Big jumps in a melody can feel scary. Today I\'ll give you a trick that makes them easy.' },
      { shot: 'Graphic: Do → Fa with "Amazing Grace" underneath.', say: 'Link each jump to a song you already know. Do up to Fa is called a fourth. It\'s the start of Amazing Grace: "A-ma".', screen: '4th: Do → Fa · "A-ma-zing Grace"' },
      { shot: 'Graphic: Do → Sol with "Twinkle, Twinkle" underneath.', say: 'Do up to Sol is a fifth. That\'s Twinkle, Twinkle: "Twin-kle".', screen: '5th: Do → Sol · "Twin-kle, twin-kle"' },
      { shot: 'Close-up, eyes closed, then singing the jump.', say: 'Hear the song in your head first, then sing the jump. Your ear already knows these. You\'re just borrowing them.' },
      { shot: 'Medium shot.', say: 'Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-minor': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, softer lighting.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we sing in minor, the sound of prayer and longing.' },
      { shot: 'Medium shot, singing Do Mi Sol, then La Do Mi.', say: 'Major melodies center on Do. Minor melodies center on La. Listen: Do, Mi, Sol. Now La, Do, Mi. Feel the difference?', screen: 'Major: Do Mi Sol · Minor: La Do Mi' },
      { shot: 'Close-up, singing La Ti Do Re Mi slowly.', say: 'Now up the minor five: La, Ti, Do, Re, Mi. And gently back down to La. Let it be tender.' },
      { shot: 'Medium shot, hand on heart.', say: 'Many spirituals and worship songs live in minor. When you know how it feels, you\'ll sing them with real feeling.' },
      { shot: 'Medium shot.', say: 'Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-noref': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, playful.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we take the training wheels off: singing without the piano helping.' },
      { shot: 'Close-up at the piano, one key: Do.', say: 'You\'ll hear Do one time. Sing it, and remember it. That\'s your home base.', screen: 'Hear Do once · remember it' },
      { shot: 'Medium shot, eyes closed, singing up the scale on her own.', say: 'Then up the scale on your own: Re, Mi, Fa, Sol, and back down to Do. Before each note, hear it in your head first. Then sing it.', screen: 'Hear it inside, then sing it' },
      { shot: 'Medium shot.', say: 'That inner hearing is what keeps a whole choir in tune when the band drops out. It grows every time you practice it.' },
      { shot: 'Medium shot.', say: 'Yes! I heard that, right in tune! Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },

  // ---- Voice: Worship singing --------------------------------------------------------------
  'v-runs': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, big smile.', say: 'Hey singers! Let\'s warm up that beautiful voice. You asked for it: your first gospel run!' },
      { shot: 'Graphic: "Ye-e-e-es" with notes stepping down.', say: 'A run is several notes on one word. "Ye-e-e-es." The secret every great gospel singer knows: learn it slow first. Every single note clean.', screen: 'Run = many notes on one word' },
      { shot: 'Medium shot, singing Sol Fa Mi Re Do slowly on "yes".', say: 'Down the scale from Sol to Do, on "yes". Sol, Fa, Mi, Re, Do. Slow. Clean.' },
      { shot: 'Close-up, a lighter, quicker turn on "Lord".', say: 'Now a little turn on "Lord": Mi, Re, Do, Re, Do. Lighter and quicker, like a ribbon.' },
      { shot: 'Medium shot.', say: 'Speed comes later. Clean comes first. Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-harmony3': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today you learn to sing harmony. And it\'s easier than you think.' },
      { shot: 'Graphic: melody Do Re Mi with Mi Fa Sol above it.', say: 'The easiest harmony sits a third above the melody. When the melody sings Do, you sing Mi. Re, you sing Fa. Mi, you sing Sol.', screen: 'Melody Do Re Mi → Harmony Mi Fa Sol' },
      { shot: 'Medium shot, singing the melody, then the harmony line.', say: 'It moves the same way as the tune, just higher. Melody: Do, Re, Mi, Re, Do. Harmony: Mi, Fa, Sol, Fa, Mi.' },
      { shot: 'Close-up, singing the harmony alone with eyes closed.', say: 'Learn the harmony line on its own first. Then sing it while you hum the melody in your head underneath.' },
      { shot: 'Medium shot.', say: 'Grab a friend: one sings melody, one sings harmony. That\'s the start of a choir. Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-joyful': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, beaming.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we sing a bright hymn: Joyful, Joyful, We Adore Thee.' },
      { shot: 'Close-up, singing with a smile, then without.', say: 'Here\'s a real singer\'s trick: smile while you sing it. Listen. Without a smile... with a smile. It really changes the sound.', screen: 'Smile: it brightens the sound' },
      { shot: 'Over the shoulder on the app, the melody waiting for her notes.', say: 'The song waits for each note, so take your time. Any octave counts, so sing where it\'s comfortable.' },
      { shot: 'Medium shot, singing a phrase joyfully.', say: 'Breathe at the end of each line, and let the words shine.' },
      { shot: 'Close-up, pointing to the melody climbing on screen.', say: 'Watch the part where the melody climbs: lift your eyebrows and think up, and the higher notes float out instead of getting pushed.' },
      { shot: 'Medium shot.', say: 'Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-saints': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, clapping on 2 and 4.', say: 'Hey singers! Let\'s warm up that beautiful voice. Let\'s sing a big, happy one: When the Saints Go Marching In.' },
      { shot: 'Close-up, a big low breath before the line.', say: 'This song is big and joyful, so take a strong breath before every line. "Oh, when the saints..."', screen: 'Big breath before each line' },
      { shot: 'Medium shot, holding a long note.', say: 'Let the long notes ring all the way through. "Marching in" holds: don\'t cut it short.' },
      { shot: 'Over the shoulder on the app.', say: 'The song waits for you to sing each note, any octave. Take it at your pace.' },
      { shot: 'Medium shot.', say: 'Yes! I heard that, right in tune! Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },
  'v-doxology': {
    teacher: GRACE,
    scenes: [
      { shot: 'Medium shot, reverent, stained-glass light.', say: 'Hey singers! Let\'s warm up that beautiful voice. Today we sing the song so many churches sing every Sunday: the Doxology.' },
      { shot: 'Graphic: "Praise God, from whom all blessings flow".', say: 'Praise God, from whom all blessings flow. The notes are steady and even, almost all the same length. Like walking together.', screen: 'Steady, even notes' },
      { shot: 'Close-up, one breath per line.', say: 'One breath per line. Breathe before "Praise God", sing the whole line on it, then breathe again.', screen: 'One breath per line' },
      { shot: 'Medium shot, singing a line.', say: 'Sing it like you mean every word. That matters more than any technique.' },
      { shot: 'Close-up on the final "Amen".', say: 'And at the end, the Amen: two long notes. Hold them together with everyone, and let them fade gently.' },
      { shot: 'Medium shot.', say: 'Drink some water, keep singing, and I\'ll see you soon.' },
    ],
  },

  // ---- Piano: Scales and chords ---------------------------------------------------------
  'p-scale-c': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot at the grand piano, warm stage lights.', say: 'Welcome back to the keys, family. Today we learn the scale every pianist plays first: C major.' },
      { shot: 'Overhead on the keys: C to C lighting up.', say: 'A scale walks up every note of a key. C major is all white keys, from C to the next C. Eight notes.', screen: 'C D E F G A B C' },
      { shot: 'Close-up on the right hand: fingers 1 2 3, then the thumb passing under.', say: 'Here\'s the secret. Fingers one, two, three: C, D, E. Then your thumb tucks under your hand to F. Then one, two, three, four, five, all the way up to C.', screen: 'RH: 1 2 3 · thumb under · 1 2 3 4 5' },
      { shot: 'Slow-motion side view of the wrist staying level as the thumb passes.', say: 'Keep your wrist level and quiet. The thumb slides under like it\'s sneaking. No jumping.' },
      { shot: 'Close-up coming back down: finger 3 crossing over the thumb.', say: 'Coming down, it\'s the opposite: after the thumb lands on F, finger three crosses over to E.', screen: 'Down: 3 crosses over the thumb' },
      { shot: 'Medium shot.', say: 'Slow and even. Every note the same volume. Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },
  'p-scale-c-lh': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot at the piano.', say: 'Welcome back to the keys, family. Your left hand wants a scale too.' },
      { shot: 'Overhead: the left hand on C below middle C.', say: 'Same C major scale, one octave lower. The left hand is a mirror of the right, so the fingering flips.', screen: 'LH: one octave below middle C' },
      { shot: 'Close-up on the left hand: 5 4 3 2 1, then finger 3 crossing over.', say: 'Five, four, three, two, one: C, D, E, F, G. Then finger three crosses over the thumb to A. Two, one: B, C.', screen: 'LH: 5 4 3 2 1 · 3 over · 2 1' },
      { shot: 'Close-up coming back down: the thumb tucking under after G.', say: 'Going down, the thumb tucks under after G. It\'s the right hand\'s trick, backwards.' },
      { shot: 'Medium shot.', say: 'Left hands are usually weaker, so give this one extra love. Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },
  'p-scale-g': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot at the piano, smiling.', say: 'Welcome back to the keys, family. Today you meet your first black key in a scale. G major.' },
      { shot: 'Overhead: G to G lighting up, the F sharp glowing.', say: 'Start a major scale on G and one black key shows up: F sharp. G, A, B, C, D, E, F sharp, G.', screen: 'G A B C D E F♯ G' },
      { shot: 'Graphic: a key signature with one sharp.', say: 'That\'s why songs in G have one sharp in the key signature. The scale tells you the key.', screen: 'Key of G = one sharp (F♯)' },
      { shot: 'Close-up on the right hand: finger 4 on the F sharp.', say: 'Same fingering as C: one, two, three, thumb under, one, two, three, four, five. Your fourth finger lands right on the black key.' },
      { shot: 'Medium shot.', say: 'Now that is how it\'s done. Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },
  'p-scale-am': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot, softer lighting.', say: 'Welcome back to the keys, family. Today: the minor scale, and a little secret about it.' },
      { shot: 'Overhead: A to A lighting up, all white keys.', say: 'A minor uses the very same white keys as C major. But it starts on A. A, B, C, D, E, F, G, A.', screen: 'A B C D E F G A' },
      { shot: 'Medium shot, playing C major then A minor.', say: 'Listen. C major sounds bright. A minor, same notes, sounds thoughtful. Same notes, different home.' },
      { shot: 'Graphic: C major with its 6th note A circled.', say: 'Every major key has a relative minor that starts on its sixth note. For C, that\'s A. Same key signature, different mood.', screen: 'Relative minor = start on the 6th note' },
      { shot: 'Medium shot.', say: 'Same fingering as C major. Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },
  'p-major-minor': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot at the piano.', say: 'Welcome back to the keys, family. One little move turns a happy chord into a tender one. Let me show you.' },
      { shot: 'Overhead: C E G, then the E dropping to E flat.', say: 'C major: C, E, G. Now lower the middle note by one key, to E flat. That\'s C minor.', screen: 'Major → minor: lower the middle note' },
      { shot: 'Medium shot, playing C then Cm, G then Gm.', say: 'C... C minor. G... G minor. Hear the mood change? Major sounds bright. Minor sounds tender.' },
      { shot: 'Overhead: A minor, D minor, E minor, all white keys.', say: 'And in the key of C there are three minor chords you can play on white keys: A minor, D minor and E minor.', screen: 'Am · Dm · Em' },
      { shot: 'Medium shot.', say: 'Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },
  'p-inversions': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot, leaning in.', say: 'Welcome back to the keys, family. Want to know how church pianists move between chords so smoothly? Inversions.' },
      { shot: 'Overhead: C E G, then C moving up an octave.', say: 'An inversion is the same chord with a different note on the bottom. Take C, E, G and move the C up. Now it\'s E, G, C. We call that C over E.', screen: 'C/E = E G C' },
      { shot: 'Overhead: moving E up too.', say: 'Do it again: G, C, E. That\'s C over G. Same three notes, three different shapes.', screen: 'C · C/E · C/G' },
      { shot: 'Close-up: C, F/C, G/B, C with the hand barely moving.', say: 'Now watch. C, then F with C on the bottom, then G with B on the bottom, then C. My hand hardly moves. That\'s the church sound.' },
      { shot: 'Medium shot.', say: 'Now that is how it\'s done. Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },
  'p-sevenths': {
    teacher: MAESTRO,
    scenes: [
      { shot: 'Medium shot, gospel energy.', say: 'Welcome back to the keys, family. Today we add the spice that gospel players put on everything: seventh chords.' },
      { shot: 'Overhead: G B D, then F added on top.', say: 'Take G: G, B, D. Add one more note on top, F. That\'s G seven. Four notes.', screen: 'G7 = G B D F' },
      { shot: 'Medium shot, playing G, G7, then C.', say: 'Listen to the pull. G... G seven... and home to C. The seven leans so hard it almost begs to go home.' },
      { shot: 'Overhead: C7 to F, D7 to G.', say: 'Every seventh chord points somewhere. C seven leads to F. D seven leads to G.', screen: 'C7 → F · D7 → G' },
      { shot: 'Medium shot, playing a hymn ending with a G7 before the last chord.', say: 'Next time you hear a hymn end, listen for that seven right before the final chord. Now you know why it feels like coming home.' },
      { shot: 'Medium shot.', say: 'Keep those fingers curved, and I\'ll see you next lesson.' },
    ],
  },

  // ---- Guitar: Scales and solos ----------------------------------------------------------
  'g-pent-open': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, guitar ready.', say: 'Hey friend, grab your guitar, let\'s play something good. Today you learn the scale behind almost every guitar solo: the pentatonic.' },
      { shot: 'Graphic: five note names.', say: 'Pentatonic means five notes. And here\'s the best part: there are almost no wrong notes in it. It just sounds good.', screen: '5 notes · almost no wrong notes' },
      { shot: 'Close-up on the neck, open position: open strings and frets 2 and 3.', say: 'E minor pentatonic in open position: two notes on every string. Open, then fret three on the low E. Open, two. Open, two. Open, two. Open, three. And the open high E.', screen: 'Open strings + frets 2 and 3' },
      { shot: 'Medium shot, playing it up and down slowly, then a little lick.', say: 'Up and back down. Then mix the notes in any order, and you\'re already playing a little solo.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-major-scale': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your guitar, let\'s play something good. Today: the G major scale, in one hand position.' },
      { shot: 'Close-up: finger 2 on G, low E string 3rd fret; one finger per fret.', say: 'Second finger on G, low E string, third fret. Now give each finger one fret: first finger on fret two, up to your pinky on fret five. Your hand stays still.', screen: 'One finger per fret: 2 to 5' },
      { shot: 'Close-up, playing up the scale and naming notes.', say: 'G, A on the low E. B, C, D on the A string. E, F sharp, G on the D string. That\'s every note of the key of G.', screen: 'G A B C D E F♯ G' },
      { shot: 'Medium shot, playing back down.', say: 'And back down. Slow and even. The chords you know in G, G, C, D and E minor, are all built from these notes.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-pent-box': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, playing a quick bluesy lick first.', say: 'Hey friend, grab your guitar, let\'s play something good. That sound? It all comes from one shape. The pentatonic box.' },
      { shot: 'Close-up: index finger on fret 5 of every string.', say: 'A minor pentatonic at the fifth fret. Your first finger plays fret five on every string. Then your third or fourth finger plays fret seven or eight.', screen: 'Finger 1 on fret 5 · fingers 3/4 on 7/8' },
      { shot: 'Fretboard graphic of the whole box.', say: 'Low E: five and eight. A and D and G: five and seven. B: five and eight. High E: five and eight. That\'s the box.', screen: 'The box: 5-8 · 5-7 · 5-7 · 5-7 · 5-8 · 5-8' },
      { shot: 'Medium shot, playing it up and down, then a short solo.', say: 'Learn it once, and you can solo over any song in A minor, or C major. Move it to another fret for another key.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Bass: Arpeggios and pentatonics ----------------------------------------------------
  'b-arpeggios': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, bass on the lap.', say: 'Hey friend, grab your bass, let\'s play something good. Today: arpeggios, the backbone of a bass line.' },
      { shot: 'Graphic: R 3 5 8.', say: 'An arpeggio is a chord played one note at a time: the root, the third, the fifth, and the octave.', screen: 'Arpeggio: root · 3rd · 5th · octave' },
      { shot: 'Close-up on G major: E string 3, A string 2, A string 5, D string 5.', say: 'G major: G on the E string, third fret. B on the A string, second fret. D on the A string, fifth fret. And G again on the D string, fifth fret.', screen: 'G B D G' },
      { shot: 'Close-up on A minor: E string 5 and 8, A string 7, D string 7.', say: 'For minor, the third moves down one fret. A minor: A, C, E, A, at the fifth fret.', screen: 'A C E A' },
      { shot: 'Medium close-up.', say: 'Up and back down, nice and even. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-pent': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, grooving.', say: 'Hey friend, grab your bass, let\'s play something good. Today, five notes that fit almost any groove: the minor pentatonic.' },
      { shot: 'Close-up: finger 1 on fret 5 of each string.', say: 'A minor pentatonic at the fifth fret. First finger on fret five. Then fret eight on the E string, and fret seven on the A and D strings.', screen: 'E: 5-8 · A: 5-7 · D: 5-7' },
      { shot: 'Close-up, playing up and down slowly.', say: 'A, C, D, E, G, A. And back down. Gospel and funk bass fills live right here.' },
      { shot: 'Medium shot, playing a short fill between two roots.', say: 'Try it: play the root for three beats, then grab two or three pentatonic notes on beat four to fill. Instant groove.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: Getting started ----------------------------------------------------------
  'g-tune': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up on the stool, acoustic guitar on the right leg, warm lamps.', say: 'Hey friend, grab your guitar, let\'s play something good. Welcome to guitar! First: how to hold it, and how to tune it.' },
      { shot: 'Wide shot from the front: body on the right leg, neck angled up to the left.', say: 'Sit with the guitar\'s body on your right leg, the neck pointing left and a little up. Your left hand presses the strings on the neck, thumb behind it. Your right hand strums over the sound hole.', screen: 'Body on the right leg · neck up and left' },
      { shot: 'Close-up: the six strings lighting up one by one, thickest to thinnest.', say: 'Six strings. From the thickest, number six, to the thinnest, number one: E, A, D, G, B, E. Remember it like this: Eddie Ate Dynamite, Good Bye Eddie.', screen: 'E A D G B E · "Eddie Ate Dynamite, Good Bye Eddie"' },
      { shot: 'Over the shoulder: the app\'s tuner needle while a string is plucked and a peg turned.', say: 'Now tune. Turn on the microphone in the app. Pluck one string, and turn its tuning peg slowly until the needle sits right in the middle.', screen: '🎤 on · needle in the middle' },
      { shot: 'Close-up on the tuning pegs, small turns.', say: 'Small turns. A tiny turn changes a lot. Go string by string, six through one.' },
      { shot: 'Medium close-up.', say: 'A tuned guitar sounds good even with one chord. Tune every time. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-open': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your guitar, let\'s play something good. Your first notes, and you don\'t even need your left hand.' },
      { shot: 'Close-up on the right hand picking a single open string, letting it ring.', say: 'An open string is played without pressing any fret. Pick one string with your thumb or a pick, and let it ring.', screen: 'Open string = no frets pressed' },
      { shot: 'Close-up, picking each string from the thickest to the thinnest, slowly.', say: 'From the thickest to the thinnest: E, A, D, G, B, E. One at a time. Hear each one ring out.' },
      { shot: 'Close-up, picking back up from the thinnest to the thickest.', say: 'And back the other way: E, B, G, D, A, E. Try to hit only one string each time. That\'s the real skill here.', screen: 'Hit only one string' },
      { shot: 'Medium close-up.', say: 'The app listens to every note, so take your time. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: First notes and melodies -----------------------------------------------
  'g-frets': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your guitar, let\'s play something good. Today your left hand joins in: frets one and three.' },
      { shot: 'Extreme close-up: fingertip pressing just behind the fret wire.', say: 'Press with the very tip of your finger, just behind the metal fret wire. Not on top of it, just behind. That\'s where it sounds clean.', screen: 'Fingertip, just behind the fret wire' },
      { shot: 'Close-up: index on fret 1, ring finger on fret 3 of the high E string.', say: 'Finger one, your index, plays fret one. Finger three, your ring finger, plays fret three. On the high E string: open is E, fret one is F, fret three is G.', screen: 'High E string: open E · 1 F · 3 G' },
      { shot: 'Close-up, playing E F G F E, then on the B string B C D C B.', say: 'E, F, G, F, E. Then the same on the B string: B, C, D, C, B. Up and back down.' },
      { shot: 'Medium close-up, rubbing fingertips.', say: 'Fingertips sore? That\'s normal for the first couple of weeks. They toughen up. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-mary': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, playful.', say: 'Hey friend, grab your guitar, let\'s play something good. Time for your first song: Mary Had a Little Lamb.' },
      { shot: 'Fretboard graphic: E (high E open), D (B fret 3), C (B fret 1), G (high E fret 3).', say: 'Four notes on two strings. E is the open high E string. D is the B string, third fret. C is the B string, first fret. And G is the high E string, third fret.', screen: 'E: open · D: B3 · C: B1 · G: E3' },
      { shot: 'Close-up, playing the first line slowly while singing along softly.', say: 'Ma-ry had a lit-tle lamb: E, D, C, D, E, E, E. Little lamb: D, D, D. Little lamb: E, G, G.' },
      { shot: 'Medium shot, playing it through with a smile.', say: 'Sing it in your head while you play. If you know how a song goes, your fingers find it faster.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-joyful': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, warm.', say: 'Hey friend, grab your guitar, let\'s play something good. Today: a hymn with a famous melody. Joyful, Joyful, We Adore Thee.' },
      { shot: 'Graphic: "Ode to Joy" with the hymn title under it.', say: 'The melody is Beethoven\'s Ode to Joy. Same notes you just learned, on the high E and B strings.', screen: 'Ode to Joy = Joyful, Joyful' },
      { shot: 'Close-up, playing the first phrase slowly: E E F G G F E D.', say: 'E, E, F, G, G, F, E, D. It climbs up and walks back down, step by step.' },
      { shot: 'Close-up, the second half: C C D E E D D.', say: 'Then C, C, D, E, E, D, D. Most notes are right next to each other, so your hand barely moves.' },
      { shot: 'Medium close-up.', say: 'Play it slow and smooth, like you\'re singing it. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: First chords ----------------------------------------------------------
  'g-em': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your guitar, let\'s play something good. Today you play your first chords. And the first one is the easiest chord on guitar.' },
      { shot: 'Close-up: fingers 2 and 3 on the 2nd fret of the A and D strings.', say: 'E minor. Fingers two and three on the second fret of the A and D strings. That\'s it. Now strum all six strings, top to bottom.', screen: 'Em: fingers 2 and 3 on fret 2 (A, D)' },
      { shot: 'Medium shot, strumming Em and letting it ring.', say: 'Listen to that. A whole chord. Strum it, let it ring, strum it again.' },
      { shot: 'Close-up: the Em shape moving down a string, finger 1 adding the B string fret 1.', say: 'A minor: move that same shape down one string, onto the D and G strings, and add finger one on the first fret of the B string. And don\'t play the low E string.', screen: 'Am: same shape one string down + finger 1 on B1 · skip low E' },
      { shot: 'Medium shot, changing slowly Am to Em.', say: 'Now go back and forth. A minor, E minor. Slow is fine. Smooth is the goal.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-gcd': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, excited.', say: 'Hey friend, grab your guitar, let\'s play something good. Today you learn the three chords behind hundreds of hymns and worship songs: G, C and D.' },
      { shot: 'Close-up on the G shape: fingers spread wide.', say: 'G: three fingers spread wide. Low E string, third fret, finger two. A string, second fret, finger one. High E, third fret, finger three.', screen: 'G: E3 (2) · A2 (1) · high E3 (3)' },
      { shot: 'Close-up on the C shape: fingers stepping down from the A string.', say: 'C: fingers three, two, one stepping down from the A string. A string third fret, D string second fret, B string first fret. Skip the low E.', screen: 'C: A3 · D2 · B1 · skip low E' },
      { shot: 'Close-up on the D triangle, strumming only the top four strings.', say: 'D: a little triangle on the top three strings. G second fret, B third fret, high E second fret. Strum just the top four strings.', screen: 'D: G2 · B3 · E2 · top 4 strings' },
      { shot: 'Medium shot, G, C, D, G slowly.', say: 'G, C, D, G. Put those together and you can play an amazing number of songs.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-worship4': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, soft worship lighting.', say: 'Hey friend, grab your guitar, let\'s play something good. Today: the four chords of modern worship.' },
      { shot: 'Graphic: G → D → Em → C, labelled 1 5 6 4.', say: 'G, D, E minor, C. Musicians call it the one-five-six-four. Once you hear it, you\'ll hear it everywhere.', screen: 'The worship four: G · D · Em · C (1-5-6-4)' },
      { shot: 'Close-up on D/F#: thumb over the neck on the low E string, 2nd fret.', say: 'Worship players love one trick here: D over F sharp. Play D, and put your thumb, or your first finger, on the second fret of the low E string.', screen: 'D/F#: D + low E string fret 2' },
      { shot: 'Close-up on the low strings: G, F#, E walking down.', say: 'Now listen to the bass: G, F sharp, E. It walks down step by step. Plain D works too, so use whichever you can play today.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: Strum along in time ----------------------------------------------------
  'g-strum-em-am': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, foot tapping.', say: 'Hey friend, grab your guitar, let\'s play something good. Today we play in time, with a click.' },
      { shot: 'Graphic: 1 2 3 4 with a down-arrow on each.', say: 'Strum down on every beat: one, two, three, four. Keep your strumming hand moving like a pendulum, even between chords.', screen: 'Down on every beat: 1 2 3 4' },
      { shot: 'Close-up on the left hand lifting on beat 4.', say: 'Here\'s the secret: start changing chords on beat four. Let the last strum be a little loose, so the new chord is ready right on one.', screen: 'Change on beat 4' },
      { shot: 'Over the shoulder on the app chart, Em and Am lighting up.', say: 'E minor and A minor, one bar each. The chord to play lights up. Watch it, and stay with the click.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-strum-gcd': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your guitar, let\'s play something good. G, C and D, now in time.' },
      { shot: 'Over the shoulder on the chart: G C G D G C D G.', say: 'Eight bars, one chord each: G, C, G, D, then G, C, D, G. Four down-strums per bar.', screen: 'G C G D · G C D G' },
      { shot: 'Close-up on the left hand moving early, on beat 4.', say: 'And remember: change on beat four. If you wait for one, you\'ll always be late. Move early, land on time.' },
      { shot: 'Medium shot, playing along steadily.', say: 'If you miss a chord, don\'t stop. Keep strumming, catch the next one. That\'s what real players do.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-worship-flow': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, soft worship lighting.', say: 'Hey friend, grab your guitar, let\'s play something good. Let\'s play a whole song: Worship Flow.' },
      { shot: 'Graphic: G, D/F#, Em, C.', say: 'It\'s the worship four you learned: G, D over F sharp, E minor, C. Then the chorus moves things around a little.', screen: 'G · D/F# · Em · C' },
      { shot: 'Over the shoulder on the app chart.', say: 'The chart shows the chord to play, and the app listens through the microphone to check you\'re on the right one.' },
      { shot: 'Medium shot, playing along, eyes closed for a moment.', say: 'Once the changes feel easy, stop looking at your hands. Look up, and worship. That\'s the whole point.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-amazing': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, reverent.', say: 'Hey friend, grab your guitar, let\'s play something good. Today: a hymn everybody knows. Amazing Grace.' },
      { shot: 'Graphic: 1 2 3 with a big DOWN on 1.', say: 'Amazing Grace is in three-four. Count one, two, three, and strum DOWN, down, down. Strong on one, lighter on two and three.', screen: '3/4: DOWN down down' },
      { shot: 'Close-up on G, C and D.', say: 'Just three chords: G, C and D. You know them all.', screen: 'G · C · D' },
      { shot: 'Close-up on the left hand: G to C, and D back to G.', say: 'Most of the time you\'re on G. Watch for the C and the D coming, and change on beat three so you\'re ready on one.' },
      { shot: 'Medium shot, playing along gently.', say: 'Play it gently and let it sway. Think about the words while you play.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: More open chords ---------------------------------------------------------
  'g-e-a': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up on the stool, acoustic guitar on the right leg.', say: 'Hey friend, grab your guitar, let\'s play something good. Two big bright chords today: E and A.' },
      { shot: 'Close-up on the left hand making Em, then adding finger 1.', say: 'You know E minor. Now add your first finger on the first fret of the G string. That\'s E major. One finger turns sad into happy. Listen: E minor... E.', screen: 'E = Em + finger 1 on G string, fret 1' },
      { shot: 'Close-up: three fingers side by side on the 2nd fret.', say: 'A: three fingers squeezed side by side on the second fret: D, G and B strings. Skip the low E string.', screen: 'A: fingers 1 2 3 on fret 2 (D G B) · skip low E' },
      { shot: 'Medium shot, strumming A, E, A, D.', say: 'Now A, E, A, D. Those three chords play a huge number of songs in the key of A.' },
      { shot: 'Medium close-up.', say: 'If A feels crowded, tilt your fingers a little so they fit. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-dm': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, softer mood.', say: 'Hey friend, grab your guitar, let\'s play something good. Today we meet the minor family.' },
      { shot: 'Close-up on the left hand forming the Dm triangle.', say: 'D minor: a little triangle on the top strings. G string, second fret, finger two. B string, third fret, finger three. High E, first fret, finger one. Strum just the top four strings.', screen: 'Dm: G2 · B3 · E1 · top 4 strings' },
      { shot: 'Medium shot, strumming Dm and Am slowly.', say: 'D minor, A minor. Hear that? Minor chords sound thoughtful, a little sad. Perfect for a quiet prayer song.' },
      { shot: 'Graphic: Am, Dm, Em.', say: 'Am, Dm, Em: the whole minor family. Now you can play them all.', screen: 'The minor family: Am · Dm · Em' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-sevenths': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your guitar, let\'s play something good. Today: seventh chords, the chords that want to go somewhere.' },
      { shot: 'Close-up on G7: fingers 3, 2 and 1.', say: 'G seven: third finger on the low E, third fret. Second finger on the A string, second fret. First finger on the high E, first fret.', screen: 'G7: E3 · A2 · high E1' },
      { shot: 'Medium shot: G, G7, then resolving to C.', say: 'Listen to the pull. G... G seven... and home to C. The seven leans toward the next chord, like a question waiting for an answer.', screen: 'G7 → C: the seven leads home' },
      { shot: 'Close-up on D7 and E7.', say: 'D seven: a little backwards triangle on the top strings. E seven: your E chord with the D-string finger lifted off. D seven leads to G. E seven leads to A minor.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-colors': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, warm lamp light.', say: 'Hey friend, grab your guitar, let\'s play something good. Ever wonder why worship guitar sounds so open and shimmery? Two chords: Cadd9 and Dsus4.' },
      { shot: 'Close-up on Cadd9.', say: 'C add nine: second finger on the A string, third fret. First finger on the D string, second fret. Third finger on the B string, third fret.', screen: 'Cadd9: A3 · D2 · B3' },
      { shot: 'Medium shot, G to Cadd9 and back.', say: 'G to C add nine. It rings bright, and it sits so close to G that the change is easy.' },
      { shot: 'Close-up on Dsus4, then finger 3 lifting to D.', say: 'D sus four is a D that leans. Play it, then move your third finger from the third fret down to the second. That\'s D. The lean resolves. Lean, rest. Lean, rest.', screen: 'Dsus4 → D: lean, then rest' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-easyf': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, a knowing smile.', say: 'Hey friend, grab your guitar, let\'s play something good. Today we take on the chord everybody worries about: F. But we\'ll sneak up on it.' },
      { shot: 'Close-up on Fmaj7.', say: 'First, F major seven: third finger on the D string, third fret. Second on the G string, second fret. First on the B string, first fret. High E open. Top four strings.', screen: 'Fmaj7: D3 · G2 · B1 · E open' },
      { shot: 'Medium shot, C to Fmaj7.', say: 'C to F major seven. Dreamy, right? Same fingers almost. Get comfortable here first.' },
      { shot: 'Extreme close-up: finger 1 laid flat over the B and high E strings.', say: 'Now lay your first finger flat across the B and high E strings at the first fret. That\'s F. Press with the side of your finger and roll it slightly toward the headstock.', screen: 'F: finger 1 flat over B and E, fret 1' },
      { shot: 'Medium shot, C, F, G, C.', say: 'C, F, G, C. The one-four-five in C. If a string buzzes, that\'s normal at first. It cleans up in a week or two.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: Strumming patterns -------------------------------------------------------
  'g-downup': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, strumming hand in frame.', say: 'Hey friend, grab your guitar, let\'s play something good. Today your strumming hand learns to go both ways.' },
      { shot: 'Graphic: 1 & 2 & 3 & 4 & over D U D U D U D U.', say: 'Count one and two and three and four and. Down on the numbers, up on the "and". Down, up, down, up.', screen: 'D U D U D U D U' },
      { shot: 'Slow-motion close-up: the up-strum catching only the top strings.', say: 'The up-strum is lighter. It only catches the top few strings. Don\'t try to hit all six on the way up.' },
      { shot: 'Medium shot, hand swinging like a pendulum while changing chords.', say: 'The secret: your hand never stops. Like a pendulum. Even when you change chords, keep it swinging.', screen: 'Keep the hand moving' },
      { shot: 'Medium close-up.', say: 'Play along: G, E minor, C, D. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-worshipstrum': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, relaxed groove.', say: 'Hey friend, grab your guitar, let\'s play something good. This is the strum you hear in almost every worship song.' },
      { shot: 'Graphic: D, D U, U D U under 1 2 & & 4 &.', say: 'Down... down up... up down up. Count it: one, two and, and, four and.', screen: 'D · D U · U D U' },
      { shot: 'Slow-motion close-up on beat 3: the hand goes down but misses the strings.', say: 'Here\'s the trick. On beat three your hand still goes down, but it misses the strings. A ghost strum. That keeps the pendulum going so the up-strums land in the right place.', screen: 'Beat 3: ghost strum (miss the strings)' },
      { shot: 'Medium shot, strumming the worship four.', say: 'Now the worship four: G, D, E minor, C. Down, down up, up down up.' },
      { shot: 'Medium close-up.', say: 'Say it out loud while you play until your hand knows it. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-waltz': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, candlelight feel.', say: 'Hey friend, grab your guitar, let\'s play something good. Let\'s play a carol everyone knows: Silent Night.' },
      { shot: 'Graphic: 1 2 3 with a big DOWN on 1.', say: 'Silent Night is in three-four. Strum DOWN, down, down. A strong strum on one, two lighter ones on two and three.', screen: '3/4: DOWN down down' },
      { shot: 'Close-up on C, G7 and F.', say: 'Three chords: C, G seven, and F. You\'ve got them all now.', screen: 'C · G7 · F' },
      { shot: 'Close-up on the left hand moving from C to G7.', say: 'Watch the change from C to G seven: your fingers move almost as a group. Change on beat three, so the new chord is ready right on one.', screen: 'Change on beat 3' },
      { shot: 'Medium shot, playing gently along.', say: 'Play it soft and let it sway. This is a song to sing to, not over.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Guitar: Church songs -------------------------------------------------------------
  'g-saints': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, upbeat.', say: 'Hey friend, grab your guitar, let\'s play something good. A happy one: When the Saints Go Marching In.' },
      { shot: 'Close-up on C7: the C shape plus the pinky on the G string.', say: 'C, G, C seven and F. C seven is your C chord plus your pinky on the third fret of the G string. It leads right into the F.', screen: 'C7 = C + pinky on G string, fret 3' },
      { shot: 'Close-up on the left hand: C to G, G back to C.', say: 'Most of the song is C. When G comes, it\'s only for a bar, so be ready to come right back home to C.' },
      { shot: 'Medium shot, strumming along with energy.', say: 'Keep your strum bright and bouncy. When the song gets to F, that\'s the big moment. Dig in.' },
      { shot: 'Medium close-up.', say: 'Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-doxology': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, reverent tone.', say: 'Hey friend, grab your guitar, let\'s play something good. Today, the song a lot of churches sing every Sunday: the Doxology.' },
      { shot: 'Graphic: G, D, C, Em.', say: 'Praise God, from whom all blessings flow. The chords are G, D, C and E minor, and they move fast. Some only last one beat.', screen: 'G · D · C · Em · some last 1 beat' },
      { shot: 'Close-up on the strumming hand: one down-stroke per beat.', say: 'So keep it simple: one down-strum per beat. And keep your eyes on the next chord, not the one you\'re playing.' },
      { shot: 'Medium shot, playing along slowly.', say: 'The app starts it slow. Get the changes clean first, then speed comes.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-barre': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, encouraging.', say: 'Hey friend, grab your guitar, let\'s play something good. Today\'s a big step: your first barre chords. Take a breath. We\'ve got this.' },
      { shot: 'Extreme close-up: finger 1 flat across the 2nd fret, then the other fingers.', say: 'B minor. Lay your first finger flat across the strings at the second fret, from the A string down. Then ring finger and pinky on the fourth fret of the D and G strings, middle finger on the B string, third fret. Skip the low E.', screen: 'Bm: barre fret 2 · D4 · G4 · B3' },
      { shot: 'Close-up on the thumb behind the neck.', say: 'Thumb low behind the neck, squeeze gently, roll that first finger a little onto its side. It takes weeks to sound clean. That\'s normal for everybody.', screen: 'It takes weeks: that\'s normal' },
      { shot: 'Medium shot, strumming D, A, Bm, G.', say: 'D, A, B minor, G. That\'s the worship four in the key of D.' },
      { shot: 'Close-up on F#m: the Em shape at the 2nd fret.', say: 'F sharp minor: your first finger across all six strings at the second fret, and your E minor shape with fingers three and four on the fourth fret.', screen: 'F#m = Em shape at fret 2' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'g-ballad68': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, soft light, slow sway.', say: 'Hey friend, grab your guitar, let\'s play something good. Let\'s put it all together in a slow worship ballad.' },
      { shot: 'Graphic: 1 2 3 4 5 6, strums on 1 and 4.', say: 'It\'s in six-eight. Count one two three four five six, and strum on one and four. Let each chord ring.', screen: '6/8: strum on 1 and 4' },
      { shot: 'Graphic: G/D → G, A/C# → A, Asus4 → A.', say: 'You\'ll see some slash chords. G over D? Just play G. A over C sharp? Just play A. A sus four leans, then resolves to A.', screen: 'G/D = G · A/C# = A' },
      { shot: 'Medium shot, playing along gently, including Bm and F#m.', say: 'And yes, there\'s B minor and F sharp minor in there. You know them now. If a barre buzzes, keep going. The song keeps moving and so do you.' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
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

  // ---- Bass: Rhythm and feel -----------------------------------------------------------
  'b-eighths': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, nodding to an upbeat click.', say: 'Hey friend, grab your bass, let\'s play something good. Want to push a song forward? Eighth notes.' },
      { shot: 'Graphic: 1 & 2 & 3 & 4 &, a root on each.', say: 'Instead of four notes a bar, play eight. Count: one and two and three and four and. A root on every count.', screen: '8 per bar: 1 & 2 & 3 & 4 &' },
      { shot: 'Extreme close-up: index and middle fingers alternating fast and even.', say: 'This is where alternating fingers really pays off. Index, middle, index, middle. Never the same finger twice.' },
      { shot: 'Medium shot, playing four on G then four on C.', say: 'Four on G, four on C. Every note the same volume. That steady drive is what makes an upbeat chorus lift.' },
      { shot: 'Medium close-up.', say: 'Then play along with the click: G, C and D. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-octave': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. Today: the bounciest shape on the bass. Root and octave.' },
      { shot: 'Fretboard graphic: G on the E string fret 3, octave on the D string fret 5.', say: 'The octave is the same note, just higher. Here\'s the shape: two strings up, two frets up. G on the E string, third fret. Octave G on the D string, fifth fret.', screen: 'Octave = 2 strings up, 2 frets up' },
      { shot: 'Close-up on the left hand: index on the root, ring finger on the octave.', say: 'Index finger on the root, ring finger on the octave. Root on one, octave on three. G, G, G, G.', screen: 'Root on 1 · octave on 3' },
      { shot: 'Close-up: the shape moved to C on the A string.', say: 'Same shape for C: A string third fret, and its octave on the G string, fifth fret. Move the shape, keep the bounce.' },
      { shot: 'Medium close-up.', say: 'That\'s the sound of disco and a lot of gospel. Sweet, that rang out clean! Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-scale': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up.', say: 'Hey friend, grab your bass, let\'s play something good. Today you get every note of a key in one spot: the G major scale.' },
      { shot: 'Fretboard graphic: the eight notes of G major lit up.', say: 'G, A, B, C, D, E, F sharp, G. And here\'s the magic: your hand never moves. Start with your middle finger on G, E string, third fret. One finger per fret.', screen: 'G A B C D E F# G' },
      { shot: 'Close-up, playing up the scale slowly, naming each note.', say: 'G, A on the same string. B, C, D on the A string. E, F sharp, G on the D string. Up the scale.' },
      { shot: 'Close-up, playing back down.', say: 'And back down: G, F sharp, E, D, C, B, A, G. Slow and clean.' },
      { shot: 'Medium close-up.', say: 'Every bass line in G is made from these notes. Learn the shape and you own the key. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-approach': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, smiling.', say: 'Hey friend, grab your bass, let\'s play something good. Today your bass lines learn to walk.' },
      { shot: 'Graphic: G root, then G A B, arrow to C.', say: 'Instead of jumping from G straight to C, walk there through the scale. G, A, B, then C, right on beat one of the new chord.', screen: 'Walk up: G A B → C' },
      { shot: 'Close-up on the fretboard, walking up then down.', say: 'Walk up: G, A, B, C. And walk back down from C: C, B, A, G. Open A string in the middle there, nice and easy.', screen: 'Walk down: C B A → G' },
      { shot: 'Medium shot, playing with a click: root on 1, walk on 2 3 4.', say: 'In a song, play the root on one, then walk on two, three and four. You land on the next root exactly when the chord changes.' },
      { shot: 'Medium close-up.', say: 'That\'s how a bass line tells the band where the song is going. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },

  // ---- Bass: Church bass --------------------------------------------------------------
  'b-68walk': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, soft lamp light.', say: 'Hey friend, grab your bass, let\'s play something good. Slow worship song tonight, and a secret weapon: the slash chord.' },
      { shot: 'Graphic: A/C# with "A" over "C#".', say: 'When you see A slash C sharp, the band plays an A chord, but you play C sharp. The note after the slash is yours.', screen: 'A/C#: band plays A · bass plays C#' },
      { shot: 'Close-up on the A string: frets 5, 4, 2.', say: 'Why? Because it makes the bass walk down smoothly. D, C sharp, B. A string, frets five, four, two. Listen how it falls.', screen: 'D → C# → B' },
      { shot: 'Medium shot, playing long notes, swaying in 6/8.', say: 'This song is in six-eight. One note per bar, and let it ring through the whole bar. Fewer notes, more feeling.' },
      { shot: 'Medium close-up.', say: 'Follow the chart, play the note after the slash. Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-saints': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, upbeat.', say: 'Hey friend, grab your bass, let\'s play something good. A happy one: When the Saints Go Marching In.' },
      { shot: 'Fretboard graphic: C, G and F marked.', say: 'Three roots. C, on the A string, third fret. G, on the E string, third fret. And a new one: F, on the E string, first fret.', screen: 'C: A str 3 · G: E str 3 · F: E str 1' },
      { shot: 'Close-up on the chart: C7 highlighted.', say: 'You\'ll see C7 in there. Seven or not, the root is still C. Just play C.', screen: 'C7 → still play C' },
      { shot: 'Medium shot, playing along and grinning.', say: 'When the song moves to F, that\'s the big moment. Dig in a little. Sweet, that rang out clean!' },
      { shot: 'Medium close-up.', say: 'Keep those fingertips tough, and I\'ll see you next time.' },
    ],
  },
  'b-251': {
    teacher: JORDAN,
    scenes: [
      { shot: 'Medium close-up, leaning in.', say: 'Hey friend, grab your bass, let\'s play something good. Today you learn the sound of gospel: the two-five-one.' },
      { shot: 'Graphic: Dm7 → G7 → Cmaj7, with roots D, G, C.', say: 'In the key of C, the two chord is D minor seven, the five is G seven, the one is C major seven. Your roots: D, G, C. Each one falls a fifth to the next.', screen: '2-5-1 in C: D → G → C' },
      { shot: 'Close-up on the fretboard: D (A5), G (E3), C (A3).', say: 'D on the A string, fifth fret. G on the E string, third fret. C on the A string, third fret. Feel how it pulls home to C.' },
      { shot: 'Fretboard graphic: A, F and E marked.', say: 'The vamp adds a few more: A seven, that\'s the open A string. F, on the E string, first fret. And E minor seven, the open E.', screen: 'A: open · F: E str 1 · E: open' },
      { shot: 'Medium shot, playing along.', say: 'Play the roots with the click. Once it feels good, that two-five-one will be everywhere you listen. Keep those fingertips tough, and I\'ll see you next time.' },
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
