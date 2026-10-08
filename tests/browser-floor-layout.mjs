import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw Error('Use the isolated browser stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const browser=await chromium.launch(),base='http://127.0.0.1:18080',errors=[];let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{assert.equal(new URL(r.request().url()).origin,base);assert.ok(['GET','HEAD'].includes(r.request().method()));return r.continue();});
 await page.goto(base,{timeout:30000});const catalog=(await(await page.request.get(base+'/api/catalog')).json()).catalog;
 const d=new Date();d.setUTCDate(d.getUTCDate()+42);while(d.getUTCDay()!==2)d.setUTCDate(d.getUTCDate()+1);const day=d.toISOString().slice(0,10);
 await page.getByLabel('Date · Manila time').fill(day);await page.getByRole('button',{name:'Find a table',exact:true}).click();await page.locator('.floor-table').first().waitFor();
 await check('All 25 tables fit inside their assigned rooms, including G3',async()=>{
  assert.equal(await page.locator('.floor-table').count(),25);
  const bounds=await page.evaluate(()=>{const rect=e=>{const {x,y,width,height}=e.getBBox();return {x,y,width,height};};return {rooms:[...document.querySelectorAll('.floor-room')].map(rect),tables:[...document.querySelectorAll('.floor-table')].map(e=>({code:e.dataset.table,...rect(e)}))};});
  for(const t of catalog.tables){const r=bounds.rooms[catalog.rooms.findIndex(r=>Number(r.id)===Number(t.room_id))],b=bounds.tables.find(b=>b.code===t.code);assert.ok(b.x>=r.x&&b.y>=r.y&&b.x+b.width<=r.x+r.width&&b.y+b.height<=r.y+r.height,t.code+' must stay inside its room');}
  for(let i=0;i<bounds.tables.length;i++)for(let j=i+1;j<bounds.tables.length;j++){const a=bounds.tables[i],b=bounds.tables[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,a.code+' must not overlap '+b.code);}
 });
 await check('Preview explains conceptual entrance, aisles and selected table location',async()=>{
  assert.ok(await page.locator('.floor').getByText('Entrance',{exact:true}).count());assert.ok(await page.locator('.floor-guide').count());
  await page.locator('.floor-table[data-table=G3]').click();await page.waitForFunction(()=>document.querySelector('.showcase-hero')?.getAttribute('aria-busy')==='false');
  assert.match(await page.locator('.showcase-location').innerText(),/Long Room.*lower/i);assert.equal(await page.locator('.showcase-position-map .is-current').count(),1);assert.match(await page.locator('.showcase-room-map').getAttribute('aria-label'),/G3.*Long Room/);await page.getByRole('button',{name:'Close table showcase',exact:true}).click();
 });
 await check('Every existing table still opens its own preview with a position explanation',async()=>{
  for(const t of catalog.tables){await page.locator('.floor-table[data-table="'+t.code+'"]').click();assert.equal(await page.locator('#table-showcase-title').innerText(),'Table '+t.code);assert.ok((await page.locator('.showcase-location').innerText()).length>20);await page.getByRole('button',{name:'Close table showcase',exact:true}).click();}
 });
 await check('Tall Terrace preview retains readable table-code text',async()=>{
  await page.locator('.floor-table[data-table=T6]').click();
  const renderedSize=await page.locator('.showcase-room-map .floor-code').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a);
  assert.ok(renderedSize>=10,'Terrace preview labels must remain readable, got '+renderedSize);await page.getByRole('button',{name:'Close table showcase',exact:true}).click();
 });
 await check('Floor plan remains legible and contained on desktop and small phones',async()=>{
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});await page.locator('.floor').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify(await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,ancestors:[...document.querySelectorAll('.booking-card,fieldset,.floor-viewport,.floor')].map(e=>({tag:e.tagName,cls:e.className.baseVal??e.className,width:e.getBoundingClientRect().width,minWidth:getComputedStyle(e).minWidth}))}))));const b=await page.locator('.floor-viewport').boundingBox();assert.ok(b.width<=width&&b.height>=190,JSON.stringify({width,b}));if(width<760)assert.ok(await page.locator('.floor-viewport').evaluate(e=>e.scrollWidth>e.clientWidth));}
 });
 await check('A phone can pan to Terrace and open the exact table position',async()=>{
  await page.setViewportSize({width:390,height:844});await page.locator('.floor-viewport').evaluate(e=>e.scrollLeft=e.scrollWidth);
  await page.locator('.floor-table[data-table=T6]').click();assert.equal(await page.locator('#table-showcase-title').innerText(),'Table T6');
  assert.match(await page.locator('.showcase-room-map').getAttribute('aria-label'),/T6.*Terrace/);assert.equal(await page.locator('.showcase-position-map .is-current').count(),1);
  const size=await page.locator('.showcase-room-map .floor-code').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a);assert.ok(size>=10);
  await page.getByRole('button',{name:'Close table showcase',exact:true}).click();
 });
 assert.deepEqual(errors,[]);console.log('Floor concept layout: '+checks+' checks passed; all table actions preserved, no writes or external requests.');
}finally{await browser.close();}
