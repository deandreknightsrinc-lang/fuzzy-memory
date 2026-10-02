# The Bible library

The text behind the church platform's Bible (`church/bible.html`): read it in many
versions, listen to the dramatized audio Bible, and watch the cinematic Bible.

## Versions (all public domain)

| id | Version | Notes |
|---|---|---|
| `kjv` | King James Version | 1769 text, with the 14 books of the 1611 Apocrypha |
| `bsb` | Berean Standard Bible | Modern English (2022), dedicated to the public domain in 2023 |
| `asv` | American Standard Version (1901) | |
| `ylt` | Young's Literal Translation (1898) | Word for word |
| `drc` | Douay-Rheims, Challoner revision (1752) | Catholic, with the deuterocanonical books (Esther and Daniel include their Greek parts) |
| `geneva` | Geneva Bible (1599) | The Pilgrims' Bible, original spelling |

Extra books, each in its one public-domain translation:

| Book | Translation | Shelf |
|---|---|---|
| 1 Enoch | R. H. Charles (1917) | Ethiopian Bible |
| Jubilees | R. H. Charles | Ethiopian Bible |
| Book of Jasher | English edition of 1840 (M. M. Noah and A. S. Gould, New York) | Historical writings |

The King James Version is public domain everywhere except the United Kingdom, where
the Crown's letters patent still apply to printing it.

## Shelves

Every book sits on a shelf that says which churches read it as Scripture
(`books.json`): Old Testament, Apocrypha (1611 King James), New Testament, Ethiopian
Bible, and Historical writings (in no church's Bible today). The app shows this note
whenever someone opens a book outside the Old and New Testaments.

## Files

- `books.json`: shelves and books (id, name, shelf, chapters, versions that have it, other names for references)
- `versions.json`: the versions
- `text/<version>/<book>.json`: `[[chapter, first_verse, [verse texts]], ...]`
- `tools/build.py`: rebuilds all of the above from the public-domain sources:
  `git clone https://github.com/scrollmapper/bible_databases` and
  `https://github.com/scrollmapper/bible_databases_deuterocanonical`, put `formats/json/<VER>.json`
  and `sources/en/{1-enoch,book-of-jubilees,book-of-jasher}/*.json` in one folder, then
  `python3 tools/build.py that-folder`
- `tools/script.mjs`: the dramatized script and scenes of a chapter as JSON (used by kl-bible on kl-oracle)

## Adding a licensed version (NKJV, NIV, ESV, NLT, ...)

Only after the publisher grants permission in writing (see `LICENSING.md`). Then
add it to `VERSIONS` in `tools/build.py` with its license and the publisher's required
copyright notice as `about`, rebuild, and the app picks it up.
