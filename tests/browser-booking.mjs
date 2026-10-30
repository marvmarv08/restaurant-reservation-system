import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (process.env.BOOKING_TEST_MODE !== "isolated")
  throw new Error("Browser tests require BOOKING_TEST_MODE=isolated");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
    : "playwright"
);
const base = "http://127.0.0.1:18080";
const browser = await chromium.launch({ headless: true });
const screenshotDir =
  process.env.BROWSER_ARTIFACT_DIR ||
  "/tmp/restaurant-phase4-browser/screenshots";
await mkdir(screenshotDir, { recursive: true });
const fixture = (data) => {
  const args = [
    "compose",
    "-f",
    "docker-compose.test.yml",
    "exec",
    "-T",
    "app",
    "php",
    "tests/browser-fixture.php",
  ];
  const command =
    process.env.BROWSER_DOCKER_VIA_WSL === "1" ? "wsl.exe" : "docker";
  execFileSync(
    command,
    command === "docker"
      ? args
      : [
          "-d",
          "Ubuntu",
          "-u",
          "morkmork26",
          "--cd",
          process.cwd(),
          "--",
          "docker",
          ...args,
        ],
    { input: JSON.stringify(data), stdio: ["pipe", "pipe", "pipe"] },
  );
};
let passed = 0;
const errors = [];
async function check(name, work) {
  await work();
  console.log("PASS " + name);
  passed++;
}
async function pageFor(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => {
    if (/Content Security Policy|Refused to/.test(entry.text()))
      errors.push(entry.text());
  });
  await page.goto(base + '/reserve');
  await page
    .getByRole("button", { name: "Find a table", exact: true })
    .waitFor();
  return { context, page };
}
const dateParts = Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .filter((p) => p.type !== "literal")
    .map((p) => [p.type, p.value]),
);
const day = new Date(
  `${dateParts.year}-${dateParts.month}-${dateParts.day}T00:00:00Z`,
);
day.setUTCDate(day.getUTCDate() + 28);
while (day.getUTCDay() !== 2) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
async function search(
  page,
  { date: value = date, party = "2", room = "common" } = {},
) {
  await page.getByLabel("Room preference").selectOption("any");
  await page.getByLabel("Guests", { exact: true }).selectOption(party);
  await page.getByLabel("Date · Manila time").fill(value);
  await page.getByLabel("Room preference").selectOption(room);
  await page.getByRole("button", { name: "Find a table", exact: true }).click();
}
async function hold(page) {
  await search(page);
  await page
    .getByRole("button", { name: "Continue with this table", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).waitFor();
}
async function fillGuest(page) {
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Browser Test Guest");
  await page.getByLabel("Phone number", { exact: true }).fill("+639000000004");
  await page.getByLabel("Email", { exact: true }).fill("browser@lumina.test");
  await page
    .getByLabel("Special requests · optional")
    .fill("Window if possible.");
}
const { context, page } = await pageFor();
let privatePath, bookingCode;
try {
  await check(
    "Desktop UI, catalog, menu filters, and keyboard floor selection",
    async () => {
      assert.equal(await page.locator(".room-card").count(), 4);
      assert.equal(await page.locator(".menu-item").count(), 36);
      await page.getByRole("button", { name: "Sweet", exact: true }).click();
      assert.equal(await page.locator(".menu-item").count(), 5);
      await page
        .getByRole("button", { name: "All dishes", exact: true })
        .click();
      await search(page);
      await page.locator(".floor-table.available").first().focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button",{name:"Use this table",exact:true}).click();
      assert.equal(
        await page.locator(".table-option input:checked").count(),
        1,
      );
      assert.equal(await page.locator(".floor-table.selected").count(), 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: screenshotDir + "/desktop-search.png",
        fullPage: true,
      });
    },
  );
  await check(
    "Owned hold restores after refresh and required fields block empty confirmation",
    async () => {
      await page
        .getByRole("button", { name: "Continue with this table" })
        .click();
      await page.getByLabel("Full name", { exact: true }).waitFor();
      await page.reload();
      await page.getByLabel("Full name", { exact: true }).waitFor();
      assert.match(
        await page.locator("#hold-countdown").textContent(),
        /^\d+:\d{2}$/,
      );
      await page
        .getByRole("button", { name: "Confirm reservation", exact: true })
        .click();
      assert.equal(await page.locator(".booking-code").count(), 0);
      await fillGuest(page);
    },
  );
  await check(
    "Interrupted confirmation response recovers one real booking and survives refresh",
    async () => {
      await page.route("**/api/reservations", async (route) => {
        await route.fetch();
        await route.abort("failed");
      });
      await page
        .getByRole("button", { name: "Confirm reservation", exact: true })
        .click();
      await page.locator(".booking-code").waitFor();
      bookingCode = await page.locator(".booking-code").textContent();
      privatePath = await page
        .locator("#flow a")
        .filter({ hasText: "My booking" })
        .getAttribute("href");
      await page.reload();
      await page.locator(".booking-code").waitFor();
      assert.equal(
        await page.locator(".booking-code").textContent(),
        bookingCode,
      );
      assert.equal(
        await page.evaluate(() =>
          JSON.stringify(sessionStorage).includes("browser@lumina.test"),
        ),
        false,
      );
    },
  );
  const second = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const other = await second.newPage();
  other.setDefaultTimeout(10000);
  other.on("pageerror", (e) => errors.push(e.message));
  await check(
    "Second browser opens the private link without sending its token in request URLs",
    async () => {
      const requested = [];
      other.on("request", (request) => requested.push(request.url()));
      await other.goto(base + privatePath);
      await other.locator(".booking-code").waitFor();
      assert.equal(
        await other.locator(".booking-code").textContent(),
        bookingCode,
      );
      assert.equal(new URL(other.url()).hash, "");
      const token = new URLSearchParams(privatePath.split("#")[1]).get("token");
      assert.ok(requested.every((url) => !url.includes(token)));
      await other.reload();
      await other.locator(".booking-code").waitFor();
      assert.equal(
        await other.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await other.screenshot({
        path: screenshotDir + "/mobile-management.png",
        fullPage: true,
      });
    },
  );
  await check(
    "Real modification changes party/table and another tab cannot overwrite a stale version",
    async () => {
      await other
        .getByRole("button", { name: "Change reservation", exact: true })
        .click();
      await search(other, { party: "4" });
      await other
        .getByRole("button", { name: "Save reservation changes", exact: true })
        .click();
      await other
        .getByRole("button", { name: "Change reservation", exact: true })
        .waitFor();
      assert.equal(
        await other.locator(".summary dd").nth(1).textContent(),
        "4",
      );
      await page.goto(base + privatePath);
      await page.locator(".booking-code").waitFor();
      await page
        .getByRole("button", { name: "Change reservation", exact: true })
        .click();
      await search(page, { party: "3" });
      await other
        .getByRole("button", { name: "Change reservation", exact: true })
        .click();
      await search(other, { party: "2" });
      await other
        .getByRole("button", { name: "Save reservation changes", exact: true })
        .click();
      await other
        .getByRole("button", { name: "Change reservation", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Save reservation changes", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "another tab" })
        .waitFor();
      assert.equal(await page.locator(".summary dd").nth(1).textContent(), "2");
    },
  );
  await check(
    "Cancellation asks for confirmation, Keep preserves booking, Cancel releases it",
    async () => {
      await other
        .getByRole("button", { name: "Cancel reservation", exact: true })
        .click();
      await other
        .getByRole("button", { name: "Keep reservation", exact: true })
        .click();
      assert.equal(await other.locator(".status").textContent(), "Confirmed");
      await other
        .getByRole("button", { name: "Cancel reservation", exact: true })
        .click();
      await other
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await other
        .getByRole("status")
        .filter({ hasText: "tables have been released" })
        .waitFor();
      assert.equal(await other.locator("#manage-feedback").getAttribute("aria-live"), "polite");
      assert.equal(await other.locator(".status").textContent(), "Cancelled");
      await other.reload();
      await other.locator(".status.cancelled").waitFor();
    },
  );
  await second.close();
  const mobile = await pageFor({ width: 390, height: 844 });
  await check(
    "Mobile guest search has no horizontal overflow and network errors allow retry",
    async () => {
      await mobile.page.route("**/api/availability?**", (route) =>
        route.abort("failed"),
      );
      await search(mobile.page);
      await mobile.page
        .getByRole("alert")
        .filter({ hasText: "Connection interrupted" })
        .waitFor();
      await mobile.page.unroute("**/api/availability?**");
      await search(mobile.page);
      await mobile.page
        .getByRole("button", { name: "Continue with this table" })
        .waitFor();
      assert.equal(
        await mobile.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await mobile.page.screenshot({
        path: screenshotDir + "/mobile-search.png",
        fullPage: true,
      });
      await mobile.page.setViewportSize({ width: 320, height: 740 });
      assert.equal(
        await mobile.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    },
  );
  await check(
    "Monday gives an actionable empty state and does not create a hold",
    async () => {
      const monday = new Date(day);
      monday.setUTCDate(monday.getUTCDate() - 1);
      await search(mobile.page, { date: monday.toISOString().slice(0, 10) });
      await mobile.page
        .getByRole("heading", { name: "No matching tables" })
        .waitFor();
      assert.equal(await mobile.page.locator(".table-picker").count(), 0);
    },
  );
  await check(
    "Expired hold restores to search and can be booked again",
    async () => {
      await hold(mobile.page);
      const token = await mobile.page.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem("lumina.guest.v1")).hold.hold_token,
      );
      fixture({ action: "expire", hold_token: token });
      await mobile.page.reload();
      await mobile.page
        .getByRole("alert")
        .filter({ hasText: "hold has ended" })
        .waitFor();
      await hold(mobile.page);
      await mobile.page
        .getByRole("button", { name: "Choose another table", exact: true })
        .click();
      await mobile.page
        .getByRole("button", { name: "Find a table", exact: true })
        .waitFor();
    },
  );
  await check(
    "Live countdown disables confirmation at server expiry",
    async () => {
      await hold(mobile.page);
      const token = await mobile.page.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem("lumina.guest.v1")).hold.hold_token,
      );
      fixture({ action: "shorten", hold_token: token });
      await mobile.page.reload();
      await mobile.page.getByLabel("Full name", { exact: true }).waitFor();
      await mobile.page
        .getByRole("alert")
        .filter({ hasText: "table hold has ended" })
        .waitFor();
      assert.equal(
        await mobile.page
          .getByRole("button", { name: "Confirm reservation", exact: true })
          .isDisabled(),
        true,
      );
      await mobile.page
        .getByRole("button", { name: "Search again", exact: true })
        .click();
      await mobile.page
        .getByRole("button", { name: "Find a table", exact: true })
        .waitFor();
    },
  );
  await check(
    "Joined option highlights every member and large-party confirmation remains pending",
    async () => {
      fixture({ action: "joined", date });
      await search(mobile.page, { party: "13", room: "group" });
      await mobile.page
        .getByRole("button", { name: "Continue with this table" })
        .waitFor();
      assert.equal(
        await mobile.page.locator(".floor-table.selected").count(),
        2,
      );
      await mobile.page
        .getByRole("button", { name: "Continue with this table" })
        .click();
      await fillGuest(mobile.page);
      await mobile.page
        .getByRole("button", { name: "Submit booking request", exact: true })
        .click();
      await mobile.page.locator(".status.pending").waitFor();
      assert.match(
        await mobile.page.locator(".confirmation-copy").textContent(),
        /manager must approve/,
      );
    },
  );
  await mobile.context.close();
  const invalid = await browser.newContext();
  const invalidPage = await invalid.newPage();
  await check(
    "Reference alone and invalid private tokens cannot reveal guest details",
    async () => {
      await invalidPage.goto(base + "/manage#code=" + bookingCode);
      await invalidPage.getByLabel("Private booking link").waitFor();
      assert.equal(await invalidPage.locator(".booking-code").count(), 0);
      await invalidPage
        .getByLabel("Private booking link")
        .fill(
          base + "/manage#code=" + bookingCode + "&token=" + "0".repeat(64),
        );
      await invalidPage
        .getByRole("button", { name: "Open my booking", exact: true })
        .click();
      await invalidPage
        .getByRole("alert")
        .filter({ hasText: "invalid or expired" })
        .waitFor();
      assert.equal(await invalidPage.locator(".booking-code").count(), 0);
    },
  );
  await invalid.close();
  assert.deepEqual(errors, []);
  console.log(`Browser tests: ${passed} passed; no JavaScript or CSP errors.`);
} finally {
  fixture({ action: "cleanup" });
  await context.close();
  await browser.close();
}
