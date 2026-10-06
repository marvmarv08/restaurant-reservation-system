import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Workspace loading tests require the isolated stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE||'/tmp/lumina-browser/node_modules/playwright/index.mjs')).href);
const base='http://127.0.0.1:18080';
const fixture=data=>JSON.parse(execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php','tests/staff-fixture.php'],{input:JSON.stringify(data),stdio:['pipe','pipe','pipe']}).toString());
const invitations=fixture({action:'prepare'});fixture({action:'ready'});
const browser=await chromium.launch({headless:true});const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(10000);
let failures=0;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
async function waitForSignal(promise) {
 let timer;
 try { return await Promise.race([promise, new Promise((_, reject) => { timer=setTimeout(()=>reject(new Error('Expected QA request did not start')),12000); })]); }
 finally { clearTimeout(timer); }
}
const startedWithin=async promise=>Promise.race([promise.then(()=>true),new Promise(r=>setTimeout(()=>r(false),800))]);
async function check(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failures++;console.log('FAIL '+name+': '+e.message);}}
try{
 await page.goto(base+invitations.admin.activation_path);
 await page.getByLabel('New password',{exact:true}).fill('Isolated workspace loading passphrase 2026!');await page.getByLabel('Confirm new password',{exact:true}).fill('Isolated workspace loading passphrase 2026!');
 await page.getByRole('button',{name:'Activate account',exact:true}).click();await page.waitForURL(base+'/admin');await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
 await check('Admin starts public catalog while authentication response is pending',async()=>{
  const gate=deferred(),auth=deferred(),catalog=deferred(),handled=deferred();
  const listener=r=>{if(new URL(r.url()).pathname==='/api/catalog')catalog.resolve();};page.on('request',listener);
  await page.route('**/api/auth/me',async route=>{auth.resolve();await gate.promise;await route.continue();handled.resolve();});
  let concurrent;
  try{await page.goto(base+'/admin');await waitForSignal(auth.promise);concurrent=await startedWithin(catalog.promise);}finally{gate.resolve();await handled.promise;await page.unroute('**/api/auth/me');page.off('request',listener);}
  await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();assert.equal(concurrent,true,'Catalog unnecessarily waits for auth to finish');
 });
 await check('Server starts order listing while menu response is pending',async()=>{
  const gate=deferred(),menu=deferred(),orders=deferred(),handled=deferred();
  const listener=r=>{if(new URL(r.url()).pathname==='/api/service/orders')orders.resolve();};page.on('request',listener);
  await page.route('**/api/service/menu',async route=>{menu.resolve();await gate.promise;await route.continue();handled.resolve();});
  let concurrent;
  try{await page.goto(base+'/server');await waitForSignal(menu.promise);concurrent=await startedWithin(orders.promise);}finally{gate.resolve();await handled.promise;await page.unroute('**/api/service/menu');page.off('request',listener);}
  await page.locator('#service-sync').filter({hasText:'Live service'}).waitFor();assert.equal(concurrent,true,'Orders unnecessarily wait for menu to finish');
 });
 await check('Overlapping dashboard refresh shares the pending read',async()=>{
  const gate=deferred(),started=deferred();let count=0;const handlers=[];
  const handler=async route=>{count++;started.resolve();const work=(async()=>{await gate.promise;await route.continue();})();handlers.push(work);await work;};
  await page.route('**/api/admin/dashboard?*',handler);
  let requested;
  try{await page.goto(base+'/admin');await waitForSignal(started.promise);await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForTimeout(100);requested=count;}
  finally{gate.resolve();await Promise.all(handlers);await page.unroute('**/api/admin/dashboard?*',handler);}
  assert.equal(requested,1,'Same dashboard was fetched twice while its first request was pending');
 });
 await check('Kitchen filter refresh waits for pending poll and then fetches the new station',async()=>{
  await page.goto(base+'/kitchen');await page.locator('#service-sync').filter({hasText:'Live service'}).waitFor();
  const gate=deferred(),started=deferred(),latest=deferred();const handlers=[];let blocked=false;
  const handler=async route=>{const url=new URL(route.request().url());if(url.searchParams.get('station')==='grill')latest.resolve();const work=(async()=>{if(!blocked){blocked=true;started.resolve();await gate.promise;}await route.continue();})();handlers.push(work);await work;};
  await page.route('**/api/kitchen/tickets?*',handler);
  let waits;
  try{await waitForSignal(started.promise);await page.getByLabel('Station',{exact:true}).selectOption('grill');await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForTimeout(50);waits=await page.locator('#service-filters button[type=submit]').isDisabled();}
  finally{gate.resolve();await Promise.all(handlers);}
  const updated=await startedWithin(latest.promise);await page.unroute('**/api/kitchen/tickets?*',handler);
  assert.equal(waits,true,'Manual refresh finished before its pending read');assert.equal(updated,true,'New filter was dropped while the poll was busy');
 });
 await check('Saved reservation survives an older dashboard response',async()=>{
  await page.goto(base+'/admin');await page.waitForFunction(()=>document.querySelector('#staff-stats')?.textContent.includes('Reservations'));
  const date=new Date(Date.now()+42*86400000);while(date.getUTCDay()!==2)date.setUTCDate(date.getUTCDate()+1);
  await page.getByLabel('Service date',{exact:true}).fill(date.toISOString().slice(0,10));
  const initial=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/dashboard');await page.getByRole('button',{name:'Refresh',exact:true}).click();await(await initial).finished();await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
  const gate=deferred(),captured=deferred(),fresh=deferred();let first=true;const handlers=[];
  const handler=async route=>{const work=(async()=>{if(first){first=false;const response=await route.fetch();captured.resolve();await gate.promise;await route.fulfill({response});}else{fresh.resolve();await route.continue();}})();handlers.push(work);await work;};
  await page.route('**/api/admin/dashboard?*',handler);
  let rechecked;
  try{
   await page.getByRole('button',{name:'Refresh',exact:true}).click();await waitForSignal(captured.promise);
   await page.getByRole('button',{name:'New reservation',exact:true}).click();const dialog=page.getByRole('dialog');
   await dialog.getByRole('button',{name:'Find available tables',exact:true}).click();await dialog.locator('.options input').first().waitFor();
   await dialog.getByLabel('Guest full name',{exact:true}).fill('Pending read QA');await dialog.getByLabel('Guest phone',{exact:true}).fill('+639000000010');
   const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/reservations'&&r.request().method()==='POST');
   await dialog.getByRole('button',{name:'Create reservation',exact:true}).click();assert.equal((await saved).ok(),true);
   rechecked=await startedWithin(fresh.promise);
  }finally{gate.resolve();await Promise.all(handlers);await page.unroute('**/api/admin/dashboard?*',handler);}
  assert.equal(rechecked,true,'Post-save refresh reused a read from before the save');
  await page.locator('#staff-rows').getByText('Pending read QA').waitFor();
 });
 await check('Saved order survives an older service response',async()=>{
  const data=JSON.parse(execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php','tests/order-fixture.php'],{input:JSON.stringify({action:'prepare'}),stdio:['pipe','pipe','pipe']}).toString());
  const id=data.orders[0].id;
  await page.goto(base+'/server');await page.locator('#service-sync').filter({hasText:'Live service'}).waitFor();
  await page.getByRole('button',{name:'Open order #'+id,exact:true}).click();await page.getByRole('heading',{name:'Order #'+id,exact:true}).waitFor();
  if(await page.getByRole('button',{name:'Claim order',exact:true}).isVisible()){await page.getByRole('button',{name:'Claim order',exact:true}).click();await page.getByText('Order assigned to you.',{exact:true}).waitFor();await page.getByLabel('Dish',{exact:true}).waitFor();}
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement?.matches('[data-order-id]'));
  await page.getByRole('button',{name:'Refresh',exact:true}).focus();
  const gate=deferred(),captured=deferred(),fresh=deferred();let first=true;const handlers=[];
  const handler=async route=>{const work=(async()=>{if(first){first=false;const response=await route.fetch();captured.resolve();await gate.promise;await route.fulfill({response});}else{fresh.resolve();await route.continue();}})();handlers.push(work);await work;};
  await page.route('**/api/service/orders?*',handler);
  let rechecked;
  try{
   await waitForSignal(captured.promise);
   await page.getByRole('button',{name:'Open order #'+id,exact:true}).click();await page.getByLabel('Dish',{exact:true}).selectOption(String(data.menu));await page.getByLabel('Quantity',{exact:true}).fill('2');
   const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/service/orders/action'&&r.request().postDataJSON().action==='add');
   await page.getByRole('button',{name:'Add dish',exact:true}).click();assert.equal((await saved).ok(),true);
  }finally{gate.resolve();rechecked=await startedWithin(fresh.promise);await Promise.all(handlers);await page.unroute('**/api/service/orders?*',handler);}
  assert.equal(rechecked,true,'Service refresh reused a read from before the dish save');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const card=page.locator('.order-card').filter({has:page.locator('[data-order-id="'+id+'"]')});
  await page.waitForFunction(id=>{const card=document.querySelector('[data-order-id=\"'+id+'\"]')?.closest('.order-card');return card&&!card.textContent.includes('₱0.00');},id);
  assert.doesNotMatch(await card.innerText(),/₱0\.00/,'Saved dish must appear in the order total');
 });
}finally{await browser.close();}
process.exitCode=failures?1:0;
