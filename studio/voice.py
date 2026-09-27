"""Render ElevenLabs voice-overs for every AI segment of a service or a news show.

  export ELEVENLABS_API_KEY=...        (ElevenLabs > Profile > API Keys)
  python -m studio voice service/weeks/2026-10-04      -> service/weeks/2026-10-04/build/audio/
  python -m studio voice newspaper/issues/2026-10-04   -> newspaper/issues/2026-10-04/show/audio/
                                                          (run `python -m studio show` first)

The files for avatar segments/lines are what you upload to HeyGen ("Upload audio") so the avatar
lip-syncs to the cloned voice. Existing files are skipped so you never pay for the same audio
twice; use --force to redo.
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from .brand import Brand, load_yaml
from .service import AI_SOURCES, check_consent, speakable_text

API = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
MAX_CHARS = 9000


def service_jobs(week_dir: Path):
    """(brand, [(filename, speaker_key, text, label)]) for a service week."""
    week = load_yaml(week_dir / "service.yaml")
    brand = Brand(week["brand"])
    problems = check_consent(brand, week["segments"])
    if problems:
        raise SystemExit("Refusing to render - likeness consent missing:\n  " + "\n  ".join(problems))
    jobs = [
        (f"{n:02d}-{seg['id']}.mp3", seg["speaker"], speakable_text(seg), seg["id"])
        for n, seg in enumerate(week["segments"], 1)
        if seg.get("source") in AI_SOURCES
    ]
    return brand, jobs, week_dir / "build" / "audio"


def show_jobs(issue_dir: Path):
    from . import newsshow
    brand, _, segments = newsshow.plan(issue_dir)
    jobs = [
        (Path(line["audio"]).name, line["host"], line["text"], f"{seg['id']} line {line['n']}")
        for seg in segments for line in seg["lines"] if line["audio"]
    ]
    return brand, jobs, issue_dir / "show" / "audio"


def render(target: Path, force: bool = False) -> list:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("Set ELEVENLABS_API_KEY first (ElevenLabs > Profile > API Keys).")

    brand, jobs, out = show_jobs(target) if (target / "issue.yaml").exists() else service_jobs(target)
    settings = brand.data.get("elevenlabs", {})

    # Validate everything before spending any credits.
    for filename, speaker, text, label in jobs:
        person = brand.person(speaker)
        if not person.get("voice_id"):
            raise SystemExit(f"No voice_id for {person['name']} in brands/{brand.slug}/brand.yaml "
                             "(ElevenLabs > Voices > your voice > copy Voice ID).")
        if "[" in text:
            raise SystemExit(f"'{label}' still has [placeholder] text - finish the script first.")
        if len(text) > MAX_CHARS:
            raise SystemExit(f"'{label}' is {len(text)} characters; split it (limit {MAX_CHARS}).")

    out.mkdir(parents=True, exist_ok=True)
    written = []
    for filename, speaker, text, label in jobs:
        path = out / filename
        if path.exists() and not force:
            print(f"skip  {path.name} (exists)")
            continue
        body = json.dumps({
            "text": text,
            "model_id": settings.get("model_id", "eleven_multilingual_v2"),
            "voice_settings": {
                "stability": settings.get("stability", 0.5),
                "similarity_boost": settings.get("similarity_boost", 0.8),
                "style": settings.get("style", 0.0),
                "use_speaker_boost": True,
            },
        }).encode()
        req = urllib.request.Request(
            API.format(voice_id=brand.person(speaker)["voice_id"]), data=body, method="POST",
            headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                path.write_bytes(resp.read())
        except urllib.error.HTTPError as e:
            raise SystemExit(f"ElevenLabs error on '{label}': {e.code} {e.read().decode(errors='replace')[:300]}")
        print(f"wrote {path.name}")
        written.append(path)
    return written
