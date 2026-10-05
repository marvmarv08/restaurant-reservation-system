# Laptop demo and safe rehearsal

Use the live PHP app. The prototype is simulated and does not prove database persistence. Commands below run from the repository folder in Ubuntu/WSL. Docker Desktop must be running with WSL integration enabled.

## Keep the main app safe

The main app remains at http://localhost:8080 with its existing `.env`, volume and activated staff. Do not replace `.env`, run test fixtures on it, or reset its volume. The demo at http://localhost:8082 has a separate database and staff accounts. Use a separate browser profile: cookies are shared across ports on a hostname, and a demo login can otherwise replace the main browser's session cookie.

Create the disposable stack while internet is available:

```bash
bash bin/demo.sh up
bash bin/demo.sh status
bash bin/smoke.sh http://localhost:8082
docker compose --env-file .env.demo -p tablebookdemo -f docker-compose.demo.yml exec app php bin/invite-staff.php demo-admin@lumina.test 'Demo Admin' admin
```

`up` generates a private `.env.demo` only if it does not exist, builds the app and waits for the database and app. It does not copy the main credentials. The invitation command prints a private one-use link **in your own terminal**. Open it and choose a password; there is no preset staff password. This is a separate account, not Marvin's main login. Keep the activation link and password out of screenshots and shared logs.

Initial Docker/image downloads require internet. After building and preparing the stack, the actual application runs without internet. Before demo day, stop and start using cached images:

```bash
bash bin/demo.sh stop
bash bin/demo.sh start
bash bin/smoke.sh http://localhost:8082
```

`stop` retains the demo database. `start` refuses image downloads and skips building. After a container is recreated, sign in again. Check `/health`, browse the menu and open all workspaces with Wi-Fi disconnected. Keep Docker Desktop and its WSL integration running. Disabling internet is different from stopping Docker or the local web server.

## Prepare before the eight-minute presentation

1. Rehearse during an open service day, Tuesday–Sunday. The venue uses Manila time, 17:30–23:30; Monday is closed.
2. Book a two-person Main Dining party through the **guest website at least 60 minutes ahead**, with fake contact details. Save its private link and reference privately. Choose a table available for the full dining interval.
3. Schedule the presentation from 30 minutes before this party's start through its dining interval. For example, reserve 18:30 before 17:30 and begin the demonstration at 18:00 or later. The server rejects seating a future booking too early.
4. Keep this prepared booking confirmed and unseated, with no food yet. Open guest, host, food orders and kitchen tabs. One demo admin can operate all three staff workspaces; separate server/kitchen accounts show role separation if useful.
5. Use fake notes such as “No onion” and an explicitly fictional allergy example. The application does not guarantee food is allergen-free.
6. Keep the internet off for the run. Use the laptop browser; localhost cannot be opened from a different phone using that phone's own `localhost`.

The live app has no clock bypass. Do not change real system time, opening hours or booking rules just to accelerate the presentation. If presenting outside dinner hours, explain the prepared service portion rather than claiming a future guest booking can immediately be seated.

## Eight-minute walkthrough

| Time | Show | What to explain |
|---|---|---|
| 0:00–1:30 | Guest searches a valid future date, selects a table, enters fake details and confirms | Availability and ten-minute holds use MySQL. Keep this new future booking separate from the earlier prepared booking. |
| 1:30–2:00 | Refresh the guest confirmation or open its private link in another browser | The record persists; the reference alone does not authorize management. No message or payment is sent. |
| 2:00–3:00 | Host finds the **prepared, now eligible booking** and chooses Seat party → Confirm seat party | Seating opens exactly one food order. Preparation respected the real lead/seating rules. |
| 3:00–4:30 | Food orders: open that booking's order, claim it as server, add a dish/quantity/course and notes, then Send to kitchen | The server snapshots menu prices and instructions; a repeated request cannot duplicate a ticket. |
| 4:30–6:00 | Kitchen: refresh, Start preparation, optionally mark individual lines, then Mark entire ticket ready | The ticket shows actual table members and instructions; its timer uses server time. |
| 6:00–7:00 | Server refreshes, marks served, then closes service | Kitchen readiness and actual delivery are separate. Closure records no payment. |
| 7:00–8:00 | Host completes the visit, then shows history and the table reset buffer | Inventory is released with history retained and a fifteen-minute reset. Summarize roles and offline behavior. |

Only use the same prepared reservation for host → server → kitchen → completion. The new future booking remains a separate demonstration of guest confirmation. To demonstrate its entire lifecycle as well, return when its seating window opens.

## Reset only the disposable demo

Reset erases **demo bookings, staff accounts and orders**. Save any demonstration material first. Run the deliberately explicit command:

```bash
bash bin/demo.sh reset disposable-demo
bash bin/demo.sh up
```

Activate a new demo account afterward. The reset script fixes the project, database and volume names and validates the rendered Compose storage target before deleting anything. It accepts no alternate project or main-stack path. Keep `.env.demo` unless intentionally replacing the already-erased demo credentials. Never use the main Compose file with `down --volumes`.

## Verification and its limits

The P7 browser test runs in a guarded test or disposable demo database. It creates a real guest booking through the UI and uses that **same record** through seating, ordering, kitchen preparation, serving, closure and host completion. One fixture moves only that fake booking's interval to arrival time to avoid waiting an hour. No application clock, production rule or main data is changed. `prepare` clears booking/order verification data; do not use a demo database holding anything you want to retain.

External browser requests are blocked while localhost remains reachable. This checks application independence from internet; it does not simulate a Docker image download without internet or every possible laptop/network failure. The suite also checks automated WCAG A/AA rules, 320/390/768/1440px reflow, keyboard skip links and modal focus. Automated results are not a claim of full WCAG certification or a substitute for Marvin's hands-on rehearsal.

See [verification commands](verification.md). The browser tools are temporary development tools, not production dependencies.

## If something fails

| Symptom | Action |
|---|---|
| localhost does not open | Start Docker Desktop, check WSL integration, then run `bash bin/demo.sh status` and `start`. |
| First setup reports a missing image | Connect to internet and run `up` once; use `start` after preparing cached images. |
| Port 8082 is occupied | Stop the other process or an older demo checkout; do not silently start another project against this demo volume. |
| Staff session has expired or was replaced | Sign in again in the dedicated demo browser profile. Database records remain saved. |
| Password was forgotten | Password recovery is not implemented. Reset only this disposable demo and privately activate a new demo account; retain the main account. |
| No tables or Seat party is unavailable | Check date, Monday closure, notice, actual seating window and existing inventory. Prepare early instead of weakening the policy. |
| Connection interrupted after an order action | Retry the same request. If you reloaded, inspect saved lines/status before submitting again. |

For container details, run the demo Compose command with `ps` or `logs app db`; do not share configuration output, activation links, passwords or guest contacts.
