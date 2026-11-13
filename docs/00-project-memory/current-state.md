# Current State

Purpose: Read this and AGENTS.md first to resume Marvin's Bella Vista project. PLAN.md is the roadmap authority; task-history.md retains completed task receipts.

## Staff account requests — local delivery, 2026-11-11

Marvin explicitly resumed this feature after canceling it earlier the same day. The staff login page now accepts full-name/Gmail requests; pending requests create no account, password or role. A local Docker operator lists pending requests and approves the exact email plus role; the existing hashed one-use 24-hour activation link sets the password. Existing accounts/invitations cannot be overwritten, public retries cannot change names, and late approval failures roll back all related records. No Gmail verification/email delivery is claimed. CLI setup is explicit and additive; hosted/unspecified environments are refused.

Verification on disposable containers only: 29 PHP/MySQL scenarios, 14 HTTP checks and 14 Chrome/browser checks pass; includes denied pending login, strict public fields/CSRF, generic responses, stored token hashes, competing approvals, late-failure rollback, request limits and >100 pending-list visibility. Browser flow reaches the dashboard and reuses existing sign-in; desktop and320px screenshots were inspected. Independent focused security review has no remaining critical/important findings. The competing-approval test starts two processes without a synchronized contention barrier; the global-cap test seeds its counter before testing rejection/reset.

Regression results: staff43/43, management14/14, orders28/28 and booking40/41. The failing booking case is `Manual demo seed respects engine-held inventory and pacing: Need a deterministic seed candidate`; untouched original HEAD reproduces the same40/41 result on the same disposable DB/date. No claim that the full suite is green. PHP118 files parse; changed JS and whitespace checks pass.

Deliverable: `C:\Users\burgo\OneDrive\Desktop\Bella-Vista-Account-Activation-Update.zip`, with a private setup/approval guide. See docs/staff-account-requests.md for exact teammate commands. Copy the patch into the existing project, run Compose and the explicit request-storage setup. Original databases/accounts, earlier menu work and deployed GitHub/Vercel versions were not changed by feature verification. Recipient installation is still required; no push/deployment was requested. No new staff account was created in original or teammate data by this task.

Next action: teammate installs the patch and runs setup, then requests/approves an unused Gmail and chooses a password through the private link. Existing active Gmail accounts must use their current password; do not deactivate the only working admin to re-invite it.


## New-menu order lifecycle verification — 2026-11-07

Verified43 real-service/MySQL checks plus14 authenticated browser/API checks against a separate disposable copy of the current local preview. Tested all24 actual menu prices through accepted booking/preorder, fresh-connection retrieval, seating, table-linked order/ticket creation, kitchen prepare/ready/serve, order closure, demo receipt records and final bill. Confirmation, kitchen and receipt retries do not duplicate records. A PHP580 Standard cart is refused at seating with no partial order; PHP1160 meets the minimum. Role denials and daily finalized-food reconciliation pass.

Full evidence, scenario amounts, disposable-copy guards and coverage limits: research/25_menu_reference_refresh.md. The real local preview and its full SQL snapshot are unchanged; temporary test resources are removed. Hosted testing and full B8 acceptance remain pending.

## Local menu refresh — 2026-11-07

Marvin's supplied food references now drive a 24-item local Bella Vista menu: eight mains, five appetizers/soups and eleven desserts/drinks. Original academic-demo PHP prices, descriptions and fitting food names are stored in database/catalogs/bella-vista-menu-20261107.json. Sharp, matching local photos and visible per-dish credits replace the previous mismatched offerings. Review at http://localhost:18080/reserve#menu; click a photo to enlarge it and open Menu photo credits below the list.

Verified 35 browser checks (18 menu, nine image viewer, eight real cart/server-quote), four widths including320px, accessibility scans, all24 image hashes/unique contents/resolutions, guarded target refusal, actual update/idempotent replay and two real live-dependency refusal probes. Original menu identities and44 unrelated-table fingerprints matched immediately after application; the later cart verifier intentionally created/released its own temporary hold without confirming any reservation/payment. Focused independent review found no remaining blocker. Local smoke and syntax checks pass.

The 36 prior active dishes are archived, not deleted. Updater defaults to dry-run, targets only tablebook_p3_test and requires the ignored pre-change catalog snapshot; it refuses retirement while live old-menu preorders or active food reviews remain. Main/hosted data and original assets are preserved. Twenty photos use Ang Sarap's noncommercial/no-derivatives license, retained unchanged and uncropped; commercial reuse needs separate permission or replacement assets. Research/selection/credits/recovery: research/25_menu_reference_refresh.md.

This refresh is local only. The hosted Aiven database is powered off after its trial/credit issue, as confirmed in Marvin's screenshot; public Vercel booking is not currently healthy. Local Docker preview works. The temporary public tunnel remains paused in task-queue.md. B7 proposal and B8 full acceptance remain pending.

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

## Private teammate handoff — 2026-11-11

Created Desktop `Bella-Vista-Teammate-Handoff-2026-11-11.zip` (13,453,245 bytes), with 438 hash-verified files, latest local source/assets, dedicated local Compose setup, new local credentials and a byte-identical 46-table SQL snapshot dated 2026-11-07 14:29:49. START-HERE.md explains setup, staff activation and private sharing. Git/provider profiles, original private configuration and unrelated backups are excluded; original database passwords are absent. ZIP CRC, file hashes, YAML and SQL structure/completion checks pass. Docker is unavailable: this is not a fresh November11 export and restore/startup are unverified. Recipient must check health/menu/staff after Docker setup. Existing databases and hosted releases are unchanged.

## Staff activation feature canceled — 2026-11-11

Marvin explicitly canceled the requested account-request/console-approval feature before delivery. Reverted only its five previously clean tracked application files and moved its six new feature/test files into a private canceled-work archive. Existing menu/project changes and original database records were preserved. No feature commit, push, deployment or teammate update ZIP was delivered. Do not resume this feature without a new request. Marvin explicitly reauthorized including this feature in the November 13 source publication; see the later publication entry. All mutating verification was on disposable test containers, which are stopped separately.

## Teammate source and starter database publication — 2026-11-13

Marvin requested publishing all pending source, explicitly including the previously canceled staff account-request feature, so teammates can download the project. The package adds `compose.teammate.yaml`, `docs/teammate-setup.md` and `database/share/bella-vista-starter.sql`: 47 tables with only reviewed venue/menu configuration retained from the November 7 preview. Existing accounts/password hashes, guests, reservations, private links, sessions, financial records and audit history are excluded; private `.env` files remain ignored and unchanged. Teammates create their own local configuration and first admin through the existing invitation CLI. The dedicated Compose project uses separate local storage and does not run the historical reservation seed.

Verification covers PHP 8.3 parser and JavaScript syntax, SQL table/data allowlist, all 24 menu entries/photos, Compose YAML/healthcheck quoting, private-file/known-secret/credential-signature scanning and whitespace. PHP parser checks do not execute the application. Docker Desktop's Linux engine is unavailable, so fresh SQL import, startup and browser acceptance remain unverified. This is source/database setup delivery, not hosted database recovery, main activation or a new Vercel deployment.
