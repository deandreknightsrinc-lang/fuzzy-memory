import json
import shutil
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

    def test_convert_unknown_format(self):
        self.assertEqual(self.get("/convert?format=exe", data=tiny_wav(), method="POST")[0], 400)


if __name__ == "__main__":
    unittest.main()
