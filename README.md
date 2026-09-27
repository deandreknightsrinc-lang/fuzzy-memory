# BAC Ministries Studio

Two projects, one system. Both can be white-labeled for other ministries:

1. **AI Cinema Service.** A weekly, film-quality church service video that uses the whole pulpit staff.
2. **The Weekly Publication.** The BAC Ministries newspaper. Later it grows into an audio edition, then a video bulletin, then the BAC Ministries News Show.

## Start here

| Read | For |
|---|---|
| [docs/01-ai-cinema-service-blueprint.md](docs/01-ai-cinema-service-blueprint.md) | How the weekly service is produced: segments, staff roles, tools, weekly schedule |
| [docs/02-white-label-playbook.md](docs/02-white-label-playbook.md) | Packaging and selling it to other ministries |
| [docs/03-newspaper-to-news-show.md](docs/03-newspaper-to-news-show.md) | The newspaper, and the plan to turn it into a news show |
| [docs/04-consent-and-disclosure.md](docs/04-consent-and-disclosure.md) | Likeness consent form, AI labeling, copyright |

## Layout

```
brands/<ministry>/brand.yaml      one file per ministry: name, colors, fonts, staff, voice/avatar IDs
service/weeks/<date>/service.yaml one file per weekly service (the run of show + scripts)
newspaper/issues/<date>/issue.yaml one file per newspaper issue
studio/                           the builders
```

## Commands

Tools this is built around: **ElevenLabs** (voice), **HeyGen** (avatars), **OpenArt** (b-roll), **Final Cut Pro** (edit), with **Kaggle** for analytics.

**Mac setup (one time):** open Terminal, run `xcode-select --install` (gives you Python 3), then
`python3 -m pip install pyyaml jinja2`. Use `python3` wherever this page says `python`.
Newspaper PDF export uses Google Chrome if it's installed; otherwise open `issue.html` and Print → Save as PDF.

```bash
# Weekly service
python -m studio new-week 2026-10-11                  # copy last week as a starting point
python -m studio service service/weeks/2026-10-11     # → build/: run of show, scripts, HeyGen sheet, OpenArt prompts,
                                                      #   Final Cut timeline (timeline.fcpxml), YouTube package, checklist
export ELEVENLABS_API_KEY=your-key
python -m studio voice service/weeks/2026-10-11       # → build/audio/*.mp3, one ElevenLabs file per AI segment

# Weekly newspaper
python -m studio new-issue 2026-10-11
python -m studio newspaper newspaper/issues/2026-10-11   # → issue.html + issue.pdf

# Another ministry
cp -r brands/_template brands/<their-slug>             # fill in brand.yaml
python -m studio new-week 2026-10-11 --brand <their-slug>
```

## Examples in this repo

- `service/weeks/2026-10-04/` : "Death and Life Are in the Power of the Tongue" (Proverbs 18:21), with the full build output
- `newspaper/issues/2024-09-01/` : Issue #10, moved over from the original Word file
- `newspaper/issues/2026-10-04/` : Issue #11 template that goes with the 10/4 service
