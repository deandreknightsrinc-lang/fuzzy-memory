# BAC Ministries AI Cinema Service: Weekly Production Blueprint

**Goal:** every week, put out a 60–70 minute service video that looks like a filmed church service. It should use the whole pulpit staff, stay true to the Word, and be something a small team can make again every week without burning out.

**Main rule:** *AI does the production work. People do the ministry.* The sermon, prayer, and invitation are real people on real camera. AI handles everything around them: b-roll, voice-overs, presenter segments, graphics, captions, clips, and the paperwork. Viewers can tell a real preacher from a digital one. The sermon is the one place you can't afford to get that wrong.

---

## 1. What makes a service video look like a real one

Polished church broadcasts all share the same parts. Build each part once and reuse it every week:

| Element | What it is | How we make it |
|---|---|---|
| Countdown | 3–5 min pre-roll with music and a timer | Motion template (CapCut / Canva / After Effects), reused weekly |
| Cold open | 45–90 s cinematic teaser of the message | AI voice-over of the pastor + AI b-roll + a clip from the sermon |
| Brand ident | 5–10 s logo sting | Made once |
| Lower thirds | Name/title bar for each speaker | Template driven by `brand.yaml` colors |
| Scripture overlays | Verse on screen as it is read | Built from the `scripture:` and `outline:` fields |
| Multi-angle look | Wide shot, medium shot, close-up cuts | Record the sermon with 2 phones (wide + close), or 1 4K camera cropped in the edit |
| B-roll | Cutaways that illustrate points | AI video (Runway, Kling, Veo, Sora, Pika) + stock (Pexels, Storyblocks) |
| Music bed | Soft pad under transitions, prayer, offering | Licensed or royalty-free only |
| Captions | Burned in or uploaded | CapCut auto-captions / Descript / YouTube auto, then proofread |
| Chapters | Timestamps in the description | Generated in `youtube.md` |
| End card | Subscribe, next week, give | Template |

## 2. Who does what (the pulpit staff)

Each person in `brands/bac-ministries/brand.yaml` has `roles`. The run of show assigns segments to them.

| Role | Person | Segment(s) | Real or AI |
|---|---|---|---|
| Senior Pastor / Apostle | Apostle Sir DeAndre Knight | Sermon, invitation | **Real camera** |
| | | Welcome, announcements, benediction | AI avatar (with his consent) or real |
| | | Cold open, scripture, offering | AI voice-over over b-roll |
| Minister of Prayer | Dr. Minister Daniel Alejandro Harris Bey | Weekly prayer | Real camera (or AI once he signs consent) |
| Worship leader | *(add)* | Worship set | Real praise team recording |
| Associate ministers | *(add)* | Scripture reading, testimony, announcements | Real or AI with consent |
| Deacon / board | *(add)* | Offering exhortation | Real or AI with consent |
| Producer / editor | *(add)* | Edit, upload, clips | — |

**Tip:** give each associate minister one fixed segment every week. It builds their presence with the members and spreads out the recording work.

## 3. Your tools: ElevenLabs, HeyGen, OpenArt, Final Cut Pro, Kaggle

| Job | Your tool | How it connects to this repo |
|---|---|---|
| Voice (every AI line) | **ElevenLabs** | `python -m studio voice <week>` renders one MP3 per AI segment into `build/audio/` using each minister's `voice_id` |
| Talking-head presenter | **HeyGen** | `build/heygen.md` lists each avatar segment, its `avatar_id`, and the ElevenLabs audio to upload |
| B-roll, thumbnails | **OpenArt** | `build/prompts.md`: image prompts with one shared style, then image-to-video |
| Edit, captions, clips | **Final Cut Pro** | `build/timeline.fcpxml`: import it and every segment is already on the timeline with chapter markers |
| Numbers / growth tracking | **Kaggle** | Optional; see "Where Kaggle fits" below |
| Scripts, social copy | Claude | Draft the cold open, announcements, and newspaper articles from the sermon outline |
| Music | CCLI Streaming License or royalty-free | Put it in the `songs:` license field so it's on record |

### One voice for everything: ElevenLabs → HeyGen

Make the audio in **ElevenLabs first**, then give that file to **HeyGen** ("Upload audio") instead of typing the script into HeyGen. The apostle's voice then sounds the same in avatar segments, voice-overs, the newspaper audio edition, and the news show. It's also your own clone, not a HeyGen stock voice.

- **Clone:** ElevenLabs *Professional Voice Clone* trained on 30+ minutes of clean sermon audio (a lav mic, no crowd noise, no music). Copy the Voice ID into `brand.yaml`.
- **Settings:** in `brand.yaml` under `elevenlabs:`. Stability around 0.5 gives a natural preaching cadence. Raise it if the voice wanders.
- **Scripture:** the builder rewrites "Proverbs 18:20-21" as "Proverbs chapter 18, verses 20 through 21" so the voice reads references aloud correctly.
- **Placeholders:** the voice command refuses any script that still has `[bracketed]` text, so you never pay credits to have ElevenLabs read "[giving link]" out loud.

### HeyGen avatar tips

- Record the avatar training footage in the **same outfit, set, and light** as your real sermon camera. Then cutting from the real sermon to an avatar welcome or benediction looks like one room.
- Use avatars for the short, repeatable parts: welcome, announcements, benediction. Keep them to 1–3 minutes.
- Export 1080p 16:9 and save each file with the name in `heygen.md`, so it matches the placeholder in Final Cut.

### OpenArt b-roll

- Generate stills at 16:9 with the shared style suffix, keep the best of 4, then image-to-video with a slow camera move (push-in, pan, parallax). Slow moves look cinematic, and fast AI motion looks fake.
- Use a 9:16 version of the same prompts for Reels and Shorts.
- Keep a folder of your best b-roll. After a few months you'll reuse more than you generate.
- **Don't generate real ministers' faces in OpenArt.** Real people come from the camera or their own HeyGen avatar, made with their consent.

### Final Cut Pro workflow

1. **File → Import → XML** → `build/timeline.fcpxml`. You get a project with a labeled placeholder for every segment, at its planned length, with a chapter marker and a to-do marker naming the file that goes there.
2. Drop each clip over its placeholder (from HeyGen, the camera, and worship), then connect voice-overs and OpenArt b-roll above.
3. Build your lower third, scripture overlay, and countdown **once** as Motion templates saved in Titles. Every week after that is drag and drop.
4. Captions: **Transcribe to Captions**, then proofread names and Scripture references.
5. **Share → YouTube & Facebook** keeps the chapter markers. Paste the description from `youtube.md`.
6. For vertical clips, duplicate the project, switch it to vertical, and use **Smart Conform**.

The timeline is 1080p at 30 fps. If you shoot 24 fps for a film look, change it in Project Properties after import.

### Where Kaggle fits

Kaggle is for notebooks and data. It isn't part of the weekly video production, but it's useful in two places:

- **Growth dashboard (recommended):** each month, export YouTube Studio analytics (views, watch time, subscribers, and which segments people drop off at) as CSV, and chart them in a Kaggle notebook. That tells you which segments to shorten, and it's the proof you'll show other ministries when you sell the white-label service.
- **Running the builders without a Mac setup:** a Kaggle notebook can run these Python commands. On a Mac with Final Cut, running them locally in Terminal is simpler (see the README).

## 4. The weekly pipeline

```
Mon  service.yaml ──► python -m studio service service/weeks/<date>
                        ├─ scripts/*.txt      → each minister approves their script
                        ├─ run_of_show.md     → whole team sees order and timing
                        ├─ heygen.md          → avatar segments + which audio to upload
                        ├─ prompts.md         → OpenArt b-roll + thumbnail
                        ├─ timeline.fcpxml    → Final Cut Pro project, pre-laid
                        ├─ edit_list.csv      → same order as a spreadsheet
                        ├─ youtube.md         → title, description, chapters, AI disclosure
                        └─ checklist.md       → the week, day by day
Tue  scripts approved ──► python -m studio voice service/weeks/<date>   (ElevenLabs → build/audio/)
Wed  record real segments (camera) · HeyGen avatars from the audio · OpenArt b-roll
Thu  Final Cut Pro: import timeline.fcpxml, fill placeholders, titles, captions
Fri  pastor review (theology + accuracy on every AI line)
Sat  Share → YouTube Premiere + vertical clips; newspaper PDF out
Sun  premiere, with live chat moderators and prayer team online
```

Start a new week by copying the last one:

```bash
python -m studio new-week 2026-10-11
# edit service/weeks/2026-10-11/service.yaml
python -m studio service service/weeks/2026-10-11
export ELEVENLABS_API_KEY=your-key      # once per Terminal window
python -m studio voice service/weeks/2026-10-11
```

The builder and the voice command **will not run** if a segment uses an AI avatar or AI voice for someone whose `consent_on_file` is `false`. That check is on purpose. See `04-consent-and-disclosure.md`.

## 5. Recording the real parts so they look cinematic (low budget)

- **Two angles:** phone A on a tripod with a wide shot of the pulpit. Phone B on the pastor from the waist up. Both at 4K/24fps or 30fps. Sync them in the edit on a clap.
- **Light:** one large soft light 45° to the side, a little above eye level, plus one light behind for separation. Turn off the overhead lights that cause raccoon eyes.
- **Audio matters more than video:** a wireless lav (Rode Wireless GO, DJI Mic) on the speaker. Record room tone for 30 s.
- **Background:** a real sanctuary, or a branded set (the backdrop color from `brand.yaml`, one plant, a lamp, the logo). Keep it the same every week.
- **Grade:** one LUT/preset used on everything so real and AI footage match.

## 6. Build it in three phases

| Phase | Weeks | What you do |
|---|---|---|
| 1. Foundation | 1–4 | Brand kit in Final Cut/Motion (logo sting, lower thirds, countdown, end card). Consent signed. ElevenLabs Professional Voice Clone + HeyGen avatar trained. First 2 services made with this pipeline. |
| 2. Consistency | 5–12 | Same day, same time, every week. Add associate ministers to fixed segments. Start 3 vertical clips a week. Newspaper goes out every week with the service. |
| 3. Scale | 13+ | Sermon series with trailers. Member testimonies. Start packaging the white-label version (`02-white-label-playbook.md`). |

## 7. Quality checks before every upload

- [ ] Every Scripture reference matches the version you named (KJV / NKJV / NLT) word for word
- [ ] No AI segment says anything the pastor has not read and approved
- [ ] Every AI likeness has a signed consent on file
- [ ] YouTube "altered or synthetic content" is set to **Yes** when realistic AI people/voices are used
- [ ] Music is owned, licensed (CCLI streaming), or royalty-free
- [ ] Captions proofread (names, Scripture references)
- [ ] Loudness about -14 LUFS, no clipping
