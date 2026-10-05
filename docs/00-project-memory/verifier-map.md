# Verifier Map

Purpose: Project-specific map from task types to required checks and evidence.
Read when: Defining or reviewing the verifier for an active task.
Skip when: The active task already has a complete verifier.

## Default Checks

- Code: `docker compose exec -T app php bin/lint.php`; `git diff --check`; apply additive SQL on existing and fresh isolated volumes.
- Frontend: real `tests/browser-booking.mjs`, `tests/browser-staff.mjs`, and `tests/browser-orders.mjs` against the isolated app; desktop/mobile/320px, keyboard/focus, refresh, second browser, interrupted-response recovery, countdown/server age, joined members, approval, role boundaries, host/order/kitchen workflows, settings, invitations, audit/outbox, and inert stored markup. See the three API guides.
- Backend/API: isolated `bin/test-booking.php`, `bin/test-management.php`, `bin/test-staff.php`, `bin/test-orders.php`, `tests/http-booking.mjs`, `tests/http-management.mjs`, `tests/http-staff.mjs`, `tests/http-orders.mjs`, and `bin/smoke.sh`; see the API guides for exact commands. Run resetting suites sequentially.
- Docs/skills:
- Recovery:
- Release:
- Security/high risk: guest ownership/capability binding; one-use hashed activation; password bounds/hashing; account/IP throttle; staff CSRF/session rotation/logout/idle/absolute expiry; role/version revocation including deactivate/reactivate and role round-trips; last-admin protection; recent sign-in for account writes; expiry and permission checks after locks; transaction rollback and actual multi-process inventory/pacing/waitlist/creation races.

## Required Evidence

- Command output summary:
- Manual inspection:
- Screenshot or artifact:
- Remaining risk:

## False-Pass Guards

- Do not report skipped checks as passed.
- Do not delete or weaken failing checks without recording why.
- Do not treat mocks as real integration evidence.
- Do not mark high-risk tasks done without confirmation and rollback notes.
- Fixture-resetting booking tests run only with `BOOKING_TEST_MODE=isolated` and `DB_DATABASE=tablebook_p3_test`, never against the main volume.
- Staff session-age fixtures must use the web server's `www-data` ownership and fail if session loading fails. HTTP cookie jars must follow the last Set-Cookie like a browser. Do not count a silently unchanged fixture as an expiry check.
- Preserve `.env` and the main volume. Before/after main migration verification displays aggregate counts only; never expose guest contacts or activation secrets. Staff owners choose their own passwords.
- Order checks include server assignment/claim races, client-price rejection, metadata/dietary snapshots, availability at fire, one ticket per order, replay payload binding, stale state races, ownership/item boundaries, kitchen response privacy, held/recalled age, unpaid closure, unfinished-food completion denial, archive priority, and outstanding service across midnight.
- On recovery, restore Docker Desktop and check the existing volume before starting Compose. Confirm running app code matches saved source. Lost temporary browser dependencies or a failed browser launch are not passing UI evidence; restore the tooling and rerun the remaining gate.
