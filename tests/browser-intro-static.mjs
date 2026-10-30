import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch();let checks=0;
try{
 const page=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'no-preference'});
 await page.goto('http://127.0.0.1:18080/');
 assert.equal(await page.locator('#intro-motion-toggle,.intro-credit').count(),0,'Requested motion button and hero credit must be removed');checks++;console.log('PASS Removed motion button and hero credit');
 await page.waitForFunction(()=>document.querySelector('.intro-backdrop img').naturalWidth>0);
 const sample=()=>page.locator('.intro-backdrop img').evaluate(e=>({transform:getComputedStyle(e).transform,animations:e.getAnimations().length,box:JSON.stringify(e.getBoundingClientRect())}));
 const first=await sample();await page.waitForTimeout(1500);assert.deepEqual(await sample(),first);assert.equal(first.animations,0);assert.equal(first.transform,'none');checks++;console.log('PASS Background stays static over time');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.ok(await page.getByRole('link',{name:'Continue to reservation'}).isVisible());checks++;console.log('PASS Static intro fits '+width+'px');
 }
 await page.getByRole('link',{name:'Continue to reservation'}).click();await page.waitForURL('**/reserve');assert.ok(await page.locator('#booking').isVisible());checks++;console.log('PASS Continue opens reservation');
 console.log(`Static intro: ${checks} checks passed.`);
}finally{await browser.close();}
