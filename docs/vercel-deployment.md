# Full-system Vercel deployment

This deployment keeps the existing PHP application, booking rules and staff workspaces. Vercel runs the PHP/Apache container; a separate online MySQL service stores reservations, orders and sessions. A session is the server record that remembers the browser after sign-in. Keeping it in MySQL lets another container recognize the same browser after a restart.

## Current delivery state

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
