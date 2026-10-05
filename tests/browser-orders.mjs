import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
if (process.env.BOOKING_TEST_MODE !== "isolated")
  throw new Error("Order browser tests require the isolated stack");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
    : "playwright"
);
const base = "http://127.0.0.1:18080",
  password = "Isolated browser order passphrase 2026!",
  artifacts = "/tmp/restaurant-phase4-browser/order-screenshots";
await mkdir(artifacts, { recursive: true });
function fixture(file, data) {
  const args = [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "-u",
      "www-data",
      "app",
      "php",
      file,
    ],
    via = process.env.BROWSER_DOCKER_VIA_WSL === "1";
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
const invites = fixture("tests/staff-fixture.php", { action: "prepare" }),
  f = fixture("tests/order-fixture.php", { action: "prepare" }),
  browser = await chromium.launch({ headless: true }),
  errors = [];
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log("PASS " + name);
}
async function pageFor(role, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto(base + invites[role].activation_path);
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Activate account", exact: true })
    .click();
  await page.waitForURL(
    base +
      (role === "server"
        ? "/server"
        : role === "kitchen"
          ? "/kitchen"
          : "/admin"),
  );
  return { page, context };
}
const server = await pageFor("server"),
  kitchen = await pageFor("kitchen"),
  admin = await pageFor("admin");
const sp = server.page,
  kp = kitchen.page;
async function openOrder(id = f.orders[0].id) {
  await sp
    .getByRole("button", { name: "Open order #" + id, exact: true })
    .click();
  await sp
    .getByRole("heading", { name: "Order #" + id, exact: true })
    .waitFor();
}
async function closeOrder() {
  if (await sp.getByRole("dialog").isVisible())
    await sp.getByRole("button", { name: "Close", exact: true }).click();
}
async function refresh(page) {
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
}
async function action(page, label) {
  await page.getByRole("button", { name: label, exact: true }).click();
}
async function reason(page, label, text) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByLabel("Reason", { exact: true }).fill(text);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: label, exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}
try {
  await check(
    "Server/kitchen activation opens dedicated workspaces and host data stays forbidden",
    async () => {
      await sp
        .getByRole("heading", { name: "Food orders.", exact: true })
        .waitFor();
      await kp
        .getByRole("heading", { name: "The kitchen pass.", exact: true })
        .waitFor();
      assert.equal(
        await sp
          .getByRole("link", { name: "Host dashboard", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await kp
          .getByRole("link", { name: "Food orders", exact: true })
          .count(),
        0,
      );
      const r = await server.context.request.get(base + "/api/admin/dashboard");
      assert.equal(r.status(), 403);
      await admin.page
        .getByRole("link", { name: "Food orders ↗", exact: true })
        .waitFor();
    },
  );
  await check(
    "Actual server claim, menu quantity/price and preparation notes survive refresh",
    async () => {
      await openOrder();
      await action(sp, "Claim order");
      await sp.getByLabel("Dish", { exact: true }).selectOption(String(f.menu));
      await sp.getByLabel("Quantity", { exact: true }).fill("2");
      await sp
        .getByLabel("Preparation notes", { exact: true })
        .fill("No onion");
      await action(sp, "Add dish");
      await sp.getByText("No onion", { exact: true }).waitFor();
      await closeOrder();
      await sp.reload();
      await openOrder();
      await sp.getByText("No onion", { exact: true }).waitFor();
    },
  );
  await check(
    "Interrupted add response retries one request without duplicating the dish",
    async () => {
      let intercepted = false;
      await sp.route("**/api/service/orders/action", async (route) => {
        const body = route.request().postDataJSON();
        if (!intercepted && body.action === "add") {
          intercepted = true;
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      });
      await sp.getByLabel("Dish", { exact: true }).selectOption(String(f.menu));
      await sp
        .getByLabel("Preparation notes", { exact: true })
        .fill("Second course");
      await action(sp, "Add dish");
      await action(sp, "Retry same request");
      await sp.getByText("Second course", { exact: true }).waitFor();
      const r = await server.context.request.get(
        base + "/api/service/order?id=" + f.orders[0].id,
      );
      assert.equal((await r.json()).order.items.length, 2);
      await sp.unroute("**/api/service/orders/action");
    },
  );
  await check(
    "Allergy snapshot reaches kitchen without interpreting stored HTML",
    async () => {
      await sp
        .getByLabel("Confirmed allergy / dietary instructions", { exact: true })
        .fill("Peanut allergy <img src=x onerror=alert(1)>");
      await action(sp, "Save allergy notes");
      await action(sp, "Send to kitchen");
      await refresh(kp);
      await kp
        .getByText("Peanut allergy <img src=x onerror=alert(1)>", {
          exact: false,
        })
        .waitFor();
      assert.equal(await kp.locator(".ticket-allergy img").count(), 0);
      assert.equal(
        await sp.getByRole("button", { name: "Add dish", exact: true }).count(),
        0,
      );
      await closeOrder();
      await sp.reload();
      await openOrder();
      await sp.getByText("Kitchen ticket · queued", { exact: true }).waitFor();
    },
  );
  await check(
    "Ticket timer uses server age and station filter retains the whole ticket",
    async () => {
      fixture("tests/order-fixture.php", { action: "age", id: f.orders[0].id });
      await refresh(kp);
      await kp.locator(".ticket.age-critical").waitFor();
      await kp.getByText("CRITICAL", { exact: true }).waitFor();
      const r = await kitchen.context.request.get(
        base + "/api/kitchen/tickets?date=" + f.date,
      );
      const data = await r.json();
      const station = data.tickets[0].items[0].station_snapshot;
      await kp.getByLabel("Station", { exact: true }).selectOption(station);
      await refresh(kp);
      assert.equal(await kp.locator(".ticket-lines li").count(), 2);
      await kp.getByLabel("Station", { exact: true }).selectOption("all");
      await refresh(kp);
    },
  );
  await check(
    "Explicit hold/resume and item-ready actions persist in separate browsers",
    async () => {
      await reason(kp, "Hold ticket", "Guest paused service");
      await kp.getByText("held", { exact: true }).waitFor();
      await reason(kp, "Resume ticket", "Guest ready");
      await action(kp, "Start preparation");
      await kp
        .getByRole("button", { name: "Item ready", exact: true })
        .first()
        .click();
      await kp
        .getByRole("button", { name: "Needs preparation", exact: true })
        .waitFor();
      await kp.screenshot({
        path: artifacts + "/kitchen-desktop.png",
        fullPage: true,
      });
      await action(kp, "Mark entire ticket ready");
      await closeOrder();
      await refresh(sp);
      await openOrder();
      await sp
        .getByRole("button", { name: "Mark served", exact: true })
        .waitFor();
    },
  );
  await check(
    "Server delivery removes ticket and kitchen recall restores original age",
    async () => {
      await action(sp, "Mark served");
      await refresh(kp);
      await kp
        .getByRole("button", { name: /^Recall #T-/, exact: false })
        .waitFor();
      const recall = await kp
        .getByRole("button", { name: /^Recall #T-/ })
        .textContent();
      await kp.getByRole("button", { name: recall, exact: true }).click();
      await kp.getByLabel("Reason", { exact: true }).fill("Dish correction");
      await kp
        .getByRole("dialog")
        .getByRole("button", { name: "Recall ticket", exact: true })
        .click();
      await kp.getByRole("dialog").waitFor({ state: "hidden" });
      await kp.getByText("preparing", { exact: true }).waitFor();
      await kp.getByText("CRITICAL", { exact: true }).waitFor();
    },
  );
  await check(
    "Service closes without paid status and a new round stays assigned",
    async () => {
      await action(kp, "Mark entire ticket ready");
      await closeOrder();
      await refresh(sp);
      await openOrder();
      await action(sp, "Mark served");
      await action(sp, "Close service");
      await sp
        .getByRole("dialog")
        .getByText("closed", { exact: true })
        .waitFor();
      await action(sp, "Start another round");
      await sp.getByLabel("Dish", { exact: true }).waitFor();
      const r = await server.context.request.get(
        base + "/api/service/orders?date=" + f.date,
      );
      const data = await r.json();
      assert.equal(
        data.orders.some((o) => o.status === "paid"),
        false,
      );
      assert.equal(
        data.orders.filter((o) => o.code === f.orders[0].code).length,
        2,
      );
    },
  );
  await check(
    "Server and kitchen layouts fit mobile and 320px without page overflow",
    async () => {
      await sp.setViewportSize({ width: 390, height: 844 });
      await sp.screenshot({
        path: artifacts + "/server-mobile-order.png",
        fullPage: true,
      });
      for (const page of [sp, kp])
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
        }
      await kp.screenshot({
        path: artifacts + "/kitchen-mobile.png",
        fullPage: true,
      });
      await closeOrder();
    },
  );
  await check(
    "Sign-out clears protected workspace and invalidates the staff session",
    async () => {
      await action(sp, "Sign out");
      await sp.waitForURL(base + "/staff/login");
      const r = await server.context.request.get(base + "/api/service/orders");
      assert.equal(r.status(), 401);
    },
  );
  assert.deepEqual(errors, []);
  console.log(
    `Order browser scenarios: ${passed} passed; no JavaScript/CSP errors.`,
  );
} catch (error) {
  await sp.screenshot({
    path: artifacts + "/failure-server.png",
    fullPage: true,
  });
  console.log(
    "Visible order feedback: " +
      (await sp.locator("#service-dialog-feedback").textContent()),
  );
  throw error;
} finally {
  await browser.close();
}
