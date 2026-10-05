#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://localhost:8080}"
health="$(curl -fsS "${base_url}/health")"

if [[ "$health" != '{"ok":true,"db":true}' ]]; then
  printf 'Unexpected health response: %s\n' "$health" >&2
  exit 1
fi

curl -fsS "${base_url}/" | grep -qF 'The reservation platform is starting here'
curl -fsS "${base_url}/assets/css/app.css" >/dev/null

if [[ "$(curl -s -o /dev/null -w '%{http_code}' "${base_url}/missing-page")" != '404' ]]; then
  printf 'Missing pages must return HTTP 404\n' >&2
  exit 1
fi

if [[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "${base_url}/health")" != '405' ]]; then
  printf 'Unsupported methods must return HTTP 405\n' >&2
  exit 1
fi

printf 'PHP page, static CSS, database health, 404, and 405 checks passed.\n'
