"""BAC playout: keeps one channel on air around the clock.

Reads the channel's weekly schedule, plays the right shows at the right time,
steps aside during live slots so OBS can go live, and fills gaps with filler
videos or a slate. Everything goes out over one continuous connection, so
viewers don't drop between programmes.

Run:  python playout.py tv1
"""

import json
import os
import random
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_GROUPS = {
    "daily": DAYS,
    "weekdays": DAYS[:5],
    "weekends": DAYS[5:],
}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".m4v", ".webm", ".avi", ".ts"}

WIDTH, HEIGHT, FPS = 1280, 720, 30


# ---------- schedule ----------

def expand_days(days):
    out = []
    for d in days if isinstance(days, list) else [days]:
        d = d.strip().lower()
        out += DAY_GROUPS.get(d, [d[:3]])
    return out


def parse_hm(s):
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def load_schedule(path):
    with open(path) as f:
        sched = json.load(f)
    for slot in sched.get("slots", []):
        slot["_days"] = expand_days(slot.get("days", "daily"))
        slot["_start"] = parse_hm(slot["start"])
        slot["_end"] = parse_hm(slot["end"])
        slot.setdefault("type", "shows")
    return sched


def occurrences(slot, around):
    """Start/end datetimes of this slot in the week around `around` (yesterday to +7 days)."""
    base = around.replace(hour=0, minute=0, second=0, microsecond=0)
    for offset in range(-1, 8):
        day = base + timedelta(days=offset)
        if DAYS[day.weekday()] not in slot["_days"]:
            continue
        start = day + timedelta(minutes=slot["_start"])
        length = (slot["_end"] - slot["_start"]) % (24 * 60) or 24 * 60
        yield start, start + timedelta(minutes=length)


def current_slot(sched, now):
    """The slot on air now, with its end time, or (None, None)."""
    for slot in sched["slots"]:
        for start, end in occurrences(slot, now):
            if start <= now < end:
                return slot, end
    return None, None


def upcoming(sched, now, count=5):
    """The next `count` slots starting after now, soonest first."""
    found = []
    for slot in sched["slots"]:
        for start, end in occurrences(slot, now):
            if start > now:
                found.append((start, end, slot))
    found.sort(key=lambda x: x[0])
    return found[:count]


def next_start(sched, now):
    nxt = upcoming(sched, now, 1)
    return nxt[0][0] if nxt else now + timedelta(hours=1)


# ---------- media ----------

def videos_in(folder):
    if not folder.is_dir():
        return []
    return sorted(p for p in folder.rglob("*") if p.suffix.lower() in VIDEO_EXTS and not p.name.startswith("."))


class State:
    """Remembers which episode each slot played last, so shows advance day to day."""

    def __init__(self, path):
        self.path = path
        try:
            self.data = json.loads(path.read_text())
        except (OSError, ValueError):
            self.data = {}

    def pick(self, key, files, order):
        if not files:
            return None
        if order == "shuffle":
            last = self.data.get(key)
            choices = [f for f in files if str(f) != last] or files
            choice = random.choice(choices)
        else:
            names = [str(f) for f in files]
            last = self.data.get(key)
            i = (names.index(last) + 1) % len(files) if last in names else 0
            choice = files[i]
        self.data[key] = str(choice)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2))
        return choice


def has_audio(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    return bool(out.stdout.strip())


# ---------- output ----------

class Transmitter:
    """One long-lived connection to the channel. Each programme is encoded to the
    same format and fed in with continuous timestamps, so the stream never breaks."""

    def __init__(self, output):
        self.output = output
        self.proc = None
        self.started = 0.0

    def ensure(self):
        if self.proc and self.proc.poll() is None:
            return
        fmt = "flv" if self.output.startswith("rtmp") or self.output.endswith(".flv") else "mpegts"
        self.proc = subprocess.Popen(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts",
             "-f", "mpegts", "-i", "pipe:0", "-c", "copy", "-f", fmt, self.output],
            stdin=subprocess.PIPE,
        )
        self.started = time.monotonic()

    def stop(self):
        if self.proc:
            try:
                self.proc.stdin.close()
            except OSError:
                pass
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.proc.kill()
            self.proc = None

    def play(self, inputs, seconds, audio):
        """Encode `inputs` (ffmpeg input args) for up to `seconds` into the stream."""
        self.ensure()
        offset = time.monotonic() - self.started
        vf = (f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
              f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,fps={FPS},format=yuv420p")
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-re", *inputs]
        if not audio:
            # Silent track for videos without sound; -shortest stops it with the video.
            cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest"]
        cmd += [
            "-map", "0:v:0", "-map", "0:a:0" if audio else "1:a:0",
            "-t", f"{max(seconds, 1):.2f}",
            "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency", "-b:v", "3000k",
            "-maxrate", "3000k", "-bufsize", "6000k", "-g", str(FPS * 2), "-keyint_min", str(FPS * 2),
            "-sc_threshold", "0", "-x264-params", "repeat-headers=1",
            "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
            "-output_ts_offset", f"{offset:.3f}",
            "-f", "mpegts", "pipe:1",
        ]
        prog = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        try:
            while chunk := prog.stdout.read(188 * 512):
                self.proc.stdin.write(chunk)
                self.proc.stdin.flush()
        except (BrokenPipeError, OSError):
            # The channel connection dropped (Owncast restarting, network). Reconnect next round.
            prog.kill()
            self.proc = None
        prog.wait()


# ---------- channel loop ----------

class Channel:
    def __init__(self, channel_id, schedule_dir, media_dir, state_dir, public_dir, output):
        self.id = channel_id
        self.schedule_path = Path(schedule_dir) / f"{channel_id}.json"
        self.media = Path(media_dir) / channel_id
        self.public = Path(public_dir)
        self.state = State(Path(state_dir) / f"{channel_id}.json")
        self.tx = Transmitter(output)

    def now(self, sched):
        return datetime.now(ZoneInfo(sched.get("timezone", "UTC"))).replace(tzinfo=None)

    def publish(self, sched, now, title, kind, until):
        """Write what's on now and next, for the home site."""
        info = {
            "channel": sched.get("channel", self.id),
            "updated": now.isoformat(timespec="seconds"),
            "timezone": sched.get("timezone", "UTC"),
            "now": {"title": title, "type": kind, "until": until.strftime("%H:%M") if until else None},
            "next": [
                {"title": s.get("title", ""), "type": s["type"], "day": DAYS[start.weekday()],
                 "start": start.strftime("%H:%M"), "end": end.strftime("%H:%M")}
                for start, end, s in upcoming(sched, now, 5)
            ],
            "schedule": [
                {"title": s.get("title", ""), "type": s["type"], "days": s.get("days", "daily"),
                 "start": s["start"], "end": s["end"]}
                for s in sched["slots"]
            ],
        }
        self.public.mkdir(parents=True, exist_ok=True)
        tmp = self.public / f".{self.id}.json"
        tmp.write_text(json.dumps(info, indent=2))
        tmp.replace(self.public / f"{self.id}.json")

    def slate(self):
        img = self.media / "slate.png"
        if img.exists():
            return ["-loop", "1", "-framerate", str(FPS), "-i", str(img)]
        return ["-f", "lavfi", "-i", f"color=c=0x0b0d12:s={WIDTH}x{HEIGHT}:r={FPS}"]

    def step(self):
        sched = load_schedule(self.schedule_path)
        now = self.now(sched)
        slot, end = current_slot(sched, now)

        if slot and slot["type"] == "live":
            # Step aside so the live show can connect from OBS.
            self.tx.stop()
            self.publish(sched, now, slot.get("title", "Live"), "live", end)
            time.sleep(min(15, max(1, (end - now).total_seconds())))
            return

        if slot:
            until = end
            folder = self.media / slot.get("folder", slot.get("title", ""))
            files = [folder] if folder.is_file() else videos_in(folder)
            key, order = f"slot:{slot.get('title')}:{slot['start']}", slot.get("order", "next")
            title = slot.get("title", "")
        else:
            until = next_start(sched, now)
            files, key, order = videos_in(self.media / sched.get("filler", "filler")), "filler", "shuffle"
            title = sched.get("filler_title", "BAC Network")

        remaining = (until - now).total_seconds()
        choice = self.state.pick(key, files, order)
        self.publish(sched, now, title, slot["type"] if slot else "filler", until)
        if choice:
            print(f"[{self.id}] {now:%a %H:%M} {title}: {choice.name}", flush=True)
            self.tx.play(["-i", str(choice)], remaining, has_audio(choice))
        else:
            # Nothing to play: hold the slate in short chunks so new uploads are picked up quickly.
            print(f"[{self.id}] {now:%a %H:%M} {title}: slate", flush=True)
            self.tx.play(self.slate(), min(remaining, 60), audio=False)

    def run(self):
        signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
        try:
            while True:
                try:
                    self.step()
                except (OSError, ValueError, KeyError) as e:
                    # A bad schedule edit or missing file must not take the channel off air for good.
                    print(f"[{self.id}] error: {e}", flush=True)
                    time.sleep(10)
        finally:
            self.tx.stop()


if __name__ == "__main__":
    Channel(
        sys.argv[1] if len(sys.argv) > 1 else os.environ["CHANNEL"],
        os.environ.get("SCHEDULE_DIR", "/schedule"),
        os.environ.get("MEDIA_DIR", "/media"),
        os.environ.get("STATE_DIR", "/state"),
        os.environ.get("PUBLIC_DIR", "/public"),
        os.environ["OUTPUT"],
    ).run()
