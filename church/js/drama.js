// The dramatized Bible: a chapter becomes a script of lines (narrator, God,
// Jesus, Moses, Mary, ...), each with a voice from the AI voice cast, and a
// list of scenes for the cinematic version. The words of Scripture are never
// changed: a script is only accepted when its lines, put back together, are
// exactly the verses (checkScript). The AI on kl-oracle (ai-studio/bible) writes
// the best scripts; draftScript here is the quick version used in the browser
// and as the fallback.

/** The voice cast: who reads what (voices are Kokoro voices on kl-oracle). */
export const CAST = {
  narrator: { name: 'Narrator', voice: 'am_onyx', browser: 'narrator' },
  god: { name: 'God (the LORD)', voice: 'bm_george', effect: 'reverb', browser: 'deep' },
  jesus: { name: 'Jesus', voice: 'am_michael', browser: 'man' },
  moses: { name: 'Moses', voice: 'bm_lewis', browser: 'man' },
  abraham: { name: 'Abraham', voice: 'bm_daniel', browser: 'man' },
  david: { name: 'David', voice: 'am_liam', browser: 'man' },
  peter: { name: 'Peter', voice: 'am_fenrir', browser: 'man' },
  paul: { name: 'Paul', voice: 'am_eric', browser: 'man' },
  john: { name: 'John', voice: 'am_echo', browser: 'man' },
  satan: { name: 'The tempter', voice: 'am_puck', effect: 'dark', browser: 'man' },
  angel: { name: 'Angel', voice: 'af_nova', effect: 'shimmer', browser: 'woman' },
  mary: { name: 'Mary', voice: 'af_heart', browser: 'woman' },
  woman: { name: 'A woman', voice: 'af_bella', browser: 'woman' },
  man: { name: 'A man', voice: 'am_adam', browser: 'man' },
  crowd: { name: 'The people', voice: 'am_adam', effect: 'crowd', browser: 'man' },
};

// Who is speaking, from the words around a quote. [words, cast role, character]
const SPEAKERS = [
  ['the LORD God', 'god'], ['the Lord GOD', 'god'], ['the LORD', 'god'], ['God', 'god'], ['the Almighty', 'god'], ['the Most High', 'god'],
  ['the Lord Jesus', 'jesus'], ['Jesus', 'jesus'], ['Moses', 'moses'], ['Abraham', 'abraham'], ['Abram', 'abraham'],
  ['David', 'david'], ['Simon Peter', 'peter'], ['Peter', 'peter'], ['Simon', 'peter'], ['Paul', 'paul'], ['Saul of Tarsus', 'paul'],
  ['John the Baptist', 'john'], ['John', 'john'], ['Satan', 'satan'], ['the devil', 'satan'], ['the tempter', 'satan'], ['the serpent', 'satan'],
  ['the angel of the LORD', 'angel'], ['the angel of the Lord', 'angel'], ['the angel of God', 'angel'], ['the angel', 'angel'], ['an angel', 'angel'], ['the angels', 'angel'], ['Gabriel', 'angel'], ['Mary', 'mary'],
  ['the people', 'crowd'], ['the crowd', 'crowd'], ['the crowds', 'crowd'], ['the multitude', 'crowd'], ['the disciples', 'crowd'], ['the Pharisees', 'crowd'], ['the Israelites', 'crowd'], ['the children of Israel', 'crowd'],
  ['the woman', 'woman'], ['his wife', 'woman'], ['the king', 'man'], ['Pharaoh', 'man', 'Pharaoh'],
  ...'Eve Sarah Sarai Hagar Rebekah Rachel Leah Miriam Deborah Ruth Naomi Hannah Abigail Bathsheba Esther Elizabeth Elisabeth Martha Anna Delilah Jezebel Lydia'.split(' ').map((n) => [n, 'woman', n]),
  ...'Adam Noah Isaac Jacob Israel Esau Joseph Judah Aaron Joshua Gideon Samson Samuel Saul Solomon Nathan Elijah Elisha Isaiah Jeremiah Ezekiel Daniel Jonah Job Boaz Eli Laban Lot Balaam Goliath Nebuchadnezzar Herod Pilate Nicodemus Zacchaeus Thomas Andrew James Philip Nathanael Judas Barnabas Stephen Zechariah Zacharias Joab Absalom Mordecai Haman Ahab Jonathan Laban Cain Abel'.split(' ').map((n) => [n, 'man', n]),
];
const SPEECH_VERB = /\b(said|says|saith|saying|answered|answering|replied|asked|cried|called|spake|spoke|declared|declares|commanded|told|prayed|shouted|sang|exclaimed|inquired|whispered|warned|begged|urged)\b/i;
const PRONOUN = /\b(he|she|they|He|She|They)\b/g;
const FEMALE = new Set(['mary', 'woman']);

function findNames(text) {
  const hits = [];
  for (const [name, role, character] of SPEAKERS) {
    // "the woman" also matches "The woman" at the start of a sentence.
    const src = name.replace(/ /g, '\\s+').replace(/^([a-z])/, (c) => `[${c}${c.toUpperCase()}]`);
    const g = new RegExp(`\\b${src}\\b`, 'g');
    let m;
    while ((m = g.exec(text))) hits.push({ at: m.index, end: m.index + m[0].length, role, character: character || null, name });
  }
  // Keep the longest name at each place ("the LORD God" over "God").
  hits.sort((a, b) => a.at - b.at || b.end - a.end);
  return hits.filter((h, i) => !hits.slice(0, i).some((o) => o.at <= h.at && o.end >= h.end));
}

/** The first person named in the latest sentence that names someone (the subject). */
function subjectOf(narrations, { male = false, divine = false } = {}) {
  for (let i = narrations.length - 1; i >= 0; i--) {
    const sentences = narrations[i].split(/(?<=[.!?;])\s+/).reverse();
    for (const sentence of sentences) {
      const names = findNames(sentence).filter((h) => (!male || !FEMALE.has(h.role)) && h.role !== 'crowd' && (!divine || h.role === 'god' || h.role === 'jesus'));
      if (names.length) return names[0];
    }
  }
  return null;
}

/**
 * Who speaks, from narration around a quote ("Jesus answered,", "she replied.",
 * "said the woman"); earlier narration resolves "he". null = can't tell.
 */
export function guessSpeaker(narration, history = []) {
  const text = String(narration || '');
  const verb = SPEECH_VERB.exec(text);
  if (!verb) return null;
  const sentenceStart = Math.max(text.lastIndexOf('.', verb.index), text.lastIndexOf('!', verb.index), text.lastIndexOf('?', verb.index)) + 1;
  const before = text.slice(sentenceStart, verb.index);
  // The nearest name or pronoun before the verb is the one speaking.
  const tokens = findNames(before).map((h) => ({ ...h, kind: 'name' }));
  let m;
  PRONOUN.lastIndex = 0;
  while ((m = PRONOUN.exec(before))) tokens.push({ at: m.index, kind: 'pronoun', word: m[1] });
  tokens.sort((a, b) => a.at - b.at);
  // The subject: the first name or pronoun in the clause with the verb ("They called
  // Rebekah and asked her" -> they; "..., Jesus said to her" -> Jesus).
  const clauseStart = Math.max(...[',', ';', ':', '—', '('].map((c) => before.lastIndexOf(c)));
  const near = tokens.find((t) => t.at > clauseStart) || tokens[tokens.length - 1];
  const hit = (h) => (h ? { role: h.role, character: h.character } : null);
  if (near?.kind === 'name') return hit(near);
  if (near?.kind === 'pronoun') {
    if (/^she$/i.test(near.word)) {
      const her = subjectOf([...history, before]);
      return her && FEMALE.has(her.role) ? hit(her) : { role: 'woman', character: null };
    }
    if (/^they$/i.test(near.word)) return { role: 'crowd', character: null };
    const midSentence = /\S/.test(before.slice(0, near.at).replace(/^\W*(and|then|so|but|now)?\W*/i, ''));
    if (near.word === 'He' && midSentence) return hit(subjectOf([...history, before], { divine: true })) || hit(subjectOf([...history, before], { male: true })) || { role: 'man', character: null };
    return hit(subjectOf([...history, before.slice(0, near.at)], { male: true })) || { role: 'man', character: null };
  }
  // "said the woman", "replied Jesus"
  const after = findNames(text.slice(verb.index, verb.index + verb[0].length + 40))[0];
  return hit(after);
}

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** A verse split at its quotation marks: [{ quote: bool, text, open, close }]. */
function quoteSegments(text, openAtStart) {
  const segs = [];
  let inQuote = openAtStart;
  for (const p of text.split(/([“”])/)) {
    if (p === '“') inQuote = true;
    else if (p === '”') inQuote = false;
    else if (p) segs.push({ quote: inQuote, text: p });
  }
  return { segs, openAtEnd: inQuote };
}

/**
 * A quick script for a chapter: narration and quoted speech, with the speaker
 * worked out from the narration around each quote. Versions without quotation
 * marks (KJV, ASV, ...) split "X said, ..." in a verse; transferScript does better
 * by borrowing the speakers from a version that has quotation marks.
 * verses: [{ n, text }]  ->  [{ verse, speaker, character?, text }]
 */
export function draftScript(verses, { quotes = 'auto' } = {}) {
  const lines = [];
  const narrations = []; // recent narration, for "he"
  const hasQuotes = quotes === 'auto' ? verses.some((v) => /[“”]/.test(v.text)) : quotes;
  let open = null; // a quote running on from the last verse: its speaker
  const recent = []; // speakers of recent quotes
  const push = (verse, who, text) => lines.push({ verse, speaker: who.role, ...(who.character ? { character: who.character } : {}), text });
  for (const v of verses) {
    if (!hasQuotes) {
      const m = /^(.*?\b(?:said|saith|answered|spake|cried|called|saying)(?: unto [^,]+| to [^,]+)?,)\s+(.+)$/.exec(v.text);
      const who = m && guessSpeaker(m[1], narrations.slice(-3));
      if (who) {
        push(v.n, { role: 'narrator' }, `${m[1]} `);
        push(v.n, who, m[2]);
      } else push(v.n, { role: 'narrator' }, v.text);
      narrations.push(m ? m[1] : v.text);
      continue;
    }
    const { segs, openAtEnd } = quoteSegments(v.text, !!open);
    segs.forEach((seg, i) => {
      if (!seg.quote) {
        if (!norm(seg.text) && lines.length) lines[lines.length - 1].text += seg.text; // keep the space between quotes
        else {
          push(v.n, { role: 'narrator' }, seg.text);
          narrations.push(seg.text);
        }
        return;
      }
      let who = i === 0 && open ? open : null;
      const after = segs[i + 1] && !segs[i + 1].quote && norm(segs[i + 1].text) ? segs[i + 1].text : '';
      const before = segs[i - 1] && !segs[i - 1].quote && norm(segs[i - 1].text) ? segs[i - 1].text : '';
      const prevQuote = i > 0 && segs[i - 1].quote ? true : i > 1 && segs[i - 1] && !norm(segs[i - 1].text) && segs[i - 2]?.quote;
      if (!who && after && SPEECH_VERB.test(after.split(/[.!?]/)[0])) who = guessSpeaker(after.split(/(?<=[.!?])\s/)[0], narrations.slice(-4));
      if (!who && before && !prevQuote) who = guessSpeaker(before, narrations.slice(-4));
      if (!who && before && SPEECH_VERB.test(before)) who = guessSpeaker(before, narrations.slice(-4));
      if (!who && prevQuote) {
        // Back-to-back quotes: the other person in the conversation answers.
        const last = recent[recent.length - 1];
        who = [...recent].reverse().find((r) => r.role !== last?.role || r.character !== last?.character) || { role: last?.role === 'woman' ? 'man' : 'woman', character: null };
      }
      who = who || recent[recent.length - 1] || { role: 'man', character: null };
      if (i === segs.length - 1 && openAtEnd) open = who;
      push(v.n, who, seg.text);
      recent.push(who);
    });
    if (!openAtEnd) open = null;
  }
  return mergeLines(lines.filter((l) => norm(l.text)));
}

/**
 * A script for a version without quotation marks, using the speakers of the same
 * verses in a version that has them (KJV <- BSB). A verse spoken entirely by one
 * person stays theirs; a mixed verse splits at "said," in this version.
 */
export function transferScript(verses, refLines) {
  const byVerse = new Map();
  for (const l of refLines) {
    if (!byVerse.has(l.verse)) byVerse.set(l.verse, []);
    byVerse.get(l.verse).push(l);
  }
  const own = draftScript(verses, { quotes: false });
  const out = [];
  for (const v of verses) {
    const ref = byVerse.get(v.n) || [];
    const voices = ref.filter((l) => l.speaker !== 'narrator');
    const mine = own.filter((l) => l.verse === v.n);
    if (ref.length && !voices.length) out.push({ verse: v.n, speaker: 'narrator', text: v.text });
    else if (voices.length && voices.length === ref.length && new Set(voices.map((l) => l.speaker + (l.character || ''))).size === 1) {
      out.push({ verse: v.n, speaker: voices[0].speaker, ...(voices[0].character ? { character: voices[0].character } : {}), text: v.text });
    } else if (voices.length && mine.length === 2) {
      const main = voices[voices.length - 1];
      out.push(mine[0], { ...mine[1], speaker: main.speaker, ...(main.character ? { character: main.character } : {}) });
    } else out.push(...mine);
  }
  return mergeLines(out);
}

/** Join neighboring lines by the same speaker in the same verse. */
function mergeLines(lines) {
  const out = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (last && last.speaker === l.speaker && last.verse === l.verse && (last.character || null) === (l.character || null)) last.text += l.text;
    else out.push({ ...l });
  }
  return out;
}

/** Compare words only: spacing and quotation marks don't count (the quotes become the voices). */
const letters = (s) => String(s || '').replace(/[“”‘’"\s]/g, '');

/**
 * Is a script faithful? Every verse's lines, joined, must be exactly the verse
 * (spacing and quotation marks aside), in order, with known speakers.
 * Returns the list of problems (empty = faithful).
 */
export function checkScript(verses, lines, cast = CAST) {
  const problems = [];
  const byVerse = new Map();
  for (const l of lines || []) {
    if (!cast[l.speaker]) problems.push(`Unknown speaker "${l.speaker}" in verse ${l.verse}.`);
    if (!byVerse.has(l.verse)) byVerse.set(l.verse, []);
    byVerse.get(l.verse).push(l.text);
  }
  for (const v of verses) {
    const got = letters((byVerse.get(v.n) || []).join(''));
    if (got !== letters(v.text)) problems.push(`Verse ${v.n} doesn't match the Bible text.`);
    byVerse.delete(v.n);
  }
  for (const n of byVerse.keys()) problems.push(`Verse ${n} isn't in this chapter.`);
  return problems;
}

/** Keep the faithful verses of a script; any verse that doesn't match is read by the narrator. */
export function repairScript(verses, lines) {
  const out = [];
  for (const v of verses) {
    const mine = (lines || []).filter((l) => l.verse === v.n);
    const ok = mine.length && mine.every((l) => CAST[l.speaker]) && letters(mine.map((l) => l.text).join('')) === letters(v.text);
    out.push(...(ok ? mine : [{ verse: v.n, speaker: 'narrator', text: v.text }]));
  }
  return out;
}

/** The characters in a script, for the cast list. */
export function scriptCast(lines) {
  return [...new Set(lines.map((l) => l.speaker))].map((id) => ({ id, ...CAST[id] }));
}

// ---- Cinematic -------------------------------------------------------------------------

/** How every scene is pictured (respectful, for all ages). */
export const VISUAL_STYLE = 'cinematic, photorealistic biblical epic, ancient Near East setting, natural light, historically grounded clothing and architecture, reverent, film still, no text, no captions';
export const VISUAL_RULES = [
  'Never show the face of God the Father: show light, cloud, fire or glory.',
  'Show Jesus with dignity and kindness, as a Middle-Eastern Jewish man of the first century.',
  'No gore or graphic violence: show battles and suffering with restraint (silhouettes, aftermath, faces).',
  'Angels are majestic and kind, never frightening for children.',
];

/**
 * A first cut of the scenes for a chapter: groups of verses, each with a picture
 * prompt and a camera move. The AI on kl-oracle writes richer ones.
 */
export function draftScenes(verses, { book = '', chapter = 0, per = 6 } = {}) {
  const scenes = [];
  const moves = ['slow push in', 'slow pan right', 'gentle pull back', 'slow pan left', 'rise up', 'slow push in'];
  for (let i = 0; i < verses.length; i += per) {
    const group = verses.slice(i, i + per);
    const text = group.map((v) => v.text).join(' ');
    scenes.push({
      from: group[0].n,
      to: group[group.length - 1].n,
      title: `${book} ${chapter}:${group[0].n}-${group[group.length - 1].n}`,
      prompt: `${text.slice(0, 400)} — ${VISUAL_STYLE}`,
      camera: moves[scenes.length % moves.length],
    });
  }
  return scenes;
}

/**
 * The premium shot list for AI video tools (Runway, Kling, Veo, Sora, ...): one
 * row per scene with the prompt, camera, length and the words heard over it.
 */
export function premiumShotList(scenes, lines, { title = '', seconds = 8 } = {}) {
  const rows = scenes.map((s, i) => {
    const said = lines.filter((l) => l.verse >= s.from && l.verse <= s.to).map((l) => `${CAST[l.speaker]?.name || l.speaker}: ${norm(l.text)}`);
    return { shot: i + 1, verses: `${s.from}-${s.to}`, prompt: s.prompt, camera: s.camera, seconds, audio: said.join(' / ') };
  });
  const md = [
    `# ${title} — shot list`,
    '',
    `Style for every shot: ${VISUAL_STYLE}.`,
    ...VISUAL_RULES.map((r) => `- ${r}`),
    '',
    ...rows.map((r) => `## Shot ${r.shot} (verses ${r.verses}, about ${r.seconds}s)\n\n**Prompt:** ${r.prompt}\n\n**Camera:** ${r.camera}\n\n**Heard:** ${r.audio}\n`),
  ].join('\n');
  const csvCell = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ['shot,verses,seconds,camera,prompt,audio', ...rows.map((r) => [r.shot, r.verses, r.seconds, r.camera, r.prompt, r.audio].map(csvCell).join(','))].join('\n');
  return { rows, md, csv };
}

// ---- Listening in the browser ------------------------------------------------------------

/**
 * Which browser voice reads each kind of part: the best English voices available,
 * a different one for the narrator, men, women and God where the device has them.
 */
export function pickBrowserVoices(voices) {
  const en = (voices || []).filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : voices || [];
  const female = /\b(female|woman|samantha|victoria|karen|moira|tessa|fiona|zira|susan|aria|jenny|libby|sonia|serena|ava|allison|google us english)\b/i;
  const male = /\b(male|man|daniel|alex|fred|david|mark|george|guy|ryan|arthur|oliver|aaron|tom|google uk english male)\b/i;
  const pick = (re, skip = []) => pool.find((v) => re.test(v.name) && !skip.includes(v)) || null;
  const narrator = pick(/daniel|arthur|george|guy|alex|google uk english male/i) || pick(male) || pool[0] || null;
  const man = pick(male, [narrator]) || narrator;
  const woman = pick(female) || pool.find((v) => v !== narrator) || narrator;
  const deep = pick(/fred|bruce|ralph|george|daniel/i, [narrator]) || man;
  return { narrator, man, woman, deep };
}

// Characters without their own cast entry (Jacob, Rebekah, Pharaoh, ...) keep one
// voice all the way through: picked from these by their name.
export const MALE_VOICES = ['bm_fable', 'am_puck', 'am_echo', 'bm_daniel', 'am_liam', 'am_eric', 'am_fenrir', 'bm_lewis'];
export const FEMALE_VOICES = ['af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'af_river', 'af_jessica', 'af_kore', 'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily'];

/** The Kokoro voice for a line of the script. */
export function voiceFor(line) {
  if (line.character && (line.speaker === 'man' || line.speaker === 'woman')) {
    const pool = line.speaker === 'woman' ? FEMALE_VOICES : MALE_VOICES;
    let h = 0;
    for (const ch of line.character) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return pool[h % pool.length];
  }
  return (CAST[line.speaker] || CAST.narrator).voice;
}
