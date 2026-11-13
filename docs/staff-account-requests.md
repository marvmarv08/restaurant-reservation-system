# Staff account requests and local approval

The staff login page includes **Request account activation**. The requester supplies a full name and Gmail address. A pending request does not create a login account, choose a role or set a password. A trusted operator approves it from the local Docker console and shares a private activation link. The person chooses their own password using that link.

This is staff authorization, not Gmail ownership verification. No verification email is sent. Confirm the requester's identity independently before granting access. Use `host`, `server` or `kitchen` when that is sufficient; select `admin` only for someone authorized to manage staff and system settings.

## Install the teammate update

1. Extract `Bella-Vista-Account-Activation-Update.zip` into a temporary folder.
2. Copy its `src`, `config`, `bin`, `database`, `public` and `docs` folders into the existing project folder containing `compose.teammate.yaml`. Merge folders and replace the matching files. Keep the rest of the project and its existing `.env`.
3. Open PowerShell in that existing project folder. Keep Docker Desktop running.
4. Run these commands:

```powershell
docker compose -f compose.teammate.yaml up -d --build
docker compose -f compose.teammate.yaml exec app php bin/staff-account-requests.php setup
```

The setup command adds only the request table and can be repeated safely. It does not reset the database, import a dump, seed bookings or change existing staff passwords. Never use `down -v` for this update: that deletes database storage.

Open http://localhost:18080/staff/login and press Ctrl+F5. The new section appears below Sign in. If the setup command has not run, requesting access fails closed with an administrator-contact message; existing sign-in remains available.

## Request and approve an account

The requester fills in **Full name** and **Gmail address**, then clicks **Request account activation**. They receive a generic acknowledgement and remain signed out.

In PowerShell, list requests:

```powershell
docker compose -f compose.teammate.yaml exec app php bin/staff-account-requests.php list
```

Approve the exact Gmail and choose the role yourself. Replace the example address:

```powershell
docker compose -f compose.teammate.yaml exec app php bin/staff-account-requests.php approve person@gmail.com admin
```

Supported roles: `admin`, `manager`, `host`, `server`, `kitchen`. The command prints a private activation link. Share it directly with the approved person, never in a public chat or screenshot. On the laptop running this local system, open the link, enter **New password** and **Confirm new password**, then click **Activate account**. Ordinary English passwords must have 15–72 characters; the server measures bytes. The link expires after 24 hours and works once.

Login at http://localhost:18080/staff/login. Admin, manager and host use the host dashboard; server and kitchen have their own permitted workspaces.

An approved request cannot be approved again to change its role or silently mint a new token. To replace an expired invitation for an inactive account, use the existing trusted invitation workflow. Existing active accounts and their passwords are never changed by a request.

## Creating a new admin without an account request

The existing trusted local invitation command remains supported:

```powershell
docker compose -f compose.teammate.yaml exec app php bin/invite-staff.php newperson@gmail.com "New Admin Name" admin
```

The activation link appears in the same PowerShell output. If it says **Deactivate this account before issuing a new activation link**, the supplied email already has an active account: no new link was created. Sign in with that account's existing password or use a different unused email for the new person. Do not deactivate the only working admin just to repeat an invitation.

## Other local Compose configurations

The commands above are for the private teammate package. In Marvin's development preview, replace `-f compose.teammate.yaml` with `-f docker-compose.test.yml`. These commands must be run against the intended local app, not the old port8080 application or the hosted database. The request CLI requires `APP_ENV=local`, `test` or `demo`; it refuses hosted/unspecified environments.

## Safeguards and implementation

- Request API: POST `/api/auth/account-requests`, with only `email` and `full_name`, JSON content type and the staff-session CSRF token. Unknown fields, including `role` and `password`, are rejected.
- Valid requests are limited to five per IP per hour and 100 globally per day. Existing/duplicate addresses receive the same acknowledgement. Public callers cannot list requests, inspect approval state or obtain activation links.
- The local CLI lists all pending requests, including those beyond the oldest 100. Duplicate public submissions cannot change the original name.
- Approval uses the existing staff security lock and one database transaction for the account, hashed invitation, approval state and audit record. Existing accounts/invitations are refused. Concurrent approvals produce one invitation; a late failure rolls back all these writes.
- The existing activation process stores only a token hash and hashes passwords. No password or raw activation token is saved in request records or audit logs. Approval alone does not grant sign-in access.

Verification was performed on separate disposable Docker containers, not the original data. See the project current-state entry for exact results and the known unrelated legacy seed-test failure. This update is local source plus a teammate patch; it has not been pushed to GitHub or deployed to Vercel.

## Main lesson

Requesting an account, approving permissions, and activating credentials are separate actions. Keeping them separate lets a person ask for access without giving them the power to choose their own privileges or overwrite an existing account.

## Verification receipt — 2026-11-11

29 service/MySQL,14 HTTP and14 browser checks pass on disposable containers. Existing staff43,management14 andorders28 checks pass. Booking40/41 passes; the unchanged original HEAD reproduces the same date-dependent demo-seed candidate failure. PHP118 files and changed JS syntax/whitespace checks pass. No original/hosted database changes or account creation are included in this delivery. Two approval processes compete without a synchronized contention barrier; the global cap/reset scenario seeds its counter.
