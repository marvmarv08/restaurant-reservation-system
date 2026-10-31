import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const {default:AxeBuilder}=await import(pathToFileURL(process.env.AXE_MODULE).href);
const browser=await chromium.launch();let checks=0;const errors=[],writes=[];
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
try{
 const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});await page.goto('http://127.0.0.1:18080/#about');
 await check('About uses a matching restaurant photo fan without unrelated decoration',async()=>{
  assert.equal(await page.locator('#about .restaurant-gallery img').count(),10,'About should have ten coherent restaurant views');
  assert.equal(await page.locator('#about .story-food,#about .story-seal').count(),0);
  assert.match(await page.locator('#about .restaurant-gallery img').first().getAttribute('src'),/images\/intro\/garden-interior-concept/);
  const images=page.locator('.restaurant-gallery img,.history-scene img');await images.evaluateAll(nodes=>nodes.forEach(e=>e.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('.restaurant-gallery img,.history-scene img')].every(e=>e.complete&&e.naturalWidth>0));assert.equal(await images.count(),11);
 });
 await check('Visual timeline keeps original company facts without invented later dates',async()=>{
  assert.equal(await page.locator('.story-timeline li').count(),2);
  const history=await page.locator('#history').innerText();for(const text of ['2021','in-house guests','independent destination restaurant','academic project'])assert.ok(history.includes(text));
  assert.equal(await page.locator('#about .company-links a').first().getAttribute('href'),'/reserve#menu');assert.equal(await page.locator('#history .button').getAttribute('href'),'/reserve');
 });
 await mkdir('/tmp/bella-intro-story',{recursive:true});
 for(const width of [1440,1024,768,390,320])await check('Story sections reflow and pass accessibility at '+width+'px',async()=>{
  await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const caption=await page.locator('.gallery-caption').boundingBox(),photo=await page.locator('.photo-fan-card[aria-current=true] img').boundingBox();
  assert.ok(caption.y>=photo.y+photo.height-1,'Small caption belongs below the photo without overlap');
  for(const id of ['about','history']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.locator('#'+id).screenshot({path:`/tmp/bella-intro-story/${id}-${width}.png`});}
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
 });
 await check('Image notes disclose concept provenance without stale stock-photo attribution',async()=>{
  const credits=page.locator('.story-photo-credits');await credits.locator('summary').click();assert.ok(await credits.getByText(/AI-generated concept/).isVisible());assert.equal(await credits.locator('a').count(),0);
 });
 await check('Failed decorative photos leave the story and reservation links readable',async()=>{
  const failed=await browser.newPage({viewport:{width:320,height:800}});await failed.route('**/assets/images/**',r=>r.abort());await failed.goto('http://127.0.0.1:18080/#history');assert.ok(await failed.locator('.history-copy').isVisible());assert.ok(await failed.getByRole('link',{name:'Find your table'}).isVisible());assert.ok(await failed.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await failed.close();
 });
 await check('Story redesign creates no booking writes or browser errors',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);});
 console.log(`Intro story design: ${checks} checks passed.`);
}finally{await browser.close();}
