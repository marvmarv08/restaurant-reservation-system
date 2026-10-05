# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P4 complete; P5 next. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

Implement staff authentication, server-side roles, and the host/admin workflow in P5.

## Stable Facts

- Marvin selected a ten-minute server-side hold and two-hour self-service cancellation cutoff. Modification uses the same cutoff to prevent a move-then-cancel bypass.
- Fictional venue policy, room limits, 1–16 party size, and R01–R22 are in `PLAN.md`.
- No real email/SMS delivery or payment collection is authorized.
- A reference is a public label. A private booking link authorizes access; only its hash is stored in MySQL, with binding, expiry, and revocation support.
- Menu browsing works; ordering and kitchen tickets remain P6. Staff profiles are inactive until P5 securely activates them.

## What Exists and Works

The live guest website runs at http://localhost:8080. It uses current availability, a physical-table floor plan with radio fallback, owned holds with server-clock countdown, guest details, and transactional confirmation. Refresh restores holds/confirmation; private links open the same booking in a second browser. Modification locks old/new dates and inventory, preserves the original on failure, and archives changes. Cancellation retains history and releases every member.

Verification: 36 booking and 14 management MySQL scenarios; 11 booking and 7 management HTTP scenarios; 12 real browser scenarios including 320px/mobile, keyboard selection, interrupted response recovery, two-tab rejection, joined highlights, pending approval, countdown expiry, and invalid links. PHP lint passed on 35 files, main/test smoke and main DB safeguards passed. The additive upgrade retained 185 reservations, 30 guests, and 193 status-history rows; seed rerun added 0.

`docs/booking-api.md` documents routes, security, lock order, and isolated verification. `scripts/export_roadmap.py` generates the Windows Desktop roadmap from `PLAN.md`.

## Known Limitations

The separate prototype still simulates staff and kitchen behavior. Staff authentication, manager approval actions, seating/no-show, waitlist promotion, and staff audit identity are P5. Guests must save their private link because no real notification arrives; losing the link and original session requires venue assistance. Change/cancellation messages are not delivered externally. Local HTTP setup is for the demo; hosting hardening belongs to P7.

## Current Blockers

None. Reopen Ubuntu after Docker group changes; older sessions may lack Docker socket access.

## Next Recommended Actions

1. Plan the P5 role permissions and secure staff activation/login around the existing schema.
2. Implement authorized host/admin transitions and audit identity; verify allowed and denied actions through the server.
3. Keep P3/P4 regression suites passing and refresh the Desktop roadmap after phase completion.

## Last Updated

2026-10-05
