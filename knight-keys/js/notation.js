// Sheet music: turns any song (MIDI, a library song, an Audio → MIDI result)
// into a full score with a staff for every instrument, saved as MusicXML (the
// format Logic, MuseScore, Sibelius, Finale, Dorico and ACE Studio all read),
// and turns a score (MusicXML / compressed .mxl) back into MIDI.

import { spellNote } from './theory.js';
import { writeMidiTickTracks, metaEvent } from './midi-file.js';

// ---- Song -> score -------------------------------------------------------------

const PIANO_LIKE = (p) => p <= 7 || (p >= 16 && p <= 23); // pianos, organs: grand staff when both hands are there
const LOW_INSTRUMENT = (p) => (p >= 32 && p <= 39) || p === 42 || p === 43 || p === 57 || p === 58 || p === 70; // basses, cello, trombone, tuba, bassoon

// Note values that can be written with one note (in quarter notes), longest first.
// The fourth field marks triplets (three in the time of two).
const VALUES = [
  [4, 'whole', 0], [3, 'half', 1], [2, 'half', 0], [1.5, 'quarter', 1], [1, 'quarter', 0], [2 / 3, 'quarter', 0, true],
  [0.75, 'eighth', 1], [0.5, 'eighth', 0], [0.375, '16th', 1], [1 / 3, 'eighth', 0, true], [0.25, '16th', 0], [1 / 6, '16th', 0, true], [0.125, '32nd', 0], [1 / 12, '32nd', 0, true],
];
const onGrid = (len, grid) => Math.abs(len / grid - Math.round(len / grid)) < 1e-6;

/** Split a length (quarters) into written note values on `grid`, tied together. */
export function splitDuration(q, maxValue = 4, grid = 0.125) {
  const values = VALUES.filter(([len]) => onGrid(len, grid));
  const out = [];
  let left = q;
  while (left > 1e-6) {
    const v = values.find(([len]) => len <= left + 1e-6 && len <= maxValue + 1e-6) || values[values.length - 1];
    out.push({ len: v[0], type: v[1], dots: v[2], triplet: !!v[3] });
    left -= v[0];
  }
  return out;
}

/** Sixteenths, triplets or both? Whichever fits where the notes really start. */
export function guessGrid(beats) {
  let e16 = 0;
  let e3 = 0;
  for (const b of beats) {
    e16 += Math.abs(b - Math.round(b * 4) / 4);
    e3 += Math.abs(b - Math.round(b * 3) / 3);
  }
  if (e16 <= 0.02 * beats.length || e16 < e3 * 0.6) return 0.25;
  if (e3 < e16 * 0.6) return 1 / 3;
  return 1 / 12; // a part that mixes both (a gospel shuffle with straight fills)
}

/**
 * The score of a song: parts (one per channel), staves, measures of chords and
 * rests, quantized to `grid` (in quarter notes: 0.25 = sixteenths).
 * opts.nameFor(ch) names a part; opts.channels limits which parts are included.
 */
export function songToScore(song, { grid = 'auto', title = '', nameFor = null, channels = null } = {}) {
  const ts = song.timeSig || { num: 4, den: 4 };
  const measureQ = (ts.num * 4) / ts.den;
  const sf = song.keySig?.sf || 0;
  const beatAt = song.beatAt || ((sec) => (sec * (song.bpm || 120)) / 60);
  const byCh = new Map();
  for (const n of song.notes) {
    if (channels && !channels.includes(n.ch)) continue;
    if (!byCh.has(n.ch)) byCh.set(n.ch, []);
    byCh.get(n.ch).push({ start: beatAt(n.time), end: beatAt(n.time + n.dur), midi: n.note, vel: n.vel, track: n.track });
  }
  // Each part gets its own grid (the drums can shuffle while the bass plays straight).
  const grids = new Map();
  for (const [ch, list] of byCh) {
    if (grid !== 'auto') {
      grids.set(ch, grid);
      const q = (beat) => Math.round(beat / grid) * grid;
      for (const n of list) {
        n.start = q(n.start);
        n.end = Math.max(n.start + grid, q(n.end));
      }
      continue;
    }
    // Auto: every beat picks sixteenths or triplets, from the notes that start in it.
    const beats = new Map();
    for (const n of list) {
      const b = Math.floor(n.start + 1 / 24);
      if (!beats.has(b)) beats.set(b, []);
      beats.get(b).push(n.start);
    }
    const gridOf = new Map([...beats].map(([b, starts]) => [b, guessGrid(starts) === 0.25 ? 0.25 : 1 / 3]));
    const used = new Set(gridOf.values());
    const g = used.size > 1 ? 1 / 12 : [...used][0] || 0.25;
    grids.set(ch, g);
    const q = (beat, step) => Math.round(beat / step) * step;
    for (const n of list) {
      const step = gridOf.get(Math.floor(n.start + 1 / 24)) || 0.25;
      n.start = q(n.start, step);
      const endStep = gridOf.get(Math.floor(n.end - 1 / 24)) || step;
      n.end = Math.max(n.start + Math.min(step, endStep), q(n.end, endStep));
    }
  }
  let lastQ = 0;
  for (const list of byCh.values()) for (const n of list) lastQ = Math.max(lastQ, n.end);
  const measures = Math.max(1, Math.ceil(lastQ / measureQ - 1e-6));

  const parts = [];
  for (const ch of [...byCh.keys()].sort((a, b) => (a === 9) - (b === 9) || a - b)) {
    const notes = byCh.get(ch);
    const program = Math.max(0, song.firstProgram?.[ch] ?? 0);
    const drum = ch === 9;
    const trackName = song.trackNames?.[notes[0].track] !== song.title ? song.trackNames?.[notes[0].track] : '';
    const name = nameFor?.(ch) || trackName || (drum ? 'Drums' : `Part ${ch + 1}`);
    let staves;
    if (drum) staves = [{ clef: 'percussion', notes }];
    else {
      const low = notes.filter((n) => n.midi < 55).length / notes.length;
      const high = notes.filter((n) => n.midi >= 64).length / notes.length;
      if (PIANO_LIKE(program) && low > 0.1 && high > 0.1) {
        staves = [{ clef: 'treble', notes: notes.filter((n) => n.midi >= 60) }, { clef: 'bass', notes: notes.filter((n) => n.midi < 60) }];
      } else {
        const sorted = notes.map((n) => n.midi).sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        staves = [{ clef: LOW_INSTRUMENT(program) || median < 57 ? 'bass' : 'treble', notes }];
      }
    }
    parts.push({
      id: `P${parts.length + 1}`,
      name,
      channel: ch,
      program,
      drum,
      grid: grids.get(ch),
      staves: staves.map((st) => ({ clef: st.clef, measures: voiceStaff(st.notes, measureQ, measures, grids.get(ch), drum) })),
    });
  }
  // Words go under the melody: the first part, on the notes they start with.
  const lead = parts.find((p) => !p.drum);
  if (lead && song.lyrics?.length) {
    const words = song.lyrics.map((l) => ({ beat: beatAt(l.time), text: l.text }));
    const tol = (lead.grid || 0.25) / 2 + 1e-6;
    lead.staves[0].measures.forEach((bar, m) => {
      for (const e of bar) {
        if (!e.pitches || e.tieStop) continue;
        const w = words.find((x) => !x.used && Math.abs(x.beat - (m * measureQ + e.pos)) <= tol);
        if (w) {
          w.used = true;
          e.lyric = w.text;
        }
      }
    });
  }
  return { title: title || song.title || 'Score', bpm: Math.round(song.bpm || 120), sf, minor: !!song.keySig?.minor, time: { beats: ts.num, beatType: ts.den }, measureQ, measures, parts };
}

/**
 * One staff: chords and rests filling every measure. Notes that start together
 * are a chord; a chord lasts until the next one starts (one voice, the way a
 * lead sheet or hymn part is written), split at bar lines with ties.
 */
function voiceStaff(notes, measureQ, measures, grid, drum = false) {
  const onsets = new Map();
  for (const n of notes) {
    if (!onsets.has(n.start)) onsets.set(n.start, []);
    onsets.get(n.start).push(n);
  }
  const starts = [...onsets.keys()].sort((a, b) => a - b);
  const segs = [];
  starts.forEach((s, i) => {
    const group = onsets.get(s);
    const next = starts[i + 1] ?? Infinity;
    // Drum hits are written to last until the next hit (up to a beat), not as tiny notes and rests.
    const end = drum ? Math.min(next, s + Math.max(1, ...group.map((n) => n.end - s))) : Math.min(next, Math.max(...group.map((n) => n.end)));
    const pitches = [...new Set(group.map((n) => n.midi))].sort((a, b) => a - b);
    segs.push({ start: s, end: Math.max(end, s + grid), pitches, vel: Math.max(...group.map((n) => n.vel)) });
  });
  const out = Array.from({ length: measures }, () => []);
  let cursor = 0;
  const place = (start, end, pitches, vel) => {
    // Cut at bar lines; the pieces inside one bar are written values tied together.
    let s = start;
    while (s < end - 1e-6) {
      const m = Math.floor(s / measureQ + 1e-6);
      if (m >= measures) break;
      const barEnd = (m + 1) * measureQ;
      const e = Math.min(end, barEnd);
      const offset = s - m * measureQ;
      // Keep long values on the beat: a note starting off the beat is split there first.
      const pieces = [];
      let pos = offset;
      let left = e - s;
      while (left > 1e-6) {
        const toBeat = pos % 1 > 1e-6 ? 1 - (pos % 1) : Infinity;
        const chunk = splitDuration(Math.min(left, toBeat), Math.max(grid, Math.min(4, measureQ - pos)), grid)[0];
        pieces.push({ ...chunk, pos });
        pos += chunk.len;
        left -= chunk.len;
      }
      for (const p of pieces) out[m].push({ pos: p.pos, len: p.len, type: p.type, dots: p.dots, triplet: p.triplet, pitches, vel });
      s = e;
    }
  };
  for (const seg of segs) {
    if (seg.start > cursor + 1e-6) place(cursor, seg.start, null, 0);
    place(Math.max(seg.start, cursor), seg.end, seg.pitches, seg.vel);
    cursor = Math.max(cursor, seg.end);
  }
  if (cursor < measures * measureQ - 1e-6) place(cursor, measures * measureQ, null, 0);
  // Ties between pieces of the same notes.
  const flat = out.flat();
  for (let i = 0; i + 1 < flat.length; i++) {
    const a = flat[i];
    const b = flat[i + 1];
    if (a.pitches && b.pitches && a.pitches === b.pitches) {
      a.tieStart = true;
      b.tieStop = true;
    }
  }
  // A bar of nothing is one whole-bar rest.
  return out.map((m) => (m.every((e) => !e.pitches) ? [{ pos: 0, len: measureQ, measureRest: true }] : m));
}

// ---- Score -> MusicXML -----------------------------------------------------------

// Where drums sit on the five-line percussion staff, and their noteheads.
const DRUM_DISPLAY = {
  35: ['F', 4], 36: ['F', 4], 37: ['C', 5, 'x'], 38: ['C', 5], 40: ['C', 5], 39: ['C', 5, 'x'],
  41: ['A', 4], 43: ['A', 4], 45: ['C', 5], 47: ['D', 5], 48: ['E', 5], 50: ['E', 5],
  42: ['G', 5, 'x'], 44: ['D', 4, 'x'], 46: ['G', 5, 'circle-x'], 22: ['G', 5, 'x'], 26: ['G', 5, 'circle-x'],
  49: ['A', 5, 'x'], 57: ['A', 5, 'x'], 52: ['A', 5, 'x'], 55: ['A', 5, 'x'], 51: ['F', 5, 'x'], 59: ['F', 5, 'x'], 53: ['F', 5, 'diamond'],
  54: ['E', 5, 'x'], 56: ['E', 5, 'triangle'],
};
const DRUM_NAMES = { 35: 'Kick', 36: 'Kick', 37: 'Side stick', 38: 'Snare', 39: 'Clap', 40: 'Snare', 41: 'Floor tom', 42: 'Hi-hat', 43: 'Floor tom', 44: 'Hi-hat pedal', 45: 'Tom 2', 46: 'Open hi-hat', 47: 'Tom 2', 48: 'Tom 1', 49: 'Crash', 50: 'Tom 1', 51: 'Ride', 52: 'China', 53: 'Ride bell', 54: 'Tambourine', 55: 'Splash', 56: 'Cowbell', 57: 'Crash 2', 59: 'Ride 2' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ACC_NAME = { '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp' };
const SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

function keyAlters(sf) {
  const a = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (sf > 0) SHARPS.slice(0, sf).forEach((l) => (a[l] = 1));
  if (sf < 0) [...SHARPS].reverse().slice(0, -sf).forEach((l) => (a[l] = -1));
  return a;
}

/** MusicXML (partwise 4.0) for a score from songToScore. */
export function scoreToMusicXML(score) {
  const div = 24; // divisions per quarter note: fits 32nds and triplets
  const d = (len) => Math.round(len * div);
  const L = [];
  L.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
  L.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  L.push('<score-partwise version="4.0">');
  L.push(`  <work><work-title>${esc(score.title)}</work-title></work>`);
  L.push('  <identification><encoding><software>Knight Keys</software></encoding></identification>');
  L.push('  <part-list>');
  for (const p of score.parts) {
    L.push(`    <score-part id="${p.id}"><part-name>${esc(p.name)}</part-name>`);
    if (p.drum) {
      const used = [...new Set(p.staves[0].measures.flat().flatMap((e) => e.pitches || []))].sort((a, b) => a - b);
      for (const n of used) L.push(`      <score-instrument id="${p.id}-I${n}"><instrument-name>${esc(DRUM_NAMES[n] || `Drum ${n}`)}</instrument-name></score-instrument>`);
      for (const n of used) L.push(`      <midi-instrument id="${p.id}-I${n}"><midi-channel>10</midi-channel><midi-unpitched>${n + 1}</midi-unpitched></midi-instrument>`);
    } else {
      L.push(`      <score-instrument id="${p.id}-I1"><instrument-name>${esc(p.name)}</instrument-name></score-instrument>`);
      L.push(`      <midi-instrument id="${p.id}-I1"><midi-channel>${p.channel + 1}</midi-channel><midi-program>${p.program + 1}</midi-program></midi-instrument>`);
    }
    L.push('    </score-part>');
  }
  L.push('  </part-list>');
  score.parts.forEach((p, pi) => {
    L.push(`  <part id="${p.id}">`);
    let inWord = false; // lyric syllables: is a word still going?
    for (let m = 0; m < score.measures; m++) {
      L.push(`    <measure number="${m + 1}">`);
      if (m === 0) {
        L.push(`      <attributes><divisions>${div}</divisions>`);
        if (!p.drum) L.push(`        <key><fifths>${score.sf}</fifths><mode>${score.minor ? 'minor' : 'major'}</mode></key>`);
        L.push(`        <time><beats>${score.time.beats}</beats><beat-type>${score.time.beatType}</beat-type></time>`);
        if (p.staves.length > 1) L.push(`        <staves>${p.staves.length}</staves>`);
        p.staves.forEach((st, si) => {
          const num = p.staves.length > 1 ? ` number="${si + 1}"` : '';
          if (st.clef === 'percussion') L.push(`        <clef${num}><sign>percussion</sign><line>2</line></clef>`);
          else if (st.clef === 'bass') L.push(`        <clef${num}><sign>F</sign><line>4</line></clef>`);
          else L.push(`        <clef${num}><sign>G</sign><line>2</line></clef>`);
        });
        L.push('      </attributes>');
        if (pi === 0) L.push(`      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${score.bpm}</per-minute></metronome></direction-type><sound tempo="${score.bpm}"/></direction>`);
      }
      p.staves.forEach((st, si) => {
        if (si > 0) L.push(`      <backup><duration>${d(score.measureQ)}</duration></backup>`);
        const voice = si * 4 + 1;
        const staffTag = p.staves.length > 1 ? `<staff>${si + 1}</staff>` : '';
        const alters = keyAlters(score.sf);
        const seen = {}; // accidentals already shown in this bar
        const bar = st.measures[m];
        bar.forEach((e, i) => {
          // Triplet brackets: start on the beat (or after a plain note), stop on the next beat.
          if (e.triplet) {
            const prev = bar[i - 1];
            const next = bar[i + 1];
            e.tupletStart = !prev?.triplet || Math.abs(e.pos % 1) < 1e-6;
            e.tupletStop = !next?.triplet || Math.abs((e.pos + e.len) % 1) < 1e-6;
          }
        });
        for (const e of bar) {
          if (e.measureRest) {
            L.push(`      <note><rest measure="yes"/><duration>${d(e.len)}</duration><voice>${voice}</voice>${staffTag}</note>`);
            continue;
          }
          const timing = `<duration>${d(e.len)}</duration>`;
          const look = `<voice>${voice}</voice><type>${e.type}</type>${'<dot/>'.repeat(e.dots)}${e.triplet ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : ''}`;
          const tuplet = (first) => (first && e.triplet ? `${e.tupletStart ? '<tuplet type="start" bracket="yes"/>' : ''}${e.tupletStop ? '<tuplet type="stop"/>' : ''}` : '');
          if (!e.pitches) {
            const t = tuplet(true);
            L.push(`      <note><rest/>${timing}${look}${staffTag}${t ? `<notations>${t}</notations>` : ''}</note>`);
            continue;
          }
          e.pitches.forEach((midi, i) => {
            const chord = i > 0 ? '<chord/>' : '';
            const ties = `${e.tieStop ? '<tie type="stop"/>' : ''}${e.tieStart ? '<tie type="start"/>' : ''}`;
            const marks = `${e.tieStop ? '<tied type="stop"/>' : ''}${e.tieStart ? '<tied type="start"/>' : ''}${tuplet(i === 0)}`;
            const tied = marks ? `<notations>${marks}</notations>` : '';
            if (p.drum) {
              const [step, oct, head] = DRUM_DISPLAY[midi] || ['C', 5];
              L.push(`      <note>${chord}<unpitched><display-step>${step}</display-step><display-octave>${oct}</display-octave></unpitched>${timing}${ties}<instrument id="${p.id}-I${midi}"/>${look}<stem>up</stem>${head ? `<notehead>${head}</notehead>` : ''}${staffTag}${tied}</note>`);
              return;
            }
            const sp = spellNote(midi, score.sf);
            const key = `${sp.letter}${sp.octave}`;
            const current = seen[key] ?? alters[sp.letter];
            const acc = sp.alter !== current && !e.tieStop ? `<accidental>${ACC_NAME[sp.alter]}</accidental>` : '';
            seen[key] = sp.alter;
            const alter = sp.alter ? `<alter>${sp.alter}</alter>` : '';
            let lyric = '';
            if (i === 0 && e.lyric) {
              const end = /\s$/.test(e.lyric);
              const text = e.lyric.replace(/^[/\\]/, '').trim();
              const syllabic = inWord ? (end ? 'end' : 'middle') : end ? 'single' : 'begin';
              inWord = !end;
              if (text) lyric = `<lyric number="1"><syllabic>${syllabic}</syllabic><text>${esc(text)}</text></lyric>`;
            }
            L.push(`      <note>${chord}<pitch><step>${sp.letter}</step>${alter}<octave>${sp.octave}</octave></pitch>${timing}${ties}${look}${acc}${staffTag}${tied}${lyric}</note>`);
          });
        }
      });
      if (m === score.measures - 1) L.push('      <barline location="right"><bar-style>light-heavy</bar-style></barline>');
      L.push('    </measure>');
    }
    L.push('  </part>');
  });
  L.push('</score-partwise>');
  return L.join('\n');
}

// ---- A small XML reader (no DOM needed, so it also runs in tests) ------------

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m));

/** Parse XML into { name, attrs, children, text }. */
export function parseXml(text) {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE(?:[^[>]|\[[\s\S]*?\])*>|<\?[\s\S]*?\?>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2]) {
      if (stack.length > 1) stack.pop();
    } else if (m[3]) {
      const el = { name: m[3], attrs: {}, children: [], text: '' };
      const attrRe = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let a;
      while ((a = attrRe.exec(m[4] || ''))) el.attrs[a[1]] = decode(a[2] ?? a[3]);
      top.children.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6]) top.text += decode(m[6]);
  }
  return root;
}
const kid = (el, name) => el?.children.find((c) => c.name === name);
const kids = (el, name) => (el ? el.children.filter((c) => c.name === name) : []);
const txt = (el, ...path) => {
  let e = el;
  for (const p of path) e = kid(e, p);
  return e ? e.text.trim() : '';
};
const num = (el, ...path) => {
  const t = txt(el, ...path);
  return t === '' ? null : Number(t);
};

// ---- MusicXML -> MIDI --------------------------------------------------------------

const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DYNAMIC_VEL = { pppp: 16, ppp: 24, pp: 36, p: 50, mp: 64, mf: 76, f: 90, ff: 104, fff: 116, ffff: 124, sf: 100, sfz: 100, fz: 100 };
const BEAT_UNIT = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 };

/** Timewise scores (rare) are turned into partwise first. */
function partwise(doc) {
  const sp = kid(doc, 'score-partwise');
  if (sp) return sp;
  const tw = kid(doc, 'score-timewise');
  if (!tw) throw new Error('not a MusicXML score');
  const parts = new Map();
  for (const m of kids(tw, 'measure')) {
    for (const p of kids(m, 'part')) {
      if (!parts.has(p.attrs.id)) parts.set(p.attrs.id, { name: 'part', attrs: { id: p.attrs.id }, children: [], text: '' });
      parts.get(p.attrs.id).children.push({ name: 'measure', attrs: m.attrs, children: p.children, text: '' });
    }
  }
  return { ...tw, children: [...tw.children.filter((c) => c.name !== 'measure'), ...parts.values()] };
}

/** Playback order of measures, with repeats and 1st/2nd endings played out. */
export function playOrder(measures) {
  const info = [];
  let ending = null;
  for (const m of measures) {
    const it = { forward: false, backward: 0, ending: null };
    for (const b of kids(m, 'barline')) {
      const rep = kid(b, 'repeat');
      if (rep?.attrs.direction === 'forward') it.forward = true;
      if (rep?.attrs.direction === 'backward') it.backward = Number(rep.attrs.times) || 2;
      const end = kid(b, 'ending');
      if (end?.attrs.type === 'start') ending = (end.attrs.number || '1').split(/[,\s]+/).filter(Boolean).map(Number);
      it.ending = it.ending || ending;
      if (end && end.attrs.type !== 'start') {
        it.ending = it.ending || ending;
        ending = null;
      }
    }
    if (!it.ending && ending) it.ending = ending;
    info.push(it);
  }
  const order = [];
  let i = 0;
  let start = 0;
  let pass = 1;
  let inRepeat = false;
  let guard = 0;
  while (i < info.length && guard++ < 20000) {
    const it = info[i];
    if (it.forward && !(inRepeat && start === i)) {
      start = i;
      pass = 1;
      inRepeat = true;
    }
    if (it.ending && !it.ending.includes(pass)) {
      i++;
      continue;
    }
    order.push(i);
    if (it.backward) {
      if (pass < it.backward) {
        pass++;
        inRepeat = true;
        i = start;
        continue;
      }
      inRepeat = false;
      pass = 1;
      start = i + 1;
    }
    i++;
  }
  return order;
}

/** The notes of one part, measure by measure (times in quarter notes from the bar's start). */
function readPart(part, instruments) {
  let divisions = 1;
  let transpose = 0;
  let vel = 80;
  const out = [];
  for (const m of kids(part, 'measure')) {
    const notes = [];
    const tempos = [];
    const marks = {};
    let cursor = 0;
    let extent = 0;
    let lastStart = 0;
    for (const el of m.children) {
      if (el.name === 'attributes') {
        divisions = num(el, 'divisions') || divisions;
        const tr = kid(el, 'transpose');
        if (tr) transpose = (num(tr, 'chromatic') || 0) + 12 * (num(tr, 'octave-change') || 0);
        const t = kid(el, 'time');
        if (t && num(t, 'beats')) marks.time = { num: parseInt(txt(t, 'beats'), 10), den: num(t, 'beat-type') || 4 };
        const k = kid(el, 'key');
        if (k && num(k, 'fifths') !== null) marks.key = { sf: num(k, 'fifths'), minor: txt(k, 'mode') === 'minor' };
      } else if (el.name === 'backup') cursor -= (num(el, 'duration') || 0) / divisions;
      else if (el.name === 'forward') cursor += (num(el, 'duration') || 0) / divisions;
      else if (el.name === 'direction' || el.name === 'sound') {
        const sound = el.name === 'sound' ? el : kid(el, 'sound');
        const offset = (num(el, 'offset') || 0) / divisions;
        if (sound?.attrs.tempo) tempos.push({ at: cursor + offset, bpm: Number(sound.attrs.tempo) });
        else if (el.name === 'direction') {
          const metro = kids(el, 'direction-type').map((dt) => kid(dt, 'metronome')).find(Boolean);
          const per = num(metro, 'per-minute');
          if (per) tempos.push({ at: cursor + offset, bpm: per * (BEAT_UNIT[txt(metro, 'beat-unit')] || 1) * (kid(metro, 'beat-unit-dot') ? 1.5 : 1) });
        }
        if (sound?.attrs.dynamics) vel = Math.max(1, Math.min(127, Math.round((90 * Number(sound.attrs.dynamics)) / 100)));
        else if (el.name === 'direction') {
          const dyn = kids(el, 'direction-type').map((dt) => kid(dt, 'dynamics')).find(Boolean);
          const mark = dyn?.children[0]?.name;
          if (mark && DYNAMIC_VEL[mark]) vel = DYNAMIC_VEL[mark];
        }
      } else if (el.name === 'note') {
        if (kid(el, 'grace') || kid(el, 'cue')) continue;
        const dur = (num(el, 'duration') || 0) / divisions;
        const isChord = !!kid(el, 'chord');
        const start = isChord ? lastStart : cursor;
        if (!isChord) {
          lastStart = cursor;
          cursor += dur;
        }
        extent = Math.max(extent, cursor);
        if (kid(el, 'rest')) continue;
        let midi = null;
        let drum = false;
        const pitch = kid(el, 'pitch');
        if (pitch) midi = (num(pitch, 'octave') + 1) * 12 + STEP_PC[txt(pitch, 'step')] + Math.round(num(pitch, 'alter') || 0) + transpose;
        else if (kid(el, 'unpitched')) {
          drum = true;
          const inst = instruments.get(kid(el, 'instrument')?.attrs.id);
          if (inst?.unpitched) midi = inst.unpitched;
          else {
            const up = kid(el, 'unpitched');
            const step = txt(up, 'display-step');
            const oct = num(up, 'display-octave');
            const hit = Object.entries(DRUM_DISPLAY).find(([, v]) => v[0] === step && v[1] === oct);
            midi = hit ? Number(hit[0]) : 38;
          }
        }
        if (midi === null || midi < 0 || midi > 127) continue;
        const ties = kids(el, 'tie').map((t) => t.attrs.type);
        const lyEl = kids(el, 'lyric').find((l) => !l.attrs.number || l.attrs.number === '1');
        const syl = txt(lyEl, 'syllabic');
        // Whole words and word ends get a space after them, so the words read right when sung along.
        const lyric = lyEl && txt(lyEl, 'text') ? `${txt(lyEl, 'text')}${syl === 'begin' || syl === 'middle' ? '' : ' '}` : '';
        const noteVel = el.attrs.dynamics ? Math.max(1, Math.min(127, Math.round((90 * Number(el.attrs.dynamics)) / 100))) : vel;
        notes.push({ start, dur, midi, vel: noteVel, tieStart: ties.includes('start'), tieStop: ties.includes('stop'), drum, lyric, voice: txt(el, 'voice') || '1' });
      }
      extent = Math.max(extent, cursor);
    }
    out.push({ notes, tempos, marks, length: extent });
  }
  return out;
}

/**
 * Convert a MusicXML score to a song you can play: MIDI bytes (one track per
 * part, named, with the right instruments), plus a summary.
 */
export function musicXmlToMidi(xmlText, { ppq = 480 } = {}) {
  const score = partwise(parseXml(xmlText));
  const title = txt(score, 'work', 'work-title') || txt(score, 'movement-title') || '';
  const partList = kid(score, 'part-list');
  const meta = new Map();
  for (const sp of kids(partList, 'score-part')) {
    const instruments = new Map();
    for (const mi of kids(sp, 'midi-instrument')) {
      instruments.set(mi.attrs.id, { channel: num(mi, 'midi-channel'), program: num(mi, 'midi-program'), unpitched: num(mi, 'midi-unpitched') ? num(mi, 'midi-unpitched') - 1 : null });
    }
    meta.set(sp.attrs.id, { name: txt(sp, 'part-name') || txt(sp, 'part-abbreviation') || sp.attrs.id, instruments });
  }
  const parts = kids(score, 'part');
  if (!parts.length) throw new Error('the score has no parts');
  const read = parts.map((p) => readPart(p, meta.get(p.attrs.id)?.instruments || new Map()));
  const order = playOrder(kids(parts[0], 'measure'));
  const count = Math.max(...read.map((r) => r.length));
  // Bar lengths: the longest part decides (handles pickup bars too).
  const lengths = Array.from({ length: count }, (_, i) => Math.max(0, ...read.map((r) => r[i]?.length || 0)));
  let barStart = 0;
  const startOf = []; // playback position of each played bar
  for (const mi of order) {
    startOf.push(barStart);
    barStart += lengths[mi] || 0;
  }

  // Channels: what the score asks for, else in order (drums on 10).
  const used = new Set();
  const channels = parts.map((p, pi) => {
    const inst = [...(meta.get(p.attrs.id)?.instruments.values() || [])][0];
    const drum = read[pi].some((m) => m.notes.some((n) => n.drum)) || inst?.channel === 10;
    if (drum) return 9;
    let ch = inst?.channel ? inst.channel - 1 : -1;
    if (ch < 0 || ch === 9 || used.has(ch)) {
      ch = 0;
      while ((used.has(ch) || ch === 9) && ch < 15) ch++;
    }
    used.add(ch);
    return ch;
  });

  const conductor = [];
  const tick = (q) => q * ppq;
  if (title) conductor.push({ tick: 0, bytes: metaEvent(0x03, title) });
  let tempoSet = false;
  const seenTempo = new Set();
  let lastTime = null;
  let lastKey = null;
  order.forEach((mi, k) => {
    for (const r of read) {
      const bar = r[mi];
      if (!bar) continue;
      for (const t of bar.tempos) {
        const at = Math.round(tick(startOf[k] + t.at));
        if (seenTempo.has(at) || !(t.bpm > 0)) continue;
        seenTempo.add(at);
        const us = Math.round(60e6 / t.bpm);
        conductor.push({ tick: at, bytes: metaEvent(0x51, [(us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff]) });
        if (at === 0) tempoSet = true;
      }
    }
    const marks = read[0][mi]?.marks || {};
    if (marks.time && JSON.stringify(marks.time) !== lastTime) {
      lastTime = JSON.stringify(marks.time);
      conductor.push({ tick: tick(startOf[k]), bytes: metaEvent(0x58, [marks.time.num, Math.round(Math.log2(marks.time.den)), 0x18, 0x08]) });
    }
    if (marks.key && JSON.stringify(marks.key) !== lastKey) {
      lastKey = JSON.stringify(marks.key);
      conductor.push({ tick: tick(startOf[k]), bytes: metaEvent(0x59, [marks.key.sf & 0xff, marks.key.minor ? 1 : 0]) });
    }
  });
  if (!tempoSet) conductor.push({ tick: 0, bytes: metaEvent(0x51, [0x07, 0xa1, 0x20]) }); // 120 bpm

  let noteCount = 0;
  const tracks = parts.map((p, pi) => {
    const ch = channels[pi];
    const info = meta.get(p.attrs.id);
    const inst = [...(info?.instruments.values() || [])][0];
    const events = [{ tick: 0, bytes: metaEvent(0x03, info?.name || `Part ${pi + 1}`) }];
    if (ch !== 9) events.push({ tick: 0, bytes: [0xc0 | ch, Math.max(0, Math.min(127, (inst?.program || 1) - 1))] });
    const open = new Map(); // tied notes waiting for their continuation
    const notes = [];
    order.forEach((mi, k) => {
      for (const n of read[pi][mi]?.notes || []) {
        const start = startOf[k] + n.start;
        const key = `${n.voice}:${n.midi}`;
        const prev = open.get(key) || open.get(`*:${n.midi}`);
        if (n.tieStop && prev && Math.abs(prev.start + prev.dur - start) < 0.02) {
          prev.dur += n.dur;
          if (!n.tieStart) {
            open.delete(key);
            open.delete(`*:${n.midi}`);
          }
          continue;
        }
        const note = { start, dur: n.dur, midi: n.midi, vel: n.vel, lyric: n.lyric };
        notes.push(note);
        if (n.tieStart) {
          open.set(key, note);
          open.set(`*:${n.midi}`, note);
        }
      }
    });
    for (const n of notes) {
      if (n.lyric) events.push({ tick: tick(n.start), bytes: metaEvent(0x05, n.lyric) });
      events.push({ tick: tick(n.start), bytes: [0x90 | ch, n.midi, n.vel] });
      events.push({ tick: tick(n.start + Math.max(0.05, n.dur * (ch === 9 ? 0.5 : 0.98))), bytes: [0x80 | ch, n.midi, 0] });
    }
    noteCount += notes.length;
    return { events };
  });
  return {
    bytes: writeMidiTickTracks([{ events: conductor }, ...tracks], ppq),
    title,
    parts: parts.map((p) => meta.get(p.attrs.id)?.name || p.attrs.id),
    measures: order.length,
    notes: noteCount,
  };
}

// ---- Compressed MusicXML (.mxl = zip) ----------------------------------------------

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The score inside a .mxl file, as XML text. */
export async function unzipMxl(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a .mxl (zip) file');
  const entries = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map();
  const utf8 = new TextDecoder();
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = utf8.decode(data.subarray(p + 46, p + 46 + nameLen));
    files.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async (name) => {
    const f = files.get(name);
    if (!f) return null;
    const start = f.local + 30 + view.getUint16(f.local + 26, true) + view.getUint16(f.local + 28, true);
    const raw = data.subarray(start, start + f.size);
    return utf8.decode(f.method === 8 ? await inflateRaw(raw) : raw);
  };
  const container = await read('META-INF/container.xml');
  let path = container ? kid(kid(kid(parseXml(container), 'container'), 'rootfiles'), 'rootfile')?.attrs['full-path'] : null;
  if (!path || !files.has(path)) path = [...files.keys()].find((n) => !n.startsWith('META-INF') && /\.(xml|musicxml)$/i.test(n));
  if (!path) throw new Error('no score inside the .mxl file');
  return read(path);
}

/** Read a score file (MusicXML text or .mxl bytes) and give its XML text. */
export async function scoreFileText(name, bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (/\.mxl$/i.test(name) || (data[0] === 0x50 && data[1] === 0x4b)) return unzipMxl(data);
  // UTF-16 files (some Finale/Sibelius exports) start with a byte-order mark.
  if ((data[0] === 0xff && data[1] === 0xfe) || (data[0] === 0xfe && data[1] === 0xff)) return new TextDecoder(data[0] === 0xff ? 'utf-16le' : 'utf-16be').decode(data);
  return new TextDecoder().decode(data);
}
