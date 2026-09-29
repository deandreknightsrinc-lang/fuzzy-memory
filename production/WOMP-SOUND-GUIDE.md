# W.O.M.P. Sound Guide
### Weapons of Mass Production: Rhythm & Gangster Soul Street Gospels
*The production standard for Knight Lyfe: STALEMATE (King Bishop Knight) and HAZEL.*

---

## 1. The Sound in One Sentence
**Uptempo, hip-hop-driven West Coast knock: heavy distorted 808s leading the beat, hard drums with fast hi-hat rolls,
and 70s/80s funk and R&B chops, with church on top.** It hits like a raid, bounces like a lowrider on
switches, and the hook sounds like Sunday morning.

> **Current direction: Uptempo 808 Mode.** Every song rides one of two uptempo lanes (§2), and the 808 is the lead of
> the low end. The slower G-funk settings further down still apply to sound design, but tempo and 808 rules now come from §2.

### The Five Pillars
| Pillar | What it means | Reference feel (describe, don't copy) |
|---|---|---|
| **Rhythm** | Laid-back swing pocket. The snare sits a hair late and the hi-hats swing. | A lowrider on hydraulics: bounce, never rush |
| **Gangster** | Hard, punchy drums, menace in minor keys, cinematic tension | Grit, street storytelling, danger in the low end |
| **Soul** | 70s/80s funk and R&B chops, Rhodes, clav, wah guitar, horn stabs, strings | Crate-dug warmth, tape saturation, vinyl dust |
| **Street** | Deep heavy bass plus melodic sliding 808s, a talkbox and a high portamento synth lead ("the whistle") | Trunk-rattling low end and G-funk melodies |
| **Gospel** | Hammond B3 with Leslie, choir stacks, call-and-response, gospel turnarounds | The "Street Gospel": redemption inside the hood story |

---

## 2. Musical Rules
**Tempo: two uptempo lanes. No song goes below 94 BPM.**
| Lane | BPM | Drums | 808 |
|---|---|---|---|
| **BOUNCE** | 94–104 | Full-time: snare/clap on 2 and 4, swung 16th hats with occasional 1/32 rolls | Locked to the kick pattern, fast slides between chord roots |
| **KNOCK** | 140–160 | Snare on 3 (half-time backbeat) with double-time energy: 1/16 hats with 1/32 and triplet rolls, busy kick | Rolling 16th-note patterns, fast glides, 808 stutters |

| **K.I.S.S.** (hyphy) | 96–108 | Snap and/or clap on 2 and 4, no hi-hats: nothing but the jingle, the 808 and the snap | The 808 is the kick: simple 1-and-3 bounce patterns with short slides |

- **K.I.S.S. lane:** 20 ready-made hyphy beats (ice-cream-truck jingle + 808 + snap/clap) live in `KISS-HYPHY-BEATS.md`.
- **Emotional songs** keep their minor keys and their story, but ride BOUNCE at 94–98. Give them a stripped intro or breakdown,
  then bring the 808 back harder.
- **Swing:** BOUNCE 55–57% on 16ths. KNOCK 51–54% (almost straight, so the rolls stay tight).

**808 rules (Uptempo 808 Mode):**
1. **The 808 is the bassline.** The synth bass supports the mids (HPF at 120 Hz) or drops out entirely.
2. **Distortion:** WOMP Low End Drive at 45–70%, so the 808 growls on phones and in cars.
3. **Tuning:** tune every 808 to the song's key, and write the root on each chord change. Use WOMP 808 Glide with Glide Time 35–80 ms.
4. **Movement:** add a roll or stutter at the end of every 2 or 4 bars with WOMP Rolls (Roll Target "Single Note" set to the 808's note).
5. **Kick and 808:** use a short punchy kick (under 120 ms) on top of the 808, or let the 808 be the kick. Sidechain only if they clash.

**Keys and harmony:**
- **Minor keys with Dorian color.** Minor 7th, minor 9th and minor 11th chords with a major 6th in the melody are the G-funk signature.
  - Good home keys: C#m, Ebm, F#m, Gm, Bbm, Bm. The 808 root sits between 28 and 50 Hz.
- **Progression toolkit:**
  - i7 → IV9 (Dorian): the core lowrider loop
  - i9 → bVII → bVI → V7#9: tension, for STALEMATE
  - ii9 → V13 → Imaj9: soul, for HAZEL
  - IV → iv → I: gospel "Amen" cadence, for hook endings
  - I → vi7 → ii7 → V7 turnarounds on choir bridges
- **Melodic language:** pentatonic and blues-scale leads, chromatic passing notes into the root, and portamento (glide) on leads and 808s.

**Arrangement (typical 3:20–4:00):**
`Intro (4–8) → V1 (16) → Hook (8) → V2 (16) → Hook (8) → Bridge/Breakdown (8) → V3 or Hook x2 → Outro (4–8)`
- Drop the drums for the last 2 bars before each hook, then slam back in.
- Add one new element on every hook return: talkbox, choir, horn stab or the whistle lead.
- Pull out the 808 for the first 4 bars of Verse 2 and let the synth bass carry it. Then bring the 808 back.

---

## 3. Sound Palette and How to Get It in Logic Pro 11
Everything below uses **Logic stock instruments and plugins**, so it works out of the box. The optional third-party tools are listed in §8.

### Drums (Hard)
| Element | Source in Logic | Treatment |
|---|---|---|
| Kick | Drum Machine Designer (DMD), layered: a punchy acoustic kick plus an 808 kick click. Or Quick Sampler with a one-shot. | Channel EQ: HPF at 30 Hz, +3 dB at 60–80 Hz, cut 250–400 Hz, +2 dB at 3–5 kHz for the beater. Compressor (Vintage VCA), 4:1, fast attack. |
| Snare/clap | Layer a crisp snare, a clap (+10 ms offset) and a rimshot. | EQ: +3 dB at 200 Hz for body, +2 dB at 6 kHz. Send to a plate (ChromaVerb "Vintage Plate", 1.2–1.8 s, 20 ms pre-delay). Gate the reverb for the West Coast snap. |
| Hi-hats | 16ths, open hat on the "and" of 2 and 4 | Swing 56%, randomize velocity ±12, and pan closed hats slightly right (10R). |
| Percussion | Shaker, tambourine (gospel!), conga, cowbell accents | Tambourine on the 2 and 4 in gospel hooks. |
| Drum bus | Aux ("DRUM BUS") | Compressor (Vintage VCA, 2:1, 3–4 dB GR) → ChromaGlow (Retro Tube, ~25%) → Channel EQ with a gentle tilt. Parallel crush send: Compressor (Vintage FET, 20:1) blended at 20–30%. |
| Groove | Use the **WOMP Pocket** Scripter tool (see `/logic-tools`) | It delays snares +8 to 20 ms and swings the hats: the laid-back West Coast feel. |

### Bass (Deep and Heavy): Two Lanes That Never Fight
1. **Melodic 808 (sub lane, 30–80 Hz)**
   - Source: Sampler/Quick Sampler with a long 808, or **Retro Synth** (sine plus a little triangle).
   - Glide: 60–120 ms. Use the **WOMP 808 Glide** Scripter tool for automatic slides.
   - Tune the 808 to the song key. The first 808 note of each bar should be the chord root.
   - Chain: Channel EQ (HPF at 25 Hz) → ChromaGlow or **WOMP Low End** (harmonics so it translates on phones) → Limiter (−3 dB ceiling on the channel).
2. **Funk synth bass (body lane, 80–400 Hz)**
   - Source: **Retro Synth** (analog mode, one saw plus a sub oscillator, 24 dB low-pass at 600–900 Hz, envelope amount 30%, glide 40 ms). Or ES2 "Moog-style" patches. Or live bass/**Bass Player** Session Player (fingerstyle or slap).
   - HPF at 70 Hz so the 808 owns the sub.
   - Play syncopated 16th-note funk lines with octave jumps and ghost notes.
- **Rule:** when the 808 is playing, the synth bass plays higher and sparser. When the 808 drops out, the synth bass plays its full range.
- **Sidechain:** duck the 808 and bass −3 to −5 dB from the kick using the Compressor's side-chain input, with a fast release (60–80 ms).
- **Mono:** keep everything under 120 Hz mono (Direction Mixer or WOMP Low End "Mono Below").

### Keys, Samples and Melodies (Soul)
| Element | Source in Logic | Notes |
|---|---|---|
| Rhodes/Wurli | Vintage Electric Piano ("Suitcase", "Wurli") | Tremolo 20–30%, Phaser slow, ChromaGlow Retro Tube. Voice chords as min9, maj9 and 13ths (use **WOMP Soul Chords**). |
| Clavinet | Vintage Clav | Wah (Auto-Wah or a Phat FX envelope filter), 16th funk stabs |
| B3 organ | Vintage B3 with Leslie | Slow on verses, fast on hooks. The Bishop and church moments. |
| Strings | Studio Strings, or Sampler "Orchestral" | Cinematic STALEMATE swells. Low-pass at 8 kHz for the vintage feel. |
| Horns | Studio Horns | Short stabs on the "and" of 4, 70s funk section style |
| Wah guitar | Amp Designer plus the Wah pedal in Pedalboard | Chicken-scratch 16ths, panned 30L |
| Whistle lead | Retro Synth: sine or triangle, glide 150–250 ms, vibrato 5 Hz, one octave up | The G-funk "high whine" melody. Double it an octave down at −12 dB. |
| Talkbox | Vocoder Synth ("EVOC 20 PolySynth"), or a real talkbox | Sing the hook lines or the "Haaa-zel" motif through it |
| Sample-flip character | **WOMP Dust** plugin, or Bitcrusher (subtle) + Tape Delay + a 100 Hz–9 kHz bandpass | Makes new playing sound like a 1976 record |

### Gospel Layer (Street Gospels)
- **Choir:** stack 6–12 vocal takes, or use Sampler choir patches (e.g. the "Voices" and "Choir" libraries). Spread the stacks across ±60 to ±100 of the stereo field. Send to a big hall (ChromaVerb "Concert Hall", 2.8 s).
- **Call-and-response:** the lead sings a line and the choir answers the last 2–3 words.
- **Organ swells** into every hook: Vintage B3, with a volume pedal automated from 0 to 100 over 1 bar.
- **Tambourine** on the 2 and 4, plus hand claps on the final hooks.

---

## 4. Vocal Production
**Rap vocal chain (Knight):**
1. Channel EQ: HPF at 80 Hz, −2 dB at 250 Hz, +2 dB at 4 kHz
2. Compressor (Vintage FET), 4:1, 4–6 dB gain reduction
3. DeEsser 2 at 6–8 kHz
4. Compressor (Vintage Opto), 2 dB for glue
5. ChromaGlow (Modern Tube), light
6. Sends: Tape Delay (1/4 note, 15% feedback, filtered) and ChromaVerb "Vocal Plate" (0.9 s, low wet)

**Performance:**
- Double the last 2–4 words of each bar as punch-ins (not full doubles).
- Pan the ad-libs ±40.
- Keep the lead dry and upfront. The beat should feel like a room around a man telling you a story.

**R&B/soul croon and Hazel's vocal:**
- Chain: gentler Compressor (Opto), then a longer plate plus a 1/8 dotted delay.
- **Stack the harmonies:** 3rd above and 5th below on hooks, with an octave-up whisper double on key lines.
- Pitch: Flex Pitch, correcting only the long notes. Keep the soul drift.

**Spoken intros and outros:** use the Telephone EQ preset or a 300 Hz–3 kHz bandpass, for voicemails, prison phones and interrogation rooms.

---

## 5. Mix and Master Targets
- **Headroom:** mix peaks at −6 dBFS on the Stereo Out before mastering.
- **Low-end check:**
  - The kick fundamental and the 808 fundamental shouldn't mask each other. Tune the 808, EQ-notch the kick, or sidechain.
  - Solo the kick and bass, listen on phone speakers, and make sure the 808 harmonics are audible.
- **Mix bus:** Compressor (Vintage VCA, 2:1, slow attack, auto release, 1–2 dB) → Channel EQ tilt → ChromaGlow ~10%.
- **Master, via Logic's Mastering Assistant (Character "Punch" or "Clean") or a manual chain:** Linear Phase EQ → Multipressor (gentle on the low band) → Adaptive Limiter.
  - **Loudness:** −8.5 to −7.5 LUFS integrated for every song in Uptempo 808 Mode. **True peak −1.0 dBTP.**
  - **Pushing the 808 into the limiter:** saturate it first (WOMP Low End Drive), because the harmonics limit more cleanly than a pure sine.
- **References:** A/B against two or three released West Coast and soul records at matched loudness (Logic's Loudness Meter). Describe the target in words in your notes, not in Suno prompts.

---

## 6. The Suno → Logic Workflow
1. **Discover (Suno):** generate 3–4 takes per song with the W.O.M.P. prompts below. Keep the take with the best **pocket and hook melody**; ignore the lyric mistakes for now.
2. **Lock the voice:** save the best Knight take as a **Persona** and reuse it on every song, so both albums sound like one artist.
3. **Export stems:** use Suno's stem export (paid plans), or use **Logic's Stem Splitter** on the full mix (vocals, drums, bass, guitar, piano, other).
4. **Import into Logic:**
   - Set the project BPM and key from Suno's take. Use Smart Tempo if the take drifts.
   - Detect the key with Logic's analysis, or by ear against a Rhodes.
5. **Rebuild the weapons:** this is where it becomes *yours* and *high quality*.
   - Replace or layer the Suno drums with real DMD kits, and run WOMP Pocket on them.
   - Replace the bass with a real 808 and synth bass: transcribe the Suno bassline into MIDI (Flex Pitch → "Create MIDI Track"), then play it with your 808 patch through WOMP 808 Glide.
   - Keep the Suno keys and sample layers as "sample" texture through WOMP Dust. Or replay them on Vintage EP/B3 using WOMP Soul Chords.
6. **Vocals:** re-record Knight's vocals over the rebuilt beat, using the Suno vocal as a guide track only.
7. **Mix → Master** using §3–5.

**Rights and clearance:**
- **Real 70s/80s samples** need clearance from the master owner *and* the publisher. W.O.M.P.'s approach is **replay and interpolation**: you or a session player recreate the vibe, so you only clear the composition if you quote a melody. Or you generate original sample-style material.
- **Suno:** commercial-use rights depend on your plan at the time you generate. Check Suno's current terms before release.
- **Registration:** register all songs with your PRO and The MLC.

---

## 7. The W.O.M.P. Suno Prompt Formula
The Style field holds **1,000 characters**. Build every prompt in this order, so the sound stays consistent while each song keeps its own character:

`[W.O.M.P. core] + [album flavor] + [song-specific: BPM, key, mood, lead instrument, special FX] + [vocal] + [mix]`

**W.O.M.P. core (paste into every prompt, Uptempo 808 Mode):**
```
uptempo hard-hitting West Coast hip hop, heavy booming distorted 808 bass leading the beat, fast sliding 808 glides and 808 rolls, rhythm and gangster soul street gospel, 70s 80s funk and R&B sample chops, punchy knocking drums, crisp fast hi-hats with rolls, analog Moog synth bass, warm tape saturation
```
**STALEMATE flavor:**
```
dark minor key, tense orchestral strings, church organ, high portamento synth whistle lead, chess clock ticking and wooden piece clicks
```
**HAZEL flavor:**
```
70s soul, Rhodes and clavinet, talkbox, gospel choir swells, live wah guitar, vinyl crackle
```
**Exclude Styles field (all songs):**
```
pop, EDM, rock, country, lo-fi, slow ballad, downtempo, chill, thin drums, weak bass, heavy autotune, modern pop R&B
```
**Suno settings:**
- **Advanced options:** Weirdness 35–45% and Style Influence 65–75%. Push Style Influence higher when the sound drifts.
- **Refine the best take:** use Extend or Cover to keep a good vocal while adjusting the style.

---

## 8. Optional Third-Party Upgrades
These aren't needed, since the W.O.M.P. tools and Logic stock plugins cover it, but they're worth knowing:
- **Soothe-style resonance suppressors** tame harsh sample chops.
- **Saturation/tape plugins** add more 70s character.
- **Dedicated 808/bass tuner and saturator plugins** help with the low end.
- **Real hardware:** a talkbox, and a Rhodes or Wurli, are the two biggest upgrades to authenticity.

---

## 9. W.O.M.P. Tools (This Repo)
| Tool | Type | What it does |
|---|---|---|
| **WOMP Pocket** | Logic Scripter (MIDI FX) | West Coast groove engine: hat swing, late snare, velocity humanize, ghost notes |
| **WOMP 808 Glide** | Logic Scripter (MIDI FX) | Turns overlapping notes into 808 pitch-bend slides |
| **WOMP Rolls** | Logic Scripter (MIDI FX) | Tempo-locked hi-hat rolls (1/16T to 1/64) and 808 stutters, with velocity build-ups |
| **WOMP Soul Chords** | Logic Scripter (MIDI FX) | One finger in, 70s soul and gospel voicings out (min9, maj9, 13, 7#9, 11), key-aware, with strum |
| **WOMP Whistle** | Logic Scripter (MIDI FX) | G-funk lead helper: portamento plus delayed vibrato for that high whine |
| **WOMP Low End** | Audio Unit / VST3 plugin | 808 and bass weapon: harmonic drive, sub mono, low punch, "Tight" rumble high-pass, sub boost |
| **WOMP Dust** | Audio Unit / VST3 plugin | "It's a 1976 record": tape saturation, wow and flutter, vinyl crackle, vintage bandwidth |

See `logic-tools/README.md` and `plugins/README.md` for install instructions.
