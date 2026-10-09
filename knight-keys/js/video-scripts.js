// Filming scripts for the video lessons (drums, bass, and the newer guitar lessons): what the teacher says,
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
