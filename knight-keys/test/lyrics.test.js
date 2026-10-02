import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, songToMidi, parseMelody, validateSong } from '../js/songs.js';
import { parseMidi, buildSong, writeMidiTickTracks, metaEvent } from '../js/midi-file.js';
import { parseLyricTokens, lineLyricEvents, lyricLines, lineAt } from '../js/lyrics.js';
import { songToScore, scoreToMusicXML, musicXmlToMidi } from '../js/notation.js';
import { arrangeBand, bandMidi, chordsFromChart, songInBeats } from '../js/band.js';

const words = (line) => line.words.map((w) => w.text).join('').trim();

test('every library song with words has one syllable per melody note', () => {
  const withWords = SONGS.filter((s) => s.lyrics);
  assert.ok(withWords.length >= 10);
  for (const s of withWords) {
    assert.ok(s.melody, `${s.id} has a melody`);
    assert.equal(parseLyricTokens(s.lyrics).length, parseMelody(s.melody).length, `${s.id}: syllables = notes`);
    assert.deepEqual(validateSong(s), [], `${s.id} is valid`);
    assert.ok(/^[\x20-\x7e]*$/.test(s.lyrics), `${s.id}: plain ASCII, so it survives MIDI files`);
  }
});

test('library song -> MIDI -> lyrics lines, timed to the melody', () => {
  const entry = SONGS.find((s) => s.id === 'amazing');
  const song = buildSong(parseMidi(songToMidi(entry)));
  const lines = lyricLines(song.lyrics);
  assert.deepEqual(lines.map(words), ['Amazing grace, how sweet the sound', 'that saved a wretch like me!', 'I once was lost, but now am found,', 'was blind, but now I see.']);
  const firstNote = song.notes.filter((n) => n.ch === 0).sort((a, b) => a.time - b.time)[0];
  assert.ok(Math.abs(lines[0].start - firstNote.time) < 0.01, 'the first word starts with the first note');
  assert.equal(lineAt(lines, 0), -1);
  assert.equal(lineAt(lines, lines[1].start + 0.1), 1);
  assert.equal(entry.verses.length, 3);
});

test('a melody note held over ("_") gets no new word', () => {
  const t = parseLyricTokens('A- ma- zing _ grace / that');
  assert.deepEqual(t.map((x) => x && x.text), ['A', 'ma', 'zing', null, 'grace', 'that']);
  assert.equal(t[0].wordEnd, false);
  assert.equal(t[2].wordEnd, true);
  assert.equal(t[5].lineStart, true);
});

test('chord-chart songs: one line of words per 2 bars', () => {
  const ev = lineLyricEvents('Every morning I will praise You\n\nEvery evening I will sing', 4, 2);
  assert.equal(ev[0].beat, 0);
  assert.equal(ev.filter((e) => e.text.startsWith('/'))[1].beat, 8, 'the second line starts on bar 3 (blank lines skipped)');
  const song = { title: 'Mine', key: 0, time: [4, 4], bpm: 60, chords: 'G:4 C:4 G:4 D:4', lyrics: 'Line one here\nLine two here', drums: null };
  const built = buildSong(parseMidi(songToMidi(song)));
  const lines = lyricLines(built.lyrics);
  assert.deepEqual(lines.map(words), ['Line one here', 'Line two here']);
  assert.ok(Math.abs(lines[1].start - 8) < 0.01, 'line two at bar 3 (60 bpm)');
});

test('karaoke files: text events with / and \\ line breaks, @ tags ignored', () => {
  const texts = ['@TKaraoke', '/Hel', 'lo ', 'there ', '/How ', 'are ', 'you\r', 'Fine ', '\\Good ', 'bye '];
  const events = [{ tick: 0, bytes: metaEvent(0x03, 'Song') }, ...texts.map((t, i) => ({ tick: i * 240, bytes: metaEvent(0x01, t) }))];
  const song = buildSong(parseMidi(writeMidiTickTracks([{ events }])));
  assert.deepEqual(lyricLines(song.lyrics).map(words), ['Hello there', 'How are you', 'Fine', 'Good bye']);
});

test('the words travel into band arrangements', () => {
  const entry = SONGS.find((s) => s.id === 'jesusloves');
  const song = buildSong(parseMidi(songToMidi(entry)));
  const { song: sb, melody, lyrics } = songInBeats(song, 0);
  const arr = arrangeBand(sb, { chords: chordsFromChart(entry.chords), melody, lyrics });
  const back = buildSong(parseMidi(bandMidi(arr)));
  assert.equal(back.lyrics.length, song.lyrics.length);
  assert.equal(words(lyricLines(back.lyrics)[0]), 'Jesus loves me! this I know,');
  assert.ok(back.lyrics[0].time > song.lyrics[0].time, 'after the count-in');
});

test('lyrics in the full score (MusicXML) and back', () => {
  const entry = SONGS.find((s) => s.id === 'mary');
  const song = buildSong(parseMidi(songToMidi(entry)));
  const xml = scoreToMusicXML(songToScore(song));
  assert.ok(xml.includes('<lyric number="1"><syllabic>begin</syllabic><text>Ma</text></lyric>'));
  assert.ok(xml.includes('<syllabic>end</syllabic><text>ry</text>'));
  const back = buildSong(parseMidi(musicXmlToMidi(xml).bytes));
  assert.equal(lyricLines(back.lyrics, { gap: 100 }).map(words).join(' '), 'Mary had a little lamb, little lamb, little lamb, Mary had a little lamb, its fleece was white as snow.');
});
