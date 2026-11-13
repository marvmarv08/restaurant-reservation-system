import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Use the isolated local preview.');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const base='http://127.0.0.1:18080';
const catalog=(await(await fetch(base+'/api/catalog')).json()).catalog;
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
const page=await context.newPage();page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let checks=0;
async function check(name,work){await work();checks++;console.log('PASS '+name);}
try{
 await page.goto(base+'/reserve',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Date · Manila time').waitFor();
 const date=new Date(catalog.today+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+2);if(date.getUTCDay()===1)date.setUTCDate(date.getUTCDate()+1);
 await page.getByLabel('Date · Manila time').fill(date.toISOString().slice(0,10));
 await page.getByLabel('Guests',{exact:true}).selectOption('2');
 await page.getByLabel('Room preference').selectOption('bv_standard');
 await page.getByRole('button',{name:'Find a table',exact:true}).click();
 await page.locator('[data-time]').first().click();
 await page.getByRole('button',{name:'Continue with this table',exact:true}).click();
 await page.getByRole('button',{name:'Add dish',exact:true}).waitFor();
 await check('Pre-order selector contains exactly the 24 current dishes and their real prices',async()=>{
  const options=await page.getByLabel('Food item',{exact:true}).locator('option').allTextContents();
  assert.equal(options.length,24);
  assert.ok(options.some(x=>x.includes('Garden-Flame Chicken Inasal')&&x.includes('580.00')));
  assert.ok(options.every(x=>!x.includes('Eleven Courses')&&!x.includes('Dry-Aged Duck')));
 });
 const dish=catalog.menu.find(x=>x.name==='Garden-Flame Chicken Inasal');
 await page.getByLabel('Food item',{exact:true}).selectOption(String(dish.id));
 await page.getByLabel('Quantity to add',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Add dish',exact:true}).click();
 await check('Adding two selected dishes gives the exact PHP1,160 subtotal',async()=>assert.match(await page.locator('.preorder-subtotal').innerText(),/1,160\.00/));
 await page.locator('.preorder-line input').fill('1');await page.locator('.preorder-line input').press('Tab');
 await check('Quantity edit recalculates the selected dish to PHP580',async()=>assert.match(await page.locator('.preorder-subtotal').innerText(),/580\.00/));
 await page.getByRole('button',{name:/^Remove Garden-Flame/}).click();
 await check('Removing the dish clears the cart and subtotal',async()=>{assert.equal(await page.locator('.preorder-line').count(),0);assert.match(await page.locator('.preorder-subtotal').innerText(),/0\.00/)});
 await page.getByLabel('Quantity to add',{exact:true}).fill('2');await page.getByRole('button',{name:'Add dish',exact:true}).click();
 await page.getByLabel('Full name',{exact:true}).fill('Menu Verification');
 await page.getByLabel('Phone number',{exact:true}).fill('+639000000001');
 await page.getByLabel('Email',{exact:true}).fill('menu-verification@example.test');
 const quoted=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/preorders/quote'&&r.request().method()==='POST');
 await page.locator('#confirm-booking').click();
 const quote=await(await quoted).json();
 await check('Server quote preserves the chosen dish identity, price and exact food total',async()=>{
  assert.equal(quote.ok,true);assert.equal(quote.quote.food_cents,116000);
  assert.equal(quote.quote.lines[0].name,dish.name);assert.equal(quote.quote.lines[0].unit_price_cents,58000);
 });
 await mkdir('/tmp/bella-vista-curated-menu',{recursive:true});
 for(const width of [1366,390]){
  await page.setViewportSize({width,height:900});await page.locator('.preorder-editor').scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/bella-vista-curated-menu/cart-${width}.png`});
  await check(`Cart remains within the page at ${width}px`,async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)));
 }
 await check('No browser JavaScript errors during the real cart/quote flow',async()=>assert.deepEqual(errors,[]));
 console.log(`Curated cart: ${checks} checks passed; no reservation or payment submitted.`);
}finally{
 // Only this browser's temporary hold is released; no booking is confirmed.
 await page.evaluate(async()=>{
  const saved=JSON.parse(sessionStorage.getItem('lumina.guest.v1')||'{}');
  if(saved.hold?.hold_token){
   const session=await(await fetch('/api/session',{credentials:'same-origin'})).json();
   const r=await fetch('/api/holds/release',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf_token},body:JSON.stringify({hold_token:saved.hold.hold_token})});
   if(!r.ok)throw new Error('Cannot release the verifier hold.');
  }
 });
 await context.close();await browser.close();
}
