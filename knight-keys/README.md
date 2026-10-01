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
`Z` / `X` move down or up an octave. `Shift` is the sustain pedal and `Space` is play/pause.

## Code layout

```
index.html        page layout
styles.css        theme and panels
js/main.js        app wiring: MIDI I/O, files, transport, panels, rendering loop
js/player.js      MIDI playback scheduler (tempo, transpose, A/B loop, follow-media mode)
js/synth.js       WebAudio synth: GM instrument families, drums, pedals, pitch bend
js/midi-file.js   Standard MIDI File reader and writer
js/theory.js      note spelling, key signatures, chord detection, solfège
js/render.js      canvas drawing for the keyboard, grand staff, wheels and pedals
js/demo.js        built-in demo song
test/             node unit tests (npm test)
```
