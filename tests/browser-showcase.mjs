import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Showcase checks require the isolated database');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default:AxeBuilder}=await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base='http://127.0.0.1:18080', artifacts=process.env.BROWSER_ARTIFACT_DIR||'/tmp/table-showcase-research';
await mkdir(artifacts,{recursive:true});
const fixture=data=>execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php','tests/browser-fixture.php'],{input:JSON.stringify(data),stdio:['pipe','pipe','pipe']});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],outside=[],mutations=[];
await context.route(/^https?:/,r=>{if(new URL(r.request().url()).origin===base)return r.continue();outside.push(r.request().url());return r.abort('internetdisconnected');});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(r.method()==='POST')mutations.push(new URL(r.url()).pathname);});
const dialog=page.locator('#table-showcase'), badge=page.locator('.showcase-details .showcase-badge');
const close=()=>page.getByRole('button',{name:'Close table showcase',exact:true}).click();
const ready=async()=>page.waitForFunction(()=>{const e=document.querySelector('.showcase-details .showcase-badge');return ['available','unavailable'].includes(e?.dataset.state);});
const picture=async()=>page.waitForFunction(()=>document.querySelector('.showcase-hero img')?.classList.contains('is-ready'));
const selected=()=>page.locator('.table-option input:checked').inputValue();
let checks=0,rival,holdToken,csrf,cleanupBooking;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
const axe=async(name)=>{const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);checks++;console.log('PASS accessibility '+name);};
const date=new Date(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Manila'}).format(new Date())+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+42);while(date.getUTCDay()!==2)date.setUTCDate(date.getUTCDate()+1);const day=date.toISOString().slice(0,10);
async function search(party='2',room='common'){
 await page.getByLabel('Date · Manila time').fill(day);await page.getByLabel('Guests',{exact:true}).selectOption(party);await page.getByLabel('Room preference').selectOption(room);
 await page.getByRole('button',{name:'Find a table',exact:true}).click();await page.getByRole('button',{name:'Continue with this table',exact:true}).waitFor();
 await page.locator('[data-time="19:00"]').click();
}
async function open(code){await page.locator('.floor-table[data-table="'+code+'"]').click();await ready();await picture();}
try{
 fixture({action:'showcase-unblock'});fixture({action:'cleanup'});
 await page.goto(base);await page.locator('.room-card').last().waitFor();
 await page.locator('#room-cards').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.room-card .room-art img')];return images.length===4&&images.every(i=>i.complete&&i.naturalWidth>0);});
 await check('Room cards retain their local photo previews rather than CSS placeholders',async()=>{
  const photos={vip:'round-table-reference.jpg',common:'main-dining-reference.jpg',group:'main-dining-reference.jpg',terrace:'terrace-reference.jpg'};
  for(const [code,file] of Object.entries(photos)){const card=page.locator('.room-card[data-room-type='+code+']');assert.equal(await card.locator('img').getAttribute('src'),'/assets/images/table-showcase/'+file);assert.match(await card.locator('.room-image-caption').innerText(),/Room inspiration/);}
 });
 await page.locator('.showcase-inventory summary').click();
 await check('All 25 live catalog previews start with neutral schedule prompts',async()=>{assert.equal(await page.locator('.showcase-tile').count(),25);assert.equal(await page.locator('.showcase-tile .showcase-badge[data-state=unknown]').count(),25);});
 await axe('room cards and all table previews');
 const roomButtons=page.locator('.room-card');
 for(let i=0;i<4;i++){await roomButtons.nth(i).click();await picture();assert.match(await badge.innerText(),/Choose date/);await close();}
 await check('Four live room cards open their own galleries',async()=>assert.equal(await roomButtons.count(),4));
 const codes=await page.locator('.showcase-tile').evaluateAll(ns=>ns.map(n=>n.dataset.table));
 for(const code of codes){await page.locator('.showcase-tile[data-table="'+code+'"]').click();await picture();assert.equal(await page.locator('#table-showcase-title').innerText(),'Table '+code);assert.match(await page.locator('.showcase-hero img').getAttribute('src'),new RegExp('/'+code+'\\.jpg$'));await close();}
 await check('Every physical table opens its exact catalog picture',async()=>assert.equal(codes.length,25));
 await search();await open('C7');
 await page.getByRole('button',{name:'Room inspiration',exact:true}).click();await picture();
 await check('Locally licensed inspiration is labelled and keeps the same availability',async()=>{assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/main-dining-reference.jpg$/);assert.match(await page.locator('.showcase-hero + p').innerText(),/another venue/);assert.equal(await badge.getAttribute('data-state'),'available');});
 await page.getByRole('button',{name:'Seating view',exact:true}).click();await picture();
 const initial=await selected();
 const catalog=(await (await page.request.get(base+'/api/catalog')).json()).catalog;
 const availability=(await (await page.request.get(base+'/api/availability?'+new URLSearchParams({date:day,party_size:2,room_type:'common'}))).json()).availability;
 const slot=availability.slots.find(s=>s.time==='19:00'),table=catalog.tables.find(t=>t.code==='C7'),option=slot.options.find(o=>o.table_ids.includes(Number(table.id)));
 await check('Green/red badges match the real MySQL availability options',async()=>{
  assert.ok(option);assert.equal(await badge.getAttribute('data-state'),'available');
  for(const t of catalog.tables){const expected=slot.options.some(o=>o.table_ids.includes(Number(t.id)))?'available':'unavailable';assert.equal(await page.locator('.showcase-tile[data-table="'+t.code+'"] .showcase-badge').getAttribute('data-state'),expected);}
 });
 await page.getByRole('button',{name:'Next table',exact:true}).click();await picture();
 await check('Browsing leaves selection unchanged and creates no hold',async()=>{assert.equal(await selected(),initial);assert.equal(await page.locator('.showcase-details [role=status]').innerText(),'');assert.deepEqual(mutations,[]);});
 await page.getByRole('button',{name:'Previous table',exact:true}).click();await picture();
 fixture({action:'showcase-block',date:day,table:'C7'});
 await page.getByRole('button',{name:'Refresh availability',exact:true}).click();await ready();
 await check('A real database blackout turns the exact table red in gallery and floor',async()=>{assert.equal(await badge.getAttribute('data-state'),'unavailable');assert.equal(await page.locator('.floor-table[data-table=C7]').evaluate(e=>e.classList.contains('unavailable')),true);assert.equal(await page.getByRole('button',{name:'Unavailable for this search',exact:true}).isDisabled(),true);});
 await page.screenshot({path:artifacts+'/live-unavailable.png'});
 fixture({action:'showcase-unblock'});await page.getByRole('button',{name:'Refresh availability',exact:true}).click();await ready();
 await check('Removing the database block restores green without changing the choice',async()=>{assert.equal(await badge.getAttribute('data-state'),'available');assert.equal(await selected(),initial);});
 rival=await browser.newContext();const session=await(await rival.request.get(base+'/api/session')).json();csrf=session.csrf_token;
 const held=await(await rival.request.post(base+'/api/holds',{headers:{'X-CSRF-Token':csrf},data:{date:day,party_size:2,room_type:'common',time:'19:00',option:{kind:option.kind,id:option.id}}})).json();assert.equal(held.ok,true);holdToken=held.hold.hold_token;
 await page.getByRole('button',{name:'Use this table',exact:true}).click();await ready();
 await check('Another guest hold is detected before applying a stale green choice',async()=>{assert.equal(await badge.getAttribute('data-state'),'unavailable');assert.equal(await dialog.evaluate(e=>e.open),true);assert.equal(await selected(),initial);assert.deepEqual(mutations,[]);});
 const released=await(await rival.request.post(base+'/api/holds/release',{headers:{'X-CSRF-Token':csrf},data:{hold_token:holdToken}})).json();assert.equal(released.ok,true);holdToken=null;
 await page.getByRole('button',{name:'Refresh availability',exact:true}).click();await ready();
 await check('Releasing a real hold restores the green table indicator',async()=>assert.equal(await badge.getAttribute('data-state'),'available'));
 await page.getByRole('button',{name:'Use this table',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await check('Explicit choice synchronizes radio and floor but starts no hold',async()=>{assert.equal(await selected(),option.kind+':'+option.id);assert.equal(await page.locator('.floor-table.selected').getAttribute('data-table'),'C7');assert.deepEqual(mutations,[]);});
 await page.getByLabel('Guests',{exact:true}).selectOption('4');
 await check('Changing the search clears old availability indicators immediately',async()=>assert.equal(await page.locator('.showcase-tile .showcase-badge[data-state=unknown]').count(),25));
 fixture({action:'joined',date:day});await search('13','group');await open('G1');
 await check('Joined availability uses the composite and identifies both physical members',async()=>{assert.match(await badge.innerText(),/joined/);assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/G1-G2.jpg$/);assert.match(await page.locator('.showcase-reason').innerText(),/G1 \+ G2 together/);});
 await page.locator('.showcase-hero img').evaluate(i=>i.src='/assets/images/table-showcase/missing-joined-check.jpg');await page.locator('.showcase-hero svg').waitFor();
 await check('Joined image failure retains a 16-seat combined layout and group action',async()=>{assert.match(await page.locator('.showcase-hero svg').getAttribute('aria-label'),/joined table with 16 seats/);assert.equal(await page.getByRole('button',{name:'Use joined tables',exact:true}).isEnabled(),true);});
 await page.getByRole('button',{name:'Use joined tables',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await check('Joined explicit selection highlights both members and requires approval',async()=>{assert.equal(await page.locator('.floor-table.selected').count(),2);assert.match(await page.locator('.selection-note').innerText(),/manager approval/);assert.deepEqual(mutations,[]);});
 fixture({action:'cleanup'});await search();await open('C7');
 await page.route('**/api/availability?**',r=>r.abort('internetdisconnected'));
 await page.getByRole('button',{name:'Refresh availability',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.textContent.includes('Unable'));
 await check('Network failure is neutral and disables selection instead of claiming availability',async()=>{assert.equal(await badge.getAttribute('data-state'),'unknown');assert.equal(await page.locator('.showcase-details .button.full').isDisabled(),true);});
 await page.unroute('**/api/availability?**');await page.getByRole('button',{name:'Refresh availability',exact:true}).click();await ready();
 await check('Retry obtains a fresh real availability result',async()=>assert.equal(await badge.getAttribute('data-state'),'available'));
 await page.locator('.showcase-hero img').evaluate(i=>i.src='/assets/images/table-showcase/missing-check.jpg');await page.locator('.showcase-hero svg').waitFor();
 await check('Missing artwork preserves actual availability and usable controls',async()=>{assert.equal(await badge.getAttribute('data-state'),'available');assert.equal(await page.getByRole('button',{name:'Use this table',exact:true}).isEnabled(),true);});
 await axe('image fallback');await close();await open('C7');
 for(const width of [320,390,768,1440]){
  await close();await page.setViewportSize({width,height:1000});await open('C7');
  await check('Dialog and page reflow at '+width+'px',async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);assert.equal(await dialog.evaluate(e=>e.scrollTop),0);});
  await axe('available dialog '+width+'px');
 }
 await page.screenshot({path:artifacts+'/live-desktop.png'});
 await close();await page.setViewportSize({width:390,height:1000});await open('C7');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:artifacts+'/live-mobile.png'});
 await check('Reduced motion leaves a complete static interface',async()=>{assert.equal(await dialog.evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.showcase-hero img').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await check('Optional fade and entrance effects remain brief',async()=>{assert.equal(await dialog.evaluate(e=>getComputedStyle(e).animationName),'showcase-enter');assert.equal(await page.locator('.showcase-hero img').evaluate(e=>getComputedStyle(e).transitionDuration),'0.18s');});
 await page.getByRole('button',{name:'Close table showcase',exact:true}).focus();await page.keyboard.press('Tab');
 await check('Keyboard focus remains inside the modal',async()=>assert.equal(await page.evaluate(()=>document.querySelector('#table-showcase').contains(document.activeElement)),true));
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await check('Escape restores the exact floor opener',async()=>assert.equal(await page.evaluate(()=>document.activeElement.dataset.table),'C7'));
 await page.clock.install();await open('C7');fixture({action:'showcase-block',date:day,table:'C7'});await page.clock.fastForward(30001);await page.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.dataset.state==='unavailable');
 await check('Visible-open periodic refresh reflects a real database change',async()=>assert.equal(await badge.getAttribute('data-state'),'unavailable'));
 fixture({action:'showcase-unblock'});await page.getByRole('button',{name:'Refresh availability',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.dataset.state==='available');await close();
 const expiryPage=await context.newPage();await expiryPage.clock.install();await expiryPage.goto(base);
 await expiryPage.getByRole('button',{name:'Find a table',exact:true}).waitFor();
 await expiryPage.getByLabel('Date · Manila time').fill(day);await expiryPage.getByLabel('Room preference').selectOption('common');await expiryPage.getByRole('button',{name:'Find a table',exact:true}).click();
 await expiryPage.waitForFunction(()=>document.querySelector('.showcase-tile[data-table=C7] .showcase-badge')?.dataset.state==='available');
 await expiryPage.clock.fastForward(45001);
 await check('Closed-gallery status expires to neutral instead of staying green',async()=>{assert.equal(await expiryPage.locator('.showcase-tile[data-table=C7] .showcase-badge').getAttribute('data-state'),'unknown');assert.match(await expiryPage.locator('.showcase-tile[data-table=C7] .showcase-badge').textContent(),/Refresh to check/);assert.equal(await expiryPage.getByRole('button',{name:'Continue with this table',exact:true}).isDisabled(),true);});
 let timeChecks=0;expiryPage.on('request',r=>{if(new URL(r.url()).pathname==='/api/availability')timeChecks++;});
 await expiryPage.locator('[data-time="19:15"]').click();await expiryPage.waitForFunction(()=>document.querySelector('.showcase-tile[data-table=C7] .showcase-badge')?.dataset.state==='available');
 await check('Selecting a time from an expired snapshot triggers a real fresh search',async()=>assert.equal(timeChecks,1));
 await expiryPage.close();
 await page.getByRole('button',{name:'Refresh tables',exact:true}).click();await page.getByRole('button',{name:'Continue with this table',exact:true}).waitFor({state:'visible'});
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Continue with this table')?.disabled);
 await page.route('**/api/availability?**',()=>{});await page.locator('.floor-table[data-table=C7]').click();await page.clock.fastForward(12001);await page.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.textContent.includes('Unable'));
 await check('A stalled check times out to unknown and enables retry',async()=>assert.equal(await page.getByRole('button',{name:'Refresh availability',exact:true}).isEnabled(),true));
 await close();await page.unroute('**/api/availability?**');await page.getByRole('button',{name:'Refresh tables',exact:true}).click();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Continue with this table')?.disabled);
 let releaseSlow,finishSlow,delayNext=true;const gate=new Promise(r=>releaseSlow=r),done=new Promise(r=>finishSlow=r);
 await page.route('**/api/availability?**',async r=>{if(!delayNext)return r.continue();delayNext=false;const response=await r.fetch();await gate;await r.fulfill({response});finishSlow();});
 await page.locator('.floor-table[data-table=C7]').click();await page.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.textContent.includes('Checking'));
 await close();await search('4');releaseSlow();await done;
 await page.unroute('**/api/availability?**');await page.locator('.floor-table[data-table=C1]').click();await ready();
 await check('Delayed earlier search response cannot overwrite the current guest count',async()=>{assert.equal(await badge.getAttribute('data-state'),'unavailable');assert.match(await page.locator('.showcase-schedule').innerText(),/4 guests/);});
 await close();await page.setViewportSize({width:1440,height:1000});await open('V2');
 await check('Unavailable previews remain discoverable with contextual reasons',async()=>{assert.equal(await badge.getAttribute('data-state'),'unavailable');assert.match(await page.locator('.showcase-reason').innerText(),/room preference/);});
 const heldForManage=await(await rival.request.post(base+'/api/holds',{headers:{'X-CSRF-Token':csrf},data:{date:day,party_size:2,room_type:'common',time:'19:00',option:{kind:option.kind,id:option.id}}})).json();assert.equal(heldForManage.ok,true);holdToken=heldForManage.hold.hold_token;
 const confirmed=await(await rival.request.post(base+'/api/reservations',{headers:{'X-CSRF-Token':csrf},data:{hold_token:holdToken,guest:{full_name:'Showcase Verification Guest',phone:'+639000000002',email:'showcase@lumina.test',special_requests:''}}})).json();assert.equal(confirmed.ok,true);holdToken=null;
 const privateParts=new URLSearchParams(new URL(confirmed.booking.manage_path,base).hash.slice(1));
 const readManaged=async()=>(await(await rival.request.get(base+'/api/manage?code='+privateParts.get('code'),{headers:{'X-Booking-Token':privateParts.get('token')}})).json()).booking;
 cleanupBooking=privateParts;
 const beforeManage=await readManaged(),management=await rival.newPage(),managementPosts=[];
 management.on('pageerror',e=>errors.push(e.message));management.on('request',r=>{if(r.method()==='POST')managementPosts.push(new URL(r.url()).pathname);});
 await management.goto(base+confirmed.booking.manage_path);await management.getByRole('button',{name:'Change reservation',exact:true}).click();await management.getByRole('button',{name:'Find a table',exact:true}).click();
 await management.locator('.floor-table[data-table=C7]').click();await management.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.dataset.state==='available');
 await management.getByRole('button',{name:'Next table',exact:true}).click();await management.getByRole('button',{name:'Use this table',exact:true}).click();await management.locator('#table-showcase').waitFor({state:'hidden'});
 const afterManage=await readManaged();
 await check('Protected management previews exclude the current booking and preserve it until Save',async()=>{assert.deepEqual(managementPosts,[]);assert.equal(afterManage.version,beforeManage.version);assert.equal(afterManage.starts_at,beforeManage.starts_at);assert.equal(afterManage.status,beforeManage.status);assert.equal(await management.getByRole('button',{name:'Save reservation changes',exact:true}).isEnabled(),true);});
 await management.close();
 await check('Local pictures and API work with all external internet requests blocked',async()=>{assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);});
 console.log('Live showcase: '+checks+' checks passed against isolated MySQL.');
}finally{
 if(cleanupBooking&&rival){const header={'X-Booking-Token':cleanupBooking.get('token')};const booking=(await(await rival.request.get(base+'/api/manage?code='+cleanupBooking.get('code'),{headers:header})).json()).booking;const cancelled=await(await rival.request.post(base+'/api/manage/cancel',{headers:{...header,'X-CSRF-Token':csrf},data:{code:booking.code,version:booking.version}})).json();assert.equal(cancelled.ok,true);}
 if(holdToken&&rival)await rival.request.post(base+'/api/holds/release',{headers:{'X-CSRF-Token':csrf},data:{hold_token:holdToken}});
 fixture({action:'showcase-unblock'});fixture({action:'cleanup'});await rival?.close();await context.close();await browser.close();
}
