import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Capacity checks require isolated verification');
const{chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const{default:AxeBuilder}=await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base='http://127.0.0.1:18080',artifacts='/tmp/table-showcase-research';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
const guests=page.getByLabel('Guests',{exact:true}),rooms=page.getByLabel('Room preference');
const options=locator=>locator.locator('option').evaluateAll(ns=>ns.map(n=>n.value));
const fit=(t,count)=>count>=Number(t.min_party)&&count<=Number(t.max_party);
let checks=0;const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
const catalog=(await(await context.request.get(base+'/api/catalog')).json()).catalog;
const numbers=Array.from({length:catalog.max_party},(_,i)=>i+1);
async function fresh(query){await page.goto(base + '/reserve');if(query){await page.evaluate(q=>sessionStorage.setItem('lumina.guest.v1',JSON.stringify({query:q})),query);await page.reload();}else{await page.evaluate(()=>sessionStorage.clear());await page.reload();}await guests.waitFor();}
try{
 await fresh();
 await check('Initial form supports room-first selection from all active room types',async()=>assert.deepEqual(await options(rooms),['any',...catalog.room_types.map(t=>t.code)]));
 for(const count of numbers){await rooms.selectOption('any');await guests.selectOption(String(count));await check('Guest-first '+count+' shows exactly compatible database room types',async()=>assert.deepEqual(await options(rooms),['any',...catalog.room_types.filter(t=>fit(t,count)).map(t=>t.code)]));}
 for(const type of catalog.room_types){await fresh();await rooms.selectOption(type.code);await check('Room-first '+type.name+' restricts guests to its database booking range',async()=>assert.deepEqual(await options(guests),numbers.filter(n=>fit(type,n)).map(String)));}
 await fresh();await rooms.focus();await rooms.selectOption('vip');
 await check('VIP excludes 1 and 11–16 guests without moving keyboard focus',async()=>{assert.deepEqual(await options(guests),['2','3','4','5','6','7','8','9','10']);assert.equal(await rooms.evaluate(e=>e===document.activeElement),true);});
 await rooms.selectOption('group');
 await check('Room change adjusts incompatible current count and announces the new value',async()=>{assert.equal(await guests.inputValue(),'5');assert.match(await page.locator('#capacity-note').innerText(),/adjusted from 2 to 5/);assert.equal(await rooms.inputValue(),'group');});
 await guests.selectOption('8');await rooms.selectOption('vip');
 await check('A compatible guest count survives a room change',async()=>{assert.equal(await guests.inputValue(),'8');assert.equal(await rooms.inputValue(),'vip');});
 await rooms.selectOption('any');
 await check('Any room restores full guest choices and allows switching capacity groups',async()=>{assert.deepEqual(await options(guests),numbers.map(String));await guests.selectOption('16');assert.deepEqual(await options(rooms),['any','group']);});
 await fresh({date:catalog.today,party_size:1,room_type:'vip'});
 await check('Legacy saved invalid VIP1 query is normalized to VIP2',async()=>{assert.equal(await guests.inputValue(),'2');assert.equal(await rooms.inputValue(),'vip');assert.match(await page.locator('#capacity-note').innerText(),/adjusted from 1 to 2/);});
 const date=new Date(catalog.today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+42);while(date.getUTCDay()!==2)date.setUTCDate(date.getUTCDate()+1);const day=date.toISOString().slice(0,10);
 await rooms.selectOption('any');await guests.selectOption('16');await rooms.selectOption('group');await page.getByLabel('Date · Manila time').fill(day);
 const request=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/availability');
 await page.getByRole('button',{name:'Find a table',exact:true}).click();const url=new URL((await request).url());
 await page.locator('.table-picker').waitFor();
 await check('Real availability request uses the capacity-compatible 16-guest group query',async()=>{assert.equal(url.searchParams.get('party_size'),'16');assert.equal(url.searchParams.get('room_type'),'group');assert.equal(await guests.inputValue(),'16');assert.equal(await rooms.inputValue(),'group');assert.equal(await page.locator('.table-option input').count()>0,true);});
 await page.locator('.floor-table.available').first().click();await page.waitForFunction(()=>document.querySelector('.showcase-details .showcase-badge')?.dataset.state==='available');await page.getByRole('button',{name:'Close table showcase',exact:true}).click();
 await rooms.selectOption('any');await guests.selectOption('2');
 await check('Capacity changes clear stale times, table selections and gallery indicators',async()=>{assert.equal(await page.locator('.table-picker').count(),0);assert.equal(await page.locator('.showcase-tile .showcase-badge[data-state=unknown]').count(),catalog.tables.length);});
 await fresh();await rooms.selectOption('vip');
 for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:1000});await check('Capacity controls reflow at '+width,async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false));}
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 await check('Linked controls and adjustment status have no automated A/AA violations',async()=>assert.deepEqual(audit.violations.map(v=>v.id),[]));
 await page.locator('#booking').screenshot({path:artifacts+'/linked-capacity-vip.png'});
 await check('No JavaScript errors or booking writes while changing filters',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);});
 console.log('Linked capacity: '+checks+' checks passed using database catalog and availability.');
}finally{await context.close();await browser.close();}
