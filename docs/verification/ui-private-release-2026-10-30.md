# Private Bella Vista UI release — 2026-10-30

## Delivery

Marvin requested uploading all completed unpublished local work to GitHub/Vercel, then restoring the old repository name. Same private repository retained: [marvmarv08/restaurant-reservation-system](https://github.com/marvmarv08/restaurant-reservation-system), repository ID1404987923. SeatFlow's remote README-only commit9749192 was fast-forwarded into the feature history; no history rewrite or force push. Restored the requested README identity, committed57 reviewed files and fast-forwarded main. Source [3c01d69](https://github.com/marvmarv08/restaurant-reservation-system/commit/3c01d69f7070defdcd77c259806f9fbc4d11fa55) matched git ls-remote after push. A later documentation-only receipt commit does not change deployed runtime files.

[Protected Bella Vista website](https://bella-vista-dining-marvmarv08.vercel.app) → [immutable Preview](https://restaurant-reservation-system-1andksd2f-marvmarv08.vercel.app). Deployment ID dpl_Cy3UDNzgwfvhPHoWSU6SnzSDoWPJ. Vercel API verifies READY, exact source SHA, container framework, preview token environment, sin1, project prj_Lulyel25nldfU6vSTel2Gt01RGf2 and owner team_iFSlIHJejPUYm3ONVSXzLiG6. Alias metadata independently matches the deployment/project. GitHub PRIVATE and Vercel Authentication deploymentType=all remain verified.

## Scope

- Root restaurant introduction with native Continue to /reserve and query-preserving legacy bookmark forwarding.
- Original generated exterior/interior assets with provenance, photo-led About and fact-preserving History timeline.
- Controlled garden light/glow effects, static building/text, reduced-motion and failure fallbacks.
- Native accessible menu-photo dialog: large uncropped photo, keyboard/focus/scroll restoration, Close/Escape/backdrop and image failure.
- Related regression tests, research, learning notes and roadmap.

No schema/domain/auth implementation changed. Existing hosted tablebook_bella_vista, stable APP_URL, hosted timezone and database session driver are explicitly reused; private database/TLS values are inherited without printing. No local data or passwords uploaded. No database migration, initializer, reset, seed, record import, payment or messaging action. Existing defaultdb/deployments retained. Git-triggered deployment remains disabled; manual Preview used. Always-running worker remains separately pending.

## Fresh verification

| Check | Result |
|---|---:|
| Intro/navigation |27 passed|
| Garden effect/control |11 passed|
| Static image/Continue |5 passed|
| Story/interior design |10 passed|
| Menu image viewer |9 passed|
| Menu catalog/photo regressions |17 passed|
| Bella Vista seating imagery |21 passed|
| Total affected guest browser checks |100 passed|
| PHP lint |111 files,0 failures|
| Public/test JavaScript syntax |55 files passed|
| Hosted DB-configuration guards |5 passed|
| Exact Docker image source/asset hashes |220 matched|

Both local8080/18080 HTTP smoke checks passed. Built Dockerfile.vercel as bella-vista-ui-release:20261030, verified private/research/test files absent, and ran disposable exact-image HTTP smoke on18480 against preserved isolated records with files-session test settings. Actual hosted deployment explicitly retains database sessions. Main/preview all-table hashes/counts matched the fresh before/after release baseline. Temporary container/env file removed. Vercel dry manifest:237 files, container detected; optimized new UI/assets included and .env/private inputs, research originals and tests excluded. Staged credential-pattern and private-path audit passed; ignored files were not committed.

Independent read-only reviewer found no issue and additionally exercised Shift+Tab containment, drag-to-backdrop non-dismissal, Escape scroll restoration, four encoded legacy query redirects, dynamic fragments and offscreen fallback without IntersectionObserver. Whitespace checks passed.

The packaging verifier initially omitted the hash algorithm argument; its corrected run matched all220 files. A disposable smoke initially used invalid file-session spelling; corrected to supported files for that local test. Neither required application code changes. All recorded results above are from successful corrected runs.

## Limits and recovery

The full staff/booking-write suites were not rerun because this release changes UI/routes/assets rather than booking/auth/schema logic. Physical-device performance is not newly measured. The Vercel deployment skill forbids fetching the deployed website, so no hosted browser or live booking result is claimed; verified control-plane readiness/alias/privacy and local exact-image smoke are distinct evidence.

Previous Bella Vista deployment dpl_3Vz4Ue97D6a6TBdv6pKJgGAc8zgE (source21f85e2) remains available. To recover website presentation, repoint the existing alias to a retained compatible deployment; do not reset databases or point legacy source at the new schema. Keep both hosted schemas, credentials and all new records. Reopening public access requires Marvin's separate instruction.
