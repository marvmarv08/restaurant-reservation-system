/* shared helpers used by every screen module */
(function(){
"use strict";
function el(tag, attrs, kids){
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v===null||v===undefined||v===false) continue;
    if (k==="class") n.className = v;
    else if (k==="html") n.innerHTML = v;
    else if (k==="text") n.textContent = v;
    else if (k.slice(0,2)==="on") n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k==="style" && typeof v==="object") Object.assign(n.style, v);
    else if (k==="data" && typeof v==="object") for (const d in v) n.dataset[d]=v[d];
    else n.setAttribute(k, v===true ? "" : v);
  }
  if (kids!==undefined && kids!==null){
    (Array.isArray(kids)?kids:[kids]).forEach(function(c){
      if (c===null||c===undefined||c===false) return;
      n.appendChild(typeof c==="object" ? c : document.createTextNode(String(c)));
    });
  }
  return n;
}
function esc(s){ return String(s===null||s===undefined?"":s)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function clear(n){ while(n.firstChild) n.removeChild(n.firstChild); return n; }

function money(n){ return "\u20b1" + Number(n).toLocaleString("en-PH"); }
function pad(n){ return String(n).padStart(2,"0"); }
function hhmm(d){ return pad(d.getHours())+":"+pad(d.getMinutes()); }
function mmss(sec){ sec=Math.max(0,Math.round(sec));
  return pad(Math.floor(sec/60))+":"+pad(sec%60); }
function dayName(d){ return d.toLocaleDateString("en-GB",{weekday:"short"}); }
function longDate(d){ return d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"}); }
function shortDate(d){ return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); }
function ago(d){
  const s=(Date.now()-d.getTime())/1000;
  if (s<60) return "just now";
  if (s<3600) return Math.floor(s/60)+"m ago";
  if (s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}
function dayOffsetOf(d){
  const a=new Date(d); a.setHours(0,0,0,0);
  const b=new Date(); b.setHours(0,0,0,0);
  return Math.round((a-b)/86400000);
}
function isoDate(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function fromIso(s){ const p=s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }

function toast(title, body, kind, ms){
  const host = document.getElementById("toasts");
  const t = el("div",{class:"toast "+(kind||"")},[
    el("div",{class:"grow"},[ el("div",{class:"toast-t",text:title}),
      body ? el("div",{class:"toast-b",text:body}) : null ])
  ]);
  host.appendChild(t);
  setTimeout(function(){ t.classList.add("is-out");
    setTimeout(function(){ t.remove(); }, 200); }, ms||4200);
  return t;
}

function modal(opts){
  const scrim = el("div",{class:"scrim",role:"presentation"});
  const box = el("div",{class:"modal",role:"dialog","aria-modal":"true","aria-label":opts.title||"Dialog"});
  box.appendChild(el("div",{class:"row-between",style:{marginBottom:"var(--s4)"}},[
    el("h3",{text:opts.title||""}),
    el("button",{class:"btn-ghost btn btn-sm","aria-label":"Close",onclick:close,text:"Close"})
  ]));
  if (typeof opts.body==="string") box.appendChild(el("div",{class:"muted",html:opts.body}));
  else if (opts.body) box.appendChild(opts.body);
  if (opts.actions) box.appendChild(el("div",{class:"row",style:{marginTop:"var(--s5)",justifyContent:"flex-end"}},opts.actions));
  scrim.appendChild(box);
  scrim.addEventListener("mousedown",function(e){ if(e.target===scrim) close(); });
  const prev = document.activeElement;
  function key(e){
    if (e.key==="Escape"){ close(); return; }
    if (e.key!=="Tab") return;
    const f = box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first=f[0], last=f[f.length-1];
    if (e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
  function close(){
    document.removeEventListener("keydown",key);
    scrim.remove(); document.body.style.overflow="";
    if (prev && prev.focus) prev.focus();
    if (opts.onClose) opts.onClose();
  }
  document.addEventListener("keydown",key);
  document.body.style.overflow="hidden";
  document.body.appendChild(scrim);
  const auto = box.querySelector("input,select,textarea,button:not([aria-label=Close])");
  if (auto) auto.focus();
  return { close:close, box:box };
}

/* reveal-on-scroll, used by the guest pages */
let io=null;
function observeReveals(scope){
  if (!("IntersectionObserver" in window)){
    (scope||document).querySelectorAll(".reveal").forEach(function(n){ n.classList.add("is-in"); });
    return;
  }
  if (!io) io = new IntersectionObserver(function(ents){
    ents.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("is-in"); io.unobserve(e.target); } });
  },{ rootMargin:"0px 0px -8% 0px", threshold:0.08 });
  (scope||document).querySelectorAll(".reveal:not(.is-in)").forEach(function(n){ io.observe(n); });
}

/* count-up for KPI tiles */
function countUp(node, to, opts){
  opts = opts||{};
  const dur = opts.dur||900, dec = opts.dec||0, suf = opts.suffix||"", pre = opts.prefix||"";
  const from = opts.from||0, t0 = performance.now();
  function step(t){
    const p = Math.min(1,(t-t0)/dur);
    const e = 1-Math.pow(1-p,3);
    node.textContent = pre + (from+(to-from)*e).toFixed(dec) + suf;
    if (p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* tiny deterministic food-image stand-in: layered gradient plate */
function dishArt(seed, h){
  const hues = [18,28,34,8,46,12,22,40,52,4];
  const a = hues[Math.abs(hash(seed))%hues.length];
  const b = (a+18)%60;
  const n = el("div",{class:"dish-art",style:{height:(h||180)+"px"}});
  n.style.background =
    "radial-gradient(70% 90% at 30% 20%, hsl("+(a+10)+" 62% 34%) 0%, transparent 60%)," +
    "radial-gradient(60% 70% at 78% 72%, hsl("+b+" 70% 26%) 0%, transparent 62%)," +
    "linear-gradient(145deg, hsl("+a+" 38% 13%), hsl("+b+" 30% 8%))";
  n.appendChild(el("div",{class:"dish-art-ring"}));
  return n;
}
function hash(s){ s=String(s); let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return h; }

window.U = { el:el, esc:esc, clear:clear, money:money, pad:pad, hhmm:hhmm, mmss:mmss,
  dayName:dayName, longDate:longDate, shortDate:shortDate, ago:ago, dayOffsetOf:dayOffsetOf,
  isoDate:isoDate, fromIso:fromIso, toast:toast, modal:modal, observeReveals:observeReveals,
  countUp:countUp, dishArt:dishArt, hash:hash };
})();
