import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw Error('Use the isolated browser stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const browser=await chromium.launch();const errors=[],writes=[];let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:600},reducedMotion:'reduce'});page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{assert.equal(new URL(r.request().url()).origin,'http://127.0.0.1:18080');if(!['GET','HEAD'].includes(r.request().method()))writes.push(r.request().method());return r.continue();});
 await page.goto('http://127.0.0.1:18080/');await page.locator('.room-card[data-room-type=terrace]').click();await page.waitForFunction(()=>document.querySelector('.showcase-hero').getAttribute('aria-busy')==='false');
 const close=page.getByRole('button',{name:'Close table showcase',exact:true}),title=page.locator('#table-showcase-title');
 await check(width+'px Close stays visible while the table title scrolls away',async()=>{
  const before=await close.boundingBox(),titleBefore=await title.boundingBox();
  const amount=await page.evaluate(()=>{const s=document.querySelector('.showcase-scroll')||document.querySelector('#table-showcase');s.scrollTop=300;return s.scrollTop;});
  assert.ok(amount>100,'The test must actually scroll the dialog content');
  const after=await close.boundingBox(),titleAfter=await title.boundingBox();
  assert.ok(Math.abs(after.y-before.y)<1,'Close must stay in its reserved upper-right area');
  assert.ok(titleBefore.y-titleAfter.y>100,'The table title must scroll with content');
  const body=await page.locator('.showcase-scroll').boundingBox();assert.ok(after.y+after.height<=body.y+1,'Close must not cover the scrollable content');
  assert.ok(after.x>=0&&after.x+after.width<=width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check(width+'px Close and Escape both return keyboard focus to the opener',async()=>{
  await close.click();await page.waitForFunction(()=>document.activeElement?.dataset.roomType==='terrace');
  await page.locator('.room-card[data-room-type=terrace]').click();assert.equal(await page.locator('.showcase-scroll').evaluate(e=>e.scrollTop),0);
  await page.keyboard.press('Shift+Tab');assert.equal(await close.evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.dataset.roomType==='terrace');
 });await page.close();
}assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(`Showcase Close: ${checks} checks passed; no writes or JavaScript errors.`);
}finally{await browser.close();}
