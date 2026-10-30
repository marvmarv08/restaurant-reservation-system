import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch();let checks=0;const contexts=[],errors=[],writes=[];
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function open(options={}){const c=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'no-preference',...options});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});await p.goto('http://127.0.0.1:18080/reserve');await p.locator('.menu-item').first().waitFor();await p.waitForFunction(()=>document.querySelector('#hero-dining-video').currentTime>.2);return p;}
async function wheel(p,dy=12){await p.mouse.move(500,450);await p.mouse.wheel(0,dy);}
try{
 const p=await open();const hero=p.locator('#hero-dining-video');
 await check('Hero playback continues during scrolling without changing the form or poster',async()=>{
  await p.locator('select[name=party_size]').selectOption('4');const start=await hero.evaluate(v=>v.currentTime);
  for(let i=0;i<5;i++){await wheel(p,12);await p.waitForTimeout(45);assert.equal(await hero.evaluate(v=>v.paused),false,'Visible hero must keep playing during scrolling');}
  assert.notEqual(await hero.evaluate(v=>v.currentTime),start);assert.equal(await p.locator('.hero-backdrop').getAttribute('data-playing'),'true');assert.equal(await p.locator('select[name=party_size]').inputValue(),'4');
 });
 await check('Visible hero keeps playing after scrolling settles',async()=>{const t=await hero.evaluate(v=>v.currentTime);await p.waitForTimeout(250);assert.equal(await hero.evaluate(v=>v.paused),false);assert.notEqual(await hero.evaluate(v=>v.currentTime),t);});
 await check('Scrolls within the same section do not rewrite navigation attributes',async()=>{
  await p.evaluate(()=>{window.navWrites=0;new MutationObserver(rows=>window.navWrites+=rows.filter(r=>r.attributeName==='aria-current').length).observe(document.querySelector('.site-header'),{subtree:true,attributes:true});});
  for(let i=0;i<8;i++){await wheel(p,i<4?10:-10);await p.waitForTimeout(20);}
  assert.equal(await p.evaluate(()=>window.navWrites),0);
 });
 await check('Offscreen and reduced-motion heroes remain paused',async()=>{
  await p.evaluate(()=>scrollTo({top:document.querySelector('#menu').offsetTop,behavior:'instant'}));await p.waitForTimeout(350);assert.equal(await hero.evaluate(v=>v.paused),true);
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(350);assert.equal(await hero.evaluate(v=>v.paused),true);
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>!document.querySelector('#hero-dining-video').paused);
 });
 await check('Gallery, chef video and entrances continue during scrolling',async()=>{
  await p.evaluate(()=>scrollTo({top:document.querySelector('#food-showcase').offsetTop,behavior:'instant'}));await p.waitForTimeout(40);
  assert.ok(await p.locator('.food-copy').evaluate(e=>e.getAnimations({subtree:true}).some(a=>a.id.startsWith('guest-')&&a.playState==='running')),'Section entrances stay enabled during scroll');
  await p.waitForFunction(()=>!document.querySelector('#food-cooking-video').paused);const start=await p.locator('#food-cooking-video').evaluate(v=>v.currentTime);const before=await p.locator('.food-track').first().evaluate(e=>getComputedStyle(e).transform);
  for(let i=0;i<4;i++){await wheel(p,8);await p.waitForTimeout(45);assert.equal(await p.locator('#food-cooking-video').evaluate(v=>v.paused),false);}
  assert.notEqual(await p.locator('#food-cooking-video').evaluate(v=>v.currentTime),start);assert.notEqual(await p.locator('.food-track').first().evaluate(e=>getComputedStyle(e).transform),before);assert.ok(await p.locator('.food-track').evaluateAll(nodes=>nodes.every(e=>getComputedStyle(e).animationPlayState==='running')));
 });
 await check('Hidden page still pauses decorative media',async()=>{
  await wheel(p,12);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(350);assert.equal(await p.locator('#food-cooking-video').evaluate(v=>v.paused),true);
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>!document.querySelector('#food-cooking-video').paused);
 });
 await check('Phone scrolling preserves continuous visible video and usable fields',async()=>{
  const phone=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await phone.evaluate(()=>scrollBy({top:60,behavior:'instant'}));await phone.waitForTimeout(40);assert.equal(await phone.locator('#hero-dining-video').evaluate(v=>v.paused),false);await phone.waitForFunction(()=>!document.querySelector('#hero-dining-video').paused);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check('Scroll optimization creates no booking writes or browser errors',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);});
 console.log(`Reservation scrolling: ${checks} checks passed.`);
}finally{for(const c of contexts)await c.close();await browser.close();}
