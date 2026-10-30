import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Intro verification requires the isolated localhost preview.');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default:AxeBuilder}=await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const base='http://127.0.0.1:18080',artifacts='/tmp/bella-vista-intro';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
page.setDefaultTimeout(12000);
const errors=[],writes=[],outside=[],rootApi=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))errors.push(m.text());});
page.on('request',r=>{if(r.method()!=='GET'&&r.method()!=='HEAD')writes.push(r.method()+' '+new URL(r.url()).pathname);if(r.url().startsWith('http')&&new URL(r.url()).origin!==base)outside.push(r.url());});
let checks=0;const check=async(name,fn)=>{await fn();console.log('PASS '+name);checks++;};
const primary=()=>page.getByRole('link',{name:'Continue to reservation',exact:true}).first();
try{
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))rootApi.push(r.url());});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await check('Root is a useful restaurant introduction before the booking form',async()=>{
  assert.equal(await page.locator('body').getAttribute('data-page'),'intro');
  assert.match(await page.getByRole('heading',{level:1}).innerText(),/Good food\.[\s\S]*Better company\./);
  assert.equal(await primary().getAttribute('href'),'/reserve');assert.ok(await primary().isVisible());
  assert.equal(await page.locator('#flow').count(),0);
 });
 await check('Supplied company profile and 2021 history are available before reserving',async()=>{
  const about=await page.locator('#about').innerText(),history=await page.locator('#history').innerText();
  for(const text of ['farm-to-table','Filipino comfort food','continental specialties'])assert.ok(about.includes(text),text);
  for(const text of ['2021','in-house guests','independent destination restaurant','academic project'])assert.ok(history.includes(text),text);
 });
 await page.waitForLoadState('networkidle');
 await check('Intro loads local imagery without booking APIs, storage, or video bundles',async()=>{
  assert.deepEqual(rootApi,[]);assert.equal(await page.evaluate(()=>sessionStorage.getItem('lumina.guest.v1')),null);
  assert.equal(await page.locator('video').count(),0);assert.equal(await page.locator('script[src*="guest.js"]').count(),0);
  const image=page.locator('.intro-backdrop img');assert.equal(await image.getAttribute('loading'),'eager');assert.equal(await image.getAttribute('fetchpriority'),'high');
  assert.ok(await image.evaluate(i=>i.complete&&i.naturalWidth>0));
 });
 await check('Keyboard users have a visible skip link and a focused reservation link',async()=>{
  await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Skip to content');
  await primary().focus();assert.equal(await primary().evaluate(a=>getComputedStyle(a).outlineStyle),'solid');
 });
 for(const [width,height]of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  await check('Intro and CTA fit '+width+'px',async()=>{
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const box=await primary().boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);assert.ok(box.height>=44);
   if(width>=1280||width===390)assert.ok(box.y+box.height<=height,'Primary action should be visible without scrolling');
  });
  await page.screenshot({path:artifacts+'/intro-'+width+'.png',fullPage:true});
 }
 for(const width of [1366,320]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
  await check('Intro accessibility at '+width+'px',async()=>{const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);});
 }
 await check('Reduced motion preserves a stationary, immediately usable introduction',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.intro-copy').evaluate(e=>getComputedStyle(e).animationName),'none');
 });
 await page.setViewportSize({width:1366,height:768});await primary().focus();await page.keyboard.press('Enter');await page.waitForURL('**/reserve');
 await page.getByLabel('Date · Manila time').waitFor();
 await check('Continue opens the existing live reservation interface in one action',async()=>{
  assert.equal(await page.locator('body').getAttribute('data-page'),'guest');assert.ok(await page.getByRole('heading',{name:'Reserve a table',exact:true}).isVisible());
  assert.equal((await(await page.request.get(base+'/api/catalog')).json()).catalog.profile,'bella_vista_b2');
 });
 await page.reload();await page.getByLabel('Date · Manila time').waitFor();
 await check('Direct reservation reload bypasses the introduction',async()=>assert.equal(new URL(page.url()).pathname,'/reserve'));
 await page.locator('.site-header a[href="/reserve#rooms"]').click();
 await page.waitForFunction(()=>document.querySelector('.site-header a[href="/reserve#rooms"]')?.getAttribute('aria-current')==='location');
 await check('Reservation Rooms navigation stays on the correct page and highlights its section',async()=>{assert.equal(new URL(page.url()).pathname,'/reserve');assert.ok(await page.locator('.room-card').count()>0);});
 await page.locator('.site-header a[href="/reserve#menu"]').click();
 await page.waitForFunction(()=>document.querySelector('.site-header a[href="/reserve#menu"]')?.getAttribute('aria-current')==='location');
 await check('Reservation Menu navigation preserves the existing live catalogue',async()=>{assert.equal(new URL(page.url()).hash,'#menu');assert.ok(await page.locator('.menu-item').count()>0);});
 await page.locator('.site-header a[href="/#about"]').click();await page.waitForURL('**/#about');
 await check('Reservation About link returns to the introduction company content',async()=>assert.ok(await page.locator('#about').isVisible()));
 await page.goto(base+'/#menu');await page.waitForURL('**/reserve#menu');await page.locator('.menu-item').first().waitFor();
 await check('Older menu bookmarks continue directly to the existing menu',async()=>assert.ok(await page.locator('.menu-item').count()>0));
 await page.goto(base+'/#booking');await page.waitForURL('**/reserve#booking');await page.getByLabel('Date · Manila time').waitFor();
 await check('Older booking bookmarks bypass the intro without losing their target',async()=>assert.equal(new URL(page.url()).hash,'#booking'));
 await page.goto(base+'/?source=group-demo#rooms');await page.waitForURL('**/reserve?source=group-demo#rooms');
 await check('Bookmark forwarding preserves its query string and room target',async()=>{const url=new URL(page.url());assert.equal(url.searchParams.get('source'),'group-demo');assert.equal(url.hash,'#rooms');});
 await page.goto(base+'/manage');await page.getByRole('heading',{name:/Your evening/}).waitFor();
 await check('Private booking management remains directly reachable',async()=>assert.equal(new URL(page.url()).pathname,'/manage'));
 const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await fallback.route('**/assets/images/intro/*.webp',r=>r.abort('failed'));const failurePage=await fallback.newPage();await failurePage.goto(base);
 await check('Image failure leaves the introduction and native Continue link usable',async()=>{
  await failurePage.waitForFunction(()=>document.querySelector('.intro-hero').classList.contains('intro-image-unavailable'));
  assert.ok(await failurePage.getByRole('link',{name:'Continue to reservation',exact:true}).first().isVisible());assert.ok(await failurePage.getByRole('heading',{level:1}).isVisible());
 });await failurePage.screenshot({path:artifacts+'/image-fallback.png'});await fallback.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),nojsPage=await nojs.newPage();await nojsPage.goto(base);
 await check('No-JavaScript visitors can read the story and continue using a native link',async()=>{
  assert.ok(await nojsPage.locator('#history').isVisible());await nojsPage.getByRole('link',{name:'Continue to reservation',exact:true}).first().click();assert.equal(new URL(nojsPage.url()).pathname,'/reserve');await nojsPage.locator('noscript .feedback').waitFor({state:'visible'});assert.match(await nojsPage.locator('noscript .feedback').innerText(),/Enable JavaScript to use online reservations\./);
 });await nojs.close();
 await check('Intro and navigation introduce no writes, external resources, or JavaScript errors',async()=>{assert.deepEqual(writes,[]);assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);});
 console.log('Restaurant introduction: '+checks+' checks passed.');
}finally{await context.close();await browser.close();}
