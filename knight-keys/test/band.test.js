import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, songToMidi } from '../js/songs.js';
import { parseMidi, buildSong } from '../js/midi-file.js';
import { ROLES, arrangeBand, bandMidi, chordsFromChart, chordsFromNotes, songInBeats, transposeSymbol } from '../js/band.js';

const setup = (id, level = 1, extra = {}) => {
  const entry = SONGS.find((s) => s.id === id);
  const song = buildSong(parseMidi(songToMidi(entry)));
  const { song: sb, melody } = songInBeats(song, entry.melody ? 0 : null);
  return { entry, arr: arrangeBand(sb, { chords: chordsFromChart(entry.chords), melody, level, drums: entry.drums, ...extra }) };
};
const track = (arr, role) => arr.tracks.find((t) => t.role === role);

test('every role has its own channel', () => {
  const chs = ROLES.map((r) => r.ch);
  assert.equal(new Set(chs).size, chs.length);
  assert.equal(ROLES.find((r) => r.id === 'drums').ch, 9);
});

test('a melody song gets the whole band and a four-part choir', () => {
  for (const level of [0, 1, 2]) {
    const { arr } = setup('amazing', level);
    for (const role of ['lead', 'keys', 'guitar', 'bass', 'organ', 'drums', 'soprano', 'alto', 'tenor', 'choirbass']) assert.ok(track(arr, role).notes.length > 0, `level ${level}: ${role} plays`);
    // Instruments in their ranges.
    assert.ok(track(arr, 'bass').notes.every((n) => n.note >= 28 && n.note <= 50), 'bass guitar range');
    assert.ok(track(arr, 'guitar').notes.every((n) => n.note >= 40 && n.note <= 76), 'guitar range');
    for (const [role, lo, hi] of [['soprano', 60, 81], ['alto', 53, 74], ['tenor', 48, 69], ['choirbass', 40, 62]]) assert.ok(track(arr, role).notes.every((n) => n.note >= lo && n.note <= hi), `${role} range`);
    // Everything waits for the one-bar count-in (3/4 here).
    assert.equal(arr.offset, 3);
    for (const t of arr.tracks) if (t.role !== 'countin') assert.ok(t.notes.every((n) => n.beat >= arr.offset - 0.05), `${t.role} after the count-in`);
    assert.equal(track(arr, 'countin').notes.length, 3);
  }
});

test('the bass plays the chord roots (slash chords: the bass note)', () => {
  const { arr } = setup('worshipflow', 0);
  for (const c of arr.chords) {
    const first = track(arr, 'bass').notes.find((n) => Math.abs(n.beat - c.beat) < 0.05);
    assert.ok(first, `a bass note at ${c.symbol}`);
    assert.equal(first.note % 12, c.bass, `${c.symbol}: plays the bass note`);
  }
});

test('a chord-only song: no lead, the choir sings "oohs" on the chords', () => {
  const { arr } = setup('worshipflow');
  assert.equal(track(arr, 'lead').notes.length, 0);
  assert.equal(track(arr, 'soprano').notes.length, arr.chords.length);
  for (const c of arr.chords) {
    const notes = ['soprano', 'alto', 'tenor', 'choirbass'].map((r) => track(arr, r).notes.find((n) => n.beat <= c.beat + 0.01 && n.beat + n.beats > c.beat + 0.01)?.note);
    assert.ok(notes.every((n) => n !== undefined && (c.triad.includes(n % 12) || n % 12 === c.bass)), `${c.symbol}: choir sings chord tones`);
  }
});

test('no drums when asked; busier parts at higher levels', () => {
  assert.equal(track(setup('amazing', 1, { drums: null }).arr, 'drums').notes.length, 0);
  assert.ok(track(setup('jesusloves', 2).arr, 'guitar').notes.length > track(setup('jesusloves', 0).arr, 'guitar').notes.length);
});

test('chords from any MIDI file', () => {
  const entry = SONGS.find((s) => s.id === 'worshipflow');
  const song = buildSong(parseMidi(songToMidi(entry)));
  const { song: sb } = songInBeats(song);
  const chords = chordsFromNotes(sb.notes.filter((n) => n.ch !== 9), 32);
  assert.deepEqual(chords.slice(0, 4).map((c) => c.symbol), ['G', 'D', 'Em', 'C']);
  assert.equal(chords[1].bass, 6, 'D/F# keeps F# in the bass');
});

test('band MIDI: a named track per part', () => {
  const { arr } = setup('jesusloves');
  const back = buildSong(parseMidi(bandMidi(arr)));
  for (const name of ['Lead vocal (melody)', 'Keys', 'Guitar', 'Bass', 'Drums', 'Soprano', 'Alto', 'Tenor', 'Bass (choir)', 'Count-in']) assert.ok(back.trackNames.includes(name), name);
  assert.equal(back.firstProgram[2], 25, 'steel guitar');
  assert.equal(back.firstProgram[4], 52, 'choir aahs');
  assert.ok(Math.abs(back.bpm - arr.bpm) < 0.01);
});

test('chord symbols follow the key', () => {
  assert.equal(transposeSymbol('G', 2), 'A');
  assert.equal(transposeSymbol('D/F#', 2), 'E/G#');
  assert.equal(transposeSymbol('Bbm7', -1), 'Am7');
  assert.equal(transposeSymbol('Em', 0), 'Em');
});
