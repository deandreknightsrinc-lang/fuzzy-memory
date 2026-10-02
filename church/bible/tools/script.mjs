#!/usr/bin/env node
// The draft script and scenes for a chapter, as JSON (used by the AI Studio's
// kl-bible on kl-oracle, so the website and the studio dramatize the same way).
//   node script.mjs VERSION BOOK CHAPTER  ->  { verses, lines, scenes }
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeCatalog, chapterVerses, versionFor } from '../../js/bible.js';
import { draftScript, transferScript, repairScript, draftScenes, voiceFor, CAST, MALE_VOICES, FEMALE_VOICES } from '../../js/drama.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const [version, bookId, chapterArg] = process.argv.slice(2);
const catalog = makeCatalog(json('books.json'), json('versions.json'));
const book = catalog.book(bookId) || catalog.find(bookId || '');
if (!book || !chapterArg) {
  console.error('usage: script.mjs VERSION BOOK CHAPTER   (e.g. kjv John 3)');
  process.exit(2);
}
const chapter = +chapterArg;
const v = versionFor(book, version);
const verses = chapterVerses(json(`text/${v}/${book.id}.json`), chapter);
if (!verses.length) {
  console.error(`${book.name} ${chapter} isn't in ${v}`);
  process.exit(1);
}
let lines = draftScript(verses);
if (!verses.some((x) => /[“”]/.test(x.text)) && book.versions.includes('bsb') && v !== 'bsb') {
  lines = transferScript(verses, draftScript(chapterVerses(json(`text/bsb/${book.id}.json`), chapter)));
}
lines = repairScript(verses, lines).map((l) => ({ ...l, voice: voiceFor(l) }));
const scenes = draftScenes(verses, { book: book.name, chapter });
process.stdout.write(JSON.stringify({ version: v, book: book.id, bookName: book.name, chapter, verses, lines, scenes, cast: CAST, voicePools: { man: MALE_VOICES, woman: FEMALE_VOICES } }));
