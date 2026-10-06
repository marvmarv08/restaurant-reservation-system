#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://localhost:8080}"
health="$(curl -fsS "${base_url}/health")"

if [[ "$health" != '{"ok":true,"db":true}' ]]; then
  printf 'Unexpected health response: %s\n' "$health" >&2
  exit 1
fi

# Consume the full response before checking it; an early-closing pipe can make curl fail.
guest_page="$(curl -fsS "${base_url}/")"
if [[ "$guest_page" != *'Reserve a table'* ]]; then
  printf 'Guest page must include the booking form\n' >&2
  exit 1
fi
curl -fsS "${base_url}/assets/css/app.css" >/dev/null
curl -fsS "${base_url}/assets/css/ui-feedback.css" >/dev/null
curl -fsS "${base_url}/assets/js/ui-feedback.js" >/dev/null
curl -fsS "${base_url}/assets/js/guest-motion.js" >/dev/null
curl -fsS "${base_url}/assets/css/food-showcase.css" >/dev/null
curl -fsS "${base_url}/assets/js/food-showcase.js" >/dev/null
curl -fsS "${base_url}/assets/images/food-showcase/credits.json" >/dev/null
for photo in bread pork oysters fish cocktail dessert; do
  curl -fsS "${base_url}/assets/images/food-showcase/${photo}.jpg" >/dev/null
done
curl -fsS "${base_url}/assets/css/menu-catalog.css" >/dev/null
curl -fsS "${base_url}/assets/js/menu-photos.js" >/dev/null
curl -fsS "${base_url}/assets/images/menu/credits.json" >/dev/null
curl -fsS "${base_url}/assets/js/guest.js" >/dev/null
curl -fsS "${base_url}/api/catalog" >/dev/null
curl -fsS "${base_url}/staff/login" >/dev/null
curl -fsS "${base_url}/assets/js/staff.js" >/dev/null
curl -fsS "${base_url}/assets/css/staff.css" >/dev/null
curl -fsS "${base_url}/assets/css/service.css" >/dev/null
curl -fsS "${base_url}/assets/js/service.js" >/dev/null
for workspace in server kitchen; do
  if [[ "$(curl -s -o /dev/null -w '%{http_code}' "${base_url}/${workspace}")" != '303' ]]; then
    printf 'Anonymous service workspace must redirect to sign-in\n' >&2
    exit 1
  fi
done
for endpoint in api/service/orders api/kitchen/tickets; do
  if [[ "$(curl -s -o /dev/null -w '%{http_code}' "${base_url}/${endpoint}")" != '401' ]]; then
    printf 'Anonymous order/kitchen access must return HTTP 401\n' >&2
    exit 1
  fi
done
if [[ "$(curl -s -o /dev/null -w '%{http_code}' "${base_url}/api/admin/dashboard")" != '401' ]]; then
  printf 'Anonymous staff data access must return HTTP 401\n' >&2
  exit 1
fi

if [[ "$(curl -s -o /dev/null -w '%{http_code}' "${base_url}/missing-page")" != '404' ]]; then
  printf 'Missing pages must return HTTP 404\n' >&2
  exit 1
fi

if [[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST "${base_url}/health")" != '405' ]]; then
  printf 'Unsupported methods must return HTTP 405\n' >&2
  exit 1
fi

printf 'Guest/staff/service assets, catalog, protected host/order/kitchen data, database health, 404, and 405 checks passed.\n'
