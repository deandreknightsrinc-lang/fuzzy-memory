// Ask the teacher: the Knight Lyfe characters answer questions live, give
// feedback on what you just played and make up quick lessons on the spot. Their
// "brain" is a language model on your own AI server (Ollama on kl-oracle), so it's
// free and private. This module builds what the model is told (the character,
// the safety rules, the lesson you're on) and reads its streamed answers.

/** Things a student can tap instead of typing. */
export const QUICK_ASKS = [
  { id: 'explain', label: '❓ Explain this step', text: 'Can you explain this step to me in a simple way?' },
  { id: 'why', label: '🤔 Why did I miss it?', text: 'Why do you think I made mistakes on this step, and how do I fix it?' },
  { id: 'tip', label: '💡 Practice tip', text: 'Give me one practice tip for what I am learning right now.' },
  { id: 'lesson', label: '🎓 Quick lesson', text: 'Teach me a quick 2-minute lesson about something related to what I am learning, with one thing to try.' },
  { id: 'cheer', label: '🙌 Encourage me', text: 'I feel stuck. Can you encourage me?' },
];

/**
 * What the model is told before the conversation: who it is, how it talks, the
 * rules it must keep, and where the student is right now.
 * ctx: { student, course, unit, lesson, step, progress, feedback, subject }
 */
export function teacherSystemPrompt(teacher, ctx = {}) {
  const lines = [
    `You are ${teacher.name}, an AI teacher character from Knight Lyfe (BAC Ministries). You teach ${teacher.role}.`,
    `Your voice: ${teacher.voice}`,
    `You often say things like: "${teacher.style.hello}" and "${teacher.style.praise}"`,
    '',
    'How you teach:',
    '- Talk like a warm, encouraging teacher speaking out loud: short sentences, no lists unless asked, no markdown.',
    '- Keep most answers to 2-5 sentences. A "quick lesson" can be longer but stays under 150 words and ends with one thing to try.',
    '- Be accurate about music and anything you teach. If you are not sure, say so instead of guessing.',
    '- Use what you know about the student\'s lesson and how they are doing (below) to make your answer specific.',
    '- Celebrate effort, then give one clear next step.',
    '',
    'Rules you always keep:',
    '- You are an AI character, not a real person. If asked, say so plainly.',
    '- Keep everything family-friendly and faith-friendly. Students may be children.',
    '- Stay on music, learning, the course and encouragement. Gently steer other topics back.',
    '- Never ask for personal information (address, school, phone, passwords, photos).',
    '- If someone mentions being hurt, unsafe, very sad, or asks for medical, legal or deep spiritual counseling, kindly tell them to talk to a parent, pastor or another trusted adult right away. Do not try to handle it yourself.',
    '- Never claim to hear or see the student unless the lesson info below says what they played.',
  ];
  const where = [];
  if (ctx.student) where.push(`Student: ${ctx.student}`);
  if (ctx.course) where.push(`Course: ${ctx.course}${ctx.unit ? ` / ${ctx.unit}` : ''}`);
  if (ctx.lesson) where.push(`Lesson: ${ctx.lesson}`);
  if (ctx.step) where.push(`Current step: ${ctx.step}`);
  if (ctx.progress) where.push(`How it's going: ${ctx.progress}`);
  if (ctx.feedback) where.push(`Last message the app showed: ${ctx.feedback}`);
  if (ctx.song) where.push(`Song open in the app: ${ctx.song}`);
  if (where.length) lines.push('', 'Right now in the app:', ...where.map((x) => `- ${x}`));
  return lines.join('\n');
}

/**
 * The messages for one question: the system prompt, the recent conversation
 * (trimmed so a slow home server stays quick) and the new question.
 */
export function buildMessages(teacher, ctx, history, question, { keep = 8 } = {}) {
  const recent = history.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-keep);
  return [{ role: 'system', content: teacherSystemPrompt(teacher, ctx) }, ...recent.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: question }];
}

/**
 * Streamed answers arrive as lines of JSON (Ollama's /api/chat with stream:
 * true). Feed it text as it arrives; it returns the pieces of the answer so far
 * and whatever partial line is left for next time.
 */
export function parseStream(buffer) {
  const parts = buffer.split('\n');
  const rest = parts.pop();
  const out = { text: '', done: false, error: null, rest };
  for (const line of parts) {
    if (!line.trim()) continue;
    try {
      const j = JSON.parse(line);
      if (j.error) out.error = j.error;
      if (j.message?.content) out.text += j.message.content;
      if (j.done) out.done = true;
    } catch {
      /* a broken line: skip it */
    }
  }
  return out;
}

/** The AI server address the app talks to (its Ollama API, through kl-oracle's HTTPS proxy). */
export function normalizeServer(url, page = globalThis.location) {
  let u = String(url || '').trim();
  if (!u) {
    // Served from kl-oracle itself: the AI is right next to the app.
    return page?.port === '8443' ? `${page.origin}/ollama` : '';
  }
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  u = u.replace(/\/+$/, '');
  if (/:8443$/.test(u) || /:8443\/?$/.test(u)) u += '/ollama';
  return u;
}

/** Ask the server which models it has (Ollama /api/tags). */
export async function listModels(server, { fetchFn = fetch } = {}) {
  const r = await fetchFn(`${server}/api/tags`);
  if (!r.ok) throw new Error(`the server answered ${r.status}`);
  const j = await r.json();
  return (j.models || []).map((m) => m.name);
}

/**
 * Ask a question and stream the answer: onText(textSoFar) is called as words
 * arrive. Returns the whole answer. Pass an AbortController's signal to stop.
 */
export async function askTeacher(server, model, messages, { onText = () => {}, signal, fetchFn = fetch } = {}) {
  const r = await fetchFn(`${server}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, options: { temperature: 0.6, num_predict: 350 } }),
    signal,
  });
  if (!r.ok) throw new Error(r.status === 404 ? `the model "${model}" isn't on the server` : `the server answered ${r.status}`);
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const p = parseStream(buffer);
    buffer = p.rest;
    if (p.error) throw new Error(p.error);
    if (p.text) {
      answer += p.text;
      onText(answer);
    }
    if (p.done) break;
  }
  return answer.trim();
}

// ---- Conversations (kept per student so parents can look back) ----------------------

const KEY = 'kk.askHistory';
export function loadAskHistory(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}
export function saveAskHistory(all, storage = globalThis.localStorage, { keep = 200 } = {}) {
  for (const k of Object.keys(all)) all[k] = all[k].slice(-keep);
  try {
    storage?.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full */
  }
}

/**
 * An animated face for a teacher (SVG): blinks, and the mouth moves while the
 * teacher talks (toggle the "talking" class, or set --mouth from 0 to 1).
 */
export function teacherFaceSvg(t) {
  const skin = { 'maestro-k': '#8d5524', 'melody-grace': '#a0663a', 'beat-knight': '#6b4226', 'strings-jordan': '#7a4b2a', 'professor-note': '#9a6a45', 'producer-nova': '#b07850' }[t.id] || '#9a6a45';
  const hair = { 'maestro-k': '<path d="M28 40 Q60 6 92 40 Q86 22 60 18 Q34 22 28 40Z" fill="#2a2a2a"/><path d="M38 78 Q60 100 82 78 Q80 92 60 96 Q40 92 38 78Z" fill="#5a5a5a" opacity=".85"/>',
    'melody-grace': '<circle cx="60" cy="30" r="30" fill="#2b1a10"/><circle cx="32" cy="46" r="14" fill="#2b1a10"/><circle cx="88" cy="46" r="14" fill="#2b1a10"/><rect x="34" y="24" width="52" height="7" rx="3" fill="#9254de"/>',
    'beat-knight': '<path d="M26 40 Q60 2 94 40 L96 44 L24 44Z" fill="#111"/><rect x="58" y="44" width="40" height="6" rx="3" fill="#111"/><circle cx="60" cy="26" r="4" fill="#ff7a45"/>',
    'strings-jordan': '<ellipse cx="60" cy="26" rx="30" ry="16" fill="#3a2414"/><circle cx="60" cy="12" r="10" fill="#3a2414"/>',
    'professor-note': '<circle cx="60" cy="18" r="13" fill="#cfcfcf"/><path d="M30 42 Q60 14 90 42 Q84 26 60 24 Q36 26 30 42Z" fill="#cfcfcf"/>',
    'producer-nova': '<circle cx="60" cy="34" r="33" fill="#c95b8a"/><path d="M24 60 Q22 30 40 22" stroke="#222" stroke-width="7" fill="none"/><path d="M96 60 Q98 30 80 22" stroke="#222" stroke-width="7" fill="none"/>' }[t.id] || '';
  const glasses = t.id === 'maestro-k' || t.id === 'professor-note' ? '<g fill="none" stroke="#3b2a1a" stroke-width="2.5"><circle cx="47" cy="58" r="9"/><circle cx="73" cy="58" r="9"/><path d="M56 58 H64"/></g>' : '';
  return `<svg class="t-face" viewBox="0 0 120 130" role="img" aria-label="${t.name}">
  <circle cx="60" cy="68" r="58" fill="${t.color}" opacity=".25"/>
  <rect x="34" y="104" width="52" height="30" rx="14" fill="${t.color}"/>
  <ellipse cx="60" cy="64" rx="32" ry="38" fill="${skin}"/>
  ${hair}
  <g class="t-eyes"><ellipse cx="47" cy="58" rx="4" ry="4.5" fill="#1a1a1a"/><ellipse cx="73" cy="58" rx="4" ry="4.5" fill="#1a1a1a"/></g>
  ${glasses}
  <path d="M44 48 Q47 45 51 47 M69 47 Q73 45 76 48" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <g class="t-mouth"><ellipse cx="60" cy="84" rx="10" ry="3" fill="#3a1414"/><path d="M50 82 Q60 90 70 82" stroke="#3a1414" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
</svg>`;
}
