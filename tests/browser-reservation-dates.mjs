import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
if(process.env.BOOKING_TEST_MODE!=='isolated') throw Error('Use the isolated stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
function fixture(file,input){return JSON.parse(execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php',file],{input:JSON.stringify(input),stdio:['pipe','pipe','pipe']}).toString());}
const invitations=fixture('tests/staff-fixture.php',{action:'prepare'});
const sample=fixture('tests/reservation-dates-fixture.php',{});
const base='http://127.0.0.1:18080',browser=await chromium.launch(),errors=[];
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+invitations.admin.activation_path);
 await page.getByLabel('New password',{exact:true}).fill('Isolated staff passphrase 2026!');
 await page.getByLabel('Confirm new password',{exact:true}).fill('Isolated staff passphrase 2026!');
 await page.getByRole('button',{name:'Activate account',exact:true}).click();
 await page.getByRole('heading',{name:'Service overview.',exact:true}).waitFor();
 async function query(status='all',date=sample.today,pageNumber=1,q=sample.marker){
  const response=await page.request.get(base+'/api/admin/dashboard?'+new URLSearchParams({status,date,page:pageNumber,q,time:'17:30'}));
  assert.equal(response.status(),200);return await response.json();
 }
 await check('All includes past, present and future bookings with correct pagination',async()=>{
  const first=await query();assert.equal(first.count,30);assert.equal(first.pages,2);assert.equal(first.rows.length,25);
  const second=await query('all',sample.today,2);assert.equal(second.rows.length,5);
  assert.deepEqual(new Set([...first.rows,...second.rows].map(r=>r.code)),new Set(sample.rows.map(r=>r.code)));
 });
 await check('All search finds an off-date reference and changing service date does not narrow it',async()=>{
  const row=sample.rows.find(r=>r.date!==sample.today);
  const data=await query('all',sample.today,1,row.code);assert.equal(data.count,1);assert.equal(data.rows[0].code,row.code);
  assert.equal((await query('all','2020-01-01')).count,30);
 });
 await check('Specific statuses and waitlist remain scoped to the selected day',async()=>{
  for(const status of ['cancelled','completed','waitlisted']){
   const data=await query(status);const expected=sample.rows.filter(r=>r.date===sample.today&&r.status===status);
   assert.equal(data.count,expected.length);assert.ok(data.rows.every(r=>r.starts_at.startsWith(sample.today)&&r.status===status));
  }
 });
 await check('Floor and daily statistics keep the selected date when the list is All',async()=>{
  const all=await query(),specific=await query('cancelled');assert.deepEqual(all.stats,specific.stats);assert.deepEqual(all.floor,specific.floor);assert.equal(all.date,sample.today);
 });
 await page.getByLabel('Guest, phone, or reference',{exact:true}).fill(sample.marker);
 await page.getByLabel('Service date',{exact:true}).fill(sample.today);
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#staff-pagination')?.textContent.includes('30 results'));
 await check('Rows identify full booking dates and search pages are navigable',async()=>{
  assert.ok(await page.locator('#staff-rows').innerText().then(s=>s.includes('Date / time / reference')));
  assert.match(await page.locator('#staff-list-scope').innerText(), /All booking dates/);
  const dates=await page.locator('#staff-rows time').evaluateAll(es=>es.map(e=>e.dateTime.slice(0,10)));
  assert.ok(new Set(dates).size>1);assert.equal(dates.length,25);
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#staff-pagination')?.textContent.includes('Page 2 of 2'));
  assert.equal(await page.locator('#staff-rows tbody tr').count(),5);
 });
 await mkdir('/tmp/lumina-all-dates',{recursive:true});
 await page.locator('#staff-rows').scrollIntoViewIfNeeded();
 await page.screenshot({path:'/tmp/lumina-all-dates/desktop.png'});
 await check('Mobile list stays within the page width',async()=>{
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'/tmp/lumina-all-dates/mobile.png'});
 });
 assert.deepEqual(errors,[]);console.log(`Reservation dates: ${checks} checks passed.`);
}finally{await browser.close();}
