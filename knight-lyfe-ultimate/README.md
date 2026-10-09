# Knight Lyfe Ultimate

The Knight Keys learning studio as a **Logic Pro plug-in (Audio Unit)**, a **VST3** and a **standalone app**, built with [JUCE](https://juce.com).

- The interface is Knight Keys itself (`../knight-keys`), shown in a native web view, so it looks and works the same: keyboard, chords, score, songs, learn mode, grooves, Audio → MIDI.
- The sound comes from a C++ engine, so it goes through Logic's mixer, effects and bounce:
  - the Salamander grand piano with 4 velocity layers, sustain and sostenuto pedals, and pitch bend
  - the Knight Keys drum kit
  - room reverb, a volume control and an output limiter
- MIDI from Logic (or from your keyboard and e-kit in the standalone app) plays instantly and lights up the interface. Learn mode, recording and chord names all follow it. The standalone app turns on every connected MIDI keyboard and e-kit by itself, including ones plugged in later.
- **Listening (standalone app):** guitar, bass and singing lessons hear you through the Mac's microphone or an audio interface. The C++ engine finds the pitch and the spectrum, and the interface recognizes strummed chords with the same detector as the website (checked on a virtual guitar in `knight-keys/test/guitar-sim.js`: 7th, sus and add9 chords included). The Logic plug-in has no input, so listening is in the app.
- **Drums on any channel:** MIDI channel 10 always plays drums. Turn on the **Drum Track** parameter (in Logic's plug-in controls) to make every note play drums, for a Logic drum track drawn in the Piano Roll or an e-kit that isn't on channel 10.
- **Stage:** the game mode: real-time scoring (Perfect/Great/Good/Miss), streak multipliers, 1–5 crowns, family profiles, leaderboards and unlockable song courses, for keys and drums.
- **Multi-output drums:** choose the *Multi-Output* version in Logic and the drums get their own mixer channels, like Kontakt's multi-output mode: by drum type out of the box (kick, snare, hi-hat, toms, cymbals, percussion on outputs 3-14), or route any drum to any of 15 stereo outputs in the Kit Rack (*Logic outputs*: every drum on its own channel, the toms split, both hats together, or back to the main mix). The piano stays on the main output.
- **Kit Rack:** a drum sampler window with a kit library, Tune/Decay/Level per drum, and your own samples on any drum. The C++ engine plays them through Logic and keeps your kit in `~/Library/Application Support/Knight Lyfe/Kit`, so it plays even with the window closed.
- **Drum highway + e-kit learning:** falling notes per drum lane; the Alesis Nitro Max's rims and edges count as the right drum in Learn mode.
- **Tempo sync:** with **Follow Logic** ticked (Groove panel), pressing Play in Logic plays the loaded song and the groove at Logic's tempo, lined up with Logic's bar 1. Stop, moving the playhead and cycle all follow. With no song loaded, a started groove waits for Logic's Play button.

## Get it

Every push builds the Mac plug-in and app on GitHub, so you don't need Xcode:

1. Open the repository's **Actions** tab → **Build Knight Lyfe Ultimate** → the latest green run.
2. Under **Artifacts**, download **Knight-Lyfe-Ultimate-macOS**.
3. In Terminal run `bash ~/Downloads/Knight-Lyfe-Ultimate-macOS/install.sh` (or type `bash `, drag `install.sh` in, press Return). It installs the AU, VST3 and app, clears macOS's download block, signs them for your Mac and checks Logic can load the AU. `INSTALL-MAC.txt` has the details and the by-hand steps.

The Mac build is universal (Apple Silicon and Intel), runs on macOS 11 or later, and is checked with Apple's `auval` Audio Unit validator on every build.

## Build it yourself

You need CMake 3.22+ and Xcode (Mac), Visual Studio 2022 (Windows), or GCC/Clang with the WebKitGTK and ALSA dev packages (Linux). JUCE 8.0.15 is downloaded automatically.

```bash
cmake -S knight-lyfe-ultimate -B build -G Xcode        # or -G Ninja
cmake --build build --config Release
build/KnightLyfeEngineTests_artefacts/Release/KnightLyfeEngineTests   # engine tests
```

The plug-ins end up in `build/KnightLyfeUltimate_artefacts/Release/` (`AU/`, `VST3/`, `Standalone/`). Use `-DJUCE_DIR=/path/to/JUCE` to build against a local JUCE checkout.

## How it fits together

```
knight-keys/  (web app)           Source/  (C++)
  js/host.js  ── "kk" events ──▶   PluginEditor   WebBrowserComponent, serves the zipped web app
  HostSynth: notes + delay          SoundEngine    timed interface notes + host MIDI
              ◀── "hostMidi" ───      PianoEngine  Salamander samples, 4 layers (shared by all instances)
  handleLive(): lights, learn         DrumSynth    synthesized GM kit
  HostTransport ◀── "hostTransport"  (Logic's tempo, playhead, play/stop)
                                    PluginProcessor  reverb, volume, limiter, Logic state
```

- Notes from the interface arrive with a delay in milliseconds, so song playback and grooves stay in time despite the hop between the interface and the engine. Notes you play in Logic are sample-accurate.
- Logic's playhead is read at the start of every audio block and sent to the interface with how long ago it was measured. The interface places it on its own clock, schedules song notes and groove hits ahead of time at Logic's tempo, and reschedules when the playhead jumps.
- The build zips `../knight-keys` (without its MP3 samples) and the piano samples into the binary, so it's a single self-contained file.

## Tests

- `Tests/EngineTests.cpp` renders audio offline and checks it:
  - all 120 samples decode and the encoder padding is trimmed
  - timed notes land when they should; hard notes are louder than soft ones
  - host MIDI plays and is forwarded to the interface
  - sustain pedal, drums, mixer gains, cancel, stop and panic
  - the exact JSON messages the interface sends
  - Logic's transport position is passed on without torn reads
  - Multi-output: each drum group renders only to its own output; the piano stays on the main one
  - Per-drum routing: a drum routed to any output (or the main mix) plays only there, back to the default, saved and reloaded
  - Kit Rack: kit messages, tune/decay/level, your WAV samples, saved kit loading in a new instance
- `../knight-keys/test/host.test.js` checks the interface side of the bridge; `midi.test.js` checks songs following Logic's tempo, cycle and stop.
- The Mac CI job runs `install.sh` exactly as a user would and checks the result.

## Status

This is the first version of the plug-in. Planned next:
- notarized installer
- Windows build
- the AI production tools

## Credits

Grand piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0). JUCE 8 (AGPLv3 / commercial; see juce.com/legal).
