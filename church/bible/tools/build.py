#!/usr/bin/env python3
"""Build the Bible library (church/bible/) from public-domain sources.

Sources (all public domain), from the Scrollmapper projects on GitHub:
  https://github.com/scrollmapper/bible_databases             formats/json/<VER>.json
  https://github.com/scrollmapper/bible_databases_deuterocanonical
      sources/en/1-enoch, book-of-jubilees, book-of-jasher

Usage: build.py SRC_DIR   (SRC_DIR holds KJVA.json, BSB.json, ..., 1-enoch.json, ...)

Writes text/<version>/<BOOK>.json: [[chapter, first_verse, [verse texts...]], ...]
(a missing verse inside a chapter is ""), plus versions.json.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)

# Source book name -> our book id (see books.json).
NAMES = {
    'Genesis': 'Gen', 'Exodus': 'Exod', 'Leviticus': 'Lev', 'Numbers': 'Num', 'Deuteronomy': 'Deut',
    'Joshua': 'Josh', 'Judges': 'Judg', 'Ruth': 'Ruth', 'I Samuel': '1Sam', 'II Samuel': '2Sam',
    'I Kings': '1Kgs', 'II Kings': '2Kgs', 'I Chronicles': '1Chr', 'II Chronicles': '2Chr', 'Ezra': 'Ezra',
    'Nehemiah': 'Neh', 'Esther': 'Esth', 'Job': 'Job', 'Psalms': 'Ps', 'Proverbs': 'Prov',
    'Ecclesiastes': 'Eccl', 'Song of Solomon': 'Song', 'Isaiah': 'Isa', 'Jeremiah': 'Jer',
    'Lamentations': 'Lam', 'Ezekiel': 'Ezek', 'Daniel': 'Dan', 'Hosea': 'Hos', 'Joel': 'Joel',
    'Amos': 'Amos', 'Obadiah': 'Obad', 'Jonah': 'Jonah', 'Micah': 'Mic', 'Nahum': 'Nah',
    'Habakkuk': 'Hab', 'Zephaniah': 'Zeph', 'Haggai': 'Hag', 'Zechariah': 'Zech', 'Malachi': 'Mal',
    'I Esdras': '1Esd', 'II Esdras': '2Esd', 'Tobit': 'Tob', 'Judith': 'Jdt', 'Additions to Esther': 'AddEsth',
    'Wisdom': 'Wis', 'Sirach': 'Sir', 'Baruch': 'Bar', 'Prayer of Azariah': 'PrAzar', 'Susanna': 'Sus',
    'Bel and the Dragon': 'Bel', 'Prayer of Manasses': 'PrMan', 'I Maccabees': '1Macc', 'II Maccabees': '2Macc',
    'Additional Psalm': 'Ps151', 'Laodiceans': 'EpLao',
    'Matthew': 'Matt', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John', 'Acts': 'Acts', 'Romans': 'Rom',
    'I Corinthians': '1Cor', 'II Corinthians': '2Cor', 'Galatians': 'Gal', 'Ephesians': 'Eph',
    'Philippians': 'Phil', 'Colossians': 'Col', 'I Thessalonians': '1Thess', 'II Thessalonians': '2Thess',
    'I Timothy': '1Tim', 'II Timothy': '2Tim', 'Titus': 'Titus', 'Philemon': 'Phlm', 'Hebrews': 'Heb',
    'James': 'Jas', 'I Peter': '1Pet', 'II Peter': '2Pet', 'I John': '1John', 'II John': '2John',
    'III John': '3John', 'Jude': 'Jude', 'Revelation of John': 'Rev',
    'I Enoch': '1En', 'Jubilees': 'Jub', 'Jasher': 'Jasher',
}

VERSIONS = [
    # id, source file, name, short description
    ('kjv', 'KJVA.json', 'King James Version', 'KJV (1769 text) with the Apocrypha of the 1611 King James Bible'),
    ('bsb', 'BSB.json', 'Berean Standard Bible', 'Modern English (2022), dedicated to the public domain in 2023'),
    ('asv', 'ASV.json', 'American Standard Version', 'ASV (1901)'),
    ('ylt', 'YLT.json', "Young's Literal Translation", 'Word-for-word (1898)'),
    ('drc', 'DRC.json', 'Douay-Rheims (Challoner)', 'Catholic Bible in English (1752), with the deuterocanonical books'),
    ('geneva', 'Geneva1599.json', 'Geneva Bible (1599)', "The Pilgrims' Bible, in its original spelling"),
]

EXTRA = [
    # id, source file, name, description (one translation each)
    ('charles', '1-enoch.json', 'R. H. Charles (1917)', 'The Book of Enoch, translated by R. H. Charles (1917)'),
    ('charles-jub', 'book-of-jubilees.json', 'R. H. Charles (1902)', 'The Book of Jubilees, translated by R. H. Charles'),
    ('jasher-1840', 'book-of-jasher.json', 'Book of Jasher (1840)', 'The Book of Jasher, English translation published by M. M. Noah and A. S. Gould (1840)'),
]


SHELVES = [
    {'id': 'ot', 'name': 'Old Testament', 'about': 'In every Christian Bible (the Hebrew Bible).'},
    {'id': 'apocrypha', 'name': 'Apocrypha (1611 King James)', 'about': 'Printed between the Testaments in the 1611 King James Bible. Most are part of Catholic and Orthodox Bibles; Protestant churches read them for history and instruction, not as Scripture.'},
    {'id': 'nt', 'name': 'New Testament', 'about': 'In every Christian Bible.'},
    {'id': 'ethiopian', 'name': 'Ethiopian Bible', 'about': 'Part of the Bible of the Ethiopian and Eritrean Orthodox Tewahedo Churches. Enoch is quoted in Jude 1:14-15.'},
    {'id': 'historical', 'name': 'Historical writings', 'about': 'Not part of any church\'s Bible today. Read for history: they show what believers wrote and read in earlier times.'},
]

# id, name, shelf, other names people type (for references like "1 Sam 3:4")
CATALOG = [
    ('Gen', 'Genesis', 'ot', 'gen ge gn'), ('Exod', 'Exodus', 'ot', 'exo ex exod'), ('Lev', 'Leviticus', 'ot', 'lev le lv'),
    ('Num', 'Numbers', 'ot', 'num nu nm nb'), ('Deut', 'Deuteronomy', 'ot', 'deut de dt'), ('Josh', 'Joshua', 'ot', 'josh jos jsh'),
    ('Judg', 'Judges', 'ot', 'judg jdg jg jdgs'), ('Ruth', 'Ruth', 'ot', 'rth ru'), ('1Sam', '1 Samuel', 'ot', '1sam 1sa 1s isamuel 1kingdoms'),
    ('2Sam', '2 Samuel', 'ot', '2sam 2sa 2s iisamuel 2kingdoms'), ('1Kgs', '1 Kings', 'ot', '1kgs 1ki 1k ikings 3kingdoms'), ('2Kgs', '2 Kings', 'ot', '2kgs 2ki 2k iikings 4kingdoms'),
    ('1Chr', '1 Chronicles', 'ot', '1chr 1ch ichronicles 1paralipomenon'), ('2Chr', '2 Chronicles', 'ot', '2chr 2ch iichronicles 2paralipomenon'), ('Ezra', 'Ezra', 'ot', 'ezr'),
    ('Neh', 'Nehemiah', 'ot', 'neh ne'), ('Esth', 'Esther', 'ot', 'esth est es'), ('Job', 'Job', 'ot', 'jb'),
    ('Ps', 'Psalms', 'ot', 'ps psa psalm pss psm'), ('Prov', 'Proverbs', 'ot', 'prov pr prv pro'), ('Eccl', 'Ecclesiastes', 'ot', 'eccl ecc ec qoh qoheleth'),
    ('Song', 'Song of Solomon', 'ot', 'song sos so canticles songofsongs cant'), ('Isa', 'Isaiah', 'ot', 'isa is'), ('Jer', 'Jeremiah', 'ot', 'jer je jr'),
    ('Lam', 'Lamentations', 'ot', 'lam la'), ('Ezek', 'Ezekiel', 'ot', 'ezek eze ezk'), ('Dan', 'Daniel', 'ot', 'dan da dn'),
    ('Hos', 'Hosea', 'ot', 'hos ho'), ('Joel', 'Joel', 'ot', 'jl'), ('Amos', 'Amos', 'ot', 'am'), ('Obad', 'Obadiah', 'ot', 'obad ob'),
    ('Jonah', 'Jonah', 'ot', 'jon jnh'), ('Mic', 'Micah', 'ot', 'mic mc'), ('Nah', 'Nahum', 'ot', 'nah na'), ('Hab', 'Habakkuk', 'ot', 'hab hb'),
    ('Zeph', 'Zephaniah', 'ot', 'zeph zep zp'), ('Hag', 'Haggai', 'ot', 'hag hg'), ('Zech', 'Zechariah', 'ot', 'zech zec zc'), ('Mal', 'Malachi', 'ot', 'mal ml'),
    ('1Esd', '1 Esdras', 'apocrypha', '1esd 1es iesdras'), ('2Esd', '2 Esdras', 'apocrypha', '2esd 2es iiesdras 4ezra'), ('Tob', 'Tobit', 'apocrypha', 'tob tb tobias'),
    ('Jdt', 'Judith', 'apocrypha', 'jdt jdth'), ('AddEsth', 'Additions to Esther', 'apocrypha', 'addesth adde restofesther greekesther'), ('Wis', 'Wisdom of Solomon', 'apocrypha', 'wis wisdom'),
    ('Sir', 'Sirach (Ecclesiasticus)', 'apocrypha', 'sir sirach ecclesiasticus ecclus'), ('Bar', 'Baruch', 'apocrypha', 'bar'), ('PrAzar', 'Song of the Three Children', 'apocrypha', 'prazar azariah songofthree'),
    ('Sus', 'Susanna', 'apocrypha', 'sus'), ('Bel', 'Bel and the Dragon', 'apocrypha', 'bel'), ('PrMan', 'Prayer of Manasseh', 'apocrypha', 'prman manasses manasseh'),
    ('1Macc', '1 Maccabees', 'apocrypha', '1macc 1mac 1ma imaccabees'), ('2Macc', '2 Maccabees', 'apocrypha', '2macc 2mac 2ma iimaccabees'),
    ('Matt', 'Matthew', 'nt', 'matt mt mat'), ('Mark', 'Mark', 'nt', 'mk mrk mr'), ('Luke', 'Luke', 'nt', 'lk luk'), ('John', 'John', 'nt', 'jn jhn joh'),
    ('Acts', 'Acts', 'nt', 'act ac'), ('Rom', 'Romans', 'nt', 'rom ro rm'), ('1Cor', '1 Corinthians', 'nt', '1cor 1co icorinthians'), ('2Cor', '2 Corinthians', 'nt', '2cor 2co iicorinthians'),
    ('Gal', 'Galatians', 'nt', 'gal ga'), ('Eph', 'Ephesians', 'nt', 'eph ephes'), ('Phil', 'Philippians', 'nt', 'phil php pp'), ('Col', 'Colossians', 'nt', 'col'),
    ('1Thess', '1 Thessalonians', 'nt', '1thess 1th ithessalonians'), ('2Thess', '2 Thessalonians', 'nt', '2thess 2th iithessalonians'), ('1Tim', '1 Timothy', 'nt', '1tim 1ti itimothy'),
    ('2Tim', '2 Timothy', 'nt', '2tim 2ti iitimothy'), ('Titus', 'Titus', 'nt', 'tit ti'), ('Phlm', 'Philemon', 'nt', 'phlm phm philem'), ('Heb', 'Hebrews', 'nt', 'heb'),
    ('Jas', 'James', 'nt', 'jas jm'), ('1Pet', '1 Peter', 'nt', '1pet 1pe 1pt ipeter'), ('2Pet', '2 Peter', 'nt', '2pet 2pe 2pt iipeter'), ('1John', '1 John', 'nt', '1john 1jn 1jo ijohn'),
    ('2John', '2 John', 'nt', '2john 2jn iijohn'), ('3John', '3 John', 'nt', '3john 3jn iiijohn'), ('Jude', 'Jude', 'nt', 'jud jd'), ('Rev', 'Revelation', 'nt', 'rev re revelations apocalypse'),
    ('1En', 'Enoch (1 Enoch)', 'ethiopian', '1en enoch 1enoch'), ('Jub', 'Jubilees', 'ethiopian', 'jub jubilees'),
    ('Jasher', 'Book of Jasher', 'historical', 'jasher jashar'),
]


def write_books(versions_meta):
    have = {}
    for v in versions_meta:
        for bid in v['books']:
            have.setdefault(bid, []).append(v['id'])
    books = []
    for bid, name, shelf, aliases in CATALOG:
        chapters = 0
        for vid in have.get(bid, []):
            with open(os.path.join(OUT, 'text', vid, f'{bid}.json'), encoding='utf-8') as f:
                chapters = max(chapters, max(c[0] for c in json.load(f)))
        if not chapters:
            raise SystemExit(f'no text for {bid}')
        books.append({'id': bid, 'name': name, 'shelf': shelf, 'chapters': chapters, 'versions': have[bid], 'aliases': aliases.split()})
    with open(os.path.join(OUT, 'books.json'), 'w', encoding='utf-8') as f:
        json.dump({'shelves': SHELVES, 'books': books}, f, ensure_ascii=False, indent=1)


def clean(version, text):
    t = re.sub(r'\s+', ' ', text or '').strip()
    if t in ('…', '...'):
        return ''
    if version == 'ylt':
        t = t.replace('`', "'")  # YLT opens quotes with a backtick
    if version == 'asv':
        t = re.sub(r'\[\s*Selah\b', 'Selah', t)
    return t


def convert(version, data, only=None):
    books = {}
    for b in data['books']:
        bid = NAMES.get(b['name'])
        if not bid:
            raise SystemExit(f'unknown book name {b["name"]!r} in {version}')
        if only and bid not in only:
            continue
        chapters = []
        for c in b['chapters']:
            verses = {int(v['verse']): clean(version, v['text']) for v in c['verses']}
            verses = {n: t for n, t in verses.items() if t}
            if not verses:
                continue
            first, last = min(verses), max(verses)
            chapters.append([int(c['chapter']), first, [verses.get(n, '') for n in range(first, last + 1)]])
        if chapters:
            books[bid] = chapters
    return books


def write(version, books):
    d = os.path.join(OUT, 'text', version)
    os.makedirs(d, exist_ok=True)
    for bid, chapters in books.items():
        with open(os.path.join(d, f'{bid}.json'), 'w', encoding='utf-8') as f:
            json.dump(chapters, f, ensure_ascii=False, separators=(',', ':'))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '.'
    meta = []
    for vid, fname, name, desc in VERSIONS + EXTRA:
        data = json.load(open(os.path.join(src, fname), encoding='utf-8'))
        books = convert(vid, data)
        write(vid, books)
        verses = sum(len(c[2]) for ch in books.values() for c in ch)
        meta.append({'id': vid, 'name': name, 'about': desc, 'license': 'Public domain', 'extra': (vid, fname, name, desc) in EXTRA, 'books': sorted(books)})
        print(f'{vid}: {len(books)} books, {verses} verses')
    with open(os.path.join(OUT, 'versions.json'), 'w', encoding='utf-8') as f:
        json.dump({'versions': meta}, f, ensure_ascii=False, indent=1)
    write_books(meta)


if __name__ == '__main__':
    main()
