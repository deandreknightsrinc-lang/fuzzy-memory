# The Weekly Publication → BAC Ministries AI News Show

## 1. What was wrong with the Word version, and what replaced it

I reviewed Issue #10 (`word-newspaper_BAC_MINISTIES.pdf`). The content on pages 1–2 is good. The Word template caused three problems:

- **Pages 3–4 and the Business Section were still the template's sample text** ("To make your document look professionally produced, Word provides header, footer…"). All the picture captions were sample text too. That's the first thing a reader notices.
- **Layout broke easily.** Every issue meant dragging text boxes around by hand.
- **The research article** (the MIT "magic spell hypothesis" study) had no credit to its source.

The new generator fixes all three. Each issue is one plain text file (`newspaper/issues/<date>/issue.yaml`). You fill in the words, and the layout builds itself into a print-ready PDF and a web page:

```bash
python -m studio new-issue 2026-10-11      # copies last week's issue as a starting point
# edit newspaper/issues/2026-10-11/issue.yaml
python -m studio newspaper newspaper/issues/2026-10-11
# → issue.html (email / website) + issue.pdf (print / attach)
```

Issue #10 has been moved over as an example (`newspaper/issues/2024-09-01/`) with a source line added. Issue #11 (`newspaper/issues/2026-10-04/`) is a template that goes with this week's service.

## 2. Standing sections

The newspaper is the **written version of Sunday**. Each section has a place in the service now and becomes a segment of the news show later.

| Section | Writer | Comes from | Later news show segment |
|---|---|---|---|
| Front page | Apostle Knight | This week's sermon | "Top Story" |
| The Minister's Inspirations | Apostle Knight | Theme scriptures | Opening scripture |
| The Word | Apostle Knight | Teaching article | "The Word" |
| The Prayer Weekly | Dr. Harris Bey | Service prayer segment | "Prayer Desk" |
| Business Section | Apostle Knight / guest | Trusts, estates, Kingdom economics | "Kingdom Business" |
| Community | Staff | Birthdays, testimonies, events | "Around the Ministry" |
| Classifieds / Public Notice | Staff | Events, member businesses | Lower-third ticker |

**Sponsorship:** the Member Business Directory and Classifieds can earn money right away. Members buy listings, and they carry over to the show as sponsor slots.

## 3. Getting the paper to members

- **PDF** attached to a weekly email (Mailchimp / Flodesk / Substack) and text message link.
- **Web page:** post `issue.html` on the ministry website, or publish it as a hosted link.
- **Print:** 20–50 copies for members without email, at the sanctuary door.
- Put the paper link in every service video description, and put the service link on the paper's front page.

## 4. From newspaper to news show (roadmap)

| Stage | Format | How |
|---|---|---|
| **1. Audio edition** (month 1–2) | 8–12 min podcast: the paper read aloud | The same ElevenLabs voice used in the service reads the articles; music bed added in Final Cut; publish to Spotify / Apple / YouTube |
| **2. Video bulletin** (month 3–4) | 5–8 min YouTube video | HeyGen presenter lip-synced to ElevenLabs audio of a script made from `issue.yaml`; OpenArt news-desk set and b-roll; assembled in Final Cut |
| **3. The BAC Ministries News Show** (month 5+) | 15–20 min weekly show | Two hosts (Apostle Knight + co-host), real or AI-assisted; segments from the table above; field pieces from members; sponsor slots from the directory |
| **4. White-label** | Same show for client ministries | Same brand-profile approach as the service; add it to the Premium package |

## 5. The show builder

```bash
python -m studio show  newspaper/issues/2026-10-04     # → newspaper/issues/2026-10-04/show/
python -m studio voice newspaper/issues/2026-10-04     # ElevenLabs audio for every AI line
```

It turns the week's `issue.yaml` into a produced show, in this order:

| # | Segment | Comes from |
|---|---|---|
| 1 | Cold open | The first three headlines, teased by the anchor |
| 2 | Show open | Title sting (graphics) |
| 3 | Welcome & Scripture | The anchor + the first verse in The Minister's Inspirations |
| 4 | Top Story | The front-page article |
| 5+ | The Word, Prayer Desk, Kingdom Business, Around the Ministry… | One segment per article, in issue order |
| | Field Report | `show: field_pieces:` in the issue (member testimonies, event recaps) |
| | Bulletin Board | The classifieds, read by the host and shown as a ticker |
| | Sponsor | `show: sponsor:` in the issue (a member business) |
| | Sign-off + End card | `news_show.sign_off` in the brand file |

**What you get in `show/`:**

- `rundown.md`: the timed rundown. Any line still holding `[placeholder]` text is flagged **NEEDS COPY**.
- `teleprompter.txt` and `scripts/`: every line, labeled by presenter.
- `heygen.md`: each AI-avatar line with its ElevenLabs audio and the file name to save as. It also lists who records what on camera.
- `prompts.md`: the OpenArt news-desk set (make it once) and b-roll for each story.
- `timeline.fcpxml`: a Final Cut project with one placeholder per line (so you can cut between anchors) and a chapter marker per segment.
- `youtube.md`: title, chapters (short ones folded so YouTube accepts them), and the AI label.

**Setting up the show (once, in `brand.yaml` → `news_show:`):**

- `anchor` / `co_anchor`: who hosts. The co-anchor reads the bulletin board.
- `host_source`: how each person appears (`ai_avatar`, `ai_voice`, or `recorded`). The builder won't make an AI version of anyone without `consent_on_file: true`.
- `desks`: who presents each section. The default is the article's author, so Dr. Harris presents the Prayer Desk.
- `max_story_minutes`: the time budget per section. Longer articles are trimmed at a sentence break and flagged in the rundown.

**For a tighter read:** add `show_copy:` to any article. The anchor reads that instead of the trimmed article. Newspaper writing and TV writing differ: TV uses short sentences, one idea each, and says the scripture reference before the verse.

It's the same brand-profile approach as everything else, so it's already white-label: a client's news show comes from their own `brand.yaml` and their own issues.
