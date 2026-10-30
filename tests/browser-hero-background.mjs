import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw Error('Use the isolated browser stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const browser=await chromium.launch(),base='http://127.0.0.1:18080',errors=[],writes=[];let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function open(options={},setup,path = '/reserve'){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',...options});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 await page.route('**/*',r=>{assert.equal(new URL(r.request().url()).origin,base);if(!['GET','HEAD'].includes(r.request().method()))writes.push(r.request().method());return r.continue();});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))errors.push(m.text());});
 if(setup)await setup(page);await page.goto(base+path,{timeout:30000});return page;
}
async function posterVisible(page){assert.equal(await page.locator('.hero-backdrop img').evaluate(e=>e.complete&&e.naturalWidth>0),true);assert.equal(await page.locator('#hero-dining-video').evaluate(v=>Number(getComputedStyle(v).opacity)),0);}
try{
 const page=await open(),video=page.locator('#hero-dining-video');
 await check('Whole hero plays a decorative silent video behind both heading and usable form',async()=>{
  assert.equal(await video.count(),1,'The full hero needs its own dining video');
  await page.waitForFunction(()=>{const v=document.querySelector('#hero-dining-video');return v.currentTime>0.2&&Number(getComputedStyle(v).opacity)===1;});
  assert.equal(await video.evaluate(v=>v.muted&&v.loop&&v.playsInline&&v.closest('[aria-hidden=true]')!==null&&Number(getComputedStyle(v).opacity)===1),true);
  const backdrop=await page.locator('.hero-backdrop').boundingBox();
  for(const selector of ['.hero-copy','.booking-card']){const b=await page.locator(selector).boundingBox();assert.ok(b.x>=backdrop.x&&b.x+b.width<=backdrop.x+backdrop.width+1);}
  await page.locator('select[name="party_size"]').selectOption('4');assert.equal(await page.locator('select[name="party_size"]').inputValue(),'4');
  assert.ok(await page.getByRole('button',{name:'Find a table',exact:true}).isEnabled());
 });
 await check('Form focus and hover keep the background moving without a pause control',async()=>{
  await page.locator('.booking-card').hover();await page.locator('select[name="party_size"]').focus();const t=await video.evaluate(v=>v.currentTime);await page.waitForTimeout(350);
  assert.equal(await video.evaluate(v=>v.paused),false);assert.notEqual(await video.evaluate(v=>v.currentTime),t);assert.equal(await page.getByRole('button',{name:/motion|pause/i}).count(),0);
 });
 await check('The delivered dining clip repeats after its end',async()=>{
  await video.evaluate(v=>v.currentTime=v.duration-.2);await page.waitForFunction(()=>document.querySelector('#hero-dining-video').currentTime<1);
 });
 await check('Offscreen hero stops decoding and resumes on return',async()=>{
  await page.locator('#menu').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#hero-dining-video').paused);
  await page.locator('.hero').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('#hero-dining-video').paused);
 });
 await check('Hidden document stops decoding and visible document resumes',async()=>{
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>document.querySelector('#hero-dining-video').paused);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>!document.querySelector('#hero-dining-video').paused);
 });
 await check('Changing reduced-motion preference switches to the still poster and resumes appropriately',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#hero-dining-video').paused);await page.waitForTimeout(250);await posterVisible(page);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.querySelector('#hero-dining-video').paused);
 });
 await check('Phones retain the full background and usable fields with no horizontal overflow',async()=>{
  const phone=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await phone.waitForFunction(()=>document.querySelector('#hero-dining-video').currentTime>0.2);
  await phone.locator('select[name="party_size"]').scrollIntoViewIfNeeded();await phone.locator('select[name="party_size"]').selectOption('4');assert.equal(await phone.locator('select[name="party_size"]').inputValue(),'4');
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await phone.getByRole('button',{name:'Find a table',exact:true}).isEnabled());await phone.context().close();
 });
 await check('Reduced-motion first visits keep the poster and never download the stream',async()=>{
  const reduced=await open({reducedMotion:'reduce'});assert.equal(await reduced.locator('#hero-dining-video').getAttribute('src'),null);await posterVisible(reduced);await reduced.context().close();
 });
 await check('Failed video download preserves the poster and booking controls',async()=>{
  const failed=await open({},p=>p.route('**/assets/videos/hero/*.mp4',r=>r.abort()));await failed.waitForFunction(()=>document.querySelector('#hero-dining-video').error!==null);await posterVisible(failed);
  assert.ok(await failed.getByRole('button',{name:'Find a table',exact:true}).isEnabled());await failed.context().close();
 });
 await check('Autoplay refusal retains the still background without breaking the form',async()=>{
  const blocked=await open({},p=>p.addInitScript(()=>{const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return this.id==='hero-dining-video'?Promise.reject(new DOMException('Autoplay blocked','NotAllowedError')):original.call(this);};}));
  await blocked.waitForFunction(()=>document.querySelector('#hero-dining-video').getAttribute('src')!==null);await blocked.waitForTimeout(250);await posterVisible(blocked);assert.ok(await blocked.getByRole('button',{name:'Find a table',exact:true}).isEnabled());await blocked.context().close();
 });
 await check('No JavaScript or visibility observer retains the poster without loading video',async()=>{
  for(const [options,setup] of [[{javaScriptEnabled:false},null],[{},p=>p.addInitScript(()=>{window.IntersectionObserver=undefined;})]]){
   const staticPage=await open(options,setup);assert.equal(await staticPage.locator('#hero-dining-video').getAttribute('src'),null);await posterVisible(staticPage);await staticPage.context().close();
  }
 });
 await check('Booking management does not load a hidden hero stream',async()=>{
  const manage=await open({},null,'/manage');assert.equal(await manage.locator('#hero-dining-video').getAttribute('src'),null);await manage.context().close();
 });
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(`Hero background: ${checks} checks passed; no external requests, mutations or JavaScript/CSP errors.`);
}finally{await browser.close();}
