# Knight Lyfe Ultimate

The Knight Keys learning studio as a **Logic Pro plug-in (Audio Unit)**, a **VST3** and a **standalone app**, built with [JUCE](https://juce.com).

- The interface is Knight Keys itself (`../knight-keys`), shown in a native web view, so it looks and works the same: keyboard, chords, score, songs, learn mode, grooves, Audio → MIDI.
- The sound comes from a C++ engine, so it goes through Logic's mixer, effects and bounce:
  - the Salamander grand piano with 4 velocity layers, sustain and sostenuto pedals, and pitch bend
  - the Knight Keys drum kit
  - room reverb, a volume control and an output limiter
- MIDI from Logic (or from your keyboard and e-kit in the standalone app) plays instantly and lights up the interface. Learn mode, recording and chord names all follow it.

## Get it

Every push builds the Mac plug-in and app on GitHub, so you don't need Xcode:

1. Open the repository's **Actions** tab → **Build Knight Lyfe Ultimate** → the latest green run.
2. Under **Artifacts**, download **Knight-Lyfe-Ultimate-macOS**.
3. Follow `INSTALL-MAC.txt` inside it.

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
                                    PluginProcessor  reverb, volume, limiter, Logic state
```

- Notes from the interface arrive with a delay in milliseconds, so song playback and grooves stay in time despite the hop between the interface and the engine. Notes you play in Logic are sample-accurate.
- The build zips `../knight-keys` (without its MP3 samples) and the piano samples into the binary, so it's a single self-contained file.

## Tests

- `Tests/EngineTests.cpp` renders audio offline and checks it:
  - all 120 samples decode and the encoder padding is trimmed
  - timed notes land when they should; hard notes are louder than soft ones
  - host MIDI plays and is forwarded to the interface
  - sustain pedal, drums, mixer gains, cancel, stop and panic
  - the exact JSON messages the interface sends
- `../knight-keys/test/host.test.js` checks the interface side of the bridge.

## Status

This is the first version of the plug-in. Planned next:
- follow Logic's tempo and transport so grooves and songs play in sync with the project
- notarized installer
- Windows build
- the AI production tools

## Credits

Grand piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0). JUCE 8 (AGPLv3 / commercial; see juce.com/legal).
