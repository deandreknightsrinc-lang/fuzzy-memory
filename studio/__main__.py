"""Usage:
  python -m studio service   service/weeks/2026-10-04
  python -m studio voice     service/weeks/2026-10-04 [--force]   (needs ELEVENLABS_API_KEY)
  python -m studio newspaper newspaper/issues/2026-10-04 [--no-pdf]
  python -m studio new-week  2026-10-11 [--brand bac-ministries]
  python -m studio new-issue 2026-10-11 [--brand bac-ministries]
"""

import argparse
import shutil
import sys
from pathlib import Path

from . import newspaper, service, voice
from .brand import REPO_ROOT

STARTERS = {
    "new-week": (REPO_ROOT / "service" / "weeks", "service.yaml"),
    "new-issue": (REPO_ROOT / "newspaper" / "issues", "issue.yaml"),
}


def new_from_latest(kind: str, day: str, brand: str) -> Path:
    base, name = STARTERS[kind]
    latest = sorted(p for p in base.iterdir() if (p / name).exists())[-1]
    dest = base / day
    if (dest / name).exists():
        sys.exit(f"{dest / name} already exists")
    dest.mkdir(parents=True, exist_ok=True)
    text = (latest / name).read_text().replace(latest.name, day)
    text = "\n".join(
        f"brand: {brand}" if line.startswith("brand:")
        else f"date: {day}" if line.startswith("date:")
        else f"number: {int(line.split(':')[1]) + 1}" if line.startswith("number:")
        else line
        for line in text.splitlines()
    ) + "\n"
    (dest / name).write_text(text)
    shutil.copytree(latest / "images", dest / "images", dirs_exist_ok=True) if (latest / "images").exists() else None
    return dest / name


def main():
    ap = argparse.ArgumentParser(prog="studio", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["service", "voice", "newspaper", *STARTERS])
    ap.add_argument("target")
    ap.add_argument("--no-pdf", action="store_true")
    ap.add_argument("--force", action="store_true", help="voice: re-render audio files that already exist")
    ap.add_argument("--brand", default="bac-ministries")
    args = ap.parse_args()

    if args.command == "service":
        print(f"Service kit written to {service.build(Path(args.target))}")
    elif args.command == "voice":
        written = voice.render(Path(args.target), force=args.force)
        print(f"{len(written)} ElevenLabs file(s) rendered into {Path(args.target) / 'build' / 'audio'}")
    elif args.command == "newspaper":
        out = newspaper.build(Path(args.target), pdf=not args.no_pdf)
        print(f"Newspaper written to {out}" + ("" if args.no_pdf else " (+ issue.pdf)"))
    else:
        print(f"Created {new_from_latest(args.command, args.target, args.brand)} - edit it, then build.")


main()
