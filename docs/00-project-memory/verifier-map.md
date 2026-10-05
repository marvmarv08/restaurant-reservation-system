# Verifier Map

Purpose: Project-specific map from task types to required checks and evidence.
Read when: Defining or reviewing the verifier for an active task.
Skip when: The active task already has a complete verifier.

## Default Checks

- Code: `docker compose exec -T app php bin/lint.php`; `git diff --check`; apply additive SQL on existing and fresh isolated volumes.
- Frontend:
- Backend/API: isolated `bin/test-booking.php`, `tests/http-booking.mjs`, and `bin/smoke.sh`; see `docs/booking-api.md` for exact commands.
- Docs/skills:
- Recovery:
- Release:
- Security/high risk: confirm/release ownership, CSRF, input/state validation, transaction rollback, and actual multi-process inventory/pacing races.

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
