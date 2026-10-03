# KBK Studio 2 (Logic Pro plug-in)

A 16-pad sampler for Logic Pro (Audio Unit), with VST3 and a standalone app, that **chops your audio across the pads by itself**. Built with [JUCE](https://juce.com) in the Knight Lyfe Ultimate look. It is called *KBK Studio 2* so it installs next to an older KBK Studio plug-in instead of replacing it.

- **Auto-chop:** drop a song, loop or break on the pads (or open a file, or paste a link) and it's cut up and spread across all 16 pads.
  - **Songs:** the tempo is detected, and each pad gets one bar starting on the strongest hit in its sixteenth of the song, so the chops cover the whole track in order.
  - **Loops and breaks** (up to 20 s): cut at every hit.
  - **One-shots** (1.5 s or less): stay on one pad.
  - Chops cut each other off like an MPC (switchable), and **Undo** puts the old pads back. **Chop across pads** re-chops the selected pad: smart, by hits, or 4/8/16 equal slices. It's the same chop as the [KBK Studio web app](../kbk-studio/).
- **Pads:** level, tune (±24 semitones), pan, start/end trim (drag the gold lines on the waveform), one-shot / hold / loop, reverse, choke groups, MIDI learn, and export a pad as WAV.
- **Your keyboard:**
  - **Pads** mode: 16 keys from C1 (36) play pads 1–16 (MPC layout). **Learn from key** moves pad 1 to any key.
  - **Keys** mode: the whole keyboard plays the selected pad in pitch, with C3 (60) at its own pitch.
  - **Split** mode: pads on the low keys, the selected pad in pitch above.
  - Velocity, sustain pedal and pitch bend work, and you can click the pads too.
- **Links:** paste or drag a link onto a pad. Direct files and Dropbox / Google Drive / OneDrive / GitHub share links load straight in. YouTube, SoundCloud, TikTok and other pages go through the [KBK helper](../kbk-studio/server/) (`bash ~/fuzzy-memory/kbk-studio/server/start-helper.sh`), and the plug-in tells you if it isn't running. Only pull audio you own or have the rights to use.
- **Files:** WAV, AIFF, FLAC, MP3, OGG, and anything macOS opens (M4A, AAC, ALAC, CAF, and the audio of MP4/MOV video).
- **Master bus:** Glue Comp (threshold, ratio, attack, release, makeup, mix), Tape (drive, warmth), Limiter (ceiling, release) and Master. All of them can be automated in Logic.
- **Saved in your project:** the pads, chops and settings are stored inside the Logic project (the audio as FLAC), so the project reopens with its chops even if the original file is gone.

## Get it

Every push builds the Mac plug-in on GitHub, so you don't need Xcode:

1. Open the repository's **Actions** tab → **Build KBK Studio plug-in** → the latest green run.
2. Under **Artifacts**, download **KBK-Studio-macOS** and unzip it.
3. In Terminal, type `bash ` (with a space), drag `install.sh` from the download into the window, and press Return. It installs the AU, VST3 and app, clears macOS's download block, signs them for your Mac and checks that Logic can load the AU.
4. Quit Logic (Cmd+Q) and reopen it. Make a new **Software Instrument** track, then in the Instrument slot choose **AU Instruments → Knight Lyfe → KBK Studio 2**.

The build is universal (Intel and Apple Silicon), runs on macOS 11 or later, and is checked with Apple's `auval` on every build.

## Build it yourself

You need CMake 3.22+ and Xcode (Mac) or GCC/Clang with the ALSA, X11 and curl dev packages (Linux). JUCE 8.0.15 is downloaded automatically.

```bash
cmake -S kbk-studio-plugin -B build -G Xcode        # or -G Ninja
cmake --build build --config Release
build/KBKStudioTests_artefacts/Release/KBKStudioTests   # engine tests
```

## Files

- `Source/Engine/AutoChop.*`: onset detection, tempo, smart chop, hits, equal slices
- `Source/Engine/PadSampler.*`: the 16 pads, voices, MIDI routing, choke, master bus
- `Source/Engine/AudioLoader.*`: link rules (share links, video pages, DRM), downloads, the helper, decoding
- `Source/PluginProcessor.*`: parameters, background loading, auto-chop and undo, saving into the project
- `Source/PluginEditor.*`: the interface
- `Tests/EngineTests.cpp`: chop, links, decoding and sampler tests (run in CI)
- `install.sh`: the Mac installer that ships in the download
