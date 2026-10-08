import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
if (process.env.BOOKING_TEST_MODE !== "isolated")
  throw new Error("Staff browser tests require the isolated stack");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
    : "playwright"
);
const base = "http://127.0.0.1:18080",
  password = "Isolated staff passphrase 2026!";
const artifacts =
  process.env.BROWSER_ARTIFACT_DIR ||
  "/tmp/restaurant-phase4-browser/staff-screenshots";
await mkdir(artifacts, { recursive: true });
function fixture(data) {
  const args = [
    "compose",
    "-f",
    "docker-compose.test.yml",
    "exec",
    "-T",
    "app",
    "php",
    "tests/staff-fixture.php",
  ];
  const via = process.env.BROWSER_DOCKER_VIA_WSL === "1";
  return JSON.parse(
    execFileSync(
      via ? "wsl.exe" : "docker",
      via
        ? [
            "-d",
            "Ubuntu",
            "-u",
            "morkmork26",
            "--cd",
            process.cwd(),
            "--",
            "docker",
            ...args,
          ]
        : args,
      { input: JSON.stringify(data), stdio: ["pipe", "pipe", "pipe"] },
    ).toString(),
  );
}
const invitations = fixture({ action: "prepare" }),
  ready = fixture({ action: "ready" }),
  browser = await chromium.launch({ headless: true }),
  errors = [];
let passed = 0;
async function check(name, work) {
  await work();
  console.log("PASS " + name);
  passed++;
}
async function makePage(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/.test(message.text()))
      errors.push(message.text());
  });
  return { context, page };
}
async function activate(page, role) {
  await page.goto(base + invitations[role].activation_path);
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Activate account", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Service overview.", exact: true })
    .waitFor();
}
const { context, page } = await makePage();
let code, group, queued;
const catalog = await fetch(base + "/api/catalog")
  .then((r) => r.json())
  .then((r) => r.catalog);
const dateDay = new Date(catalog.today + "T00:00:00Z");
dateDay.setUTCDate(dateDay.getUTCDate() + 42);
while (dateDay.getUTCDay() !== 2) dateDay.setUTCDate(dateDay.getUTCDate() + 1);
const date = dateDay.toISOString().slice(0, 10);
async function filterDate(value) {
  await page.getByLabel("Service date", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh", exact: true })
    .waitFor({ state: "visible" });
}
async function closeDialog() {
  if (await page.getByRole("dialog").isVisible())
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
}
async function newReservation({
  party = "2",
  room = "common",
  name = "Staff Browser Guest",
} = {}) {
  await page
    .getByRole("button", { name: "New reservation", exact: true })
    .click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Guests", { exact: true }).fill(party);
  await dlg.getByLabel("Room", { exact: true }).selectOption(room);
  await dlg
    .getByRole("button", { name: "Find available tables", exact: true })
    .click();
  await dlg.locator(".options input").first().waitFor();
  await dlg.getByLabel("Guest full name", { exact: true }).fill(name);
  await dlg.getByLabel("Guest phone", { exact: true }).fill("+639000000010");
  await dlg
    .getByLabel("Guest email · optional", { exact: true })
    .fill("staff-browser@lumina.test");
  await dlg
    .getByRole("button", { name: "Create reservation", exact: true })
    .click();
  await page
    .locator("#staff-feedback")
    .filter({ hasText: "created." })
    .waitFor();
  const created = (await page.locator("#staff-feedback").textContent()).match(
    /LUM-[A-Z0-9]{6}/,
  )[0];
  await findReservation(created);
  return created;
}
async function findReservation(code, target = page) {
  const status = target.getByLabel("Status", { exact: true });
  if (await status.count()) await status.selectOption("all");
  await target.getByLabel("Guest, phone, or reference", { exact: true }).fill(code);
  const refreshed = target.waitForResponse(r => r.url().includes("/api/admin/dashboard?") && new URL(r.url()).searchParams.get("q") === code);
  await target.getByRole("button", { name: "Refresh", exact: true }).click();
  await refreshed;
}
async function open(code) {
  await findReservation(code);
  await page.getByRole("button", { name: "Open " + code, exact: true }).click();
  await page.getByRole("dialog").getByText(code, { exact: true }).waitFor();
}
async function action(code, label, confirm) {
  await open(code);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: label, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: confirm, exact: true })
    .click();
  await page
    .locator("#staff-feedback")
    .filter({ hasText: code + " updated." })
    .waitFor();
}
try {
  await check("Anonymous staff page redirects to the login form", async () => {
    await page.goto(base + "/admin");
    await page.getByLabel("Staff email", { exact: true }).waitFor();
    assert.match(page.url(), /\/staff\/login$/);
    await page.screenshot({ path: artifacts + "/login.png" });
  });
  await check(
    "Private activation succeeds without leaking the secret through HTTP URLs",
    async () => {
      const urls = [];
      page.on("request", (r) => urls.push(r.url()));
      await activate(page, "admin");
      const secret = new URLSearchParams(
        invitations.admin.activation_path.split("#")[1],
      ).get("token");
      assert.ok(urls.every((url) => !url.includes(secret)));
      assert.equal(new URL(page.url()).hash, "");
      assert.match(await page.locator("#staff-user").textContent(), /admin/);
      await page.reload();
      await page.getByRole("heading", { name: "Service overview." }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    },
  );
  await check(
    "Staff booking recovers an interrupted response and guest text stays inert",
    async () => {
      await filterDate(date);
      await page.route("**/api/admin/reservations", async (route) => {
        await route.fetch();
        await route.abort("failed");
      });
      code = await newReservation({
        name: "<img src=x onerror=window.staffXss=1>",
      });
      await page.unroute("**/api/admin/reservations");
      assert.equal(await page.evaluate(() => window.staffXss), undefined);
      assert.equal(await page.locator("#staff-rows img").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Open " + code, exact: true })
          .count(),
        1,
      );
      await page.screenshot({
        path: artifacts + "/desktop-service.png",
        fullPage: true,
      });
    },
  );
  await check(
    "Staff changes party and table without losing the reference",
    async () => {
      await open(code);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Edit reservation", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByLabel("Guests", { exact: true })
        .fill("4");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Find available tables", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .locator(".options input")
        .first()
        .waitFor();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Save reservation changes", exact: true })
        .click();
      await page
        .locator("#staff-feedback")
        .filter({ hasText: code + " updated." })
        .waitFor();
      await open(code);
      assert.equal(
        await page
          .getByRole("dialog")
          .locator(".summary dd")
          .nth(1)
          .textContent(),
        "4",
      );
      await closeDialog();
    },
  );
  await check(
    "Manager approval persists and host roles have no approval/settings buttons",
    async () => {
      group = await newReservation({
        party: "13",
        room: "group",
        name: "Browser Pending Group",
      });
      await action(group, "Approve request", "Confirm approve request");
      const host = await makePage({ width: 390, height: 844 });
      await activate(host.page, "host");
      assert.equal(
        await host.page
          .getByRole("button", { name: "Booking settings", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await host.page
          .getByRole("button", { name: "Staff accounts", exact: true })
          .count(),
        0,
      );
      await findReservation(group, host.page);
      await host.page.getByLabel("Service date", { exact: true }).fill(date);
      await host.page
        .getByRole("button", { name: "Refresh", exact: true })
        .click();
      await host.page
        .getByRole("button", { name: "Open " + group, exact: true })
        .waitFor();
      await host.page
        .getByRole("button", { name: "Open " + group, exact: true })
        .click();
      assert.equal(
        await host.page
          .getByRole("dialog")
          .getByRole("button", { name: "Approve request", exact: true })
          .count(),
        0,
      );
      assert.match(
        await host.page.getByRole("dialog").locator(".status").textContent(),
        /Confirmed/,
      );
      assert.equal(
        await host.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await host.page.screenshot({ path: artifacts + "/mobile-detail.png" });
      await host.context.close();
    },
  );
  await check(
    "Waitlist UI creates, offers, and accepts a real held reservation",
    async () => {
      await page.getByRole("button", { name: "Waitlist", exact: true }).click();
      await page
        .getByRole("button", { name: "Add to waitlist", exact: true })
        .click();
      const dlg = page.getByRole("dialog");
      await dlg.getByLabel("Requested time", { exact: true }).fill("20:30");
      await dlg
        .getByLabel("Guest full name", { exact: true })
        .fill("Browser Waitlist Guest");
      await dlg
        .getByLabel("Guest phone", { exact: true })
        .fill("+639000000011");
      await dlg
        .getByRole("button", { name: "Add to waitlist", exact: true })
        .click();
      await page
        .locator("#staff-feedback")
        .filter({ hasText: "added to the waitlist" })
        .waitFor();
      queued = (await page.locator("#staff-feedback").textContent()).match(
        /LUM-[A-Z0-9]{6}/,
      )[0];
      await page
        .getByRole("button", { name: "Recheck available tables", exact: true })
        .click();
      await page
        .locator("#staff-feedback")
        .filter({ hasText: "real table offer" })
        .waitFor();
      await action(queued, "Accept held offer", "Confirm accept held offer");
      assert.equal(
        await page
          .getByRole("button", { name: "Open " + queued, exact: true })
          .count(),
        0,
      );
    },
  );
  await check(
    "Seating protects orders and permanent deletion requires explicit confirmation",
    async () => {
      await page
        .getByRole("button", { name: "Service overview", exact: true })
        .click();
      await filterDate(catalog.today);
      await action(ready.seat, "Seat party", "Confirm seat party");
      await open(ready.seat);
      assert.match(
        await page
          .getByRole("dialog")
          .getByText(/Order #/)
          .textContent(),
        /open/,
      );
      assert.equal(await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).count(), 0);
      await closeDialog();
      await action(ready.seat, "Complete visit", "Confirm complete visit");
      await open(ready.no_show);
      assert.equal(await page.getByRole("button", { name: "Mark no-show", exact: true }).count(), 0);
      let deletions = 0;
      const recordDeletion = (request) => {
        if (request.url().endsWith("/api/admin/reservations/delete") && request.method() === "POST") deletions++;
      };
      page.on("request", recordDeletion);
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByText(/This cannot be undone/).waitFor();
      assert.equal(await page.getByRole("dialog").locator("input").count(), 0);
      assert.equal(await page.getByRole("button", { name: "Keep reservation", exact: true }).evaluate((button) => button === document.activeElement), true);
      await page.screenshot({ path: artifacts + "/delete-confirmation-desktop.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: artifacts + "/delete-confirmation-mobile.png" });
      await page.getByRole("button", { name: "Keep reservation", exact: true }).click();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole("button", { name: "Delete", exact: true }).waitFor();
      assert.equal(deletions, 0);
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      const deleted = page.waitForResponse((response) => response.url().endsWith("/api/admin/reservations/delete") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
      assert.equal((await deleted).status(), 200);
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.locator("#staff-feedback").filter({ hasText: /permanently deleted/ }).waitFor();
      assert.equal(deletions, 1);
      assert.equal(await page.getByRole("button", { name: "Open " + ready.no_show, exact: true }).count(), 0);
      page.off("request", recordDeletion);
    },
  );
  await check(
    "Admin settings persist and audit/outbox display real saved changes",
    async () => {
      await page
        .getByRole("button", { name: "Booking settings", exact: true })
        .click();
      await page.locator("[name=hold_ttl_sec]").waitFor();
      await page.locator("[name=hold_ttl_sec]").fill("120");
      await page
        .getByRole("button", { name: "Save booking rules", exact: true })
        .click();
      await page
        .locator("#staff-feedback")
        .filter({ hasText: "Settings saved" })
        .waitFor();
      assert.equal(
        await page.locator("[name=hold_ttl_sec]").inputValue(),
        "120",
      );
      await page.locator("[name=hold_ttl_sec]").fill("600");
      await page
        .getByRole("button", { name: "Save booking rules", exact: true })
        .click();
      await page
        .locator("#staff-feedback")
        .filter({ hasText: "Settings saved" })
        .waitFor();
      await page
        .getByRole("button", { name: "Audit history", exact: true })
        .click();
      await page
        .getByText("settings.settings", { exact: true })
        .first()
        .waitFor();
      await page
        .getByRole("button", { name: "Demo notifications", exact: true })
        .click();
      await page
        .getByText("Lumina waitlist offer", { exact: true })
        .first()
        .waitFor();
      assert.match(
        await page.locator("#staff-workspace").textContent(),
        /No email or SMS has been delivered/,
      );
    },
  );
  await check(
    "Staff invitation activates a second browser; deactivation revokes that open session",
    async () => {
      await page
        .getByRole("button", { name: "Staff accounts", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Invite staff", exact: true })
        .click();
      const dlg = page.getByRole("dialog");
      await dlg
        .getByLabel("Staff full name", { exact: true })
        .fill("Browser Crew");
      await dlg
        .getByLabel("Staff email", { exact: true })
        .fill("browser-crew@lumina.test");
      await dlg
        .getByRole("button", { name: "Create activation link", exact: true })
        .click();
      const link = await dlg
        .getByRole("link", { name: "Private activation link", exact: true })
        .getAttribute("href");
      await closeDialog();
      const crew = await makePage({ width: 390, height: 844 });
      await crew.page.goto(base + link);
      await crew.page
        .getByLabel("New password", { exact: true })
        .fill(password);
      await crew.page
        .getByLabel("Confirm new password", { exact: true })
        .fill(password);
      await crew.page
        .getByRole("button", { name: "Activate account", exact: true })
        .click();
      await crew.page
        .getByRole("heading", { name: "Service overview." })
        .waitFor();
      await page
        .getByRole("button", { name: "Manage Browser Crew", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByLabel("Active", { exact: true })
        .uncheck();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Save staff account", exact: true })
        .click();
      await page
        .locator("#staff-feedback")
        .filter({ hasText: "Staff account updated" })
        .waitFor();
      await crew.page.reload();
      await crew.page.getByLabel("Staff email", { exact: true }).waitFor();
      assert.match(crew.page.url(), /staff\/login/);
      await crew.context.close();
    },
  );
  await check(
    "Mobile dashboard contains table scrolling and logout protects browser back navigation",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Service overview", exact: true })
        .click();
      await page.locator("#staff-rows").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: artifacts + "/mobile-service.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 320, height: 740 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.getByLabel("Staff email", { exact: true }).waitFor();
      await page.goBack();
      await page.getByLabel("Staff email", { exact: true }).waitFor();
      assert.equal(await page.locator("#staff-rows").count(), 0);
    },
  );
  assert.deepEqual(errors, []);
  console.log(
    `Staff browser tests: ${passed} passed; no JavaScript or CSP errors.`,
  );
} finally {
  await context.close();
  await browser.close();
}
