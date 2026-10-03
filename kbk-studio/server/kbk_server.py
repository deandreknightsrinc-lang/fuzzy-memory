#!/usr/bin/env python3
"""KBK helper: the jobs a browser can't do on its own, for KBK Studio.

  GET  /health                 which tools are installed
  GET  /fetch?url=...          read any link: direct files (no CORS limits),
                               video/music pages through yt-dlp -> WAV
  POST /convert?format=flac    body = audio/video file, answer = converted file (ffmpeg)
  POST /stems?model=htdemucs   body = WAV, answer = JSON of stem URLs (Demucs)
  GET  /voices                 AI Vox voice models in ~/Music/KBK Voices
  POST /vox?voice=Name&pitch=0 body = WAV, answer = the same audio in that voice (RVC)
  GET  /files/<job>/<stem>.wav a finished stem
  GET  /                       KBK Studio itself, so http://localhost:8765 works
                               with MIDI (localhost counts as a secure page)

Python 3.9+, standard library only. ffmpeg, yt-dlp and demucs are found on
PATH (setup-helper.sh installs them). Listens on 127.0.0.1 unless --host says
otherwise.
"""

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VERSION = "1.0"
STUDIO_DIR = Path(__file__).resolve().parent.parent
WORK = Path(os.environ.get("KBK_WORK", Path(tempfile.gettempdir()) / "kbk-helper"))
MAX_UPLOAD = 1024 * 1024 * 1024  # 1 GB
MAX_FETCH = 500 * 1024 * 1024
JOB_TTL = 6 * 3600

AUDIO_EXT = re.compile(r"\.(wav|wave|mp3|ogg|oga|opus|flac|m4a|aac|aif|aiff|aifc|caf|weba|webm|mp4|m4v|mov|3gp)$", re.I)
AUDIO_TYPES = ("audio/", "video/", "application/ogg", "application/octet-stream", "binary/octet-stream")

FORMATS = {
    "wav": (["-c:a", "pcm_s24le"], "wav", "audio/wav"),
    "wav16": (["-c:a", "pcm_s16le"], "wav", "audio/wav"),
    "aiff": (["-c:a", "pcm_s24be"], "aif", "audio/aiff"),
    "flac": (["-c:a", "flac"], "flac", "audio/flac"),
    "mp3": (["-c:a", "libmp3lame"], "mp3", "audio/mpeg"),
    "m4a": (["-c:a", "aac"], "m4a", "audio/mp4"),
    "ogg": (["-c:a", "libvorbis"], "ogg", "audio/ogg"),
    "opus": (["-c:a", "libopus"], "opus", "audio/ogg"),
}

VOICES_DIR = Path(os.environ.get("KBK_VOICES", Path.home() / "Music" / "KBK Voices"))
KBK_HOME = Path(os.environ.get("KBK_HOME", Path.home() / ".kbk-helper"))
VOX_METHODS = {"rmvpe", "harvest", "crepe", "pm"}

DEMUCS_MODELS = {"htdemucs", "htdemucs_ft", "htdemucs_6s", "mdx_extra", "mdx_extra_q"}


# ---- pure helpers (unit tested) --------------------------------------------

def is_http_url(url):
    try:
        u = urllib.parse.urlparse(url)
    except ValueError:
        return False
    return u.scheme in ("http", "https") and bool(u.netloc)


def looks_like_audio(url, content_type=""):
    path = urllib.parse.urlparse(url).path
    if AUDIO_EXT.search(path):
        return True
    ct = (content_type or "").split(";")[0].strip().lower()
    return any(ct.startswith(t) for t in AUDIO_TYPES)


def safe_name(name, fallback="audio"):
    base = re.sub(r"\.[A-Za-z0-9]{2,5}$", "", str(name or ""))
    base = re.sub(r"[^\w\- .()]+", "_", base).strip(" ._")[:80]
    return base or fallback


def ffmpeg_args(src, dst, fmt, rate=None, channels=None, kbps=None):
    if fmt not in FORMATS:
        raise ValueError(f"Unknown format {fmt!r}. Try: {', '.join(sorted(FORMATS))}")
    codec, _, _ = FORMATS[fmt]
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-vn", "-map_metadata", "0"]
    args += codec
    if rate:
        args += ["-ar", str(int(rate))]
    if channels:
        args += ["-ac", str(int(channels))]
    if kbps and fmt in ("mp3", "m4a", "ogg", "opus"):
        args += ["-b:a", f"{int(kbps)}k"]
    elif fmt == "mp3":
        args += ["-q:a", "0"]
    elif fmt == "m4a":
        args += ["-b:a", "256k"]
    args.append(str(dst))
    return args


def demucs_args(src, out_dir, model="htdemucs", two=None):
    if model not in DEMUCS_MODELS:
        raise ValueError(f"Unknown Demucs model {model!r}")
    exe = shutil.which("demucs")
    args = [exe] if exe else [sys.executable, "-m", "demucs"]
    args += ["-n", model, "-o", str(out_dir), "--float32"]
    if two:
        args += ["--two-stems", two]
    args.append(str(src))
    return args


def list_voices(folder):
    """RVC voice models in `folder`: name -> (model .pth, matching .index or None).

    Either loose files (Name.pth + Name.index) or one folder per voice
    (Name/anything.pth + Name/anything.index), the way RVC models are shared.
    """
    folder = Path(folder)
    found = {}
    if not folder.is_dir():
        return found

    def pick_index(candidates, stem=None):
        cands = [c for c in candidates if not c.name.startswith("._")]
        if stem:
            same = [c for c in cands if c.stem == stem]
            if same:
                return same[0]
        # RVC writes "added_IVF..._v2.index" (the one to use) and "trained_..."
        added = [c for c in cands if c.name.startswith("added")]
        return (added or cands or [None])[0]

    for pth in sorted(folder.glob("*.pth")):
        if not pth.name.startswith("._"):
            found[pth.stem] = (pth, pick_index(list(folder.glob("*.index")), pth.stem))
    for sub in sorted(p for p in folder.iterdir() if p.is_dir() and not p.name.startswith(".")):
        pths = [p for p in sorted(sub.rglob("*.pth")) if not p.name.startswith("._")]
        if pths:
            found[sub.name] = (pths[0], pick_index(sorted(sub.rglob("*.index"))))
    return found


def vox_python():
    """The Python that has rvc-python (setup-helper.sh --vox makes it)."""
    env = os.environ.get("KBK_VOX_PYTHON")
    if env:
        return env
    py = KBK_HOME / "vox" / "bin" / "python"
    return str(py) if py.exists() else None


_vox_cache = {"at": 0.0, "ok": False}


def vox_ready():
    if time.time() - _vox_cache["at"] < 60:
        return _vox_cache["ok"]
    py = vox_python()
    ok = False
    if py:
        try:
            ok = subprocess.run([py, "-c", "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('rvc_python') else 1)"],
                                capture_output=True, timeout=30).returncode == 0
        except Exception:
            ok = False
    _vox_cache.update(at=time.time(), ok=ok)
    return ok


def vox_args(python, src, dst, model, index=None, pitch=0, method="rmvpe", version="v2"):
    if method not in VOX_METHODS:
        raise ValueError(f"Unknown pitch method {method!r}")
    pitch = int(pitch)
    if not -36 <= pitch <= 36:
        raise ValueError("pitch must be between -36 and 36 semitones")
    args = [python, "-m", "rvc_python", "cli", "-i", str(src), "-o", str(dst), "-mp", str(model),
            "-pi", str(pitch), "-me", method, "-v", version, "-de", "cpu:0"]
    if index:
        args += ["-ip", str(index)]
    return args


def tools():
    demucs = bool(shutil.which("demucs"))
    if not demucs:
        try:
            import importlib.util
            demucs = importlib.util.find_spec("demucs") is not None
        except Exception:
            demucs = False
    return {"ffmpeg": bool(shutil.which("ffmpeg")), "ytdlp": bool(shutil.which("yt-dlp")), "demucs": demucs, "vox": vox_ready()}


# ---- server ----------------------------------------------------------------

class HelperError(Exception):
    def __init__(self, status, msg):
        super().__init__(msg)
        self.status = status


def run(args, timeout):
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        raise HelperError(500, f"{Path(args[0]).name} is not installed. Run setup-helper.sh.")
    except subprocess.TimeoutExpired:
        raise HelperError(504, f"{Path(args[0]).name} took too long.")
    if p.returncode != 0:
        tail = (p.stderr or p.stdout or "").strip().splitlines()[-3:]
        raise HelperError(500, " ".join(tail) or f"{Path(args[0]).name} failed")
    return p


def cleanup_old_jobs():
    if not WORK.exists():
        return
    now = time.time()
    for d in WORK.iterdir():
        try:
            if d.is_dir() and now - d.stat().st_mtime > JOB_TTL:
                shutil.rmtree(d, ignore_errors=True)
        except OSError:
            pass


class Handler(BaseHTTPRequestHandler):
    server_version = f"KBKHelper/{VERSION}"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    # CORS, including Chrome's private-network check (https page -> localhost)
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Expose-Headers", "Content-Disposition, X-Title")

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, ctype=None, name=None):
        size = path.stat().st_size
        self.send_response(200)
        self.cors()
        self.send_header("Content-Type", ctype or mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(size))
        if name:
            q = urllib.parse.quote(name)
            self.send_header("Content-Disposition", f"attachment; filename=\"{safe_name(name)}{path.suffix}\"; filename*=UTF-8''{q}")
        self.end_headers()
        with open(path, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0:
            raise HelperError(400, "Send the audio file in the request body.")
        if n > MAX_UPLOAD:
            raise HelperError(413, "File too large (1 GB max).")
        return self.rfile.read(n)

    def job_dir(self):
        cleanup_old_jobs()
        d = WORK / uuid.uuid4().hex[:12]
        d.mkdir(parents=True)
        return d

    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def route(self, method):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if method == "GET" and u.path == "/health":
                return self.send_json({"ok": True, "version": VERSION, "tools": tools()})
            if method == "GET" and u.path == "/fetch":
                return self.fetch(q.get("url", ""))
            if method == "POST" and u.path == "/convert":
                return self.convert(q)
            if method == "POST" and u.path == "/stems":
                return self.stems(q)
            if method == "GET" and u.path == "/voices":
                return self.voices()
            if method == "POST" and u.path == "/vox":
                return self.vox(q)
            if method == "GET" and u.path.startswith("/files/"):
                return self.job_file(u.path)
            if method == "GET":
                return self.static(u.path)
            raise HelperError(404, "Not found")
        except HelperError as e:
            self.send_json({"error": str(e)}, e.status)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:  # keep the server up, tell the page what broke
            self.send_json({"error": f"{type(e).__name__}: {e}"}, 500)

    def fetch(self, url):
        if not is_http_url(url):
            raise HelperError(400, "Give a http:// or https:// link.")
        d = self.job_dir()
        # 1) a plain download, with a browser user agent (no CORS on a server)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh) KBKHelper", "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=60) as r:
                ctype = r.headers.get("Content-Type", "")
                if looks_like_audio(r.geturl(), ctype) and "html" not in ctype:
                    out = d / ("download" + (Path(urllib.parse.urlparse(r.geturl()).path).suffix or ".bin"))
                    total = 0
                    with open(out, "wb") as f:
                        while True:
                            chunk = r.read(1 << 16)
                            if not chunk:
                                break
                            total += len(chunk)
                            if total > MAX_FETCH:
                                raise HelperError(413, "That file is over 500 MB.")
                            f.write(chunk)
                    name = Path(urllib.parse.unquote(urllib.parse.urlparse(r.geturl()).path)).stem or "audio"
                    return self.send_file(out, name=name)
        except HelperError:
            raise
        except Exception:
            pass  # a page, or the site refused a plain download: let yt-dlp try
        # 2) yt-dlp: YouTube, SoundCloud, TikTok, Instagram, Bandcamp, Drive...
        if not shutil.which("yt-dlp"):
            raise HelperError(500, "This link is a page, and yt-dlp isn't installed. Run setup-helper.sh.")
        tmpl = str(d / "%(title).80s.%(ext)s")
        run(["yt-dlp", "--no-playlist", "--no-progress", "-f", "bestaudio/best", "-x", "--audio-format", "wav",
             "--max-filesize", "500M", "-o", tmpl, url], timeout=1800)
        wavs = sorted(d.glob("*.wav"))
        if not wavs:
            raise HelperError(500, "yt-dlp found no audio at that link.")
        self.send_file(wavs[0], "audio/wav", name=wavs[0].stem)

    def convert(self, q):
        fmt = q.get("format", "wav").lower()
        if fmt not in FORMATS:
            raise HelperError(400, f"Unknown format {fmt}.")
        d = self.job_dir()
        src = d / "input"
        src.write_bytes(self.body())
        _, ext, ctype = FORMATS[fmt]
        dst = d / f"output.{ext}"
        run(ffmpeg_args(src, dst, fmt, q.get("rate"), q.get("channels"), q.get("kbps")), timeout=1800)
        self.send_file(dst, ctype, name=q.get("name") or "audio")

    def stems(self, q):
        model = q.get("model", "htdemucs")
        two = q.get("two") or None
        if two and two not in ("vocals", "drums", "bass", "other"):
            raise HelperError(400, "two= must be vocals, drums, bass or other")
        if not tools()["demucs"]:
            raise HelperError(500, "Demucs isn't installed. Run: bash setup-helper.sh --stems (it downloads PyTorch, about 2 GB).")
        d = self.job_dir()
        src = d / "song.wav"
        src.write_bytes(self.body())
        try:
            run(demucs_args(src, d / "out", model, two), timeout=3 * 3600)
        except ValueError as e:
            raise HelperError(400, str(e))
        folder = d / "out" / model / "song"
        stems = {p.stem: f"/files/{d.name}/{p.name}" for p in sorted(folder.glob("*.wav"))}
        if not stems:
            raise HelperError(500, "Demucs finished but wrote no stems.")
        self.send_json({"stems": stems, "model": model})

    def voices(self):
        VOICES_DIR.mkdir(parents=True, exist_ok=True)
        self.send_json({"folder": str(VOICES_DIR), "voices": sorted(list_voices(VOICES_DIR)), "ready": vox_ready()})

    def vox(self, q):
        name = q.get("voice", "")
        voices = list_voices(VOICES_DIR)
        if name not in voices:
            raise HelperError(404, f"No voice called {name!r} in {VOICES_DIR}. Press Rescan.")
        if not vox_ready():
            raise HelperError(500, "Voice conversion isn't installed. Run: bash setup-helper.sh --vox")
        model, index = voices[name]
        d = self.job_dir()
        src, dst = d / "in.wav", d / "out.wav"
        src.write_bytes(self.body())
        try:
            args = vox_args(vox_python(), src, dst, model, index, q.get("pitch", 0), q.get("method", "rmvpe"), q.get("version", "v2"))
        except ValueError as e:
            raise HelperError(400, str(e))
        run(args, timeout=1800)
        if not dst.exists() or dst.stat().st_size < 100:
            raise HelperError(500, "The voice model ran but wrote no audio.")
        self.send_file(dst, "audio/wav", name=f"{name} vox")

    def job_file(self, path):
        m = re.fullmatch(r"/files/([0-9a-f]{12})/([\w\-]+\.wav)", path)
        if not m:
            raise HelperError(404, "Not found")
        hits = list((WORK / m.group(1) / "out").glob(f"*/song/{m.group(2)}"))
        if not hits:
            raise HelperError(404, "That stem is gone (stems are kept for 6 hours).")
        self.send_file(hits[0], "audio/wav")

    def static(self, path):
        rel = urllib.parse.unquote(path).lstrip("/") or "index.html"
        target = (STUDIO_DIR / rel).resolve()
        if STUDIO_DIR not in target.parents and target != STUDIO_DIR:
            raise HelperError(404, "Not found")
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file() or "server" in target.relative_to(STUDIO_DIR).parts[:1]:
            raise HelperError(404, "Not found")
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix in (".js", ".mjs"):
            ctype = "text/javascript"
        self.send_file(target, ctype)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 to let other computers on your network use it")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    t = tools()
    print(f"KBK helper {VERSION} on http://{'localhost' if a.host in ('127.0.0.1', '0.0.0.0') else a.host}:{a.port}")
    print("  open that address for KBK Studio (MIDI works there), or keep using the website")
    print("  tools: " + ", ".join(f"{k} {'ok' if v else 'MISSING'}" for k, v in t.items()))
    threading.Thread(target=cleanup_old_jobs, daemon=True).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
