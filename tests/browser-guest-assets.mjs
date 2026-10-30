import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(process.env.BOOKING_TEST_MODE!=='isolated')throw Error('Use the isolated browser stack');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const upstream='http://127.0.0.1:18080';
const previous={
 '/assets/js/table-showcase.js':execFileSync('git',['show','c2f6017:public/assets/js/table-showcase.js']),
 '/assets/css/table-showcase.css':execFileSync('git',['show','c2f6017:public/assets/css/table-showcase.css']),
};
let legacy=true;const requests=[],errors=[];
const server=createServer(async(req,res)=>{
 try{
  assert.ok(['GET','HEAD'].includes(req.method));const url=new URL(req.url,upstream);requests.push(url.pathname+url.search);
  if(previous[url.pathname]&&!url.search){res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'text/javascript':'text/css','Cache-Control':'public, max-age=86400'});res.end(previous[url.pathname]);return;}
  const response=await fetch(upstream+url.pathname+url.search);let body=Buffer.from(await response.arrayBuffer());
  if(legacy&&url.pathname==='/reserve')body=Buffer.from(body.toString().replace(/(\/assets\/(?:js|css)\/[^"?]+)\?v=[a-f0-9]+/g,'$1'));
  res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/octet-stream','Cache-Control':url.pathname==='/reserve'?'no-store':'public, max-age=86400'});res.end(body);
 }catch(e){errors.push(e.message);res.writeHead(500);res.end('Proxy test error');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:600},reducedMotion:'reduce'});
async function open(){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base + '/reserve',{timeout:30000});await p.locator('.room-card[data-room-type=terrace]').click();await p.waitForFunction(()=>document.querySelector('.showcase-hero').getAttribute('aria-busy')==='false');return p;}
try{
 const old=await open();const title=old.locator('#table-showcase-title');const before=await title.boundingBox();await old.locator('#table-showcase').evaluate(e=>e.scrollTop=300);const after=await title.boundingBox();assert.ok(Math.abs(before.y-after.y)<1,'Primed old assets must reproduce the sticky title');await old.close();
 legacy=false;const page=await open();
 assert.equal(await page.locator('.showcase-scroll').count(),1,'A normal revisit must load the updated modal even with old unversioned assets cached');
 const close=page.getByRole('button',{name:'Close table showcase',exact:true}),newTitle=page.locator('#table-showcase-title');const titleBefore=await newTitle.boundingBox(),closeBefore=await close.boundingBox();await page.locator('.showcase-scroll').evaluate(e=>e.scrollTop=300);
 assert.ok(titleBefore.y-(await newTitle.boundingBox()).y>100);assert.ok(Math.abs(closeBefore.y-(await close.boundingBox()).y)<1);
 assert.ok(requests.some(p=>/^\/assets\/js\/table-showcase\.js\?v=[a-f0-9]+$/.test(p)));assert.ok(requests.some(p=>/^\/assets\/css\/table-showcase\.css\?v=[a-f0-9]+$/.test(p)));
 await close.click();await page.waitForFunction(()=>document.activeElement?.dataset.roomType==='terrace');await page.close();assert.deepEqual(errors,[]);
 console.log('Guest asset cache: old sticky layout reproduced, then ordinary revisit loaded matching updated files; no writes or page errors.');
}finally{await browser.close();await new Promise(r=>server.close(r));server.closeAllConnections();}
