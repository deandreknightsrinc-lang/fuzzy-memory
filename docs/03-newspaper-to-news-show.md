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

The next step in code, when you're ready: a `python -m studio newsshow` builder that turns an `issue.yaml` into a segment-by-segment show script and teleprompter files. It's the same pattern as the service builder, and it only makes sense once the paper is going out every week.
