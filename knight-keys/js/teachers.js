// The Knight Lyfe teachers: original AI characters (no real person's likeness)
// who lead the courses. Each has a fixed look and voice brief so any AI video
// tool (HeyGen, Synthesia, D-ID, Hedra...) can generate them the same way
// every time, plus the way they talk, used to write their lesson scripts.

export const TEACHERS = [
  {
    id: 'maestro-k',
    name: 'Maestro K',
    role: 'Piano & keys',
    color: '#4f8cff',
    emoji: '🎹',
    look: 'A warm, confident man in his 40s with a neatly trimmed salt-and-pepper beard, round tortoiseshell glasses, a navy blazer over a black crew-neck tee and a small gold knight-chess-piece lapel pin. Seated at a black grand piano in a sunlit studio with acoustic panels and a Knight Lyfe banner.',
    voice: 'Deep, calm, encouraging baritone; unhurried, smiles while he talks.',
    style: { hello: 'Welcome back to the keys, family.', praise: 'Now that is how it\'s done.', bye: 'Keep those fingers curved, and I\'ll see you next lesson.' },
  },
  {
    id: 'melody-grace',
    name: 'Melody Grace',
    role: 'Voice & choir',
    color: '#9254de',
    emoji: '🎤',
    look: 'A joyful woman in her 30s with natural curly hair pulled back with a purple headband, gold hoop earrings, a lavender choir-robe style cardigan. Standing by a studio microphone in a warm sanctuary-style rehearsal room with stained-glass light.',
    voice: 'Bright, warm mezzo-soprano speaking voice; expressive, sings short examples.',
    style: { hello: 'Hey singers! Let\'s warm up that beautiful voice.', praise: 'Yes! I heard that, right in tune!', bye: 'Drink some water, keep singing, and I\'ll see you soon.' },
  },
  {
    id: 'beat-knight',
    name: 'Beat Knight',
    role: 'Drums & rhythm',
    color: '#ff7a45',
    emoji: '🥁',
    look: 'An energetic young man in his 20s with short twists, a black snapback with a small knight logo, an orange Knight Lyfe hoodie and drumsticks in hand. Behind an electronic drum kit with LED-lit pads in a dark studio with orange accent lights.',
    voice: 'Upbeat, punchy, playful tenor; counts out loud in rhythm.',
    style: { hello: 'What\'s up, drummers! Sticks up, let\'s get this groove going.', praise: 'Locked in! That\'s the pocket!', bye: 'Practice slow, play it clean, and I\'ll catch you on the next beat.' },
  },
  {
    id: 'strings-jordan',
    name: 'Strings Jordan',
    role: 'Guitar & bass',
    color: '#36cfc9',
    emoji: '🎸',
    look: 'A laid-back musician in their 30s with locs tied up, a denim jacket with a teal Knight Lyfe patch, a wooden acoustic guitar on a strap and a bass on a stand behind. Sitting on a stool in a cozy studio with warm lamps and guitars on the wall.',
    voice: 'Relaxed, friendly, mellow speaking voice; demonstrates with short riffs.',
    style: { hello: 'Hey friend, grab your guitar, let\'s play something good.', praise: 'Sweet, that rang out clean!', bye: 'Keep those fingertips tough, and I\'ll see you next time.' },
  },
  {
    id: 'professor-note',
    name: 'Professor Note',
    role: 'Music reading & theory',
    color: '#fadb14',
    emoji: '📖',
    look: 'A kind, scholarly woman in her 50s with silver locs in a bun, half-moon reading glasses on a beaded chain, a mustard-yellow cardigan. Standing beside a chalkboard covered in music staffs in a classic wood-paneled classroom.',
    voice: 'Clear, patient, articulate alto; explains step by step and checks for understanding.',
    style: { hello: 'Good day, class. Let\'s learn something wonderful today.', praise: 'Excellent! You\'re a natural.', bye: 'Review your notes, and I\'ll see you in class.' },
  },
  {
    id: 'producer-nova',
    name: 'Producer Nova',
    role: 'Production & worship band',
    color: '#f759ab',
    emoji: '🎛',
    look: 'A creative young woman in her 20s with a short pink-tinted afro, over-ear studio headphones around her neck, a black Knight Lyfe bomber jacket. At a mixing desk with two studio monitors, Logic Pro on screen, in a modern studio with pink and blue lights.',
    voice: 'Confident, upbeat, tech-savvy; makes complex things sound simple.',
    style: { hello: 'Welcome to the studio! Let\'s make it sound amazing.', praise: 'That mix is clean!', bye: 'Save your session, and I\'ll see you in the studio.' },
  },
];

/**
 * Positions the Knight Lyfe characters can fill when someone is missing: the
 * band, the choir, and helping roles in a church or school. `fills` names the
 * Band Room parts they play.
 */
export const POSITIONS = [
  { id: 'keys', name: 'Keys', teacher: 'maestro-k', fills: ['keys'] },
  { id: 'organ', name: 'Organ / pad', teacher: 'maestro-k', fills: ['organ'] },
  { id: 'lead', name: 'Worship leader / lead vocal', teacher: 'melody-grace', fills: ['lead'] },
  { id: 'choir', name: 'Choir sections (S A T B)', teacher: 'melody-grace', fills: ['soprano', 'alto', 'tenor', 'choirbass'] },
  { id: 'guitar', name: 'Guitar', teacher: 'strings-jordan', fills: ['guitar'] },
  { id: 'bass', name: 'Bass', teacher: 'strings-jordan', fills: ['bass'] },
  { id: 'drums', name: 'Drums', teacher: 'beat-knight', fills: ['drums'] },
  { id: 'sound', name: 'Sound / production', teacher: 'producer-nova', fills: ['click'] },
  { id: 'teacher', name: 'Class teacher', teacher: 'professor-note', fills: [] },
];

/** The Knight Lyfe character who covers a Band Room part. */
export const characterFor = (part) => teacherById(POSITIONS.find((p) => p.fills.includes(part))?.teacher);

/** The teacher for each built-in course. */
export const COURSE_TEACHERS = { piano: 'maestro-k', voice: 'melody-grace', reading: 'professor-note', drums: 'beat-knight', guitar: 'strings-jordan', bass: 'strings-jordan' };

export const teacherById = (id) => TEACHERS.find((t) => t.id === id) || TEACHERS[0];

/** A brief to paste into an AI video tool so the character comes out the same every time. */
export function characterBrief(t) {
  return `${t.name} (${t.role}), an original Knight Lyfe character.\nLook: ${t.look}\nVoice: ${t.voice}\nKeep the same face, outfit, setting and voice in every video. Friendly, family-appropriate, faith-friendly tone.`;
}
