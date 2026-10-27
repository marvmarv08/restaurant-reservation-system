import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview only');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default:AxeBuilder}=await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base='http://127.0.0.1:18080', artifacts='/tmp/bella-vista-seating';
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1366,height:950},reducedMotion:'reduce'});
const errors=[],outside=[],mutations=[];
await context.route(/^https?:/,r=>{
 if(new URL(r.request().url()).origin===base)return r.continue();
 outside.push(r.request().url());return r.abort('internetdisconnected');
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))mutations.push(r.method()+' '+new URL(r.url()).pathname);});
const ready=()=>page.waitForFunction(()=>document.querySelector('.showcase-hero[aria-busy=false] img.is-ready')?.naturalWidth>0);
const close=()=>page.getByRole('button',{name:'Close table showcase',exact:true}).click();
const open=async code=>{await page.locator('.showcase-tile[data-table="'+code+'"]').click();await ready();};
let checks=0;
const check=async(name,fn)=>{await fn();console.log('PASS '+name);checks++;};
try{
 await page.goto(base);await page.locator('.showcase-inventory summary').click();
 const catalog=(await(await page.request.get(base+'/api/catalog')).json()).catalog;
 assert.equal(catalog.profile,'bella_vista_b2');assert.equal(catalog.tables.length,9);
 for(const table of catalog.tables){
  await open(table.code);
  await check(table.code+' loads its exact local render and honest capacity caption',async()=>{
   assert.equal(await page.locator('#table-showcase-title').innerText(),'Table '+table.code);
   assert.match(await page.locator('.showcase-hero img').getAttribute('src'),new RegExp('/bella-vista/'+table.code+'\\.jpg$'));
   assert.match(await page.locator('.showcase-hero + p').innerText(),new RegExp(table.capacity_max+' seats.*Rendered concept'));
   assert.match(await page.locator('.showcase-details .showcase-badge').innerText(),/Choose date/);
   const facts=await page.locator('.showcase-details dl').innerText();
   assert.doesNotMatch(facts,/pending billing/);
   assert.match(facts,table.code.startsWith('VIP')?/₱2,500.*15.*₱300.*20.*not food credit/s:table.code.startsWith('F')?/₱500 consumable/:/No reservation fee.*₱1,000/);
  });
  await close();
 }
 await check('All nine thumbnail images decode as local 960px assets',async()=>{
  await page.waitForFunction(()=>[...document.querySelectorAll('.showcase-tile img')].length===9&&[...document.querySelectorAll('.showcase-tile img')].every(i=>i.complete&&i.naturalWidth===960));
 });
 await open('VIP1');
 await page.getByRole('button',{name:'Room inspiration',exact:true}).click();await ready();
 await check('Inspiration remains clearly labelled as another venue',async()=>assert.match(await page.locator('.showcase-hero + p').innerText(),/another venue.*not an actual/));
 await close();
 // Hold one image request, select its neighbor, then release the stale response.
 let release,requested;
 const requestedPromise=new Promise(r=>requested=r),gate=new Promise(r=>release=r);
 await page.route('**/VIP1.jpg',async r=>{requested();await gate;await r.continue();});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('.showcase-inventory summary').click();
 await page.locator('.showcase-tile[data-table=VIP1]').click();
 let timer;
 try{await Promise.race([requestedPromise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Delayed image route was not reached')),10000);})]);}finally{clearTimeout(timer);}
 await page.getByRole('button',{name:'Next table',exact:true}).click();await ready();
 release();await page.waitForLoadState('networkidle');
 await page.unroute('**/VIP1.jpg');
 await check('Late VIP1 response cannot replace selected VIP2 image or caption',async()=>{
  assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/VIP2.jpg$/);
  assert.match(await page.locator('.showcase-hero + p').innerText(),/^VIP2/);
 });
 await close();
 await page.route('**/VIP2.jpg',r=>r.abort('failed'));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('.showcase-inventory summary').click();
 await page.locator('.showcase-tile[data-table=VIP2]').click();await page.locator('.showcase-hero svg').waitFor();
 await check('Missing VIP render retains twenty distinct nonoverlapping fallback chairs',async()=>{
  const data=await page.locator('.showcase-hero svg').evaluate(svg=>({label:svg.getAttribute('aria-label'),chairs:[...svg.querySelectorAll('rect[stroke]')].map(n=>({x:+n.getAttribute('x'),y:+n.getAttribute('y'),w:+n.getAttribute('width'),h:+n.getAttribute('height')}))}));
  assert.match(data.label,/20 seats/);assert.equal(data.chairs.length,20);
  for(let i=0;i<data.chairs.length;i++){
   const a=data.chairs[i];assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=600&&a.y+a.h<=430);
   for(const b of data.chairs.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
  }
  assert.match(await page.locator('.showcase-hero + p').innerText(),/Picture unavailable/);
  assert.equal(await page.getByRole('button',{name:'Choose date and time',exact:true}).isEnabled(),true);
 });
 await close();await page.unroute('**/VIP2.jpg');await open('VIP2');
 await check('Reopening recovers the render after an image failure',async()=>assert.equal(await page.locator('.showcase-hero svg').count(),0));
 for(const width of [1366,1280,390,320]){
  await page.setViewportSize({width,height:950});
  await page.locator('.showcase-scroll').evaluate(e=>e.scrollTop=0);
  await page.screenshot({path:artifacts+'/vip-'+width+'.png'});
  await check(width+'px preview stays in viewport with reachable Close',async()=>{
   const b=await page.locator('#table-showcase').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
   const closeBox=await page.getByRole('button',{name:'Close table showcase',exact:true}).boundingBox();assert.ok(closeBox.y>=0&&closeBox.y+closeBox.height<=950);
   assert.ok(await page.locator('.showcase-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  });
  if(width===1366||width===320){
   await check(width+'px dialog accessibility',async()=>{
    const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    assert.deepEqual(report.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
   });
  }
 }
 await close();await page.setViewportSize({width:1366,height:950});
 for(const code of ['S1','F1']){await open(code);await page.screenshot({path:artifacts+'/'+code+'.png'});await close();}
 await check('Browsing performs no writes, external fetches or JavaScript errors',async()=>{
  assert.deepEqual(mutations,[]);assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
 });
 console.log('PASS '+checks+' Bella Vista seating browser checks');
} finally {await browser.close();}
