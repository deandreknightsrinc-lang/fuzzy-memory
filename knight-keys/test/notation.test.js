import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { SONGS, songToMidi } from '../js/songs.js';
import { parseMidi, buildSong } from '../js/midi-file.js';
import { songToScore, scoreToMusicXML, musicXmlToMidi, parseXml, splitDuration, guessGrid, playOrder, unzipMxl, scoreFileText } from '../js/notation.js';

const sig = (s) => s.notes.map((n) => `${n.ch}:${n.note}@${s.beatAt(n.time).toFixed(2)}`).sort();

test('note values: lengths split into notes you can write', () => {
  assert.deepEqual(splitDuration(3).map((v) => [v.type, v.dots]), [['half', 1]]);
  assert.deepEqual(splitDuration(2.5).map((v) => v.type), ['half', 'eighth']);
  assert.deepEqual(splitDuration(1 / 3, 4, 1 / 3).map((v) => [v.type, v.triplet]), [['eighth', true]]);
  assert.equal(guessGrid([0, 0.25, 0.5, 0.75, 1]), 0.25);
  assert.equal(guessGrid([0, 0.333, 0.667, 1, 1.334, 1.667]), 1 / 3);
});

test('song -> full score -> MusicXML -> MIDI gives back the same notes', () => {
  for (const [id, level] of [['amazing', 'beginner'], ['jesusloves', 'advanced'], ['gospelvamp', 'advanced'], ['ballad68', 'intermediate']]) {
    const song = buildSong(parseMidi(songToMidi(SONGS.find((s) => s.id === id), { level })));
    const score = songToScore(song, { nameFor: (ch) => (ch === 9 ? 'Drums' : `Ch ${ch + 1}`) });
    assert.ok(score.parts.length >= 2, id);
    assert.equal(score.parts.find((p) => p.channel === 9)?.staves[0].clef, 'percussion');
    // Every bar adds up to the time signature on every staff.
    for (const p of score.parts) for (const st of p.staves) st.measures.forEach((m, i) => assert.ok(Math.abs(m.reduce((a, e) => a + e.len, 0) - score.measureQ) < 1e-6, `${id} ${p.name} bar ${i + 1} is full`));
    const xml = scoreToMusicXML(score);
    assert.ok(xml.startsWith('<?xml') && xml.includes('<score-partwise'));
    const back = musicXmlToMidi(xml);
    const s2 = buildSong(parseMidi(back.bytes));
    assert.deepEqual(sig(s2), sig(song), `${id}: same notes at the same beats`);
    assert.ok(Math.abs(s2.bpm - song.bpm) < 0.5);
    assert.deepEqual(s2.keySig, song.keySig);
    assert.deepEqual(back.parts.slice(-1), ['Drums']);
  }
});

test('the XML reader handles comments, entities, CDATA and self-closing tags', () => {
  const doc = parseXml('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><!-- hi --><a k="1 &amp; 2"><b/><c>R&amp;B &#233;<![CDATA[<raw>]]></c></a>');
  const a = doc.children[0];
  assert.equal(a.attrs.k, '1 & 2');
  assert.equal(a.children.length, 2);
  assert.equal(a.children[1].text, 'R&B é<raw>');
});

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Test Hymn</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Clarinet in Bb</part-name>
      <score-instrument id="P1-I1"><instrument-name>Clarinet</instrument-name></score-instrument>
      <midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>72</midi-program></midi-instrument></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time><transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>
      <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type><sound tempo="90"/></direction>
      <direction><direction-type><dynamics><p/></dynamics></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><tie type="start"/><lyric number="1"><text>A</text></lyric></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><tie type="stop"/></note>
    </measure>
    <measure number="2">
      <barline location="left"><repeat direction="forward"/></barline>
      <note><grace/><pitch><step>C</step><octave>5</octave></pitch><type>eighth</type></note>
      <note><pitch><step>E</step><alter>-1</alter><octave>5</octave></pitch><duration>6</duration><lyric><text>men</text></lyric></note>
    </measure>
    <measure number="3">
      <barline location="left"><ending number="1" type="start"/></barline>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>6</duration></note>
      <barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>
    </measure>
    <measure number="4">
      <barline location="left"><ending number="2" type="start"/></barline>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>6</duration></note>
      <barline location="right"><ending number="2" type="discontinue"/></barline>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>1</divisions><staves>2</staves></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>3</duration><staff>1</staff></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>3</duration><staff>1</staff></note>
      <backup><duration>3</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>2</duration><staff>2</staff></note>
      <note><rest/><duration>1</duration><staff>2</staff></note>
    </measure>
    <measure number="2"><note><rest/><duration>3</duration></note></measure>
    <measure number="3"><note><rest/><duration>3</duration></note></measure>
    <measure number="4"><note><rest/><duration>3</duration></note></measure>
  </part>
</score-partwise>`;

test('MusicXML -> MIDI: ties, transposing instruments, chords, two staves, repeats, endings, tempo, dynamics, lyrics', () => {
  const res = musicXmlToMidi(XML);
  assert.equal(res.title, 'Test Hymn');
  assert.deepEqual(res.parts, ['Clarinet in Bb', 'Piano']);
  assert.equal(res.measures, 5, 'bars 1, 2, 3, 2, 4: the repeat with its two endings');
  const song = buildSong(parseMidi(res.bytes));
  assert.ok(Math.abs(song.bpm - 90) < 0.01);
  assert.deepEqual(song.timeSig, { num: 3, den: 4 });
  assert.deepEqual(song.keySig, { sf: -1, minor: false });
  assert.equal(song.firstProgram[0], 71, 'clarinet');
  const clar = song.notes.filter((n) => n.ch === 0).map((n) => [n.note, +song.beatAt(n.time).toFixed(2), +(song.beatAt(n.time + n.dur) - song.beatAt(n.time)).toFixed(1)]);
  // Written D5 tied (3 beats) sounds C5 on a B-flat clarinet; then Eb (Db sounding), F, repeat Eb, G.
  assert.deepEqual(clar.map((c) => c[0]), [72, 73, 75, 73, 77]);
  assert.deepEqual(clar.map((c) => c[1]), [0, 3, 6, 9, 12]);
  assert.ok(clar[0][2] >= 2.9, 'the tie joins the two notes');
  assert.equal(song.notes.find((n) => n.ch === 0).vel, 50, 'p');
  const piano = song.notes.filter((n) => n.ch === 1).map((n) => n.note).sort();
  assert.deepEqual(piano, [48, 60, 64]);
});

test('repeat order with first and second endings', () => {
  const m = (inner) => parseXml(`<measure>${inner}</measure>`).children[0];
  const bars = [
    m(''),
    m('<barline><repeat direction="forward"/></barline>'),
    m('<barline><ending number="1" type="start"/></barline><barline><ending number="1" type="stop"/><repeat direction="backward"/></barline>'),
    m('<barline><ending number="2" type="start"/></barline><barline><ending number="2" type="discontinue"/></barline>'),
    m(''),
  ];
  assert.deepEqual(playOrder(bars), [0, 1, 2, 1, 3, 4]);
  assert.deepEqual(playOrder([m(''), m('<barline><repeat direction="backward" times="3"/></barline>')]), [0, 1, 0, 1, 0, 1]);
});

test('timewise scores and compressed .mxl files open too', async () => {
  const tw = `<score-timewise><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
    <measure number="1"><part id="P1"><attributes><divisions>1</divisions></attributes><note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration></note></part></measure></score-timewise>`;
  assert.equal(buildSong(parseMidi(musicXmlToMidi(tw).bytes)).notes[0].note, 69);

  // A tiny zip: META-INF/container.xml pointing at score.xml (deflated).
  const files = [
    ['META-INF/container.xml', '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>'],
    ['score.xml', XML],
  ];
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = Buffer.from(name);
    const data = deflateRawSync(Buffer.from(text));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(text.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(text.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt32LE(offset, 42);
    parts.push(local, nameBytes, data);
    central.push(cd, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  const zip = new Uint8Array(Buffer.concat([...parts, cdBuf, end]));
  assert.equal(await unzipMxl(zip), XML);
  assert.equal(await scoreFileText('hymn.mxl', zip), XML);
  assert.equal(await scoreFileText('hymn.musicxml', new TextEncoder().encode(XML)), XML);
});
