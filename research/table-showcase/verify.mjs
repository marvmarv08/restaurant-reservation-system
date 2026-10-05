import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const { default: AxeBuilder } = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
import { mkdir } from 'node:fs/promises';
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
async function axe(name){const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],name);checks++;console.log('PASS accessibility '+name);}
try{
 await page.goto(base);await page.locator('.table-tile').last().waitFor();
 await check('Four clickable room cards and all 25 exact physical tables',async()=>{assert.equal(await page.locator('.room-card').count(),4);assert.equal(await page.locator('.table-tile').count(),25);});
 await axe('room cards and all tables');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await check('Room layout '+width+'px',async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false));
  await page.locator('[data-room="r_common"]').click();await page.getByRole('dialog').waitFor();
  await check('Click room opens C1 with 12 table thumbnails',async()=>{assert.equal(await page.locator('#showcase-title').innerText(),'Table C1');assert.equal(await page.locator('.thumbnail').count(),12);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);});
  await axe('table dialog '+width+'px');
  await page.getByRole('button',{name:'Next table',exact:true}).click();
  await check('Next shows C2 without choosing a table',async()=>{assert.equal(await page.locator('#showcase-title').innerText(),'Table C2');assert.match(await page.locator('#selection').innerText(),/No table chosen/);});
  await page.getByRole('button',{name:'From above',exact:true}).click();
  await check('Named top view preserves exact table',async()=>{assert.equal(await page.locator('#showcase-title').innerText(),'Table C2');assert.match(await page.locator('#image-caption').innerText(),/top-down/);});
  await page.getByRole('button',{name:'Room inspiration',exact:true}).click();
  await check('Reference photo loaded locally and identified as another venue',async()=>{assert.equal(await page.locator('#hero img').evaluate(i=>i.complete&&i.naturalWidth>0),true);assert.match(await page.locator('#image-caption').innerText(),/another venue/);});
  await page.locator('#close').focus();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement?.dataset.room==='r_common');
 }
 const codes=await page.locator('.table-tile').evaluateAll(nodes=>nodes.map(n=>n.dataset.table));
 for(const code of codes){
  await page.locator('.table-tile[data-table="'+code+'"]').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('#showcase-title').innerText(),'Table '+code);
  await page.locator('#close').click();await page.getByRole('dialog').waitFor({state:'hidden'});
 }
 await check('Each of the 25 clicked tables opens its exact preview',async()=>assert.equal(codes.length,25));
 await page.locator('.table-tile[data-table="C7"]').click();
 await page.locator('#choose').click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await check('Explicit choice identifies C7 without creating a booking',async()=>assert.match(await page.locator('#selection').innerText(),/C7/));
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-room="r_common"]').click();
 await page.getByRole('dialog').waitFor();
 await page.screenshot({path:artifacts+'/showcase-desktop.png'});
 await page.setViewportSize({width:390,height:1000});
 await page.screenshot({path:artifacts+'/showcase-mobile.png'});
 await check('No external requests or JavaScript errors',async()=>{assert.deepEqual(external,[]);assert.deepEqual(errors,[]);});
 console.log('Research concept: '+checks+' checks passed. No live booking integration.');
}finally{await context.close();await browser.close();}
