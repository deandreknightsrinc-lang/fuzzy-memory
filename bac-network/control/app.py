"""BAC Control Room: a password-protected web page for running the channels.

Upload shows, edit each channel's weekly schedule and see what's on air,
without touching files on the server. Uses only the Python standard library.

Run:  CONTROL_PASSWORD=... python app.py
"""

import base64
import hmac
import json
import os
import re
import shutil
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

SCHEDULE_DIR = Path(os.environ.get("SCHEDULE_DIR", "/schedule"))
MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", "/media"))
PUBLIC_DIR = Path(os.environ.get("PUBLIC_DIR", "/public"))
STATIC_DIR = Path(__file__).resolve().parent / "static"
CHANNELS = [c.strip() for c in os.environ.get("CHANNELS", "tv1,tv2").split(",") if c.strip()]
USER = os.environ.get("CONTROL_USER", "bac")
PASSWORD = os.environ.get("CONTROL_PASSWORD", "")

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_WORDS = {"daily", "weekdays", "weekends"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".m4v", ".webm", ".avi", ".ts"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._()&'-]{0,120}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
STATIC_TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml"}


class Invalid(ValueError):
    pass


def safe_name(name, what="name"):
    if not SAFE_NAME.match(name or "") or ".." in name:
        raise Invalid(f"That {what} can only use letters, numbers, spaces and . _ - ( ) & '")
    return name


def validate_schedule(data):
    """Check a schedule sent from the page and return it cleaned up, or raise Invalid."""
    if not isinstance(data, dict) or not isinstance(data.get("slots"), list):
        raise Invalid("The schedule is missing its list of slots.")
    try:
        ZoneInfo(data.get("timezone", "UTC"))
    except (ZoneInfoNotFoundError, ValueError):
        raise Invalid(f"Unknown time zone: {data.get('timezone')}")
    out = {k: data[k] for k in ("channel", "timezone", "filler", "filler_title") if k in data}
    out["slots"] = []
    for i, s in enumerate(data["slots"], 1):
        title = str(s.get("title", "")).strip()
        label = f"Slot {i} ({title or 'untitled'})"
        if not title:
            raise Invalid(f"{label} needs a title.")
        days = s.get("days", "daily")
        day_list = days if isinstance(days, list) else [days]
        for d in day_list:
            if d not in DAY_WORDS and d not in DAYS:
                raise Invalid(f"{label}: unknown day '{d}'.")
        if isinstance(days, list) and not days:
            raise Invalid(f"{label}: pick at least one day.")
        for key in ("start", "end"):
            if not TIME.match(str(s.get(key, ""))):
                raise Invalid(f"{label}: {key} time must look like 07:30.")
        if s["start"] == s["end"]:
            raise Invalid(f"{label}: start and end can't be the same.")
        slot = {"days": days, "start": s["start"], "end": s["end"], "title": title}
        kind = s.get("type", "shows")
        if kind == "live":
            slot["type"] = "live"
        elif kind == "shows":
            slot["folder"] = safe_name(str(s.get("folder", "")).strip(), "show folder")
            if s.get("order") == "shuffle":
                slot["order"] = "shuffle"
        else:
            raise Invalid(f"{label}: type must be shows or live.")
        out["slots"].append(slot)
    clashes = overlaps(out["slots"])
    if clashes:
        raise Invalid(clashes)
    return out


def expand(days):
    groups = {"daily": DAYS, "weekdays": DAYS[:5], "weekends": DAYS[5:]}
    out = []
    for d in days if isinstance(days, list) else [days]:
        out += groups.get(d, [d])
    return out


def minutes(hm):
    h, m = hm.split(":")
    return int(h) * 60 + int(m)


def overlaps(slots):
    """Describe the first pair of slots that overlap in the week, or return None."""
    week = 7 * 24 * 60
    spans = []
    for s in slots:
        length = (minutes(s["end"]) - minutes(s["start"])) % (24 * 60)
        for d in expand(s["days"]):
            start = DAYS.index(d) * 24 * 60 + minutes(s["start"])
            spans.append((start, start + length, s["title"]))
    for i, (a0, a1, at) in enumerate(spans):
        for b0, b1, bt in spans[i + 1:]:
            for shift in (0, week, -week):
                if a0 < b1 + shift and b0 + shift < a1:
                    return f"'{at}' and '{bt}' overlap. Change a time or a day so they don't."
    return None


def channel_dir(ch):
    if ch not in CHANNELS:
        raise Invalid("Unknown channel.")
    return MEDIA_DIR / ch


def read_json(path, default=None):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def channel_info(ch):
    sched = read_json(SCHEDULE_DIR / f"{ch}.json", {"slots": []})
    folders = []
    base = channel_dir(ch)
    if base.is_dir():
        for d in sorted(p for p in base.iterdir() if p.is_dir() and not p.name.startswith(".")):
            files = sorted(
                (f for f in d.iterdir() if f.is_file() and f.suffix.lower() in VIDEO_EXTS),
                key=lambda f: f.name.lower(),
            )
            folders.append({
                "name": d.name,
                "files": [{"name": f.name, "size": f.stat().st_size, "modified": int(f.stat().st_mtime)} for f in files],
            })
    slate = base / "slate.png"
    return {
        "id": ch,
        "schedule": sched,
        "onair": read_json(PUBLIC_DIR / f"{ch}.json"),
        "folders": folders,
        "slate": slate.exists(),
        "free_bytes": shutil.disk_usage(MEDIA_DIR if MEDIA_DIR.exists() else "/").free,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "BACControl/1"

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {fmt % args}", flush=True)

    # ----- helpers -----

    def send_json(self, data, status=HTTPStatus.OK):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def fail(self, message, status=HTTPStatus.BAD_REQUEST):
        self.send_json({"error": message}, status)

    def authorized(self):
        header = self.headers.get("Authorization", "")
        if PASSWORD and header.startswith("Basic "):
            try:
                user, _, pw = base64.b64decode(header[6:]).decode().partition(":")
            except ValueError:
                return False
            return hmac.compare_digest(user.encode(), USER.encode()) & hmac.compare_digest(pw.encode(), PASSWORD.encode())
        return False

    def guard(self):
        if self.authorized():
            return True
        self.send_response(HTTPStatus.UNAUTHORIZED)
        self.send_header("WWW-Authenticate", 'Basic realm="BAC Control Room"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def parts(self):
        return [unquote(p) for p in urlparse(self.path).path.strip("/").split("/") if p]

    def read_body(self, limit=1_000_000):
        length = int(self.headers.get("Content-Length") or 0)
        if length > limit:
            raise Invalid("Request too large.")
        return self.rfile.read(length)

    # ----- routes -----

    def do_GET(self):
        if not self.guard():
            return
        p = self.parts()
        if p == ["api", "channels"]:
            return self.send_json([channel_info(c) for c in CHANNELS])
        name = "index.html" if not p else "/".join(p)
        path = (STATIC_DIR / name).resolve()
        if STATIC_DIR in path.parents and path.is_file():
            body = path.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", STATIC_TYPES.get(path.suffix, "application/octet-stream"))
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.fail("Not found", HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        if not self.guard():
            return
        p = self.parts()
        try:
            if len(p) == 3 and p[:2] == ["api", "schedule"]:
                channel_dir(p[2])
                data = validate_schedule(json.loads(self.read_body() or b"{}"))
                path = SCHEDULE_DIR / f"{p[2]}.json"
                tmp = path.with_name(f".{path.name}.tmp")
                tmp.write_text(json.dumps(data, indent=2) + "\n")
                tmp.replace(path)
                return self.send_json({"ok": True, "schedule": data})
            if len(p) == 5 and p[:2] == ["api", "upload"]:
                return self.upload(p[2], p[3], p[4])
        except Invalid as e:
            return self.fail(str(e))
        except ValueError:
            return self.fail("That wasn't valid JSON.")
        self.fail("Not found", HTTPStatus.NOT_FOUND)

    def upload(self, ch, folder, filename):
        base = channel_dir(ch)
        safe_name(filename, "file name")
        ext = Path(filename).suffix.lower()
        if folder == "_slate":
            if ext not in IMAGE_EXTS:
                raise Invalid("The holding screen must be a PNG or JPG image.")
            dest = base / "slate.png"
        else:
            safe_name(folder, "show folder")
            if ext not in VIDEO_EXTS:
                raise Invalid("That isn't a video file this system can play (use MP4, MOV, MKV, M4V, WEBM, AVI or TS).")
            dest = base / folder / filename
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            raise Invalid("The file is empty.")
        if length > shutil.disk_usage(MEDIA_DIR).free - 1_000_000_000:
            raise Invalid("Not enough free space on the server for this file.")
        dest.parent.mkdir(parents=True, exist_ok=True)
        part = dest.with_name(f".{dest.name}.part")
        remaining = length
        with open(part, "wb") as f:
            while remaining:
                chunk = self.rfile.read(min(remaining, 1 << 20))
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)
        if remaining:
            part.unlink(missing_ok=True)
            raise Invalid("The upload was cut off. Please try again.")
        # The hidden .part name keeps the playout from picking up a half-uploaded file.
        part.replace(dest)
        self.send_json({"ok": True, "name": dest.name})

    def do_POST(self):
        if not self.guard():
            return
        p = self.parts()
        try:
            if len(p) == 4 and p[:2] == ["api", "folder"]:
                (channel_dir(p[2]) / safe_name(p[3], "show folder")).mkdir(parents=True, exist_ok=True)
                return self.send_json({"ok": True})
        except Invalid as e:
            return self.fail(str(e))
        self.fail("Not found", HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        if not self.guard():
            return
        p = self.parts()
        try:
            if len(p) == 5 and p[:2] == ["api", "file"]:
                path = channel_dir(p[2]) / safe_name(p[3], "show folder") / safe_name(p[4], "file name")
                if not path.is_file():
                    raise Invalid("That file is already gone.")
                path.unlink()
                return self.send_json({"ok": True})
            if len(p) == 4 and p[:2] == ["api", "folder"]:
                path = channel_dir(p[2]) / safe_name(p[3], "show folder")
                if any(f for f in path.iterdir() if not f.name.startswith(".")):
                    raise Invalid("Remove the videos in this show first.")
                shutil.rmtree(path)
                return self.send_json({"ok": True})
        except FileNotFoundError:
            return self.fail("That show doesn't exist.")
        except Invalid as e:
            return self.fail(str(e))
        self.fail("Not found", HTTPStatus.NOT_FOUND)


def main():
    if not PASSWORD:
        raise SystemExit("Set CONTROL_PASSWORD before starting the Control Room.")
    port = int(os.environ.get("PORT", "8080"))
    print(f"BAC Control Room on port {port}, channels: {', '.join(CHANNELS)}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
