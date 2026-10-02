// Courses that come with the app, written as course packs (the same template
// anyone can use in the Course Studio).

export const WORSHIP_TEAM = {
  format: 'knight-course',
  version: 1,
  id: 'worship-team',
  title: 'Worship Team Training',
  icon: '🙌',
  subject: 'Worship ministry',
  by: 'BAC Ministries · Knight Lyfe',
  teacher: 'producer-nova',
  description: 'Train a church band and choir to serve together: roles, listening, dynamics, transitions, choir parts, and rehearsing with the Band Room, where Knight Lyfe characters fill any missing position.',
  units: [
    {
      id: 'roles',
      title: 'Your role on the team',
      icon: '🤝',
      lessons: [
        {
          id: 'serving',
          title: 'Serving together',
          steps: [
            { type: 'info', text: 'A worship team isn\'t a concert. Our job is to help the whole church sing. That means serving the song and the people: playing what fits, listening to each other, and staying humble when it\'s not our moment.' },
            { type: 'quiz', question: 'What matters most on a worship team?', choices: ['Playing as much as you can', 'Serving the song and the congregation', 'Having the loudest instrument'], answer: 1, explain: 'Great teams play less and listen more, so the church can sing.' },
          ],
        },
        {
          id: 'positions',
          title: 'Every position has a job',
          steps: [
            { type: 'info', text: 'Keys or organ give the harmony foundation. Bass connects the drums to the chords. Drums hold the tempo and the energy. Guitar adds rhythm and color. The worship leader carries the melody and guides the room, and the choir lifts the harmony.' },
            { type: 'quiz', question: 'Who holds the tempo steady for the whole band?', choices: ['The drummer', 'The guitarist', 'The choir'], answer: 0, explain: 'The drummer is the band\'s clock; everyone locks in with the kick and snare.' },
            { type: 'quiz', question: 'Which instrument connects the drums to the chords?', choices: ['Bass', 'Lead vocal', 'Organ'], answer: 0, explain: 'The bass plays the chord roots in the drummer\'s rhythm.' },
          ],
        },
      ],
    },
    {
      id: 'rehearse',
      title: 'Rehearsing as a band',
      icon: '🎶',
      lessons: [
        {
          id: 'band-room',
          title: 'Rehearse with whoever shows up',
          steps: [
            { type: 'info', text: 'Open 🎶 Band, pick a song and press Start rehearsal. For every position, choose who\'s playing it. Anyone missing? A Knight Lyfe character fills that spot: Maestro K on keys, Strings Jordan on guitar and bass, Beat Knight on drums, and Melody Grace with the choir.' },
            { type: 'info', text: 'Set a part to "quiet guide" while someone is still learning it: the character plays softly underneath so they can follow along without being covered up.' },
            { type: 'quiz', question: 'Your drummer is sick on Saturday. What do you do in the Band Room?', choices: ['Cancel rehearsal', 'Leave Drums on Beat Knight (AI) and rehearse anyway', 'Turn every part off'], answer: 1, explain: 'The AI covers the missing position, so the rest of the team still rehearses.' },
          ],
        },
        {
          id: 'dynamics',
          title: 'Dynamics: soft verses, big choruses',
          steps: [
            { type: 'info', text: 'Songs breathe. Start verses soft and simple (fewer notes, lighter drums), build into the chorus, and bring it down again for the bridge. Leave space: not everyone plays all the time.' },
            { type: 'quiz', question: 'On a quiet first verse, the best thing a guitarist can do is...', choices: ['Strum hard on every beat', 'Play lightly or let the keys carry it', 'Play a solo'], answer: 1, explain: 'Space makes the chorus feel bigger when everyone comes in.' },
          ],
        },
        {
          id: 'transitions',
          title: 'Starts, endings and transitions',
          steps: [
            { type: 'info', text: 'Every song starts together: a count-in or a click. Agree on endings before Sunday (hold the last chord, or stop on beat 1). Between songs, keys or organ can hold a pad so the room never goes silent.' },
            { type: 'quiz', question: 'What keeps the room from going silent between two songs?', choices: ['A long pause', 'Keys or organ holding a pad', 'The drummer counting loudly'], answer: 1, explain: 'A soft pad carries the room into the next song.' },
          ],
        },
      ],
    },
    {
      id: 'choir',
      title: 'Choir training',
      icon: '⛪',
      lessons: [
        {
          id: 'find-part',
          title: 'Find your part',
          steps: [
            { type: 'info', text: 'Every singer belongs to a section: soprano, alto, tenor or bass. Turn on the microphone and sing from low to high to find your range.' },
            { type: 'range', text: 'Sing "ah" from a low, comfortable note sliding slowly up to a high one, then back down.' },
          ],
        },
        {
          id: 'blend',
          title: 'Breathing and blend',
          steps: [
            { type: 'info', text: 'Breathe low and steady, and match the people around you: same vowel, same volume. A choir sounds like one voice when nobody sticks out.' },
            { type: 'sing', notes: [60, 64, 67], hear: true, text: 'Listen, then sing each note and hold it steady.' },
          ],
        },
        {
          id: 'learn-part',
          title: 'Learn your part with the AI choir',
          steps: [
            { type: 'info', text: 'In 🎶 Band → Choir rehearsal, mark your section "We sing it": Melody Grace\'s AI choir sings the other parts around you. Use "quiet guide" on your own part until you know it.' },
            { type: 'song', song: 'jesusloves', part: '0', voice: true, text: 'Sing the melody of Jesus Loves Me; the song waits for each note.' },
          ],
        },
      ],
    },
    {
      id: 'sunday',
      title: 'Sunday ready',
      icon: '☀️',
      lessons: [
        {
          id: 'plan',
          title: 'A rehearsal plan that works',
          steps: [
            { type: 'info', text: 'Pray together. Run each song once all the way through, then fix the tricky spots (intros, endings, transitions) with the Band Room\'s loop and tempo. Finish with the full set in order, just like Sunday.' },
            { type: 'quiz', question: 'What should you practice most?', choices: ['The parts you already know', 'Intros, endings and transitions', 'Solos'], answer: 1, explain: 'Those are where teams fall apart; the middle of songs usually takes care of itself.' },
          ],
        },
        {
          id: 'play-together',
          title: 'Play a song together',
          steps: [{ type: 'song', song: 'worshipflow', part: '0', text: 'Play the 1-5-6-4 worship progression with the band behind you. Then try it in the Band Room with your whole team.' }],
        },
      ],
    },
  ],
};

export const BUNDLED_PACKS = [WORSHIP_TEAM];
