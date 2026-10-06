# Workspace loading QA inventory

Goal: measure visible interaction completion and network timing, preserve real booking/auth/order rules, and resolve long loading throughout the existing application.

| Surface | Functional and latency checks | Visual checks |
|---|---|---|
| Guest | Initial form/menu; find table; change date/party/room/time; floor selection; Check Table; refresh tables/showcase; hold; confirm/replay; failure/retry | Desktop/mobile; working controls during load; statuses match server; no stuck skeleton |
| Guest management | Load private own-QA booking; fresh search; original retained until save; modify/cancel; errors | Mobile dialog; drafts, focus and feedback retained |
| Staff login | Independent QA activation/sign-in/logout; access denied; stale/revoked/expired session | Loading ends on failure; accessible labels and retry |
| Admin/host | Initial dashboard; refresh; date/status/search/page; table-floor time; own-QA reservation details/create/change/status; waitlist; settings/closures/staff/audit/outbox | Desktop/mobile; filters survive refresh; out-of-order responses cannot replace newer view |
| Server | Initial menu/list; refresh/date; own isolated fixture details/add/edit/send/deliver/close/void/retry | Menu and list load together; controls usable only with data; mobile dialog |
| Kitchen | Initial tickets; refresh/date/station; begin/ready/recall/retry | No overlapping polls; filter changes reach server; timers and layout |

Off-happy-path: slow/failed API; rapid refresh/filter changes while polling; idle/cold container; expired held inventory; logout/revocation while an action waits.

Actual hosted read/request timing and controlled fictional-QA work use the selected Marvin project. Full destructive fixture resets and all engine mutation regressions run only on the guarded local isolated database. No real user's password, reservations or role is changed. A dedicated fictional QA staff account is deactivated after testing. Minimal diagnostic Preview deployments are removed after runtime diagnosis.

## Baseline evidence

Actual Aiven-backed browser baseline: guest boot 5.58 s; table search 3.27 s; admin refresh 2.99 s; server boot 9.27 s / refresh 2.38 s; kitchen boot 6.97 s / refresh 2.49 s. These are the local hosted container with real Aiven, not Vercel measurements. Vercel deployment metadata reports iad1, while Marvin confirms DigitalOcean sgp for Aiven. Anonymous deployed requests were intercepted by Vercel protection; authenticated end-to-end testing is required before signing off.

## Verified end-to-end results (2026-10-07)

Authenticated Chromium runs on the real Vercel/Aiven stack, using an independent fictional QA account:

| Interaction | Previous iad1 Preview | Singapore sin1 Preview |
|---|---:|---:|
| Guest table search | 9.650 s | 0.337 s |
| Staff sign-in through ready dashboard | 55.641 s | 1.368 s |
| Dashboard refresh | 11.422 s | 0.267 s |
| Server workspace ready | 35.907 s | 0.948 s |
| Server refresh | 9.032 s | 0.379 s |
| Kitchen workspace ready | 26.249 s | 0.604 s |
| Kitchen refresh | 9.294 s | 0.210 s |

These are individual measured browser runs, not guaranteed latency. A second hosted interaction run passed 21 booking/management/admin/service checks, including its own booking cancellation, with no JavaScript errors. Desktop and 390px mobile screenshots were inspected and had no document overflow. Full isolated accessibility checks also covered 320px, dialogs, focus, reduced motion, retry and real order transitions.

The initial Singapore image still had approximately 4.8 seconds of idle startup; warm root/catalog/availability requests took approximately 0.17–0.21 seconds. The candidate image retains PHP 8.3/Apache and verified MySQL TLS while removing build tools and flattening its layers: 721 MB to 322 MB locally. The deployed image measured idle starts of 5.30 and 4.12 seconds, warm root 0.109 seconds and catalog 0.166–0.167 seconds; one immediate follow-up also needed 5.10 seconds. A third trial overlapped another QA run and is excluded from idle evidence. The smaller image does not establish that cold startup is eliminated.

## Regression evidence

404 isolated checks passed: 114 PHP engine checks, 43 HTTP checks and 247 browser checks. Six new controlled delayed-response checks prove parallel initial reads, coalesced dashboard refresh, latest kitchen filters, and that an older read cannot overwrite a saved reservation or order. The order test now waits for its actual save feedback before examining the server modal. A screenshot timeout passed on an unchanged rerun; a OneDrive cwd error passed after starting the last six-check suite in a fresh working directory.

The smaller runtime also passed 17 persistent-session checks and five hosted database configuration checks against the guarded isolated database. Actual Aiven TLS, PHP extensions, staff sign-in, dashboard, server and kitchen checks passed locally in that image. Independent review found no blocking issue. All secrets, private QA booking paths and browser cookies remain ignored under `.private`.

Final source commit: `ad83512`. Release Preview: [https://restaurant-reservation-system-62moe3jjm-marvmarv08.vercel.app](https://restaurant-reservation-system-62moe3jjm-marvmarv08.vercel.app). A repeat of all 21 hosted interaction checks on the smaller image passed with no JavaScript errors. Initial idle/asset waits and screenshot pauses can still trigger a cold start. Use this new URL; previous immutable Previews retain their original region and source.

Raw release metadata confirms `dpl_9A4ECThL2HajE4WWWX6dnVa2TvgP`, READY, regions `[sin1]`, Preview target and owner `team_iFSlIHJejPUYm3ONVSXzLiG6`; its commit is `ad8351218c9cc54c7f1a414c4837f1abac3132e4`. Three temporary minimal diagnostic deployments were removed after testing.

## Final release acceptance and cleanup

The exact committed release passed all 21 hosted checks with no JavaScript errors: table search 0.330 s, refresh tables 0.248 s, table check 0.670 s, showcase refresh 1.117 s, hold 1.086 s, confirmation 0.741 s, management search 0.424 s, sign-in/dashboard 1.234 s, dashboard refresh 0.410 s, server refresh 0.308 s and kitchen refresh 0.417 s. First guest form readiness including initial container/assets took 6.230 s. Timings are individual measured runs, not guarantees.

All owned QA bookings are cancelled; normal staff-account change deactivated only the independent QA account and incremented its authentication version. Marvin's original active admin, password and existing records were not reset. Cancelled fictional QA history is retained. Preview APP_URL and ignored .env.hosted point to the final URL. Minimal diagnostic Previews were removed, and temporary local hosted/lean QA containers were removed. The original laptop stack and isolated regression stack remain intact.
