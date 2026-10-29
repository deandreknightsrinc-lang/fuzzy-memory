#!/usr/bin/env bash
# Trial run of BAC Network on your own computer. Needs Docker Desktop running.
# Run from the bac-network folder:  bash scripts/try-local.sh
# Stop it with:                     bash scripts/try-local.sh stop
set -euo pipefail
cd "$(dirname "$0")/.."

export COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml
compose() { docker compose "$@"; }

if [ "${1:-}" = "stop" ]; then
  compose down
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Install Docker Desktop (https://www.docker.com/products/docker-desktop/), open it, then run this again."
  exit 1
fi

rand() { openssl rand -hex 16 2>/dev/null || LC_ALL=C tr -dc a-f0-9 </dev/urandom | head -c 32; }

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i.bak "s|^DOMAIN=.*|DOMAIN=localhost|; s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=admin@example.com|" .env
  for key in MYSQL_ROOT_PASSWORD POSTGRES_PASSWORD PEERTUBE_SECRET TV1_STREAM_KEY TV2_STREAM_KEY CONTROL_PASSWORD; do
    sed -i.bak "s|^$key=.*|$key=$(rand)|" .env
  done
  rm -f .env.bak
  echo "Created .env for the trial run."
fi

# Older .env files predate the Control Room: give them a password too.
grep -q '^CONTROL_PASSWORD=' .env || echo "CONTROL_PASSWORD=$(openssl rand -hex 12)" >> .env

echo "Building and starting BAC Network (the first run downloads a few GB and takes several minutes)..."
compose build playout-tv1 playout-tv2

# Demo programmes, so both channels have something to show straight away.
make_demo() {  # channel folder, label, colour
  local out="media/$1/filler/bac-demo.mp4"
  [ -n "$(find "media/$1/filler" -type f ! -name .keep 2>/dev/null)" ] && return
  echo "Making a demo video for $2..."
  compose run --rm --no-deps -v "$PWD/media:/out" --entrypoint ffmpeg playout-tv1 \
    -hide_banner -loglevel error -f lavfi -i "testsrc2=s=1280x720:r=30" -f lavfi -i "sine=f=330:b=2" \
    -vf "drawbox=y=ih-120:w=iw:h=120:color=0x0b0d12@0.85:t=fill,drawtext=text='$2':fontcolor=white:fontsize=56:x=40:y=h-95" \
    -t 60 -c:v libx264 -preset veryfast -c:a aac -shortest "/out/$1/filler/bac-demo.mp4"
}
make_demo tv1 "BAC TV"
make_demo tv2 "BAC News Live"

compose up -d --build

KEEP_DEFAULT_KEY=1 bash scripts/set-stream-keys.sh

cat <<MSG

BAC Network is running on this computer:

  Home site        http://localhost:8000
  BAC News         http://localhost:8001   (admin: http://localhost:8001/ghost)
  BAC Magazine     http://localhost:8002   (admin: http://localhost:8002/ghost)
  BAC TV           http://localhost:8003   (admin: /admin, login admin / abc123)
  BAC News Live    http://localhost:8004   (admin: /admin, login admin / abc123)
  BAC Watch        http://localhost:8005   (login root; password: docker compose logs watch | grep -A1 -i password)
  Status           http://localhost:8006
  Control Room     http://localhost:8007   (login bac, password $(grep '^CONTROL_PASSWORD=' .env | cut -d= -f2))

The channels start playing the demo videos within a minute.
Go live from OBS: server rtmp://localhost:1935/live (BAC TV) or rtmp://localhost:1936/live (BAC News Live), stream key abc123.
Stop everything with: bash scripts/try-local.sh stop
MSG
