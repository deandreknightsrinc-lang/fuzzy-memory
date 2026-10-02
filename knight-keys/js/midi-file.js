// Standard MIDI File (SMF) reader and writer.

/** Parse raw SMF bytes into header + per-track event lists (ticks). */
export function parseMidi(buffer) {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let p = 0;

  // RIFF-wrapped files (.rmi) and junk prefixes: find the MThd header.
  const start = findChunk(data, 'MThd');
  if (start < 0) throw new Error('Not a MIDI file (no MThd header found)');
  p = start;

  const str = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(data[p + i]);
    p += n;
    return s;
  };
  const u32 = () => {
    const v = ((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | data[p + 3]) >>> 0;
    p += 4;
    return v;
  };
  const u16 = () => {
    const v = (data[p] << 8) | data[p + 1];
    p += 2;
    return v;
  };
  const vlq = () => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = data[p++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  };

  str(4);
  const headerLen = u32();
  const headerEnd = p + headerLen;
  const format = u16();
  const trackCount = u16();
  const division = u16();
  p = headerEnd;

  const tracks = [];
  while (p + 8 <= data.length && tracks.length < trackCount + 64) {
    const id = str(4);
    const len = u32();
    const end = Math.min(p + len, data.length);
    if (id !== 'MTrk') {
      p = end;
      continue;
    }
    const events = [];
    let tick = 0;
    let running = 0;
    while (p < end) {
      tick += vlq();
      if (p >= end) break;
      const b = data[p];
      if (b === 0xff) {
        p++;
        const type = data[p++];
        const l = vlq();
        events.push({ tick, kind: 'meta', type, data: data.slice(p, p + l) });
        p += l;
        if (type === 0x2f) break;
      } else if (b === 0xf0 || b === 0xf7) {
        p++;
        const l = vlq();
        events.push({ tick, kind: 'sysex', data: data.slice(p, p + l) });
        p += l;
      } else {
        let status;
        if (b & 0x80) {
          status = b;
          running = b;
          p++;
        } else if (running) {
          status = running;
        } else {
          p++; // stray data byte with no running status
          continue;
        }
        const type = status & 0xf0;
        const ch = status & 0x0f;
        const d1 = data[p++] & 0x7f;
        const d2 = type === 0xc0 || type === 0xd0 ? 0 : data[p++] & 0x7f;
        events.push({ tick, kind: 'ch', type, ch, d1, d2 });
      }
    }
    tracks.push(events);
    p = end;
  }
  return { format, division, tracks };
}

function findChunk(data, id) {
  const limit = Math.min(data.length - 4, 4096);
  for (let i = 0; i <= limit; i++) {
    if (
      data[i] === id.charCodeAt(0) &&
      data[i + 1] === id.charCodeAt(1) &&
      data[i + 2] === id.charCodeAt(2) &&
      data[i + 3] === id.charCodeAt(3)
    ) {
      return i;
    }
  }
  return -1;
}

const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('latin1') : null;
const bytesToText = (d) => (textDecoder ? textDecoder.decode(d) : String.fromCharCode(...d));

/**
 * Turn a parsed file into a playable song: notes with seconds, a flat
 * time-sorted event list, tempo map, key/time signatures and track names.
 */
export function buildSong(parsed) {
  const { division, tracks } = parsed;
  const smpte = (division & 0x8000) !== 0;
  const ppq = smpte ? 0 : division || 480;
  const ticksPerSecond = smpte ? -((division >> 8) << 24 >> 24) * (division & 0xff) : 0;

  // Tempo map from every track (format 1 files usually keep it in track 0).
  const tempoEvents = [];
  let keySig = null;
  let timeSig = null;
  const trackNames = [];
  let title = '';
  const lyricTicks = []; // lyric events (0x05), or karaoke text (0x01) if a file has no lyric events
  const textTicks = [];
  tracks.forEach((events, ti) => {
    for (const e of events) {
      if (e.kind !== 'meta') continue;
      if (e.type === 0x51 && e.data.length >= 3) {
        tempoEvents.push({ tick: e.tick, us: (e.data[0] << 16) | (e.data[1] << 8) | e.data[2] });
      } else if (e.type === 0x59 && e.data.length >= 2 && !keySig) {
        keySig = { sf: (e.data[0] << 24) >> 24, minor: e.data[1] === 1 };
      } else if (e.type === 0x58 && e.data.length >= 2 && !timeSig) {
        timeSig = { num: e.data[0], den: 2 ** e.data[1] };
      } else if (e.type === 0x05) {
        lyricTicks.push({ tick: e.tick, text: bytesToText(e.data) });
      } else if (e.type === 0x01) {
        const t = bytesToText(e.data);
        if (!t.startsWith('@') && !t.startsWith('%')) textTicks.push({ tick: e.tick, text: t });
      } else if (e.type === 0x03 && trackNames[ti] === undefined) {
        trackNames[ti] = bytesToText(e.data).trim();
        if (ti === 0 && !title) title = trackNames[ti];
      }
    }
  });
  tempoEvents.sort((a, b) => a.tick - b.tick);

  const segments = [{ tick: 0, sec: 0, us: 500000 }];
  for (const t of tempoEvents) {
    const last = segments[segments.length - 1];
    const sec = last.sec + ((t.tick - last.tick) * last.us) / 1e6 / ppq;
    if (t.tick === last.tick) {
      last.us = t.us;
    } else {
      segments.push({ tick: t.tick, sec, us: t.us });
    }
  }
  const tickToSec = (tick) => {
    if (smpte) return tick / ticksPerSecond;
    let lo = 0;
    let hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid].tick <= tick) lo = mid;
      else hi = mid - 1;
    }
    const s = segments[lo];
    return s.sec + ((tick - s.tick) * s.us) / 1e6 / ppq;
  };

  // Beat clock (quarter-note beats ↔ seconds), used to lock grooves to the song.
  const segmentAt = (sec) => {
    let lo = 0;
    let hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid].sec <= sec) lo = mid;
      else hi = mid - 1;
    }
    return segments[lo];
  };
  const beatAt = (sec) => {
    if (smpte) return (sec * 120) / 60;
    const seg = segmentAt(sec);
    return seg.tick / ppq + ((sec - seg.sec) * 1e6) / seg.us;
  };
  const secAt = (beat) => (smpte ? beat / 2 : tickToSec(beat * ppq));
  const bpmAt = (sec) => (smpte ? 120 : 60e6 / segmentAt(sec).us);

  const notes = [];
  const events = [];
  const usedChannels = new Set();
  const firstProgram = new Array(16).fill(-1);

  tracks.forEach((trackEvents, ti) => {
    const open = new Map(); // ch*128+note -> [{tick, vel}]
    for (const e of trackEvents) {
      if (e.kind !== 'ch') continue;
      const time = tickToSec(e.tick);
      const { type, ch, d1, d2 } = e;
      if (type === 0x90 && d2 > 0) {
        const key = ch * 128 + d1;
        if (!open.has(key)) open.set(key, []);
        open.get(key).push({ tick: e.tick, time, vel: d2 });
        usedChannels.add(ch);
      } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
        const stack = open.get(ch * 128 + d1);
        if (stack && stack.length) {
          const on = stack.shift();
          notes.push({ time: on.time, dur: Math.max(0.01, time - on.time), note: d1, vel: on.vel, ch, track: ti });
        }
      } else if (type === 0xb0) {
        events.push({ time, type: 'cc', ch, cc: d1, value: d2 });
      } else if (type === 0xc0) {
        events.push({ time, type: 'program', ch, program: d1 });
        if (firstProgram[ch] < 0) firstProgram[ch] = d1;
      } else if (type === 0xe0) {
        events.push({ time, type: 'pitch', ch, value: ((d2 << 7) | d1) - 8192 });
      }
    }
    // Close notes that never got a note-off.
    for (const [key, stack] of open) {
      for (const on of stack) {
        notes.push({ time: on.time, dur: 0.5, note: key % 128, vel: on.vel, ch: Math.floor(key / 128), track: ti });
      }
    }
  });

  notes.sort((a, b) => a.time - b.time || a.note - b.note);
  for (const n of notes) {
    events.push({ time: n.time, type: 'on', ch: n.ch, note: n.note, vel: n.vel });
    events.push({ time: n.time + n.dur, type: 'off', ch: n.ch, note: n.note });
  }
  const order = { off: 0, cc: 1, program: 1, pitch: 1, on: 2 };
  events.sort((a, b) => a.time - b.time || order[a.type] - order[b.type]);

  const lastTime = events.length ? events[events.length - 1].time : 0;
  // Karaoke files often keep their words in text events instead of lyric events.
  const lyricSource = lyricTicks.length ? lyricTicks : textTicks.length >= 8 ? textTicks : [];
  const lyrics = lyricSource.map((l) => ({ time: tickToSec(l.tick), text: l.text })).sort((a, b) => a.time - b.time);
  const bpm = tempoEvents.length ? 60e6 / tempoEvents[0].us : 120;

  return {
    title,
    duration: lastTime + 0.5,
    notes,
    events,
    bpm,
    keySig,
    timeSig,
    trackNames,
    lyrics,
    channels: [...usedChannels].sort((a, b) => a - b),
    firstProgram,
    beatAt,
    secAt,
    bpmAt,
  };
}

/**
 * Write a format-0 MIDI file. `events` are { time: seconds, bytes: [status, d1, d2?] }.
 */
export function writeMidi(events, { ppq = 480, bpm = 120, name = 'Knight Keys recording' } = {}) {
  const ticksPerSec = (ppq * bpm) / 60;
  const body = [];
  const pushVlq = (v) => {
    const stack = [v & 0x7f];
    while ((v >>= 7)) stack.unshift((v & 0x7f) | 0x80);
    body.push(...stack);
  };
  const us = Math.round(60e6 / bpm);
  const nameBytes = [...name].map((c) => (c.charCodeAt(0) < 0x80 ? c.charCodeAt(0) : 0x2d)); // ASCII only
  pushVlq(0);
  body.push(0xff, 0x03);
  pushVlq(nameBytes.length);
  body.push(...nameBytes);
  pushVlq(0);
  body.push(0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff);

  const sorted = [...events].sort((a, b) => a.time - b.time);
  let lastTick = 0;
  for (const e of sorted) {
    const tick = Math.max(lastTick, Math.round(Math.max(0, e.time) * ticksPerSec));
    pushVlq(tick - lastTick);
    body.push(...e.bytes);
    lastTick = tick;
  }
  pushVlq(0);
  body.push(0xff, 0x2f, 0x00);

  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 0xff, ppq & 0xff];
  const len = body.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  return new Uint8Array([...header, ...trackHeader, ...body]);
}

/**
 * Hymn and piano files often put both hands on one channel. This rewrites the
 * melodic notes so everything from `splitNote` up is the right hand (channel 1)
 * and everything below it the left hand (channel 2); drums stay on channel 10.
 * Timing is kept exactly (tempo changes are folded into one steady tempo).
 */
export function splitHands(song, splitNote = 60) {
  const ev = [];
  const add = (time, bytes) => ev.push({ time, bytes });
  if (song.keySig) add(0, [0xff, 0x59, 0x02, song.keySig.sf & 0xff, song.keySig.minor ? 1 : 0]);
  if (song.timeSig) add(0, [0xff, 0x58, 0x04, song.timeSig.num, Math.log2(song.timeSig.den), 0x18, 0x08]);
  add(0, [0xc0, 0]);
  add(0, [0xc1, 0]);
  for (const n of song.notes) {
    const ch = n.ch === 9 ? 9 : n.note >= splitNote ? 0 : 1;
    add(n.time, [0x90 | ch, n.note, n.vel]);
    add(n.time + n.dur, [0x80 | ch, n.note, 0]);
  }
  for (const e of song.events) {
    if (e.type === 'cc' && e.ch !== 9) for (const ch of [0, 1]) add(e.time, [0xb0 | ch, e.cc, e.value]);
  }
  return writeMidi(ev, { bpm: song.bpm || 120, name: song.title || 'Knight Keys song' });
}

/**
 * Write a format-1 MIDI file from tracks of tick-timed events:
 * tracks: [{ events: [{ tick, bytes }] }]. The first track is usually the
 * conductor (tempo, key, time signature).
 */
export function writeMidiTickTracks(tracks, ppq = 480) {
  const chunk = (events) => {
    const body = [];
    const vlq = (v) => {
      const stack = [v & 0x7f];
      while ((v >>= 7)) stack.unshift((v & 0x7f) | 0x80);
      body.push(...stack);
    };
    // Metas first, then note-offs before note-ons at the same tick.
    const rank = (b) => (b[0] === 0xff ? 0 : (b[0] & 0xf0) === 0x80 ? 1 : (b[0] & 0xf0) === 0x90 ? 3 : 2);
    let last = 0;
    for (const e of [...events].sort((a, b) => a.tick - b.tick || rank(a.bytes) - rank(b.bytes))) {
      const tick = Math.max(last, Math.round(e.tick));
      vlq(tick - last);
      body.push(...e.bytes);
      last = tick;
    }
    vlq(0);
    body.push(0xff, 0x2f, 0x00);
    const len = body.length;
    return [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff, ...body];
  };
  const out = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (tracks.length >> 8) & 0xff, tracks.length & 0xff, (ppq >> 8) & 0xff, ppq & 0xff];
  for (const t of tracks) out.push(...chunk(t.events));
  return new Uint8Array(out);
}

const asciiBytes = (str) => [...str].map((c) => (c.charCodeAt(0) < 0x80 ? c.charCodeAt(0) : 0x2d));
/** A meta event (text, tempo, key...): [0xff, type, length..., data]. Text is kept ASCII. */
export function metaEvent(type, data) {
  const d = typeof data === 'string' ? asciiBytes(data) : data;
  const len = [d.length & 0x7f];
  for (let v = d.length >> 7; v; v >>= 7) len.unshift((v & 0x7f) | 0x80);
  return [0xff, type, ...len, ...d];
}

/**
 * Write a format-1 MIDI file with one named track per part (Logic, ACE Studio and
 * choir plug-ins put each track on its own instrument track).
 * tracks: [{ name, events: [{ time: seconds, bytes }] }]; the tempo, key and time
 * signature go in a conductor track first.
 */
export function writeMidiTracks(tracks, { ppq = 480, bpm = 120, name = 'Knight Keys', keySig = null, timeSig = null } = {}) {
  const ticksPerSec = (ppq * bpm) / 60;
  const us = Math.round(60e6 / bpm);
  const conductor = [metaEvent(0x03, name), metaEvent(0x51, [(us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff])];
  if (keySig) conductor.push(metaEvent(0x59, [keySig.sf & 0xff, keySig.minor ? 1 : 0]));
  if (timeSig) conductor.push(metaEvent(0x58, [timeSig.num, Math.log2(timeSig.den), 0x18, 0x08]));
  return writeMidiTickTracks(
    [
      { events: conductor.map((bytes) => ({ tick: 0, bytes })) },
      ...tracks.map((t) => ({ events: [{ tick: 0, bytes: metaEvent(0x03, t.name) }, ...t.events.map((e) => ({ tick: Math.max(0, e.time) * ticksPerSec, bytes: e.bytes }))] })),
    ],
    ppq,
  );
}
