# Task History

Purpose: Append-only compact summaries of closed tasks.

## 2026-10-05 phase0-booking-rules

<!-- pmm-task-id: phase0-booking-rules -->

- Status: done
- Parent Task: none
- Title: Resolve phase 0 booking rules and schema design
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: PLAN.md P0 Done with R01-R22; booking-engine and UX policy/schema checks passed; git diff --check clean; PMM doctor passed; Windows Desktop roadmap shows P0 Done. MySQL execution deferred to P2/P3.
- Closed At: 2026-10-05T06:16:59Z

## 2026-10-05 phase1-application-boot

<!-- pmm-task-id: phase1-application-boot -->

- Status: done
- Parent Task: none
- Title: Boot PHP and MySQL application with Docker Compose
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Live Docker Desktop PHP/MySQL/Adminer stack started; fresh Ubuntu docker compose ps shows app and db healthy; /health returns ok/db true; Adminer HTTP 200; bin/smoke.sh passed; Compose config, PHP syntax, Bash syntax, git diff --check, Desktop roadmap, and PMM doctor passed.
- Closed At: 2026-10-05T07:31:58Z

## 2026-10-05 phase2-schema-seed

<!-- pmm-task-id: phase2-schema-seed -->

- Status: done
- Parent Task: none
- Title: Create and verify MySQL schema and repeatable demo data
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh isolated Docker Compose volume auto-loaded schema and seed (179 reservations); same-day rerun added 0. Existing P1 volume upgraded without reset; 8 over-limit demo bookings cancelled with retained history. bin/verify-db.php passed FK, unique reference, active slot conflict, cancelled slot reuse, joined membership, pacing and overlap checks. Main and isolated bin/smoke.sh passed; SQL and scripts validated; Desktop roadmap refreshed.
- Closed At: 2026-10-05T08:47:53Z

## 2026-10-05 phase3-booking-engine

<!-- pmm-task-id: phase3-booking-engine -->

- Status: done
- Parent Task: none
- Title: Implement transactional availability, holds, and booking
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: 36 isolated real-MySQL scenarios passed, including separate-process final VIP table, different-start overlap, joined-member, shared pacing, and duplicate-confirmation races. Exact TTL and expiry after lock waits, P0 rules, current settings, code collisions, rollback/history, ownership and protected seed reruns passed. 11 HTTP scenarios passed for cookies, CSRF, validation, ownership, persistent confirmation/retry and release. PHP lint: 26 files, 0 failures. Main/test smoke, main DB guards, additive existing-volume upgrade and live availability (18 slots) passed. Main seed rerun added 0 and retained 185 rows. Desktop P3 Done/P4 next verified; isolated test volume removed; diff check passed.
- Closed At: 2026-10-05T11:41:52Z

## 2026-10-05 phase4-guest-mvp

<!-- pmm-task-id: phase4-guest-mvp -->

- Status: done
- Parent Task: none
- Title: Connect guest UI and secure booking management
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Passed: 36 booking MySQL scenarios, 14 management MySQL scenarios, 11 booking HTTP scenarios, 7 management HTTP scenarios, 12 real browser scenarios with no JS/CSP errors, PHP lint on 35 files, main/test smoke, main DB safeguards, unchanged main counts (185 reservations/30 guests/193 status history), zero seed additions, diff check, Desktop P4 Done/P5 next, and PMM doctor. Critic: real backend/browser evidence covers every P4 completion check; remaining staff/notification/ordering scope is documented for later phases.
- Closed At: 2026-10-05T12:50:41Z

## 2026-10-05 phase5-staff-admin

<!-- pmm-task-id: phase5-staff-admin -->

- Status: done
- Parent Task: none
- Title: Secure staff authentication and live host/admin workflow
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: PASS: 31 staff MySQL + 13 staff HTTP + 10 staff browser scenarios; P3/P4 regressions 36 booking MySQL + 14 management MySQL + 11 booking HTTP + 7 management HTTP + 12 guest browser = 134 total. Final PHP lint 47 files, main/test smoke, main DB safeguards and diff checks passed. Main additive upgrade preserved 186 reservations, 31 cancelled, 31 guests, 195 status-history rows, five inactive staff; zero seed additions. Healthy loopback containers and anonymous admin redirect verified. README, API guides, PLAN, memory and Windows Desktop roadmap updated. Remaining: owner privately chooses first admin password; real ordering/kitchen P6; HTTPS hosting review P7. No external messages/payments or push.
- Closed At: 2026-10-05T16:00:22Z

## 2026-10-05 phase6-menu-kitchen

<!-- pmm-task-id: phase6-menu-kitchen -->

- Status: done
- Parent Task: none
- Title: Connect real menu orders and kitchen service workflow
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: PASS: 28 order MySQL, 12 order HTTP and 10 order browser scenarios; P3-P5 regressions 36 booking MySQL, 14 management MySQL, 31 staff MySQL, 11 booking HTTP, 7 management HTTP, 13 staff HTTP, 12 guest browser and 10 staff browser, total 184. PHP lint 53 files, final script syntax, main/test smoke, main DB safeguards and staged diff checks passed. Separate fresh SQL/seed rehearsal passed before interruption and its disposable volume removed. Recovery restored Docker Desktop and browser libraries; main retained 198 reservations, 31 guests, 208 history rows and existing staff account. Runtime hashes matched saved source; final staff status wording was rebuilt and browser-tested. PLAN/README/API/memory/learning log and Windows Desktop P6 Done/P7 next verified. No main fixture reset, password activation, real messages/payments or push. Remaining scope: P7 polish/offline/demo, separate HTTPS deployment review.
- Closed At: 2026-10-05T22:15:45Z

## 2026-10-05 phase7-demo-readiness

<!-- pmm-task-id: phase7-demo-readiness -->

- Status: done
- Parent Task: none
- Title: Polish accessibility and verify offline demo readiness
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: 184 regression scenarios (109 MySQL, 43 HTTP, 32 browser) passed; 36 readiness checks passed on isolated and fresh demo stacks, with zero automated A/AA violations in tested states, 320/390/768/1440 reflow, keyboard focus and external-network-blocked same-record booking-to-kitchen-to-completion. Clean setup seeded 177 and rerun 0; smoke/Adminer200/DB safeguards passed. Validated demo reset, unsafe-main-volume refusal, cached-image restart and retained closed order/served ticket. Actual main fixture refused before connection/writes. PHP54 lint, shell/JS syntax, main/test smoke, source hashes and PMM doctor passed. Main198 reservations/31 guests/208 history/one active staff/zero orders retained. Disposable volumes removed; roadmap/Desktop and learning notes updated; staged diff clean without private env.
- Closed At: 2026-10-05T22:48:45Z

## 2026-10-05 table-showcase-research

<!-- pmm-task-id: table-showcase-research -->

- Status: done
- Parent Task: none
- Title: Research table-specific previews and an accessible showcase
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Primary W3C dialog/carousel/gesture guidance, OpenTable dining-area behavior, Baymard gallery research and image performance docs checked; verified free Unsplash/Pexels photo pages and official Kenney CC0 pack/license. Three photos and one CC0 preview downloaded/visually inspected with credits and hashes. All25 public physical tables/four rooms/declared G1-G2 group documented; JSON/JS snapshot mapping and report links checked. Concept passed29 exact-table/room, mobile320/390/768/1440, keyboard/focus, zero automated A/AA violations in tested states and offline/no-JS-error checks. Local preview and assets HTTP200. Live booking/backend/data unchanged; S1-S3 explicitly planned. Desktop P7Done and S1 resume verified. Syntax, staged diff and PMM doctor passed.
- Closed At: 2026-10-05T23:27:59Z

## 2026-10-05 table-showcase-final-review

<!-- pmm-task-id: table-showcase-final-review -->

- Status: done
- Parent Task: none
- Title: Finalize research asset formatting and local delivery
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Corrected prior research closure: original downloaded Kenney License.txt CRLF/trailing whitespace caused staged diff check failure. Normalized whitespace only and compared all wording tokens to the official zip License.txt; identical. All four image hashes intact. Actual git diff --cached --check and working diff check now pass; PMM doctor zero warnings/failures. Prior29 concept checks remain applicable (no concept behavior changes); final local inventory/source links and served assets HTTP200 checked. No live code/data edits or external publication.
- Closed At: 2026-10-05T23:29:16Z

## 2026-10-06 seating-view-refinement

<!-- pmm-task-id: seating-view-refinement -->

- Status: done
- Parent Task: none
- Title: Refine realistic seating pictures and useful showcase effects
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh final verifier passed 38 checks: all 26 asset/source/recipe hashes, exact 25 table previews, four rooms, 320/390/768/1440px reflow, zero automated A/AA violations in tested states, modal focus/Escape, offline pictures, fallback, rapid navigation, selected feedback and normal/reduced motion. Final square/round/long/joined renders and desktop/mobile layouts visually inspected. JS/renderer syntax, inventory wrapper and report links passed; Windows Desktop export refreshed; unstaged/staged diff checks and PMM doctor passed. Main app and database untouched. S2/S3 live integration remains planned.
- Closed At: 2026-10-06T01:42:09Z

## 2026-10-06 showcase-scroll-restoration

<!-- pmm-task-id: showcase-scroll-restoration -->

- Status: done
- Parent Task: none
- Title: Keep the complete seating picture visible when reopening
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh final showcase suite passed all 38 checks, with additional assertions for initial scroll position at all four widths and reopening a scrolled dialog at mobile width without sticky-header overlap. Corrected mobile screenshot visually inspected. All image/recipe/source hashes, offline/fallback, accessibility, keyboard/focus and reduced-motion checks remain passing. JS syntax, staged/unstaged diff checks and PMM doctor passed. No main runtime or data changes.
- Closed At: 2026-10-06T01:50:13Z

## 2026-10-06 live-table-showcase

<!-- pmm-task-id: live-table-showcase -->

- Status: done
- Parent Task: none
- Title: Connect table showcases to database-backed availability
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh final showcase verifier passed 40 checks against actual isolated MySQL: all25 previews, server options/blackout/second-session hold/release, safe selection, joined group and image fallback, network failure/12s timeout, 30s polling/45s expiration, stale-time refresh/late-response guards, protected management preservation, offline assets, mobile320/390/768/1440, zero automated A/AA issues in tested states, keyboard/focus and motion preferences. Prior final-flow integration runs passed 12 guest/management and36 readiness checks; last announcement cleanup is covered by fresh40 rerun. Public assets/source hashes,25 main catalog-art mappings, measured color contrast, JS syntax,54 PHP lint,report links,Desktop roadmap,main smoke/DB safeguards,exact deployed-source and read-only main browser checks passed. Main198 reservations/31 guests/208 history/6 staff1active/0orders0tickets retained after final image recreation without seed/reset. Staged/unstaged diff and PMM doctor passed. S0-S3 locally delivered; no auth/schema/rule changes or publication.
- Closed At: 2026-10-06T02:36:17Z

## 2026-10-06 restore-room-card-photos

<!-- pmm-task-id: restore-room-card-photos -->

- Status: done
- Parent Task: none
- Title: Restore photo previews on live room cards
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh focused room-photo verifier passed12 read-only checks:4 locally loaded photo mappings,oval overlay removed,exact V1/C1/G1/T1 opening,mobile320/390/768/1440 reflow,zero automated A/AA violations,image failure remains usable,no JS errors or booking/hold writes. Screenshot visually inspected. Permanent regression assertion added (full41 suite not rerun for this visual-only correction). JS syntax,Desktop export,staged/unstaged diff and PMM doctor passed. Final local image recreated without seed/reset;main smoke,exact deployed source and actual4 main photos verified. Main counts/staff exactly match original baseline.
- Closed At: 2026-10-06T03:19:21Z

## 2026-10-06 linked-capacity-filters

<!-- pmm-task-id: linked-capacity-filters -->

- Status: done
- Parent Task: none
- Title: Link guest counts and room preferences by database capacity limits
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: Fresh34 capacity checks passed using actual database catalog and group16 availability: guest-first1-16 exact room matches, room-first all4 ranges/VIP2-10/Group5-16, Any-room escape, preserved/adjusted values, legacyVIP1 normalization, polite announcement/focus, clearing old results/indicators, mobile320/390/768/1440 andzero automated A/AA issues. Existing12 guest/management and41 live-showcase scenarios passed sequentially including joined groups and protected management preservation. JS syntax,54 PHP lint,docs links,Windows Desktop export,diff and PMM doctor passed. Updated main image recreated without seed/reset;main smoke,exact deployed source and read-only main guest16/VIP2-10 browser checks passed. Main counts/staff exactly match pre-deploy baseline. No SQL/schema/auth/policy changes or publication.
- Closed At: 2026-10-06T03:40:57Z

## 2026-10-06 ui-effects-research

<!-- pmm-task-id: ui-effects-research -->

- Status: done
- Parent Task: none
- Title: Research purposeful effects across guest and staff interfaces
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: 19 primary-source entries reviewed via web; remote GitHub Phase0 identified with owner account; local source and guest/showcase/sign-in browser review1440/390 plus reduced motion; no POSTs in normal contexts; 14 local links, implementation-status boundaries, docs-only scope, Desktop checkpoint, diff check and PMM doctor passed. Protected screens source-reviewed only; no new effects, performance result or full conformance claimed.
- Closed At: 2026-10-06T04:14:02Z

## 2026-10-06 e1-shared-feedback

<!-- pmm-task-id: e1-shared-feedback -->

- Status: done
- Parent Task: none
- Title: Implement shared response states across guest and staff interfaces
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: 26 focused feedback checks and 143 existing browser checks passed sequentially (12 guest, 10 staff, 10 orders, 41 showcase, 34 capacity, 36 readiness). Covered actual delayed requests/saved orders, duplicate guards, stable buttons, fast completion/timer cleanup, persistent errors/recovery, touch, reduced motion, four widths and tested A/AA rules. JS syntax, 54-file PHP lint, isolated/main smoke, served-source match, read-only main mobile check, rollback DB safeguards and unchanged main aggregates passed. Documentation links, Desktop E1 export, diff check and PMM doctor passed; E2-E4 remain proposed, no new runtime library/backend policy/schema/auth changes.
- Closed At: 2026-10-06T04:47:21Z

## 2026-10-06 e2-guest-transitions

<!-- pmm-task-id: e2-guest-transitions -->

- Status: done
- Parent Task: none
- Title: Add scoped guest transitions and reliable navigation focus
- Execution State: done
- Verification State: passed
- Delivery State: not-requested
- Verification Evidence: 31 focused guest-motion checks plus 149 relevant regressions passed (26 E1 feedback, 12 guest, 34 capacity, 41 showcase, 36 readiness). Verified paused/interrupted/missing-API/reduced motion, visible heading focus, menu focus/count, same-page draft preservation/clearing, actual confirmed/pending bookings, passive private-management focus, late/reopened/missing pictures and capability-verified fake-booking cleanup. JS syntax, 54-file PHP lint, isolated/main smoke, rollback DB guards, exact served source, read-only390px main check with zero booking POSTs, retained aggregate records, doc links, Desktop export, diff check and PMM doctor passed. Chromium automated states only; E3-E4 remain proposed; no backend/schema/auth/credential changes.
- Closed At: 2026-10-06T05:17:51Z

## 2026-10-06 restaurant-video-ui

<!-- pmm-task-id: restaurant-video-ui -->

- Status: done
- Parent Task: none
- Title: Adapt the restaurant video reference across application surfaces
- Execution State: done
- Verification State: passed
- Delivery State: deployed
- Verification Evidence: Reference adaptation from the inspected Horai cover preview: all 200 existing browser checks passed (12 guest, 10 staff, 10 orders, 41 showcase, 34 capacity, 26 feedback, 31 motion, 36 readiness). Eight read-only main checks passed: local hero image, 320/390/768/1440px reflow and automated A/AA rules in tested states, missing-image layout/form fallback, Reserve navigation, zero mutations/JS errors. Guest and authenticated staff/server/kitchen screenshots reviewed. Main/test smoke, 54-file PHP lint, rollback DB safeguards, all five delivered visual/credit hashes, Desktop export equality and diff check passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff/one active and zero orders/tickets. Full stream HTTP 403; exact unseen video motion is not claimed. E3/E4 remain deferred; no backend or polling changes.
- Closed At: 2026-10-06T06:00:31Z

## 2026-10-06 table-reserve-desktop-location

<!-- pmm-task-id: table-reserve-desktop-location -->

- Status: done
- Parent Task: none
- Title: Move the working Table Reserve project to the Windows Desktop
- Execution State: done
- Verification State: passed
- Delivery State: deployed
- Verification Evidence: Complete Desktop source/configuration copy verified byte-for-byte across 1641 files before final location-note completion; Git HEAD, branch, all references and Marvin author identity matched, Git fsck passed, .env remains ignored, Windows sees both folder and configuration. Canonical Desktop working folder is active; former Linux entry resolves to it and the original is retained in a dated recovery backup. Main smoke passed from the Desktop folder and counts remained 198 reservations, 31 guests, 208 status-history rows, six staff/one active, zero orders/tickets. PMM doctor and diff check passed. No database reset/seed, credential change, GitHub operation or publication.
- Closed At: 2026-10-06T09:00:25Z

## 2026-10-06 lumina-food-showcase

<!-- pmm-task-id: lumina-food-showcase -->

- Status: done
- Parent Task: none
- Title: Curated moving food showcase
- Execution State: done
- Verification State: passed
- Delivery State: deployed
- Verification Evidence: 220 browser checks (20 food plus 200 existing), 8 read-only live checks, independent review resolved focus issue and approved harness waits, main/test smoke, 54-file PHP lint, JS/Bash syntax, rollback DB safeguards, 10 delivered source hashes, all 6 photo manifest hashes, retained aggregate main counts, Desktop roadmap match and PMM doctor passed
- Closed At: 2026-10-06T09:34:34Z

## 2026-10-06 lumina-menu-photography

<!-- pmm-task-id: lumina-menu-photography -->

- Status: done
- Parent Task: none
- Title: Menu photography and responsive category navigation
- Execution State: done
- Verification State: passed
- Delivery State: deployed
- Verification Evidence: Verified 2026-10-06: 241 browser checks (21 menu plus 220 regressions), 11 isolated booking HTTP and 10 read-only live checks passed. Real names/descriptions/prices/tags and unavailable fixture, 36 mapped menu keys and 34 local photo checksums, 35 live source matches, 320/390/768/1440px focus/reflow/tested-state A/AA, image fallback and reduced motion verified. PHP lint 54 files, main/test smoke, JS/Bash syntax, rollback DB safeguards, diff check, exported Desktop roadmap and PMM doctor passed. Independent scoped review approved product and harness waits; main retained 198 reservations, 31 guests, 208 history, 6 users/1 active, 0 orders/tickets. Fresh logs /tmp/lumina-menu-*-verification.log; canonical Desktop project unchanged in scope.
- Closed At: 2026-10-06T10:13:55Z
