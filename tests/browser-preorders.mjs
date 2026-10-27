import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Isolated B4 origin only');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default:AxeBuilder}=await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base='http://127.0.0.1:18080',artifacts='/tmp/bella-vista-b4';await mkdir(artifacts,{recursive:true});
const fixture=data=>JSON.parse(execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php','tests/preorder-fixture.php'],{input:JSON.stringify(data),encoding:'utf8'}));
const data=fixture({action:'prepare'}),browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));let checks=0;
const check=async(name,fn)=>{await fn();console.log('PASS '+name);checks++;};
async function search(party='2',room='bv_standard'){
 await page.getByLabel('Date · Manila time').fill(data.date);await page.getByLabel('Guests',{exact:true}).selectOption(party);await page.getByLabel('Room preference').selectOption(room);
 await page.getByRole('button',{name:'Find a table',exact:true}).click();await page.locator('[data-time="10:00"]').click();await page.getByRole('button',{name:'Continue with this table',exact:true}).click();await page.getByRole('button',{name:'Add dish',exact:true}).waitFor();
}
async function guest(){await page.getByLabel('Full name',{exact:true}).fill('B4 Browser Guest');await page.getByLabel('Phone number',{exact:true}).fill('+639000000001');await page.getByLabel('Email',{exact:true}).fill('b4-browser@lumina.test');}
const confirm=()=>page.locator('#confirm-booking');
let other;
try{
 await page.goto(base);await page.getByLabel('Date · Manila time').waitFor();await search();await guest();
 await page.getByLabel('Food item',{exact:true}).selectOption(String(data.menu[0].id));await page.getByLabel('Quantity to add',{exact:true}).fill(String(data.menu[0].qty));await page.getByRole('button',{name:'Add dish',exact:true}).click();
 await check('Cart supports real assigned category choices and live food subtotal',async()=>{
  assert.equal(await page.locator('.preorder-add optgroup').count(),3);assert.equal(await page.locator('.preorder-line').count(),1);assert.match(await page.locator('.preorder-subtotal').innerText(),/₱/);
 });
 const itemName=await page.locator('.preorder-line input').getAttribute('aria-label');
 await page.locator('.preorder-line input').fill('1');await page.locator('.preorder-line input').press('Tab');
 await check('Quantity editing updates cart without sending food to kitchen',async()=>assert.equal(fixture({action:'verify'}).tickets,0));
 await page.getByRole('button',{name:/^Remove /}).click();await check('Remove clears the line and resets food subtotal',async()=>{assert.equal(await page.locator('.preorder-line').count(),0);assert.match(await page.locator('.preorder-subtotal').innerText(),/₱0.00/);});
 await page.getByLabel('Quantity to add',{exact:true}).fill('1');await page.getByRole('button',{name:'Add dish',exact:true}).click();await confirm().click();await page.locator('.preorder-quote h3').waitFor();
 await check('Standard may review a below-minimum cart with a clear seating warning',async()=>assert.match(await page.locator('.preorder-quote').innerText(),/Below the ₱1,000 Standard seating minimum/));
 await page.reload();await page.locator('.preorder-quote h3').waitFor();await guest();
 await check('Held cart and review survive reload with fresh explicit acceptance required',async()=>{assert.equal(await page.locator('.preorder-line input').inputValue(),'1');assert.equal(await page.getByLabel('I reviewed and accept this food quote, fees and food policy.').isChecked(),false);});
 await page.locator('.preorder-line input').fill(String(data.menu[0].qty));await page.locator('.preorder-line input').press('Tab');await confirm().click();await page.locator('.preorder-quote h3').waitFor();
 await check('First submit reviews authoritative fees and leaves reservation uncreated',async()=>{
  assert.equal(fixture({action:'verify'}).bookings,0);assert.match(await page.locator('.preorder-quote').innerText(),/Received \/ food credit now.*₱0.00 \/ ₱0.00/s);assert.equal(await confirm().innerText(),'Confirm reservation');
 });
 await confirm().click();await check('Confirmation requires explicit quote/policy acceptance',async()=>assert.equal(fixture({action:'verify'}).bookings,0));
 for(const width of [1366,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('.preorder-quote').scrollIntoViewIfNeeded();await page.screenshot({path:artifacts+'/quote-'+width+'.png'});
  await check(width+'px cart/review remains usable without horizontal page overflow',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)));
  if(width===320){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();await check('320px cart and quote accessibility',async()=>assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]));}
 }
 await page.setViewportSize({width:1366,height:1000});
 await page.getByLabel('I reviewed and accept this food quote, fees and food policy.').check();
 // Commit the real request but deliberately lose its response and the recovery read.
 let committed=false,finishCommit;const committedResponse=new Promise(r=>finishCommit=r);
 await page.route('**/api/reservations',async route=>{const response=await route.fetch();assert.equal(response.status(),201);committed=true;await route.abort('failed');finishCommit();});
 await page.route('**/api/holds',route=>route.request().method()==='GET'?route.abort('failed'):route.continue());
 await confirm().click();await committedResponse;await page.getByRole('button',{name:'Retry confirmation',exact:true}).waitFor();
 await check('Committed lost response retains exact pending body without duplicate booking',async()=>{assert.ok(committed);assert.equal(fixture({action:'verify'}).bookings,1);});
 await page.unroute('**/api/reservations');
 await page.evaluate(()=>{const s=JSON.parse(sessionStorage.getItem('lumina.guest.v1'));s.hold.expires_at_epoch=s.hold.server_time_epoch-1;sessionStorage.setItem('lumina.guest.v1',JSON.stringify(s));});
 await page.reload();await page.getByRole('button',{name:'Retry confirmation',exact:true}).waitFor();
 await check('Expired client hold keeps ambiguous confirmation retry enabled',async()=>assert.equal(await confirm().isEnabled(),true));
 await confirm().click();await page.locator('.booking-code').waitFor();await page.unroute('**/api/holds');
 const code=(await page.locator('.booking-code').innerText()).trim();
 const path=await page.locator('a.button[href^="/manage"]').getAttribute('href');
 await check('Reload recovers committed booking, private link and saved scheduled food',async()=>{assert.match(await page.locator('.preorder-summary').innerText(),/Scheduled/);assert.equal(fixture({action:'verify'}).orders,0);assert.equal(fixture({action:'verify'}).bookings,1);});
 other=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});const privatePage=await other.newPage();privatePage.on('pageerror',e=>errors.push(e.message));await privatePage.goto(base+path);await privatePage.locator('.preorder-summary').waitFor();
 await check('Second browser retrieves the saved food through its private capability',async()=>assert.match(await privatePage.locator('.preorder-summary').innerText(),/Your food pre-order/));
 await privatePage.getByRole('button',{name:'Edit food pre-order',exact:true}).click();await privatePage.locator('.preorder-line input').fill(String(data.menu[0].qty+1));await privatePage.locator('.preorder-line input').press('Tab');await privatePage.getByRole('button',{name:'Review updated food and fees',exact:true}).click();await privatePage.getByLabel('I reviewed and accept this food quote, fees and food policy.').check();await privatePage.getByRole('button',{name:'Save food pre-order',exact:true}).click();await privatePage.getByText('Food pre-order saved. It remains scheduled until arrival.',{exact:true}).waitFor();await privatePage.reload();await privatePage.locator('.preorder-summary').waitFor();
 await privatePage.locator('.preorder-summary summary').click();
 await check('Private quantity edit persists while preserving original acceptance',async()=>assert.match(await privatePage.locator('.preorder-summary').innerText(),/1 saved food change/));
 // A pending save for one booking must survive work on another private booking.
 await privatePage.getByRole('button',{name:'Edit food pre-order',exact:true}).click();
 await privatePage.locator('.preorder-line input').fill(String(data.menu[0].qty+2));await privatePage.locator('.preorder-line input').press('Tab');
 await privatePage.getByRole('button',{name:'Review updated food and fees',exact:true}).click();await privatePage.getByLabel('I reviewed and accept this food quote, fees and food policy.').check();
 let savedResolve;const savedResponse=new Promise(r=>savedResolve=r);
 await privatePage.route('**/api/manage/preorders/save',async route=>{const r=await route.fetch();assert.equal(r.status(),200);await route.abort('failed');savedResolve();});
 await privatePage.getByRole('button',{name:'Save food pre-order',exact:true}).click();await privatePage.getByRole('button',{name:'Retry saving food',exact:true}).waitFor();await savedResponse;await privatePage.unroute('**/api/manage/preorders/save');
 const otherSession=(await(await other.request.get(base+'/api/session')).json()).csrf_token;
 const post=async(url,body)=>(await(await other.request.post(base+url,{headers:{'X-CSRF-Token':otherSession},data:body})).json());
 const secondHold=(await post('/api/holds',{date:data.date,time:'13:00',party_size:5,room_type:'bv_family'})).hold;
 const secondQuote=(await post('/api/preorders/quote',{hold_token:secondHold.hold_token,cart:[]})).quote;
 const secondBooking=(await post('/api/reservations',{hold_token:secondHold.hold_token,guest:{full_name:'Second B4 Guest',phone:'+639000000002'},preorder:{cart:[],quote_token:secondQuote.quote_token,accepted:true}})).booking;
 await privatePage.goto(base+secondBooking.manage_path);await privatePage.locator('.booking-code').filter({hasText:secondBooking.code}).waitFor();await privatePage.getByRole('button',{name:'Edit food pre-order',exact:true}).click();
 await privatePage.getByRole('button',{name:'Review updated food and fees',exact:true}).click();await privatePage.getByLabel('I reviewed and accept this food quote, fees and food policy.').check();
 await privatePage.getByRole('button',{name:'Save food pre-order',exact:true}).click();await privatePage.getByText('Food pre-order saved. It remains scheduled until arrival.',{exact:true}).waitFor();
 await check('Saving a second private booking preserves the first unresolved food save',async()=>assert.equal(await privatePage.evaluate(c=>Boolean(JSON.parse(sessionStorage.getItem('lumina.guest.v1')).pendingFoodEdits[c]),code),true));
 await privatePage.goto(base+path);await privatePage.locator('.booking-code').filter({hasText:code}).waitFor();await privatePage.getByRole('button',{name:'Edit food pre-order',exact:true}).click();await privatePage.getByRole('button',{name:'Retry saving food',exact:true}).click();await privatePage.getByText('Food pre-order saved. It remains scheduled until arrival.',{exact:true}).waitFor();await privatePage.locator('.preorder-summary summary').click();
 await check('Original ambiguous food save recovers without a duplicate history entry',async()=>{assert.match(await privatePage.locator('.preorder-summary').innerText(),/2 saved food change/);assert.equal(await privatePage.evaluate(c=>Boolean(JSON.parse(sessionStorage.getItem('lumina.guest.v1')).pendingFoodEdits[c]),code),false);});
 fixture({action:'seat',code});await page.goto(base+'/staff/login');await page.locator('[name=email]').fill('b4-admin@lumina.test');await page.locator('[name=password]').fill('Isolated cart passphrase 2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/admin');
 const tickets=await page.request.get(base+'/api/kitchen/tickets?date='+data.date);const kitchen=await tickets.json();
 await check('Confirmed arrival hands accepted food to the real kitchen exactly once',async()=>{assert.equal(tickets.status(),200);assert.equal(fixture({action:'verify'}).tickets,1);assert.equal(fixture({action:'verify'}).orders,1);assert.ok(JSON.stringify(kitchen).includes(code));});
 await privatePage.reload();await privatePage.locator('.preorder-summary').waitFor();await check('Guest management reflects kitchen release and removes cart editing',async()=>{assert.match(await privatePage.locator('.preorder-summary').innerText(),/Released to the kitchen/);assert.equal(await privatePage.getByRole('button',{name:'Edit food pre-order',exact:true}).count(),0);});
 // A new VIP booking demonstrates the approved fee/credit split before acceptance.
 await context.clearCookies();await page.goto(base);await page.evaluate(()=>sessionStorage.clear());await page.reload();await search('16','bv_vip');await guest();await confirm().click();await page.locator('.preorder-quote h3').waitFor();
 await check('VIP sixteen guests shows ₱2,500 unpaid base and separate ₱300 extras',async()=>{const text=await page.locator('.preorder-quote').innerText();assert.match(text,/₱2,500.00/);assert.match(text,/₱300.00/);assert.match(text,/not food credit/);});
 await page.screenshot({path:artifacts+'/vip-quote.png'});
 const session=await(await page.request.get(base+'/api/session')).json();
 await check('Quote mutation enforces CSRF and hold ownership',async()=>{
  const hold=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('lumina.guest.v1')).hold.hold_token);
  assert.equal((await page.request.post(base+'/api/preorders/quote',{data:{hold_token:hold,cart:[]}})).status(),403);
  const rival=await other.request.post(base+'/api/preorders/quote',{headers:{'X-CSRF-Token':(await(await other.request.get(base+'/api/session')).json()).csrf_token},data:{hold_token:hold,cart:[]}});assert.equal(rival.status(),404);
 });
 // An uncommitted request with an expired hold must not poison the next booking.
 await page.getByLabel('I reviewed and accept this food quote, fees and food policy.').check();
 await page.route('**/api/reservations',r=>r.abort('failed'));
 await page.route('**/api/holds',r=>r.request().method()==='GET'?r.abort('failed'):r.continue());
 await confirm().click();await page.waitForFunction(()=>Boolean(JSON.parse(sessionStorage.getItem('lumina.guest.v1')).pendingConfirmation));
 const expired=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('lumina.guest.v1')).hold.hold_token);
 fixture({action:'expire',hold_token:expired});
 await page.unroute('**/api/reservations');await page.unroute('**/api/holds');await page.reload();await page.getByRole('button',{name:'Find a table',exact:true}).waitFor();
 await check('Definitively expired uncommitted hold clears its pending confirmation',async()=>assert.equal(await page.evaluate(()=>Boolean(JSON.parse(sessionStorage.getItem('lumina.guest.v1')).pendingConfirmation)),false));
 await search('16','bv_vip');await guest();await confirm().click();await page.locator('.preorder-quote h3').waitFor();
 await check('Next booking has an unlocked cart bound to its new hold',async()=>{assert.equal(await page.getByRole('button',{name:'Add dish',exact:true}).isEnabled(),true);assert.notEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('lumina.guest.v1')).hold.hold_token),expired);});
 await check('No JavaScript errors in guest and second-browser cart flows',async()=>assert.deepEqual(errors,[]));
 console.log('PASS '+checks+' B4 actual browser checks');
}catch(error){await page.screenshot({path:artifacts+'/failure-main.png'}).catch(()=>{});if(other)for(const p of other.pages())await p.screenshot({path:artifacts+'/failure-private.png'}).catch(()=>{});throw error;}finally{await browser.close();}
