import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw Error('Use the isolated browser stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const browser=await chromium.launch();const base='http://127.0.0.1:18080';let checks=0;const errors=[],writes=[];
async function check(name,work){await work();checks++;console.log('PASS '+name);}
async function open(options={}){
 const page=await browser.newPage({viewport:{width:1440,height:600},reducedMotion:'no-preference',...options});page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);
 await page.route('**/*',r=>{assert.equal(new URL(r.request().url()).origin,base);if(!['GET','HEAD'].includes(r.request().method()))writes.push(r.request().method());return r.continue();});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.roomMotionCalls=[];window.crossfadeCalls=[];window.freezeRoomMotion=true;window.freezeCrossfade=true;
  const native=Element.prototype.animate;
  Element.prototype.animate=function(frames,timing){
   const animation=native.call(this,frames,timing);
   if(this.matches('.room-art')){window.roomMotionCalls.push({target:this,animation,frames,timing});if(window.freezeRoomMotion)animation.pause();}
   if(this.matches('.showcase-image-outgoing')){window.crossfadeCalls.push({target:this,animation,frames,timing});if(window.freezeCrossfade)animation.pause();}
   return animation;
  };
 });
 await page.goto(base + '/reserve');await page.locator('.room-card').last().waitFor();return page;
}
async function picture(page){await page.waitForFunction(()=>document.querySelector('.showcase-hero')?.getAttribute('aria-busy')==='false'&&document.querySelector('.showcase-hero img')?.complete&&document.querySelector('.showcase-hero img')?.naturalWidth>0);}
async function gate(page,file){let release,entered;const blocked=new Promise(r=>release=r),started=new Promise(r=>entered=r);const pattern='**/assets/images/table-showcase/'+file;await page.route(pattern,async r=>{const response=await r.fetch();entered();await blocked;await r.fulfill({response});});return {started,finish:async()=>{release();await page.unroute(pattern);}};}
try{
 if(process.env.ONLY_MOTION_CHECK!=='crossfade'){
  const page=await open();
  await check('Room photos reveal once on entering view without hiding their buttons',async()=>{
   assert.equal(await page.evaluate(()=>roomMotionCalls.length),0);
   await page.locator('#room-cards').scrollIntoViewIfNeeded();await page.waitForFunction(()=>roomMotionCalls.length===4);
   assert.equal(await page.evaluate(()=>roomMotionCalls.every(c=>c.timing.duration===220&&c.frames[0].transform==='translateY(6px)')),true);
   assert.equal(await page.locator('.room-card:enabled').count(),4);
   await page.locator('#booking').scrollIntoViewIfNeeded();await page.locator('#room-cards').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>roomMotionCalls.length),4);
  });
  await check('Room-card keyboard opening and Escape work during a paused reveal',async()=>{
   const card=page.locator('.room-card[data-room-type=vip]');await card.focus();await page.keyboard.press('Enter');await picture(page);
   assert.equal(await page.locator('#table-showcase-title').innerText(),'Table V1');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.dataset.roomType==='vip');
  });
  await check('Reduced motion cancels visible reveals and preserves complete room content',async()=>{
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>[...document.querySelectorAll('.room-art')].flatMap(e=>e.getAnimations()).length===0);assert.equal(await page.locator('.room-art').evaluateAll(es=>es.flatMap(e=>e.getAnimations()).length),0);assert.equal(await page.locator('.room-card:enabled').count(),4);
  });await page.close();
 }
 const page=await open();const delayed=await gate(page,'V2.jpg');await page.locator('.room-card[data-room-type=vip]').click();await picture(page);
 await page.getByRole('button',{name:'Next table',exact:true}).click();await delayed.started;
 await check('Previous table picture remains visible while the next picture is loading',async()=>{
  assert.equal(await page.locator('.showcase-hero').getAttribute('aria-busy'),'true');assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/V1.jpg$/);
  assert.equal(await page.locator('.showcase-hero img').evaluate(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).opacity==='1'),true);
  assert.match(await page.locator('.showcase-hero + p').innerText(),/^V1/);
 });await delayed.finish();await picture(page);
 await check('Ready image overlaps the previous picture in a 180ms crossfade',async()=>{
  assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/V2.jpg$/);assert.match(await page.locator('.showcase-hero + p').innerText(),/^V2/);
  assert.equal(await page.locator('.showcase-image-outgoing').count(),1);assert.match(await page.locator('.showcase-image-outgoing').evaluate(e=>e.style.backgroundImage),/V1.jpg/);
  assert.equal(await page.evaluate(()=>crossfadeCalls.at(-1).timing.duration),180);assert.equal(await page.locator('.showcase-image-outgoing').getAttribute('aria-hidden'),'true');
 });
 await check('Quick table changes discard old fades and keep the latest picture',async()=>{
  await page.getByRole('button',{name:'Next table',exact:true}).click();await picture(page);assert.equal(await page.locator('.showcase-image-outgoing').count(),1);
  assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/V3.jpg$/);assert.equal(await page.evaluate(()=>crossfadeCalls.filter(c=>c.animation.playState==='paused').length),1);
 });
 await check('A naturally completed fade removes its decorative layer',async()=>{
  await page.evaluate(()=>crossfadeCalls.at(-1).animation.play());await page.waitForFunction(()=>!document.querySelector('.showcase-image-outgoing'));
  assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/V3.jpg$/);
  await page.getByRole('button',{name:'Previous table',exact:true}).click();await picture(page);assert.equal(await page.locator('.showcase-image-outgoing').count(),1);
 });
 await check('Changing reduced motion ends an active crossfade immediately',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.showcase-image-outgoing'));assert.equal(await page.locator('.showcase-image-outgoing').count(),0);assert.match(await page.locator('.showcase-hero img').getAttribute('src'),/V2.jpg$/);
  await page.getByRole('button',{name:'Previous table',exact:true}).click();await picture(page);assert.equal(await page.locator('.showcase-image-outgoing').count(),0);
 });
 await check('Image failure preserves a seating fallback and usable navigation',async()=>{
  await page.locator('.showcase-hero img').evaluate(e=>e.src='/assets/images/table-showcase/motion-unavailable.jpg');await page.locator('.showcase-hero svg').waitFor();assert.ok(await page.getByRole('button',{name:'Next table',exact:true}).isEnabled());
 });await page.keyboard.press('Escape');
 await check('Phone room previews fit and keep immediate keyboard/dialog access',async()=>{
  const phone=await open({viewport:{width:390,height:844}});await phone.locator('.room-card[data-room-type=terrace]').click();await picture(phone);
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await phone.keyboard.press('Escape');await phone.close();
 });
 await check('Closing during loading blocks old images from appearing in another room',async()=>{
  const closing=await open();const old=await gate(closing,'V2.jpg');
  await closing.locator('.room-card[data-room-type=vip]').click();await picture(closing);
  await closing.getByRole('button',{name:'Next table',exact:true}).click();await old.started;await closing.keyboard.press('Escape');
  await closing.locator('.room-card[data-room-type=terrace]').click();await picture(closing);await old.finish();await closing.waitForTimeout(200);
  assert.match(await closing.locator('.showcase-hero img').getAttribute('src'),/T1.jpg$/);assert.equal(await closing.locator('.showcase-image-outgoing').count(),0);await closing.close();
 });
 await page.close();assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(`Room motion: ${checks} checks passed; no writes or JavaScript errors.`);
}finally{await browser.close();}
