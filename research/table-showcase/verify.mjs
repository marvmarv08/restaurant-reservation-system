import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const { default: AxeBuilder } = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base=new URL('./concept.html',import.meta.url).href;
const artifacts=process.env.BROWSER_ARTIFACT_DIR || '/tmp/table-showcase-research';
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const external=[],errors=[];
await context.route(/^https?:/,r=>{external.push(r.request().url());return r.abort('internetdisconnected');});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function picture(){await page.waitForFunction(()=>{const i=document.querySelector('#hero img');return i?.complete&&i.naturalWidth>0&&i.classList.contains('is-ready');});}
async function axe(name){const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],name);checks++;console.log('PASS accessibility '+name);}
try{
 await check('All 25 physical assets and joined composite match inventory and render recipe',async()=>{
  const json=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
  const inventory=await json('./inventory.json'), manifest=await json('./assets/seating/manifest.json');
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const recipe=hash(await readFile(new URL('./render_seating.py',import.meta.url)));
  const expected=[...inventory.tables,{code:'G1-G2',shape:'joined',capacity_max:16}];
  assert.equal(manifest.length,expected.length);assert.equal(new Set(manifest.map(e=>e.code)).size,26);
  for(const t of expected){
   const e=manifest.find(e=>e.code===t.code);assert.ok(e,t.code);assert.equal(e.shape,t.shape);
   assert.equal(e.seats,Number(t.capacity_max));assert.equal(e.seat_positions.length,e.seats);
   assert.equal(e.recipe_sha256,recipe);assert.equal(e.file,t.code+'.jpg');
   const bytes=await readFile(new URL('./assets/seating/'+e.file,import.meta.url));
   assert.equal(bytes.length,e.bytes);assert.equal(hash(bytes),e.sha256);
  }
  for(const e of await json('./assets/credits.json')){
   const bytes=await readFile(new URL('./assets/'+e.file,import.meta.url));
   assert.equal(bytes.length,e.bytes);assert.equal(hash(bytes),e.sha256);
  }
 });
 await page.goto(base);await page.locator('.table-tile').last().waitFor();
 await check('Four clickable room cards and all 25 exact physical tables',async()=>{assert.equal(await page.locator('.room-card').count(),4);assert.equal(await page.locator('.table-tile').count(),25);});
 await axe('room cards and all tables');
 await check('Only Seating view and Room inspiration controls',async()=>{assert.equal(await page.locator('[data-view]').count(),2);assert.equal(await page.getByRole('button',{name:'From above',exact:true}).count(),0);});
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await check('Room layout '+width+'px',async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false));
  await page.locator('[data-room="r_common"]').click();await page.getByRole('dialog').waitFor();
  await check('Click room opens C1 with 12 table thumbnails',async()=>{assert.equal(await page.locator('#showcase-title').innerText(),'Table C1');assert.equal(await page.locator('.thumbnail').count(),12);assert.equal(await page.locator('dialog').evaluate(e=>e.scrollTop),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);});
  await picture();await axe('table dialog '+width+'px');
  await page.getByRole('button',{name:'Next table',exact:true}).click();
  await check('Next shows C2 without choosing a table',async()=>{assert.equal(await page.locator('#showcase-title').innerText(),'Table C2');assert.match(await page.locator('#selection').innerText(),/No table chosen/);});
  await picture();
  await check('Seating view combines layout and realistic local image',async()=>{assert.match(await page.locator('#hero img').getAttribute('src'),/seating\/C2.jpg$/);assert.match(await page.locator('#image-caption').innerText(),/2 seats shown/);assert.equal(await page.locator('[data-view=seating]').getAttribute('aria-pressed'),'true');});
  await page.getByRole('button',{name:'Room inspiration',exact:true}).click();
  await picture();
  await check('Reference photo loaded locally and identified as another venue',async()=>{assert.equal(await page.locator('#hero img').evaluate(i=>i.complete&&i.naturalWidth>0),true);assert.match(await page.locator('#image-caption').innerText(),/another venue/);});
  await page.locator('#close').focus();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement?.dataset.room==='r_common');
 }
 const codes=await page.locator('.table-tile').evaluateAll(nodes=>nodes.map(n=>n.dataset.table));
 for(const code of codes){
  await page.locator('.table-tile[data-table="'+code+'"]').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('#showcase-title').innerText(),'Table '+code);
  await picture();assert.equal(await page.locator('#hero img').getAttribute('src'),'assets/seating/'+code+'.jpg');
  await page.locator('#close').click();await page.getByRole('dialog').waitFor({state:'hidden'});
 }
 await check('Each of the 25 clicked tables opens its exact preview',async()=>assert.equal(codes.length,25));
 await page.locator('.table-tile[data-table="C7"]').click();
 await page.locator('#choose').click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await check('Explicit choice identifies C7 and highlights the selected tile',async()=>{assert.match(await page.locator('#selection').innerText(),/C7/);assert.equal(await page.locator('.table-tile[aria-pressed=true]').getAttribute('data-table'),'C7');});
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-room="r_common"]').click();
 await page.getByRole('dialog').waitFor();
 await picture();
 await check('Reduced motion disables optional effects',async()=>{assert.equal(await page.locator('dialog').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('#hero img').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');});
 await page.screenshot({path:artifacts+'/showcase-desktop.png'});
 await page.locator('dialog').evaluate(e=>e.scrollTop=120);
 await page.locator('#close').click();
 await page.setViewportSize({width:390,height:1000});
 await page.locator('[data-room=r_common]').click();await picture();
 assert.equal(await page.locator('dialog').evaluate(e=>e.scrollTop),0,'Reopening resets earlier scroll');
 assert.equal(await page.evaluate(()=>document.querySelector('#hero').getBoundingClientRect().top>=document.querySelector('.dialog-heading').getBoundingClientRect().bottom),true,'Sticky heading leaves the image visible');
 await page.screenshot({path:artifacts+'/showcase-mobile.png'});
 await page.locator('#close').click();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.table-tile[data-table=C3]').click();await picture();
 await check('Optional effects communicate opening and image changes',async()=>{assert.equal(await page.locator('dialog').evaluate(e=>getComputedStyle(e).animationName),'showcase-enter');assert.equal(await page.locator('#hero img').evaluate(e=>getComputedStyle(e).transitionDuration),'0.18s');});
 await page.locator('#hero img').evaluate(i=>i.src='assets/seating/missing-for-verification.jpg');
 await page.waitForFunction(()=>document.querySelector('#hero svg')!==null);
 await check('Missing image retains labelled layout and functioning controls',async()=>{assert.equal(await page.locator('#hero').getAttribute('aria-busy'),'false');assert.match(await page.locator('#image-caption').innerText(),/Picture unavailable/);assert.match(await page.locator('#hero svg').getAttribute('aria-label'),/4 seats/);});
 await axe('image fallback');
 await page.locator('#next').click();await page.locator('#next').click();await picture();
 await check('Rapid navigation ends at the current table and image',async()=>{assert.equal(await page.locator('#showcase-title').innerText(),'Table C5');assert.equal(await page.locator('#hero img').getAttribute('src'),'assets/seating/C5.jpg');});
 await page.locator('#close').focus();await page.keyboard.press('Tab');
 await check('Keyboard focus stays inside the modal',async()=>assert.equal(await page.evaluate(()=>document.querySelector('#showcase').contains(document.activeElement)),true));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.dataset.table==='C3');
 await check('Escape restores focus to the exact table opener',async()=>assert.equal(await page.locator('dialog').evaluate(e=>e.open),false));
 await check('No external requests or JavaScript errors',async()=>{assert.deepEqual(external,[]);assert.deepEqual(errors,[]);});
 console.log('Research concept: '+checks+' checks passed. No live booking integration.');
}finally{await context.close();await browser.close();}
