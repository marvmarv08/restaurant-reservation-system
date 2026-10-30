import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview only');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default:AxeBuilder}=await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const navPaths={about:'/#about',history:'/#history',rooms:'/reserve#rooms',menu:'/reserve#menu',booking:'/reserve#booking'};
const base='http://127.0.0.1:18080', artifacts='/tmp/bella-vista-b1';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let count=0;
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
async function check(name,fn){await fn();console.log('PASS '+name);count++;}
try{
 await page.goto(base);await page.locator('#intro-title').waitFor();
 await check('Prominent company content matches the supplied restaurant profile and full2021 history',async()=>{
  const about=await page.locator('#about').innerText(),history=await page.locator('#history').innerText();
  for(const text of ['premier farm-to-table restaurant','cozy, ambient, and modern dining experience','local Filipino comfort food and continental specialties','families, couples, and groups'])assert.ok(about.includes(text),text);
  for(const text of ['Bella Vista estate in 2021','initially catered exclusively to in-house guests','overwhelming public demand','signature dishes and scenic garden views','independent destination restaurant','exceptional customer service','academic project'])assert.ok(history.includes(text),text);
 });
 await check('Original emblem/banner are local accessible SVGs and favicon loads',async()=>{
  assert.equal(await page.locator('.site-header .bella-vista-mark').count(),1);
  for(const asset of ['bella-vista-mark.svg','bella-vista-banner.svg']){const response=await context.request.get(base+'/assets/brand/'+asset);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/image\/svg/);const svg=await response.text();assert.match(svg,/<title/);assert.doesNotMatch(svg, /<script|<image|(?:href|src)=["']https?:/i);}
  assert.equal(await page.locator('link[rel=icon]').getAttribute('href'),'/assets/brand/bella-vista-mark.svg');
 });
 for(const width of [768,820,1024,1280,1366,1440,390,320]){
  await page.setViewportSize({width,height:900});await page.goto(base);await page.locator('#intro-title').waitFor();
  await check('Company content and intro navigation fit '+width+'px',async()=>{
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const href of ['/#about','/manage','/reserve'])assert.ok(await page.locator('.site-header a[href="'+href+'"]').isVisible(),href);
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:artifacts+'/top-'+width+'.png'});
   for(const id of ['about','history']){const box=await page.locator('#'+id).boundingBox();assert.ok(box.width<=width);await page.locator('#'+id).screenshot({path:artifacts+'/'+id+'-'+width+'.png'});}
   await page.screenshot({path:artifacts+'/page-'+width+'.png'});
  });
  await check('Complete reservation navigation remains usable at '+width+'px',async()=>{
   await page.goto(base+'/reserve');await page.getByLabel('Date · Manila time').waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const id of ['about','history','rooms','menu','booking'])assert.ok(await page.locator('.site-header a[href="'+navPaths[id]+'"]').isVisible(),id);
  });
 }
 for(const width of [1366,390,320]){
  await page.setViewportSize({width,height:900});
  await check('Keyboard navigation reaches unobscured story and booking sections at '+width+'px',async()=>{
   for(const id of ['about','history','rooms','menu','booking']){
    await page.goto(base+'/reserve');await page.getByLabel('Date · Manila time').waitFor();
    const link=page.locator('.site-header a[href="'+navPaths[id]+'"]');await link.focus();await page.keyboard.press('Enter');await page.waitForURL(base+navPaths[id]);
    if(navPaths[id].startsWith('/reserve'))await page.waitForFunction(href=>document.querySelector('.site-header a[href="'+href+'"]')?.getAttribute('aria-current')==='location',navPaths[id]);
    await page.locator('#'+id).waitFor();
    const header=await page.locator('.site-header').boundingBox(),section=await page.locator('#'+id).boundingBox();assert.ok(section.y>=Math.max(0,header.y+header.height)-2,'Heading covered: '+id);assert.ok(section.y<900,'Anchor offscreen: '+id);
   }
  });
 }
 for(const width of [1366,320]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/#about');await page.locator('#about').waitFor();
  await check('Company sections and navigation pass accessibility at '+width+'px',async()=>{
   const result=await new AxeBuilder({page}).include('#about').include('#history').include('.site-header').analyze();assert.deepEqual(result.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})),[]);
   await page.goto(base+'/reserve');await page.getByLabel('Date · Manila time').waitFor();
   const reservation=await new AxeBuilder({page}).include('#about').include('#history').include('.site-header').analyze();assert.deepEqual(reservation.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})),[]);
  });
 }
 await check('Management and staff sign-in retain identity and working story links',async()=>{
  await page.goto(base+'/manage');await page.getByRole('heading',{name:/Your evening/}).waitFor();assert.equal(await page.locator('.site-header .bella-vista-mark').count(),1);await page.locator('.site-header a[href="/#history"]').click();await page.waitForURL('**/#history');assert.ok(await page.locator('#history').isVisible());
  await page.goto(base+'/staff/login');assert.equal(await page.locator('.staff-header .bella-vista-mark').count(),1);
 });
 await check('Existing booking search still returns actual table availability',async()=>{
  await page.goto(base+'/reserve');await page.getByLabel('Date · Manila time').waitFor();const catalog=(await(await context.request.get(base+'/api/catalog')).json()).catalog;let date=new Date(catalog.today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+42);while(date.getUTCDay()!==2)date.setUTCDate(date.getUTCDate()+1);
  await page.getByLabel('Date · Manila time').fill(date.toISOString().slice(0,10));await page.getByLabel('Guests',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Find a table',exact:true}).click();await page.locator('.table-picker').waitFor();assert.ok(await page.locator('[data-time]').count()>0);
 });
 await check('Consistent emblem and responsive headers across all protected workspaces',async()=>{
  await page.goto(base+'/staff/login');await page.locator('[name=email]').fill('b4-admin@lumina.test');await page.locator('[name=password]').fill('Isolated cart passphrase 2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/admin');
  for(const path of ['/admin','/server','/kitchen','/billing','/reports']){
   const response=await page.goto(base+path);assert.equal(response.status(),200,path);assert.equal(await page.locator('header .bella-vista-mark').count(),1,path);
   for(const width of [1366,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path+' '+width);await page.locator('body > header').screenshot({path:artifacts+'/header-'+path.slice(1)+'-'+width+'.png'});}
  }
 });
 await check('No browser JavaScript errors',async()=>assert.deepEqual(errors,[]));
 console.log('B1 branding browser: '+count+' checks passed.');
}finally{await browser.close();}
