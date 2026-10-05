/* Self-validation loop: mounts every screen in jsdom and asserts real content. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const ROOT = path.resolve(__dirname, "../prototype");

const fails = [], warns = [], notes = [];
function fail(c,m){ fails.push("["+c+"] "+m); }
function warn(c,m){ warns.push("["+c+"] "+m); }

const html = fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const dom = new JSDOM(html, { runScripts:"outside-only", pretendToBeVisual:true, url:"file://"+ROOT+"/index.html" });
const w = dom.window;
w.requestAnimationFrame = function(cb){ return setTimeout(function(){ cb(Date.now()); }, 0); };
w.cancelAnimationFrame = clearTimeout;
w.matchMedia = w.matchMedia || function(q){ return { matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }; };
w.HTMLCanvasElement.prototype.getContext = function(){
  const noop=function(){return {};};
  return new Proxy({}, { get(){ return noop; } });
};
w.performance = w.performance || { now:()=>Date.now() };
w.scrollTo = function(){};
w.URL.createObjectURL = function(){ return "blob:stub"; };
w.URL.revokeObjectURL = function(){};
if (!w.AudioContext) w.AudioContext = function(){ return {
  createOscillator:()=>({connect(){},start(){},stop(){},frequency:{value:0,setValueAtTime(){}},type:""}),
  createGain:()=>({connect(){},gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}}}),
  destination:{}, currentTime:0, close(){}, resume(){}, state:"running" }; };
w.webkitAudioContext = w.AudioContext;

const errs = [];
w.addEventListener("error", e => errs.push("window error: "+(e && e.message)));
const origErr = console.error;
console.error = function(){ errs.push("console.error: "+Array.from(arguments).join(" ")); };

/* ---- 1. asset links resolve ---- */
["link[rel=stylesheet]"].forEach(()=>{});
Array.from(w.document.querySelectorAll('link[rel="stylesheet"]')).forEach(function(l){
  const href = l.getAttribute("href");
  if (/^https?:/.test(href)) { notes.push("remote font stylesheet: "+href); return; }
  if (!fs.existsSync(path.join(ROOT, href))) fail("ASSET","missing CSS "+href);
});
const scripts = Array.from(w.document.querySelectorAll("script[src]")).map(s=>s.getAttribute("src"));
scripts.forEach(function(src){
  if (!fs.existsSync(path.join(ROOT, src))) fail("ASSET","missing JS "+src);
});

/* ---- 2. execute scripts in order ---- */
scripts.forEach(function(src){
  const code = fs.readFileSync(path.join(ROOT,src),"utf8");
  try { w.eval(code); } catch(e){ fail("RUNTIME","threw while loading "+src+": "+e.message); }
});
const inline = Array.from(w.document.querySelectorAll("script:not([src])")).map(s=>s.textContent);
inline.forEach(function(code,i){
  try { w.eval(code); } catch(e){ fail("RUNTIME","inline script "+i+" threw: "+e.message); }
});

/* ---- 3. globals present ---- */
["DATA","U","FloorPlan","Guest","Admin","Kitchen","APP"].forEach(function(g){
  if (!w[g]) fail("GLOBAL","window."+g+" is undefined");
});
if (!w.DATA) { report(); process.exit(1); }

/* ---- 4. sample data integrity ---- */
const D = w.DATA;
function count(n,min,label){ if (!n || n<min) fail("DATA",label+" has "+n+", expected at least "+min); }
count(D.MENU && D.MENU.length, 36, "MENU");
count(D.TABLES && D.TABLES.length, 20, "TABLES");
count(D.ROOM_TYPES && D.ROOM_TYPES.length, 4, "ROOM_TYPES");
count(D.RESERVATIONS && D.RESERVATIONS.length, 300, "RESERVATIONS");
count(D.TICKETS && D.TICKETS.length, 8, "TICKETS");
count(D.STAFF && D.STAFF.length, 5, "STAFF");
count(D.WAITLIST && D.WAITLIST.length, 3, "WAITLIST");
["vip","common","group","terrace"].forEach(function(t){
  if (!D.ROOM_TYPES.some(r=>r.id===t)) fail("DATA","room type missing: "+t);
  if (!D.TABLES.some(x=>x.typeId===t)) fail("DATA","no tables for room type: "+t);
});
D.MENU.forEach(function(m){
  if (!m.name || !m.desc) fail("DATA","menu item "+m.id+" missing name/desc");
  if (!(m.price>0)) fail("DATA","menu item "+m.id+" has no price");
});
/* every reservation must be internally consistent */
D.RESERVATIONS.forEach(function(r){
  if (!(r.startsAt instanceof w.Date || r.startsAt instanceof Date)) fail("DATA","res "+r.id+" startsAt not a Date");
  if (r.endsAt <= r.startsAt) fail("DATA","res "+r.id+" ends before it starts");
  if (r.blocksUntil < r.endsAt) fail("DATA","res "+r.id+" buffer before end");
  if (!r.ref || !/^LUM-/.test(r.ref)) fail("DATA","res "+r.id+" bad ref "+r.ref);
  const t = D.TABLES.find(x=>x.id===r.tableId);
  if (!t) fail("DATA","res "+r.id+" points at unknown table "+r.tableId);
  else if (r.party > t.max) fail("DATA","res "+r.id+" party "+r.party+" exceeds table max "+t.max);
});
/* no double-book among occupying statuses */
(function(){
  const occ = D.occupyingStatuses();
  const byTable = {};
  D.RESERVATIONS.filter(r=>occ.indexOf(r.status)>=0).forEach(function(r){
    (byTable[r.tableId]=byTable[r.tableId]||[]).push(r);
  });
  let clashes = 0;
  Object.keys(byTable).forEach(function(k){
    const a = byTable[k].slice().sort((x,y)=>x.startsAt-y.startsAt);
    for (let i=1;i<a.length;i++)
      if (D.overlaps(a[i].startsAt,a[i].blocksUntil,a[i-1].startsAt,a[i-1].blocksUntil)) clashes++;
  });
  if (clashes) fail("ENGINE","seed data contains "+clashes+" overlapping reservations on the same table");
})();
/* availability must never return a table that is actually busy */
(function(){
  let bad=0, checked=0;
  for (let d=0; d<=3; d++) D.slotList().forEach(function(s){
    [2,4,8].forEach(function(p){
      const a = D.availability(d,s,p,"any");
      checked++;
      a.tables.forEach(function(t){
        if (t.max<p || t.min>p) bad++;
        const win0 = D.atMin(d,s), win1 = new Date(win0.getTime()+(D.turnFor(p)+D.BUFFER_MIN)*60000);
        const clash = D.RESERVATIONS.some(function(r){
          return r.tableId===t.id && D.occupyingStatuses().indexOf(r.status)>=0 &&
            D.overlaps(win0,win1,r.startsAt,r.blocksUntil);
        });
        if (clash) bad++;
      });
    });
  });
  if (bad) fail("ENGINE","availability returned "+bad+" invalid tables across "+checked+" queries");
  else notes.push("availability engine: "+checked+" queries, zero invalid tables");
})();
/* holds must block availability */
(function(){
  const a = D.availability(2, 19*60, 2, "any");
  if (!a.tables.length) { warn("ENGINE","no free table to test holds"); return; }
  const t = a.tables[0];
  D.createHold(2, 19*60, 2, t, "svl");
  const b = D.availability(2, 19*60, 2, "any");
  if (b.tables.some(x=>x.id===t.id)) fail("ENGINE","a live hold did not remove the table from availability");
  else notes.push("hold correctly removed table "+t.label+" from availability");
  D.HOLDS.length = 0;
})();

/* ---- 5. mount every screen ---- */
const stage = w.document.getElementById("stage");
function mount(label, fn, minChars){
  while (stage.firstChild) stage.removeChild(stage.firstChild);
  const before = errs.length;
  try { fn(stage); } catch(e){ fail("MOUNT",label+" threw: "+e.message+" | "+(e.stack||"").split("\n")[1]); return null; }
  if (errs.length>before) fail("MOUNT",label+" logged errors: "+errs.slice(before).join(" ;; "));
  const txt = (stage.textContent||"").replace(/\s+/g," ").trim();
  if (txt.length < (minChars||200)) fail("EMPTY",label+" rendered only "+txt.length+" chars of text");
  return { txt:txt, n:stage };
}
function must(label, res, needles){
  if (!res) return;
  needles.forEach(function(s){
    if (res.txt.toLowerCase().indexOf(String(s).toLowerCase())<0)
      fail("CONTENT",label+" is missing expected content: "+JSON.stringify(s));
  });
}
function mustSel(label, res, sels){
  if (!res) return;
  sels.forEach(function(s){
    if (!res.n.querySelector(s)) fail("DOM",label+" has no element matching "+s);
  });
}
function emptyCheck(label,res){
  if (!res) return;
  const bad = [];
  res.n.querySelectorAll(".card,.kpi,.badge,.chip,.btn,td,h1,h2,h3,h4").forEach(function(n){
    if (n.children.length===0 && !(n.textContent||"").trim() && !n.querySelector("svg,canvas,img")) bad.push(n.className||n.tagName);
  });
  if (bad.length) fail("EMPTY_UI",label+" has "+bad.length+" empty elements: "+bad.slice(0,6).join(", "));
}

const G = w.Guest, A = w.Admin, K = w.Kitchen;
let r;
r = mount("Guest.home", G.home);
must("Guest.home", r, ["Lumina","Reserve","VIP","Main Dining","Group","Terrace"]);
mustSel("Guest.home", r, ["a[href='#/book']","a[href='#/menu']"]);
emptyCheck("Guest.home", r);

r = mount("Guest.menu", G.menu);
must("Guest.menu", r, ["Menu","Kinilaw","Leche Flan","Tasting"]);
(function(){
  if (!r) return;
  let missing = 0;
  D.MENU.forEach(function(m){ if (r.txt.indexOf(m.name)<0) missing++; });
  if (missing) fail("CONTENT","Guest.menu omitted "+missing+" of "+D.MENU.length+" dishes (plan forbids truncation)");
  else notes.push("menu renders all "+D.MENU.length+" dishes");
})();
emptyCheck("Guest.menu", r);

r = mount("Guest.book", G.book);
must("Guest.book", r, ["party","find"]);
mustSel("Guest.book", r, ["input[type=date]",".stepper, input[type=number]"]);
emptyCheck("Guest.book", r);

r = mount("Guest.manage", G.manage, 150);
must("Guest.manage", r, ["reference"]);
emptyCheck("Guest.manage", r);
/* the lookup form is legitimately short, so exercise it: click a sample ref chip
   and assert the detail panel actually populates */
(function(){
  if (!r) return;
  const chips = Array.from(r.n.querySelectorAll(".chip")).filter(c=>/^LUM-/.test((c.textContent||"").trim()));
  if (!chips.length){ fail("CONTENT","Guest.manage offers no sample reference chips to try"); return; }
  const before = (r.n.textContent||"").length;
  chips[0].dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
  const after = (r.n.textContent||"").replace(/\s+/g," ").trim();
  if (after.length < before + 250)
    fail("CONTENT","looking up "+chips[0].textContent+" did not render a reservation detail panel");
  else {
    notes.push("manage lookup works: "+chips[0].textContent+" expanded to "+after.length+" chars");
    ["party","table"].forEach(function(s){
      if (after.toLowerCase().indexOf(s)<0) fail("CONTENT","manage detail missing "+s);
    });
    if (!r.n.querySelector(".manage-panel *")) fail("DOM","manage detail panel rendered empty");
  }
})();

r = mount("Admin.mount", A.mount);
must("Admin.mount", r, ["covers","no-show","occupancy","waitlist","reservation"]);
mustSel("Admin.mount", r, [".kpi","select"]);
emptyCheck("Admin.mount", r);
(function(){
  if (!r) return;
  const k = r.n.querySelectorAll(".kpi").length;
  if (k<6) fail("CONTENT","admin shows "+k+" KPI tiles, spec requires 6");
  else notes.push("admin renders "+k+" KPI tiles");
  const tl = r.n.querySelector("[class*=timeline],[class*=tl-]");
  if (!tl) fail("DOM","admin service panel has no host timeline element");
  else notes.push("admin host timeline present ("+tl.className+")");
})();

r = mount("Kitchen.mount", K.mount);
must("Kitchen.mount", r, ["all day","recall"]);
emptyCheck("Kitchen.mount", r);
(function(){
  if (!r) return;
  const bands = ["ON TIME","WORKING","LATE","CRITICAL"];
  const seen = bands.filter(b=>r.txt.toUpperCase().indexOf(b)>=0);
  if (seen.length<3) fail("CONTENT","kitchen shows only "+seen.length+" aging bands ("+seen.join(",")+"), seed should span at least 3");
  else notes.push("kitchen shows aging bands: "+seen.join(", "));
  const allergy = r.txt.toUpperCase().indexOf("ALLERGY")>=0;
  if (!allergy) warn("CONTENT","no ALLERGY bar visible, check seeded allergy strings");
})();

/* ---- 6. floor plan accessibility ---- */
(function(){
  while (stage.firstChild) stage.removeChild(stage.firstChild);
  const host = w.document.createElement("div");
  stage.appendChild(host);
  const fp = w.FloorPlan.render(host, { statusOf:()=>"free", selectable:()=>true, onSelect(){} });
  const gs = host.querySelectorAll("g.fp-t");
  if (gs.length !== D.TABLES.length) fail("FLOORPLAN","rendered "+gs.length+" tables, data has "+D.TABLES.length);
  let noLabel=0, noFocus=0;
  gs.forEach(function(g){
    if (!g.getAttribute("aria-label")) noLabel++;
    if (g.getAttribute("tabindex")!=="0") noFocus++;
  });
  if (noLabel) fail("A11Y",noLabel+" floor-plan tables have no aria-label");
  if (noFocus) fail("A11Y",noFocus+" selectable tables are not keyboard focusable");
  if (!noLabel && !noFocus) notes.push("floor plan: "+gs.length+" tables, all labelled and focusable");
})();

/* ---- 7. a11y sweep across screens ---- */
(function(){
  const screens = { "Guest.book":G.book, "Admin":A.mount, "Kitchen":K.mount, "Guest.manage":G.manage };
  Object.keys(screens).forEach(function(label){
    while (stage.firstChild) stage.removeChild(stage.firstChild);
    try { screens[label](stage); } catch(e){ return; }
    let unlabelled = 0;
    stage.querySelectorAll("input,select,textarea").forEach(function(n){
      if (n.type==="hidden") return;
      const id = n.getAttribute("id");
      const has = n.getAttribute("aria-label") || n.getAttribute("aria-labelledby") ||
        (id && stage.querySelector('label[for="'+id+'"]')) ||
        n.closest("label") || n.getAttribute("title") || n.getAttribute("placeholder");
      if (!has) unlabelled++;
    });
    if (unlabelled) warn("A11Y",label+" has "+unlabelled+" form controls with no label, aria-label or placeholder");
    let btnNoName = 0;
    stage.querySelectorAll("button").forEach(function(b){
      if (!(b.textContent||"").trim() && !b.getAttribute("aria-label")) btnNoName++;
    });
    if (btnNoName) fail("A11Y",label+" has "+btnNoName+" buttons with no accessible name");
  });
})();

/* ---- 8. CSS hygiene ---- */
(function(){
  const files = fs.readdirSync(path.join(ROOT,"assets/css"));
  let rawHex = 0; const where = [];
  files.forEach(function(f){
    if (f==="tokens.css") return;
    const css = fs.readFileSync(path.join(ROOT,"assets/css",f),"utf8");
    const m = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    const real = m.filter(h=>!/^#[0-9a-fA-F]{2}['"]/.test(h));
    if (real.length){ rawHex += real.length; where.push(f+":"+real.length); }
  });
  if (rawHex) warn("CSS","raw hex colours outside tokens.css: "+where.join(", "));
  const all = files.map(f=>fs.readFileSync(path.join(ROOT,"assets/css",f),"utf8")).join("\n");
  if (all.indexOf("prefers-reduced-motion")<0) fail("A11Y","no prefers-reduced-motion block found in any CSS");
  files.forEach(function(f){
    const css = fs.readFileSync(path.join(ROOT,"assets/css",f),"utf8");
    const o=(css.match(/{/g)||[]).length, c=(css.match(/}/g)||[]).length;
    if (o!==c) fail("CSS",f+" has unbalanced braces ("+o+" open, "+c+" close)");
  });
  /* every class used in JS should exist in CSS or be a known dynamic one */
  const js = fs.readdirSync(path.join(ROOT,"assets/js"))
    .map(f=>fs.readFileSync(path.join(ROOT,"assets/js",f),"utf8")).join("\n");
  const used = new Set();
  (js.match(/class:\s*"([^"]+)"/g)||[]).forEach(function(m){
    m.replace(/class:\s*"([^"]+)"/,"$1").split(/\s+/).forEach(function(c){
      if (c && !/\$|\+/.test(c)) used.add(c.replace(/^\./,""));
    });
  });
  const missing = [];
  used.forEach(function(c){ if (all.indexOf("."+c)<0) missing.push(c); });
  if (missing.length) warn("CSS","classes used in JS with no CSS rule: "+missing.slice(0,14).join(", ")+(missing.length>14?" (+"+(missing.length-14)+")":""));
})();

/* ---- 9. no em dashes, no network calls ---- */
(function(){
  const all = ["assets/js","assets/css"].flatMap(function(d){
    return fs.readdirSync(path.join(ROOT,d)).map(f=>({ f:d+"/"+f, s:fs.readFileSync(path.join(ROOT,d,f),"utf8") }));
  }).concat([{ f:"index.html", s:html }]);
  all.forEach(function(x){
    if (x.s.indexOf("\u2014")>=0) fail("STYLE",x.f+" contains an em dash");
    if (/fetch\s*\(|XMLHttpRequest|new\s+WebSocket/.test(x.s)) fail("OFFLINE",x.f+" makes a network call, prototype must run from file://");
    if (/https?:\/\//.test(x.s) && x.f!=="index.html"){
      const urls = (x.s.match(/https?:\/\/[^\s"')]+/g)||[]).filter(u=>u.indexOf("www.w3.org")<0);
      if (urls.length) warn("OFFLINE",x.f+" references remote URLs: "+urls.slice(0,3).join(" "));
    }
  });
})();

function report(){
  console.log("\n=== SVL: restaurant reservation prototype ===");
  notes.forEach(n=>console.log("  note  "+n));
  warns.forEach(n=>console.log("  WARN  "+n));
  fails.forEach(n=>console.log("  FAIL  "+n));
  console.log("\n"+(fails.length? "RESULT: FAIL ("+fails.length+" errors, "+warns.length+" warnings)"
    : "RESULT: PASS ("+warns.length+" warnings)"));
}
report();
process.exit(fails.length?1:0);
