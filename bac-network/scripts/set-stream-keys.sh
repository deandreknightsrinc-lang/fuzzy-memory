#!/usr/bin/env bash
# Gives each live channel the stream key from .env (TV1_STREAM_KEY, TV2_STREAM_KEY),
# so the 24/7 playout and OBS can broadcast. Runs once after the channels first start,
# while their admin login is still the default (admin / abc123).
# Set KEEP_DEFAULT_KEY=1 to also keep the default key abc123 (trial runs only).
set -euo pipefail
cd "$(dirname "$0")/.."
env_value() { grep "^$1=" .env | cut -d= -f2- | tr -d '"'; }

docker compose run --rm --no-deps -T \
  -e TV1_STREAM_KEY="$(env_value TV1_STREAM_KEY)" -e TV2_STREAM_KEY="$(env_value TV2_STREAM_KEY)" -e KEEP_DEFAULT_KEY="${KEEP_DEFAULT_KEY:-0}" \
  --entrypoint python playout-tv1 - <<'PY'
import base64, json, os, time, urllib.request

auth = "Basic " + base64.b64encode(b"admin:abc123").decode()
for host, name, var in (("tv1", "BAC TV", "TV1_STREAM_KEY"), ("tv2", "BAC News Live", "TV2_STREAM_KEY")):
    base = f"http://{host}:8080"
    for _ in range(60):
        try:
            urllib.request.urlopen(base + "/api/status", timeout=5)
            break
        except OSError:
            time.sleep(2)
    keys = [{"key": os.environ[var], "comment": "BAC playout and OBS"}]
    if os.environ.get("KEEP_DEFAULT_KEY") == "1":
        keys.append({"key": "abc123", "comment": "Default key, trial run only"})
    req = urllib.request.Request(
        base + "/api/admin/config/streamkeys",
        data=json.dumps({"value": keys}).encode(),
        headers={"Authorization": auth, "Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        print(f"{name}: stream key set.")
    except OSError as e:
        print(f"{name}: couldn't set the stream key ({e}). If you already changed the admin "
              f"password, add the {var} value by hand under Configuration > Server Setup > Stream Keys.")
PY
