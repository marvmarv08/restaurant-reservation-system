# Download and run Bella Vista locally

Download this repository using GitHub **Code → Download ZIP**, extract it, and open PowerShell in the extracted folder. Install and start Docker Desktop with Linux containers first.

The source includes the updated menu and staff account-request feature. `database/share/bella-vista-starter.sql` contains all 47 tables and the reviewed venue configuration, nine-unit inventory and 24-item menu from the saved November 7 preview. Existing staff accounts, password hashes, guests, bookings, sessions, private links, financial records and audit history are excluded. This is a starter database, not a fresh export of Marvin's running database. Historical inactive menu rows are retained for catalog identity consistency.

## First startup

Copy the example configuration and edit the new `.env` using your own local database username and passwords. Never upload `.env` or share it publicly.

```powershell
Copy-Item .env.example .env
notepad .env
docker compose -f compose.teammate.yaml up -d --build
```

Open http://localhost:18080/reserve and http://localhost:18080/health. The health response should contain `"ok":true` and `"db":true`. If port 18080 is in use, stop the other local preview before starting this one.

This Compose file uses its own database volume, imports the starter SQL only on first startup, and does not seed old sample reservations. Use this file consistently rather than the historical default Compose setup.

## Create your own staff login

No existing login is included. Replace the example email and name below with your own details:

```powershell
docker compose -f compose.teammate.yaml exec app php bin/invite-staff.php teammate@example.com "Teammate Name" admin
```

Open the private one-use link printed by the command and choose your own passphrase (15–72 bytes). No email is sent. Do not post the activation link publicly. The account-request table is already included; subsequent requests can be approved using [the local approval instructions](staff-account-requests.md).

## Later source updates

```powershell
docker compose -f compose.teammate.yaml up -d --build
docker compose -f compose.teammate.yaml stop
```

Stopping preserves the database. Never run `down -v` unless you intentionally want to delete your own local database. Do not import the starter SQL into an existing database: it contains table replacement statements. Updating the source does not automatically upgrade existing database tables.

## Verification limits

The starter file is checked for table structure, a strict public-data allowlist, excluded private records and matching menu assets. Docker startup, a real SQL import and browser acceptance must still be checked on a machine with Docker Desktop available. This package does not repair or redeploy the public hosted website.
