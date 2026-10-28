#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu server. Run as root:  bash scripts/setup-server.sh
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

if [ ! -f .env ]; then
  cp .env.example .env
  for key in MYSQL_ROOT_PASSWORD POSTGRES_PASSWORD PEERTUBE_SECRET; do
    sed -i "s|^$key=.*|$key=$(openssl rand -hex 24)|" .env
  done
  echo "Created .env with random passwords. Now edit DOMAIN, ADMIN_EMAIL and the SMTP lines, then run this script again."
  exit 0
fi

# Firewall: web traffic plus the three stream-in ports
if command -v ufw >/dev/null; then
  ufw allow OpenSSH
  ufw allow 80,443/tcp
  ufw allow 1935:1937/tcp
  ufw --force enable
fi

docker compose pull
docker compose up -d
echo
echo "BAC Network is starting. Give it two minutes, then see README.md, section 'First login'."
echo "Video library admin password:"
sleep 60
docker compose logs watch | grep -A1 -i "password" | tail -n 2 || echo "  (run: docker compose logs watch | grep -A1 -i password)"
