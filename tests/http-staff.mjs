import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
if (process.env.BOOKING_TEST_MODE !== "isolated")
  throw new Error("Staff HTTP tests require the isolated stack");
const base = "http://127.0.0.1:18080",
  password = "Isolated staff passphrase 2026!";
let passed = 0;
function fixture(data) {
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
async function request(
  client,
  path,
  { body, headers = {}, method = body === undefined ? "GET" : "POST" } = {},
) {
  const response = await fetch(base + path, {
    redirect: "manual",
    method,
    headers: {
      ...(client?.cookie ? { Cookie: client.cookie } : {}),
      ...(body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            "X-CSRF-Token": client?.csrf || "",
          }),
      ...headers,
    },
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  const cookies = response.headers.getSetCookie();
  const staffCookie = cookies
    .filter((value) => value.startsWith("TABLEBOOK_STAFF="))
    .at(-1);
  if (client && staffCookie) client.cookie = staffCookie.split(";")[0];
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  return { status: response.status, data, headers: response.headers };
}
async function session() {
  const client = {};
  const result = await request(client, "/api/auth/me");
  client.csrf = result.data.csrf_token;
  return client;
}
async function sync(client) {
  const r = await request(client, "/api/auth/me");
  client.csrf = r.data.csrf_token;
  return r;
}
async function check(name, work) {
  await work();
  passed++;
  console.log("PASS " + name);
}
async function denied(client, path, status, code, options) {
  const result = await request(client, path, options);
  assert.equal(result.status, status);
  if (code) assert.equal(result.data.error.code, code);
  assert.equal(result.data.booking, undefined);
  return result;
}
const invitations = fixture({ action: "prepare" }),
  clients = {};
const token = (role) =>
  new URLSearchParams(invitations[role].activation_path.split("#")[1]).get(
    "token",
  );
await check(
  "Anonymous admin routes deny data and page redirects to staff login",
  async () => {
    const anonymous = await session();
    await denied(
      anonymous,
      "/api/admin/dashboard",
      401,
      "staff_login_required",
    );
    const page = await request(anonymous, "/admin");
    assert.equal(page.status, 303);
    assert.equal(page.headers.get("location"), "/staff/login");
    const guest = await fetch(base + "/api/session");
    await denied(
      { cookie: guest.headers.get("set-cookie").split(";")[0] },
      "/api/admin/dashboard",
      401,
      "staff_login_required",
    );
  },
);
await check(
  "Pre-login CSRF, JSON object, and content type are mandatory",
  async () => {
    const client = await session();
    await denied(client, "/api/auth/login", 403, "csrf_failed", {
      body: { email: "p5-http-admin@lumina.test", password },
      headers: { "X-CSRF-Token": "" },
    });
    await denied(client, "/api/auth/login", 400, "invalid_request", {
      body: "[]",
    });
    await denied(client, "/api/auth/login", 415, "unsupported_content_type", {
      body: "email=x",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
);
await check(
  "Activation rotates the session, stores private tokens outside URLs, and is one-use",
  async () => {
    for (const role of Object.keys(invitations)) {
      const client = await session(),
        oldCookie = client.cookie,
        oldCsrf = client.csrf;
      const result = await request(client, "/api/auth/activate", {
        body: { token: token(role), password, password_confirmation: password },
      });
      assert.equal(result.status, 200);
      assert.ok(
        client.cookie !== oldCookie,
        "Activation rotates the session ID",
      );
      assert.equal(result.data.user.role, role);
      await sync(client);
      assert.ok(client.csrf !== oldCsrf, "Activation rotates the CSRF token");
      client.id = result.data.user.id;
      clients[role] = client;
      assert.match(result.headers.get("set-cookie"), /HttpOnly/);
      assert.match(result.headers.get("set-cookie"), /SameSite=Strict/);
    }
    await denied(
      clients.admin,
      "/api/auth/activate",
      404,
      "activation_invalid",
      {
        body: {
          token: token("admin"),
          password,
          password_confirmation: password,
        },
      },
    );
  },
);
await check("Permanent deletion requires admin, current version, JSON and CSRF", async () => {
  const ready = fixture({ action: "ready" });
  const path = "/api/admin/reservations/delete";
  const body = { code: ready.no_show, version: 1 };
  await denied(await session(), path, 401, "staff_login_required", { body });
  for (const role of ["manager", "host", "server", "kitchen"])
    await denied(clients[role], path, 403, "staff_forbidden", { body });
  await denied(clients.admin, path, 403, null, { body, headers: { "X-CSRF-Token": "wrong" } });
  await denied(clients.admin, path, 415, "unsupported_content_type", { body, headers: { "Content-Type": "text/plain" } });
  await denied(clients.admin, path, 409, "booking_changed", { body: { ...body, version: 2 } });
  assert.equal((await request(clients.admin, "/api/admin/reservation?code=" + body.code)).status, 200);
  const result = await request(clients.admin, path, { body });
  assert.equal(result.status, 200);
  assert.equal(result.data.deleted, true);
  await denied(clients.admin, "/api/admin/reservation?code=" + body.code, 404, "booking_not_found");
  await denied(clients.admin, path, 404, "booking_not_found", { body });
  assert.equal((await request(clients.admin, "/api/admin/reservation?code=" + ready.seat)).status, 200);
});
await check("Every protected read endpoint enforces the role map", async () => {
  const restricted = [
    "/api/admin/settings",
    "/api/admin/staff",
    "/api/admin/audit",
    "/api/admin/outbox",
  ];
  for (const path of restricted)
    await denied(clients.host, path, 403, "staff_forbidden");
  for (const role of ["server", "kitchen"])
    for (const path of ["/api/admin/dashboard", ...restricted])
      await denied(clients[role], path, 403, "staff_forbidden");
  await denied(clients.manager, "/api/admin/staff", 403, "staff_forbidden");
  assert.equal(
    (await request(clients.host, "/api/admin/dashboard")).status,
    200,
  );
  assert.equal(
    (await request(clients.manager, "/api/admin/audit")).status,
    200,
  );
});
const catalog = (await request(clients.admin, "/api/catalog")).data.catalog;
const dateDay = new Date(catalog.today + "T00:00:00Z");
dateDay.setUTCDate(dateDay.getUTCDate() + 35);
while (dateDay.getUTCDay() !== 2) dateDay.setUTCDate(dateDay.getUTCDate() + 1);
const date = dateDay.toISOString().slice(0, 10);
let booking, queued, settings;
await check(
  "Host creates one persisted phone booking; request retries and lookup remain owner-bound",
  async () => {
    const body = {
      date,
      time: "17:30",
      party_size: 2,
      room_type: "common",
      source: "phone",
      request_key: randomUUID(),
      guest: {
        full_name: "Staff HTTP Guest",
        phone: "+639000000007",
        email: "staff-http@lumina.test",
      },
    };
    const result = await request(clients.host, "/api/admin/reservations", {
      body,
    });
    assert.equal(result.status, 200);
    booking = result.data.booking;
    const replay = await request(clients.host, "/api/admin/reservations", {
      body,
    });
    assert.equal(replay.data.booking.code, booking.code);
    const saved = await request(
      clients.host,
      "/api/admin/request?" + new URLSearchParams({ key: body.request_key }),
    );
    assert.equal(saved.data.booking.code, booking.code);
    await denied(
      clients.manager,
      "/api/admin/request?" + new URLSearchParams({ key: body.request_key }),
      404,
      "request_not_found",
    );
    await denied(
      clients.host,
      "/api/admin/reservations",
      409,
      "request_changed",
      {
        body: { ...body, guest: { ...body.guest, full_name: "Changed guest" } },
      },
    );
  },
);
await check(
  "Role-denied mutations cannot be bypassed with forged actor fields or guest CSRF",
  async () => {
    settings = (await request(clients.admin, "/api/admin/settings")).data
      .configuration;
    await denied(clients.host, "/api/admin/settings", 403, "staff_forbidden", {
      body: {
        revision: settings.revision,
        kind: "settings",
        values: { hold_ttl_sec: 120 },
        role: "admin",
        actor_id: clients.admin.id,
      },
    });
    await denied(
      clients.manager,
      "/api/admin/settings",
      403,
      "staff_forbidden",
      {
        body: {
          revision: settings.revision,
          kind: "settings",
          values: { hold_ttl_sec: 120 },
        },
      },
    );
    await denied(
      clients.host,
      "/api/admin/staff/invite",
      403,
      "staff_forbidden",
      {
        body: {
          email: "forged@lumina.test",
          full_name: "Forged role",
          role: "admin",
        },
      },
    );
    await denied(
      clients.kitchen,
      "/api/admin/reservations/status",
      403,
      "staff_forbidden",
      {
        body: {
          code: booking.code,
          version: 1,
          action: "cancel",
          reason: "Forged actor",
        },
      },
    );
    await denied(
      clients.host,
      "/api/admin/reservations/status",
      403,
      "csrf_failed",
      {
        body: {
          code: booking.code,
          version: 1,
          action: "cancel",
          reason: "Wrong CSRF",
        },
        headers: { "X-CSRF-Token": clients.admin.csrf },
      },
    );
  },
);
await check(
  "Host cannot approve requests; manager approval and retained history persist",
  async () => {
    const result = await request(clients.host, "/api/admin/reservations", {
      body: {
        date,
        time: "17:30",
        party_size: 13,
        room_type: "group",
        source: "phone",
        request_key: randomUUID(),
        guest: { full_name: "Pending Group", phone: "+639000000008" },
      },
    });
    assert.equal(result.status, 200);
    const group = result.data.booking;
    assert.equal(group.status, "pending");
    await denied(
      clients.host,
      "/api/admin/reservations/status",
      403,
      "staff_forbidden",
      {
        body: {
          code: group.code,
          version: 1,
          action: "approve",
          reason: "Host tried approval",
        },
      },
    );
    const approved = await request(
      clients.manager,
      "/api/admin/reservations/status",
      {
        body: {
          code: group.code,
          version: 1,
          action: "approve",
          reason: "Manager reviewed request",
        },
      },
    );
    assert.equal(approved.data.booking.status, "confirmed");
    await denied(
      clients.manager,
      "/api/admin/reservations/status",
      409,
      "booking_changed",
      {
        body: {
          code: group.code,
          version: 1,
          action: "cancel",
          reason: "Stale tab",
        },
      },
    );
    const details = await request(
      clients.host,
      "/api/admin/reservation?code=" + group.code,
    );
    assert.equal(
      details.data.booking.history.at(-1).actor,
      "HTTP Staff manager",
    );
  },
);
await check(
  "Waitlist creates a real hold before notification; acceptance preserves the reference",
  async () => {
    const result = await request(clients.host, "/api/admin/waitlist", {
      body: {
        date,
        time: "20:30",
        party_size: 2,
        room_type: "terrace",
        source: "phone",
        request_key: randomUUID(),
        guest: { full_name: "Waiting HTTP Guest", phone: "+639000000009" },
      },
    });
    queued = result.data.booking;
    const offers = await request(clients.host, "/api/admin/waitlist/promote", {
      body: { date },
    });
    assert.ok(offers.data.offered.includes(queued.code));
    const detail = await request(
      clients.host,
      "/api/admin/reservation?code=" + queued.code,
    );
    assert.equal(detail.data.booking.waitlist_offer_state, "offered");
    assert.ok(detail.data.booking.waitlist_offer_expires_at);
    const accepted = await request(
      clients.host,
      "/api/admin/reservations/status",
      {
        body: {
          code: queued.code,
          version: Number(detail.data.booking.version),
          action: "accept_offer",
          reason: "Guest accepted by phone",
        },
      },
    );
    assert.equal(accepted.data.booking.code, queued.code);
    assert.equal(accepted.data.booking.status, "confirmed");
    const outbox = await request(clients.admin, "/api/admin/outbox");
    assert.ok(
      outbox.data.messages.some(
        (message) =>
          message.code === queued.code &&
          message.body.includes("tables held until"),
      ),
    );
  },
);
await check(
  "Settings validation, version conflict, and audit records work through HTTP",
  async () => {
    await denied(
      clients.admin,
      "/api/admin/settings",
      422,
      "invalid_settings",
      {
        body: {
          revision: settings.revision,
          kind: "settings",
          values: { hold_ttl_sec: 0 },
        },
      },
    );
    const saved = await request(clients.admin, "/api/admin/settings", {
      body: {
        revision: settings.revision,
        kind: "settings",
        values: { hold_ttl_sec: 120 },
      },
    });
    assert.equal(saved.data.configuration.settings.hold_ttl_sec, "120");
    await denied(
      clients.admin,
      "/api/admin/settings",
      409,
      "settings_changed",
      {
        body: {
          revision: settings.revision,
          kind: "settings",
          values: { hold_ttl_sec: 600 },
        },
      },
    );
    await request(clients.admin, "/api/admin/settings", {
      body: {
        revision: saved.data.configuration.revision,
        kind: "settings",
        values: { hold_ttl_sec: 600 },
      },
    });
    const history = await request(clients.manager, "/api/admin/audit");
    assert.ok(
      history.data.events.some(
        (event) =>
          event.action === "settings.settings" &&
          event.actor === "HTTP Staff admin",
      ),
    );
    assert.ok(
      history.data.events.every(
        (event) =>
          !JSON.stringify(event).includes(password) &&
          !JSON.stringify(event).includes(token("admin")),
      ),
    );
  },
);
await check(
  "Login throttling, old-cookie denial, and logout invalidate authenticated access",
  async () => {
    const before = { ...clients.host };
    await request(clients.host, "/api/auth/logout", { body: {} });
    await denied(before, "/api/admin/dashboard", 401, "staff_login_required");
    const client = await session();
    for (let i = 0; i < 5; i++)
      await denied(client, "/api/auth/login", 401, "login_failed", {
        body: { email: "p5-http-host@lumina.test", password: "wrong password" },
      });
    await denied(client, "/api/auth/login", 429, "rate_limited", {
      body: { email: "p5-http-host@lumina.test", password },
    });
    fixture({ action: "limits" });
    const old = client.cookie;
    assert.equal(
      (
        await request(client, "/api/auth/login", {
          body: { email: "p5-http-host@lumina.test", password },
        })
      ).status,
      200,
    );
    assert.ok(client.cookie !== old, "Login rotates the session ID");
    await sync(client);
    clients.host = client;
    await denied(
      { cookie: old },
      "/api/admin/dashboard",
      401,
      "staff_login_required",
    );
  },
);
await check(
  "Idle and absolute session expiry are enforced by the server",
  async () => {
    for (const mode of ["idle", "absolute"]) {
      const client = await session();
      await request(client, "/api/auth/login", {
        body: { email: "p5-http-host@lumina.test", password },
      });
      await sync(client);
      fixture({ action: "session", id: client.cookie.split("=")[1], mode });
      assert.equal((await sync(client)).data.user, null);
      await denied(client, "/api/admin/dashboard", 401, "staff_login_required");
    }
  },
);
await check(
  "Recent reauthentication and last-admin protection guard staff management",
  async () => {
    const directory = await request(clients.admin, "/api/admin/staff");
    const own = directory.data.users.find(
      (user) => user.email === "p5-http-admin@lumina.test",
    );
    await denied(clients.admin, "/api/admin/staff/change", 409, "last_admin", {
      body: { id: Number(own.id), role: "host", is_active: true },
    });
    fixture({
      action: "session",
      id: clients.admin.cookie.split("=")[1],
      mode: "recent",
    });
    await denied(
      clients.admin,
      "/api/admin/staff/invite",
      403,
      "reauth_required",
      {
        body: {
          full_name: "Recent Test",
          email: "recent@lumina.test",
          role: "host",
        },
      },
    );
  },
);
await check(
  "Deactivation revokes an already-open staff session and keeps account history",
  async () => {
    const admin = await session();
    await request(admin, "/api/auth/login", {
      body: { email: "p5-http-admin@lumina.test", password },
    });
    await sync(admin);
    const users = (await request(admin, "/api/admin/staff")).data.users;
    const kitchen = users.find(
      (user) => user.email === "p5-http-kitchen@lumina.test",
    );
    assert.equal(
      (
        await request(admin, "/api/admin/staff/change", {
          body: { id: Number(kitchen.id), role: "kitchen", is_active: false },
        })
      ).status,
      200,
    );
    assert.equal((await sync(clients.kitchen)).data.user, null);
    await denied(
      clients.kitchen,
      "/api/admin/dashboard",
      401,
      "staff_login_required",
    );
    assert.ok(
      (await request(admin, "/api/admin/audit")).data.events.some(
        (event) => event.action === "staff.change",
      ),
    );
  },
);
console.log(`Staff HTTP tests: ${passed} passed.`);
