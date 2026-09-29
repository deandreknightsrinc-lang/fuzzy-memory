# Knight Lyfe Artist Voices: Building Every Character from Your Own Voice
*W.O.M.P. production guide. One performer, many characters.*

## The Core Idea
**You perform every part.** Every flow, melody, breath, emotion and word starts as *your* recording. Each character
gets their **timbre** from one of three layers, stacked from simplest to most powerful:

1. **Performance:** you change register, placement, pace and attitude with your own voice. This matters most, and no tool replaces it.
2. **Processing:** Logic's pitch and formant tools plus a signature effects chain for each character.
3. **Voice models:** an AI voice-conversion model (voice-to-voice) turns your recorded performance into the character's timbre while
   keeping your phrasing.

Because you're the source of every performance, the voices stay consistent across both albums. It also gives you the strongest claim
to authorship, since the melodies, flows and timing are human-performed. More in §8.

---

## 1. The Voice Map
| Character | Role | Built from | Target sound | Path |
|---|---|---|---|---|
| **Knight** | STALEMATE lead, HAZEL guest | Your natural voice | Gritty mid-baritone rap, hungry, clear consonants | Performance + processing |
| **Rook** | Narrator of every album | Your voice, lower register | Deep baritone: soul preacher when singing, hardcore when rapping, close and dry when narrating | Performance + processing, then a dedicated **Rook model** |
| **Big Otis** | Hazel's father | Your voice, older and rougher | Gravelly, slow, smoker's rasp, heavy pauses | Performance + processing (pitch −1, formant down, saturation) |
| **Lil Tre** | Knight's little brother | Your voice, younger and brighter | Lighter, faster, a little nasal, heard over a prison phone | Performance + processing (pitch +2, formant up, phone EQ) |
| **Hazel** | HAZEL lead artist: sings 60%, raps 40% | **Your performance** converted into a female voice | Warm soul alto with a gospel top, sharp precise rap | **Female voice model** (from a consenting singer), or a hired vocalist following your guide |
| **Mother Ruth** | Hazel's grandmother | Your performance converted, or a guest singer | Elder gospel alto, vibrato, authority | Female model with an older setting, or a church singer |
| **Mama Knight** | Knight's mother | Your performance converted, or a guest | Warm spoken alto | Female model (speech), or a guest |

> **Why the female voices need a model or a singer:** pushing a male voice up 5–12 semitones with pitch and formant
> shifting alone sounds cartoonish. The professional route is a **voice model built from a real female singer who consents
> and is paid**, driven by *your* performance. Or hire that singer to re-sing your guide. Either way, **the song
> still comes from you**: your melody, your flow, your timing.

---

## 2. Phase 1: Record Your Voice Dataset (the foundation)
Do this once, carefully. Every character is built on it.

**Setup**
- **Mic and position:** a large-diaphragm condenser, or a dynamic mic like the SM7B type. Use a pop filter and sit 6–10 inches away. Stay in the same position every session.
- **Room:** treat it or deaden it: a closet, blankets, or a reflection filter. The recordings must be **dry**, with no room echo.
- **Format:** 48 kHz / 24-bit. Peaks around −10 dBFS. **No effects printed**: no reverb, delay, Auto-Tune or doubles.
- **Chain:** record it clean (preamp → interface). You can monitor through a little reverb, but don't record it.

**What to record: about 45–60 minutes total, in separate takes, labeled**
| Block | Content | Length |
|---|---|---|
| A. Speaking | Read the album bible aloud: normal, whispered, angry, tired | 8 min |
| B. Rap: your natural Knight voice | Full verses from STALEMATE, at half-time, Bounce and Knock flows, plus ad-libs | 12 min |
| C. Rap: low, as Rook | The same verses dropped into your chest: slower, heavier | 8 min |
| D. Singing: full range | Sirens (lowest to highest note on "ah"), 5-note scales on each vowel, sustained notes, soft and loud | 8 min |
| E. Singing: songs | Hooks from both albums, in your comfortable key | 10 min |
| F. Rook's soul voice | Slow gospel phrases in your lowest comfortable range, with vibrato | 6 min |
| G. Characters | Big Otis lines (rough, slow) and Lil Tre lines (lighter, faster) | 5 min |

**Clean it up**
- Cut out coughs, clicks and long silences. Keep the breaths inside phrases.
- Export each take as its own dry WAV: `KNIGHT_rap_01.wav`, `ROOK_sing_03.wav`, and so on.
- Keep the raw session files forever. They're your proof of authorship.

---

## 3. Phase 2: Your Base Voice Model (Knight)
A voice model learns your timbre from Block A + B + D + E audio. Then any new performance, even a scratch vocal, can be
rendered in your cleanest "record voice."

**Options:**
- **Local/open-source:** Retrieval-based Voice Conversion (RVC)–style tools. Free and private. They need a decent GPU and some setup. Train on 10–30 minutes of clean dry audio.
- **Hosted services:** several online services train a singing-voice model from your uploads and convert
  a cappellas. Before uploading, **read their terms**: who owns the model, whether they can train on your voice, and whether you can use the output commercially.

**Training tips (any tool):**
- Clean, dry, single-voice audio only. Garbage in means garbage timbre out.
- Include singing *and* rapping *and* speech. A model trained only on rap sings badly, and the other way around.
- Test it on a phrase that's *not* in the training set before you trust it.

**Knight doesn't strictly need a model.** You *are* Knight. The model is for consistency on days your voice is tired,
and for converting quick phone demos into usable takes.

---

## 4. Phase 3: Derive the Male Characters
### Processing recipes (Logic Pro, stock plugins)
Save each chain as a **Channel Strip preset** named after the character, so every song uses the same voice.

**KNIGHT VOX** (your natural voice)
- **Chain:** Channel EQ (HPF 80 Hz, −2 dB at 250 Hz, +2 dB at 4 kHz) → Compressor Vintage FET 4:1 → DeEsser 2 → Compressor Opto 2 dB → ChromaGlow Modern Tube (light).
- **Sends:** 1/4 Tape Delay and a short plate.

**ROOK VOX** (the narrator)
1. **Perform it first:** drop into your chest voice. Speak slower than feels natural, and let the ends of lines fall.
2. **Vocal Transformer:** Pitch **−2**, Formant **−3**, Mix 100%. Or use the Pitch Shifter in vocal mode at −2 with formants preserved, plus Vocal Transformer Formant −2.
3. **Channel EQ:** +3 dB shelf at 120 Hz, −3 dB at 3.5 kHz, **low-pass at 9 kHz**. That's the "close and dark" sound.
4. **Compressor:** Vintage Opto, 4–6 dB of gain reduction (smooth, radio-announcer steady).
5. **ChromaGlow:** Retro Tube at 20%.
6. **Narration reverb:** a tiny room (ChromaVerb "Small Room," 0.4 s, 8% wet). Keep him *dry and close*.
7. **Singing:** add a Vintage Plate send (1.4 s) and let his held notes bloom.

**BIG OTIS VOX**
- **Performance:** slow and deliberate, with a slight rasp.
- **Chain:** Vocal Transformer Pitch **−1**, Formant **−4** → Phat FX Distortion (subtle, 10–15% mix, for the smoker's rasp) → Channel EQ with a cut above 7 kHz and a boost at 200 Hz.

**LIL TRE VOX**
- **Performance:** faster, lighter, pitched a little up in your head voice.
- **Chain:** Vocal Transformer Pitch **+2**, Formant **+2**. For prison calls, add the **Telephone** EQ (band-pass 300 Hz–3.4 kHz) plus a little Bitcrusher (subtle).

**Staying inside the safe zone:** keep pitch within ±3 semitones and formant within ±4. Past that, the voice turns synthetic.
If you need more change, use **performance**, not processing.

### The Rook model (recommended once his voice is set)
When you're happy with ROOK VOX, bounce 15–20 minutes of your Rook performances *with the pitch and formant processing applied* and
train a **dedicated Rook model** on them. From then on, record Rook lines in your normal voice and convert them. He'll sound
the same on every song across every album.

---

## 5. Phase 4: The Female Voices (Hazel, Mother Ruth, Mama Knight)
**The ethical, professional path:**
1. **Find the source singer:** a real female vocalist whose natural timbre fits Hazel. That means a warm soul alto who can also rap, or two singers, one for singing and one for rap.
2. **Get it in writing:** a **voice-model agreement** that covers consent to train a model, the scope (Hazel only, these albums), payment or royalty points, credit, and whether she can revoke it. Never train on anyone's voice without written permission, and **never** on a famous artist's voice.
3. **Record her dataset:** the same blocks as §2 (singing range, soul phrases, rap verses, speech), 30–45 minutes, dry.
4. **Train the Hazel model** on that dataset.
5. **Perform Hazel's parts yourself:** her melodies, flows and emotion. Then convert them with the Hazel model.
   - **Transpose:** most conversion tools have a pitch-transpose setting. Male to female is usually **+5 to +12 semitones**. Sing in *your* comfortable key, then transpose so the result sits in Hazel's alto range (roughly F3–F5).
   - **Rap:** transpose +3 to +5, since speech-like rap sounds wrong transposed a full octave.
   - If the result sounds strained, perform higher in your own range first.
6. **Or skip the model:** the singer re-records Hazel's parts following **your guide vocal**, with your melody and flow. Many artists do exactly this, and it gives the most natural result.

**Mother Ruth:** the same process with an older gospel alto, whether that's her own model or a church singer from your community.
**Mama Knight:** she's mostly spoken. Use a female speech model (with consent) or a guest.

---

## 6. Phase 5: Lock the Voices in Suno
Suno is for **sketching and discovering** the songs. The Logic workflow is for the **final vocals**.

1. **Upload your a cappellas:** upload your own performances and use **Cover** (or **Extend**) with the song's style prompt. Suno keeps your melody and phrasing and builds the track around them.
2. **Personas:** when a take nails a character's voice, **save it as a Persona** (Knight, Rook, Hazel). Reuse that Persona for that character on every song. Suno's options change often, so check which Persona and upload features your plan has, including whether it can make a Persona or custom voice straight from your own uploaded vocal.
3. **Multi-voice songs:** a Suno generation leans toward one lead voice. Use it for the **lead** (Hazel on HAZEL, Knight on STALEMATE). The section tags steer the guest parts. For the final record, **replace the guest and narrator parts** with your converted vocals in Logic.
4. **Voice drift:** if a male voice takes over a Hazel song, add "male lead vocal" to Exclude Styles (already in the HAZEL v2 prompts) and regenerate.

---

## 7. Phase 6: The Song Workflow, Start to Finish
1. **Write** the song, using the album files.
2. **Sketch in Suno** with the style prompt and the character's Persona. Pick the best arrangement and melody.
3. **Split stems** with Suno's stem export or Logic's Stem Splitter. Rebuild the beat using the W.O.M.P. tools (see `SESSION-CHECKLIST.md`).
4. **Record guide vocals:** you sing and rap *every* part over the rebuilt beat. Put each character on their own track, colored and named.
5. **Convert:** send Hazel's and the other models' parts through their models. Process Knight, Rook, Otis and Tre with their channel-strip presets or models.
6. **Comp:** pick the best phrases. Use Flex Pitch on long notes only, and keep the human drift.
7. **Mix:** each character keeps their preset chain. The lead sits loudest. Rook sits under the lead, dry and close.
8. **Check consistency:** A/B each character against their **reference clip** (below) before you bounce.

### Voice cards: keep one per character in this repo
```
CHARACTER: Rook
Source: my voice, chest register, slowed delivery
Range: G1–D3 (speech ~ C2 center)
Logic preset: ROOK VOX (Vocal Transformer −2 / −3, LP 9 kHz, Opto 4–6 dB)
Model: rook_v1 (trained 2026-10-xx on 18 min of processed takes)
Suno Persona: "Rook – Narrator" (from Stalemate 01 take 3)
Reference clip: refs/rook_ref.wav (the "Sixty-four squares" line)
Never: bright EQ, big reverb, fast flows unless the story turns violent
```

---

## 8. Rights, Credits and Release Checklist
- ✅ **Consent:** written consent from every person whose voice trains a model. Keep the signed agreement.
- ✅ **No imitation:** no voice models of real famous artists, and no prompts that name them.
- ✅ **Authorship:** keep your raw vocal sessions, lyric drafts and Logic projects. The human performance and writing are what copyright protects. Many offices, including the U.S. Copyright Office, don't protect purely AI-generated material. Keep the human part front and center.
- ✅ **Distribution:** check your distributor's and the streaming services' current rules on AI-assisted vocals. Some require you to disclose it, and all of them ban impersonating real people. Present Hazel, Rook and the rest as **characters of the Knight Lyfe project**.
- ✅ **Splits and credits:** credit the source singer of any voice model as agreed. Register songs with your PRO and The MLC, listing yourself as writer and performer.
- ✅ **Suno:** confirm your Suno plan allows commercial use of what you generate. Final releases should use your own re-recorded or converted vocals, not raw Suno vocals.
