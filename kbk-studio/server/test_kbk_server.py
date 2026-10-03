import json
import os
import shutil
import tempfile
import struct
import sys
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kbk_server as k  # noqa: E402


def tiny_wav(n=4410, rate=44100):
    data = b"".join(struct.pack("<h", int(8000 * ((i // 50) % 2 * 2 - 1))) for i in range(n))
    return b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) + b"data" + struct.pack("<I", len(data)) + data


class PureTests(unittest.TestCase):
    def test_urls(self):
        self.assertTrue(k.is_http_url("https://x.com/a.wav"))
        self.assertFalse(k.is_http_url("file:///etc/passwd"))
        self.assertFalse(k.is_http_url("javascript:alert(1)"))

    def test_looks_like_audio(self):
        self.assertTrue(k.looks_like_audio("https://x.com/a/kick.WAV?x=1"))
        self.assertTrue(k.looks_like_audio("https://x.com/dl", "audio/mpeg"))
        self.assertFalse(k.looks_like_audio("https://youtube.com/watch", "text/html; charset=utf-8"))

    def test_safe_name(self):
        self.assertEqual(k.safe_name("../../My Beat:v2.mp3"), "My Beat_v2")
        self.assertEqual(k.safe_name(""), "audio")

    def test_ffmpeg_args(self):
        a = k.ffmpeg_args("in", "out.flac", "flac", rate=48000, channels=1)
        self.assertEqual(a[0], "ffmpeg")
        self.assertIn("flac", a)
        self.assertEqual(a[a.index("-ar") + 1], "48000")
        self.assertEqual(a[a.index("-ac") + 1], "1")
        self.assertIn("320k", k.ffmpeg_args("i", "o.mp3", "mp3", kbps=320))
        with self.assertRaises(ValueError):
            k.ffmpeg_args("i", "o", "exe")

    def test_demucs_args(self):
        a = k.demucs_args("song.wav", "out", "htdemucs", "vocals")
        self.assertIn("--two-stems", a)
        self.assertEqual(a[-1], "song.wav")
        with self.assertRaises(ValueError):
            k.demucs_args("s", "o", "rm -rf")


class VoiceTests(unittest.TestCase):
    def test_list_voices_loose_and_folders(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            (d / "Lauren.pth").write_bytes(b"x")
            (d / "Lauren.index").write_bytes(b"x")
            (d / "._Lauren.pth").write_bytes(b"x")  # macOS junk file
            choir = d / "Choir Alto"
            (choir / "weights").mkdir(parents=True)
            (choir / "weights" / "alto_e300.pth").write_bytes(b"x")
            (choir / "trained_IVF256_v2.index").write_bytes(b"x")
            (choir / "added_IVF256_v2.index").write_bytes(b"x")
            (d / "Empty").mkdir()
            v = k.list_voices(d)
            self.assertEqual(sorted(v), ["Choir Alto", "Lauren"])
            self.assertEqual(v["Lauren"][1].name, "Lauren.index")
            self.assertEqual(v["Choir Alto"][0].name, "alto_e300.pth")
            self.assertEqual(v["Choir Alto"][1].name, "added_IVF256_v2.index")
            self.assertEqual(k.list_voices(d / "missing"), {})

    def test_vox_args(self):
        a = k.vox_args("py", "in.wav", "out.wav", "m.pth", "m.index", pitch=-5)
        self.assertEqual(a[:4], ["py", "-m", "rvc_python", "cli"])
        self.assertEqual(a[a.index("-pi") + 1], "-5")
        self.assertEqual(a[a.index("-ip") + 1], "m.index")
        self.assertNotIn("-ip", k.vox_args("py", "i", "o", "m.pth"))
        with self.assertRaises(ValueError):
            k.vox_args("py", "i", "o", "m", pitch=99)
        with self.assertRaises(ValueError):
            k.vox_args("py", "i", "o", "m", method="rm -rf")


class SunoTests(unittest.TestCase):
    def test_clean_suno(self):
        d = "mid-tempo groove, 92 BPM, A minor"
        self.assertEqual(k.clean_suno('"Soulful gospel groove, 92 BPM, A minor, warm keys"', d), ("Soulful gospel groove, 92 BPM, A minor, warm keys", "ollama"))
        self.assertEqual(k.clean_suno("Style of Music: neo-soul, 92 BPM\nextra line", d), ("neo-soul, 92 BPM", "ollama"))
        for bad in ("R&B in the style of Someone, 92 BPM", "sounds like a famous band", "trap like Drake, 92 BPM", "", "inspired by the 90s greats"):
            self.assertEqual(k.clean_suno(bad, d), (d, "template"), bad)
        long = ", ".join(["warm keys"] * 40)
        self.assertLessEqual(len(k.clean_suno(long, d)[0]), 200)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), k.Handler)
        cls.base = f"http://127.0.0.1:{cls.srv.server_address[1]}"
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def get(self, path, data=None, method=None):
        req = urllib.request.Request(self.base + path, data=data, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    def test_health_and_cors(self):
        s, h, b = self.get("/health")
        self.assertEqual(s, 200)
        self.assertEqual(h["Access-Control-Allow-Origin"], "*")
        self.assertIn("ffmpeg", json.loads(b)["tools"])
        s, h, _ = self.get("/health", method="OPTIONS")
        self.assertEqual(s, 204)
        self.assertEqual(h["Access-Control-Allow-Private-Network"], "true")

    def test_serves_studio_but_not_server_code(self):
        s, h, b = self.get("/")
        self.assertEqual(s, 200)
        self.assertIn(b"KBK Studio", b)
        s, h, _ = self.get("/js/app.js")
        self.assertEqual(h["Content-Type"], "text/javascript")
        self.assertEqual(self.get("/server/kbk_server.py")[0], 404)
        self.assertEqual(self.get("/../../etc/passwd")[0], 404)

    def test_fetch_rejects_bad_links(self):
        s, _, b = self.get("/fetch?url=file:///etc/passwd")
        self.assertEqual(s, 400)
        self.assertIn("http", json.loads(b)["error"])

    def test_bad_job_file(self):
        self.assertEqual(self.get("/files/zzz/../../x.wav")[0], 404)

    @unittest.skipUnless(shutil.which("ffmpeg"), "needs ffmpeg")
    def test_convert_to_flac_and_back(self):
        s, h, b = self.get("/convert?format=flac&name=kick", data=tiny_wav(), method="POST")
        self.assertEqual(s, 200, b[:200])
        self.assertEqual(b[:4], b"fLaC")
        self.assertIn("kick.flac", h["Content-Disposition"])
        s, _, w = self.get("/convert?format=wav16&rate=22050", data=b, method="POST")
        self.assertEqual(s, 200)
        self.assertEqual(w[:4], b"RIFF")
        self.assertEqual(struct.unpack("<I", w[24:28])[0], 22050)

    def test_voices_and_vox_round_trip(self):
        # a stand-in for rvc-python: copies the audio and notes the pitch it was given
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            pkg = d / "fake" / "rvc_python"
            pkg.mkdir(parents=True)
            (pkg / "__init__.py").write_text("")
            (pkg / "__main__.py").write_text(
                "import sys, shutil\n"
                "a = sys.argv\n"
                "shutil.copy(a[a.index('-i') + 1], a[a.index('-o') + 1])\n"
                "open(a[a.index('-o') + 1] + '.pitch', 'w').write(a[a.index('-pi') + 1])\n")
            voices = d / "voices"
            voices.mkdir()
            (voices / "Test Voice.pth").write_bytes(b"x")
            old = (k.VOICES_DIR, os.environ.get("KBK_VOX_PYTHON"), os.environ.get("PYTHONPATH"), dict(k._vox_cache))
            k.VOICES_DIR = voices
            os.environ["KBK_VOX_PYTHON"] = sys.executable
            os.environ["PYTHONPATH"] = str(d / "fake")
            k._vox_cache.update(at=0.0, ok=False)
            try:
                s, _, b = self.get("/voices")
                j = json.loads(b)
                self.assertEqual(s, 200)
                self.assertEqual(j["voices"], ["Test Voice"])
                self.assertTrue(j["ready"])
                wav = tiny_wav()
                s, h, out = self.get("/vox?voice=Test%20Voice&pitch=3", data=wav, method="POST")
                self.assertEqual(s, 200, out[:300])
                self.assertEqual(out, wav)
                self.assertEqual(self.get("/vox?voice=Nobody", data=wav, method="POST")[0], 404)
                self.assertEqual(self.get("/vox?voice=Test%20Voice&pitch=90", data=wav, method="POST")[0], 400)
            finally:
                k.VOICES_DIR = old[0]
                for key, val in (("KBK_VOX_PYTHON", old[1]), ("PYTHONPATH", old[2])):
                    if val is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = val
                k._vox_cache.clear()
                k._vox_cache.update(old[3])

    def test_suno_with_and_without_ollama(self):
        draft = "upbeat groove, 120 BPM, C major"
        body = json.dumps({"facts": "120 BPM - C major", "draft": draft}).encode()
        old = k.OLLAMA_URL
        try:
            k.OLLAMA_URL = "http://127.0.0.1:9"  # nothing there
            s, _, b = self.get("/suno", data=body, method="POST")
            j = json.loads(b)
            self.assertEqual((s, j["prompt"], j["source"]), (200, draft, "template"))

            # a stand-in Ollama
            from http.server import BaseHTTPRequestHandler

            class FakeOllama(BaseHTTPRequestHandler):
                def log_message(self, *a):
                    pass

                def do_POST(self):
                    req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                    assert "never name" in req["prompt"] and "120 BPM" in req["prompt"]
                    out = json.dumps({"response": "Joyful gospel-pop, 120 BPM, C major, choir and organ"}).encode()
                    self.send_response(200)
                    self.send_header("Content-Length", str(len(out)))
                    self.end_headers()
                    self.wfile.write(out)

            fake = ThreadingHTTPServer(("127.0.0.1", 0), FakeOllama)
            threading.Thread(target=fake.serve_forever, daemon=True).start()
            k.OLLAMA_URL = f"http://127.0.0.1:{fake.server_address[1]}"
            s, _, b = self.get("/suno", data=body, method="POST")
            j = json.loads(b)
            fake.shutdown()
            fake.server_close()
            self.assertEqual((j["prompt"], j["source"]), ("Joyful gospel-pop, 120 BPM, C major, choir and organ", "ollama"))
            self.assertEqual(self.get("/suno", data=b"not json", method="POST")[0], 400)
        finally:
            k.OLLAMA_URL = old

    def test_convert_unknown_format(self):
        self.assertEqual(self.get("/convert?format=exe", data=tiny_wav(), method="POST")[0], 400)


if __name__ == "__main__":
    unittest.main()
