import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Use only the dedicated hosted verification containers.');
const a='http://127.0.0.1:18480', b='http://127.0.0.1:18481';
let count=0;
async function check(name, fn){await fn();count++;console.log('PASS '+name);}
async function request(base,path,client={},body,extra={}){
  const response=await fetch(base+path,{redirect:'manual',method:body===undefined?'GET':'POST',headers:{...(client.cookie?{Cookie:client.cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':client.csrf||''}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const cookies=response.headers.getSetCookie();
  const cookie=cookies.filter(s=>s.startsWith('TABLEBOOK_'+(client.kind==='staff'?'STAFF':'GUEST')+'=')).at(-1);
  if(cookie)client.cookie=cookie.split(';')[0];
  const text=await response.text();const data=text.startsWith('{')?JSON.parse(text):{};
  if(data.csrf_token)client.csrf=data.csrf_token;
  return {status:response.status,data,text,cookies};
}
const guest={},staff={kind:'staff'},other={kind:'staff'};
await check('Actual hosted container serves page, assets, real menu and encrypted database health',async()=>{
  assert.equal((await request(a,'/health')).data.db,true);
  assert.match((await request(a,'/')).text,/food-showcase/);
  assert.equal((await request(b,'/api/catalog')).data.catalog.menu.length,36);
  assert.equal((await request(a,'/assets/images/menu/adobo.jpg')).status,200);
});
await check('Hosted guest cookies are Secure and HttpOnly with Lax SameSite',async()=>{
  const res=await request(a,'/api/session',guest);
  assert.equal(res.status,200);assert.match(res.cookies.at(-1),/secure/i);assert.match(res.cookies.at(-1),/httponly/i);assert.match(res.cookies.at(-1),/samesite=lax/i);
});
await check('Guest CSRF and identity persist on a second hosted instance',async()=>{
  const csrf=guest.csrf;assert.equal((await request(b,'/api/session',guest)).data.csrf_token,csrf);
});
const fixtureCode=`require 'src/autoload.php'; $pdo=App\\Core\\Database::connect(require 'config/database.php'); $clock=new App\\Service\\BookingClock($pdo); $inv=(new App\\Service\\StaffAuthService($pdo,$clock))->issue('hosted-${randomUUID()}@lumina.test','Hosted HTTP Staff','admin'); $inv['date']=$clock->now()->modify('+14 days')->modify('next tuesday')->format('Y-m-d'); echo json_encode($inv);`;
const fixture=JSON.parse(execFileSync('docker',['exec','lumina-hosted-app-a','php','-r',fixtureCode],{stdio:['ignore','pipe','pipe']}).toString());
await check('Real guest hold created on one instance is owned on another',async()=>{
  const found=await request(a,`/api/availability?date=${fixture.date}&party_size=2&room_type=common`,guest);
  const slot=found.data.availability.slots[0];assert.ok(slot);
  const option=slot.options[0];
  const hold=await request(a,'/api/holds',guest,{date:fixture.date,time:slot.time,party_size:2,room_type:'common',option:{kind:option.kind,id:option.id}});
  assert.equal(hold.status,201);
  guest.hold=hold.data.hold;
  const inspect=await request(b,'/api/holds',guest,undefined,{'X-Hold-Token':guest.hold.hold_token});
  assert.equal(inspect.status,200);
  assert.equal(inspect.data.hold.status,'active');
  assert.equal(inspect.data.hold.hold_token,guest.hold.hold_token);
});
await check('Reservation confirms across instances and replay returns the persisted booking',async()=>{
  const payload={hold_token:guest.hold.hold_token,guest:{full_name:'Hosted HTTP Guest',phone:'+639000000777',email:'hosted-http@lumina.test'}};
  const confirmed=await request(b,'/api/reservations',guest,payload);assert.equal(confirmed.status,201);
  const replay=await request(a,'/api/reservations',guest,payload);assert.equal(replay.status,200);assert.equal(replay.data.booking.code,confirmed.data.booking.code);
});
await check('Private staff activation uses the real API and cross-instance session store',async()=>{
  const res=await request(a,'/api/auth/me',staff);assert.match(res.cookies.at(-1),/secure/i);assert.match(res.cookies.at(-1),/samesite=strict/i);
  const token=new URLSearchParams(fixture.activation_path.split('#')[1]).get('token');
  const password='Hosted HTTP verification passphrase 2026!';
  const activated=await request(b,'/api/auth/activate',staff,{token,password,password_confirmation:password});assert.equal(activated.status,200);assert.equal(activated.data.user.role,'admin');
  const me=await request(a,'/api/auth/me',staff);assert.equal(me.data.user.role,'admin');
});
await check('Authenticated host, server and kitchen APIs persist across container instances',async()=>{
  for(const path of ['/api/admin/dashboard','/api/service/orders','/api/kitchen/tickets'])assert.equal((await request(b,path,staff)).status,200);
});
await check('Unrelated staff session remains unauthorized and wrong CSRF cannot log out another session',async()=>{
  await request(a,'/api/auth/me',other);
  assert.equal((await request(b,'/api/admin/dashboard',other)).status,401);
  assert.equal((await request(b,'/api/auth/logout',staff,{}, {'X-CSRF-Token':other.csrf})).status,403);
  assert.equal((await request(a,'/api/admin/dashboard',staff)).status,200);
});
await check('Sessions survive losing the entire first container',async()=>{
  execFileSync('docker',['restart','lumina-hosted-app-a'],{stdio:'ignore'});
  assert.equal((await request(b,'/api/auth/me',staff)).data.user.role,'admin');
  const csrf=guest.csrf;assert.equal((await request(b,'/api/session',guest)).data.csrf_token,csrf);
});
await check('Logout on a second instance revokes access through the original cookie',async()=>{
  const old={...staff};assert.equal((await request(b,'/api/auth/logout',staff,{})).status,200);
  assert.equal((await request(a,'/api/admin/dashboard',old)).status,401);
});
console.log(`Hosted HTTP: ${count} real cross-container checks passed.`);
