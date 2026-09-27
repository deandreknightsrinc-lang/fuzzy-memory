# White-Label Playbook: Offering the System to Other Ministries

You're not selling "AI videos." You're selling **a finished weekly service and a weekly publication, delivered on time, in the ministry's own look and voice.** BAC Ministries is the first client and the proof that it works.

## 1. How the system is white-label

Everything that makes it "BAC" lives in one file: `brands/<ministry>/brand.yaml` (name, colors, fonts, staff, voice/avatar IDs, giving link). The service builder and newspaper generator read it. A new ministry is:

```bash
cp -r brands/_template brands/grace-fellowship
# fill in brands/grace-fellowship/brand.yaml
python -m studio new-week  2026-10-11 --brand grace-fellowship
python -m studio new-issue 2026-10-11 --brand grace-fellowship
```

No code changes. Brand, staff, and content are the only things that differ between clients.

## 2. Offer packages

Suggested starting points. Change them after your first 3 clients.

| Package | What they get each week | Client provides | Suggested monthly price |
|---|---|---|---|
| **Starter: Publication** | 4-page branded weekly newspaper (PDF + web page), written from their sermon notes | Sermon notes / recording, announcements | $300–$600 |
| **Standard: Cinema Service** | Full edited service video (countdown, cold open, lower thirds, scripture overlays, b-roll, captions, chapters, thumbnail) + 3 vertical clips | Raw sermon + worship footage, consent forms | $1,200–$2,500 |
| **Premium: Media Ministry** | Standard + newspaper + AI presenter segments for announcements + monthly series trailer + (later) weekly news show episode | Same + training session for voice/avatar | $3,000–$6,000 |
| One-time setup | Brand kit: logo sting, lower thirds, countdown, end card, templates, voice/avatar training, consent paperwork | Logo, colors, 30 min of clean pastor audio | $1,000–$3,000 |

What your costs look like per client: AI subscriptions (voice, avatar, b-roll credits), editor hours (target under 6 hrs/week per client once templates are built), and storage.

## 3. Onboarding a new ministry (2 weeks)

1. **Discovery call.** Service order, denomination/theology, Bible version, staff list, music licensing status.
2. **Consent and agreement.** Signed likeness consent for every person who will be cloned or avatared (see `04-consent-and-disclosure.md`). Signed service agreement that includes content ownership (the ministry owns its sermons and likeness) and what happens to voice/avatar models if they cancel (they get deleted).
3. **Brand profile.** Fill in `brand.yaml`. Build the brand kit.
4. **Voice and avatar training** (Premium only).
5. **Pilot week.** Produce one service + one issue. Pastor reviews. Adjust.
6. **Go live.** Lock the weekly schedule. Put the client's deadlines in writing: raw footage by Tuesday, approvals by Friday.

## 4. What the client does every week

| Day | Client | You |
|---|---|---|
| Mon | Sends title, scripture, outline, announcements | Fill in `service.yaml` + `issue.yaml`, run builders |
| Tue | Approves scripts | Generate AI segments + b-roll |
| Wed | Uploads raw sermon/worship footage | Edit |
| Fri | Pastor reviews the cut + newspaper | Fix revisions |
| Sat | — | Schedule premiere, clips, newspaper delivery |

## 5. Rules that protect you and your clients

- **Their likeness belongs to them.** Voice/avatar models go in the ministry's own tool accounts where possible, or get deleted when they cancel.
- **No AI sermon.** Standard and Premium packages produce AI for the *parts around* the sermon. If a client wants a fully AI-delivered message, it has to be clearly labeled, and it's worth talking through with them first.
- **Label AI.** YouTube's synthetic-content setting, plus a line in the description. The builder writes that line for you.
- **Music licensing is the client's responsibility.** Put it in the agreement. Don't upload unlicensed worship covers.
- **Theology review is the pastor's.** You produce; they approve. Nothing goes out without their approval.

## 6. Growing the business

1. BAC Ministries runs on the system for 8–12 weeks. Track views, watch time, member engagement, and online giving. That's your case study.
2. Make a 2-minute sizzle reel showing a before and after.
3. First 3 clients at a founding-member discount, in exchange for testimonials.
4. Get referrals through fellowships, conferences, and denominational networks. Pastors trust other pastors.
5. Once you have 5+ clients, hire a second editor and write the checklist into a standard operating procedure (SOP).
