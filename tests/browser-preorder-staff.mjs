import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Read-only check needs the restored isolated B4 preview');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const sample=JSON.parse(execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php','tests/preorder-fixture.php'],{input:JSON.stringify({action:'staff_sample'}),encoding:'utf8'}));
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:18080/staff/login');await page.locator('[name=email]').fill('b4-admin@lumina.test');await page.locator('[name=password]').fill('Isolated cart passphrase 2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/admin');
 await page.getByRole('heading',{name:'Service overview.',exact:true}).waitFor();
 const handed=sample.rows.find(r=>r.status==='handed_off'),scheduled=sample.rows.find(r=>r.status==='scheduled');assert.ok(handed&&scheduled);
 const response=await page.request.get('http://127.0.0.1:18080/api/admin/reservation?code='+handed.code);const data=await response.json();assert.equal(response.status(),200);assert.equal(data.booking.preorder.status,'handed_off');assert.ok(data.booking.preorder.quote.lines.length>0);console.log('PASS protected staff detail returns saved pre-order and handoff identity');
 const billResponse=await page.request.get('http://127.0.0.1:18080/api/billing/quote?reservation_id='+data.booking.id);const bill=(await billResponse.json()).bill;assert.equal(billResponse.status(),200);assert.equal(bill.food_cents,data.booking.preorder.quote.food_cents);assert.equal(bill.credit_applied_cents,0);assert.equal(bill.received_cents,0);assert.equal(bill.due_cents,bill.food_cents);console.log('PASS accepted pre-order reaches B3 food balance without fictitious receipts or credit');
 await page.getByLabel('Service date',{exact:true}).fill(sample.date);await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.getByRole('button',{name:'Open '+handed.code,exact:true}).click();await page.getByRole('heading',{name:'Accepted food pre-order',exact:true}).waitFor();assert.match(await page.locator('#staff-dialog-content').innerText(),/Accepted food subtotal/);await page.screenshot({path:'/tmp/bella-vista-b4/staff-food.png'});console.log('PASS actual staff dialog displays accepted dishes and subtotal');
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Open '+scheduled.code,exact:true}).click();assert.equal(await page.getByRole('button',{name:'Seat party',exact:true}).isDisabled(),true);assert.match(await page.getByRole('button',{name:'Seat party',exact:true}).getAttribute('title'),/30 minutes before start/);assert.deepEqual(errors,[]);console.log('PASS future scheduled food preserves the actual-time seating window guard');
 console.log('PASS 4 B4 staff browser checks');
}finally{await browser.close();}
