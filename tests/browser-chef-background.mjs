import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw Error('Use the isolated browser stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const browser=await chromium.launch();const base='http://127.0.0.1:18080';const errors=[],writes=[];let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function open(options={}){
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',...options});const page=await context.newPage();page.setDefaultTimeout(10000);
 await page.route('**/*',r=>{assert.equal(new URL(r.request().url()).origin,base);if(!['GET','HEAD'].includes(r.request().method()))writes.push(r.request().method());return r.continue();});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))errors.push(m.text());});await page.goto(base);return page;
}
try{
 const page=await open({viewport:{width:1440,height:600}});const video=page.locator('#food-cooking-video');
 await check('Chef background is decorative, muted and deferred before the showcase is visible',async()=>{
  assert.equal(await video.count(),1);assert.equal(await video.getAttribute('src'),null);
  assert.equal(await video.evaluate(v=>v.muted&&v.loop&&v.playsInline&&v.closest('[aria-hidden=true]')!==null),true);
 });
 await check('Visible background plays locally while the existing text and menu link remain usable',async()=>{
  await page.locator('.food-copy').scrollIntoViewIfNeeded();await page.mouse.move(0,0);
  await page.waitForFunction(()=>document.querySelector('#food-cooking-video').currentTime>0.1);
  assert.ok(await page.getByRole('heading',{name:'A taste of the evening.'}).isVisible());
  assert.ok(await page.locator('.food-copy').getByRole('link',{name:'Explore the menu',exact:true}).isEnabled());
  assert.match(await video.getAttribute('src'),/^\/assets\/videos\/food-showcase\//);
 });
 await check('Chef video keeps playing during gallery hover and focus without a pause control',async()=>{
  assert.equal(await page.getByRole('button',{name:/motion/}).count(),0);
  await page.locator('.food-gallery').hover();await page.locator('.food-gallery').focus();
  const before=await video.evaluate(v=>v.currentTime);await page.waitForTimeout(300);
  assert.equal(await video.evaluate(v=>v.paused),false);assert.notEqual(await video.evaluate(v=>v.currentTime),before);
 });
 await check('The silent clip actually loops after its end',async()=>{
  await video.evaluate(v=>v.currentTime=v.duration-0.2);await page.waitForFunction(()=>document.querySelector('#food-cooking-video').currentTime<1);
 });
 await check('Reduced motion and offscreen states stop the background video',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#food-cooking-video').paused);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#menu').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#food-cooking-video').paused);
 });
 await check('Phones retain readable copy, inline video and a horizontal photo gallery',async()=>{
  const mobile=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await mobile.locator('.food-copy').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(()=>document.querySelector('#food-cooking-video').currentTime>0.1);
  assert.equal(await mobile.locator('.food-gallery').evaluate(e=>getComputedStyle(e).display),'flex');
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await mobile.context().close();
 });
 await check('Reduced-motion first visits never request the video stream',async()=>{
  const reduced=await open({reducedMotion:'reduce'});await reduced.locator('.food-copy').scrollIntoViewIfNeeded();
  assert.equal(await reduced.locator('#food-cooking-video').getAttribute('src'),null);await reduced.context().close();
 });
 await check('Unavailable video falls back to the poster without breaking booking or menu controls',async()=>{
  const failed=await open({viewport:{width:1440,height:600}});await failed.route('**/assets/videos/food-showcase/*.mp4',r=>r.abort());await failed.locator('.food-copy').scrollIntoViewIfNeeded();
  await failed.waitForFunction(()=>document.querySelector('#food-cooking-video').hidden);
  assert.ok(await failed.locator('.food-copy').getByRole('link',{name:'Explore the menu',exact:true}).isEnabled());await failed.locator('#booking').scrollIntoViewIfNeeded();assert.ok(await failed.getByRole('button',{name:'Find a table',exact:true}).isEnabled());await failed.context().close();
 });
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(`Chef background: ${checks} checks passed; no external requests, mutations or JavaScript/CSP errors.`);
}finally{await browser.close();}
