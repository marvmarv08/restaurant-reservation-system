# Current State

Purpose: Read this and AGENTS.md first to resume Marvin's Bella Vista project. PLAN.md is the roadmap authority; task-history.md retains completed task receipts.

## Public access restored — 2026-11-07

Marvin explicitly requested public GitHub and Vercel access. GitHub metadata confirms `marvmarv08/restaurant-reservation-system` is PUBLIC. Vercel project `prj_Lulyel25nldfU6vSTel2Gt01RGf2` in Marvin's verified workspace has `ssoProtection=null`, `passwordProtection=null` and `trustedIps=null`. The existing alias https://bella-vista-dining-marvmarv08.vercel.app still maps to Ready deployment `dpl_6ikTjKCiKRyuVvCUeJbi94AyjnF3`; no rebuild or alias change was needed. The earlier private-release entries are historical.

Before publication, checked 1,609 tracked history objects for sensitive filenames and scanned 862 text blobs for credential signatures and four known private local values; no matches were found. This is a bounded scan, not a guarantee that every possible secret pattern is detectable. Staff authentication, deployed application source, existing database records and private environment configuration are preserved. Verification used provider metadata; no live booking/staff acceptance or hosted HTTP check is claimed. B7 proposal, B8 acceptance and deferred worker hosting remain pending.

## Application release checkpoint — 2026-10-31

Release delivered. Application source `8de51e96a029d44e57a1ce3e0dba6cdcb39223c2` is pushed to private GitHub main and deployed as Ready protected Vercel Preview `dpl_6ikTjKCiKRyuVvCUeJbi94AyjnF3`. The existing alias https://bella-vista-dining-marvmarv08.vercel.app points to https://restaurant-reservation-system-n33genf4c-marvmarv08.vercel.app. Verified at2026-10-31T05:24:19.365188+00:00: exact source/project/workspace, Container/sin1, alias mapping and Vercel Authentication for all deployments. GitHub remains PRIVATE. A documentation-only receipt commit follows the application-source commit; no second app deployment is needed for that receipt.

## Working project and access

- Canonical project: Windows Desktop restaurant-reservation-system, reachable through /home/morkmork26/marvin/restaurant-reservation-system. Use AGENTS.md for the exact Desktop path and account rules.
- Branch main; GitHub repository marvmarv08/restaurant-reservation-system is PUBLIC as of 2026-11-07. GitHub identity must be marvmarv08 before writes.
- Vercel uses Marvin's dedicated profile /home/morkmork26/marvin/.vercel-cli, existing project prj_Lulyel25nldfU6vSTel2Gt01RGf2 in verified marvmarv08 Hobby workspace. Vercel Authentication, password protection and trusted-IP protection are disabled as of 2026-11-07 at Marvin's request. Keep account credentials private.
- Public app alias: https://bella-vista-dining-marvmarv08.vercel.app. Public access is explicitly authorized as of 2026-11-07; application staff sign-in remains required.
- Local latest preview: http://localhost:18080. Local8080 is the older built application. Keep both existing Docker volumes and ignored configuration intact.

## Completed UI behavior

- About: ten restaurant concepts in a five-card fan; front click next, exposed side cards select, ten compact dots in one horizontal row, keyboard navigation and screen-reader status. Active/next dots join into a pill; the last dot joins the previous one. No visible arrow buttons, numeric counter or helper hint. All ten photos remain reachable.
- Garden effect continues while visible; Pause button removed. Reduced-motion, hidden/offscreen and image-failure guards remain. Do not restore pause-on-scroll behavior.
- Rooms: Standard/Family/VIP cards fill the desktop row, center the tablet remainder and stack on phones. Photos show distinct small-table, family long-table and private VIP room overviews; Dining concept overlays removed. Booking capacities/inventory are unchanged.
- New transparent gold BV arch/sprig/plate monogram and matching favicon are used across six guest/staff/service/cashier/report templates. Brand name stays actual readable text. Earlier SVG/banner remain historical artwork; proposal banner still uses the earlier emblem.
- Generated originals, full prompts and provenance are retained in research21–24 and asset credit manifests; only optimized media is deployed.

## Verification and delivery boundaries

Fresh release checks:118 targeted checks (20 fan,10 story,11 garden,5 static,27 intro,8 continuous-scroll,28 header,9 category-layout viewport checks);111 PHP files and58 JS files parse;238 exact image source/asset hashes match; disposable exact-image and both local HTTP smoke pass. Vercel dry upload detects Container and excludes private configuration, research originals and test suites. Independent focused review found no substantive blocker.

Header checks use actual public/login pages and script-disabled protected-header template previews. Full authenticated staff/write suites and physical-device performance are not newly verified. Do not claim a successful build proves live guest/staff booking acceptance. Hosted site fetch is outside this deployment workflow; use Ready/source/project/alias/privacy metadata for the release receipt.

The release changes UI/assets/docs only. Existing hosted Bella Vista database tablebook_bella_vista, old defaultdb, hosted TLS settings and database sessions must remain intact. Never initialize/import/reset them for a UI deployment. Fresh main/preview all-table fingerprints match before/after this release. That baseline is separate from the older photo-task baseline that already recorded automatic no-show changes.

## Remaining work and next session

1. This release is complete. Check active-task.md and the delivery receipt; do not repeat completed image generation, commits or deployment just to resume.
2. After delivery, review the public app on Marvin's presentation laptop and report any visual refinements. No new feature is automatically authorized by a resume.
3. Assignment work: B7 proposal/defense package remains pending (team profile, implementation-based DFD, timeline and itemized estimated costs). Unknown team roles, contacts, dates and commercial assumptions need real inputs.
4. B8 full assignment acceptance and separate local-main activation remain pending. Always-running worker hosting is deferred; request-driven no-show reconciliation and server seating deadlines already exist. No real online payment processing is delivered.

## Resume reading order

AGENTS.md → this file → PLAN.md Current checkpoint/Next concrete action → docs/verification/private-ui-release-2026-10-31.md → active-task.md. Historical detailed local notes are preserved in archive/current-state-before-20261031-release.md and research21–24. Do not rerun completed generations, seed/reset databases, or republish just to resume.
