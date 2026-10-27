import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw new Error('Isolated B6 only');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const fixture=data=>JSON.parse(execFileSync('docker',['compose','-f','docker-compose.test.yml','exec','-T','app','php','tests/operations-fixture.php'],{input:JSON.stringify(data),encoding:'utf8'}));
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(14000);let block;
try{
 await page.goto('http://127.0.0.1:18080/staff/login');await page.locator('[name=email]').fill('b4-admin@lumina.test');await page.locator('[name=password]').fill('Isolated cart passphrase 2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/admin');await page.getByRole('button',{name:'Use live time',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.classList.contains('live-floor-time'));
 block=fixture({action:'poll_block'});await page.locator('.floor-status-list').getByText('S4 · Unavailable',{exact:true}).waitFor();assert.ok(await page.locator('.live-floor-time').evaluate(n=>n===document.activeElement));console.log('PASS live floor updates after another writer while preserving live-button focus');
 fixture({action:'poll_unblock',id:block.id});block=null;await page.locator('.floor-status-list').getByText('S4 · Available',{exact:true}).waitFor();assert.ok(await page.locator('.live-floor-time').evaluate(n=>n===document.activeElement));console.log('PASS a second polling interval refreshes state without losing focused control');
}finally{if(block)fixture({action:'poll_unblock',id:block.id});await browser.close();}
