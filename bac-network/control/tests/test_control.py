import base64
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

TMP = tempfile.mkdtemp()
os.environ.update({
    "SCHEDULE_DIR": f"{TMP}/schedule", "MEDIA_DIR": f"{TMP}/media", "PUBLIC_DIR": f"{TMP}/public",
    "CONTROL_PASSWORD": "secret", "CHANNELS": "tv1,tv2",
})
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app  # noqa: E402

REPO_SCHEDULES = Path(__file__).resolve().parents[2] / "broadcast" / "schedule"


def slot(**kw):
    base = {"title": "News", "days": "weekdays", "start": "07:00", "end": "08:00", "type": "live"}
    base.update(kw)
    return base


class ValidateTest(unittest.TestCase):
    def test_repo_schedules_are_valid(self):
        for name in ("tv1", "tv2"):
            app.validate_schedule(json.loads((REPO_SCHEDULES / f"{name}.json").read_text()))

    def test_overlap_rejected(self):
        with self.assertRaisesRegex(app.Invalid, "overlap"):
            app.validate_schedule({"slots": [slot(), slot(title="Other", start="07:30", end="09:00")]})

    def test_overlap_across_midnight_and_week_end(self):
        with self.assertRaisesRegex(app.Invalid, "overlap"):
            app.validate_schedule({"slots": [slot(days=["sun"], start="23:00", end="01:00"), slot(title="Mon early", days=["mon"], start="00:30", end="02:00")]})

    def test_back_to_back_ok(self):
        app.validate_schedule({"slots": [slot(), slot(title="Replay", start="08:00", end="12:00", type="shows", folder="replays")]})

    def test_bad_values(self):
        for bad, msg in (
            (slot(start="7:00"), "07:30"),
            (slot(days=["someday"]), "unknown day"),
            (slot(days=[]), "at least one day"),
            (slot(title=""), "title"),
            (slot(type="shows", folder="../etc"), "letters"),
            (slot(start="09:00", end="09:00"), "same"),
        ):
            with self.assertRaisesRegex(app.Invalid, msg):
                app.validate_schedule({"slots": [bad]})
        with self.assertRaisesRegex(app.Invalid, "time zone"):
            app.validate_schedule({"timezone": "Mars/Base", "slots": []})


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Path(f"{TMP}/schedule").mkdir()
        Path(f"{TMP}/media/tv1/prime-time").mkdir(parents=True)
        Path(f"{TMP}/public").mkdir()
        (Path(TMP) / "schedule/tv1.json").write_text(json.dumps({"channel": "BAC TV", "timezone": "UTC", "slots": []}))
        cls.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def call(self, method, path, body=None, auth=("bac", "secret"), raw=False):
        data = body if raw else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(self.base + path, data=data, method=method)
        if auth:
            req.add_header("Authorization", "Basic " + base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode())
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def test_requires_password(self):
        self.assertEqual(self.call("GET", "/api/channels", auth=None)[0], 401)
        self.assertEqual(self.call("GET", "/api/channels", auth=("bac", "wrong"))[0], 401)
        self.assertEqual(self.call("GET", "/", auth=("bac", "secret"))[0], 200)

    def test_save_schedule_and_upload(self):
        sched = {"channel": "BAC TV", "timezone": "America/New_York",
                 "slots": [slot(title="Prime", type="shows", folder="prime-time", start="20:00", end="22:00")]}
        status, _ = self.call("PUT", "/api/schedule/tv1", sched)
        self.assertEqual(status, 200)
        saved = json.loads((Path(TMP) / "schedule/tv1.json").read_text())
        self.assertEqual(saved["slots"][0]["folder"], "prime-time")
        self.assertNotIn("type", saved["slots"][0])

        status, _ = self.call("PUT", "/api/upload/tv1/prime-time/01-pilot.mp4", b"x" * 1000, raw=True)
        self.assertEqual(status, 200)
        self.assertEqual((Path(TMP) / "media/tv1/prime-time/01-pilot.mp4").stat().st_size, 1000)
        info = json.loads(self.call("GET", "/api/channels")[1])
        self.assertEqual(info[0]["folders"][0]["files"][0]["name"], "01-pilot.mp4")

        self.assertEqual(self.call("DELETE", "/api/file/tv1/prime-time/01-pilot.mp4")[0], 200)
        self.assertFalse((Path(TMP) / "media/tv1/prime-time/01-pilot.mp4").exists())

    def test_rejects_bad_input(self):
        status, body = self.call("PUT", "/api/schedule/tv1", {"slots": [slot(), slot(title="Clash")]})
        self.assertEqual(status, 400)
        self.assertIn("overlap", json.loads(body)["error"])
        self.assertEqual(self.call("PUT", "/api/upload/tv1/prime-time/notes.txt", b"hi", raw=True)[0], 400)
        self.assertEqual(self.call("PUT", "/api/upload/tv1/..%2F..%2Fetc/x.mp4", b"hi", raw=True)[0], 400)
        self.assertEqual(self.call("PUT", "/api/schedule/tv9", {"slots": []})[0], 400)
        self.assertEqual(self.call("GET", "/..%2F..%2Fapp.py")[0], 404)

    def test_folders(self):
        self.assertEqual(self.call("POST", "/api/folder/tv2/week-in-review")[0], 200)
        self.assertTrue((Path(TMP) / "media/tv2/week-in-review").is_dir())
        self.assertEqual(self.call("DELETE", "/api/folder/tv2/week-in-review")[0], 200)
        self.assertFalse((Path(TMP) / "media/tv2/week-in-review").exists())


if __name__ == "__main__":
    unittest.main()
