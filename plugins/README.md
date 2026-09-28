# W.O.M.P. Plugins

**Knight Lyfe · Weapons of Mass Production**

These are two Audio Unit / VST3 effects built for the W.O.M.P. sound: West Coast G-funk, 70s/80s funk and R&B samples, hard drums and deep melodic 808s. See [`../production/WOMP-SOUND-GUIDE.md`](../production/WOMP-SOUND-GUIDE.md) for where they sit in a session.

| Plugin | Job | AU code | Bundle ID |
|---|---|---|---|
| **WOMP Low End** | 808 and bass weapon: harmonic drive so the 808 is heard on phone speakers, a sub shelf, mono below a set frequency, punch and a tight high-pass | `aufx WmLe KnLf` | `com.knightlyfe.wompLowEnd` |
| **WOMP Dust** | Makes it sound like a 1976 record: tape drive, wow and flutter, vinyl crackle, hiss and vintage band-limiting | `aufx WmDs KnLf` | `com.knightlyfe.wompDust` |

In Logic they appear under **Audio Units → Knight Lyfe**.

---

## WOMP Low End: the 808 and bass weapon

**Signal flow:** Tight HPF → 150 Hz Linkwitz-Riley split → the **low band** runs through a 4x oversampled drive with auto gain, then a DC blocker, then Punch. The **high band** is delay-compensated and stays clean. Then the two bands are summed → Sub Boost shelf → Mono Below → Mix → Output.

The drive uses asymmetric tanh saturation, which adds both even and odd harmonics. The 2nd harmonic sits an octave up, and that octave is what makes a 40 Hz 808 audible on a phone or laptop speaker. Because the drive is 4x oversampled, the plugin reports its latency to the host (61 samples). Logic compensates for it automatically.

| Parameter | Range | What it does |
|---|---|---|
| **Drive** | 0–100 % | Saturation of the low band (below about 150 Hz). Auto gain compensation keeps the level about the same, so you hear more harmonics without it simply getting louder. 0 % is clean. |
| **Harmonics** (Harmonics Mix) | 0–100 % | Blend between the clean low band and the saturated low band. |
| **Punch** | 0–100 % | Transient emphasis on the low band, up to +9 dB on the attack. It runs after the drive, so the 808's click and kick survive the saturation. |
| **Sub Boost** | 0 to +6 dB | Low shelf at 60 Hz. |
| **Tight** | 20–40 Hz | 12 dB/oct high-pass that removes rumble below the 808 fundamental. |
| **Mono Below** | Off, 60, 80, 100, 120, 150, 200 Hz | A Linkwitz-Riley crossover. Everything below the frequency is summed to mono and everything above is untouched. |
| **Mix** | 0–100 % | Dry/wet. The dry path is latency-aligned, so parallel settings don't comb-filter. |
| **Output** | −24 to +12 dB | Output trim, smoothed. |

### Suggested W.O.M.P. settings

| Use | Drive | Harm. | Punch | Sub | Tight | Mono | Mix | Notes |
|---|---|---|---|---|---|---|---|---|
| **808 on phone speakers** | 45–60 % | 80–100 % | 20 % | +1.5 dB | 25 Hz | 120 Hz | 100 % | The main setting. Solo the 808 on laptop or phone speakers and raise Drive until the notes are clearly pitched. Follow it with Logic's Limiter at −3 dB. |
| **Trunk rattler (sub-heavy, 28–50 Hz roots)** | 25 % | 60 % | 10 % | +4 dB | 22 Hz | 100 Hz | 100 % | For C#m and Ebm songs with a very low root. Keep Tight below the root note. |
| **Kick-and-808 knock** | 35 % | 70 % | 55–70 % | +2 dB | 30 Hz | 120 Hz | 100 % | Put it on a bus with the kick and 808. Punch brings back the attack. |
| **Moog / synth bass** | 25–35 % | 50 % | 15 % | 0 dB | 35 Hz | 120 Hz | 60–80 % | Parallel harmonics that keep the bass line audible above the 808. |
| **Mix-bus mono safety** | 0 % | 0 % | 0 % | 0 dB | 20 Hz | 100–120 Hz | 100 % | Mono below 120 Hz only (the "Mono" rule in the guide). |

---

## WOMP Dust: make it sound like a 1976 record

**Signal flow:** wow/flutter delay → tape saturation → + hiss + vinyl crackle → Low Cut → High Cut → Mix → Output.

| Parameter | Range | What it does |
|---|---|---|
| **Tape Drive** | 0–100 % | Tape-style tanh saturation with a gentle asymmetry for warm 2nd harmonic. Gain stays close to unity on quiet material and compresses the peaks. 0 % is clean. |
| **Wow** | 0–100 % | Slow pitch drift from a worn turntable or capstan: a 0.5 Hz sine plus random drift, up to about ±0.8 %. |
| **Flutter** | 0–100 % | Faster pitch wobble: about 6.5 Hz with random jitter, up to about ±0.4 %. Wow and Flutter share one modulated fractional delay line (Lagrange interpolation) that moves both channels together, like a real transport. |
| **Crackle** | 0–100 % | Vinyl surface: dense small ticks, rarer low pops and faint surface noise. The left and right channels are generated independently, so the crackle spreads across the stereo field instead of sitting in the centre. |
| **Hiss** | 0–100 % | Tape hiss (tilted white noise), up to about −30 dBFS. |
| **Low Cut** | 20–300 Hz | 12 dB/oct high-pass for vintage low-end band-limiting. It also removes the DC produced by the asymmetric saturation. |
| **High Cut** | 20 kHz–4 kHz | 12 dB/oct low-pass with a slight resonant "presence" bump at the corner. |
| **Age** | 0–100 % | Macro. At 0 % it does nothing. Turning it up pushes Wow, Flutter and Crackle toward maximum, Low Cut toward 150 Hz and High Cut toward 4.5 kHz, all together. |
| **Mix** | 0–100 % | Dry/wet. The dry path is latency-aligned. |
| **Output** | −24 to +12 dB | Output trim. |

**Latency:** the wow and flutter delay line runs around a fixed centre delay: 119 samples at 44.1 kHz and 129 at 48 kHz, about 2.7 ms. The plugin reports this to the host, and the dry path is aligned to it.

### Suggested W.O.M.P. settings

| Use | Drive | Wow | Flutter | Crackle | Hiss | Low Cut | High Cut | Age | Mix |
|---|---|---|---|---|---|---|---|---|---|
| **Rhodes into a '76 record** | 35 % | 25 % | 15 % | 20 % | 10 % | 80 Hz | 9 kHz | 20 % | 100 % |
| **Sample-flip character** (guide §3: "100 Hz–9 kHz bandpass") | 40 % | 20 % | 20 % | 30 % | 15 % | 100 Hz | 9 kHz | 0 % | 100 % |
| **Drum bus dust** | 25 % | 0 % | 5 % | 15 % | 5 % | 30 Hz | 14 kHz | 0 % | 35–50 % |
| **Gospel organ / choir warmth** | 20 % | 15 % | 10 % | 0 % | 5 % | 60 Hz | 11 kHz | 0 % | 70 % |
| **Intro/outro "found record"** | 50 % | 45 % | 30 % | 60 % | 25 % | 180 Hz | 5 kHz | 60 % | 100 % |
| **Whole beat, subtle glue** | 15 % | 10 % | 5 % | 10 % | 5 % | 20 Hz | 18 kHz | 0 % | 100 % |

Keep Dust off the 808 and the sub bus, or use Mix at 20–30 % there. The Low Cut and the wow would otherwise weaken the low end that WOMP Low End just built.

---

## Get the build from GitHub Actions

1. Push to any branch that changes `plugins/**`, or open **Actions → WOMP Plugins → Run workflow** on GitHub.
2. When the **macOS** job is green, open the run and download the **`WOMP-Plugins-macOS`** artifact. It contains:
   - `WompLowEnd.component.zip`, `WompDust.component.zip` (Audio Units for Logic)
   - `WompLowEnd.vst3.zip`, `WompDust.vst3.zip` (VST3 for other DAWs)
3. Unzip the artifact, then unzip each bundle by double-clicking it in Finder.

The binaries are universal (Apple Silicon + Intel) and ad-hoc signed. They are **not** notarized, so macOS quarantines them after download. The `xattr` step below fixes that.

## Install in Logic Pro

```bash
# 1. Copy the Audio Units
mkdir -p ~/Library/Audio/Plug-Ins/Components
cp -R ~/Downloads/WompLowEnd.component ~/Downloads/WompDust.component ~/Library/Audio/Plug-Ins/Components/

# 2. Remove the download quarantine (required for unsigned/ad-hoc-signed plugins)
xattr -dr com.apple.quarantine ~/Library/Audio/Plug-Ins/Components/WompLowEnd.component
xattr -dr com.apple.quarantine ~/Library/Audio/Plug-Ins/Components/WompDust.component

# 3. (Optional) Verify with Apple's validator
killall -9 AudioComponentRegistrar 2>/dev/null
auval -v aufx WmLe KnLf
auval -v aufx WmDs KnLf

# VST3 (other DAWs):
mkdir -p ~/Library/Audio/Plug-Ins/VST3
cp -R ~/Downloads/WompLowEnd.vst3 ~/Downloads/WompDust.vst3 ~/Library/Audio/Plug-Ins/VST3/
xattr -dr com.apple.quarantine ~/Library/Audio/Plug-Ins/VST3/WompLowEnd.vst3 ~/Library/Audio/Plug-Ins/VST3/WompDust.vst3
```

4. Open Logic Pro → **Logic Pro → Settings → Plug-in Manager**. Select the **Knight Lyfe** plug-ins (or all of them) and click **Reset & Rescan Selection**. They should pass validation.
5. Insert them from **Audio FX → Audio Units → Knight Lyfe → WOMP Low End / WOMP Dust**.

If Logic says a plugin "failed validation", check that you ran the `xattr` command on the copy inside `~/Library/Audio/Plug-Ins/Components`, then rescan again.

## Build locally

Requirements: CMake 3.22+ and a C++17 compiler. On a Mac that means Xcode or the Command Line Tools. JUCE 8.0.15 is fetched automatically at configure time. Set `-DWOMP_JUCE_TAG=…` to use another tag, or `-DFETCHCONTENT_SOURCE_DIR_JUCE=/path/to/JUCE` to use an existing checkout.

### macOS (AU + VST3)

```bash
cd plugins
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
# Bundles land in build/<Plugin>/<Plugin>_artefacts/Release/{AU,VST3}/
```

To have the build copy the plugins straight into `~/Library/Audio/Plug-Ins`, add `-DWOMP_COPY_PLUGIN_AFTER_BUILD=ON`. It is off by default so CI never writes to system folders.

**Xcode project:** `cmake -B build-xcode -G Xcode`, then open `build-xcode/WompPlugins.xcodeproj` and build the `WompLowEnd_AU` / `WompDust_AU` schemes. Run `WompLowEnd_Standalone` if you want a quick UI check.

### Linux (VST3 + Standalone)

```bash
sudo apt install ninja-build libasound2-dev libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev \
  libxext-dev libxcomposite-dev libfreetype-dev libfontconfig1-dev libgl1-mesa-dev
cd plugins
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
ctest --test-dir build --output-on-failure
```

JUCE's web browser and CURL support are disabled (`JUCE_WEB_BROWSER=0`, `JUCE_USE_CURL=0`), so neither webkit nor libcurl is needed.

### Tests

`tests/` builds `WompTests`, a console program that runs each processor offline at 44.1 kHz and 48 kHz. It feeds sine, 808-style, noise and impulse signals through default, extreme and minimum settings, in odd block sizes and in mono and stereo, and checks that:

- the output has no NaN or Inf and stays within bounds
- **Mono Below** gives identical L/R for a stereo 40 Hz sine (and leaves it stereo when set to Off)
- **Mix = 0** passes the dry signal exactly, delayed by the reported latency
- the wet path peaks at the reported latency (cross-correlation)
- **Drive** adds harmonics above 250 Hz while auto gain keeps the level within 4 dB
- Dust's crackle is decorrelated between L and R
- saved state round-trips every parameter, both into the same instance and into a fresh one

`WompTests --snapshot <dir>` also renders both editors to PNG without opening a window.

## Layout

```
plugins/
  CMakeLists.txt        top level: fetches JUCE, adds both plugins and the tests
  shared/               header-only LookAndFeel (gold on black) and small DSP helpers
  WompLowEnd/Source/    LowEndProcessor.*, LowEndEditor.*
  WompDust/Source/      DustProcessor.*, DustEditor.*
  tests/                offline DSP test executable (registered with CTest)
```

Parameter IDs are versioned (`juce::ParameterID { id, 1 }`), so automation and saved sessions keep working in future versions. The editors are drawn entirely with `juce::Graphics`; there are no image assets.
