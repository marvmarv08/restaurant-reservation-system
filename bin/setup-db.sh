#!/usr/bin/env bash
set -euo pipefail

# Upgrade a P1 MySQL volume that was created before the Phase 2 init SQL existed.
for sql in database/init/01_schema.sql database/init/02_reference.sql database/init/03_demo_seed.sql; do
  bash bin/db.sh < "$sql"
done
docker compose build seed
docker compose run --rm seed
