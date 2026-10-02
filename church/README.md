# Church platform (white label)

A free church platform from **BAC Ministries**. BAC Ministries is the flagship
church; any church can have the same platform under its own name and colors:

- **Home page** (`index.html`): service times and directions, online church (live
  link, latest message embedded, past messages), the music academy (free piano,
  voice, reading, drums, guitar, bass and Worship Team Training with the Knight
  Lyfe AI teachers), band and choir rehearsal, kids, about and pastor, events,
  prayer requests, contact and giving. Sections only show when filled in.
- **Knight Keys for the church**: every link opens Knight Keys as
  `knight-keys/?church=<id>#lessons=piano` (also `#band`, `#church`, `#ask`,
  `#puppet`, `#lyrics`, `#vocal`): the church's name is shown, and new Virtual
  Church services start with its name, colors, logo and giving link.
- **Setup** (`setup.html`): a form with a live preview (desktop and phone). It
  makes the church's `church.json`, opens it on this device to try, and explains
  the two ways to launch.

## The Bible (`bible.html`)

Read, listen and watch, in six public-domain versions (King James with the 1611
Apocrypha, Berean Standard Bible, ASV, Young's Literal, Douay-Rheims, Geneva 1599)
plus Enoch and Jubilees (Ethiopian Bible) and the Book of Jasher (historical
writings), each shelf labeled with which churches read it (see `bible/README.md`).

- **Listen**: the produced dramatized audio Bible when the church has it (made by
  `kl-bible` in the AI Studio on kl-oracle; set the church's *Audio and video Bible
  server*), with each verse lighting up as it's read. Until a chapter is produced,
  it's read with the device's voices, still as a cast (narrator, men's and women's
  voices, a deeper voice for God). "Keep going" plays on into the next chapter.
- **Watch**: the produced cinematic video, or a full-screen story mode (the verse,
  who is speaking, and the scene picture or church colors slowly moving).
- **Compare** two versions side by side, **go to** any reference ("1 Sam 3:4-6",
  "Enoch 1:9"), and pick books and chapters from the shelves.
- **🎞 Production** (for the media team): who reads each line (only speakers can be
  changed, never the words), the scenes, the script for kl-oracle, and a shot list
  for Runway, Kling, Veo or Sora.

The words are never changed: a script counts only if its lines put back together
are exactly the verses (`checkScript`); the tests check every chapter of every
version. Modern versions (NKJV, NIV, ESV, ...) need the publisher's permission:
`bible/LICENSING.md` has the letter.

## One church = one file

`churches/<id>.json` (format `knight-church`, made by the setup). `churches/index.json`
lists the network and names the home church (`"home"`), which is what `church/`
shows with no address. Others are at `church/?c=<id>`; `church/?c=local` shows the
church saved on this device by the setup.

## Launching a church

1. **Join the BAC Ministries network (easiest).** The church sends its
   `church.json`; BAC adds it to `churches/` and `churches/index.json`. Its page is
   `…/church/?c=<id>` and it's listed on BAC's page under the church network.
2. **Run it yourself (free).** Fork this repository, add the file, set `"home"`
   in `churches/index.json` to the church's id, and turn on GitHub Pages
   (Settings → Pages → GitHub Actions). The site is
   `https://<account>.github.io/<repo>/church/`.

Partner churches show "Powered by BAC Ministries · Get a free church platform" at
the bottom (they can turn it off), so other small churches find the platform.

## BAC Ministries

`churches/bac-ministries.json`: edit it in the setup ("Edit BAC Ministries"),
download, and replace the file. Fill in the service times, address, live and
giving links, email (people who want to join the network are sent to it), pastor,
about, logo and social links.

## Safety

Church files come from many churches, so the page escapes every value and only
allows web, email and phone links (`safeUrl`); videos embed from YouTube
(youtube-nocookie), Vimeo or a direct video file. Tests:
`knight-keys/test/church-platform.test.js`.
