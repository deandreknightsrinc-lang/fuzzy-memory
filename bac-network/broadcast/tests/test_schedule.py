import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import playout  # noqa: E402


def sched(slots, **extra):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"slots": slots, **extra}, f)
    return playout.load_schedule(f.name)


# 2026-11-02 is a Monday
MON = datetime(2026, 11, 2)


class ScheduleTest(unittest.TestCase):
    def test_day_groups(self):
        self.assertEqual(playout.expand_days("weekdays"), ["mon", "tue", "wed", "thu", "fri"])
        self.assertEqual(playout.expand_days(["Saturday", "sun"]), ["sat", "sun"])

    def test_current_slot_and_end(self):
        s = sched([{"days": "weekdays", "start": "07:00", "end": "08:00", "title": "News"}])
        slot, end = playout.current_slot(s, MON.replace(hour=7, minute=30))
        self.assertEqual(slot["title"], "News")
        self.assertEqual(end, MON.replace(hour=8))
        self.assertEqual(playout.current_slot(s, MON.replace(hour=8)), (None, None))
        sat = datetime(2026, 11, 7, 7, 30)
        self.assertEqual(playout.current_slot(s, sat), (None, None))

    def test_slot_crossing_midnight(self):
        s = sched([{"days": "fri", "start": "23:00", "end": "01:00", "title": "Late Show"}])
        sat_early = datetime(2026, 11, 7, 0, 30)
        slot, end = playout.current_slot(s, sat_early)
        self.assertEqual(slot["title"], "Late Show")
        self.assertEqual(end, datetime(2026, 11, 7, 1, 0))

    def test_upcoming_sorted(self):
        s = sched([
            {"days": "daily", "start": "20:00", "end": "21:00", "title": "B"},
            {"days": "daily", "start": "09:00", "end": "10:00", "title": "A"},
        ])
        nxt = playout.upcoming(s, MON.replace(hour=8), 3)
        self.assertEqual([x[2]["title"] for x in nxt], ["A", "B", "A"])
        self.assertEqual(playout.next_start(s, MON.replace(hour=12)), MON.replace(hour=20))

    def test_episodes_advance_and_wrap(self):
        with tempfile.TemporaryDirectory() as d:
            state = playout.State(Path(d) / "s.json")
            files = [Path("ep1.mp4"), Path("ep2.mp4")]
            picks = [state.pick("show", files, "next").name for _ in range(3)]
            self.assertEqual(picks, ["ep1.mp4", "ep2.mp4", "ep1.mp4"])
            # Survives a restart
            again = playout.State(Path(d) / "s.json")
            self.assertEqual(again.pick("show", files, "next").name, "ep2.mp4")

    def test_shuffle_avoids_repeat(self):
        with tempfile.TemporaryDirectory() as d:
            state = playout.State(Path(d) / "s.json")
            files = [Path("a.mp4"), Path("b.mp4")]
            first = state.pick("f", files, "shuffle")
            for _ in range(5):
                nxt = state.pick("f", files, "shuffle")
                self.assertNotEqual(nxt, first)
                first = nxt

    def test_example_schedules_load(self):
        for name in ("tv1", "tv2"):
            s = playout.load_schedule(Path(__file__).resolve().parents[1] / "schedule" / f"{name}.json")
            self.assertTrue(s["slots"])


if __name__ == "__main__":
    unittest.main()
