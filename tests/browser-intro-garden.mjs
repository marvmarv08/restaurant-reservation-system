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
 const p=await make();await p.goto('http://127.0.0.1:18080/');
 await check('Garden lights visibly move while background and Continue stay fixed',async()=>{
  assert.equal(await p.locator('#garden-toggle').count(),0,'The screenshot-selected Pause button must be removed');
  await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
  const snapshot=()=>p.evaluate(()=>({mote:getComputedStyle(document.querySelector('.garden-mote')).transform,image:getComputedStyle(document.querySelector('.intro-backdrop img')).transform,button:JSON.stringify(document.querySelector('.intro-continue').getBoundingClientRect())}));
  const before=await snapshot();await p.waitForTimeout(900);const after=await snapshot();assert.notEqual(after.mote,before.mote);assert.equal(after.image,'none');assert.equal(after.button,before.button);
 });
 await check('Old stored pause preference cannot silently disable motion after control removal',async()=>{
  await p.evaluate(()=>localStorage.setItem('bellaVista.intro.garden.v1','paused'));await p.reload();await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');assert.equal(await p.locator('#garden-toggle').count(),0);
 });
 await check('Offscreen hero stops animation and returns only when visible',async()=>{
  await p.evaluate(()=>scrollTo(0,document.querySelector('#about').offsetTop+50));await p.waitForFunction(()=>document.body.dataset.gardenRunning==='false');
  await p.evaluate(()=>scrollTo(0,0));await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await check('Hidden document suspends the garden and restores permitted motion',async()=>{
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.locator('.garden-mote').first().evaluate(e=>e.getAnimations()[0].playState),'paused');
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await check('Blocked storage leaves the control-free garden running',async()=>{
  const blocked=await make();await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage blocked');};Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};});await blocked.goto('http://127.0.0.1:18080/');await blocked.waitForFunction(()=>document.body.dataset.gardenRunning==='true');await blocked.close();
 });
 await check('Reduced motion removes decorative animation and hides its control',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.body.dataset.gardenRunning==='false');assert.equal(await p.locator('#garden-toggle').isVisible(),false);assert.equal(await p.locator('.garden-mote').first().evaluate(e=>e.getAnimations().length),0);
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>document.body.dataset.gardenRunning==='true');
 });
 await mkdir('/tmp/bella-garden',{recursive:true});
 for(const width of [1366,390,320])await check('Control-free garden keeps Continue clear and passes accessibility at '+width+'px',async()=>{
  await p.setViewportSize({width,height:900});await p.evaluate(()=>scrollTo(0,0));
  assert.equal(await p.locator('#garden-toggle').count(),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>v.id),[]);await p.screenshot({path:'/tmp/bella-garden/'+width+'.png'});
 });
 await check('No JavaScript and failed background leave a static, usable entry',async()=>{
  const nojs=await make({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:18080/');assert.equal(await nojs.locator('#garden-toggle').isVisible(),false);assert.equal(await nojs.locator('.intro-garden').isVisible(),false);assert.equal(await nojs.locator('.intro-continue').getAttribute('href'),'/reserve');
  const failed=await make();await failed.route('**/assets/images/intro/**',r=>r.abort());await failed.goto('http://127.0.0.1:18080/');await failed.locator('.intro-image-unavailable').waitFor();assert.equal(await failed.locator('#garden-toggle').isVisible(),false);assert.equal(await failed.locator('.intro-garden').isVisible(),false);
 });
 await check('Garden animation adds no video element, booking writes or browser errors',async()=>{assert.equal(await p.locator('video').count(),0);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);});
 console.log(`Garden ambience: ${checks} checks passed.`);
}finally{for(const c of contexts)await c.close();await browser.close();}
