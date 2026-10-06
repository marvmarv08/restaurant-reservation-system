# Full-system Vercel deployment

This deployment keeps the existing PHP application, booking rules and staff workspaces. Vercel runs the PHP/Apache container; a separate online MySQL service stores reservations, orders and sessions. A session is the server record that remembers the browser after sign-in. Keeping it in MySQL lets another container recognize the same browser after a restart.

## Current delivery state

The tested PHP container is deployed as a [Vercel Preview](https://restaurant-reservation-system-j9yt7rfp1-marvmarv08.vercel.app) from source e6f35b9. Raw deployment metadata confirms READY, Container framework and Preview target. APP_URL is filled in the private hosted file and Preview settings. The separate Aiven database is initialized with verified TLS, 39 tables, 36 menu items and 174 fictional reservations. The ignored `.private/first-admin-invitation.txt` in the Desktop deployment folder contains Marvin's private activation instructions. A local hosted runtime using the actual Aiven database passed health/catalog/session checks. Marvin confirmed the actual menu/photos/categories, reservation confirmation, staff activation/sign-in and admin dashboard work on the deployed website. A fresh encrypted read-only aggregate check confirmed one active staff and 175 reservations against 174 original demo rows. Guest/admin hosted browser acceptance is complete; this is user-reported browser evidence, corroborated by database counts, rather than an agent fetch of the deployed URL. The laptop database remains separate.

Use Marvin's Vercel account, verified as `marvmarv08`, through the dedicated CLI profile `/home/morkmork26/marvin/.vercel-cli`. Never use the shared `morkmork26` account or the explicitly rejected `cjmarv` workspace. Keep the existing GitHub repository `marvmarv08/restaurant-reservation-system`. Use the verified `marvmarv08` workspace on Hobby; any paid plan or trial needs a separate decision.

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
