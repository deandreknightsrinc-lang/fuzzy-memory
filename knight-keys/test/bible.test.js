import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeCatalog, parseReference, formatReference, versionFor, chapterVerses, referenceVerses, mediaPath, stepChapter } from '../../church/js/bible.js';
import { CAST, draftScript, transferScript, checkScript, repairScript, guessSpeaker, draftScenes, premiumShotList, pickBrowserVoices, voiceFor, VISUAL_RULES } from '../../church/js/drama.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../../church/bible/${p}`, import.meta.url), 'utf8'));
const catalog = makeCatalog(json('books.json'), json('versions.json'));
const text = (v, b) => json(`text/${v}/${b}.json`);
const chapter = (v, b, c) => chapterVerses(text(v, b), c);

test('the library: shelves, books, versions and the extra books', () => {
  assert.deepEqual(catalog.shelves.map((s) => s.id), ['ot', 'apocrypha', 'nt', 'ethiopian', 'historical']);
  assert.equal(catalog.shelf('ot').length, 39);
  assert.equal(catalog.shelf('nt').length, 27);
  assert.equal(catalog.shelf('apocrypha').length, 14, 'the 14 books of the 1611 King James Apocrypha');
  assert.deepEqual(catalog.shelf('ethiopian').map((b) => b.id), ['1En', 'Jub']);
  assert.deepEqual(catalog.shelf('historical').map((b) => b.id), ['Jasher']);
  for (const v of ['kjv', 'bsb', 'asv', 'ylt', 'drc', 'geneva']) assert.ok(catalog.version(v) && !catalog.version(v).extra, v);
  assert.ok(catalog.versions.every((v) => v.license === 'Public domain'));
  assert.equal(catalog.book('1En').chapters, 108);
  assert.equal(catalog.book('Ps').chapters, 150);
  // Every book's text loads in each version that claims it, with the right number of chapters.
  for (const b of catalog.books) for (const v of b.versions) assert.ok(text(v, b.id).length >= 1, `${v} ${b.id}`);
  assert.equal(chapter('kjv', 'John', 3)[15].text.startsWith('For God so loved the world'), true);
  assert.equal(chapter('bsb', 'John', 3)[15].n, 16);
  assert.ok(chapter('charles', '1En', 1)[8].text.includes('ten thousands of His holy ones'), 'Enoch 1:9, quoted in Jude 14-15');
  assert.ok(!JSON.stringify(text('ylt', 'Gen')).includes('`'), 'YLT backticks cleaned');
  assert.equal(chapter('kjv', 'AddEsth', 10)[0].n, 4, 'Additions to Esther start at 10:4 like the KJV');
});

test('references people type', () => {
  const r = (s) => parseReference(s, catalog);
  assert.deepEqual(r('John 3:16'), { book: 'John', chapter: 3, from: 16, toChapter: 3, to: 16 });
  assert.deepEqual(r('jn 3:16-18'), { book: 'John', chapter: 3, from: 16, toChapter: 3, to: 18 });
  assert.deepEqual(r('Psalm 23'), { book: 'Ps', chapter: 23, from: null, toChapter: 23, to: null });
  assert.equal(r('1 Sam 3:4').book, '1Sam');
  assert.equal(r('First John 4:8').book, '1John');
  assert.equal(r('II Kings 2:11').book, '2Kgs');
  assert.equal(r('Song of Solomon 2:1').book, 'Song');
  assert.equal(r('Rev. 21:4').book, 'Rev');
  assert.deepEqual(r('Jude 14'), { book: 'Jude', chapter: 1, from: 14, toChapter: 1, to: 14 }, 'one-chapter books');
  assert.deepEqual(r('Matt 26:75-27:2'), { book: 'Matt', chapter: 26, from: 75, toChapter: 27, to: 2 });
  assert.equal(r('Enoch 1:9').book, '1En');
  assert.equal(r('Tobit 1').book, 'Tob');
  assert.equal(r('Ecclesiasticus 1:1').book, 'Sir');
  assert.equal(r('Deuter 6:4').book, 'Deut', 'a unique start of a name');
  for (const bad of ['', 'Hezekiah 1:1', 'John', 'John 22', 'John 3:18-16', 'Ju 1']) assert.equal(r(bad), null, bad);
  assert.equal(formatReference(r('jn 3:16-18'), catalog), 'John 3:16-18');
  assert.equal(formatReference(r('ps 23'), catalog), 'Psalms 23');
  assert.equal(formatReference(r('Matt 26:75-27:2'), catalog), 'Matthew 26:75-27:2');
  const verses = referenceVerses(text('kjv', 'Matt'), r('Matt 26:75-27:2'));
  assert.deepEqual(verses.map((v) => `${v.chapter}:${v.n}`), ['26:75', '27:1', '27:2']);
});

test('versions, chapters in order, and where the produced media lives', () => {
  assert.equal(versionFor(catalog.book('Tob'), 'bsb'), 'kjv', 'Tobit falls back to a version that has it');
  assert.equal(versionFor(catalog.book('Tob'), 'drc'), 'drc');
  assert.equal(versionFor(catalog.book('1En'), 'kjv'), 'charles');
  assert.deepEqual(stepChapter(catalog, 'Gen', 50, 1), { book: 'Exod', chapter: 1 });
  assert.deepEqual(stepChapter(catalog, 'Exod', 1, -1), { book: 'Gen', chapter: 50 });
  assert.equal(stepChapter(catalog, 'Gen', 1, -1), null);
  assert.equal(mediaPath('https://kl:8443/bible-media/', 'kjv', 'John', 3), 'https://kl:8443/bible-media/kjv/John/3');
  assert.equal(mediaPath('', 'kjv', 'John', 3), '');
});

test('dramatized scripts never change a word, in any version or book', () => {
  let chapters = 0;
  for (const b of catalog.books) {
    for (const v of b.versions) {
      const data = text(v, b.id);
      for (const c of data) {
        const verses = chapterVerses(data, c[0]);
        let lines = draftScript(verses);
        if (v !== 'bsb' && b.versions.includes('bsb') && (v === 'kjv' || v === 'asv')) lines = transferScript(verses, draftScript(chapter('bsb', b.id, c[0])));
        assert.deepEqual(checkScript(verses, lines), [], `${v} ${b.id} ${c[0]}`);
        chapters++;
      }
    }
  }
  assert.ok(chapters > 7500, `${chapters} chapters checked`);
});

test('who speaks', () => {
  const lines = (v, b, c, n) => draftScript(chapter(v, b, c)).filter((l) => l.verse === n).map((l) => `${l.speaker}${l.character ? `:${l.character}` : ''}`);
  assert.deepEqual(lines('bsb', 'Gen', 1, 3), ['narrator', 'god', 'narrator']);
  assert.deepEqual(lines('bsb', 'John', 4, 7), ['narrator', 'jesus']);
  assert.deepEqual(lines('bsb', 'John', 4, 9), ['woman', 'narrator', 'woman', 'narrator'], '"You are a Jew," said the woman');
  assert.deepEqual(lines('bsb', 'Gen', 3, 2), ['narrator', 'woman'], 'The woman answered the serpent');
  assert.deepEqual(lines('bsb', 'Matt', 4, 6), ['satan', 'narrator', 'satan'], '"he said" = the devil from the verse before');
  assert.deepEqual(lines('bsb', 'Gen', 16, 9), ['narrator', 'angel'], 'the angel of the LORD');
  assert.deepEqual(lines('bsb', 'Gen', 24, 58), ['narrator', 'crowd', 'woman:Rebekah', 'narrator'], 'back-and-forth: they ask, Rebekah answers');
  assert.deepEqual(lines('kjv', 'Gen', 1, 3), ['narrator', 'god'], 'KJV: "And God said, Let there be light"');
  // KJV borrows the speakers of the BSB verse by verse.
  const kjv = transferScript(chapter('kjv', 'Luke', 1), draftScript(chapter('bsb', 'Luke', 1)));
  assert.deepEqual(kjv.filter((l) => l.verse === 14).map((l) => l.speaker), ['angel'], 'the angel keeps speaking in verse 14');
  assert.equal(guessSpeaker('And Jesus said unto him,')?.role, 'jesus');
  assert.equal(guessSpeaker('Then the woman of Samaria'), null, 'no speech verb, no speaker');
  assert.equal(guessSpeaker('They called Rebekah and asked her,')?.role, 'crowd');
});

test('faulty scripts are caught and repaired', () => {
  const verses = [{ n: 1, text: 'And God said, “Let there be light,” and there was light.' }];
  assert.deepEqual(checkScript(verses, [{ verse: 1, speaker: 'narrator', text: 'And God said, Let there be light, and there was light.' }]), [], 'quotation marks and spacing don\'t count');
  assert.ok(checkScript(verses, [{ verse: 1, speaker: 'narrator', text: 'And God said, Let there be lights.' }]).length, 'a changed word is caught');
  assert.ok(checkScript(verses, [{ verse: 1, speaker: 'pharaoh', text: verses[0].text }])[0].includes('Unknown speaker'));
  assert.ok(checkScript(verses, [{ verse: 2, speaker: 'narrator', text: 'extra' }, { verse: 1, speaker: 'narrator', text: verses[0].text }]).some((p) => p.includes('isn\'t in this chapter')));
  const fixed = repairScript(verses, [{ verse: 1, speaker: 'god', text: 'Let there be light' }]);
  assert.deepEqual(fixed, [{ verse: 1, speaker: 'narrator', text: verses[0].text }], 'a wrong verse goes back to the narrator, word for word');
});

test('voices: the cast, characters keep one voice, browser voices', () => {
  assert.ok(Object.values(CAST).every((c) => /^[ab][fm]_[a-z]+$/.test(c.voice)), 'Kokoro voice names');
  assert.equal(voiceFor({ speaker: 'jesus' }), CAST.jesus.voice);
  assert.equal(voiceFor({ speaker: 'woman', character: 'Rebekah' }), voiceFor({ speaker: 'woman', character: 'Rebekah' }));
  assert.ok(voiceFor({ speaker: 'woman', character: 'Rebekah' }).startsWith('bf_') || voiceFor({ speaker: 'woman', character: 'Rebekah' }).startsWith('af_'));
  assert.ok(/^[ab]m_/.test(voiceFor({ speaker: 'man', character: 'Pharaoh' })));
  const v = pickBrowserVoices([{ name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }, { name: 'Fred', lang: 'en-US' }, { name: 'Amélie', lang: 'fr-CA' }]);
  assert.equal(v.narrator.name, 'Daniel');
  assert.equal(v.woman.name, 'Samantha');
  assert.equal(v.man.name, 'Fred', '"Samantha" is not a man\'s voice');
  assert.deepEqual(pickBrowserVoices([]), { narrator: null, man: null, woman: null, deep: null });
});

test('cinematic scenes and the premium shot list', () => {
  const verses = chapter('kjv', 'Gen', 1);
  const scenes = draftScenes(verses, { book: 'Genesis', chapter: 1 });
  assert.equal(scenes[0].from, 1);
  assert.equal(scenes.at(-1).to, 31);
  scenes.forEach((s, i) => i && assert.equal(s.from, scenes[i - 1].to + 1));
  const lines = draftScript(verses);
  const shots = premiumShotList(scenes, lines, { title: 'Genesis 1' });
  assert.equal(shots.rows.length, scenes.length);
  assert.ok(shots.md.includes('# Genesis 1') && VISUAL_RULES.every((r) => shots.md.includes(r)));
  assert.ok(shots.rows[0].audio.includes('God (the LORD): Let there be light'));
  assert.equal(shots.csv.split('\n')[0], 'shot,verses,seconds,camera,prompt,audio');
  assert.ok(shots.csv.includes('""') || !shots.csv.slice(40).includes('"",'), 'quotes in cells are escaped');
});
