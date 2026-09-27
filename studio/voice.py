"""Render ElevenLabs voice-overs for every AI segment of a service.

  export ELEVENLABS_API_KEY=...        (ElevenLabs > Profile > API Keys)
  python -m studio voice service/weeks/2026-10-04

Writes build/audio/NN-<id>.mp3 for each ai_voice / ai_avatar segment. The ai_avatar files
are what you upload to HeyGen ("Upload audio") so the avatar lip-syncs to the cloned voice.
Existing files are skipped so you never pay for the same audio twice; use --force to redo.
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


def render(week_dir: Path, force: bool = False) -> list:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("Set ELEVENLABS_API_KEY first (ElevenLabs > Profile > API Keys).")

    week = load_yaml(week_dir / "service.yaml")
    brand = Brand(week["brand"])
    segments = week["segments"]
    problems = check_consent(brand, segments)
    if problems:
        raise SystemExit("Refusing to render - likeness consent missing:\n  " + "\n  ".join(problems))

    settings = brand.data.get("elevenlabs", {})
    out = week_dir / "build" / "audio"
    out.mkdir(parents=True, exist_ok=True)
    written = []

    for n, seg in enumerate(segments, 1):
        if seg.get("source") not in AI_SOURCES:
            continue
        person = brand.person(seg["speaker"])
        if not person.get("voice_id"):
            raise SystemExit(f"No voice_id for {person['name']} in brands/{brand.slug}/brand.yaml "
                             "(ElevenLabs > Voices > your voice > copy Voice ID).")
        text = speakable_text(seg)
        if "[" in text:
            raise SystemExit(f"Segment '{seg['id']}' still has [placeholder] text - finish the script first.")
        if len(text) > MAX_CHARS:
            raise SystemExit(f"Segment '{seg['id']}' is {len(text)} characters; split it (limit {MAX_CHARS}).")

        path = out / f"{n:02d}-{seg['id']}.mp3"
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
            API.format(voice_id=person["voice_id"]), data=body, method="POST",
            headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                path.write_bytes(resp.read())
        except urllib.error.HTTPError as e:
            raise SystemExit(f"ElevenLabs error on '{seg['id']}': {e.code} {e.read().decode(errors='replace')[:300]}")
        print(f"wrote {path.name}")
        written.append(path)
    return written
