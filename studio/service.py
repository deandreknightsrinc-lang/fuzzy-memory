"""Build a weekly service production kit from service/weeks/<date>/service.yaml.

Outputs (in <week>/build/):
  run_of_show.md         timecoded order of service for the whole team
  scripts/NN-<id>.txt    teleprompter / text-to-speech scripts, one per segment
  edit_list.csv          the editor's assembly list: order, timecodes, source, expected asset file
  prompts.md             OpenArt prompt pack: b-roll stills -> image-to-video, thumbnail, social clips
  heygen.md              HeyGen hand-off: avatar + ElevenLabs audio file for each avatar segment
  timeline.fcpxml        Final Cut Pro timeline with a labeled placeholder + chapter marker per segment
  youtube.md             title, description with chapters, tags, AI disclosure
  checklist.md           who does what, Monday through Sunday
"""

import csv
import re
from pathlib import Path

from . import fcpxml
from .brand import Brand, load_yaml

AI_SOURCES = {"ai_avatar", "ai_voice"}

SOURCE_LABEL = {
    "ai_avatar": "AI avatar video",
    "ai_voice": "AI voice-over + b-roll",
    "recorded": "Camera recording",
    "music": "Music / worship video",
    "graphics": "Motion graphics",
}


def timecode(seconds: float) -> str:
    seconds = int(round(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def fill(text: str, brand: Brand, week: dict, seg: dict) -> str:
    return text.format(
        ministry=brand.ministry["name"],
        series=week.get("series", ""),
        title=week.get("title", ""),
        giving_url=brand.ministry.get("giving_url") or "[giving link]",
        next_title=seg.get("next_title", ""),
        countdown="{countdown}",
    )


def segment_script(seg: dict) -> str:
    """Everything a speaker (human or AI) reads for this segment."""
    parts = []
    if seg.get("script"):
        parts.append(seg["script"].strip())
    for s in seg.get("scripture", []):
        parts.append(f"{s['ref']}\n{s['text'].strip()}")
    if seg.get("items"):
        parts.append("\n".join(f"- {i}" for i in seg["items"]))
    if seg.get("outline"):
        parts.append("\n".join(
            f"{o['point']}  ({o.get('scripture', '')})\n   {o.get('notes', '')}" for o in seg["outline"]
        ))
    return "\n\n".join(parts)


def spoken_ref(ref: str) -> str:
    """'Proverbs 18:20-21' -> 'Proverbs chapter 18, verses 20 through 21' so the AI voice reads it naturally."""
    def one(m):
        book, ch, v1, v2 = m.group(1), m.group(2), m.group(3), m.group(4)
        return f"{book} chapter {ch}, verse{'s' if v2 else ''} {v1}" + (f" through {v2}" if v2 else "")
    return re.sub(r"((?:[1-3] )?[A-Z][a-z]+) (\d+):(\d+)(?:-(\d+))?", one, ref)


def speakable_text(seg: dict) -> str:
    """Exactly what the AI voice says: script, scripture and announcements, no outline notes."""
    parts = []
    if seg.get("script"):
        parts.append(spoken_ref(seg["script"].strip()))
    for s in seg.get("scripture", []):
        parts.append(f"{spoken_ref(s['ref'])}. {' '.join(s['text'].split())}")
    for item in seg.get("items", []):
        parts.append(item)
    return "\n\n".join(parts)


def check_consent(brand: Brand, segments: list) -> list:
    problems = []
    for seg in segments:
        if seg.get("source") in AI_SOURCES and seg.get("speaker"):
            person = brand.person(seg["speaker"])
            if not person.get("consent_on_file"):
                problems.append(
                    f"Segment '{seg['id']}' uses {seg['source']} for {person['name']}, "
                    "but consent_on_file is false in the brand profile."
                )
    return problems


def build(week_dir: Path) -> Path:
    week = load_yaml(week_dir / "service.yaml")
    brand = Brand(week["brand"])
    segments = week["segments"]

    problems = check_consent(brand, segments)
    if problems:
        raise SystemExit("Refusing to build - likeness consent missing:\n  " + "\n  ".join(problems))

    out = week_dir / "build"
    (out / "scripts").mkdir(parents=True, exist_ok=True)

    t = 0.0
    rows = []
    for n, seg in enumerate(segments, 1):
        start, t = t, t + float(seg.get("minutes", 0)) * 60
        speaker = brand.person(seg["speaker"]) if seg.get("speaker") else None
        rows.append({
            "n": n, "seg": seg, "start": start, "end": t, "speaker": speaker,
            "asset": f"assets/{n:02d}-{seg['id']}.mp4",
            "script": segment_script(seg),
            "audio": f"audio/{n:02d}-{seg['id']}.mp3" if seg.get("source") in AI_SOURCES else "",
        })

    # Scripts
    for r in rows:
        if r["script"]:
            who = r["speaker"]["name"] if r["speaker"] else ""
            header = f"{week['title']} | {r['seg']['id']} | {who}\n{'=' * 60}\n\n"
            (out / "scripts" / f"{r['n']:02d}-{r['seg']['id']}.txt").write_text(header + r["script"] + "\n")

    # Run of show
    lines = [
        f"# Run of Show - {brand.ministry['name']}",
        f"**{week['date']}** | Series: *{week.get('series', '')}* | Message: **{week['title']}** ({week.get('theme_scripture', '')})",
        "",
        "| # | Start | Segment | Speaker | Source | Length |",
        "|---|-------|---------|---------|--------|--------|",
    ]
    for r in rows:
        seg = r["seg"]
        lines.append(
            f"| {r['n']} | {timecode(r['start'])} | {seg['type'].replace('_', ' ').title()} | "
            f"{r['speaker']['name'] if r['speaker'] else '-'} | {SOURCE_LABEL.get(seg['source'], seg['source'])} | "
            f"{timecode(r['end'] - r['start'])} |"
        )
    lines += ["", f"**Total runtime: {timecode(t)}**", ""]
    for r in rows:
        seg = r["seg"]
        lines.append(f"## {r['n']}. {seg['type'].replace('_', ' ').title()} ({timecode(r['start'])})")
        if seg.get("on_screen"):
            lines.append("On screen: " + "; ".join(fill(x, brand, week, seg) for x in seg["on_screen"]))
        if seg.get("songs"):
            for s in seg["songs"]:
                lines.append(f"- Song: {s.get('title') or '[title]'} - {s.get('artist') or '[artist]'} ({s.get('license', '')})")
        if seg.get("notes"):
            lines.append(f"Notes: {seg['notes']}")
        if r["script"]:
            lines += ["", "```", r["script"], "```"]
        lines.append("")
    (out / "run_of_show.md").write_text("\n".join(lines))

    # Edit list
    with open(out / "edit_list.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["order", "segment", "start", "end", "source", "speaker", "expected_asset", "elevenlabs_audio", "on_screen", "script_file"])
        for r in rows:
            seg = r["seg"]
            w.writerow([
                r["n"], seg["id"], timecode(r["start"]), timecode(r["end"]), seg["source"],
                r["speaker"]["name"] if r["speaker"] else "", r["asset"], r["audio"],
                " | ".join(fill(x, brand, week, seg) for x in seg.get("on_screen", [])),
                f"scripts/{r['n']:02d}-{seg['id']}.txt" if r["script"] else "",
            ])

    # Prompt pack
    p = [f"# OpenArt Prompt Pack - {week['title']}", "",
         "1. **Create Image** in OpenArt with each prompt below at **16:9** (b-roll) - generate 4, keep the best.",
         "2. Send the keeper to **image-to-video** (5-10 s, slow camera move: push-in, pan, or parallax).",
         "3. Save as `broll/<segment>-<n>.mp4` and drop it over that segment in Final Cut.",
         "",
         "Keep the same style suffix on every prompt so the whole service looks like one film. "
         "Never generate a real minister's face in OpenArt - real people come from camera footage or their HeyGen avatar.", "",
         "**Style suffix:** `cinematic, 35mm film, warm tungsten and window light, shallow depth of field, "
         f"reverent, gold accent {brand.colors['accent']}, no text`", ""]
    for r in rows:
        for prompt in r["seg"].get("broll", []):
            p.append(f"- [{r['seg']['id']} @ {timecode(r['start'])}] {prompt}")
    p += ["", "## Thumbnail", "",
          f"- Close-up portrait photo of the speaker (real photo, not AI) on the right third; left side bold text "
          f"\"{week['title'].upper()}\"; background: open Bible in dramatic light; brand colors {brand.colors['primary']} / {brand.colors['accent']}.",
          "", "## Social clips (cut from the sermon in Final Cut)", "",
          "- 3 vertical 9:16 clips (Final Cut: duplicate project, change to vertical, use Smart Conform), 30-60s each, one per sermon point, burned-in captions, end with the service link."]
    for o in next((s.get("outline", []) for s in segments if s["type"] == "sermon"), []):
        p.append(f"  - {o['point']} ({o.get('scripture', '')})")
    (out / "prompts.md").write_text("\n".join(p) + "\n")

    # HeyGen hand-off
    h = [f"# HeyGen Hand-off - {week['date']}", "",
         "For each segment: HeyGen > Create Video > pick the avatar > **Upload audio** > choose the ElevenLabs file "
         "from `build/audio/` (made by `python -m studio voice`). Using the ElevenLabs audio keeps the voice identical "
         "across HeyGen, voice-overs and the news show.", "",
         "Export: 1080p, 16:9, then save as the file name in the last column.", "",
         "| # | Segment | Avatar | Avatar ID | Audio file | Save as |",
         "|---|---------|--------|-----------|------------|---------|"]
    avatar_rows = [r for r in rows if r["seg"]["source"] == "ai_avatar"]
    for r in avatar_rows:
        h.append(f"| {r['n']} | {r['seg']['id']} | {r['speaker']['name']} | "
                 f"{r['speaker'].get('avatar_id') or '(set avatar_id in brand.yaml)'} | {r['audio']} | {r['asset']} |")
    if not avatar_rows:
        h.append("| - | No avatar segments this week | | | | |")
    h += ["", "## Scripts (in case you type instead of uploading audio)", ""]
    for r in avatar_rows:
        h += [f"### {r['n']}. {r['seg']['id']}", "", "```", speakable_text(r["seg"]), "```", ""]
    (out / "heygen.md").write_text("\n".join(h) + "\n")

    # Final Cut Pro timeline
    (out / "timeline.fcpxml").write_text(fcpxml.build(
        rows, project_name=f"{week['date']} {week['title']}", event_name=f"{brand.ministry['short_name']} {week['date']}"))

    # YouTube package
    uses_ai = any(r["seg"]["source"] in AI_SOURCES for r in rows)
    y = [f"# YouTube Upload - {week['date']}", "",
         f"**Title:** {week['title']} | {week.get('series', '')} | {brand.ministry['name']}", "",
         "**Description:**", "", "```",
         f"{week['title']} - {week.get('theme_scripture', '')}",
         f"Series: {week.get('series', '')}", "",
         "Chapters:"]
    for r in rows:
        if r["end"] > r["start"]:
            y.append(f"{timecode(r['start'])} {r['seg']['type'].replace('_', ' ').title()}")
    y += ["", f"Give: {brand.ministry.get('giving_url') or '[giving link]'}",
          f"Website: {brand.ministry.get('website') or '[website]'}"]
    if uses_ai:
        y += ["", "Portions of this service (voice-over, presenter segments, and b-roll) were produced "
                  "with AI tools, with the permission of the ministers shown. The sermon is delivered by the pastor."]
    y += ["```", "",
          "**Tags:** sermon, church service, " + ", ".join(filter(None, [brand.ministry["name"], week.get("series"), week.get("theme_scripture")])),
          ""]
    if uses_ai:
        y.append("**Upload setting:** answer **Yes** to YouTube's \"Altered or synthetic content\" question (realistic AI people/voices).")
    (out / "youtube.md").write_text("\n".join(y) + "\n")

    # Weekly checklist
    owners = {r["speaker"]["name"] for r in rows if r["speaker"]}
    c = [f"# Production Checklist - week of {week['date']}", "",
         "## Monday - plan",
         "- [ ] Senior pastor locks title, theme scripture, sermon outline in service.yaml",
         "- [ ] Newspaper editor opens the matching issue.yaml (same theme)",
         "## Tuesday - scripts",
         "- [ ] Run the builder; send each speaker their file from build/scripts/"]
    c += [f"- [ ] {name}: review and approve script" for name in sorted(owners)]
    c += ["## Wednesday - record & generate",
          "- [ ] Record all `recorded` segments (sermon, prayer, invitation)",
          "- [ ] ElevenLabs: `python -m studio voice <week>` renders every AI voice file into build/audio/",
          "- [ ] HeyGen: make each avatar segment from its ElevenLabs audio (see heygen.md)",
          "- [ ] OpenArt: generate b-roll stills, then image-to-video (see prompts.md)",
          "## Thursday - edit (Final Cut Pro)",
          "- [ ] File > Import > XML > build/timeline.fcpxml: segments + chapter markers are pre-laid",
          "- [ ] Drop each clip over its placeholder (the to-do marker names the file); drop voice-overs + b-roll",
          "- [ ] Lower thirds, scripture overlays, captions (Final Cut: Transcribe to Captions), color grade, loudness -14 LUFS",
          "- [ ] Share > YouTube & Facebook keeps the chapter markers",
          "## Friday - review",
          "- [ ] Pastor watches full cut; theology + accuracy check on every AI segment",
          "- [ ] Newspaper issue finalized and exported to PDF",
          "## Saturday - schedule",
          "- [ ] Upload as YouTube Premiere using youtube.md; set thumbnail",
          "- [ ] Schedule social clips",
          f"## {brand.ministry.get('service_day', 'Sunday')} - premiere {brand.ministry.get('service_time', '')}",
          "- [ ] Live chat moderators + prayer team online",
          "- [ ] Send newspaper + service link to members (email / text)"]
    (out / "checklist.md").write_text("\n".join(c) + "\n")

    return out
