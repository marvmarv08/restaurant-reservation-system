# Full Table Reserve Vercel Implementation Plan

> **For agentic workers:** Use executing-plans to implement inline with test-driven-development and one fresh final branch review. Do not delegate implementation or create external paid resources.

**Goal:** Deploy the complete PHP/MySQL reservation and staff application as a working Vercel preview.

**Architecture:** Preserve PHP/Apache routing in a Vercel OCI container. Use verified TLS to a separate hosted MySQL database, with session state held in that database rather than instance-local files. Keep the existing local app and file-session mode intact.

**Tech Stack:** PHP 8.3, Apache, PDO MySQL, MySQL 8.4, Docker, vanilla JS and Vercel Container Images.

**Spec:** `docs/superpowers/specs/2026-10-06-vercel-full-system-design.md`

## Global Constraints

- No main database reset/migration/export or local credential publication.
- Isolated session tests require BOOKING_TEST_MODE=isolated and DB_DATABASE=tablebook_p3_test.
- APP_ENV=hosted requires verified database TLS; never disable certificate verification.
- SESSION_DRIVER=database is explicit; current local defaults remain file-based.
- Featured Dish is deferred. No payments, notifications, paid subscriptions or auth bypasses.
- External provider readiness/credentials are required; unconfigured or partial deployment is not complete.

## Review Focus

- Session rotation and simultaneous requests must not restore an old authenticated session or lose updates.
- PHP lazy writes and inactive instances must not expire a continuously used guest session.
- Existing application transaction rollback must not roll back or accidentally commit session state.
- Bad certificates, missing environment configuration and lock failures must fail closed without printing secrets.
- Preview URL/cookie settings, host initialization and private deployment packaging must remain safe for a new online service.

### Task 1: Persistent guest/staff sessions

**Files:** create `src/Core/DatabaseSessionHandler.php`, `src/Core/SessionStore.php`, `database/init/08_web_sessions.sql`, `tests/hosted-sessions.php`, `tests/hosted-session-worker.php`; modify `src/Core/GuestSession.php` and `src/Core/StaffSession.php`.

**Interfaces:** `SessionStore::configure(): void`, `SessionStore::secureCookie(): bool`; `DatabaseSessionHandler(PDO $pdo, int $ttlSeconds = 86400, int $lockTimeoutSeconds = 5)` implements SessionHandlerInterface and SessionUpdateTimestampHandlerInterface using an independent PDO connection.

- [x] Write a real subprocess test: open the same guest cookie in two processes with separate file-session directories; assert identical session ID, CSRF and owner hash. Run and observe failure before product changes.
- [x] Implement namespaced hashed keys, expiry, bounded MySQL locks, strict IDs, deletion/rotation and lazy-write timestamp renewal; install only when SESSION_DRIVER=database.
- [x] Add actual staff establish/reopen/logout/revocation, unknown/expired ID, guest/staff separation, concurrent counter, lock timeout/release and transaction-independence checks.
- [x] Apply additive schema only to the guarded test DB and run `php tests/hosted-sessions.php`. Expected: all behavioral checks pass with no warnings; no test data touches main.
- [x] Commit the verified persistent-session change with its tests.

### Task 2: Verified hosted database transport

**Files:** modify `config/database.php` and `src/Core/Database.php`; create `tests/hosted-database.php` and certificate fixture utility if needed.

**Interfaces:** Database::connect(array $config): PDO consumes existing fields plus `ssl_ca`/`ssl_ca_base64`; hosted mode requires a trusted CA and TLS validation.

- [x] Write refusal tests for hosted plaintext, malformed CA and unreadable certificate paths; observe the current implementation's missing protection.
- [x] Implement bounded PEM decoding, safe CA file creation and verified PDO TLS options without logging passwords or weakening local connections.
- [x] Run real trusted/wrong-certificate connection tests and session tests. Expected: trusted TLS works, invalid/missing trust fails, local/test defaults work.
- [x] Commit the verified TLS connection support.

### Task 3: Hosted container and guarded initialization

**Files:** create `Dockerfile.vercel`, `.vercelignore`, `bin/setup-hosted-db.php`, and `docs/vercel-deployment.md`; modify `.dockerignore` and `.gitignore` to exclude all private env variants while preserving the example.

**Interfaces:** hosted container serves existing routes on port 80; initialization requires APP_ENV=hosted, explicit HOSTED_SETUP_CONFIRM and an empty/matching marked remote database; no web setup route.

- [x] Build/run the container locally and check real guest, catalog, protected routes, assets, Secure cookies and MySQL persistence across two instances/restart.
- [x] Exercise setup refusal on local/main/test/unconfirmed/nonempty targets before writes; confirm new marked demo initialization and safe rerun on a disposable fixture.
- [x] Inspect actual image/package files for forbidden env/Git/test/upload data and verify TLS credentials never appear in build output.
- [ ] Run full isolated existing regressions sequentially and final review. Expected: all required checks pass; document honest limitations.
- [ ] Commit the verified deployment package and guide.

### Task 4: Online activation and delivery

**Consumes:** verified container, guarded initializer, separate online MySQL details and a Vercel account controlled by Marvin.

- [ ] Configure private database/CA and hosted session settings; initialize only the intended separate database and privately issue the first staff invitation.
- [ ] Deploy a Vercel preview with the user's account or claimable deployment route; check build/provider readiness through permitted deployment status tools. Do not fetch the deployed URL under the current vercel-deploy skill.
- [ ] Obtain required runtime evidence through deployment tooling and user rehearsal; if verification is unavailable, record that limitation and do not claim complete operation.
- [ ] Update PLAN/current state/learning journal and Desktop export, bind PMM verification only to actual delivered evidence, and preserve recovery state for any missing external prerequisites.
