#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu server. Run as root:  bash scripts/setup-server.sh
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

if [ ! -f .env ]; then
  cp .env.example .env
  for key in MYSQL_ROOT_PASSWORD POSTGRES_PASSWORD PEERTUBE_SECRET TV1_STREAM_KEY TV2_STREAM_KEY CONTROL_PASSWORD; do
    sed -i "s|^$key=.*|$key=$(openssl rand -hex 24)|" .env
  done
  echo "Created .env with random passwords. Now edit DOMAIN, ADMIN_EMAIL and the SMTP lines, then run this script again."
  exit 0
fi

# Older .env files predate the Control Room: give them a password too.
grep -q '^CONTROL_PASSWORD=' .env || echo "CONTROL_PASSWORD=$(openssl rand -hex 12)" >> .env

# Firewall: web traffic plus the three stream-in ports
if command -v ufw >/dev/null; then
  ufw allow OpenSSH
  ufw allow 80,443/tcp
  ufw allow 1935:1937/tcp
  ufw --force enable
fi

docker compose pull --ignore-buildable
docker compose up -d --build
bash scripts/set-stream-keys.sh
echo
echo "BAC Network is starting. Give it two minutes, then see README.md, section 'First login'."
echo "Control Room: https://control.$(grep '^DOMAIN=' .env | cut -d= -f2)  (login bac, password $(grep '^CONTROL_PASSWORD=' .env | cut -d= -f2))"
echo "Video library admin password:"
sleep 60
docker compose logs watch | grep -A1 -i "password" | tail -n 2 || echo "  (run: docker compose logs watch | grep -A1 -i password)"
