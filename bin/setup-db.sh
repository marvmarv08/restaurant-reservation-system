#!/usr/bin/env bash
set -euo pipefail

# Apply additive schema files to an existing volume without deleting its data.
for sql in database/init/*.sql; do
  bash bin/db.sh < "$sql"
done
docker compose build seed
docker compose run --rm seed
