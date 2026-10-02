# Knight Keys

A browser-based MIDI learning studio, inspired by tools like MIDIculous. Plug in a keyboard, or open MIDI, audio and video lessons, and see every note, chord, inversion and pedal move as it plays.

Plain HTML, CSS and JavaScript modules. No build step and no dependencies.

## Run it

ES modules need a web server (opening `index.html` straight from disk won't work):

```bash
cd knight-keys
python3 -m http.server 5173      # or: npm start
# open http://localhost:5173
```

Use **Chrome, Edge or Opera** to connect a MIDI keyboard over Web MIDI. Firefox works after you allow MIDI for the site. Safari has no Web MIDI, but everything else works there with the mouse or computer keys.

It's published with GitHub Pages by `.github/workflows/pages.yml` on every push to `main`, at `https://deandreknightsrinc-lang.github.io/fuzzy-memory/knight-keys/`.

## Features

| Area | What it does |
| --- | --- |
| **Keyboard** | 25 to 88 keys, vector or realistic style, resizable. Shows C markers, note names or solfège on lit keys. Click or touch to play. |
| **Chords** | Names the chord live (triads, 7ths, 9/11/13, altered, sus, slash chords) and says which inversion it is. Also shows the note names, solfège and a strip of recent chords. |
| **Score** | Grand staff with the key signature. Accidentals and naturals are spelled correctly for the key. |
| **Drums & grooves** | 16 drum pads you can tap; they also light up for MIDI file drums and for pad controllers or e-kits on channel 10. A play-along groove player with 8 gospel styles: Gospel Shuffle, Praise Break, 6/8 Worship Ballad, Half-Time Worship, Neo-Soul Pocket, Church Swing, Contemporary 16ths, Gospel Two-Step. Each has its own fill. **Lock to song** (on by default) puts the groove on the song's own beat. It follows tempo changes in the file, the tempo slider, A/B loops, seeking and audio/video lessons, and plays only while the song plays. Auto fills then land at the end of the song's 4- or 8-bar phrases. With lock off, or no song loaded, the groove runs on its own BPM. You can also choose full or light (no ghost notes) and turn on auto fills every 4 or 8 bars. A step grid shows exactly what the drummer plays as it plays. |
| **📜 Full score** | Sheet music for any song with a staff for every instrument: melody, chords, bass and drums (piano parts that use both hands get a grand staff; drums get a percussion staff). Rhythms are lined up on the beat automatically, including gospel shuffle triplets. Choose which parts to show (print one part for each player), follow along with a cursor while the song plays, **🖨 Print / Save as PDF**, **⬇ MusicXML** (opens in Logic, MuseScore, Sibelius, Finale, Dorico, ACE Studio) and **⬇ MIDI**. Works with MIDI files, library songs at every level, My Songs and Audio → MIDI results. |
| **Score → MIDI** | Open sheet music saved as MusicXML (`.musicxml`, `.mxl`, `.xml`) with **Open…** or **📂 Open score**: it becomes a song you can play, learn and use on Stage, and **Save as MIDI** writes one named track per part. Repeats and 1st/2nd endings are played out, ties are joined, transposing instruments (B♭ clarinet, trumpet, sax…) sound at concert pitch, and tempo, dynamics and lyrics carry over. Paper or PDF music: scan it to MusicXML first (Audiveris, free; or the `sheet` drop folder on the AI Studio). |
| **🎓 Lessons: 📖 Read music course** | Learn to read sheet music: the staff, treble clef (Every Good Boy Does Fine, FACE), bass clef (Good Boys Do Fine Always, All Cows Eat Grass), sharps, flats, key signatures, note lengths and counting. A note shows on the staff and the keys stay dark: you find it by reading (after two misses the key lights up as a hint). Random drills, then whole songs read from the staff with no lit keys. |
| **🎓 Lessons: 🎤 Voice course** | Singing lessons with the microphone, the same way as the piano course: breathing and your first note, find your range (it tells you soprano, alto, tenor or bass), match the note, Do-Re-Mi and scales, leaps, then sing church songs in Learn mode (the song waits for each note you sing; any octave counts, so men, women and kids sing the same lessons). A live tuner needle shows sharp/flat and a bar fills while you hold the note. Then four-part harmony (a family "Amen") and vocal production in Logic: recording and comping, Flex Pitch (Logic's Melodyne), Pitch Correction (Logic's Auto-Tune), and where Melodyne, Auto-Tune, AVOX (Antares), OVox (Waves) and ACE Studio fit in. |
| **🎙 Vocal Booth** | For singers: a live pitch line drawn over the song's notes, like Melodyne, a big tuner (note and cents) and your range. **Choir parts (SATB)**: four-part harmony for any open song (soprano = melody; alto, tenor and bass from the chords, hymn style), played with the new **Choir Aah / Ooh** sound; **Learn my part** waits for you to sing yours; **⬇ Choir MIDI** writes four named tracks for Logic, ACE Studio or a choir library such as Spitfire's. |
| **🎓 Lessons (Piano Path)** | A guided piano course, like having a teacher beside you: 6 units (Meet the keyboard, Five-finger position, Left hand, Chords, Church keys, Rhythm) of short lessons. Each lesson mixes tips (keys light up), "play these notes" and "play this chord" exercises with finger numbers and instant feedback ("That was D, find E"), and a song in Learn mode. Earn 1–3 stars, pass a lesson to open the next, and keep a 🔥 daily practice streak, for each player. **🎤 Microphone**: no USB? It listens to any piano or keyboard (one note at a time) and works in Lessons, Learn and Stage. |
| **🎸 Stage** | The game. Pick who's playing (family profiles, double-click to rename, ＋ Player), the instrument (right hand, left hand, both hands, drums) and a song. **Perform** plays the song in real time on a tilted Guitar Hero style highway (the kick drum is one wide bar): every note is judged Perfect, Great, Good or Miss, a streak builds a ×2/×3/×4 multiplier, and you finish with 1–5 👑 crowns and a family leaderboard. **Practice** is Learn mode on the big highway: the song waits for you. Courses: ⛪ Church & Worship, 🎵 Starter and ⭐ My Songs, at Beginner, Intermediate or Advanced (each with its own crowns and leaderboard); earn a crown on one to unlock the next, per player, or tick 🔓 Open all songs. Play at 50/75/100% speed, with a timing offset for slow audio. No instrument handy? Tap the lane buttons under the highway. Also plays any MIDI you open. |
| **Kit Rack** | A drum sampler window (🎛 Kit Rack on the Drums panel). Kit library on the left (Knight Studio, Gospel Live, 808 Trap, Tight Funk, Big Room), the kit on the right: click a drum to hear it and set its **Tune**, **Decay** and **Level** knobs. **Build your own kit**: load or drop a WAV/AIFF/MP3 onto any drum and it plays your sample. Your samples are saved on the computer; in the plug-in they play through Logic, even with the window closed. |
| **Drum highway** | 🥁 **Highway** on the Drums panel: the song's drum part falls toward a hit line in one lane per drum (crash, hi-hat, snare, three toms, ride, kick). Your hits flash the lanes, and in Learn drums mode a white box shows what to hit next. Works with the Alesis Nitro Max's extra notes (rims, hi-hat and cymbal edges): any part of the right drum counts. |
| **Sounds** | A sampled grand piano (Salamander Grand Piano) with 4 velocity layers, so harder playing sounds brighter as well as louder. It plays your notes and the piano parts in MIDI files. *Piano quality* in Settings chooses High (4 layers, used by default on computers) or Light (1 layer, used by default on phones). Also synthesized EP, organ, strings, bass, guitar, brass, pads and GM drums. |
| **Song library** | **⛪ Church & Worship**: Jesus Loves Me, Michael Row the Boat Ashore, Joyful Joyful, When the Saints, Silent Night, Amazing Grace and the Doxology (public-domain melodies with Knight Keys arrangements), plus gospel and worship practice tracks for playing in a service: Worship Flow (1-5-6-4), Gospel 2-5-1 Vamp, 6/8 Worship Ballad, Praise Break (shout music), Gospel Ballad 1-3-4, Hymn Style 1-4-5 with Amen, Altar Call 6/8, Minor Gospel Vamp and the Gospel Walk-Up Turnaround. **More hymns from real hymnals**: download public-domain hymn MIDI files (e.g. from hymnary.org), open them and **💾 Save the open song**; four-part hymns play soprano + alto in the right hand and tenor + bass in the left, and one-track files split at middle C. **🎵 Starter songs**: Mary Had a Little Lamb, Twinkle Twinkle, Happy Birthday. **Arrangement levels**: every song plays at **Beginner** (as written), **Intermediate** (right-hand harmony, bass + chords, drum fills) or **Advanced** (fuller gospel voicings with 9ths, an octave bass that walks into each chord, busier grooves with ghost notes). |
| **My Songs & Song Builder** | **＋ New song** types in any song: title, key, time (4/4, 3/4, 6/8, 12/8), tempo, drum style and the chord chart as you'd write it for the band (`| G | D/F# | Em C |`, `Verse:` labels, `x2`, `%`, `N.C.`; sus, add9, 7th, slash and diminished chords all work). A melody is optional: without one the right hand plays the chords and the left hand the bass, the way church keys are played. Starter templates (worship, gospel vamp, hymn, 6/8 ballad, praise break). **💾 Save the open song** keeps any MIDI file (or an Audio → MIDI result) too. My Songs work with Learn, every arrangement level and 🎸 Stage. |
| **Learn mode** | 🎯 **Learn** waits for you. The song stops at each note in the part you're learning and shows it in yellow on the keyboard and score, with the next note faintly highlighted. It carries on when you play it, while the other parts keep playing. Learn the right hand, the left hand, both hands, or the drums (on the pads, or a drum controller or e-kit sending channel 10). It counts correct notes and misses, and shows your accuracy at the end. Works with any MIDI file, including ones made with Audio → MIDI. |
| **Audio → MIDI** | A converter window that turns a WAV, MP3, M4A or MP4 into MIDI using Spotify's Basic Pitch model, running on your computer (nothing is uploaded). Presets for piano, full songs, vocal/lead melody and bass. Sensitivity and shortest-note controls update the result instantly, with a piano-roll preview. Download the `.mid`, open it alone, or open it as a synced lesson with the original recording. |
| **Wheels & pedals** | Animated pitch and mod wheels, plus sustain, sostenuto and soft pedals. |
| **MIDI files** | Plays .mid/.midi/.kar files with tempo maps, key signatures and program changes. GM-style built-in sounds and drums. |
| **Audio / video** | Plays mp3/wav/m4a/mp4/webm. You can slow it down with or without keeping the original pitch. |
| **Lessons** | Load a MIDI file together with an audio or video file and they play in sync, so the keyboard lights up with the recording. **Save lesson** bundles the MIDI, media, loops and settings into one `.klesson` file you can send to a student. |
| **Record** | Records your MIDI playing to a `.mid` file. If media is loaded, the recording is timed to it, which is a quick way to build a lesson. |
| **Practice** | Tempo from 25 to 200%, transpose ±12, A/B loop points, a saved loop list, and a panic button. |
| **Split** | Split point with left/right colors, octave shift per side, and an optional separate left-hand sound. |
| **Mixer** | Mute, solo, volume, key color and sound override for each MIDI channel. |
| **Layout** | Every panel can be detached, moved, resized, recolored (🎨) or hidden. There are layout presets, a workspace background color (use #00ff00 for a green screen in OBS), and fullscreen. The layout is remembered. |
| **MIDI out** | Sends your playing and/or file playback to any MIDI output. Use a virtual port (IAC Driver on Mac, loopMIDI on Windows) to play your own plugins (Keyscape, Kontakt…) in a DAW. |

### Computer keyboard

`A W S E D F T G Y H U J K O L P ; '` play notes, starting at C4.
`Z` / `X` move down or up an octave. `Shift` is the sustain pedal and `Space` is play/pause. `G` starts or stops the groove and `F` plays a fill.

## Code layout

```
index.html        page layout
styles.css        theme and panels
js/main.js        app wiring: MIDI I/O, files, transport, panels, rendering loop
js/player.js      MIDI playback scheduler (tempo, transpose, A/B loop, follow-media mode)
js/synth.js       WebAudio synth: GM instrument families (incl. formant choir), drums, pedals, pitch bend
js/midi-file.js   Standard MIDI File reader and writer
js/theory.js      note spelling, key signatures, chord detection, solfège
js/render.js      canvas drawing for the keyboard, grand staff, wheels/pedals and groove grid
js/grooves.js     gospel groove patterns and the groove step sequencer
js/drumkit.js     drum lanes and e-kit note map, Kit Rack kits, saved samples
js/lessons.js     Piano, Voice and Read music courses (units, lessons, steps), stars and practice streaks
js/pitch.js       microphone pitch detection, cents, singing judge, range finder, voice types
js/choir.js       four-part (SATB) choir parts for any song, and choir MIDI export
js/notation.js    full score from any song, MusicXML writer, MusicXML/.mxl reader → MIDI
js/game.js        Stage scoring (timing windows, streaks, crowns), profiles, scores, courses
js/transcribe.js  audio → MIDI with Basic Pitch
js/songs.js       song library (public-domain melodies + arrangements) → MIDI
js/demo.js        built-in demo song
samples/          Salamander Grand Piano samples (see credits below)
vendor/           Basic Pitch transcription model and bundled TensorFlow.js
test/             node unit tests (npm test)
```

## Credits

Grand piano samples: **Salamander Grand Piano** by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Velocity layers 4, 8, 12 and 16 of the original 16 were converted from the [sfzinstruments FLAC release](https://github.com/sfzinstruments/SalamanderGrandPiano) to MP3 and trimmed. Details are in `samples/salamander/SOURCE.txt`, and the author's original notes are in `samples/salamander/README.txt`.

Sheet music engraving: [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) (BSD 3-Clause, includes VexFlow), in `vendor/osmd/`.

Audio → MIDI: [Basic Pitch](https://github.com/spotify/basic-pitch-ts) by Spotify and [TensorFlow.js](https://github.com/tensorflow/tfjs), both under the Apache License 2.0. See `vendor/basic-pitch/README.txt`.
