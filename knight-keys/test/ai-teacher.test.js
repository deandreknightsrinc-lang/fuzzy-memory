import test from 'node:test';
import assert from 'node:assert/strict';
import { TEACHERS, teacherById } from '../js/teachers.js';
import { QUICK_ASKS, teacherSystemPrompt, buildMessages, parseStream, normalizeServer, listModels, askTeacher, teacherFaceSvg, loadAskHistory, saveAskHistory } from '../js/ai-teacher.js';

test('each teacher knows who they are, the safety rules and where the student is', () => {
  const t = teacherById('beat-knight');
  const p = teacherSystemPrompt(t, { student: 'Dad', course: 'Drums', lesson: 'Kick and snare', step: 'step 2 of 3', progress: '2 wrong notes', feedback: 'That was the snare.' });
  assert.ok(p.startsWith('You are Beat Knight, an AI teacher character from Knight Lyfe'));
  for (const rule of ['You are an AI character, not a real person', 'family-friendly and faith-friendly', 'Never ask for personal information', 'parent, pastor or another trusted adult']) assert.ok(p.includes(rule), rule);
  assert.ok(p.includes('- Lesson: Kick and snare'));
  assert.ok(p.includes('- How it\'s going: 2 wrong notes'));
  assert.ok(!teacherSystemPrompt(t).includes('Right now in the app'), 'no context section without context');
  for (const x of TEACHERS) assert.ok(teacherSystemPrompt(x).includes(x.role));
});

test('messages: system prompt, recent conversation, the new question', () => {
  const t = TEACHERS[0];
  const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}`, at: i }));
  const m = buildMessages(t, {}, history, 'What is a chord?', { keep: 4 });
  assert.equal(m[0].role, 'system');
  assert.deepEqual(m.slice(1, -1).map((x) => x.content), ['m16', 'm17', 'm18', 'm19']);
  assert.deepEqual(m.at(-1), { role: 'user', content: 'What is a chord?' });
  assert.ok(m.every((x) => !('at' in x)), 'only role and content go to the server');
  assert.ok(QUICK_ASKS.length >= 4);
});

test('streamed answers (one JSON object per line, split anywhere)', () => {
  const lines = [{ message: { content: 'Hel' } }, { message: { content: 'lo!' } }, { done: true }].map((x) => JSON.stringify(x)).join('\n') + '\n';
  const a = parseStream(lines.slice(0, 20));
  const b = parseStream(a.rest + lines.slice(20));
  assert.equal(a.text + b.text, 'Hello!');
  assert.ok(b.done);
  assert.equal(parseStream('{"error":"model not found"}\n').error, 'model not found');
});

test('server addresses', () => {
  assert.equal(normalizeServer('192.168.1.50:8443', null), 'https://192.168.1.50:8443/ollama');
  assert.equal(normalizeServer('https://kl-oracle:8443/', null), 'https://kl-oracle:8443/ollama');
  assert.equal(normalizeServer('https://kl-oracle:8443/ollama', null), 'https://kl-oracle:8443/ollama');
  assert.equal(normalizeServer('', { port: '8443', origin: 'https://192.168.1.50:8443' }), 'https://192.168.1.50:8443/ollama', 'served from kl-oracle: no address needed');
  assert.equal(normalizeServer('', { port: '', origin: 'https://example.github.io' }), '');
});

test('talking to the server (Ollama API)', async () => {
  const calls = [];
  const enc = new TextEncoder();
  const fetchFn = async (url, opts = {}) => {
    calls.push({ url, body: opts.body && JSON.parse(opts.body) });
    if (url.endsWith('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'llama3.2:3b' }] }) };
    const chunks = ['{"message":{"content":"Keep "}}\n{"message":{"con', 'tent":"practicing!"}}\n{"done":true}\n'];
    return { ok: true, body: { getReader: () => ({ read: async () => (chunks.length ? { value: enc.encode(chunks.shift()), done: false } : { done: true }) }) } };
  };
  assert.deepEqual(await listModels('https://x/ollama', { fetchFn }), ['llama3.2:3b']);
  const seen = [];
  const answer = await askTeacher('https://x/ollama', 'llama3.2:3b', [{ role: 'user', content: 'hi' }], { fetchFn, onText: (t) => seen.push(t) });
  assert.equal(answer, 'Keep practicing!');
  assert.deepEqual(seen, ['Keep ', 'Keep practicing!']);
  assert.equal(calls[1].url, 'https://x/ollama/api/chat');
  assert.equal(calls[1].body.stream, true);
  await assert.rejects(askTeacher('https://x', 'nope', [], { fetchFn: async () => ({ ok: false, status: 404 }) }), /isn't on the server/);
});

test('faces and saved conversations', () => {
  for (const t of TEACHERS) {
    const svg = teacherFaceSvg(t);
    assert.ok(svg.includes('class="t-mouth"') && svg.includes('class="t-eyes"') && svg.includes(t.name));
  }
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  saveAskHistory({ 'p1:maestro-k': Array.from({ length: 300 }, (_, i) => ({ role: 'user', content: String(i) })) }, storage, { keep: 200 });
  const back = loadAskHistory(storage)['p1:maestro-k'];
  assert.equal(back.length, 200);
  assert.equal(back[0].content, '100');
});
