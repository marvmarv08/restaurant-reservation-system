# Current State

Purpose: Current project phase, stable facts, blockers, and next recommended actions.
Read when: Starting or resuming project work.
Skip when: Only reading historical decisions or one-off command output.

## Phase

P0–P5 complete; P6 next. `PLAN.md` is the authoritative roadmap.

## Current Top Objective

Connect seated orders to real menu selections and kitchen tickets with dedicated server/kitchen permissions in P6.

## Stable Facts

- Marvin selected a ten-minute server-side hold and two-hour self-service cancellation cutoff. Modification uses the same cutoff to prevent a move-then-cancel bypass.
- Fictional venue policy, room limits, 1–16 party size, and R01–R22 are in `PLAN.md`.
- No real email/SMS delivery or payment collection is authorized.
- A reference is a public label. A private booking link authorizes access; only its hash is stored in MySQL, with binding, expiry, and revocation support.
- Menu browsing works; ordering and kitchen tickets remain P6. Staff start inactive and activate through private one-use invitations with their own passwords.
- Staff roles are admin, manager, host, server, and kitchen. Server/kitchen currently have no host/admin permissions. Reuse `StaffAccess` and `StaffSession` in P6.
- No account is activated automatically in the main stack. Marvin must run the README invitation command in his own terminal and choose a password. This app password is separate from Ubuntu/GitHub.

## What Exists and Works

The live guest website runs at http://localhost:8080. It uses current availability, a physical-table floor plan with radio fallback, owned holds with server-clock countdown, guest details, and transactional confirmation. Refresh restores holds/confirmation; private links open the same booking in a second browser. Modification locks old/new dates and inventory, preserves the original on failure, and archives changes. Cancellation retains history and releases every member.

The live staff workspace runs at `/staff/login` and `/admin`: one-use activation, throttled login, separate revocable sessions, actual reservations/floor/counts, phone/walk-in creation, pending approval, seating with one open order, completion/reset buffers, cancellation/no-show, atomic future edits, ranked waitlist offers, settings/blackouts, staff accounts, and audit/outbox. Role and expiry checks are refreshed after locks. Account changes increment `auth_version`, permanently invalidating old sessions even after role restoration/reactivation. Waitlist claims are accepted by staff; notifications follow a real ten-minute inventory hold.

Verification: 36 booking, 14 management, and 31 staff MySQL scenarios; 11 booking, 7 management, and 13 staff HTTP scenarios; 12 guest and 10 staff browser scenarios. Total 134. Independent PHP workers prove inventory, request replay, waitlist promotion/claim, revocation, and expiry races. Browsers prove real host workflows, role denials, settings/staff/outbox, stored-markup escaping, and desktop/mobile overflow. PHP lint passed on 47 files; main/test smoke and main DB safeguards passed. The additive P5 upgrade retained the 186 reservations, 31 guests, and 195 status-history rows present immediately before it, including 31 cancelled reservations. Five existing staff profiles remain inactive; seed added zero. Main Compose ports bind to loopback.

`docs/booking-api.md` and `docs/staff-api.md` document routes, security, lock order, and isolated verification. `scripts/export_roadmap.py` generates the Windows Desktop roadmap from `PLAN.md`; update it after every verified phase.

## Known Limitations

The separate kitchen prototype still simulates orders. P5 creates an empty open order on seating; completion refuses unfinished orders and voids an empty order rather than inventing payment. Food ordering, kitchen ticket states, server/kitchen operational permissions, and order closure are P6. Seated table moves, public guest waitlist claims, password recovery, room editing, and advanced reports are not implemented. Guests must save their private booking link because no real notification arrives. Local HTTP setup is for the demo; HTTPS hosting review belongs to P7. Application audit writes append records; database operators retain write access.

## Current Blockers

None. Reopen Ubuntu after Docker group changes; older sessions may lack Docker socket access.

## Next Recommended Actions

1. Define P6 server/kitchen permissions and legal order/ticket transitions around the existing open orders and menu schema.
2. Persist menu selections, quantity/price snapshots, allergy notes, and order history; connect real server and kitchen screens with controlled polling.
3. Verify duplicate submissions, state races, role denials, and unfinished-order completion protection. Keep P3–P5 regressions passing, then refresh the Desktop roadmap.

## Last Updated

2026-10-06
