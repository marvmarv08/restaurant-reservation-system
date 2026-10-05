import assert from "node:assert/strict";
if (process.env.BOOKING_TEST_MODE !== "isolated")
  throw new Error("Management HTTP tests require the isolated stack");
const base = "http://127.0.0.1:18080";
let passed = 0;
async function request(client, path, { body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(client ? { Cookie: client.cookie } : {}),
      ...(body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            "X-CSRF-Token": client?.csrf || "",
          }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    data: await response.text().then((text) => {
      try {
        return JSON.parse(text);
      } catch {
        return { message: text };
      }
    }),
    headers: response.headers,
  };
}
async function session() {
  const result = await request(null, "/api/session");
  return {
    cookie: result.headers.get("set-cookie").split(";")[0],
    csrf: result.data.csrf_token,
  };
}
async function check(name, action) {
  await action();
  passed++;
  console.log("PASS " + name);
}
async function expectError(client, path, status, code, options) {
  const result = await request(client, path, options);
  assert.equal(result.status, status);
  if (code) assert.equal(result.data.error.code, code);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.data.booking, undefined);
}
const parts = Object.fromEntries(
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
const day = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
day.setUTCDate(day.getUTCDate() + 21);
while (day.getUTCDay() !== 3) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
const a = await session(),
  b = await session();
const query = { date, party_size: 2, room_type: "common" };
const found = await request(
  a,
  "/api/availability?" + new URLSearchParams(query),
);
const slot = found.data.availability.slots.find(
  (slot) => slot.time === "17:30",
);
const option = slot.options[0];
const held = await request(a, "/api/holds", {
  body: {
    ...query,
    time: slot.time,
    option: { kind: option.kind, id: option.id },
  },
});
const holdToken = held.data.hold.hold_token;
const confirmationBody = {
  hold_token: holdToken,
  guest: {
    full_name: "Management HTTP Guest",
    phone: "+639000000005",
    email: "manage@lumina.test",
  },
};
const confirmed = await request(a, "/api/reservations", {
  body: confirmationBody,
});
const booking = confirmed.data.booking;
const secret = new URLSearchParams(booking.manage_path.split("#")[1]).get(
  "token",
);
const headers = { "X-Booking-Token": secret };
await check(
  "Confirmation and owned hold inspection reproduce one stable private link",
  async () => {
    assert.equal(confirmed.status, 201);
    assert.match(secret, /^[a-f0-9]{64}$/);
    const replay = await request(a, "/api/reservations", {
      body: confirmationBody,
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.data.booking.manage_path, booking.manage_path);
    const inspected = await request(a, "/api/holds", {
      headers: { "X-Hold-Token": holdToken },
    });
    assert.equal(inspected.data.hold.booking.manage_path, booking.manage_path);
    await expectError(b, "/api/holds", 404, "hold_not_found", {
      headers: { "X-Hold-Token": holdToken },
    });
  },
);
await check(
  "Public reference and invalid private token do not expose booking details",
  async () => {
    await expectError(
      b,
      "/api/manage?code=" + booking.code,
      404,
      "manage_link_invalid",
    );
    await expectError(
      b,
      "/api/manage?code=" + booking.code,
      404,
      "manage_link_invalid",
      { headers: { "X-Booking-Token": "0".repeat(64) } },
    );
    await expectError(
      b,
      "/api/manage?code=LUM-XXXXXX",
      404,
      "manage_link_invalid",
      { headers },
    );
  },
);
let version;
await check(
  "Valid private link opens from another session with no-store and security headers",
  async () => {
    const read = await request(b, "/api/manage?code=" + booking.code, {
      headers,
    });
    assert.equal(read.status, 200);
    version = read.data.booking.version;
    assert.equal(read.data.booking.guest.email, "manage@lumina.test");
    assert.equal(read.headers.get("cache-control"), "no-store");
    assert.equal(read.headers.get("referrer-policy"), "no-referrer");
    assert.ok(
      read.headers.get("content-security-policy").includes("script-src 'self'"),
    );
  },
);
await check(
  "Management POST requires this browser’s CSRF token and a valid capability",
  async () => {
    const body = { code: booking.code, version };
    await expectError(b, "/api/manage/cancel", 403, "csrf_failed", {
      headers: { ...headers, "X-CSRF-Token": "" },
      body,
    });
    await expectError(
      { ...b, csrf: a.csrf },
      "/api/manage/cancel",
      403,
      "csrf_failed",
      { headers, body },
    );
    await expectError(b, "/api/manage/cancel", 404, "manage_link_invalid", {
      body,
    });
    await expectError(b, "/api/manage/cancel", 405, null, { headers });
  },
);
await check(
  "Replacement search excludes only the authorized booking and rejects forged exclusions",
  async () => {
    const own = await request(
      b,
      "/api/manage/availability?" +
        new URLSearchParams({ ...query, code: booking.code }),
      { headers },
    );
    assert.equal(own.status, 200);
    assert.ok(
      own.data.availability.slots
        .find((s) => s.time === "17:30")
        .options.some((o) => o.id === option.id),
    );
    const publicSearch = await request(
      b,
      "/api/availability?" +
        new URLSearchParams({
          ...query,
          exclude_reservation: 1,
          code: booking.code,
        }),
    );
    assert.ok(
      !publicSearch.data.availability.slots
        .find((s) => s.time === "17:30")
        ?.options.some((o) => o.id === option.id),
    );
  },
);
await check(
  "HTTP modification validates the replacement and leaves original intact on failure",
  async () => {
    await expectError(b, "/api/manage/modify", 409, "unavailable", {
      headers,
      body: {
        ...query,
        code: booking.code,
        version,
        time: "17:30",
        option: { kind: "table", id: 99999 },
      },
    });
    const before = await request(b, "/api/manage?code=" + booking.code, {
      headers,
    });
    assert.equal(before.data.booking.version, version);
    assert.equal(before.data.booking.starts_at, booking.starts_at);
    const modified = await request(b, "/api/manage/modify", {
      headers,
      body: {
        ...query,
        code: booking.code,
        version,
        time: "19:00",
        option: { kind: option.kind, id: option.id },
        special_requests: "Updated request",
      },
    });
    assert.equal(modified.status, 200);
    assert.equal(modified.data.booking.code, booking.code);
    assert.equal(modified.data.booking.version, version + 1);
    version++;
  },
);
await check(
  "HTTP cancellation rejects stale versions and is idempotent after success",
  async () => {
    await expectError(b, "/api/manage/cancel", 409, "booking_changed", {
      headers,
      body: { code: booking.code, version: version - 1 },
    });
    const cancelled = await request(b, "/api/manage/cancel", {
      headers,
      body: { code: booking.code, version },
    });
    assert.equal(cancelled.data.booking.status, "cancelled");
    const repeat = await request(b, "/api/manage/cancel", {
      headers,
      body: { code: booking.code, version },
    });
    assert.equal(repeat.data.booking.version, cancelled.data.booking.version);
  },
);
console.log(`Management HTTP tests: ${passed} passed.`);
