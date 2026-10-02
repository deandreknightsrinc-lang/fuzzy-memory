// The Bible library: books, versions and chapters (church/bible/), references
// like "John 3:16-18" or "1 Sam 3", and where a chapter's produced audio and
// video live. Pure functions, so the church app, the Virtual Church and the
// tests share them.

export const DEFAULT_VERSION = 'kjv';

/** books.json -> a catalog with lookups. */
export function makeCatalog(booksJson, versionsJson) {
  const books = booksJson.books.map((b, i) => ({ ...b, order: i }));
  const byId = new Map(books.map((b) => [b.id, b]));
  const names = new Map();
  const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const b of books) for (const n of [b.id, b.name, ...(b.aliases || [])]) names.set(key(n), b);
  // "First John", "II Kings", "1st Samuel" -> "1john", "2kings", "1samuel"
  const normal = (s) => key(String(s).replace(/^\s*(i{1,3}|first|second|third|1st|2nd|3rd)\b\s*/i, (m) => ({ i: '1', ii: '2', iii: '3', first: '1', second: '2', third: '3', '1st': '1', '2nd': '2', '3rd': '3' })[m.trim().toLowerCase()]));
  const versions = (versionsJson?.versions || []).map((v) => ({ ...v }));
  return {
    shelves: booksJson.shelves,
    books,
    versions,
    book: (id) => byId.get(id) || null,
    find(name) {
      const k = normal(name);
      if (names.has(k)) return names.get(k);
      // A unique beginning: "Deuter" -> Deuteronomy
      const hits = books.filter((b) => key(b.name).startsWith(k) || normal(b.name).startsWith(k));
      return k.length >= 3 && hits.length === 1 ? hits[0] : null;
    },
    version: (id) => versions.find((v) => v.id === id) || null,
    shelf: (id) => books.filter((b) => b.shelf === id),
  };
}

/**
 * "John 3:16", "John 3:16-18", "John 3", "1 Sam 3:4-4:2", "Psalm 23", "Jude 14"
 * -> { book, chapter, from, toChapter, to } (from/to null = the whole chapter).
 */
export function parseReference(text, catalog) {
  const m = /^\s*((?:[1-3]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*[a-z][a-z .]*?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+)(?:\s*[:.]\s*(\d+))?)?)?\s*$/i.exec(String(text || ''));
  if (!m) return null;
  const book = catalog.find(m[1]);
  if (!book) return null;
  let chapter = +m[2];
  let from = m[3] ? +m[3] : null;
  let toChapter = chapter;
  let to = from;
  if (m[4]) {
    if (m[5]) {
      toChapter = +m[4];
      to = +m[5];
    } else to = +m[4];
  }
  // One-chapter books: "Jude 14" means verse 14.
  if (book.chapters === 1 && !m[3] && chapter > 1) {
    from = to = chapter;
    chapter = toChapter = 1;
  }
  if (chapter < 1 || chapter > book.chapters || (to !== null && (toChapter < chapter || (toChapter === chapter && to < from)))) return null;
  return { book: book.id, chapter, from, toChapter, to };
}

/** A reference back to text: "John 3:16-18". */
export function formatReference(ref, catalog) {
  const b = catalog.book(ref.book);
  if (!b) return '';
  if (ref.from === null || ref.from === undefined) return `${b.name} ${ref.chapter}`;
  if (ref.toChapter && ref.toChapter !== ref.chapter) return `${b.name} ${ref.chapter}:${ref.from}-${ref.toChapter}:${ref.to}`;
  return `${b.name} ${ref.chapter}:${ref.from}${ref.to && ref.to !== ref.from ? `-${ref.to}` : ''}`;
}

/** The version to read a book in: the one asked for if it has the book, else the first that does. */
export function versionFor(book, wanted) {
  if (!book) return null;
  return book.versions.includes(wanted) ? wanted : book.versions[0];
}

/** One book file ([[chapter, firstVerse, [texts]]]) -> the verses of a chapter: [{ n, text }]. */
export function chapterVerses(bookData, chapter) {
  const c = (bookData || []).find((x) => x[0] === chapter);
  if (!c) return [];
  return c[2].map((text, i) => ({ n: c[1] + i, text })).filter((v) => v.text);
}

/** The verses a reference covers, from loaded book data. */
export function referenceVerses(bookData, ref) {
  const out = [];
  for (let ch = ref.chapter; ch <= (ref.toChapter || ref.chapter); ch++) {
    for (const v of chapterVerses(bookData, ch)) {
      if (ref.from !== null && ref.from !== undefined) {
        if (ch === ref.chapter && v.n < ref.from) continue;
        if (ch === (ref.toChapter || ref.chapter) && v.n > ref.to) continue;
      }
      out.push({ chapter: ch, ...v });
    }
  }
  return out;
}

/** The text file for a book in a version (relative to church/). */
export const textPath = (version, book) => `bible/text/${version}/${book}.json`;

/** Where a chapter's produced audio/video/script lives on the media server. */
export function mediaPath(base, version, book, chapter) {
  if (!base) return '';
  return `${base.replace(/\/+$/, '')}/${version}/${book}/${chapter}`;
}

/** Previous/next chapter across books on the same shelf order (null at the ends). */
export function stepChapter(catalog, bookId, chapter, dir) {
  const b = catalog.book(bookId);
  if (!b) return null;
  const c = chapter + dir;
  if (c >= 1 && c <= b.chapters) return { book: b.id, chapter: c };
  const next = catalog.books[b.order + dir];
  if (!next) return null;
  return { book: next.id, chapter: dir > 0 ? 1 : next.chapters };
}
