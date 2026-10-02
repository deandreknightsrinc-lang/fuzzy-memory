// Lyrics for singing along. Songs carry them as standard MIDI lyric events,
// so the same view works for library songs, your own songs, karaoke (.kar)
// files, MusicXML scores with lyrics and Band Room arrangements.

/**
 * Lyrics written for a melody: one token per melody note. "Ma- ry" joins the
 * syllables of a word, "_" holds the last syllable over another note, "/"
 * starts a new line. Returns one entry per note: { text, wordEnd, lineStart } or null (held).
 */
export function parseLyricTokens(text) {
  const out = [];
  let lineStart = true;
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    if (tok === '/') {
      lineStart = true;
      continue;
    }
    if (tok === '_') {
      out.push(null);
      continue;
    }
    const joins = tok.endsWith('-');
    out.push({ text: joins ? tok.slice(0, -1) : tok, wordEnd: !joins, lineStart });
    lineStart = false;
  }
  return out;
}

/** The text of a lyric event: line starts get "/" (the karaoke convention), word ends a space. */
export const lyricEventText = (t) => `${t.lineStart ? '/' : ''}${t.text}${t.wordEnd ? ' ' : ''}`;

/**
 * Lyrics typed as lines (for chord-chart songs): each line takes `barsPerLine`
 * bars, its words spread evenly over them. Blank lines are ignored.
 * Returns [{ beat, text }] with line starts marked by "/".
 */
export function lineLyricEvents(text, beatsPerBar, barsPerLine = 2) {
  const out = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    const words = line.split(/\s+/);
    const span = beatsPerBar * barsPerLine;
    words.forEach((w, k) => out.push({ beat: i * span + (k * span) / words.length, text: `${k === 0 ? '/' : ''}${w} ` }));
  });
  return out;
}

/**
 * Lyric events -> lines for display: [{ start, end, words: [{ time, text }] }].
 * A line starts at "/" or "\" (karaoke), after "\r" or "\n", or after a long pause.
 */
export function lyricLines(events, { gap = 4 } = {}) {
  const lines = [];
  let cur = null;
  let breakNext = true;
  let last = -Infinity;
  for (const e of [...events].sort((a, b) => a.time - b.time)) {
    let t = e.text;
    let newLine = breakNext || e.time - last > gap;
    if (/^[/\\]/.test(t)) {
      newLine = true;
      t = t.slice(1);
    }
    breakNext = /[\r\n]$/.test(t);
    t = t.replace(/[\r\n]+/g, '');
    last = e.time;
    if (!t.trim() && !newLine) continue;
    if (newLine || !cur) {
      cur = { start: e.time, end: e.time, words: [] };
      lines.push(cur);
    }
    if (t) cur.words.push({ time: e.time, text: t });
    cur.end = e.time;
  }
  lines.forEach((l, i) => (l.end = lines[i + 1] ? lines[i + 1].start : l.end + 3));
  return lines.filter((l) => l.words.length);
}

/** Which line is being sung at `time` (the last one that started), or -1 before the first. */
export function lineAt(lines, time) {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].start <= time + 0.05) idx = i;
  return idx;
}
