/* Shared inline-SVG floor plan renderer.
   Used by the guest table picker and by the admin live floor view.
   Accessible: every table is a focusable role=button with an aria-label,
   and callers are expected to also render the radio-list fallback. */
(function(){
"use strict";
const NS = "http://www.w3.org/2000/svg";
function s(tag, attrs){
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k]!==null && attrs[k]!==undefined) n.setAttribute(k, attrs[k]);
  return n;
}

let tip = null;
function showTip(txt, x, y){
  if (!tip){ tip = document.createElement("div"); tip.className="fp-tip"; document.body.appendChild(tip); }
  tip.textContent = txt;
  tip.style.left = (x+14)+"px"; tip.style.top = (y-10)+"px";
  tip.classList.add("on");
}
function hideTip(){ if (tip) tip.classList.remove("on"); }

/* opts: { statusOf(table)->"free"|"booked"|"seated"|"held"|"blocked",
           labelOf(table)->string, selectable(table)->bool, selected:[ids],
           onSelect(table), onHover(table), rooms:[ids] or null, legend:bool, height } */
function render(host, opts){
  opts = opts||{};
  const D = window.DATA;
  const wrap = document.createElement("div");
  wrap.className = "fp";
  const svg = s("svg",{ viewBox:"0 0 1000 700", width:"100%",
    preserveAspectRatio:"xMidYMid meet", role:"group",
    "aria-label":"Restaurant floor plan" });
  svg.style.display="block";
  if (opts.height) svg.style.maxHeight = opts.height;

  /* rooms */
  D.ROOMS.forEach(function(rm){
    if (opts.rooms && opts.rooms.indexOf(rm.id)<0) return;
    svg.appendChild(s("rect",{ x:rm.x, y:rm.y, width:rm.w, height:rm.h, rx:10, class:"fp-room" }));
    const lab = s("text",{ x:rm.x+14, y:rm.y+26, class:"fp-room-label" });
    lab.textContent = rm.name;
    svg.appendChild(lab);
  });

  /* hearth in the main dining room, pure decoration */
  const main = D.ROOMS.find(function(r){ return r.id==="r_common"; });
  if (main && (!opts.rooms || opts.rooms.indexOf("r_common")>=0)){
    const hx = main.x + main.w/2, hy = main.y + main.h/2 - 20;
    svg.appendChild(s("circle",{ cx:hx, cy:hy, r:34, fill:"rgba(224,168,78,.08)",
      stroke:"rgba(224,168,78,.35)", "stroke-dasharray":"4 5" }));
    const ht = s("text",{ x:hx, y:hy, "text-anchor":"middle", "dominant-baseline":"central",
      fill:"rgba(224,168,78,.65)", "font-size":"10", "letter-spacing":"2" });
    ht.textContent = "HEARTH";
    svg.appendChild(ht);
  }

  const nodes = {};
  D.TABLES.forEach(function(t){
    if (opts.rooms && opts.rooms.indexOf(t.roomId)<0) return;
    const st = opts.statusOf ? opts.statusOf(t) : "free";
    const sel = opts.selected && opts.selected.indexOf(t.id)>=0;
    const can = opts.selectable ? !!opts.selectable(t) : false;
    const g = s("g",{ class:"fp-t "+st+(sel?" is-sel":"")+((can||!opts.selectable)?"":" is-off"),
      tabindex: can?"0":"-1", role:"button",
      "aria-disabled": can?"false":"true",
      "aria-label": (opts.labelOf?opts.labelOf(t):(t.label+", seats "+t.min+" to "+t.max+", "+st)) });
    let cx, cy, r0;
    if (t.shape==="round"){
      cx=t.x; cy=t.y; r0=t.r;
      g.appendChild(s("circle",{ cx:cx, cy:cy, r:r0+9, class:"halo", fill:"none",
        stroke:"var(--amber-400)", "stroke-width":"0" }));
      g.appendChild(s("circle",{ cx:cx, cy:cy, r:r0, class:"shape" }));
    } else {
      const w=t.w, h=t.h; cx=t.x+w/2; cy=t.y+h/2; r0=Math.max(w,h)/2;
      g.appendChild(s("rect",{ x:t.x-8, y:t.y-8, width:w+16, height:h+16,
        rx: t.shape==="rect"?12:8, class:"halo", fill:"none",
        stroke:"var(--amber-400)", "stroke-width":"0" }));
      g.appendChild(s("rect",{ x:t.x, y:t.y, width:w, height:h,
        rx: t.shape==="rect"?10:7, class:"shape" }));
    }
    g.style.setProperty("--r0", r0+"px");
    g.style.transformOrigin = cx+"px "+cy+"px";
    const lab = s("text",{ x:cx, y:cy-6, class:"lab" }); lab.textContent = t.label;
    const cap = s("text",{ x:cx, y:cy+9, class:"cap" }); cap.textContent = t.min+"-"+t.max;
    g.appendChild(lab); g.appendChild(cap);

    function act(){ if (can && opts.onSelect) opts.onSelect(t, g); }
    g.addEventListener("click", act);
    g.addEventListener("keydown", function(e){
      if (e.key==="Enter"||e.key===" "){ e.preventDefault(); act(); }
    });
    g.addEventListener("mouseenter", function(e){
      const txt = opts.tipOf ? opts.tipOf(t) :
        t.label+"  -  seats "+t.min+"-"+t.max+"  -  "+st;
      showTip(txt, e.clientX, e.clientY);
      if (opts.onHover) opts.onHover(t);
    });
    g.addEventListener("mousemove", function(e){
      if (tip && tip.classList.contains("on")){
        tip.style.left=(e.clientX+14)+"px"; tip.style.top=(e.clientY-10)+"px";
      }
    });
    g.addEventListener("mouseleave", hideTip);
    g.addEventListener("blur", hideTip);
    svg.appendChild(g);
    nodes[t.id]=g;
  });

  wrap.appendChild(svg);
  if (opts.legend!==false){
    wrap.appendChild(el2("div","fp-legend",[
      leg("rgba(91,190,126,.5)","Available"),
      leg("rgba(234,179,8,.55)","Held, 10 min"),
      leg("rgba(106,166,214,.55)","Seated now"),
      leg("rgba(239,68,68,.45)","Reserved"),
      leg("rgba(244,239,230,.12)","Blocked")
    ]));
  }
  host.appendChild(wrap);
  return {
    svg:svg, nodes:nodes,
    pulse:function(id){
      const g=nodes[id]; if(!g) return;
      g.classList.remove("pulse"); void g.offsetWidth; g.classList.add("pulse");
    },
    setStatus:function(id, st){
      const g=nodes[id]; if(!g) return;
      g.classList.remove("free","booked","seated","held","blocked");
      g.classList.add(st);
    },
    select:function(id){
      Object.keys(nodes).forEach(function(k){ nodes[k].classList.toggle("is-sel", k===id); });
    }
  };
}
function leg(color, label){
  const d = document.createElement("span");
  d.innerHTML = '<i style="background:'+color+'"></i>'+label;
  return d;
}
function el2(tag, cls, kids){
  const n=document.createElement(tag); n.className=cls;
  kids.forEach(function(k){ n.appendChild(k); });
  return n;
}
window.FloorPlan = { render:render };
})();
