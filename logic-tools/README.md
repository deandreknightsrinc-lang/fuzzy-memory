# W.O.M.P. Logic Tools: Scripter MIDI FX
*Knight Lyfe · Weapons of Mass Production*

These four MIDI effects run inside **Logic Pro's built-in Scripter plug-in**. There's nothing to download, install, or
authorize; they work on any Mac running Logic Pro 10.x or 11.x.

| Script | Put it on | What it does |
|---|---|---|
| `WOMP-Pocket.js` | Drum Machine Designer / drum kits | West Coast pocket: swing, lay-back snare, humanize, hat accents, ghost snares |
| `WOMP-808-Glide.js` | 808 (Sampler, Quick Sampler, Retro Synth, ES2) | Overlapping notes become 808 slides; legato or retrigger-and-slide |
| `WOMP-Soul-Chords.js` | Vintage EP / B3 / Clav / Strings / Horns | One finger in, key-aware soul and gospel voicings out (9ths, 13ths, min11, 7#9) |
| `WOMP-Whistle.js` | Retro Synth sine/triangle lead | The G-funk high "whistle" lead: portamento plus delayed vibrato, +1 octave |

## Install (once per script, about 1 minute)
1. In Logic, select the track and click an empty **MIDI FX** slot above the instrument, then choose **Scripter**.
2. In the Scripter window, click **Open Script in Editor**.
3. Select all the text in the editor and delete it. Paste the full contents of the `.js` file from `scripter/`.
4. Click **Run Script**. The knobs appear in the Scripter window.
5. In the plug-in header's preset menu, choose **Save As…** and name it (e.g. `WOMP Pocket`). It then shows up in your
   Scripter preset list in every project.

> **808 Glide and Whistle:** set your instrument's **Pitch Bend range, up AND down,** to the same number as the script's
> **Bend Range** (default 12). Where to find it:
> - **Retro Synth:** Settings (the gear) → Pitch Bend
> - **Sampler:** Mod Matrix / Pitch Bend in the Mapping pane
> - **ES2:** the Bend range fields
>
> If the instrument has a Mono/Legato voice mode, turn it on too.

## W.O.M.P. Starting Settings
| Song type | WOMP Pocket | WOMP 808 Glide |
|---|---|---|
| G-funk bounce (88–98 BPM) | Swing 56–58%, 16th, "Everything except Kick", lay-back 10–14 ms, humanize 3 ms, hat accents Downbeats | Legato Slide, 80–110 ms, 808 curve |
| STALEMATE tension (half-time) | Swing 53–54%, lay-back 6–8 ms, ghost snare 20–35% | Retrigger + Slide, 60–80 ms (bouncy, aggressive) |
| HAZEL soul (66–80 BPM) | Swing 58–62%, 8th grid on hats, lay-back 14–20 ms | Legato Slide, 120–180 ms, Linear (a singing sub) |
| Gospel hook | Lay-back 8 ms, tambourine swung | Octave −1 for extra weight under the choir |

**WOMP Soul Chords:** set Key and Scale to the song first.
- **STALEMATE:** Scale **Dorian (G-Funk)** or **Minor**. Style *Minor 11 Stack* on the i chord, *Soul 9ths* elsewhere.
  Set Out-of-Key to **7#9 Tension** and play a chromatic neighbor for instant cinema.
- **HAZEL:** Scale **Major (Soul)**, Style *Gospel 13ths*, Voicing *Drop 2*, Strum 10–18 ms Up. It's a Rhodes player's hands.
- **B3 organ:** Style *7ths* or *Triads*, Voicing *Close*, Strum 0 for the church-organ block chords.

**WOMP Whistle:**
- **Main settings:** default Octave +1, Glide 150–250 ms, Vibrato 5–5.5 Hz at 18–28 cents with a 250–350 ms delay.
- **Retro Synth patch:** one sine (or triangle) oscillator, filter fully open, attack 5 ms, release 250 ms. Add Tape Delay 1/8 dotted
  and ChromaVerb plate.

## How They Work (for the curious)
- **Pocket:** reads each note's song position, delays off-beat 16ths/8ths by the swing amount, adds snare lay-back and
  random humanize, and delays each note-off by exactly the same amount so nothing hangs. Swing and ghost notes need the
  transport playing; lay-back and humanize also work while you play live.
- **808 Glide and Whistle:** mono, last-note priority. When notes overlap, the second note doesn't retrigger; the script
  ramps Pitch Bend to the new pitch once per audio block (the "808" curve is fast-start). Intervals wider than
  Bend Range retrigger normally. Both scripts take ownership of pitch bend, so incoming bend is ignored.
- **Soul Chords:** builds chords by stacking scale thirds from the degree you play. Notes shared between overlapping chords
  are reference-counted, so lifting one chord doesn't cut the other.

## Developing
The scripts are tested offline against a mock of the Scripter API (`test/scripter-mock.js`):
```sh
cd logic-tools
npm test          # runs node --test
npm run build     # regenerates 808 Glide + Whistle from the shared glide engine
```
`WOMP-808-Glide.js` and `WOMP-Whistle.js` are generated from the `scripter/_*.part.js` files. Edit the parts, then
build, because Scripter needs one self-contained script per plug-in.
