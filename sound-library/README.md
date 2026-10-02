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

## Logic's own sounds

Logic's library can't be downloaded outside Logic. Move it to the same drive and get everything:

1. Logic Pro → Sound Library → **Relocate Sound Library…** → choose the drive.
2. Logic Pro → Sound Library → **Download All Available Sounds**.

The drive must be APFS or Mac OS Extended, and connected whenever you use Logic.
