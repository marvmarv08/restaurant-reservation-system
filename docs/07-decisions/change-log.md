# Change Log

Purpose: Chronological record of durable project behavior, requirement, implementation, and operation changes.
Read when: You need recent durable changes or must record a state-changing task.
Skip when: You only need the active task or current state.

## 2026-10-27 — Add a local restaurant introduction before reservations

- Added a source-researched homepage with original garden-estate concept imagery, supplied company story and an immediate native Continue action. Existing reservations move to `/reserve`; direct management/staff routes remain available. Root booking/menu fragments and queries retain their destinations.
- Kept images/fonts/scripts local, optimized desktop/phone backgrounds, provided keyboard/no-JavaScript/image-failure navigation and scoped styling. Booking APIs, rules, data and online privacy settings were preserved.
- Verified 27 intro/navigation and 21 existing seating checks, eight widths, desktop/phone review, accessibility, PHP111/JS/test syntax, both localhost smoke checks and identical main/preview database fingerprints. Independent review has no application blocker; migrated full branding/staff checks are not claimed as rerun.
- New lesson: a restaurant introduction can communicate identity and story while keeping reservation links immediate and directly reachable. A native link keeps browser history, keyboard use and no-JavaScript navigation working; decorative media must not control task access.

## 2026-10-27 — Restrict website and repository access

- At Marvin's request, changed the GitHub repository to PRIVATE and enabled Vercel Authentication for all deployments, including old previews and the Bella Vista alias. Fresh provider metadata confirmed both settings.
- Kept all deployments, databases and app credentials intact. Public access must remain disabled until Marvin explicitly requests it again; earlier release notes record the previous public state.

## 2026-10-27 — Publish Bella Vista website and source

- Marvin authorized the latest Bella Vista preview for GitHub/Vercel, approved a separate online database preserving legacy records, and explicitly deferred always-running worker hosting. Local main activation and proposal/full assignment acceptance remain separate.
- Initialized nine-unit/36-menu Bella Vista profiles without test bookings/payments; retained the existing online staff sign-in within the same service. Protected old database fingerprints matched. Private new-schema backup restored into a separate local recovery schema with all 47 table counts/content hashes matching.
- Verified 237 MySQL scenarios, disabled-preorder regression, 44 HTTP and 218 browser checks, 18 fee/six terms/five hosted-config checks, nine seating assets, PHP 110-file lint, 14 JS syntax checks and exact-image smoke. The existing local worker passed three autonomous/restart cases; this does not supply hosted worker execution. Original populated isolated preview was restored and its 46-table recovery matched. Service-hours browser testing used only an isolated connection timestamp restored afterward.
- Independent review found/fixed optional-table access when preorders are disabled and overstated guest automation wording. Each correction had an observed failing/passing regression; terms v2 preserves distinguishable prior acceptances. Disabled Git-triggered deployments so explicit new-database settings are used for this release. GitHub source `21f85e2` is published. Public Ready Preview: https://bella-vista-dining-marvmarv08.vercel.app; deployment `dpl_3Vz4Ue97D6a6TBdv6pKJgGAc8zgE` verified as Preview in sin1 with matching source/project and public alias. Vercel Authentication/password protection are off; no direct live URL fetch or full hosted-browser acceptance is claimed.
- New lesson: publishing source code and changing the database are different operations. A separate database can preserve a previous app while a new catalog is released, and a website host that stops idle containers needs separate hosting for a continuously running worker.

## 2026-10-18 — Save next-session roadmap handoff

- At Marvin's request, recorded the exact B7 resume point in PLAN.md and project memory: preserved B1–B6 preview delivery/evidence, workspace/URLs, missing proposal/team inputs, B8 acceptance and separate main activation.
- Added startup/recovery precautions: preserve existing dirty source/private configuration/volumes, recheck app/worker state, and do not rely on temporary tooling/dumps as durable backups. No product, database or deployment action belongs to this checkpoint save.

## 2026-10-18 — Deliver isolated original identity and required company story

- Added original garden-arch/sprout/plate emblem, local SVG favicon/company banner and palette/type/source guide. Branding is consistent across guest, management and all operational headers.
- Prominently displayed the complete supplied About/2021 estate-to-independent-restaurant history with an academic-source note. Six-link navigation preserves rooms/menu/manage/Reserve across desktop/tablet/phone; original realistic media and credits remain intact.
- Verified 19 branding and 21 existing seating browser checks, nine seating assets, exact rendered profile/history against restaurant.docx, valid SVGs, PHP 109 lint, JS syntax and both localhost smoke checks. Main 37-table/configuration and 267 protected files matched; seven intended existing product files changed. Read-only review checked intermediate tablet widths and found no actionable issue. Fixed a visible-label/accessibility-name mismatch without suppressing validation.
- No main refresh/activation, database reset, account/pricing changes or publication. B1 remains In progress pending main/final acceptance; next is B7 proposal and defense package.
- New lesson: SVG keeps a simple original logo sharp at different sizes, while real text labels retain accessibility. Branding also needs traceable company content: a supplied history belongs in the project with its source clear, without inventing a real address or affiliation.

## 2026-10-18 — Deliver isolated operational states and reconciled daily reports

- Added real Available/Reserved/Occupied/Clean-up/hold/closure labels, early-arrival/overrun handling, precise cleanup, live-button focus preservation and clearer staff/kitchen hierarchy.
- Added read-only admin/manager reports: finalized non-void food by dining date, actual receipts/refunds by transaction date, separate fees/retention and credit inside food value. Aggregation, snapshot consistency and protected history prevent misleading totals.
- Fixed live already-fired pre-order assignment while retaining owner/version/replay and closed/finalized protections. Actual browser rehearsal covers guest booking through kitchen/server/cashier and host cleanup. Test-only arrival relocation is explicit.
- Verified 25 new MySQL + 32 browser checks; early occupancy/live polling/server claiming have red/green coverage and bounded read-only review. Main activation/publication remain excluded; B6 stays In progress at the isolated/main boundary. Next: finish B1 branding/About/History, then B7/B8.
- Final affected regressions passed 163 MySQL + 118 browser checks; original populated data restored with only the B6 flag, exact 46-table recovery repeated with both writers, main 37-table/config and 258 protected-file fingerprints matched. PHP 109 lint, syntax, assets and both smoke checks passed.
- New lesson: a dining date and a payment date answer different questions. Finalizing food makes it reportable; an advance is received money without an extra food sale. Assigning a server to food already in the kitchen must not refire the order.

## 2026-10-18 — Deliver isolated cancellation reconciliation and automatic arrival release

- Added full accepted terms, preserved 24-hour deadlines, fee/food-safe reservation changes, actual base/extra receipt/refund review and separate same-day retained base. Governing terms for staff creations never imply guest consent. No real money transfers.
- Added isolated autonomous arrival worker/restart catch-up. Seating/release locks preserve one outcome and food handoff; seated parties remain occupied. Recovery stops active/restarting writers and refuses manually paused recovery before mutation.
- Verified 26 MySQL + 22 actual browser checks, 5 pure policy cases, 3 autonomous worker/restart cases, populated 46-table restore; retained 186 MySQL + 76 browser regressions. Syntax, assets, main 37-table/configuration and 166 protected-source checks passed. Main activation/publication remain separate.
- Reproduced and fixed same-day/midnight rescheduling bypass, wrong replay deadline, missing staff terms, repeated availability profile queries and Any-room fee lookup. Full B5 integration remains isolated; roadmap B5 stays In progress pending main activation. Next: B6 operations/food-sales reports.
- New lesson: cancellation, eligibility review and an actual refund are separate records. Never convert an assessed fee into received money. A time-dependent fee guard must run again after database lock waits, and a background worker is a writer that must be stopped during recovery.

## 2026-10-18 — Deliver isolated guest food cart and accepted quote

- Added explicit test-only B4 schema/menu preparation, preserving original menu identities while cloning 36 actual dishes into the three assigned combined categories. Normal startup does not activate it.
- Guest cart edits/removal/live totals lead to a server-priced review and explicit food/fee acceptance. Transactional confirmation stores original/current snapshots; prices, availability, expiry and canonical replay payloads are validated. No invented payment/food credit and no mandatory Standard prepaid cart.
- Private scheduled-food edits use capability/version checks and the inclusive 24-hour cutoff, with original acceptance/history retained. Arrival validates stock/minimum/time/inventory and hands scheduled food to one kitchen ticket. Staff see accepted dishes; cancellation stops unfired food. B5 reconciliation still guards schedule/category/guest-count edits/deletion and protects financial records.
- Verified 21 real MySQL,25 guest browser and 4 staff/billing checks; 165 prior MySQL and 32 existing browser regressions; actual populated 43-table restore and exact preview recovery,88-file PHP lint,JS syntax, nine preserved seating assets, smoke/main/source checks. Main data/config/image unchanged; no real payment, commit or publication.
- Review corrections: keep ambiguous confirmation retry available after hold expiry, clear definitively expired orphan state, scope pending food saves by booking, handle same-tab private links, retain updated labels after loading, and recheck quote/edit deadlines after row-lock waits. Added real blocked-worker and committed-response-loss regressions.
- New lesson: scheduled food and a kitchen ticket represent different promises—save the accepted food now, fire it only on validated arrival. A deadline must still hold after waiting for database locks. Pending requests belong to a specific booking; opening another private link must never reuse its unresolved save.
- B4 remains In progress at the isolated/main activation boundary; next is B5 reconciliation, not production activation.

## 2026-10-18 — Restore realistic Bella Vista seating previews

- Replaced the target catalog's forced flat diagrams with nine local original Blender images in a dedicated bella-vista folder. Standard/Family/VIP show four/eight/twenty physical chairs. Retained illustrative-concept captions and the existing image loader; a missing VIP image now has twenty nonoverlapping fallback chairs.
- Preview descriptions accurately distinguish the Standard food minimum, consumable Family/VIP base and separate VIP extras. Booking/financial rules are unchanged.
- Verified nine asset hashes/seat positions/provenance, 21 real isolated browser checks and 38 legacy concept checks; actual desktop/phone and each arrangement inspected. Syntax and isolated smoke passed. All 37 main table/configuration fingerprints and 261 unaffected source/asset files matched.
- Independent review caught a legacy recipe-hash regression: preserved the original renderer byte-for-byte and moved assignment orchestration into its own wrapper. The legacy verifier now passes. No main image refresh, database write/reset, payment, commit or publication.
- New lesson: a realistic picture can remain an illustrative design. Keep physical chair counts aligned with capacity and record the source recipe and texture license; preserve the original recipe so historical images retain truthful provenance.
- Next: isolated B4 guest cart/fee confirmation. B1/B2/B3 remain In progress; later assignment deliverables remain pending.

## 2026-10-18 — Deliver isolated fees, Standard seating and cashier records

- Added explicit test-only billing preparation with reservation accounts, immutable application receipt/refund events and payload-bound request recovery. Server quotes use saved food lines and integer centavos; base food credit is cumulative and cannot pay non-consumable VIP extras. Direct onsite settlement does not add the base fee twice.
- Admin/manager cashier records cash/external-card receipts and reviewed unused-credit refunds, without moving money or processing card details. Quote revisions, role/CSRF checks, partial payments and reload-persisted exact retries protect mutations. Finalized bills and financial history cannot be edited/deleted through old order/reservation routes.
- Standard seating validates at least ₱1,000 in current menu-priced food atomically; below-minimum status/order changes roll back, and later edits/voids preserve the minimum. Below-base Family/VIP bills require explicit manager review of unreceived allowance instead of an invented food minimum. Financial cancellation remains blocked pending B5 reconciliation.
- Verified 18 fee calculations,20 real billing MySQL scenarios,145 B2/legacy regressions and 15 real cashier browser checks. Actual populated41-table dump/drop/restore matched all counts/hashes; finalized bills/receipts/food links and repeated preparation passed. PHP 82 lint, JS syntax, main/test smoke, CLI guard, change-scope and project-memory checks passed.
- Independent review found a below-base closure deadlock and qty99/30 mismatch; fixed with focused evidence. Also fixed browser startup-date and accessible-label issues; tested an actually committed receipt with a deliberately lost response, reload and recovery without duplicate payment.
- B3 stays In progress: isolated core delivered, main activation/B4/B5 integration pending. No real transaction, main schema/data/image change, seed/reset, publication or commit. All 37 main fingerprints/configuration and 206 unmodified protected baseline files matched; ten intended existing source files changed. New files are limited to billing service/schema/controller/view/UI/tests/tooling.
- New lessons: assessed fees are not receipts; unpaid allowance is not refundable cash. A food credit cannot settle a separate extra-person charge. Retain the exact request after an ambiguous response and recover the saved result instead of issuing another receipt.
- Next authorized task: inspect Marvin's newest screenshot and make its indicated visuals realistic like the old app, preserving rules.

## 2026-10-17 — Deliver isolated Bella Vista inventory and schedule

- Implemented explicit schema preparation (reservation CHECK 1–20) separately from transactional catalog staging/activation. Nine new target units use new IDs; all 25 legacy identities/history remain. Activation rejects unresolved service/holds/bookings and edited staged policies; retries preserve IDs. Existing startup/init never activates the target profile.
- Shared profile-aware policy/catalog and guest/staff controls support assigned capacities, Tuesday–Sunday 10–22, 15-minute starts, 120-minute dining and 15-minute reset through 22:15. Fixed settings remain protected while blackouts/technical controls remain available. Main legacy defaults and running image remain untouched.
- Verified 19 B2 MySQL scenarios, 126 legacy scenarios (41 booking, 14 management, 43 staff, 28 orders), and 12 real browser checks including guest confirmation/reload, staff 20-person final-slot booking and desktop/phone views. PHP 72 lint, JS/Python syntax, main/test smoke and change-scope checks passed.
- Independent review corrections: reject staged notice/approval/minimum/joinability drift, retain settings/blackout controls, complete actual browser mutation flows. Legacy regressions also prompted preservation of schedule/pacing row IDs. Restore tooling stops the isolated HTTP writer and requires exclusive CLI ownership.
- Actual populated isolated dump/drop/restore matched all 38 table hashes/counts; old/current private links, twenty-person booking and historical food-order amount passed afterward. Retained/restored the populated preview around final legacy regressions; recovered dump content matched exactly. Dumps stay private outside the repository.
- B0 decisions/recovery planning is Done; B1/B2 remain In progress (B2 isolated delivered/main pending), B3–B8 Pending. README/PLAN/current-state/verifier map/research pointer/implementation plan/Desktop copy updated. Fees, cart, assigned cancellation/grace and reports are not delivered by B2.
- All 37 main database fingerprints and private/Compose configuration remained unchanged; only six intended pre-existing product files changed, with unrelated prior work preserved. No main refresh/migration, main seed/reset, real payment/message, commit/push or deployment.
- Lesson: a PHP capacity change cannot bypass a MySQL CHECK constraint. Prepare schema explicitly, activate catalog transactionally, and prove preservation with real populated restore—not an empty database or assumed rollback around DDL.

## 2026-10-17 — Reconcile operational contracts and nine-unit conversion plan

- Marvin requested continuation and “update all,” retaining supplied-file alignment. Reconciled PLAN.md, README, research status pointer, current state and Desktop export. Selected Standard minimum at seating, arrival-triggered kitchen firing, explicit table/order states, trusted quote review and separate food-sale/receipt date bases.
- Selected no inherited global/category advance notice, strict future-grid starts, a disclosed existing 60-day technical horizon, VIP minimum 1 where the brief supplies no lower bound, and no joined target tables or 13+ approval gate. Required limits remain Standard 2–4, Family 5–8 and VIP maximum 20; no extra charges/mandatory food minimums were invented.
- Read-only main audit found 25 legacy active units and G1-G2, with zero reservations, bindings, live holds and orders. Recorded exact legacy families/IDs and nine new target identities; preserve old IDs/history, retire from new availability, do not fabricate a one-to-one conversion. Re-audit before activation.
- First implementation batch is isolated B2 inventory/schedule; fresh/populated conversion, retry/interruption, legacy-read, concurrency and actual restore checks remain required. B0/B1 stay In progress; B2–B8 stay Pending. No product changes, main migration, seed/reset, payment, external message or publication.
- Verification: direct assigned inventory/minimum/menu/report wording and all three DOCX fingerprints matched; actual read-only catalog/dependency audit, category boundary arithmetic, all nine phase states, active-doc status and Desktop export passed. All 209 protected source/configuration/exporter files and all 37 main table fingerprints matched the baseline. git diff --check and PMM doctor passed. Standalone arithmetic is not app-test evidence; no restore rehearsal is claimed.
- Lesson: retiring a table stops new bookings without erasing its identity. A current empty database simplifies a plan but cannot replace a populated-data migration/restore test or a fresh activation check.

## 2026-10-17 — Select file-aligned cancellation and refund rules

- Marvin asked the assistant to choose the best recommendations, provided they align with the supplied files. Selected an exact 24-hour guest cutoff and preserved mandatory same-day Family/VIP paid-base non-refundability. Late cross-midnight requests are not mislabeled same-day; exceptional staff recording does not make a request timely.
- Added clearly labeled project policies for timely refunds of actual eligible receipts, reviewed unused VIP-extra refunds, unresolved residual-credit manager handling, unpaid/no-show distinctions and immutable cancellation history. No new automatic penalties or charges. Refund approval and actual completion remain different states.
- Removed the earlier proposed general Standard-minimum waiver: the required ₱1,000 minimum must be maintained through corrected/replacement orders. No product behavior was changed.
- Lesson: notice eligibility, calendar-date fee forfeiture and actual money movement are separate checks. A cancellation does not prove a refund, and an unpaid fee cannot be recorded as money forfeited.
- Roadmap/project-memory/Desktop documentation only; B0 remains In progress and implementation phases remain Pending. Verification uses standalone boundary models, not running-app test claims.

## 2026-10-17 — Approve onsite payment for the first version

- Marvin approved onsite cash/card settlement after the meal. Booking confirmation does not require online payment; authorized staff record actual receipts. The app does not process cards or store card details.
- Retain separate food, consumable-fee and non-consumable VIP-extra lines, with no double collection. This choice does not approve unresolved unused-credit, cancellation/refund or no-show policies.
- Updated PLAN.md, current state and Desktop roadmap. Documentation only; no application, configuration, database or payment action. B0 remains In progress and B3 remains Pending.

## 2026-10-17 — Approve base-only VIP consumable credit

- Marvin selected ₱2,500 base-only food credit and separate non-consumable ₱300 charges for each guest above 15, up to five extras. Updated the requirement matrix, decision status, examples and next action; other policy proposals remain pending.
- With 16 guests and ₱5,000 food, total is ₱5,300. A paid ₱2,500 base leaves ₱2,800 due; a paid ₱2,800 base-plus-extra leaves ₱2,500 due. The extra charge never reduces food value. Refund/cancellation treatment of extras remains unresolved.
- Documentation and Desktop export only; B0 remains In progress and B3 remains Pending. No app, configuration or database changes.

## 2026-10-17 — Prepare remaining B0 policy package

- Added a reviewable proposal in PLAN.md covering onsite settlement, received-funds-only consumable credit, Standard minimum upon seating, guest/staff cancellation boundaries, arrival-triggered kitchen handoff and dated food/receipt reports. Explicitly distinguish assigned rules from proposed choices; only the earlier schedule is approved.
- Included Family/VIP arithmetic showing why extra-person consumability changes the final bill, a residual-credit example and cross-midnight cancellation. VIP extras, unused funds, VIP minimum and exact lead time remain decisions rather than hidden assumptions.
- Added a staged conversion design: read-only legacy mapping, additive schema versus catalog activation, isolated fresh/existing/retry rehearsal, private backup/restore verification and write-aware recovery. No migration or backup is claimed performed.
- Lesson: a consumable reservation fee is not automatically an extra food charge. “Assessed,” “received” and “applied” amounts need separate records, and cancellation eligibility differs from refund entitlement.
- Scope remained documentation and Desktop export; no product/configuration/database writes or external actions.

## 2026-10-17 — Approve rolling two-hour dining schedule

- Marvin approved starts every 15 minutes, full 120-minute dining and 15-minute cleanup. Service remains Tuesday–Sunday 10:00–22:00; last dining is 20:00–22:00 with internal cleanup through 22:15. Monday remains closed.
- Distinguished explicit assignment wording from implementation choices: two-hour dining, service days and hours are supplied requirements; the rolling grid and cleanup placement are approved interpretations. Replaced the earlier unapproved fixed-start recommendation in PLAN.md; B0 and B1 are In progress, B2–B8 remain Pending.
- Recorded same-table reuse, closing/occupied-table boundaries and future B2 coverage. Standalone interval arithmetic is documentation evidence only, not running-app acceptance. Other B0 financial, cancellation, conversion and kitchen/report decisions remain open.
- Lesson: the spacing between selectable starts differs from the length of a reservation. Cleanup blocks table reuse without shortening dining; final dining closure and internal cleanup completion need separate boundaries.
- Scope: roadmap, project memory and Desktop export only; no application/configuration/database changes, main seed, payment, messaging, publication or deployment.

## 2026-10-17 — Align the visible restaurant name with Bella Vista Dining

- Implemented Marvin's approved restaurant-name choice across guest/staff/service titles/headers, visible floor/signature/operations labels and future simulated outbox subjects. Retained original technical globals/storage keys, account identities, booking references and old message history.
- Used the supplied Filipino/continental concept for introductory copy and removed invented demo phone/location claims from static identity/contact surfaces. Footer identifies the academic project; existing licensed media and visual design remain. B1 is In progress, with custom logo/full About/History and all business-rule conversion still unfinished.
- Verified 43 isolated staff MySQL scenarios, 32 guest/staff/order browser scenarios, 20 desktop checks and 30 focused public/authenticated branding/layout checks. Final guest recheck passed after copy review. PHP lint (65 files), JS syntax, main/test smoke, credit JSON and all ten changed application-file hashes passed. Actual desktop/phone views reviewed; no JavaScript errors.
- Refreshed only the main app container with `--no-deps --no-build` after building its image. All 37 main table fingerprints and existing configuration matched the pre-change snapshot. Kept the former image as `tablebook-app:before-bella-name`; no main seed/reset, account migration, real message/payment, push or deployment.
- Lesson: a restaurant's display name can change without renaming saved account addresses or internal software identifiers. Keep assignment progress honest: a correct name does not establish correct inventory, schedule, fees or completed branding.

## 2026-10-17 — Research Bella Vista requirements and restaurant references

- Checked exact-name/profile matches and first-party namesakes in La Union, New Jersey, Bali and Santa Barbara. No reviewed source establishes the assignment's exact real client/history; do not infer affiliation or founding from a shared name/copyright year.
- Compared Farmer's Table, Sonya's Garden, Balay Dako and Qsina. Three read-only desktop browser visits produced inspected captures; no forms/transactions were submitted. Farmer's Table is the concept recommendation, not an approved rebrand; Balay Dako's no-reservations regular dining is explicitly excluded as policy inspiration.
- Saved research/15_bella_vista_requirements_research.md with official platform/technical/W3C/DFD/estimating sources, current-code findings, B0 options, a proposed DFD and future acceptance cases. PLAN.md/README/current-state link it and add specific B0–B8 safeguards without marking implementation complete.
- New lessons: MySQL atomic DDL is not a multi-statement rollback plan; a preorder is not a fired ticket; consumable advances require one-time allocations across food rounds; food sales and receipt-date collections can legitimately differ. A same-name business is not proof of client identity.
- Verification: 32 unique primary-source links on reviewed official domains, three HTTP-200 read-only browser capture records, source-code references, supplied-document fingerprints, pending phase/authority boundaries, calculation examples, complete Desktop export and exporter syntax checked. All 211 protected source/configuration/exporter files matched research-start hashes; git diff --check and PMM doctor passed. No product test suite or final DFD rendering is claimed. Scope remained research/documentation/export; no database/configuration/product behavior, real payments, publication or deployment changed.

## 2026-10-17 — Align the roadmap with the Bella Vista assignment

- Read all text/tables in Marvin's three supplied DOCX files; record file hashes and source-to-requirement traceability in PLAN.md. Assignment business rules replace conflicting Lumina targets; existing P0–P7 and guest UI delivery evidence remain historical.
- Added B0–B8 for decisions, branding/company history, exact nine-unit inventory and hours, fees/consumable credits, guest pre-orders, policy enforcement, operational reports, proposal deliverables and final acceptance. Recorded all rubric weights, boundary examples and genuine ambiguities without claiming implementation or an earned score.
- Reprioritized UI-01 into B6 and required company/history into B1. Added a README scope notice and current-state recovery pointers. The Desktop export now includes the active compliance roadmap ahead of historical phases.
- Verification: all three source hashes, B0–B8 pending states, preserved P0–P7 history, requirement/proposal coverage, rubric weights, calculation arithmetic, complete Desktop export and Python syntax passed. All 210 protected application/configuration/test files matched task-start hashes; git diff --check and PMM doctor passed. Scope remained documentation/export only, with no application/configuration/database changes, payment, publication or deployment.
- Lesson: passing tests against an earlier business policy does not prove compliance with a newly supplied assignment. Track each assigned rule, its current evidence and a future acceptance check; a consumable fee is a credit against a bill, not extra revenue to count twice.

## 2026-10-14 — Deliver the approved desktop guest UI batch

- Added guest-only local display/body fonts, stable hero alignment after real searches, persistent desktop navigation and anchor/focus offsets, coordinated heading motion, truthful completed form-step markers and an available signature-dish spotlight. The larger Kinilaw photograph retains its original author, license and source records; menu list thumbnails and staff/kitchen source behavior remain unchanged.
- Verified 20 focused desktop checks, 126 database, 44 HTTP and 296 existing browser checks, plus the returning-browser cache regression. PHP lint on 65 files, JS syntax, main/test smoke, local asset/hash checks and actual 1280/1366/1440px views passed. Real main searches showed 0px headline shift. An app-only image refresh retained all 37 main table fingerprints and existing configuration; no main seed/reset or publication.
- Verification repairs: isolate font fallback from heading-animation timing; wait for the actual completed video fade; and search a uniquely named saved row when the all-date list is paginated. Independent review’s hidden-feature concern was covered by the existing important hide rule and an actual visibility assertion.
- New lessons: guest-only font/style loading protects operational views that share base CSS; sticky navigation needs focus/anchor offsets; enlarged photos need adequate source pixels; and completed form steps describe progress while booking badges show the server’s saved status.

## 2026-10-14 — Desktop UI and motion research

- Marvin requested deep UI/motion research, then clarified that laptop/computer presentation takes priority. Inspected actual guest screens and six public restaurant references; five reference visits produced visual evidence, while Amici timed out. Official product, motion, browser and font sources support the comparison. Authenticated operational recommendations are based on source/public documentation, not an executed staff demonstration.
- Proposed first batch: stable desktop composition after search, local display/body typography, persistent navigation, heading choreography, completed booking-step markers and a genuine signature-dish spotlight. Existing room/menu/photo motion is explicitly retained as delivered work. Later batches cover changed-record feedback and a separately reviewed voluntary motion control.
- Read-only startup measurements show booking controls fit at 1366×768 and 1280×720; the 720px card has little remaining vertical room. Baseline screenshots and verification requirements are in `research/14_ui_motion_refresh_research.md`. No application code, configuration, main database writes, seed/reset, push or deployment.
- New lesson: before adding an effect, compare it with the running app. Coordinated typography and stable layout may improve a presentation more than duplicating animations that already exist; update cues must follow real record changes rather than every refresh.

## 2026-10-07 — Licensed chef cooking background

- Marvin chose a subtle looping cooking video behind the existing food-showcase text. Compared 12 source pages and visually inspected three eligible clips; selected Pexels 8964522 for its dark pan/flame imagery. Restricted personal-use Mixkit downloads were excluded.
- Trimmed, resized, removed audio and crossfaded the loop seam: 7.36 seconds / approximately 1.2 MB. Added a dark overlay, source credits, lazy visible playback, shared Pause/Resume, reduced-motion and unavailable-stream poster fallback. Existing desktop/phone photo behavior is preserved.
- Eight new video checks, 21 showcase regressions and eight actual hosted read-only checks passed; screenshots and conservative text contrast were reviewed. Source 05cd40c; full research/license/processing/delivery evidence: research/10_chef_background_video_research.md.
- Lesson: A video loop needs both a licensed source and a controlled playback lifecycle. Compress and defer the footage; keep essential text readable over the brightest frame and retain a usable static poster.

## 2026-10-07 — Phone food showcase motion

- Previous phone behavior was swipe-only because both JavaScript and mobile CSS disabled motion. Added slow horizontal autoplay with end reversal and touch pause/Resume, preserving desktop vertical motion.
- The new phone regression failed before implementation; all 21 showcase checks and six read-only hosted checks passed. No booking, staff or backend changes. Source 6cd997a; delivery and evidence: docs/verification/mobile-food-motion.md.
- Lesson: Mobile motion should yield to a guest's swipe and stop when hidden or Reduce Motion is requested.

## 2026-10-07 — Full hosted workspace performance

- The local database benchmark did not capture Vercel session/network/UI delays. Authenticated browser timing exposed Vercel iad1 versus Aiven DigitalOcean sgp. Aligning compute to sin1 reduced normal table/admin/service interactions to fractions of a second.
- Parallel initial reads, shared pending refreshes and response revision guards preserve current filters and saved data without a completed-data cache. The PHP/Apache runtime was reduced from 721 MB to 322 MB; actual idle startup remains approximately 4–5 seconds and is documented honestly.
- Verified 404 isolated application checks, 22 extra runtime checks, independent review and repeated 21-check actual hosted interaction runs. Details and measured before/after values: docs/verification/workspace-loading.md.
- Lesson: Measure the complete deployed click-to-ready path. Query counts alone cannot reveal cross-region latency, session overhead or cold container startup. Keep warm and idle measurements separate.

## 2026-10-06 — Hosted availability performance

- Problem: Marvin reported slow hosted functions. A read-only PHP container probe against the actual Aiven database with verified TLS measured a common-room search at 82,674.1 ms and 726 SELECTs; a simple query took roughly 112–118 ms. Repeated per-slot/per-table round trips dominated the search. Single-slot checks took 5,367.5 ms and 45 SELECTs; catalog loading took 1,560.1 ms and 11 SELECTs.
- Change: Fetch inventory, memberships, scoped blackouts, occupied reservations, live holds and pacing totals in eight bounded reads. Guest, management and staff grids reuse only that request's view. Each hold/confirm/change/waitlist check creates a new view under the existing transaction/locks, with its own reservation and hold exclusions. No cross-request availability cache or schema changes were introduced.
- Measurement: The common-room grid took 1,850.6 ms with a source-mounted probe and 2,568.9 ms in the built release container, both with 14 SELECTs after optimization. A single-slot check including policy loading took 1,924.5 ms and 13 SELECTs. Measurements are from a local container using Aiven; they exclude Vercel startup, HTTP overhead and browser rendering.
- Verification: Query-budget regressions failed before optimization (726 search reads, 40 single-slot reads without policy), then passed. Search-specific tests cover new/expired holds, touching intervals, scoped blackouts, joined setup tails, seated overruns and existing-reservation pacing exclusions. Final isolated verification passed 398 checks (114 MySQL, 43 HTTP, 241 browser), 63-file PHP lint and the release container build. Preview https://restaurant-reservation-system-cqf5ojxvr-marvmarv08.vercel.app is READY with Container framework and Preview target; ownerId matches Marvin team and actual cloud logs confirm image/VCR build completion. Source 761bea6 is pushed to Marvin GitHub. APP_URL is updated privately. Actual hosted timing acceptance remains pending. Independent read-only review found no unresolved correctness issues.
- Lesson: A database query is a request across the network. Hundreds of fast local queries can become a minute-long hosted request. Batch the reads, keep the view short-lived, and still check inventory again inside the transaction before saving.

## 2026-10-06 — Hosted guest/admin acceptance

- Change: Delivered the PHP/Apache Vercel Preview in Marvin's selected workspace with separate encrypted Aiven MySQL and persistent sessions. Explicit Container selection avoids static PHP source delivery; task-created temporary static/production artifacts were removed.
- Evidence: Previous source verification passed 393 regressions and 45 hosting checks, with fresh review's session-collection race fixed. Marvin now confirmed actual menu/categories, reservation confirmation, staff activation/sign-in and admin dashboard. Fresh read-only checks confirmed READY Preview status, one active staff and 175 reservations over verified TLS. No guest details, passwords or activation tokens were recorded.
- Lesson: Deployment status proves packaging/readiness; actual browser rehearsal proves the guest/admin flow. Database credentials and staff passwords are separate. Online and laptop databases retain separate records.
- Scope: Accepted guest/admin hosted flow; broader hosted order/kitchen manual rehearsal is not claimed. Deployment source remains on feat/vercel-full-system; no main-branch merge or laptop data migration was performed.

## 2026-10-06 — Synchronize completed project work to GitHub

- Request/delivery: Marvin postponed Featured Dish work and requested pushing all completed work. Verified the active owner marvmarv08 and existing private repository, checked remote ancestry, and pushed all 18 unpublished commits plus the 62-file restaurant-visual/menu snapshot through 3921aca. GitHub main matched the Desktop HEAD with a clean tree before recording final delivery notes. History was preserved with a normal push.
- Verification: Full publishing gate passed 393 automated checks: 109 MySQL, 43 HTTP and 241 browser. Complete PHP lint (54 files), JavaScript/Bash syntax, main/test smoke, staged whitespace and PMM doctor passed. The candidate tree and unpublished historical blobs were checked for private configuration values, recognizable credentials and GitHub file-size limits. Main retained 198 reservations, 31 guests, 208 history rows, six users/one active and zero orders/tickets.
- New lesson: A commit saves a named checkpoint locally; push uploads those checkpoints to GitHub. The upload includes earlier unpushed history, so checking only the latest files can miss an old secret. Ignore rules keep private configuration out of future commits; database records still live in Docker storage and are not uploaded by a code push.
- Remaining scope: Featured Dish work is explicitly postponed. E3/E4, story/location and public website hosting require a later request. Source and Git history are synchronized; private configuration, staff credentials and main records remain local.

## 2026-10-06 — Menu photography and responsive category navigation

- Request/change: Marvin approved menu photos and category navigation from the restaurant reference. Added 28 licensed local thumbnails (673 KiB), reused six gallery photos and mapped all 36 database image keys to 34 photographs. Guest dish rows now include thumbnails, with a desktop category sidebar and horizontal phone strip. Selected category, count, keyboard focus, genuine catalog data and existing short/reduced-motion transitions remain usable.
- Photo decision: New Pexels images and six individually licensed Wikimedia Commons photographs retain original author/source/license records. Visible notices explain illustrative recipes/presentation; expandable credits name authors, sources, licenses and crops. Failed or unknown photo keys show a fixed-size text fallback.
- Verification: All 241 browser checks passed: 21 menu, 20 food-showcase, 12 guest, 10 staff, 10 orders, 41 table-showcase, 34 capacity, 26 feedback, 31 guest-motion and 36 readiness. Eleven isolated booking HTTP checks and ten read-only main checks passed. Four viewport widths (320/390/768/1440px), actual catalog content, keyboard focus, image failure and zero automated A/AA violations in tested menu states were verified. Main/test smoke, 54-file PHP lint, JavaScript/Bash syntax, rollback database safeguards, all 34 photograph checksums and exact matching of 35 delivered source/asset files passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff/one active and zero orders/tickets.
- Verification repair: The readiness test opened a reservation while Refresh was still replacing its opener, and closed an order before a completed save rebuilt the dialog. Awaiting restored controls, genuine success messages and native dialog closure resolved both races. Independent review approved the synchronization changes; exact opener focus and persisted lifecycle assertions remain intact. The menu unavailable check also accommodates the existing uppercase visual label. Staff/service product code did not change.
- New lesson: A database image key identifies a dish; a local whitelist translates it into an approved photograph. Keeping that mapping separate lets prices, descriptions and availability remain authoritative even when a photo fails or is only illustrative. Each reused photograph keeps its own license and attribution.
- Delivery: The Desktop project and localhost:8080/#menu are updated locally. No main seed/reset, credentials/booking-rule changes, commit/push or publication. E3/E4 and other reference sections remain separate scope.

## 2026-10-06 — Curated moving food showcase

- Request/change: Marvin asked for deep food-photo research and a moving gallery inspired by the full restaurant video, with discretion to fit Table Reserve. Compared ten candidates and selected six credited local Pexels photographs (384 KiB total). Added an editorial gallery below the booking hero: slow desktop columns, Pause/Resume, hover/focus/visibility pauses, mobile swipe/keyboard browsing and static preference/no-JavaScript/observer fallbacks. Stock photos are clearly food inspiration; exact dishes, prices and tags remain in the database menu.
- Verification: All 220 browser checks passed: 20 food-showcase, 12 guest, 10 staff, 10 orders, 41 table-showcase, 34 capacity, 26 feedback, 31 guest-motion and 36 readiness. Eight read-only main checks passed, including local photos, motion/Pause, real menu data and 320/390/768/1440px reflow with zero automated A/AA violations in tested states. Independent review found a clipped keyboard focus ring; its failing regression and focus-specific fade override resolved it, with a visibly reviewed focus screenshot. Main/test smoke, 54-file PHP lint, JavaScript/Bash syntax, rollback database safeguards and exact matching of all ten delivered gallery/source/credit files passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff/one active and zero orders/tickets.
- Verification repairs: Independent review caught a fade mask hiding keyboard focus; a failing regression and focused mask override fixed it. Existing order tests clicked the next action before save/refresh completion; waits now use genuine completion states. The smoke script consumed a larger HTML response through an early-closing pipe; it now reads the whole response before checking. Both harness changes were reviewed; no service/booking behavior was changed.
- Lesson: Good food photography should match the menu's ingredients and the site's palette. A stock photo can establish atmosphere without claiming to be the exact dish. Motion needs a user-controlled pause and a static alternative; automated accessibility checks can miss a visually hidden keyboard focus indicator, so screenshots and keyboard review matter.
- Delivery: Desktop project source and localhost:8080 app updated locally, with no main seed/reset, account changes, commit/push or publication. E3/E4 remain deferred. Sources and limits are in research/09_food_showcase_research.md.

## 2026-10-06 — Save the working project on the Windows Desktop

- Request/change: Marvin requested that files be saved on his actual Windows Desktop. The canonical project is `C:\Users\burgo_w8uuyg3\OneDrive\Desktop\restaurant-reservation-system`, including source, research, plans, existing private configuration and full Git history. Future work uses this folder. The former Linux entry points there; the original remains in a dated recovery backup.
- Preservation: No existing Desktop project was overwritten. Existing `.env` credentials are retained without being displayed and remain ignored by Git. Marvin's local author identity, current branch/history and unfinished source edits are retained. Main Docker database storage is unchanged; no seed/reset, account change or GitHub publication was requested.
- Verification: Initial Desktop copy matched all 1,641 non-Git files byte for byte. Windows recognizes the project and private configuration; main app smoke passed. All Git references/HEAD/branch and author identity matched; Git object integrity and PMM doctor passed. The old Linux entry resolves to the Desktop, and the original is retained in the dated backup. Main smoke and retained counts passed: 198 reservations, 31 guests, 208 history rows, six staff/one active and zero orders/tickets. Windows file-mode differences are ignored by repository-local Git configuration.
- Lesson: Code/configuration files and database records have different storage. Copying a complete repository preserves its history and edits, while the existing Docker volume preserves reservations. Windows Desktop storage removes the need to navigate a per-Windows-account Ubuntu path to find the project.

## 2026-10-06 — Restaurant reference visual adaptation

- Request/change: Adapted Marvin's Ahmed Codes restaurant reference using its accessible Horai cover preview. The guest hero now fills the page width with an existing licensed dining inspiration photo, a dark gradient, a large italic serif headline, softer gold and an opaque booking card. Guest, staff and service branding share the palette and display typography; functional controls retain their structure. The photo remains labelled as inspiration.
- Boundary: Public video metadata and the actual rendered preview were inspected; the full stream returned HTTP 403. Unseen animations were not inferred. Existing E1/E2 motion remains; E3/E4 stay deferred. No services, authentication, schema, policy, polling or main data were changed. Docker Desktop and temporary browser libraries/tools were restored for real verification.
- Evidence: 200 existing browser checks passed across all eight suites, including real guest/host/server/kitchen completion with external networking blocked. Eight read-only main visual/fallback/navigation/accessibility checks passed across four widths. Authenticated screenshots were inspected. Main/test smoke, 54-file PHP lint, rollback DB safeguards and all five delivered-file hashes passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff including one active and zero orders/tickets; app-only recreation ran no seed/reset. Automated audits cover tested Chromium states.
- Lesson: Translate a reference's typography, contrast and imagery into the existing product while preserving each control's purpose. Decorative image failure must leave text, layout and booking usable. A preview supports visible design choices; it does not prove unseen animation behavior.
- Next: Marvin reviews the local design after a hard refresh and rehearses the existing booking/service flow. Exact full-video comparison requires the video file if TikTok remains inaccessible; hosting and E3/E4 are separate work.

## 2026-10-06 — E2 guest transitions and navigation focus

- Change: Added native cancellable guest motion using E1 tokens: one 220 ms hero entrance, 180 ms deliberate booking/management transitions and 140 ms menu/results/disclosure feedback. Headings focus and reveal immediately; menu focus stays on its category; passive management refresh restores its control without replaying an entrance. Explicit table selection acknowledges the choice and focuses its new radio.
- Input handling: Choosing another table preserves typed contact details in page memory. Completion/new reservation clears the draft; this adds no new browser-storage persistence. Existing hold/confirmation recovery remains intact. Existing image fade/revision guards/fallback are preserved. No auth, policy, schema or transaction changes were made.
- Evidence: 31 focused guest-motion checks passed, including paused/interrupted/disabled/unsupported motion, visible focus, input preservation/clearing, real confirmation/pending approval, private management, late/reopened/missing pictures and verified capability-based fake-booking cleanup. Relevant 149 regressions passed (26 E1, 12 guest, 34 capacity, 41 showcase, 36 readiness); tested automated A/AA states were clear. Main health, 54-file PHP lint, smoke, rollback DB safeguards, exact source and read-only 390px browser checks passed. Main 198 reservations/31 guests/208 history rows, 6 users including 1 active, 0 orders/tickets retained.
- Lesson: The animation explains a change; it must not control when the booking saves or where focus goes. Cancelling an animation should leave usable final content. Keep typed details through a same-page Back flow without adding unnecessary contact-data persistence.
- Next: E3 feedback tied to genuine operational data changes, then E4 cross-browser/mobile/motion/performance review.

## 2026-10-06 — E1 shared response states

- Change: Added local shared response CSS/JS to guest, staff and service pages. Existing action guards expose specific pending labels and aria-busy while preserving button size and restoring attributes. Slow guest/host table searches get static placeholders after 200 ms; fast completion cancels the placeholder timer. Success messages use polite status semantics; errors persist and background host refresh does not take focus.
- Correctness: Clear prior service success before a new action. A saved order followed by a failed read refresh is reported as saved inside its dialog, without a duplicate-mutation retry. Hold-expiry disabling survives pending-control cleanup. No schema, auth, policy, credential or backend state-machine change was made.
- Evidence: 26 focused feedback checks passed using real delayed HTTP responses and actual isolated order saves;143 existing browser checks passed (12 guest, 10 staff, 10 order, 41 showcase, 34 capacity, 36 readiness). Covered duplicate guards, fast/slow/failing/recovered requests, timer cleanup, dimensions, touch, motion preferences, four widths and automated A/AA rules in tested states. Success-role expectations were updated while retaining cancelled-record checks. 54 PHP files passed lint; isolated/main smoke and exact source delivery passed. Main 198 reservations/31 guests/208 history rows, 6 users including 1 active, 0 orders/tickets retained after app-only recreation. A read-only main mobile browser check and the rollback-based database safeguards passed.
- Lesson: Pending feedback must describe work still in progress; success follows the saved response. A failed refresh after a successful save does not mean the mutation failed. Keep the original label in layout to prevent button movement, cancel delayed placeholders, and announce ordinary success without treating it as an error.
- Next: E2 scoped guest transitions, E3 operational change cues, E4 final motion/accessibility/performance review. E1 adds no polling entrance animation or new runtime library.

## 2026-10-06 — Research UI effects across guest and staff workflows

- Delivery: Added research/08_ui_motion_research.md with 19 reviewed primary sources, source anchors for every major workflow, existing/proposed distinctions, timing defaults, implementation technology comparison and E0–E4 phases. E0 research is complete; new effects remain proposed. Linked the report from README/PLAN and marked the earlier competition-oriented effects study as historical.
- Decision: Keep restrained showcase effects; prioritize truthful pending/success/error feedback and scoped guest transitions. Operational views need cues tied to genuine data changes so two-second kitchen polling does not replay ticket entrance animations. No new library is recommended for the selected effects.
- Evidence: Read-only GitHub API verified remote main at Phase 0; local source review used ae447c5. Guest/showcase/sign-in browser inspection at1440/390px confirmed existing timings, no page overflow, dialog focus/return, and reduced-motion behavior. This was research verification, not a new regression, performance or conformance result; protected workspaces were source-reviewed. Local report links, 19 source entries, documentation scope, Desktop export, diff check and PMM doctor passed.
- Lesson: An effect needs a trigger, a truthful state, a short duration and an instant alternative. Recreating a DOM element during polling can restart its CSS animation even when the underlying data did not change. Shared timing tokens help consistency; they do not establish user preference or measured speed.

## 2026-10-06 — Linked guest and room capacity choices

- Request/change: Marvin’s screenshot showed an incompatible one-guest VIP search. Linked the two booking dropdowns using room_types.min_party/max_party and the global catalog.max_party: guest-first choices hide incompatible rooms, and room-first choices show only supported guest counts. Initial defaults allow either field to be chosen first; submitted/restored searches preserve their capacity context. Valid values survive changes. An incompatible count moves to the nearest valid count with a visible polite announcement. Any room restores all guest choices.
- Safety: Capacity changes clear old time/table results and preview eligibility. Public and private-management searches share this helper; existing booking data stays unchanged until the established Continue/Save action. PHP availability and transaction validation remain authoritative. No database/schema/auth/policy changes were made.
- Evidence: 34 focused catalog/availability/browser checks passed across counts1–16, all room ranges, VIP2–10, Group5–16, preserved/adjusted values, Any-room escape, legacy query normalization, real group16 search, stale-result clearing, keyboard focus, four widths and zero automated A/AA issues. Existing12 guest/management and 41 live showcase scenarios passed, including joined groups, protected management, photos and failure recovery. Local main smoke, source matching and unchanged-record verification passed after recreation without seed/reset.
- Lesson: Dependent dropdowns should use the database rules, preserve compatible choices and explain any automatic change. An escape choice prevents users becoming stuck in a restricted range. Capacity matching helps form input; date/time availability still needs the server check.

## 2026-10-06 — Restore photos on the room cards

- Correction: Marvin's screenshot showed the live room cards still displaying legacy CSS ovals even though individual table pictures worked below. The integration had retained the old room artwork instead of carrying over the study's photo previews.
- Change: Restored the existing local, licensed inspiration photos on VIP/Main/Group/Terrace cards, removed the oval overlay, retained click-to-open behavior, and labelled the reference imagery. Failed photos leave a readable, usable card; subtle hover zoom respects reduced motion.
- Evidence: Twelve focused read-only browser checks passed for the four local mappings, correct V1/C1/G1/T1 opening, 320/390/768/1440px reflow, zero automated A/AA violations, image failure and no booking/hold writes. A photo assertion was added to the permanent showcase suite. The full earlier 40-case integration evidence remains historical; this correction uses focused verification.
- Lesson: Verify the entry cards visually as well as the detail gallery. Passing click/navigation checks does not prove that the intended pictures were retained during integration.

## 2026-10-06 — Database-connected table availability showcase

- Change: Delivered room/floor/all-table opening in the live guest and private-management flows, with local Seating view artwork and labelled inspiration. Green/red/neutral badges use the existing MySQL eligibility response for the selected date/time/party/room preference. Text, symbols and dashed floor outlines supplement color; brief effects respect reduced motion.
- Safety: Browsing changes no booking/hold. Explicit Use rechecks availability and synchronizes existing radios/floor, including joined members; Continue/Save retains existing server transactions. Open/visible galleries refresh every 30 seconds, results expire after 45 seconds, stalled checks abort after 12 seconds, and late responses cannot overwrite a new search. Changing to a time from an expired snapshot triggers a fresh read rather than relabelling old data as current. Protected management previews leave the original booking intact until Save.
- Research: W3C color/contrast/status/dialog/motion guidance and NN/G system-status/animation research informed the UX. The chosen refresh intervals/effect durations are project decisions, not universal timings or measured conversion results. Sources and limits are in research/07_table_showcase_research.md section 10.
- Evidence: 40 fresh showcase checks passed with actual isolated blackouts, a second-session hold/release and private management. Twelve existing guest/management and 36 readiness checks passed after integration; the final announcement cleanup was covered by the fresh showcase rerun. Zero automated A/AA issues in tested states, four viewport sizes, keyboard/focus, failure/offline/delay/freshness and both motion preferences verified. Asset hashes, color contrast, syntax, PHP lint (54 files), main smoke/DB safeguards and exact running source checked. Main retained 198 reservations, 31 guests, 208 history rows, six staff/one active, zero orders/tickets; no main reset, seed, policy/auth changes or publication.
- Lesson: Availability is calculated for a schedule and party, not stored as one permanent table flag. A table can be free physically and still ineligible because of capacity, room preference, notice or pacing. Use precise labels rather than calling every red table booked.
- Lesson: A green result is a snapshot, not ownership. Freshness limits, request-version checks and server revalidation prevent old browser data from authorizing a booking. Effects help explain a change but cannot enforce inventory rules.
- Next: S0–S3 complete locally; review the connected viewer and rehearse in the disposable demo.

## 2026-10-06 — Realistic single seating view

- Request/change: Removed From above and kept its overhead seat arrangement in Seating view. Built original furniture with timber grain, beveled tops, upholstered chairs and soft shadows. Saved 25 physical-table renders and a separate G1–G2 composite, using catalog shapes/capacities and a credited CC0 Poly Haven texture. IKEA was a visual reference only; its photos/models were not reused.
- UX: Added brief image/dialog transitions, clear selected borders, choice feedback and a static loading message. Optional motion is enabled only when reduced motion is not requested. Local SVG layouts retain controls and text after image failure.
- Evidence: 38 focused study checks passed: asset/recipe/source hashes, all 25 exact previews, four rooms, 320/390/768/1440px reflow, zero automated A/AA violations in tested states, keyboard/modal focus, fallback, offline use, rapid navigation and both motion preferences. Original rendered furniture and desktop/mobile layouts were inspected visually.
- Lesson: A static 3D render is an ordinary image at runtime. Modelling from catalog data makes seat counts checkable and keeps the browser simple. A realistic image still does not prove actual venue dimensions or accessibility; retain accurate text and label illustrative artwork.
- Repair/lesson: A reopened native dialog can retain its earlier scroll position. Reset scroll at opening and focus the heading without scrolling; a mobile reopen assertion checks that the sticky header leaves the seating picture visible.
- Lesson: Effects should explain opening, loading or selection, and preserve a complete static experience for users who request reduced motion.
- Next: S1 study visuals are complete; S2 live integration and S3 booking verification remain planned. Main app code, data and credentials are unchanged.

## 2026-10-06 — Table showcase research and clickable study

- Request: Marvin wants per-table picture previews and sliding browsing. The screenshot shows four room cards; clicking one should open its room showcase, while a floor-table click should open the exact table.
- Decision: Recommend a named modal with large table visual, seating/top/room views, thumbnails, arrows and touch scrolling. Use original perspective illustrations first or later static renders from CC0 models. Keep browsing separate from booking selection and preserve existing holds/rules.
- Sources/assets: Primary W3C dialog/carousel/gesture guidance, OpenTable dining-area behavior, Baymard gallery findings and image-performance documentation. Downloaded and inspected three licensed Unsplash/Pexels references and a CC0 Kenney overview; credits, licenses and hashes saved with the study.
- Evidence: All 25 public table entries and the one declared joined group are mapped. The standalone study passed 29 checks for exact-table/room opening, named views, mobile reflow, keyboard/focus, zero automated A/AA violations in tested states, loaded local images and no external requests/JS errors. Live booking code and main data were unchanged. S1 visuals, S2 integration and S3 live verification are planned, not delivered.
- Lesson: A room card is a category; a specific table is inventory. Stock pictures can convey atmosphere, but cannot establish an exact table's real appearance or accessibility. Consistent illustrations can show known shape and capacity while the server remains responsible for availability.
- Resume: `research/07_table_showcase_research.md`; concept at localhost:8092/table-showcase/concept.html during the local research-server session. P0–P7 remain Done.

## 2026-10-06 — Phase 7 accessibility and offline demo readiness

- Change: Improved menu-label contrast, named the service dialog, restored keyboard focus to order openers after asynchronous actions, and made management/service skip targets focusable. Added a separately configured disposable demo stack, validated reset targets, real architecture/schema diagrams, verification commands and an eight-minute walkthrough.
- Evidence: All 184 P3–P6 regressions and 36 new readiness checks passed. The same guest-created booking completed all host/server/kitchen stages in isolated and fresh demo stacks with external browser networking blocked. Tested A/AA states had zero automated violations; 320/390/768/1440px reflow and keyboard focus passed. Fresh source setup on this laptop started PHP/MySQL/Adminer, seeded 177 reservations and added 0 on rerun. Cached-image restart retained service records. Unsafe-volume reset configuration and main fixture execution were refused before writes. PHP lint (54 files), main/test smoke, DB safeguards and running-source hashes passed. Main retained its 198 reservations, 31 guests, 208 history rows and active account; disposable rehearsal volumes were removed.
- Decision: Keep live booking and seating rules unchanged. Only guarded disposable verification data skips the waiting interval. The eight-minute manual presentation uses an earlier prepared eligible booking for service and a separate new future guest booking. No fake clock or preset main staff password was introduced.
- Lesson: An app running offline and an initial installation without internet are different checks. Cache Docker images first; then verify the live pages and actions make no external requests. Separate demo storage permits safe resets without touching retained project data.
- Lesson: A keyboard user needs a clear return point after closing a dialog. An asynchronous action may disable or replace the original button, so explicit restoration must handle the new rendered control.
- Lesson: Cookies are shared across ports on a hostname, even when databases are separate. Use separate browser profiles to prevent demo sign-in from replacing the main session.
- Limits: Automated accessibility checks cover tested states and do not certify all WCAG requirements. Marvin still rehearses by hand, using real service timing. Public hosting/HTTPS, real notifications, payments, password recovery and stretch features remain separate work.

## 2026-10-06 — Phase 6 real food orders and kitchen service

- Change: Added dedicated server/kitchen permissions and workspaces, server-owned assignment, menu lines with quantity/course/price/name/station/tag snapshots, allergy and booking notes, one persistent ticket per sent order, explicit prepare/item-ready/ready, hold/resume, server delivery, recall, service closure, subsequent rounds, and event/audit identity. Every action uses a version and account-bound request UUID. Main host completion recognizes closed food rounds while refusing unfinished food.
- Decision: Kitchen confirms readiness; server confirms delivery. Closing service records `closed` and does not invent payment. Sent lines are frozen; manager/admin may void a whole order with a reason. Holds and recalls retain the original elapsed timer. Station-filtered views display the full matching ticket because whole-ticket controls affect every station. Outstanding service remains visible across midnight; active work is prioritized over old archived rows.
- Evidence: 28 order MySQL, 12 order HTTP, and 10 order browser scenarios passed. All P3–P5 gates passed, totaling 184 automated scenarios. PHP lint passed on 53 files; main/test smoke and main database safeguards passed. Fresh isolated SQL/seed rehearsal passed. Recovery restarted Docker Desktop, restored temporary browser libraries, and reran the final gates; main source hashes matched ten changed runtime files. The initial P6 seed added 12 date-relative demo reservations for the new calendar day. Main resumed with 198 reservations, 31 guests, 208 history rows, and the existing active staff account; its volume and credentials were retained. No main orders/tickets were fabricated for screenshots.
- Lesson: A price snapshot saves the agreed item price when the line is added. Changing the menu later should not rewrite an existing order's price, name, or kitchen station history.
- Lesson: Kitchen readiness, food delivery, service closure, and payment are different events. Explicit states make the demo truthful and prevent a host from releasing tables while food is unfinished.
- Lesson: A calendar filter must not hide unfinished work at midnight. Tickets keep their original server time even when held or recalled, so elapsed age remains meaningful.
- Recovery: Keep `.env` and the main volume. Additive SQL can be rerun after an interrupted setup; avoid resetting data or reverting enum definitions after new order states have been used. Temporary verification tools may disappear between sessions; recover from project files, confirm actual runtime state, and finish the required checks before marking a phase done.
- Remaining work: P7 accessibility/mobile review, offline demo readiness, diagrams, safe disposable rehearsal/reset, and demo documentation. Public hosting, real messages/payments, menu/room editors, partial post-send edits, and advanced reports remain outside delivered scope.

## 2026-10-06 — Phase 5 secure staff and live host workspace

- Change: Added one-use activation with hash-only tokens, bcrypt passwords, database-backed account/IP login limits, separate staff sessions, current server-side permissions, recent-auth account writes, and permanent account-version revocation. Connected host/admin pages to real reservation/floor data, phone/walk-in booking, atomic future edits, approval, seating with one order, completion/reset, no-show/cancellation, waitlist offers, settings/blackouts, staff management, audit, and simulated outbox. Main app now binds to loopback by default.
- Decision: Owners choose passwords through private activation; no shared demo password or automatically activated main account. Walk-ins bypass only online lead time in Main Dining/Terrace. Keeping an existing room/time preserves original notice eligibility. Waitlist acceptance is staff-mediated and holds all physical tables before recording a notification. Empty seated orders are voided on completion rather than marked paid. Existing stored booking intervals remain stable when settings change.
- Evidence: 31 staff MySQL, 13 staff HTTP, and 10 staff browser scenarios passed; P3/P4 regressions remained passing, totaling 134 scenarios. Tests include independent-process queue/claim/creation races, expiry/revocation after locks, role round-trips, last-admin protection, settings conflicts, actual workflows, desktop/mobile, and stored markup. PHP lint passed on 47 files; main/test smoke and main DB safeguards passed. The additive upgrade and seed kept all pre-upgrade 186 reservations, 31 guests, and 195 history rows, including 31 cancelled bookings; five existing staff remain inactive. Source guides and resume checkpoint updated for P6.
- Lesson: Signing in proves identity; a permission check decides which actions are allowed. A role change must revoke old sessions permanently. A version that only increases prevents an old session becoming valid again after a role is restored.
- Lesson: A waitlist message promising a table needs a real inventory hold first. A transaction saves the hold, all table members, and the notification together; expiry is enforced after waiting for locks.
- Lesson: A creation request ID makes a repeated network submission safe: the server returns the same booking instead of inserting a duplicate. Verification fixtures must truly change the intended state; web session files require the web server's ownership, and cookie tests must match browser behavior.
- Remaining work: Marvin privately activates the first admin for hands-on use. P6 implements real menu/order/kitchen workflows and server/kitchen permissions; P7 covers HTTPS hosting and demo readiness. No external messages/payments, password recovery, public guest waitlist claim, seated table moves, room editor, or advanced reports are claimed.
- Recovery: Keep the existing `.env` and MySQL volume. `bin/setup-db.sh` performs an additive upgrade without resetting data. Never run isolated fixture resets on the main stack.

## 2026-10-05 — Phase 4 live guest MVP

- Change: Connected the responsive guest site and menu to MySQL, with real availability, SVG/radio selection, server-clock hold countdown, details, confirmation, refresh recovery, and private self-service management. Private secrets travel in URL fragments and request headers; MySQL stores hashes with expiry/revocation. Atomic modification locks both dates and all old/new physical tables, preserves the original on failure, and records before/after snapshots. Versions reject stale tabs. Cancellation releases inventory with history retained.
- Decision: Modification shares the two-hour cancellation cutoff so a last-minute guest cannot move a booking solely to bypass the cancellation rule. The reusable management link expires one day after the booking's blocked interval, updated when the date/time changes. No real notification or payment is sent; guests save their private link. Staff/manager actions remain P5.
- Evidence: 14 management MySQL, 7 management HTTP, and 12 browser scenarios passed; the 36 MySQL/11 HTTP booking regressions remained passing. Actual browsers verified refresh, second-browser access, interrupted confirmation recovery, conflicting tabs, cancellation confirmation, joined highlights, pending approval, countdown expiry, keyboard selection, and 320px/mobile layout. PHP lint passed on 35 files; main/test smoke and main DB safeguards passed. The additive upgrade retained 185 main reservations, 30 guests, and 193 status-history rows; seed rerun added 0. The known demo menu encoding error was repaired without replacing edited data.
- Lesson: A reference such as `LUM-XXXXXX` identifies a booking; it does not prove permission. A private link acts like a password and must be protected. The server checks expiry and cutoff after waiting for database locks, because a browser timer or disabled button cannot enforce those rules.
- Lesson: Searching for a replacement must leave the original reserved. An atomic save either completes all inventory changes or rolls them back. A version number tells the server when another tab changed the booking, avoiding an accidental overwrite.
- Next: P5 staff authentication, permissions, host/admin workflow, and audit identity; P6 ordering/kitchen integration follows.

## 2026-10-05 — Phase 3 transactional booking engine

- Change: Added database-driven availability, scoped blackouts, room/notice/turn/close rules, ten-minute owned holds, transactional confirmation, code collision retries, and idempotent confirmation. All joined members are locked and saved. A per-date lock protects pacing across different tables. Guest API mutations require the guest session and CSRF token. Cancellation remains an internal service for future authorized controllers; notifications stay in the demo outbox.
- Evidence: 36 isolated MySQL tests and 11 HTTP tests passed, including separate-process races for the final VIP table, overlapping starts, joined members, pacing, and confirmation. Expiry while waiting for locks was rejected. PHP lint passed on 26 files; main/test smoke and main database safeguards passed. The additive upgrade and protected seeder preserved 185 main demo rows and added 0 on rerun.
- Lesson: A transaction groups related database writes so they either all save or all roll back. Physical-table locks protect seats, while the date lock protects the restaurant's shared pacing limit. A successful availability search is provisional; the transaction checks it again before holding or booking.
- Next: P4 connects the browser screens and adds secure management links, modification, and cancellation cutoff enforcement.

## 2026-10-05 — Phase 2 database and repeatable seed

- Change: Added executable MySQL tables and foreign keys for room inventory, policy, staff, guests, reservations, holds, orders, history, and demo outbox. Imported the prototype's 25 tables and 36 menu items; a one-shot PHP seed supplies date-relative reservations. Staff profiles are inactive until secure login is implemented.
- Evidence: Final fresh isolated Compose startup seeded 179 reservations and a rerun added 0. The existing volume retained 185 sample rows; eight early demo bookings beyond pacing were cancelled with history retained, and the next rerun made 0 changes. The database verifier tested foreign keys, duplicate references, same-slot conflict, cancelled-slot reuse with history, joined members, pacing, and no live seed overlap. The PHP smoke check passed. The isolated rehearsal volume was removed; the main volume was retained.
- Lesson: MySQL init files run only when a data volume is new. An existing P1 volume needs the idempotent `bin/setup-db.sh` upgrade. The database unique index blocks identical live starts; interval overlap safety still needs P3's transaction and table locks.

## 2026-10-05 — Phase 1 checkpoint

- Change: Added the Docker Compose stack, PHP front controller and health endpoint, starter page, quickstart, and smoke script. P1 is complete.
- Evidence: Real PHP/MySQL/Adminer containers run and are reachable; fresh Ubuntu `docker compose ps` shows healthy PHP/MySQL, `/health` returns DB true, Adminer returns HTTP 200, and `bin/smoke.sh` passes. Compose config, PHP syntax, Bash syntax, and `git diff --check` passed.
- Remaining risk: The database has no P2 application schema or seed data yet; the starter page does not book tables.

## 2026-10-05

- Change: Locked Phase 0 booking rules in `PLAN.md`; reconciled hold, group membership, cancellation history, reference codes, room notice, and simulated notifications in the booking-engine and UX sketches.
- Evidence: Policy/schema assertions passed, 22 acceptance scenarios documented, `git diff --check` clean, PMM doctor passed.
- Remaining risk: MySQL DDL and concurrent booking behavior remain unexecuted until P2/P3; prototype remains in-memory only.

## 2026-10-07 — Confirmed permanent reservation deletion

- Request: Replace the visible Mark no-show action with Delete and a simple confirmation; retain Cancel.
- Change: Admin-only permanent reservation deletion is implemented and verified locally. Delete replaces the Mark no-show button, retains Cancel, and asks Keep reservation / Delete permanently without typed input. Deletion removes booking and status/change/private-link history, releases inventory and linked holds, preserves shared guest profiles and unrelated bookings, and refuses seated parties or any linked food order. Prior reservation audit snapshots are removed; one minimal actor/action/time/ID deletion log remains. Deleted no-shows no longer contribute to the guest no-show count. 405 isolated automated checks passed: 120 MySQL, 44 HTTP, and 241 browser checks; 54-file PHP lint, JavaScript syntax, isolated smoke, patch whitespace and PMM doctor passed. Desktop/mobile confirmation screenshots were inspected. Independent review found and resolved the no-show counter edge case, with no remaining important finding. The unchanged food-showcase suite initially timed out in its six-second image-loading wait; read-only diagnostics found all six local photos loaded with no failed requests, and its unchanged rerun passed all 20 checks. Existing local and hosted records were not deleted by this task; fixtures target only tablebook_p3_test. Hosted branch integration and Vercel deployment have not been performed.
- Lesson: Cancellation is a state change that preserves history; permanent deletion must remove linked records in one database transaction. A shared guest profile can remain while a deleted no-show’s contribution to its counter is reversed. Permission checks belong on the server as well as the button.
- Recovery: Rolling back code does not restore deleted records. Restoring an actual deletion requires a database backup; no application undo is claimed.
- Delivery: Local only; the separately owned hosted branch remains untouched.

## 2026-10-07 — Hosted permanent-deletion release

- Authorization: Marvin explicitly requested Vercel publication after reviewing the local feature.
- Delivery: Admin-only permanent reservation deletion is deployed as a READY [Singapore Vercel Preview](https://restaurant-reservation-system-8ii07jox6-marvmarv08.vercel.app) in Marvin’s verified workspace from source af1fce2. Delete replaces Mark no-show, retains Cancel, and opens Keep reservation / Delete permanently without typed input. Booking history and private access bindings are removed transactionally; linked inventory holds are released, shared guest profiles and unrelated bookings remain, and seated parties or bookings with food orders are refused. One minimal deletion audit remains; deleted no-shows no longer affect the guest counter. Integrated source passed 411 application checks (125 MySQL, 44 HTTP, 242 browser), plus 22 hosted configuration/session checks; PHP lint on 63 files, JavaScript syntax, isolated smoke, secret scanning and independent review passed. An initial guest-motion assertion raced the dialog close-focus event; its exact assertion now awaits focus restoration and the 31-check suite passed. Deployment metadata verified READY, Preview target, correct owner/project, source SHA and sin1 runtime. The Vercel deploy skill forbids fetching the deployed app URL, so no live UI or live deletion result is claimed. This task deleted no existing local/hosted booking; credentials and storage were retained. Preview APP_URL and ignored local URL point to the new Preview. Chef video, PC/phone gallery motion and prior performance improvements are retained.
- Deployment ID: dpl_3WwDTifj7AUuz4GXr8uNR6HDZSL1; source: af1fce24ebbe1f47b6b9301196421465348c189e. Previous chef-background Preview remains a rollback option; code rollback cannot restore records deleted later.
- Lesson: A native dialog can become hidden before its asynchronous close event finishes restoring focus. Tests must await the observable result and retain their exact correctness assertions. Publishing code and deleting a selected booking are separate actions.

## 2026-10-07 — Zero-counter deletion correction

- Found: Historical no-show bookings may have an already-zero unsigned guest counter. The original subtraction failed before MySQL could clamp the result; the new regression reproduced SQLSTATE 22003 (1690).
- Correction: Clamp the counter to at least one before subtracting. Zero stays zero, positive counters decrease once, and the shared guest profile remains. No schema or live-data change is needed.
- Fresh verification: 43 staff MySQL, 14 staff HTTP, and 10 staff browser checks passed; PHP lint passed on 63 files. Independent review found no remaining issue. The earlier integrated baseline passed 411 application and 22 hosted configuration/session checks. Corrected [Vercel Preview](https://restaurant-reservation-system-jrtseuge1-marvmarv08.vercel.app) is READY in Singapore; verified owner/project/source metadata. Deployment dpl_5ThkkmuAET9dkhvAXQ7n8sQzxetp from 0599da6b31cae389620a9730551e0b32ac5009c8. This supersedes the first deletion Preview. Preview APP_URL is updated; no live app fetch or live booking deletion was performed.
- Lesson: For unsigned database numbers, clamp before arithmetic; clamping a negative result happens too late. A regression test should include historical data that does not match current counter assumptions.

## 2026-10-08 — Continuous localhost food showcase

- Request: Remove Pause motion and keep the food photos and chef background moving. Work in the canonical Desktop restaurant-reservation-system folder; publication remains paused.
- Change: Removed the control and hover/focus/touch stops; mobile drift follows a manual swipe's new position. Device reduced-motion and hidden/offscreen/error fallbacks remain.
- Verification: New control-absence check failed against the old code, then 20 gallery and eight chef-video checks passed. PHP lint passed on 63 files, JavaScript syntax and patch whitespace passed, desktop/mobile screenshots inspected, and localhost smoke plus exact script/style hashes passed. Full-page load timeouts were separated from six-second action assertions with a 30-second navigation budget; a diagnostic load completed in about one second with no failed requests. No complete accessibility certification is claimed by automated scans.
- Delivery: Local web container rebuilt/restarted only; no main database reset, seeding, push or deployment.
- Lesson: Continuous visible motion and resource-saving offscreen pauses can coexist. Browser navigation waits for all initial assets, so its timeout is separate from verifying a specific UI behavior.

## 2026-10-08 — Source-grounded motion reference research

- Scope: Research restaurant-specific motion for the current local Lumina guest and staff flows. Compared ten reference candidates with 25 source entries, including first-party creators and official browser/design guidance.
- Evidence: Both Amici public creator previews sampled at six positions; Bracken desktop hero/menu visually inspected with submissions blocked. YouTube descriptions/chapter lists and Reddit discussions reviewed; TikTok direct access blocked, several live/video previews unavailable, all explicitly labeled. No new usability/performance result inferred from a showreel or creator claim.
- Recommendation: Keep continuous showcase motion and existing guest feedback; consider room-photo reveals plus true table-image crossfade first, then changed-record operational feedback if requested. No new effects or dependencies were implemented.
- Lesson: A creator showreel communicates visual direction but does not prove a live website's response speed or booking behavior. Separate what is visually inspected, what the creator describes, and what is a proposed adaptation.
- Delivery: Local research/11_motion_reference_research.md and roadmap/memory updates only; no records changed, GitHub push or Vercel deployment.

## 2026-10-08 — Local room reveals and table-picture crossfade

- Request: Implement the selected room-photo reveal and table-picture crossfade from the motion research, locally only.
- Change: One-time 220ms/6px photo-wrapper entrance leaves room buttons stable. Preview loading retains the old ready image/caption, then an aria-hidden decorative layer crossfades over the newly loaded image for 180ms. Revision/dialog checks and cancellation protect rapid switching, close/reopen, reduced motion and image failure.
- Verification: New reveal and previous-image-retention regressions failed before implementation. Final 11 focused, 31 guest-motion and 41 full showcase browser checks passed; syntax, whitespace, localhost smoke/exact source hashes and read-only desktop/mobile/missing-API checks passed. Screenshots inspected; independent review found no actionable issue. Tests await media-change events and natural fade cleanup rather than assuming fixed browser scheduling.
- Lesson: Crossfade means both pictures overlap briefly; a fade-in alone can still leave a blank loading gap. Keep the old picture until the new one is ready, and check that a late response still belongs to the current selection. Animate the photo wrapper so its button and hover behavior remain stable.
- Delivery: Canonical Desktop localhost app rebuilt/restarted only; no main database reset, seeding, push or deployment.

## 2026-10-08 — Keep only Close visible during table-preview scrolling

- Request: Marvin selected option 2: keep Close visible, while the room/table title scrolls normally.
- Change: Replaced the sticky heading with a separate upper-right Close toolbar and scrollable content body. Space is reserved for the button; pictures and controls are not covered. Reopening resets the content scroll and keeps the existing title focus, Escape and opener-focus return.
- Verification: The new title-scroll assertion failed against the original sticky header. Final six desktop/390/320px geometry and keyboard checks, 11 room-motion and 41 full showcase regressions passed. Syntax, whitespace, actual localhost smoke/source matching and read-only desktop/mobile screenshots passed.
- Lesson: Keep persistent controls outside the scrolling content instead of layering a sticky header over it. When moving the scroll area, update scroll-reset behavior and verify the real scroll container.
- Delivery: Local web container only; no main database reset, seeding, push or deployment.


## 2026-10-08 — Refresh guest assets after local changes

- Trigger: Marvin's screenshot still showed the old sticky table title after the Close toolbar update. Current localhost source files already contained the intended layout.
- Change: HomeController adds content-based versions to the shared guest/management scripts and styles. Changed contents produce a new URL; unchanged files keep their URL and normal cache reuse.
- Evidence: A real cached-browser revisit failed before implementation and passed afterward in the same browser context. Six Close/scroll and 11 room-motion checks passed, plus PHP/JavaScript syntax, main localhost smoke and exact served content matching for all 11 assets on home/manage.
- Delivery: Local web container refreshed only. Existing database records retained; no reset, seeding, GitHub push or Vercel deployment.
- Lesson: Fresh browser contexts do not test returning users' old cached assets. Version asset URLs and explicitly test a normal revisit with the old files cached.


## 2026-10-08 — All dates under reservation Status All

- Marvin approved All showing every booking date with search/pagination, specific statuses using Service date, full booking date/time rows and date-specific floor operations.
- Changed the protected dashboard list predicate only for All; daily statistics/floor and Waitlist remain selected-date views. Added list-scope copy, clarified the daily reservation count and versioned the staff script so returning browsers load current labels.
- The six-check multi-date regression failed before implementation (10 versus 30 records), then passed. Existing 14 staff HTTP and 10 staff browser checks, 64-file PHP lint, syntax, main smoke and exact running-source matching passed. Existing browser tests locate records by reference across pages and retain their original checks.
- Local web app refreshed only; no main database reset/seed or publication.
- Lesson: Once a history list spans dates, show the complete date and test navigation/search rather than assuming a newly created record is on the first page.


## 2026-10-08 — Remove automatic demo bookings only

- Marvin narrowed his testing-record deletion request to automatically seeded bookings, explicitly preserving manually created bookings. Scope was corrected before committed deletion.
- Identified 178 automatic records by reservation seed_key beginning demo-, rather than the web source shared by manual bookings. Removed their related history, inventory bindings, management access, requests/notifications and matching reservation audit snapshots in one transaction. Guest profiles and unrelated records were retained; one aggregate maintenance audit records the cleanup.
- Saved a private recovery backup outside the source repository, then rehearsed deletion in a rolled-back transaction. Before committing, full hashes confirmed manual bookings/dependencies and staff/catalog/configuration/guests/holds/food records were unchanged. Post-commit localhost smoke passed: zero demo bookings, one manual booking, one active staff and 36 menu items.
- Local database only; no volume reset, seed, push or deployment. Re-running canonical-main reservation seeding would recreate demo bookings and now requires Marvin's request.
- Lesson: Use explicit demo markers to distinguish generated examples from manually created records. Back up the exact deletion scope and verify preserved records before committing.


## 2026-10-08 — Twelve-hour VIP and Group booking notice

- Marvin requested research into existing reservation systems, then explicitly selected 12 hours for both VIP and Long/Group Tables. Ten primary-source pages were reviewed; existing systems support configurable cutoffs and venue preparation policies vary. Twelve hours is a selected project policy, not an industry-wide optimal value. Full comparison: research/12_booking_notice_research.md.
- Updated fresh reference defaults, added a repeatable upgrade of previous 48/24 defaults that preserves other custom values, applied only the two localhost room notice fields, and made guest search guidance read the catalog. Common/Terrace keep the global 60 minutes; capacities, approval, opening times, cancellation and booking windows remain intact.
- Exact 12-hour regression failed before the update, then passed for VIP, individual Group and joined Group. All 41 booking, 11 HTTP, four default/upgrade and 41 showcase checks passed. 65-file PHP lint, syntax, main smoke, exact running source and actual read-only desktop/mobile previews passed. V4/G1 were available for eight guests tomorrow at 19:00 in the verified local state.
- Private recovery backup preceded the guarded local transaction; full protected-row hashes confirmed reservations, staff, guests, holds, menu, rooms and other settings were unchanged. Zero bookings remain. No main seed/reset, hosted write, push or deployment.
- Lesson: Minimum booking notice is a service-preparation policy. Cancellation deadlines and advance release windows answer different questions. Validate exact boundaries with the server clock and display the current database rule.

## 2026-10-08 — Full booking-hero video research

- Marvin clarified that motion should cover the complete screenshot background behind both heading and booking form. Compared eleven candidate source pages and four actual clips across six decoded timestamps each; recommended gusat silviu's Pexels 31631562 for warm evening dining ambience.
- Read-only in-memory previews at 1440/390px confirmed advancing playback, repeat and no horizontal overflow; credited images were inspected and saved. Raw first/last framing differs, so seamless-loop export remains pending; phone framing needs refinement.
- Evidence: Corrected byte-range serving before trusting temporal samples; all 24 decoded media times matched requested positions within 0.06 seconds. License and primary browser/performance guidance reviewed. No application implementation, booking submission, database change, push or deployment.
- Lesson: A repeated video is not automatically a seamless loop. Evaluate its beginning/end and actual mobile crop behind the form, not just the stock thumbnail.
- Report and source attribution: research/13_hero_background_video_research.md.

## 2026-10-08 — Local full-hero video delivered

- Marvin approved the warm evening restaurant footage for the entire screenshot background and reiterated that it should match the application. Preserved the existing dark/gold theme, gradient and booking card; adjusted phone framing and credited the actual video creator.
- Encoded silent 11.2-second 1280×720/25fps H.264 with a 0.8-second loop crossfade; video 727,492 bytes and matching poster 81,894 bytes. Asset manifest retains creator/source/license/processing/checksums.
- Visible playback remains continuous during form use; offscreen/hidden/reduced-motion states stop decoding. Poster survives no JS, absent observer, autoplay refusal and media failure; hidden management hero never downloads video.
- Verification: Focused check failed before implementation; 12 hero + eight chef + 20 gallery + 41 showcase checks passed (81). Syntax, PHP lint, build/smoke, actual desktop/phone views and exact served asset hashes passed. Independent review found no actionable issue. The main app alone was refreshed; no main fixture/seed/reset, account change or publication.
- Lesson: Review the compressed footage inside the real layout, including the loop blend and phone crop. A silent video and matching poster provide atmosphere while preserving immediate access to booking.

## 2026-10-08 — Concept floor arrangement and preview locations

- Marvin requested a fitting floor preview and specific table positions, then confirmed concept layout for the Lumina demo. Shared frontend geometry arranges all 25 existing tables consistently in guest/staff views; G3 is now inside Long Room. Room identities, capacities and server booking rules are preserved without database changes.
- Added entrance/aisle/access guides, text location and a gold-highlighted room mini map to every table preview. On phones, the map scrolls within a labelled container; the fieldset minimum-width override prevents page overflow.
- Geometry check reproduced old G3 overflow. Six focused checks and 94 related checks passed (100 total); actual main read-only views/source matching, cache-versioned scripts/styles, syntax/build/smoke passed. Independent review found tiny Terrace labels; a 5.4px reproduction was corrected and rechecked. No remaining review issue.
- Main app-only refresh, no seed/reset, booking/configuration data change, GitHub push or Vercel deployment. Concept positions and actual screenshots are recorded in research/07_table_showcase_research.md.
- Lesson: Keep illustrative drawing coordinates separate from reservation identity. A shared layout keeps guest/staff maps consistent; a contained viewport preserves readable phone labels without making the whole page wider.

## 2026-10-08 — Verified GitHub session publication

- Marvin explicitly requested a push of completed session work and an updated PLAN receipt afterward. Verified active GitHub account/repository ownership, author identity and remote state; main had 27 already-verified unpushed commits and no remote-only changes.
- Committed session changes as 93a161a: motion/Close/cache refinements, all-date staff list, 12-hour VIP/Group source rules, licensed full-hero video and shared concept table positions, with research and tests.
- Integrated isolated suites reported 470 PASS checks, plus the ordinary-revisit cache regression; PHP lint on 65 files, JS syntax and main smoke passed. Independent review and staged/history credential scans were clean.
- git push origin main succeeded; git ls-remote matched source SHA 93a161a9d43f11be1d80ec0abfbf9de4cd4e868d. PLAN and memory now record the verified receipt in a documentation follow-up.
- GitHub reported the linked Vercel deployment completed successfully for 93a161a; live UI and hosted rules were not revalidated. Local data, private settings and backups remain excluded. No hosted database migration or direct Vercel deployment. Future pushes still require a new request.
- Lesson: A GitHub push transfers committed project files. Database records/configuration remain separate; verify the remote commit rather than assuming a successful local commit is published.

## 2026-10-28 — Controlled local introduction motion

- Delivered the approved existing-image zoom with stationary reading/action targets, brief decorative feedback, once-only story reveals and an accessible remembered Pause/Resume control. Reduced motion, hidden tabs/offscreen sections and failure fallbacks are handled without new video/dependencies.
- Observed the initial failing control test; final 20 motion and 27 existing journey checks passed. Desktop/phone review, three-width accessibility, explicit phone non-overlap, PHP111 lint, JS syntax, preview smoke and preserved image/routing/database fingerprints passed. Independent review has no remaining important defect. No publication or database change.
- Lesson: Decorative movement needs independent user control and a static starting experience. Animate the background while keeping reading and click targets stable; test actual movement and pause behavior rather than checking only CSS names.

## 2026-10-28 — Accessible local menu image enlargement

- Menu and signature-dish photographs open a responsive dark/gold viewer with uncropped imagery, dish title, illustrative-photo note and visible Close. Escape/backdrop dismissal, keyboard containment, focus restoration and image failure handling are verified. Existing allowlisted assets are reused; no ordering/database/publication behavior changed.
- Nine focused browser checks and 17 existing menu regressions passed; desktop/phone visuals, three-width modal accessibility, syntax, whitespace and smoke passed. Corrected stale legacy Sweet/Bar labels in the menu verifier to use real current categories.
- Lesson: A clickable image needs a named keyboard control and a predictable way back. Showing the full photograph with contain preserves its composition; enlargement cannot add detail missing from the original file.

## 2026-10-30 — Static intro and hero cleanup

- Removed the screenshot-selected Pause/Resume button and bottom hero image-credit caption, together with the background zoom and obsolete ambient-motion state. Kept the restaurant image, navigation, brief arrow feedback and story reveals. Asset source details remain in project files.
- Five focused static-intro checks, JS syntax, whitespace and preview smoke passed. No database writes, push or deployment.
- Lesson: Very subtle decorative motion can appear absent. When the user prefers a static image, remove both the animation and its now-unnecessary control rather than leaving a misleading button.

## 2026-10-30 — Controlled garden ambience

- Marvin approved moving warm garden lights and soft entrance glow over the static photo. Added lightweight decorative layers and compact accessible Pause/Resume control, respecting reduced motion, offscreen/hidden states, storage failure and image/no-JavaScript fallback. No zoom, new footage, database command or publication.
- Observed the initial missing-effect failure. Final 11 garden-effect, five static-image and 27 intro journey checks passed; syntax, whitespace, preview smoke, three-width accessibility and desktop/phone visual inspection passed. Corrected a verifier race by waiting for the browser's media-preference change event; CSS also hides effects/controls immediately in reduced-motion mode.
- Lesson: Separate decorative animation from the original photograph. This allows independent user control without moving reading targets, and avoids downloading a video for effects that CSS can provide.

## 2026-10-30 — Photo-led About and visual History

- Delivered Marvin's delegated design update: arched dining/food composition with brand seal, plus exterior concept panel and two-part history timeline. Kept supplied company paragraphs, dark/gold palette, action links and existing garden ambience. Reused local credited images; expandable notes clarify illustration/provenance without implying a real venue or archival2021 photograph.
-10 focused story checks,27 existing intro journey and11 garden checks passed; five-width accessibility/non-overlap, desktop/tablet/phone visuals, failed-image reflow, PHP lint, JS syntax, whitespace and preview smoke passed. Fixed tablet caption overlap and narrow-screen intrinsic grid overflow. Initial accessibility harness setup was corrected to use an explicit browser context.
- Lesson: Visual hierarchy comes from composition, spacing and relevant imagery. Overlapping cards need explicit text-clearance checks; grid columns should be allowed to shrink even when an image fails and its alternative text becomes visible.

## 2026-10-30 — Cohesive single-image About visual

- Replaced the stock interior/bread collage with the existing garden-estate concept matching the homepage. Removed floating badge, food card, decorative outline and obsolete collage styles; retained a small caption below the image and updated displayed-image provenance.
-10 updated story and27 existing intro checks passed. Five-width accessibility/reflow, decoded image, absent floating elements, caption placement and image-failure checks passed, along with PHP lint, test syntax, whitespace and preview smoke. Desktop/phone screenshots inspected. No data changes or publication.
- Lesson: Matching color alone does not make imagery cohesive. Architecture, lighting and restaurant character should agree across sections; one relevant image can communicate more clearly than several unrelated decorative layers.

## 2026-10-30 — Matching garden-estate interior concept

- Generated an original interior using the exterior as architectural/style reference, and replaced only the About image. Retained the clean frame, supplied text, hero, history and garden effects. Added optimized desktop/phone WebPs, original PNG and full prompt/reference provenance.
- Observed the failing exterior-versus-interior assertion; final10 story checks passed, with five-width accessibility/reflow, desktop/phone visuals, served-image hash/MIME verification, template/test syntax, whitespace and preview smoke. No database command, dependency or publication.
- Lesson: A reference image can guide material, architecture and light consistency across different views. Save its role and generation prompt, and deliver appropriately sized images rather than the original PNG to visitors.

## 2026-10-30 — Private UI release preparation and repository identity

- Marvin authorized publishing all completed local work and explicitly restored the repository name from SeatFlow to restaurant-reservation-system. Renamed the same private repository, updated the canonical origin and preserved the remote README-only commit through fast-forward integration.
- All100 affected guest checks, PHP111 lint,55 JS parse checks, both local smoke checks and unchanged main/preview table fingerprints passed. Independent review found no issue. Dry deployment package excludes private inputs and includes the new optimized visuals. Source publication/deployment completion is recorded separately after verification.
- Lesson: A repository rename preserves its history/identity, but local remotes and documentation should still match. Website files, database records and access protection are separate release concerns.

## 2026-10-30 — Verified private GitHub/Vercel UI release

- Published application source3c01d69 to main in the restored private restaurant-reservation-system repository. Retained the remote README-only commit and repository ID; no force push.
- Vercel Ready Preview dpl_Cy3UDNzgwfvhPHoWSU6SnzSDoWPJ matches that source and existing project/team/container/Preview/sin1. Existing Bella Vista alias maps to it; GitHub PRIVATE and Vercel Authentication for all deployments remain verified.
-100 guest checks, PHP111 lint,55 JS parse checks, five hosted configuration guards, both local smoke checks,220 exact-image hashes/private exclusions, disposable image smoke and unchanged main/preview fingerprints passed. Independent review clean. Existing hosted data/TLS/session configuration reused without migrations or imports. Hosted URL not fetched; full staff/write suites not rerun. Receipt: docs/verification/ui-private-release-2026-10-30.md.

## 2026-10-30 — Reservation scroll workload reduction

- Reproduced decorative-media/entrance work and repeated navigation writes during scrolling. Added a shared passive viewport-scroll signal: pause decorative motion, retain the hero frame, skip/cancel entrances and resume permitted media after160ms idle. Navigation writes only on section changes; horizontal gallery scrolling stays independent.
- Observed failing pause and entrance assertions, then92 relevant browser checks passed on the final fix. Independent review passed; exact-image221 hashes/private exclusions, smoke, syntax and unchanged local database fingerprints passed. Headless frame timing varies; no universal FPS claim. Private publication explicitly authorized and recorded separately after readiness verification.
- Lesson: Attractive animation competes with scrolling for rendering time. Schedule decorative work around user interaction and measure actual work removed; a small browser benchmark does not guarantee smoothness on every device.
