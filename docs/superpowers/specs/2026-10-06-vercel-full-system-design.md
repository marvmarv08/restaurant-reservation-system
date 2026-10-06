# Full Table Reserve deployment on Vercel

## Intent and authorization

Marvin requested Vercel deployment of the full working system, explicitly including real reservations and staff workflows rather than a visual-only preview. No hosted MySQL service currently exists. Prepare and verify the source while Marvin creates a separate online database. Featured Dish remains postponed. All source work stays on the Windows Desktop; the main local application, private configuration and database records are preserved.

## Selected architecture

Vercel runs the existing PHP 8.3/Apache app through its OCI Container Images feature (currently beta). A separate managed MySQL service holds bookings, orders, staff data and session state. The same-origin guest, staff and kitchen routes remain intact; no API rewrite, separate frontend, mocked availability or local-database tunnel.

Alternatives considered: the PHP community function runtime also requires external session/database state; a separately hosted Docker backend adds another origin and provider. The container route preserves the working web server and PHP extensions with the fewest changes.

## Required behavior

- `Dockerfile.vercel` builds the PHP runtime, retains the public-only document root and serves on port 80. Only runtime files enter the image/deployment package. No private env files, Git metadata, uploads, tests or personal local data are included.
- `APP_ENV=hosted` requires a verified TLS MySQL connection. `DB_SSL_CA` may point to a CA file; `DB_SSL_CA_BASE64` may supply a PEM CA through private hosting settings. Malformed/unreadable CA configuration fails before connecting. Certificate verification is always enabled when TLS is requested; hosted connections never silently fall back to plaintext.
- `SESSION_DRIVER=database` stores serialized session payloads in a new additive `web_sessions` table. Existing local/test defaults retain file sessions. Guest and staff session namespaces remain separate; only hashes of session IDs are stored as keys.
- The handler implements strict ID validation, expiry, session rotation/deletion, lazy-write timestamp renewal and bounded cross-process locking. Its connection is separate from application transactions. Close/error paths release locks; a lock timeout fails rather than continuing without protection.
- Hosted cookies are Secure/HttpOnly with the existing SameSite settings. HTTPS comes from explicit hosted configuration, never arbitrary client forwarding headers. Existing role/version checks, CSRF, login throttling, idle/absolute limits and management capabilities remain authoritative.
- Hosted initialization is CLI-only and refuses known local/main/test targets. It initializes a positively confirmed empty database, records an installation marker, then applies additive schema and demo seed. Reruns are allowed only for the matching marked installation. No public setup/reset/admin-bypass endpoint. Owners choose passwords using private activation invitations.
- The deployment is a Vercel preview unless Marvin explicitly requests production. It is not complete until provider credentials are configured, the separate database is initialized, the deployment build succeeds and required readiness evidence exists. No paid services are purchased.

## Verification

First reproduce loss of guest session across PHP processes with separate local session directories. Verify persistence, namespace isolation, unknown/expired IDs, staff rotation/logout/revocation, serialized concurrent updates, timestamp renewal and application-transaction independence against real isolated MySQL. Verify TLS refusal and successful trusted TLS without disabling certificate checking. Build and exercise the actual hosted container. Run existing isolated booking/auth/order and browser gates sequentially. Review private-file exclusions and obtain a fresh security review before external activation. A static homepage or a pending database connection does not count as a working deployment.

## External prerequisites

Marvin creates an online MySQL service and uses a Vercel account he controls. Aiven's free MySQL tier is a reviewed demo option; no purchase or provider signup is automated. Database host/port/name/user/password and CA are entered through private ignored local configuration or hosting settings, never chat, source, logs or Git. No main database export or credential reuse is required.

## Rollback

The Desktop main app remains on the verified source throughout preparation. Hosted changes are isolated on `feat/vercel-full-system`. Keep local file-session defaults. Deployment rollback selects the previous Vercel version; the additive session table can remain without dropping data. Never reset the main volume or copy real local staff credentials into the demo database.

## Primary references checked 2026-10-06

- https://vercel.com/docs/functions/container-images
- https://vercel.com/docs/functions/runtimes
- https://aiven.io/docs/products/mysql/concepts/mysql-free-tier
