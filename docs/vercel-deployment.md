# Full-system Vercel deployment

## Latest private UI update — 2026-10-31

The completed photo-fan, category-card/overview and generated-logo refinements are published from application source `8de51e96a029d44e57a1ce3e0dba6cdcb39223c2` to Ready protected Preview `dpl_6ikTjKCiKRyuVvCUeJbi94AyjnF3`: https://restaurant-reservation-system-n33genf4c-marvmarv08.vercel.app. Existing alias https://bella-vista-dining-marvmarv08.vercel.app maps to it. GitHub is PRIVATE and Vercel Authentication remains deploymentType=all. Verified owner/project, exact source, Container framework and sin1; current/legacy databases, TLS configuration and database sessions are preserved. No live-site HTTP check is claimed. Full receipt and next-session handoff: [private UI release](verification/private-ui-release-2026-10-31.md) and [current state](00-project-memory/current-state.md).

Use pinned `npx --yes vercel@65.9.0` with the existing dedicated profile, explicit project ID/workspace and Preview environment for repeat releases. Keep the runtime overrides in the established command below. The CLI target=null/productionUrl=null means Preview; verify Ready metadata before moving the existing alias. Never infer authentication is disabled from an anonymous login screen. No hosted worker or database/main activation is added by this UI release. Earlier release entries below are historical.

This deployment keeps the existing PHP application, booking rules and staff workspaces. Vercel runs the PHP/Apache container; a separate online MySQL service stores reservations, orders and sessions. A session is the server record that remembers the browser after sign-in. Keeping it in MySQL lets another container recognize the same browser after a restart.

## Current access — private (2026-10-27)

Marvin requested temporarily private access after the Bella Vista release. Verified GitHub repository `marvmarv08/restaurant-reservation-system` is PRIVATE. Vercel project `restaurant-reservation-system` now has Vercel Authentication with `deploymentType=all`, covering the Bella Vista alias, immutable deployment URLs and old previews. Only authorized Vercel accounts can access them. Retain these settings until Marvin explicitly requests public access again; prior public-release authorization does not authorize reopening access. Existing deployments, databases and app credentials are retained. Earlier public-release entries below are historical evidence.

## Continuous-motion refinement — 2026-10-30

Published application sourcebb646751dfc3f01f1e5875355e9bede42879c985 to private GitHub main and Ready protected Preview dpl_HRNaQdqT57q7qk3RkhQRWTEPT1Qe (https://restaurant-reservation-system-ozut078q3-marvmarv08.vercel.app). Existing Bella Vista alias independently maps to it; exact SHA/project/owner/container/Preview/sin1 and deploymentType=all verified. No database initializer/reset/import or privacy change. Hosted URL not fetched under deployment skill; physical-device performance is not guaranteed by these tests.

Marvin rejected viewport-triggered pause behavior and requested uninterrupted visible hero/chef/gallery/entrance effects. Removed the shared scroll timer/subscriptions while retaining navigation caching and normal hidden/offscreen/reduced-motion/failure guards.92 checks passed (8 updated continuity plus84 existing media/intro/menu); independent review clean. PHP111 lint,56 JS parse,220 exact-image hashes/private exclusions, disposable image smoke and record fingerprints passed.237-file upload excludes the obsolete script and private inputs. Earlier pause-based release entries below are historical and superseded.

## Scrolling performance follow-up — 2026-10-30

The verified fix is now pushed as application source24a2d87690a7b56ea49c44ef21485100d131d9f3 and deployed as Ready protected Preview dpl_CwsVvNhrjhzxvuM5DN22NTridZPR (https://restaurant-reservation-system-4m1yi5td7-marvmarv08.vercel.app). The existing https://bella-vista-dining-marvmarv08.vercel.app alias independently maps to this deployment. Metadata verifies exact SHA, existing project/owner, Preview, container framework and sin1. GitHub stays private and Vercel Authentication stays deploymentType=all; hosted database/runtime/TLS settings are retained. The hosted URL was not fetched under the deployment skill, so live device smoothness remains Marvin's acceptance check.

Viewport scrolling now temporarily suspends decorative video/gallery/entry motion, retains the hero frame and resumes permitted media after160ms idle. Navigation avoids repeated unchanged aria-current writes.92 focused browser checks, PHP111 lint,57 public/test JS parse checks,221 exact-image hashes/private exclusions, local smoke and unchanged main/preview fingerprints passed; independent review found no defect. Frame timing samples vary and do not guarantee device FPS. No database initializer/import/reset or hosting/privacy change. Evidence: `research/20_reservation_scroll_performance.md`.

## Private UI release delivered — 2026-10-30

All completed unpublished local introduction/menu work is committed and pushed to private `marvmarv08/restaurant-reservation-system`, application source `3c01d69f7070defdcd77c259806f9fbc4d11fa55`. Marvin explicitly restored the repository name from SeatFlow; the same repository ID/history was preserved, its README-only remote commit integrated, and the local origin/title restored. The canonical working branch is now main.

The existing Bella Vista alias https://bella-vista-dining-marvmarv08.vercel.app now maps to Ready Preview `dpl_Cy3UDNzgwfvhPHoWSU6SnzSDoWPJ`, immutable URL https://restaurant-reservation-system-1andksd2f-marvmarv08.vercel.app. Metadata verifies source SHA, Marvin's existing project/workspace, container framework, Preview environment and sin1. GitHub stays PRIVATE and Vercel Authentication stays deploymentType=all. Existing hosted tablebook_bella_vista schema, APP_URL/runtime overrides and inherited TLS credentials are reused; no database initialization/import/reset was run. Old deployments/schemas remain; worker hosting remains pending.

Release verification passed100 affected guest browser checks, PHP111 lint,55 JS parse checks, five hosted DB-configuration guards, both local smoke checks,220 exact packaged source/asset hashes, private-image exclusions and disposable exact-image smoke. Main/preview all-table fingerprints match the fresh release baseline. Independent read-only review found no defect. The237-file Vercel dry manifest includes new optimized assets and excludes private inputs, research originals and tests. Full staff/write suites were not rerun for UI-only changes. The hosted URL was not fetched under the deployment skill; Ready/alias metadata and exact-image local behavior are verified, not live browser acceptance. Detailed receipt: `docs/verification/ui-private-release-2026-10-30.md`.


## Bella Vista website release — 2026-10-27

Marvin selected the latest Bella Vista source from the isolated preview for GitHub and Vercel, a separate online database, and a website-first release with always-running worker hosting deferred. GitHub source commit `21f85e2` is published and the [Bella Vista website](https://bella-vista-dining-marvmarv08.vercel.app) is deployed as a Ready Singapore Vercel Preview. Immutable deployment: [https://restaurant-reservation-system-c0pwqm0r5-marvmarv08.vercel.app](https://restaurant-reservation-system-c0pwqm0r5-marvmarv08.vercel.app); ID `dpl_3Vz4Ue97D6a6TBdv6pKJgGAc8zgE`. Metadata verified the correct project/workspace, source SHA, Preview target, `sin1` container, public alias and disabled Vercel Authentication/password protection. The deployed website URL was not fetched; the exact release image was tested locally against its new hosted TLS database, so a live browser acceptance claim is not made.

The new `tablebook_bella_vista` schema is on the existing hosted MySQL service. It contains nine active reservable units, 36 available assigned-menu items and B2–B6 feature profiles. Initialization imported reference/catalog SQL and explicitly prepared the existing Bella Vista schema/catalog/billing/preorder/policy/operations services; it did not call the reservation seed or import isolated fixtures. The existing active online staff account was retained within the same service so its online sign-in can be reused. Local password recovery is separate.

The old `defaultdb` database and the previous deployment stay intact. The pre-release audit found 171 historical/current reservation rows, including 72 pending/confirmed records, and no live holds or open orders. Conversion in place would be refused. Protected legacy staff, guest, booking, food, settings and catalog content fingerprints matched after separate initialization. Private SQL backups are outside Git; the new schema was actually restored into a separate local recovery schema and all 47 table counts/content hashes matched.

The release uses runtime overrides for `DB_DATABASE=tablebook_bella_vista` and its exact public `APP_URL`, leaving earlier deployments' configuration intact. Git-triggered deployment is disabled in `vercel.json`: this repository is Git-linked, but an automatic build would inherit the legacy project environment instead of the explicitly selected Bella Vista database. Publish through the verified manual Preview command until a dedicated automatic deployment environment is configured. Preserve TLS verification and database-backed sessions. Never copy the laptop `.env`, fixture accounts, test payments or recovery links to GitHub/Vercel. The assigned public Preview alias is [https://bella-vista-dining-marvmarv08.vercel.app](https://bella-vista-dining-marvmarv08.vercel.app). Existing online staff credentials remain separate from laptop credentials. Git publication does not trigger a deployment: use the explicit manual command below, consistent with [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

**Verified release evidence:** 237 MySQL scenarios, one disabled-preorder regression, 44 HTTP checks and 218 browser checks passed across legacy booking/staff/kitchen and Bella Vista inventory/billing/preorders/policies/operations/branding/seating. The operations browser rehearsal used a service-hours timestamp only for isolated test connections, restoring the original setting afterward; laptop-main/hosted clocks were unchanged. PHP lint passed on 110 files, all 14 public JavaScript files parsed, 18 fee and six terms checks passed, five hosted database configuration checks passed, and nine seating assets matched their provenance. The exact final image matched 211 packaged source/asset hashes and passed local HTTP smoke against the new hosted TLS database. Both review findings were fixed with observed failing/passing regressions: disabled optional-table access and versioned arrival-policy wording. Vercel reports container framework and excludes private configuration, backups, test fixtures and research from the 228-file deployment package. Full live post-deployment acceptance is not implied by a successful build or these isolated checks.

**Worker boundary:** Vercel's request-driven container lifecycle does not provide the local five-second daemon. The existing booking engine reconciles overdue arrivals when availability is requested and seating enforces the server cutoff, but idle unattended reconciliation is pending a separately hosted worker. Marvin explicitly selected website delivery first. Do not describe this website-only release as providing continuous five-second automatic release. No real online payment processing or full B8 assignment acceptance is claimed.

**Repeat website deployment (after verification):**

```bash
npx vercel whoami --global-config /home/morkmork26/marvin/.vercel-cli
npx vercel deploy --project restaurant-reservation-system --environment preview \
  --env DB_DATABASE=tablebook_bella_vista \
  --env APP_URL=https://bella-vista-dining-marvmarv08.vercel.app \
  --env APP_ENV=hosted --env APP_TZ=Asia/Manila --env SESSION_DRIVER=database \
  --scope marvmarv08 --global-config /home/morkmork26/marvin/.vercel-cli
```

After Ready, assign that deployment to the existing Bella Vista alias. Keep the current database, inherited private TLS/credentials and old deployment intact. This command does not initialize/reset a database.

**Recovery:** retain the previous Vercel deployment and `defaultdb`; use its existing URL to return to the prior application. Keep the new database and any real records after use. Do not reset either database or point legacy source at the new schema as a rollback. Re-deployments of Bella Vista must explicitly select the new database and correct APP_URL. Do not run the legacy hosted initializer against it.

## Historical Lumina delivery state

Admin-only permanent reservation deletion is deployed as a READY [Singapore Vercel Preview](https://restaurant-reservation-system-jrtseuge1-marvmarv08.vercel.app) in Marvin’s verified workspace from source 0599da6. Delete replaces Mark no-show, retains Cancel, and opens Keep reservation / Delete permanently without typed input. Booking history and private access bindings are removed transactionally; linked inventory holds are released, shared guest profiles and unrelated bookings remain, and seated parties or bookings with food orders are refused. One minimal deletion audit remains; deleted no-shows no longer affect the guest counter. Integrated source passed 411 application checks (125 MySQL, 44 HTTP, 242 browser), plus 22 hosted configuration/session checks; PHP lint on 63 files, JavaScript syntax, isolated smoke, secret scanning and independent review passed. An initial guest-motion assertion raced the dialog close-focus event; its exact assertion now awaits focus restoration and the 31-check suite passed. Deployment metadata verified READY, Preview target, correct owner/project, source SHA and sin1 runtime. The Vercel deploy skill forbids fetching the deployed app URL, so no live UI or live deletion result is claimed. This task deleted no existing local/hosted booking; credentials and storage were retained. Preview APP_URL and ignored local URL point to the new Preview. Chef video, PC/phone gallery motion and prior performance improvements are retained. The corrected unsigned zero-counter regression passed fresh 43 staff MySQL, 14 HTTP and 10 browser checks, plus 63-file PHP lint; the integrated baseline counts above precede this correction.

Chef cooking background is deployed as a READY [Singapore Preview](https://restaurant-reservation-system-30y3y3ho8-marvmarv08.vercel.app) from source 05cd40c in Marvin’s verified workspace. Twelve candidate pages were compared; three eligible clips were inspected across their duration. Selected licensed Pexels footage is a silent 7.36-second, approximately 1.2 MB crossfaded loop behind the existing food-showcase text. Dark overlay, deferred loading, shared Pause/Resume, reduced-motion poster and failure fallback preserve readable copy and existing PC/phone photo motion. All eight new video checks, 21 showcase regressions and eight actual hosted read-only checks passed, with desktop/mobile visual inspection and no JavaScript/CSP errors or mutations. Existing Singapore performance fixes and database records are retained; idle first-open can still take 4–6 seconds. Full comparison and provenance: research/10_chef_background_video_research.md.

Mobile food motion is deployed as a READY [Singapore Preview](https://restaurant-reservation-system-5zi0dy0wz-marvmarv08.vercel.app) from source 6cd997a. Phones now use slow horizontal autoplay with touch pause and Resume; the existing PC vertical motion is preserved. All 21 showcase browser checks and six actual hosted motion checks passed. Screenshots, reduced-motion behavior, desktop animation and mobile layout were verified. See docs/verification/mobile-food-motion.md.

The complete workspace performance update is deployed as a READY [Singapore Vercel Preview](https://restaurant-reservation-system-62moe3jjm-marvmarv08.vercel.app) from source ad83512 in Marvin's marvmarv08 workspace. Actual authenticated browser timings improved: table search 9.650 → 0.337 seconds, dashboard refresh 11.422 → 0.267 seconds, server refresh 9.032 → 0.379 seconds and kitchen refresh 9.294 → 0.210 seconds. Independent initial reads now run together, overlapping refreshes share the pending request, and older responses cannot overwrite new filters or saved data. All 404 isolated application checks and 22 extra runtime/session/configuration checks passed; 21 hosted interaction checks passed on the smaller PHP/Apache image with desktop/mobile inspection. Idle container startup can still take about 4–5 seconds; warm timings are not a guarantee for first open. Existing hosted/laptop records and Marvin's passwords are retained.

Use Marvin's Vercel account, verified as `marvmarv08`, through the dedicated CLI profile `/home/morkmork26/marvin/.vercel-cli`. Never use the shared `morkmork26` account or the explicitly rejected `cjmarv` workspace. Keep the existing GitHub repository `marvmarv08/restaurant-reservation-system`. Use the verified `marvmarv08` workspace on Hobby; any paid plan or trial needs a separate decision.

## Availability performance follow-up

A hosted query crosses the network. The original availability grid repeated checks for every slot and table: 726 SELECTs took 82.7 seconds in a read-only PHP/Aiven probe. The optimized grid fetches relevant inventory and occupancy once per search: 14 SELECTs took 1.85–2.57 seconds. A single-slot validation including policy loading improved from 45 SELECTs / 5.37 seconds to 13 SELECTs / 1.92 seconds. These are container-to-Aiven measurements, not end-to-end Vercel/browser measurements.

Search data is never cached across requests. Each booking validation gets a new inventory view, including the recheck inside existing transactions and inventory locks. Expired holds, pacing, scoped closures, joined-table setup, seated overruns and edit exclusions remain enforced. No database reset or migration is needed. Existing staff continue using their chosen passwords.

Use the Singapore Preview above and the existing staff password. Agent-authenticated hosted functional and latency checks are complete; Marvin’s follow-up timing feedback remains pending. Full evidence is in docs/verification/workspace-loading.md. Vercel container Previews may become idle after 30 seconds; production has a longer five-minute idle period. See https://vercel.com/docs/functions/container-images. No paid keepalive or database migration was introduced.

## Private database configuration

Create a separate Aiven MySQL Free service and wait for Running. Copy **Host**, **Port**, **User** and **Password** from its connection information into the ignored `.env.hosted` in this deployment folder. Use `DB_DATABASE=defaultdb`. These are online service credentials; laptop Docker passwords are a different connection. Enter values directly after `=` without surrounding quotes, then save.

Download the service CA certificate as `.private/ca.pem`. The CA is the trusted certificate used to verify the database server. Before initialization, encode that public certificate into the private `DB_SSL_CA_BASE64` value:

```bash
python3 - <<'PYCODE'
import base64
from pathlib import Path
p = Path('.env.hosted')
value = base64.b64encode(Path('.private/ca.pem').read_bytes()).decode('ascii')
lines = p.read_text().splitlines()
p.write_text('\n'.join('DB_SSL_CA_BASE64=' + value if line.startswith('DB_SSL_CA_BASE64=') else line for line in lines) + '\n')
PYCODE
```

Keep `APP_ENV=hosted`, `SESSION_DRIVER=database` and `APP_TZ=Asia/Manila`. Configure only one certificate source. Hosted connections refuse missing trust, invalid certificates, mismatched server names and unencrypted transport. Passwords and filled configuration files stay out of Git, Docker builds, chat and screenshots.

## Initialize only the new database

Build the hosted image locally:

```bash
docker build -f Dockerfile.vercel -t lumina-vercel:verify .
```

After verifying the intended new service and its TLS connection, initialize it from the CLI:

```bash
docker run --rm --env-file .env.hosted lumina-vercel:verify php bin/setup-hosted-db.php
```

The initializer requires `HOSTED_SETUP_CONFIRM=initialize-lumina-demo`, hosted mode, an allowed database name and an empty database or a matching installation marker. An unrelated existing database is refused. It creates schema and fictional date-relative demo bookings; reruns retain existing records. Staff start inactive. Do not export laptop guest data or staff passwords into this service. There is no public database setup route.

## Deploy a preview in the correct workspace

Verify the dedicated account before every project, environment or deployment action:

```bash
npx vercel whoami --global-config /home/morkmork26/marvin/.vercel-cli
```

Verify the workspace slug and free plan, then create/link the project there with explicit `--scope` using its verified team ID and `--global-config`. Use the team ID if the workspace slug matches the personal account name. Do not reuse the rejected workspace or rely on a default scope. `vercel.json` explicitly selects the Container framework and `Dockerfile.vercel` serves the PHP application on port 80. Do not leave the project set to Other: the observed first build served static outputs instead of PHP. Vercel container images are currently a beta feature; check current [container documentation](https://vercel.com/docs/functions/container-images) before delivery.

Set the hosted application/database values in the project's **Preview** environment. Upload database credentials and CA encoding through stdin or the private dashboard; never put passwords into command arguments, commit them, or use example passwords. Deploy with `vercel deploy --target preview`. The platform automatically promoted the first deployment even with a Preview request. After that bootstrap, create and verify a subsequent Preview before removing the temporary production artifact. Always inspect the actual target; do not infer it from command flags or READY alone. The `--skip-domain` flag is production-only and cannot be used for previews. Keep the exact HTTPS preview URL as `APP_URL` for staff invitations. Check build/readiness through deployment status tools and have Marvin rehearse the actual website. A successful build alone does not verify booking or staff behavior.

For the first staff account, run `bin/invite-staff.php` privately against this separate hosted service after setting its HTTPS `APP_URL`. Save the activation link privately, open it, and choose a new staff password. No email is sent and there is no preset staff password. The password for signing into the website is separate from the MySQL service password.

## Verification and recovery

Before delivery, verify real booking/hold replay across instances, staff activation and access controls, logout/revocation, restart persistence, cookie flags, verified TLS, transaction independence and existing isolated regressions. Hosted verification uses disposable containers on ports 18480/18481 and its own MySQL server; fixture reset scripts target only the guarded local test database. See [existing verification instructions](verification.md).

Vercel can stop idle containers, so instance-local files cannot hold durable sessions or uploads. This application stores session state in MySQL and ships static photos inside the image. Online reservations and orders survive redeploys while the hosted database is retained. Roll back the Vercel deployment through the dashboard if needed; preserve the additive schema and database records. Never reset the laptop volume to troubleshoot hosting.

Aiven Free is suitable for a class demonstration, with resource limits and possible inactivity pauses; see its [free-tier documentation](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier). Real messages, payments and production service guarantees remain outside this project.
