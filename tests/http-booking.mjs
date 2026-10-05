import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:18080';
if (process.env.BOOKING_TEST_MODE !== 'isolated') {
  throw new Error('HTTP tests require BOOKING_TEST_MODE=isolated and the dedicated stack on port 18080');
}
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
const day = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
day.setUTCDate(day.getUTCDate() + 14);
while (day.getUTCDay() !== 2) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
let passed = 0;

async function request(client, path, { method = 'GET', data, body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method, headers: {
      ...(client?.cookie ? { Cookie: client.cookie } : {}),
      ...(method === 'POST' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': client?.csrf ?? '' } : {}),
      ...headers,
    }, body: body ?? (data === undefined ? undefined : JSON.stringify(data)),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { response, json };
}

async function session() {
  const { response, json } = await request(null, '/api/session');
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(typeof json.csrf_token, 'string');
  return { cookie: cookie.split(';')[0], csrf: json.csrf_token };
}

async function check(name, action) {
  await action();
  passed++;
  console.log(`PASS ${name}`);
}

async function error(client, path, status, code, options = {}) {
  const { response, json } = await request(client, path, options);
  assert.equal(response.status, status);
  if (code) assert.equal(json?.error?.code, code);
  assert.equal(response.headers.get('cache-control'), 'no-store');
}

const a = await session();
const b = await session();
let option;
let token;
let bookingCode;
await check('Session cookies and CSRF tokens are scoped to each guest', async () => {
  assert.notEqual(a.cookie, b.cookie);
  assert.notEqual(a.csrf, b.csrf);
  await error(null, '/api/holds', 403, 'csrf_failed', { method: 'POST', data: {} });
  await error({ ...b, csrf: a.csrf }, '/api/holds', 403, 'csrf_failed', { method: 'POST', data: {} });
});
await check('Query input validates dates, party types, and room types', async () => {
  await error(a, '/api/availability', 422, 'invalid_request');
  await error(a, '/api/availability?date=2026-02-30&party_size=2', 422, 'invalid_date');
  await error(a, `/api/availability?date=${date}&party_size[]=2`, 422, 'invalid_request');
  await error(a, `/api/availability?date=${date}&party_size=2&room_type=missing`, 422, 'invalid_room_type');
});
await check('Mutation input rejects malformed JSON, arrays, and wrong content type', async () => {
  await error(a, '/api/holds', 400, 'invalid_request', { method: 'POST', body: '{' });
  await error(a, '/api/holds', 400, 'invalid_request', { method: 'POST', body: '[]' });
  await error(a, '/api/holds', 415, 'unsupported_content_type', {
    method: 'POST', body: 'x=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
});
await check('Availability offers a server-computed table and interval', async () => {
  const { response, json } = await request(a, `/api/availability?date=${date}&party_size=2&room_type=common`);
  assert.equal(response.status, 200);
  option = json.availability.slots.find(slot => slot.time === '17:30').options[0];
  assert.equal(option.kind, 'table');
  assert.equal(option.starts_at, date + ' 17:30:00');
  assert.equal(option.ends_at, date + ' 18:45:00');
});
await check('Hold creation persists the selected table and ten-minute expiry', async () => {
  const { response, json } = await request(a, '/api/holds', { method: 'POST', data: {
    date, time: '17:30', party_size: 2, room_type: 'common', option: { kind: option.kind, id: option.id },
  } });
  assert.equal(response.status, 201);
  assert.equal(json.hold.option.id, option.id);
  assert.equal(json.hold.party_size, 2);
  token = json.hold.hold_token;
  const expires = Date.parse(json.hold.expires_at.replace(' ', 'T') + '+08:00');
  assert.ok(expires - Date.now() > 590000 && expires - Date.now() <= 601000);
});
const guest = { full_name: 'HTTP Test Guest', phone: '+639000000003', email: 'http@lumina.test' };
await check('Another guest cannot confirm or release the hold', async () => {
  await error(b, '/api/reservations', 404, 'hold_not_found', { method: 'POST', data: { hold_token: token, guest } });
  await error(b, '/api/holds/release', 404, 'hold_not_found', { method: 'POST', data: { hold_token: token } });
});
await check('Invalid details leave the hold usable and the request receives a validation error', async () => {
  await error(a, '/api/reservations', 422, 'invalid_guest', { method: 'POST', data: {
    hold_token: token, guest: { full_name: [], phone: 'bad' },
  } });
});
await check('Confirmation uses held party and server status; replay returns the same persisted code', async () => {
  const payload = { hold_token: token, guest, status: 'completed', source: 'admin', party_size: 17 };
  const first = await request(a, '/api/reservations', { method: 'POST', data: payload });
  assert.equal(first.response.status, 201);
  assert.equal(first.json.booking.status, 'confirmed');
  assert.equal(first.json.booking.party_size, 2);
  assert.equal(first.json.booking.cancel_deadline, date + ' 15:30:00');
  bookingCode = first.json.booking.code;
  assert.match(bookingCode, /^LUM-[A-Z0-9]{6}$/);
  const replay = await request(a, '/api/reservations', { method: 'POST', data: payload });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.json.booking.code, bookingCode);
  assert.equal(replay.json.booking.created, false);
});
await check('Confirmed inventory is unavailable to another browser session', async () => {
  await error(b, '/api/holds', 409, 'unavailable', { method: 'POST', data: {
    date, time: '17:45', party_size: 2, room_type: 'common', option: { kind: option.kind, id: option.id },
  } });
});
await check('Release frees inventory and prevents confirmation of the released hold', async () => {
  const hold = await request(b, '/api/holds', { method: 'POST', data: { date, time: '20:30', party_size: 2, room_type: 'common' } });
  assert.equal(hold.response.status, 201);
  const releasedToken = hold.json.hold.hold_token;
  const released = await request(b, '/api/holds/release', { method: 'POST', data: { hold_token: releasedToken } });
  assert.equal(released.response.status, 200);
  assert.equal(released.json.hold.status, 'released');
  await error(b, '/api/reservations', 410, 'hold_expired', { method: 'POST', data: { hold_token: releasedToken, guest } });
});
await check('Mutation routes reject unsupported methods', async () => {
  const { response } = await request(a, '/api/holds');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});
console.log(`HTTP booking tests: ${passed} passed. A real booking remains in the isolated database for inspection.`);
