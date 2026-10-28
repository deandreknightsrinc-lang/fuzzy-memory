#!/usr/bin/env bash
# Nightly backup of every database and upload folder into ./backups.
# Add to cron:  0 3 * * * cd /opt/bac-network && bash scripts/backup.sh
set -euo pipefail
source .env
stamp=$(date +%F)
mkdir -p backups/$stamp

docker compose exec -T mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases bac_news bac_magazine | gzip > backups/$stamp/publications.sql.gz
docker compose exec -T postgres pg_dump -U peertube peertube | gzip > backups/$stamp/watch.sql.gz

for vol in news_content magazine_content tv1_data tv2_data watch_config; do
  docker run --rm -v "$(basename "$PWD")_$vol":/v -v "$PWD/backups/$stamp":/b alpine tar czf /b/$vol.tgz -C /v .
done

# Keep two weeks of backups
find backups -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "Backup saved to backups/$stamp"
