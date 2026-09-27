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

## 3. Tools by job

Plug in the tools you already use. Each job only needs one tool.

| Job | Options |
|---|---|
| Sermon prep and scripts | Claude / ChatGPT (outline, cold-open script, announcements, social copy) |
| Voice cloning / TTS | ElevenLabs (Professional Voice Clone from 30+ min of the pastor's clean audio) |
| Talking-head avatar | HeyGen (Custom/Digital Twin), Synthesia, Captions.ai |
| AI b-roll video | Runway, Kling, Google Veo, OpenAI Sora, Pika, Luma |
| AI stills / thumbnails | Midjourney, Ideogram (good with text), Canva, Adobe Firefly |
| Editing | CapCut (fastest), DaVinci Resolve (free, pro color), Premiere Pro, Descript (edit by transcript) |
| Captions and clips | CapCut, Opus Clip, Descript |
| Audio cleanup | Adobe Podcast Enhance, Descript Studio Sound |
| Streaming / premiere | YouTube Premieres; Restream to push to Facebook as well |
| Worship music license | CCLI Streaming License (if you use covers); or original / royalty-free |

## 4. The weekly pipeline

The repo does the planning and paperwork. You and your team do the ministry and the edit.

```
Mon  service.yaml ──► python -m studio service service/weeks/<date>
                        │
                        ├─ scripts/*.txt      → each minister reviews and approves their script
                        ├─ prompts.md         → generate b-roll + thumbnail
                        ├─ run_of_show.md     → whole team sees the order and timing
                        ├─ edit_list.csv      → editor assembles in this order
                        ├─ youtube.md         → title, description, chapters, AI disclosure
                        └─ checklist.md       → the week, day by day
Wed  record real segments + generate AI segments
Thu  edit
Fri  pastor review (theology + accuracy on every AI line)
Sat  schedule YouTube Premiere + clips; newspaper PDF out
Sun  premiere, with live chat moderators and prayer team online
```

Start a new week by copying the last one:

```bash
python -m studio new-week 2026-10-11
# edit service/weeks/2026-10-11/service.yaml
python -m studio service service/weeks/2026-10-11
```

The builder **will not run** if a segment uses an AI avatar or AI voice for someone whose `consent_on_file` is `false`. That check is on purpose. See `04-consent-and-disclosure.md`.

## 5. Recording the real parts so they look cinematic (low budget)

- **Two angles:** phone A on a tripod with a wide shot of the pulpit. Phone B on the pastor from the waist up. Both at 4K/24fps or 30fps. Sync them in the edit on a clap.
- **Light:** one large soft light 45° to the side, a little above eye level, plus one light behind for separation. Turn off the overhead lights that cause raccoon eyes.
- **Audio matters more than video:** a wireless lav (Rode Wireless GO, DJI Mic) on the speaker. Record room tone for 30 s.
- **Background:** a real sanctuary, or a branded set (the backdrop color from `brand.yaml`, one plant, a lamp, the logo). Keep it the same every week.
- **Grade:** one LUT/preset used on everything so real and AI footage match.

## 6. Build it in three phases

| Phase | Weeks | What you do |
|---|---|---|
| 1. Foundation | 1–4 | Brand kit (logo sting, lower thirds, countdown, end card). Consent signed. Voice clone trained. First 2 services made with this pipeline. |
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
