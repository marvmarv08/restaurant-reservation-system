import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
if (process.env.BOOKING_TEST_MODE !== "isolated")
  throw new Error("Order HTTP tests require the isolated stack");
const base = "http://127.0.0.1:18080",
  password = "Isolated order HTTP passphrase 2026!";
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
async function req(c, path, { body, headers = {} } = {}) {
  const r = await fetch(base + path, {
    redirect: "manual",
    headers: {
      ...(c.cookie ? { Cookie: c.cookie } : {}),
      ...(body !== undefined
        ? { "Content-Type": "application/json", "X-CSRF-Token": c.csrf || "" }
        : {}),
      ...headers,
    },
    ...(body !== undefined
      ? {
          method: "POST",
          body: typeof body === "string" ? body : JSON.stringify(body),
        }
      : {}),
  });
  const cookie = r.headers
    .getSetCookie()
    .filter((s) => s.startsWith("TABLEBOOK_STAFF="))
    .at(-1);
  if (cookie) c.cookie = cookie.split(";")[0];
  let data;
  try {
    data = JSON.parse(await r.text());
  } catch {
    data = {};
  }
  return { status: r.status, data, headers: r.headers };
}
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log("PASS " + name);
}
async function ok(c, path, body) {
  const r = await req(c, path, body === undefined ? {} : { body });
  assert.equal(r.status, 200);
  return r.data;
}
async function denied(c, path, status, body, headers) {
  const r = await req(c, path, {
    ...(body === undefined ? {} : { body }),
    headers,
  });
  assert.equal(r.status, status);
  return r;
}
const invites = fixture("tests/staff-fixture.php", { action: "prepare" }),
  clients = {};
for (const role of Object.keys(invites)) {
  const c = {};
  c.csrf = (await ok(c, "/api/auth/me")).csrf_token;
  const token = new URLSearchParams(
    invites[role].activation_path.split("#")[1],
  ).get("token");
  await ok(c, "/api/auth/activate", {
    token,
    password,
    password_confirmation: password,
  });
  c.csrf = (await ok(c, "/api/auth/me")).csrf_token;
  clients[role] = c;
}
const f = fixture("tests/order-fixture.php", { action: "prepare" }),
  id = f.orders[0].id,
  date = f.date;
let order = (await ok(clients.admin, "/api/service/order?id=" + id)).order;
const body = (action, data = {}, key = randomUUID(), o = order) => ({
  id: Number(o.id),
  version: Number(o.version),
  action,
  request_key: key,
  data,
});
async function action(c, name, data = {}) {
  const r = await ok(c, "/api/service/orders/action", body(name, data));
  order = r.order;
  return r;
}
await check(
  "Anonymous and guest cookies cannot access service or kitchen data",
  async () => {
    for (const path of [
      "/api/service/orders",
      "/api/service/order?id=" + id,
      "/api/service/menu",
      "/api/kitchen/tickets",
    ])
      await denied({}, path, 401);
    for (const path of ["/server", "/kitchen"])
      assert.equal((await req({}, path)).status, 303);
  },
);
await check(
  "Kitchen/server/host boundaries protect reads and every mutation",
  async () => {
    await denied(clients.kitchen, "/api/service/menu", 403);
    await denied(clients.server, "/api/kitchen/tickets", 403);
    await denied(clients.host, "/api/service/orders", 403);
    await denied(
      clients.kitchen,
      "/api/service/orders/action",
      403,
      body("add", { menu_item_id: f.menu, qty: 1, course_no: 1 }),
    );
    await denied(
      clients.server,
      "/api/service/orders/action",
      403,
      body("start"),
    );
    await denied(clients.host, "/server", 403);
    await denied(clients.server, "/admin", 403);
  },
);
await check(
  "Order mutations require staff CSRF, JSON object, and supported content type",
  async () => {
    await denied(
      clients.admin,
      "/api/service/orders/action",
      403,
      body("claim"),
      { "X-CSRF-Token": "" },
    );
    await denied(clients.admin, "/api/service/orders/action", 415, "x", {
      "Content-Type": "text/plain",
    });
    await denied(clients.admin, "/api/service/orders/action", 400, "[]");
  },
);
await check(
  "Server claims an unassigned order and current ownership limits editing",
  async () => {
    await action(clients.server, "claim");
    assert.equal(
      (await ok(clients.server, "/api/service/orders?date=" + date)).orders
        .length,
      3,
    );
  },
);
await check(
  "Repeated add has one line and server totals ignore a submitted price",
  async () => {
    const b = body("add", {
      menu_item_id: f.menu,
      qty: 2,
      course_no: 1,
      notes: "No onion",
      unit_price_cents: 1,
    });
    const one = await ok(clients.server, "/api/service/orders/action", b);
    const two = await ok(clients.server, "/api/service/orders/action", b);
    order = two.order;
    assert.equal(two.replayed, true);
    assert.equal(order.items.length, 1);
    assert.notEqual(Number(order.items[0].unit_price_cents), 1);
    assert.equal(
      Number(order.total_cents),
      2 * Number(order.items[0].unit_price_cents),
    );
    await denied(clients.server, "/api/service/orders/action", 409, {
      ...b,
      data: { ...b.data, qty: 3 },
    });
  },
);
await check(
  "Stored notes remain literal text and fire persists actual allergy snapshots",
  async () => {
    await action(clients.server, "allergies", {
      allergy_notes: "Peanut allergy <img src=x onerror=alert(1)>",
    });
    await action(clients.server, "fire");
    assert.equal(order.ticket.status, "queued");
    assert.equal(
      order.ticket.allergy_snapshot,
      "Peanut allergy <img src=x onerror=alert(1)>",
    );
    const queue = await ok(
      clients.kitchen,
      "/api/kitchen/tickets?date=" + date,
    );
    assert.equal(queue.tickets.length, 1);
    assert.equal(queue.tickets[0].items[0].notes, "No onion");
    assert.equal(JSON.stringify(queue).includes("orders@lumina.test"), false);
  },
);
await check(
  "Stale ticket versions and edits after fire are denied without another ticket",
  async () => {
    await denied(clients.admin, "/api/service/orders/action", 409, {
      ...body("start"),
      version: 1,
    });
    await denied(
      clients.server,
      "/api/service/orders/action",
      409,
      body("add", { menu_item_id: f.menu, qty: 1, course_no: 2 }),
    );
  },
);
await check(
  "Kitchen hold/resume and per-item readiness persist original age",
  async () => {
    const fired = order.ticket.fired_at;
    await action(clients.kitchen, "hold", { reason: "Guest paused course" });
    await action(clients.kitchen, "resume", { reason: "Guest ready" });
    await action(clients.kitchen, "start");
    await action(clients.kitchen, "item_ready", {
      item_id: Number(order.items[0].id),
    });
    assert.equal(order.ticket.status, "preparing");
    assert.equal(order.items[0].status, "ready");
    assert.equal(order.ticket.fired_at, fired);
  },
);
await check(
  "Server delivery and kitchen recall use controlled transitions",
  async () => {
    await action(clients.kitchen, "ready");
    await denied(
      clients.kitchen,
      "/api/service/orders/action",
      403,
      body("serve"),
    );
    await action(clients.server, "serve");
    let queue = await ok(clients.kitchen, "/api/kitchen/tickets?date=" + date);
    assert.equal(queue.tickets.length, 0);
    assert.equal(queue.recall.length, 1);
    await action(clients.kitchen, "recall", { reason: "Correct dish" });
    assert.equal(order.ticket.status, "preparing");
  },
);
await check(
  "Host completion refuses food in progress and succeeds after unpaid service closure",
  async () => {
    const detail = (
      await ok(clients.admin, "/api/admin/reservation?code=" + f.orders[0].code)
    ).booking;
    await denied(clients.admin, "/api/admin/reservations/status", 409, {
      code: detail.code,
      version: Number(detail.version),
      action: "complete",
      reason: "Party finished",
    });
    await action(clients.kitchen, "ready");
    await action(clients.server, "serve");
    await action(clients.server, "close");
    assert.equal(order.status, "closed");
    await ok(clients.admin, "/api/admin/reservations/status", {
      code: detail.code,
      version: Number(detail.version),
      action: "complete",
      reason: "Party finished",
    });
    await denied(
      clients.kitchen,
      "/api/service/orders/action",
      409,
      body("recall", { reason: "Too late" }),
    );
  },
);
await check(
  "Another round stays assigned and void requires manager permission/reason",
  async () => {
    order = (await ok(clients.admin, "/api/service/order?id=" + f.orders[1].id))
      .order;
    await action(clients.server, "claim");
    await denied(
      clients.server,
      "/api/service/orders/action",
      403,
      body("void", { reason: "Mistake" }),
    );
    await denied(
      clients.manager,
      "/api/service/orders/action",
      422,
      body("void"),
    );
    await action(clients.manager, "void", { reason: "Manager correction" });
    const old = order.id;
    await action(clients.server, "round");
    assert.notEqual(order.id, old);
    assert.equal(order.status, "open");
  },
);
await check(
  "Deactivated server sessions cannot mutate even known orders",
  async () => {
    const staff = (await ok(clients.admin, "/api/admin/staff")).users;
    const server = staff.find((s) => s.email === "p5-http-server@lumina.test");
    await ok(clients.admin, "/api/admin/staff/change", {
      id: Number(server.id),
      role: "server",
      is_active: false,
    });
    await denied(
      clients.server,
      "/api/service/orders/action",
      401,
      body("add", { menu_item_id: f.menu, qty: 1, course_no: 1 }),
    );
  },
);
console.log(`Order HTTP scenarios: ${passed} passed.`);
