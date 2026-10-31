import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated preview.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const {default:AxeBuilder}=await import(pathToFileURL(process.env.AXE_MODULE).href);
const browser=await chromium.launch(),contexts=[],errors=[],writes=[],outside=[];let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function open(options={}){const c=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'no-preference',...options});contexts.push(c);const p=await c.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());if(new URL(r.url()).origin!=='http://127.0.0.1:18080')outside.push(r.url());});return p;}
async function position(g){return g.locator('.photo-fan-card').evaluateAll(cards=>`${cards.findIndex(c=>c.getAttribute('aria-current')==='true')+1} / ${cards.length}`);}
async function selectPhoto(g,index){await g.locator('.gallery-dot').nth(index-1).click();}
try{
 const p=await open();await p.goto('http://127.0.0.1:18080/#about');const gallery=p.locator('.restaurant-gallery'),cards=gallery.locator('.photo-fan-card');
 await check('Ten restaurant views are included with only five visible in the right-side fan',async()=>{
  assert.equal(await cards.count(),10,'The showcase must contain ten distinct restaurant photos');
  await gallery.locator('[aria-current=true]').first().waitFor();await cards.locator('img').evaluateAll(nodes=>nodes.forEach(e=>e.loading='eager'));await p.waitForFunction(()=>[...document.querySelectorAll('.photo-fan-card img')].every(i=>i.complete&&i.naturalWidth>0));
  const copy=await p.locator('.company-intro').boundingBox(),fan=await gallery.boundingBox();assert.ok(fan.x>=copy.x+copy.width);assert.equal(await gallery.getAttribute('aria-roledescription'),'carousel');assert.equal(await gallery.locator('.gallery-dot[data-joined=true]').count(),1);assert.equal(await cards.locator('img').count(),10);assert.equal(await gallery.locator('.photo-fan-card[data-visible=true]').count(),5);assert.equal(await gallery.locator('.gallery-arrow,.gallery-count').count(),0);
 });
 await check('A failed phone source recovers when the desktop image loads successfully',async()=>{
  const recovery=await open({viewport:{width:390,height:844}});await recovery.route('**/garden-interior-concept-small.webp*',r=>r.abort());await recovery.goto('http://127.0.0.1:18080/#about');const card=recovery.locator('.photo-fan-card').first();await card.locator('.photo-fallback').waitFor({state:'visible'});await recovery.setViewportSize({width:1024,height:950});await recovery.waitForFunction(()=>document.querySelector('.photo-fan-card img').naturalWidth===1100);assert.equal(await card.locator('img').isVisible(),true);assert.equal(await card.locator('.photo-fallback').isVisible(),false);await recovery.close();
 });
 await check('Clicking the front photo advances and actually rearranges the cards without scrolling',async()=>{
  await p.evaluate(async()=>{await document.fonts.ready;scrollTo({top:document.querySelector('#about').offsetTop,behavior:'instant'});await new Promise(requestAnimationFrame);});
  const before=await cards.first().evaluate(e=>getComputedStyle(e).transform);const y=await p.evaluate(()=>scrollY);
  const front=await gallery.locator('.photo-fan-card[aria-current=true]').boundingBox();await p.mouse.click(front.x+front.width/2,front.y+front.height/2);assert.equal(await position(gallery),'2 / 10');await p.waitForTimeout(460);assert.notEqual(await cards.first().evaluate(e=>getComputedStyle(e).transform),before);assert.equal(await cards.nth(1).getAttribute('aria-current'),'true');assert.equal(await gallery.locator('.gallery-dot').nth(2).getAttribute('data-joined'),'true');assert.equal(await gallery.locator('.gallery-dot').nth(1).getAttribute('data-bridge'),'forward');assert.ok(Math.abs(await p.evaluate(()=>scrollY)-y)<2);
 });
 await check('All ten views are reachable and wrap without arrow buttons',async()=>{
  await gallery.locator('.photo-fan-card[aria-current=true]').focus();await p.keyboard.press('Home');const visited=new Set();
  for(let i=0;i<10;i++){visited.add(await gallery.locator('.photo-fan-card[aria-current=true]').getAttribute('href'));await p.keyboard.press('ArrowRight');}
  assert.deepEqual(await gallery.locator('.photo-fan-card[data-visible=false]').evaluateAll(nodes=>nodes.map(n=>[n.tabIndex,n.getAttribute('aria-hidden'),getComputedStyle(n).visibility])),Array(5).fill([-1,'true','hidden']));
  assert.equal(visited.size,10);assert.equal(await position(gallery),'1 / 10');
  await selectPhoto(gallery,10);assert.equal(await gallery.locator('.gallery-caption').textContent(),'Garden path');await p.keyboard.press('ArrowRight');assert.equal(await position(gallery),'1 / 10');await p.keyboard.press('ArrowLeft');assert.equal(await position(gallery),'10 / 10');assert.equal(await gallery.locator('.gallery-arrow,.gallery-count').count(),0);
 });
 await check('Keyboard arrows/Home/End and Space operate the fan with visible focus',async()=>{
  await gallery.locator('.photo-fan-card[aria-current=true]').focus();await p.keyboard.press('Home');assert.equal(await position(gallery),'1 / 10');await p.keyboard.press('ArrowRight');assert.equal(await position(gallery),'2 / 10');await p.keyboard.press('ArrowLeft');await p.keyboard.press('End');assert.equal(await position(gallery),'10 / 10');await p.keyboard.press('Space');assert.equal(await position(gallery),'1 / 10');assert.equal(await p.locator(':focus').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 });
 await check('Rapid input stays deterministic and keeps exactly one active photo',async()=>{
  for(let i=0;i<12;i++)await p.keyboard.press('ArrowRight');assert.equal(await position(gallery),'3 / 10');assert.equal(await gallery.locator('.photo-fan-card[aria-current=true]').count(),1);assert.equal(await gallery.locator('.gallery-dot[aria-current=true]').count(),1);assert.equal(await gallery.locator('.gallery-count').count(),0);
 });
 await check('Exposed side cards select both next and previous views',async()=>{
  for(const slot of [1,-1]){
   await p.waitForTimeout(450);
   const point=await gallery.evaluate((root,slot)=>{const card=root.querySelector(`.photo-fan-card[data-slot="${slot}"]`),b=card.getBoundingClientRect();for(let y=b.top+10;y<b.bottom-10;y+=8)for(let x=b.left+5;x<b.right-5;x+=8){if(document.elementFromPoint(x,y)?.closest('.photo-fan-card')===card)return{x,y,title:card.dataset.title};}return null;},slot);
   assert.ok(point,'Both next and previous side cards need an exposed clickable area');await p.mouse.click(point.x,point.y);assert.equal(await gallery.locator('.gallery-caption').textContent(),point.title);
  }
  for(const title of ['Show photo 8: Family long table','Show photo 9: VIP dining']){await selectPhoto(gallery,Number(title.match(/photo (\d+)/)[1]));assert.equal(await gallery.locator('.gallery-caption').textContent(),title.split(': ')[1]);}
 });
 await check('Phone taps cycle and select all views without arrow controls',async()=>{
  const phone=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await phone.goto('http://127.0.0.1:18080/#about');const g=phone.locator('.restaurant-gallery');await g.locator('.photo-fan-card[aria-current=true]').tap();assert.equal(await position(g),'2 / 10');await selectPhoto(g,10);assert.equal(await position(g),'10 / 10');await g.locator('.photo-fan-card[aria-current=true]').tap();assert.equal(await position(g),'1 / 10');assert.equal(await g.locator('.gallery-arrow').count(),0);
 });
 await check('The gallery has no autoplay or ongoing idle animation',async()=>{
  await p.waitForTimeout(500);const count=await position(gallery);await p.waitForTimeout(350);assert.equal(await position(gallery),count);assert.equal(await gallery.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
 });
 await mkdir('/tmp/bella-photo-fan',{recursive:true});
 for(const width of [1920,1440,1024,820,768,390,320])await check('Fan geometry, controls and accessibility at '+width+'px',async()=>{
  await p.setViewportSize({width,height:950});await gallery.scrollIntoViewIfNeeded();await p.waitForTimeout(450);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await gallery.boundingBox();
  assert.equal(await gallery.locator('.photo-fan-card[data-visible=true]').count(),5);
  for(const card of await gallery.locator('.photo-fan-card[data-visible=true]').all()){const b=await card.boundingBox();assert.ok(b.x>=box.x-1&&b.x+b.width<=box.x+box.width+1,'Fanned cards must stay inside their column');}
  assert.equal(await gallery.locator('.gallery-count').count(),0);const dotBoxes=await gallery.locator('.gallery-dot').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y};}));assert.ok(dotBoxes.every(b=>Math.abs(b.y-dotBoxes[0].y)<1),'All ten dots must share one row');assert.ok(dotBoxes[1].x-dotBoxes[0].x<=24,'Compact dot spacing');for(const dot of await gallery.locator('.gallery-dot').all()){const b=await dot.boundingBox();assert.ok(b.width>=24&&b.height>=44);}
  assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);await p.locator('#about').screenshot({path:'/tmp/bella-photo-fan/about-'+width+'.png'});
 });
 await check('Reduced motion keeps switching immediate and content visible',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await gallery.locator('.photo-fan-card[aria-current=true]').click();assert.equal(await gallery.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);assert.ok(await gallery.locator('.photo-fan-card[aria-current=true] img').isVisible());
 });
 await check('A failed image has a readable fallback and navigation remains usable',async()=>{
  const failed=await open();await failed.route('**/garden-terrace.webp*',r=>r.abort());await failed.goto('http://127.0.0.1:18080/#about');const g=failed.locator('.restaurant-gallery');await selectPhoto(g,3);await g.locator('.photo-fan-card[aria-current=true] .photo-fallback').waitFor({state:'visible'});await g.locator('.photo-fan-card[aria-current=true]').click();assert.equal(await g.locator('.gallery-caption').textContent(),'Private dining');
 });
 await check('No-JavaScript visitors can see photos and open their native image links',async()=>{
  const nojs=await open({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:18080/#about');assert.equal(await nojs.locator('.restaurant-gallery .photo-fan-card').count(),10);assert.ok(await nojs.locator('.restaurant-gallery .photo-fan-card').first().isVisible());assert.equal(await nojs.locator('.gallery-controls').isVisible(),false);assert.match(await nojs.locator('.photo-fan-card').first().getAttribute('href'),/garden-interior/);assert.ok(await nojs.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await check('Gallery interactions make no booking writes, external requests or browser errors',async()=>{assert.deepEqual(writes,[]);assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);});
 console.log(`Restaurant photo fan: ${checks} checks passed.`);
}finally{for(const c of contexts)await c.close();await browser.close();}
