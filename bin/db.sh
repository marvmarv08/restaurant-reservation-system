#!/usr/bin/env bash
set -euo pipefail

exec docker compose exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --default-character-set=utf8mb4 --user="$MYSQL_USER" "$MYSQL_DATABASE" "$@"' \
  mysql-client "$@"
