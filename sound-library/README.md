# Knight Lyfe Sound Library

Two Mac scripts that build **your own sound library** on a drive, keep it
organized, and make it show up inside Logic Pro.

## 1. Build it

```
bash setup-library.sh
```

Pick a drive (an external drive is best). It creates **Knight Lyfe Sound Library** with a folder for everything:

```
Drums/        Kicks · Snares · Claps & Snaps · Hi-Hats · Cymbals · Toms · Percussion · 808s · Drum Loops · Kits
Keys/         Piano · Organ · Electric Piano · Synth Keys
Bass/         808 Bass · Synth Bass · Live Bass
Synths/       Pads · Leads · Plucks · Arps
Guitars · Strings & Brass · Choir & Vocals (Choir, Vocal Chops, Ad-libs, Acapellas)
FX/           Risers & Sweeps · Impacts · Transitions · Ambience & Textures
Loops · MIDI (Chord Progressions, Drum Grooves, Melodies) · Stems
Sampler Instruments · Patches · Channel Strip Settings · Project Templates
Knight Lyfe Kit Rack · Inbox (drop new sounds here)
```

and links it into Logic:

| Your folder | Where it appears in Logic |
| --- | --- |
| Sampler Instruments | Sampler / Quick Sampler instrument menu → Knight Lyfe |
| Patches | Library (Y) → User Patches → Knight Lyfe |
| Channel Strip Settings | channel strip Setting menu → Knight Lyfe |
| Project Templates | File → New from Template → My Templates → Knight Lyfe |
| Everything else | Browsers (F) → All Files, plus a shortcut in your Music folder |
| Loops | drag them into the Loop Browser (O) once; they appear under My Loops |

It also links the Kit Rack samples from the Knight Lyfe Ultimate plug-in into the library.

`bash setup-library.sh --check` reports where Logic's own sound library is, how big it is, and how much space each drive has.

## 2. Keep it organized

Drop new sounds (sample packs, your own recordings, kl-oracle stems) into **Inbox (drop new sounds here)**, then:

```
bash organize-samples.sh                    # sort the Inbox
bash organize-samples.sh "/path/to/Pack"    # copy a whole pack into the library, sorted
bash organize-samples.sh "/path/to/Pack" --dry-run   # just show what would go where
```

Files are sorted by name ("808 Bass C" → Bass/808 Bass, "Choir Ooh" → Choir & Vocals/Choir, "Rhodes Chords" → Keys/Electric Piano…). Nothing is ever overwritten. Files it can't place go to Inbox/Unsorted.

## 3. Knight Lyfe Sound Packs (free, included)

Original sounds made from scratch for Knight Lyfe: no samples from anyone else, royalty-free for your music, videos and church services (see each pack's LICENSE.txt). The download includes them in **Sound Library Tools/Sound Packs**, and `setup-library.sh` installs them for you, each file in its folder under the pack's name (run it again any time; nothing is copied twice).

| Pack | What's in it | Where it goes |
|---|---|---|
| **Knight Lyfe Drums Vol 1** | 12 kicks, 10 snares, 6 claps, 10 hi-hats, 6 cymbals, 6 toms, 10 percussion, 808s in all 12 keys (clean and dirty). 24-bit WAV | Drums/Kicks/Knight Lyfe Drums Vol 1, Drums/808s/…, … |
| **Knight Lyfe Gospel MIDI** | 8 gospel drum grooves (3 bars + a fill: shuffle, praise break, two-step, 6/8 ballad, neo-soul…) and 8 chord progressions in all 12 keys (worship 1-5-6-4, gospel 2-5-1, church 1-4-1-5, turnarounds, neo-soul, hymn, minor gospel, praise vamp) | MIDI/Drum Grooves/…, MIDI/Chord Progressions/… |

In Logic: drag the drums into **Drum Machine Designer** or **Quick Sampler** (or the Knight Lyfe Kit Rack), and the MIDI onto a Drum Kit, Knight Lyfe Ultimate or keys track.

Install a pack yourself: `bash organize-samples.sh --pack "/path/to/Knight Lyfe Drums Vol 1"`. The packs are made by `packs/make-packs.mjs` (`node packs/make-packs.mjs OUTDIR`); the same seed always makes the same sounds.

## Logic's own sounds

Logic's library can't be downloaded outside Logic. Move it to the same drive and get everything:

1. Logic Pro → Sound Library → **Relocate Sound Library…** → choose the drive.
2. Logic Pro → Sound Library → **Download All Available Sounds**.

The drive must be APFS or Mac OS Extended, and connected whenever you use Logic.
