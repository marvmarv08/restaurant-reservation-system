import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated'||!process.env.MENU_E2E_CONTAINER?.startsWith('bv-menu-e2e-'))throw new Error('Disposable full-flow app only.');
const fixture=JSON.parse(execFileSync(process.env.DOCKER_CLI||'docker',['exec',process.env.MENU_E2E_CONTAINER,'cat','/tmp/curated-menu-e2e-private.json'],{encoding:'utf8'}));
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const base='http://127.0.0.1:18480',browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));let checks=0;
async function check(name,work){await work();checks++;console.log('PASS '+name);}
async function login(p,role){
 await p.goto(base+'/staff/login',{waitUntil:'domcontentloaded'});
 await p.getByLabel('Staff email',{exact:true}).fill(fixture.emails[role]);await p.getByLabel('Password',{exact:true}).fill(fixture.password);
 await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL(role==='admin'?'**/admin':'**/kitchen');
}
const money=cents=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(cents/100);
const value=label=>page.locator('.billing-summary dt').filter({hasText:new RegExp('^'+label+'$')}).locator('xpath=following-sibling::dd[1]');
async function openBill(sample){
 await page.getByRole('button',{name:new RegExp(sample.code)}).click();await page.locator('#billing-detail h2').filter({hasText:sample.code}).waitFor();
}
let kitchenContext;
try{
 const anonymous=await context.request.get(base+'/api/billing/quote?reservation_id='+fixture.results.standard.reservation_id);
 await check('Anonymous browser cannot retrieve the finalized bill',async()=>assert.equal(anonymous.status(),401));
 await login(page,'admin');
 for(const[name,sample]of Object.entries(fixture.results)){
  const r=await context.request.get(base+'/api/billing/quote?reservation_id='+sample.reservation_id);const data=await r.json();
  await check(name+': signed-in HTTP request retrieves the same finalized subtotal and zero balance',async()=>{
   assert.equal(r.status(),200);assert.equal(data.bill.status,'finalized');assert.equal(data.bill.food_cents,sample.food_cents);assert.equal(data.bill.extra_cents,sample.extra_cents);assert.equal(data.bill.credit_applied_cents,sample.base_credit_cents);assert.equal(data.bill.due_cents,0);
  });
  const order=await(await context.request.get(base+'/api/service/order?id='+sample.order_id)).json();
  await check(name+': protected order API retains selected dish snapshots and exact line arithmetic',async()=>{
   assert.equal(order.order.status,'closed');assert.equal(order.order.items.length,sample.line_count);
   assert.equal(order.order.items.reduce((sum,i)=>sum+Number(i.qty)*Number(i.unit_price_cents),0),sample.food_cents);
  });
 }
 await page.goto(base+'/billing',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Service date · Manila').fill(fixture.date);await page.getByRole('button',{name:'Load reservations',exact:true}).click();
 await mkdir('/tmp/bella-vista-menu-e2e',{recursive:true});
 for(const[name,sample]of Object.entries(fixture.results)){
  await openBill(sample);
  await check(name+': actual cashier screen displays matching food, credits, extras and balance',async()=>{
   assert.equal((await value('Food subtotal').innerText()).trim(),money(sample.food_cents));assert.equal((await value('Advance food credit applied').innerText()).trim(),money(sample.base_credit_cents));assert.equal((await value('Separate VIP extras').innerText()).trim(),money(sample.extra_cents));assert.equal((await value('Remaining bill balance').innerText()).trim(),money(0));assert.equal(await page.getByRole('button',{name:'Record receipt',exact:true}).count(),0);
  });
  await page.screenshot({path:'/tmp/bella-vista-menu-e2e/cashier-'+name+'.png',fullPage:true});
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Service date · Manila').fill(fixture.date);await page.getByRole('button',{name:'Load reservations',exact:true}).click();await openBill(fixture.results.vip);
 await check('Reload keeps the finalized VIP bill and its three once-only receipt/history entries',async()=>{assert.match(await page.locator('#billing-detail').innerText(),/Finalized/);assert.equal(await page.locator('.billing-history li').count(),3)});
 kitchenContext=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});const kitchen=await kitchenContext.newPage();await login(kitchen,'kitchen');
 const queue=await(await kitchenContext.request.get(base+'/api/kitchen/tickets?date='+fixture.date)).json();
 await check('Real kitchen login retrieves served new-menu tickets with their saved dishes',async()=>{
  assert.equal(queue.ok,true);
  for(const sample of Object.values(fixture.results)){const ticket=queue.recall.find(t=>Number(t.order_id)===sample.order_id);assert.ok(ticket);assert.equal(ticket.items.length,sample.line_count);assert.ok(ticket.items.every(i=>i.status==='served'))}
 });
 const denied=await kitchenContext.request.get(base+'/api/billing/quote?reservation_id='+fixture.results.vip.reservation_id);
 await check('Authenticated kitchen role is denied cashier access',async()=>assert.equal(denied.status(),403));
 await check('Staff/cashier browser flow has no JavaScript errors',async()=>assert.deepEqual(errors,[]));
 console.log('Persisted full-flow browser review: '+checks+' checks passed.');
}finally{if(kitchenContext)await kitchenContext.close();await context.close();await browser.close()}
