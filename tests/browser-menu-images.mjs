import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if (process.env.BOOKING_TEST_MODE !== 'isolated') throw new Error('Use the isolated preview.');
const {chromium} = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const {default: AxeBuilder} = await import(pathToFileURL(resolve(process.env.AXE_MODULE)).href);
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
const page = await context.newPage();
const errors=[],writes=[];let checks=0;
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
const dialog=page.locator('#menu-photo-dialog');
try {
 await page.goto('http://127.0.0.1:18080/reserve#menu');
 await page.locator('.menu-item').first().waitFor();
 const thumb=page.locator('.menu-item .menu-image').first();
 const name=await page.locator('.menu-item h3').first().textContent();
 await check('Menu photo opens a larger uncropped image with the correct dish name',async()=>{
  await thumb.click();
  assert.equal(await dialog.isVisible(),true,'Clicking the menu photo must open its image viewer');
  assert.equal(await dialog.locator('h2').textContent(),name);
  await page.waitForFunction(()=>document.querySelector('#menu-photo-dialog img')?.naturalWidth>0);
  const full=await dialog.locator('img').boundingBox(),small=await thumb.boundingBox();
  assert.ok(full.width>small.width*2&&full.height>small.height*2);
  assert.equal(await dialog.locator('img').evaluate(e=>getComputedStyle(e).objectFit),'contain');
  assert.equal(await dialog.locator('img').getAttribute('src'),await thumb.locator('img').getAttribute('src'));
 });
 await check('Modal traps keyboard focus and Escape restores photo focus and scroll',async()=>{
  const y=await page.evaluate(()=>scrollY);
  for(let i=0;i<4;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(e=>e.contains(document.activeElement)));}
  await page.keyboard.press('Escape');
  assert.equal(await dialog.isVisible(),false);
  assert.ok(await thumb.evaluate(e=>e===document.activeElement));
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<2);
  await page.keyboard.press('Enter');assert.equal(await dialog.isVisible(),true);
  await dialog.getByRole('button',{name:'Close photo'}).click();
 });
 await check('Clicking the image keeps it open; clicking the backdrop closes it',async()=>{
  await thumb.click();await dialog.locator('img').click();assert.equal(await dialog.isVisible(),true);
  await page.mouse.click(2,2);assert.equal(await dialog.isVisible(),false);
 });
 await check('New category photos and the featured photo retain enlargement behavior',async()=>{
  await page.locator('#menu-categories button').last().click();
  const next=page.locator('.menu-item .menu-image').first();await next.click();
  assert.equal(await dialog.locator('h2').textContent(),await page.locator('.menu-item h3').first().textContent());
  await page.keyboard.press('Escape');
  await page.locator('#signature-dish .menu-image').click();
  assert.equal(await dialog.locator('h2').textContent(),await page.locator('#signature-title').textContent());
  await page.keyboard.press('Escape');
 });
 await mkdir('/tmp/bella-menu-images',{recursive:true});
 for(const width of [1366,390,320])await check('Image viewer fits and passes accessibility at '+width+'px',async()=>{
  await page.setViewportSize({width,height:800});await page.locator('.menu-item .menu-image').first().click();
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=801);
  const close=await dialog.getByRole('button',{name:'Close photo'}).boundingBox();assert.ok(close.height>=44&&close.width>=44);
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>v.id),[]);
  await page.screenshot({path:'/tmp/bella-menu-images/viewer-'+width+'.png'});
  await page.keyboard.press('Escape');
 });
 await check('A failed preview reports the failure and remains dismissible',async()=>{
  await page.route('**/assets/images/**',route=>route.abort());
  await page.locator('.menu-item .menu-image').first().click();
  await page.waitForFunction(()=>!document.querySelector('#menu-photo-error').hidden);
  assert.ok(await dialog.getByText('Photo unavailable. Please try again later.').isVisible());
  await dialog.getByRole('button',{name:'Close photo'}).click();assert.equal(await dialog.isVisible(),false);
 });
 await check('Viewing images creates no booking writes or browser errors',async()=>{assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);});
 console.log(`Menu image viewer: ${checks} checks passed.`);
}finally{await context.close();await browser.close();}
