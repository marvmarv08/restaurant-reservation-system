import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const {default:AxeBuilder}=await import(pathToFileURL(process.env.AXE_MODULE).href);
const browser=await chromium.launch();const contexts=[];let checks=0;const errors=[],writes=[];
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function make(options={}){const c=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'no-preference',...options});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});return p;}
try{
 const p=await make();await p.goto('http://127.0.0.1:18080/');const toggle=p.getByRole('button',{name:'Pause garden animation'});
 await check('Garden lights visibly move while background and Continue stay fixed',async()=>{
  assert.ok(await toggle.isVisible(),'A usable garden-animation control must appear');
  await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
  const snapshot=()=>p.evaluate(()=>({mote:getComputedStyle(document.querySelector('.garden-mote')).transform,image:getComputedStyle(document.querySelector('.intro-backdrop img')).transform,button:JSON.stringify(document.querySelector('.intro-continue').getBoundingClientRect())}));
  const before=await snapshot();await p.waitForTimeout(900);const after=await snapshot();assert.notEqual(after.mote,before.mote);assert.equal(after.image,'none');assert.equal(after.button,before.button);
 });
 await check('Keyboard Pause freezes lights and persists after reload; Resume restores motion',async()=>{
  await toggle.focus();await p.keyboard.press('Enter');const light=p.locator('.garden-mote').first();const first=await light.evaluate(e=>getComputedStyle(e).transform);await p.waitForTimeout(300);assert.equal(await light.evaluate(e=>getComputedStyle(e).transform),first);
  await p.reload();assert.ok(await p.getByRole('button',{name:'Resume garden animation'}).isVisible());assert.equal(await p.locator('.garden-mote').first().evaluate(e=>e.getAnimations()[0].playState),'paused');
  await p.getByRole('button',{name:'Resume garden animation'}).click();await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await check('Offscreen hero stops animation and returns only when visible',async()=>{
  await p.evaluate(()=>scrollTo(0,document.querySelector('#about').offsetTop+50));await p.waitForFunction(()=>document.body.dataset.gardenRunning==='false');
  await p.evaluate(()=>scrollTo(0,0));await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await check('Hidden document suspends the garden and restores permitted motion',async()=>{
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.locator('.garden-mote').first().evaluate(e=>e.getAnimations()[0].playState),'paused');
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await check('Blocked preference storage does not break the pause control',async()=>{
  const blocked=await make();await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage blocked');};Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};});await blocked.goto('http://127.0.0.1:18080/');await blocked.getByRole('button',{name:'Pause garden animation'}).click();assert.ok(await blocked.getByRole('button',{name:'Resume garden animation'}).isVisible());await blocked.close();
 });
 await check('Reduced motion removes decorative animation and hides its control',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.querySelector('#garden-toggle').hidden);assert.equal(await p.locator('#garden-toggle').isVisible(),false);assert.equal(await p.locator('.garden-mote').first().evaluate(e=>e.getAnimations().length),0);
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await mkdir('/tmp/bella-garden',{recursive:true});
 for(const width of [1366,390,320])await check('Garden control fits without covering Continue and passes accessibility at '+width+'px',async()=>{
  await p.setViewportSize({width,height:900});await p.evaluate(()=>scrollTo(0,0));
  const a=await p.locator('#garden-toggle').boundingBox(),b=await p.locator('.intro-continue').boundingBox();assert.ok(a.width>=44&&a.height>=44);assert.ok(Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))===0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>v.id),[]);await p.screenshot({path:'/tmp/bella-garden/'+width+'.png'});
 });
 await check('No JavaScript and failed background leave a static, usable entry',async()=>{
  const nojs=await make({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:18080/');assert.equal(await nojs.locator('#garden-toggle').isVisible(),false);assert.equal(await nojs.locator('.intro-garden').isVisible(),false);assert.equal(await nojs.locator('.intro-continue').getAttribute('href'),'/reserve');
  const failed=await make();await failed.route('**/assets/images/intro/**',r=>r.abort());await failed.goto('http://127.0.0.1:18080/');await failed.locator('.intro-image-unavailable').waitFor();assert.equal(await failed.locator('#garden-toggle').isVisible(),false);assert.equal(await failed.locator('.intro-garden').isVisible(),false);
 });
 await check('Garden animation adds no video element, booking writes or browser errors',async()=>{assert.equal(await p.locator('video').count(),0);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);});
 console.log(`Garden ambience: ${checks} checks passed.`);
}finally{for(const c of contexts)await c.close();await browser.close();}
