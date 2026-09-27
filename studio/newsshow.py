"""Build the weekly news show from a newspaper issue: newspaper/issues/<date>/issue.yaml.

  python -m studio show newspaper/issues/2026-10-04

Outputs (in <issue>/show/):
  rundown.md           timed TV-style rundown: segment, presenter, source, length, NEEDS COPY flags
  teleprompter.txt     the whole show, line by line, labeled by presenter
  scripts/NN-<id>.txt  one teleprompter file per segment
  heygen.md            every AI-avatar line with its ElevenLabs audio file and save-as name
  prompts.md           OpenArt prompts: news desk set + b-roll per story
  timeline.fcpxml      Final Cut Pro project: one placeholder per line, chapter marker per segment
  youtube.md           title, description with chapters, AI disclosure

How the show is shaped is set once in the brand profile (`news_show:`); per-week extras
(a sponsor read, a field piece, segments to skip) go under `show:` in issue.yaml.
Anchor copy comes from the article's `show_copy:` if you write one, otherwise from the
article body, trimmed at a sentence boundary to the segment's time budget.
"""

import re
from pathlib import Path

from . import fcpxml
from .brand import Brand, load_yaml
from .service import AI_SOURCES, spoken_ref, timecode

DESK_NAMES = {
    "front": "Top Story",
    "the_word": "The Word",
    "prayer_weekly": "Prayer Desk",
    "business": "Kingdom Business",
    "community": "Around the Ministry",
}

DEFAULTS = {
    "name": None,                # defaults to "<ministry name> News"
    "anchor": None,              # defaults to the newspaper editor
    "co_anchor": None,
    "host_source": {},           # staff key -> ai_avatar | ai_voice | recorded
    "desks": {},                 # section -> staff key; default: article author, else anchor
    "words_per_minute": 150,
    "max_story_minutes": {"front": 4, "the_word": 3, "business": 3, "community": 2},
    "default_story_minutes": 2,
    "ident_seconds": 10,
    "end_card_seconds": 15,
    "sign_off": "That's the news for this week. Stay in the Word, and we'll see you next week.",
}


def clean_for_speech(text: str) -> str:
    """Article markup -> plain spoken sentences."""
    out = []
    for block in re.split(r"\n\s*\n", (text or "").strip()):
        block = " ".join(block.split())
        block = re.sub(r"^(##|>)\s*", "", block)
        block = block.replace("*", "")
        if block:
            out.append(sentence(block))
    return spoken_ref(" ".join(out))


def sentence(text: str) -> str:
    text = " ".join(str(text).split())
    core = text.rstrip("\"'”)")  # 'He said "Amen."' ends a sentence; '"Let There Be Light"' does not
    return text if not text or (core and core[-1] in ".!?") else text + "."


def trim_to_words(text: str, budget: int) -> tuple[str, bool]:
    """Cut at a sentence boundary so the read fits the time budget. Returns (text, was_trimmed)."""
    words = text.split()
    if len(words) <= budget:
        return text, False
    sentences = re.findall(r".+?[.!?][\"'”)]*(?=\s|$)|.+$", text)
    kept, count = [], 0
    for s in sentences:
        s = s.strip()
        n = len(s.split())
        if kept and count + n > budget:
            break
        kept.append(s)
        count += n
    return " ".join(kept), True


def plan(issue_dir: Path):
    """Work out the whole show. Returns (brand, issue, segments)."""
    issue = load_yaml(issue_dir / "issue.yaml")
    brand = Brand(issue["brand"])
    cfg = {**DEFAULTS, **{k: v for k, v in (brand.data.get("news_show") or {}).items() if v not in ("", None)}}
    week = issue.get("show") or {}
    wpm = cfg["words_per_minute"]
    name = cfg["name"] or f"{brand.ministry['name']} News"
    anchor = cfg["anchor"] or brand.newspaper.get("editor") or next(iter(brand.staff))
    co_anchor = cfg["co_anchor"]
    skip = set(week.get("skip", []))

    def source_of(key):
        return cfg["host_source"].get(key, "recorded")

    def desk_host(section, article):
        if section in cfg["desks"]:
            return cfg["desks"][section]
        if article.get("author") in brand.staff:
            return article["author"]
        return anchor

    segments = []

    def add(seg_id, title, lines, kind="story", chapter=True, fixed_seconds=None, broll=None, lower_thirds=None, notes=None):
        if seg_id in skip:
            return
        segments.append({"id": seg_id, "title": title, "kind": kind, "chapter": chapter, "fixed_seconds": fixed_seconds,
                         "lines": [{"host": h, "text": t} for h, t in lines if t],
                         "broll": broll or [], "lower_thirds": lower_thirds or [], "notes": notes or []})

    articles = issue.get("articles", [])
    front = next((a for a in articles if a.get("section") == "front"), None)

    # Cold open: tease the top three headlines.
    teases = [a["headline"] for a in articles[:3] if a.get("headline")]
    if teases:
        heads = [sentence(t) for t in teases]
        if len(heads) > 1:
            heads[-1] = "And " + heads[-1]
        tease = f"This week on {name}. " + " ".join(heads)
        add("cold-open", "Cold Open", [(anchor, tease)], kind="open")

    add("ident", "Show Open", [], kind="graphics", chapter=False, fixed_seconds=cfg["ident_seconds"],
        notes=[f"Animated '{name}' title sting + music hit."])

    # Welcome + opening scripture from the Minister's Inspirations.
    anchor_name = brand.person(anchor)["name"]
    welcome = f"Welcome to {name}. I'm {anchor_name}."
    if co_anchor:
        welcome += f" Alongside me is {brand.person(co_anchor)['name']}."
    lines = [(anchor, welcome)]
    verses = (issue.get("inspirations") or {}).get("verses") or []
    if verses:
        v = verses[0]
        lines.append((anchor, f"Our scripture this week: {spoken_ref(v['ref'])}. {' '.join(v['text'].split())}"))
    add("welcome", "Welcome & Scripture", lines, kind="open", lower_thirds=[f"{anchor_name} | {brand.person(anchor).get('title', '')}"])

    # One segment per article, front page first.
    ordered = ([front] if front else []) + [a for a in articles if a is not front]
    previous_host = anchor
    for i, a in enumerate(ordered):
        section = a.get("section", "news")
        desk = DESK_NAMES.get(section, section.replace("_", " ").title())
        host = desk_host(section, a)
        host_name = brand.person(host)["name"]
        budget = int(cfg["max_story_minutes"].get(section, cfg["default_story_minutes"]) * wpm)

        seg_notes = []
        if a.get("show_copy"):
            body = clean_for_speech(a["show_copy"])
        else:
            body, trimmed = trim_to_words(clean_for_speech(a.get("body", "")), budget)
            if trimmed:
                seg_notes.append(f"Auto-trimmed from the article to about {timecode(budget / wpm * 60)}. "
                                 "Write `show_copy:` on the article for a tighter broadcast read.")

        if i == 0 and section == "front":
            intro = sentence(f"Our top story: {a['headline']}")
        elif desk.lower() in a["headline"].lower():
            intro = sentence(f"Now to {a['headline']}")
        else:
            intro = sentence(f"Now to {desk if desk.startswith('The ') else 'the ' + desk}: {a['headline']}")
        if a.get("deck"):
            intro += " " + sentence(a["deck"])

        lines = []
        if host == previous_host or host == anchor:
            lines.append((host, clean_for_speech(intro)))
        else:
            lines.append((anchor, clean_for_speech(intro) + f" Here's {host_name}."))
        lines.append((host, body))
        if a.get("source"):
            seg_notes.append(f"On-screen source credit: {a['source']}")
        seg_id = "top-story" if section == "front" else section.replace("_", "-")
        if any(x["id"] == seg_id for x in segments):
            seg_id += f"-{i + 1}"
        add(seg_id, desk, lines,
            broll=[f"Cinematic b-roll illustrating: {a['headline']}"],
            lower_thirds=[f"{desk.upper()} | {a['headline']}", f"{host_name}"], notes=seg_notes)
        previous_host = host

    # Field piece(s): pre-recorded video from members; the anchor introduces it.
    for n, f in enumerate(week.get("field_pieces", []), 1):
        add(f"field-{n}", "Field Report", [(anchor, f.get("intro", f"Here's a report from {f.get('who', 'the field')}."))],
            kind="field", fixed_seconds=None,
            notes=[f"Roll field piece: {f.get('file', f'clips/field-{n}.mp4')} ({f.get('minutes', 2)} min)"])
        segments[-1]["extra_seconds"] = float(f.get("minutes", 2)) * 60

    # Bulletin board from the classifieds.
    ads = issue.get("classifieds") or []
    if ads:
        read = "On the bulletin board this week. " + " ".join(f"{ad['title']}: {ad['text']}".rstrip(".") + "." for ad in ads)
        add("bulletin", "Bulletin Board", [(co_anchor or anchor, read)], kind="bulletin",
            lower_thirds=[f"Ticker: {ad['title']} - {ad['text']}" for ad in ads])

    # Sponsor read.
    sponsor = week.get("sponsor")
    if sponsor:
        add("sponsor", "Sponsor", [(anchor, f"This week's show is supported by {sponsor['name']}. {sponsor.get('read', '')}".strip())],
            kind="sponsor", chapter=False, lower_thirds=[f"Supported by {sponsor['name']}"])

    add("sign-off", "Sign-off", [(anchor, cfg["sign_off"])], kind="close")
    add("end-card", "End Card", [], kind="graphics", chapter=False, fixed_seconds=cfg["end_card_seconds"],
        notes=["Subscribe, read the full issue (link), next week's service premiere time."])

    # Number lines, attach sources, files and timing.
    t = 0.0
    for n, seg in enumerate(segments, 1):
        seg["n"] = n
        seg["start"] = t
        for ln, line in enumerate(seg["lines"], 1):
            src = source_of(line["host"])
            stem = f"{n:02d}-{seg['id']}-{ln:02d}-{line['host']}"
            line.update({
                "n": ln, "source": src,
                "seconds": max(3.0, len(line["text"].split()) / wpm * 60),
                "clip": f"clips/{stem}.mp4",
                "audio": f"audio/{stem}.mp3" if src in AI_SOURCES else "",
                "needs_copy": "[" in line["text"],
            })
        seconds = seg["fixed_seconds"] if seg["fixed_seconds"] else sum(l["seconds"] for l in seg["lines"])
        seconds += seg.get("extra_seconds", 0)
        seg["seconds"] = seconds
        t += seconds

    # YouTube drops ALL chapters if any is under 10 s, so fold short ones into the one before.
    chapters = [x for x in segments if x["chapter"]]
    for cur, nxt in zip(chapters[1:], chapters[2:] + [None]):
        end = nxt["start"] if nxt else t
        if end - cur["start"] < 10:
            cur["chapter"] = False
            cur["notes"].append("Too short for its own YouTube chapter (<10 s); folded into the previous chapter.")

    # Consent: no AI likeness for anyone without it on file.
    problems = sorted({
        f"{brand.person(l['host'])['name']} is set to {l['source']} in news_show.host_source, but consent_on_file is false."
        for s in segments for l in s["lines"]
        if l["source"] in AI_SOURCES and not brand.person(l["host"]).get("consent_on_file")
    })
    if problems:
        raise SystemExit("Refusing to build the show - likeness consent missing:\n  " + "\n  ".join(problems))

    issue["_show_name"] = name
    return brand, issue, segments


def build(issue_dir: Path) -> Path:
    brand, issue, segments = plan(issue_dir)
    name = issue["_show_name"]
    out = issue_dir / "show"
    (out / "scripts").mkdir(parents=True, exist_ok=True)
    total = sum(s["seconds"] for s in segments)

    def who(key):
        return brand.person(key)["name"]

    # Rundown
    r = [f"# {name} - Rundown", f"Issue #{issue['number']} | {issue['date']} | Runtime about **{timecode(total)}**", "",
         "| # | Start | Segment | Presenter(s) | Source | Length | Status |",
         "|---|-------|---------|--------------|--------|--------|--------|"]
    for s in segments:
        hosts = ", ".join(dict.fromkeys(who(l["host"]) for l in s["lines"])) or "-"
        sources = ", ".join(dict.fromkeys(l["source"] for l in s["lines"])) or "graphics"
        status = "**NEEDS COPY**" if any(l["needs_copy"] for l in s["lines"]) else ("review trim" if s["notes"] and "Auto-trimmed" in s["notes"][0] else "ok")
        r.append(f"| {s['n']} | {timecode(s['start'])} | {s['title']} | {hosts} | {sources} | {timecode(s['seconds'])} | {status} |")
    r.append("")
    for s in segments:
        r.append(f"## {s['n']}. {s['title']} ({timecode(s['start'])})")
        for lt in s["lower_thirds"]:
            r.append(f"- Lower third: {lt}")
        for note in s["notes"]:
            r.append(f"- Note: {note}")
        for l in s["lines"]:
            r.append(f"- **{who(l['host'])}** ({l['source']}, ~{timecode(l['seconds'])}) → `{l['clip']}`")
        r.append("")
    (out / "rundown.md").write_text("\n".join(r))

    # Teleprompter
    full = [f"{name} | Issue #{issue['number']} | {issue['date']}", "=" * 60, ""]
    for s in segments:
        seg_lines = [f"[{s['n']}. {s['title'].upper()}]", ""]
        for l in s["lines"]:
            seg_lines += [f"{who(l['host']).upper()}:", l["text"], ""]
        if not s["lines"]:
            seg_lines += ["(graphics only)", ""]
        full += seg_lines
        (out / "scripts" / f"{s['n']:02d}-{s['id']}.txt").write_text("\n".join(seg_lines))
    (out / "teleprompter.txt").write_text("\n".join(full))

    # HeyGen hand-off
    avatar_lines = [(s, l) for s in segments for l in s["lines"] if l["source"] == "ai_avatar"]
    h = [f"# HeyGen Hand-off - {name}, Issue #{issue['number']}", "",
         "Run `python -m studio voice` on this issue first. Then for each row: HeyGen > Create Video > avatar > "
         "**Upload audio** (the file below) > export 1080p 16:9 > save as the last column.",
         "Use the same news-desk background for every line so the cuts between anchors match.", "",
         "| Segment | Line | Presenter | Avatar ID | Audio | Save as |", "|---|---|---|---|---|---|"]
    for s, l in avatar_lines:
        h.append(f"| {s['n']}. {s['title']} | {l['n']} | {who(l['host'])} | "
                 f"{brand.person(l['host']).get('avatar_id') or '(set avatar_id)'} | {l['audio']} | {l['clip']} |")
    if not avatar_lines:
        h.append("| - | - | No avatar lines - set `news_show.host_source` in brand.yaml | | | |")
    recorded = [(s, l) for s in segments for l in s["lines"] if l["source"] == "recorded"]
    if recorded:
        h += ["", "## On camera (record with the teleprompter)", ""]
        h += [f"- {who(l['host'])}: segment {s['n']} line {l['n']} → `{l['clip']}`" for s, l in recorded]
    (out / "heygen.md").write_text("\n".join(h) + "\n")

    # OpenArt prompts
    style = (f"cinematic, 35mm film, warm tungsten and window light, shallow depth of field, reverent, "
             f"gold accent {brand.colors['accent']}, no text")
    p = [f"# OpenArt Prompt Pack - {name}, Issue #{issue['number']}", "",
         f"**Style suffix (add to every prompt):** `{style}`", "",
         "## News desk set (make once, reuse every week)", "",
         f"- Modern broadcast news desk for a church news program, deep {brand.colors['primary']} and gold "
         f"{brand.colors['accent']} palette, large screen behind the desk, soft stained-glass light, empty chair, 16:9",
         "- Same set, wide establishing shot with slow dolly-in (image-to-video)", "",
         "## B-roll per story (16:9, then image-to-video with a slow push-in)", ""]
    for s in segments:
        for b in s["broll"]:
            p.append(f"- [{s['n']}. {s['title']}] {b}")
    p += ["", "Never generate a real minister's face here - presenters come from camera or their own HeyGen avatar."]
    (out / "prompts.md").write_text("\n".join(p) + "\n")

    # Final Cut timeline: one placeholder per line, chapter marker on the first line of each segment.
    items = []
    for s in segments:
        if not s["lines"]:
            items.append({"label": f"{s['n']:02d} {s['title']}", "seconds": s["seconds"], "chapter": s["chapter"],
                          "todo": s["notes"][0] if s["notes"] else "Graphics"})
            continue
        for l in s["lines"]:
            items.append({
                "label": f"{s['n']:02d} {s['title']}" + (f" ({l['n']})" if len(s["lines"]) > 1 else ""),
                "seconds": l["seconds"], "chapter": s["chapter"] and l["n"] == 1,
                "todo": f"Place {l['clip']}" + (f" (audio: {l['audio']})" if l["audio"] else ""),
            })
        if s.get("extra_seconds"):
            items.append({"label": f"{s['n']:02d} {s['title']} (roll)", "seconds": s["extra_seconds"], "chapter": False,
                          "todo": s["notes"][0]})
    (out / "timeline.fcpxml").write_text(fcpxml.build(
        items, project_name=f"{name} #{issue['number']}", event_name=f"{brand.ministry['short_name']} News {issue['date']}"))

    # YouTube
    uses_ai = any(l["source"] in AI_SOURCES for s in segments for l in s["lines"])
    top = next((a for a in issue.get("articles", []) if a.get("section") == "front"), None)
    y = [f"# YouTube Upload - {name}, Issue #{issue['number']}", "",
         f"**Title:** {name} | {top['headline'] if top else issue['date']} | Issue #{issue['number']}",
         "", "**Description:**", "", "```",
         f"{name} - Issue #{issue['number']} ({issue['date']})", "", "Chapters:"]
    chapters = [s for s in segments if s["chapter"]]
    for i, s in enumerate(chapters):
        y.append(f"{'0:00' if i == 0 else timecode(s['start'])} {s['title']}")  # YouTube needs the first at 0:00
    y += ["", f"Read the full issue: {brand.ministry.get('website') or '[issue link]'}",
          f"Give: {brand.ministry.get('giving_url') or '[giving link]'}"]
    if uses_ai:
        y += ["", "Presenters in portions of this program are AI-generated with the permission of the ministers shown."]
    y += ["```", ""]
    if uses_ai:
        y.append("**Upload setting:** answer **Yes** to YouTube's \"Altered or synthetic content\" question.")
    (out / "youtube.md").write_text("\n".join(y) + "\n")

    return out
