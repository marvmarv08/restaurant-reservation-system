#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"
action="${1:-help}"
case "$action" in
  up|start|stop|status|reset) ;;
  *) echo 'Usage: bash bin/demo.sh {up|start|stop|status|reset disposable-demo}'; exit 1 ;;
esac
if [[ "$action" == reset && "${2:-}" != disposable-demo ]]; then
  echo 'Reset requires: bash bin/demo.sh reset disposable-demo' >&2
  exit 1
fi
if [[ ! -e .env.demo && "$action" == up ]]; then
  python3 - <<'PY'
import os, secrets
fd = os.open('.env.demo', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write('DEMO_DB_PASSWORD=' + secrets.token_hex(24) + '\n')
    f.write('DEMO_DB_ROOT_PASSWORD=' + secrets.token_hex(24) + '\n')
PY
fi
if [[ ! -f .env.demo || -L .env.demo ]]; then
  echo 'Missing private .env.demo; run bash bin/demo.sh up. Symlinks are refused.' >&2
  exit 1
fi
compose=(docker compose --env-file .env.demo -p tablebookdemo -f docker-compose.demo.yml)
# Validate the deletion target before any operation; never trust a caller's project override.
"${compose[@]}" config --format json | python3 -c '
import json, sys
c = json.load(sys.stdin)
assert c["name"] == "tablebookdemo", "Unexpected project"
assert set(c["volumes"]) == {"demo_dbdata"}, "Unexpected volume"
assert c["volumes"]["demo_dbdata"]["name"] == "tablebookdemo_demo_dbdata", "Unsafe volume target"
assert not c["volumes"]["demo_dbdata"].get("external"), "External volume refused"
for s in ("app", "seed"):
    assert c["services"][s]["environment"]["DB_DATABASE"] == "tablebook_demo", "Unsafe database target"
assert c["services"]["db"]["environment"]["MYSQL_DATABASE"] == "tablebook_demo", "Unsafe MySQL target"
assert not c["services"]["db"].get("ports"), "Demo MySQL must remain private"
v = [v for v in c["services"]["db"]["volumes"] if v["target"] == "/var/lib/mysql"]
assert len(v) == 1 and v[0]["type"] == "volume" and v[0]["source"] == "demo_dbdata", "Unsafe database storage"
p = c["services"]["app"]["ports"]
assert len(p) == 1 and p[0]["host_ip"] == "127.0.0.1" and str(p[0]["published"]) == "8082", "Unexpected demo port"
'
case "$action" in
  up) "${compose[@]}" build seed; "${compose[@]}" up -d --no-build --pull never --wait --wait-timeout 120 ;;
  start) "${compose[@]}" up -d --no-build --pull never --wait --wait-timeout 120 ;;
  stop) "${compose[@]}" down ;;
  status) "${compose[@]}" ps ;;
  reset) "${compose[@]}" down --volumes; echo 'Disposable demo removed. Run up and activate a new demo staff account.' ;;
esac
