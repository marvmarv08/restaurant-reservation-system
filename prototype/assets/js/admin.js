/* Admin dashboard: service pass, live floor, reservations, waitlist,
   menu, tables, staff, settings and the audit feed.
   Everything reads and writes window.DATA so the other screens see the change. */
(function(){
"use strict";

var D = null, U = null;
function e(t,a,k){ return U.el(t,a,k); }

var PANELS = [
  { id:"service",  name:"Service",        note:"Tonight's pass" },
  { id:"floor",    name:"Floor",          note:"Live monitor" },
  { id:"res",      name:"Reservations",   note:"Book and amend" },
  { id:"wait",     name:"Waitlist",       note:"Ranked queue" },
  { id:"menu",     name:"Menu",           note:"Dishes and prices" },
  { id:"tables",   name:"Tables & rooms", note:"Capacity rules" },
  { id:"staff",    name:"Staff",          note:"Roles and access" },
  { id:"settings", name:"Settings",       note:"Service policy" },
  { id:"activity", name:"Activity",       note:"Audit and outbox" }
];

var ROLE_PANELS = {
  owner:   ["service","floor","res","wait","menu","tables","staff","settings","activity"],
  manager: ["service","floor","res","wait","menu","tables","staff","settings","activity"],
  host:    ["service","floor","res","wait","tables","activity"],
  kitchen: ["service","floor"],
  waiter:  ["service","floor"]
};
var ROLE_NOTE = {
  owner:   "Owner: full access to every panel, including pricing and service policy.",
  manager: "Manager: full access. Approves group bookings over 12 covers.",
  host:    "Host: Menu, Staff and Settings are hidden. Hosts seat and time the room, they do not change prices or policy.",
  kitchen: "Kitchen: Service and Floor only, read-only. No seating, booking or policy actions.",
  waiter:  "Waiter: Service and Floor only, read-only. Section service, no booking authority."
};
var ROLE_RULES = [
  { role:"owner",   can:"Everything. Pricing, policy, staff roles, blackout dates, all reservations." },
  { role:"manager", can:"Everything an owner can do in service. Approves groups over 12 and overrides minimum spend." },
  { role:"host",    can:"Service, Floor, Reservations, Waitlist, Tables and Activity. Seats guests, books walk-ins, moves tables." },
  { role:"kitchen", can:"Service and Floor, read-only. Works from the kitchen display instead." },
  { role:"waiter",  can:"Service and Floor, read-only. Marks their own section complete through the host." }
];

var S = {
  panel:"service",
  actorId:null,
  day:0,
  host:null,
  body:null,
  nav:null,
  roleNote:null,
  onPoll:null,
  res:{ sortKey:"time", sortDir:1, status:[], types:[], q:"", range:"today" }
};

function actor(){
  var i, list = D.STAFF;
  for (i=0;i<list.length;i++) if (list[i].id===S.actorId) return list[i];
  return list[0];
}
function role(){ return actor().role; }
function allowed(id){ return (ROLE_PANELS[role()]||[]).indexOf(id) >= 0; }
function canAct(){ var r = role(); return r==="owner"||r==="manager"||r==="host"; }
function readOnlyNote(){
  return e("div",{class:"adm-ro"},[
    e("span",{class:"badge badge-info"},"Read only"),
    e("span",{class:"muted",text:" "+ROLE_NOTE[role()]})
  ]);
}

/* ---------- shared small helpers ---------- */
var STATUS_KIND = {
  pending:"warn", confirmed:"info", seated:"ok", completed:"",
  cancelled:"crit", no_show:"crit", waitlisted:"warn"
};
var STATUS_LABEL = {
  pending:"Pending", confirmed:"Confirmed", seated:"Seated", completed:"Completed",
  cancelled:"Cancelled", no_show:"No show", waitlisted:"Waitlisted"
};
function statusBadge(st){
  var k = STATUS_KIND[st];
  return e("span",{class:"badge"+(k?" badge-"+k:"")},STATUS_LABEL[st]||st);
}
function surname(name){
  var p = String(name||"").split(" ");
  return p[p.length-1];
}
function selDate(){ return D.atMin(S.day,0); }
function sameDay(a,b){ return a.toDateString()===b.toDateString(); }
function dayRes(off){
  var d = D.atMin(off===undefined?S.day:off, 0);
  return D.RESERVATIONS.filter(function(r){ return sameDay(r.startsAt, d); });
}
function nowMin(){ var n=new Date(); return n.getHours()*60+n.getMinutes(); }
function totalSeats(){
  return D.TABLES.reduce(function(a,t){ return a+t.max; },0);
}
function hist(r, from, to){
  r.history.push({ at:new Date(), from:from, to:to, by:role()+" "+actor().name });
}
function panelHead(title, note, right){
  return e("header",{class:"adm-ph"},[
    e("div",{class:"grow"},[
      e("h2",{class:"adm-ph-t",text:title}),
      note ? e("p",{class:"muted adm-ph-n",text:note}) : null
    ]),
    right || null
  ]);
}

/* custom hover tooltip for timeline blocks */
var tipNode = null, tipTxt = "";
function tipShow(txt, x, y){
  if (!tipNode){ tipNode = e("div",{class:"adm-tip"}); document.body.appendChild(tipNode); }
  tipTxt = txt;
  U.clear(tipNode);
  String(txt).split("\n").forEach(function(line){
    tipNode.appendChild(e("div",{text:line}));
  });
  tipNode.style.left = (x+14)+"px";
  tipNode.style.top = (y+16)+"px";
  tipNode.classList.add("on");
}
function tipHide(){ if (tipNode) tipNode.classList.remove("on"); }

/* ---------- seating chain: reservation -> kitchen ticket ---------- */
function makeTicket(r){
  var pool = D.MENU.filter(function(m){ return m.cat!=="drinks" && !m.soldOut; });
  var n = D.int(2,4), items = [], i, m, seen = {};
  for (i=0;i<n;i++){
    m = D.pick(pool);
    if (!m || seen[m.id]) continue;
    seen[m.id] = 1;
    items.push({
      menuId:m.id, name:m.name, qty: D.rnd()<0.25?2:1, station:m.station,
      course: (m.cat==="snacks"||m.cat==="raw") ? 1 : (m.cat==="sweet" ? 3 : 2),
      mods:[], done:false
    });
  }
  var no = 1000 + D.TICKETS.length + 1;
  var t = {
    id: no, no:"#"+no, resId:r.id, tableLabel:r.tableLabel, roomId:r.roomId,
    party:r.party, guest:r.guest, allergy:r.allergy,
    orderType: r.typeId==="vip" ? "VIP SUITE" : r.typeId==="group" ? "GROUP"
      : r.typeId==="terrace" ? "TERRACE" : "DINE IN",
    firedAt:new Date(), state:"QUEUED", items:items,
    events:[{ at:new Date(), to:"QUEUED", by:actor().name }]
  };
  D.TICKETS.push(t);
  return t;
}
function seatRes(r){
  var from = r.status;
  r.status = "seated";
  hist(r, from, "seated");
  var t = makeTicket(r);
  U.toast("Table seated, ticket sent to the kitchen",
    r.guest+", party of "+r.party+" on "+r.tableLabel+". Ticket "+t.no+" is QUEUED.", "ok");
  render();
}
/* ---------- shell ---------- */
function mount(host){
  D = window.DATA; U = window.U;
  if (!S.actorId) S.actorId = D.STAFF[1].id;   /* land as the service manager */
  if (!allowed(S.panel)) S.panel = "service";

  var shell = e("div",{class:"adm"});
  shell.appendChild(topbar());
  S.nav = e("nav",{class:"adm-side","aria-label":"Dashboard sections"});
  S.body = e("div",{class:"adm-main",id:"adm-main",tabindex:"-1"});
  var grid = e("div",{class:"adm-grid"},[ S.nav, S.body ]);
  shell.appendChild(grid);
  host.appendChild(shell);
  S.host = host;

  renderNav();
  render();

  var clockId = setInterval(tickClock, 1000);
  APP.addTimer(clockId);
  var pollId = setInterval(poll, 2000);
  APP.addTimer(pollId);
  tickClock();
}

var clockNode = null, dotNode = null, pollNode = null;

function topbar(){
  var sel = e("select",{class:"select adm-role-sel",id:"adm-role",onchange:function(ev){
    S.actorId = ev.target.value;
    if (!allowed(S.panel)) S.panel = "service";
    renderNav(); render();
    U.toast("Acting as "+actor().name, ROLE_NOTE[role()], "info");
  }});
  D.STAFF.forEach(function(p){
    sel.appendChild(e("option",{value:p.id,selected:p.id===S.actorId?true:null},
      p.name+" - "+p.role));
  });

  var dateIn = e("input",{class:"input adm-date",type:"date",id:"adm-date",
    value:U.isoDate(selDate()), onchange:function(ev){
      if (!ev.target.value) return;
      S.day = U.dayOffsetOf(U.fromIso(ev.target.value));
      render();
    }});

  clockNode = e("span",{class:"mono adm-clock",text:"--:--:--"});
  dotNode = e("i",{class:"adm-dot","aria-hidden":"true"});
  pollNode = e("span",{class:"adm-poll-t",text:"live, 2s poll"});

  S.roleNote = e("p",{class:"adm-rolenote muted","aria-live":"polite",text:ROLE_NOTE[role()]});

  return e("div",{class:"adm-top"},[
    e("div",{class:"adm-top-row"},[
      e("div",{class:"adm-brandbit"},[
        e("span",{class:"eyebrow",text:"Lumina"}),
        e("strong",{class:"adm-brandbit-t",text:"Service dashboard"})
      ]),
      e("div",{class:"field adm-f"},[
        e("label",{class:"label",for:"adm-role",text:"Acting as"}), sel
      ]),
      e("div",{class:"field adm-f"},[
        e("label",{class:"label",for:"adm-date",text:"Service date"}), dateIn
      ]),
      e("div",{class:"adm-live"},[
        clockNode,
        e("span",{class:"adm-poll"},[ dotNode, pollNode ])
      ])
    ]),
    S.roleNote
  ]);
}

function tickClock(){
  if (!clockNode) return;
  var d = new Date();
  clockNode.textContent = U.pad(d.getHours())+":"+U.pad(d.getMinutes())+":"+U.pad(d.getSeconds());
}
function poll(){
  if (dotNode){
    dotNode.classList.remove("is-beat");
    void dotNode.offsetWidth;
    dotNode.classList.add("is-beat");
  }
  if (typeof S.onPoll === "function"){
    try { S.onPoll(); } catch(err){ S.onPoll = null; }
  }
}

function renderNav(){
  U.clear(S.nav);
  var strip = e("div",{class:"adm-side-in"});
  PANELS.forEach(function(p){
    if (!allowed(p.id)) return;
    var b = e("button",{class:"adm-navb"+(S.panel===p.id?" is-on":""),
      type:"button","aria-current":S.panel===p.id?"page":null,
      onclick:function(){ S.panel = p.id; renderNav(); render(); S.body.focus(); }},[
      e("span",{class:"adm-navb-t",text:p.name}),
      e("span",{class:"adm-navb-n",text:p.note})
    ]);
    strip.appendChild(b);
  });
  var hidden = PANELS.filter(function(p){ return !allowed(p.id); });
  S.nav.appendChild(strip);
  if (hidden.length){
    S.nav.appendChild(e("div",{class:"adm-side-note"},[
      e("span",{class:"badge badge-warn",text:"RBAC"}),
      e("p",{class:"muted",text:hidden.length+" section"+(hidden.length>1?"s":"")+
        " hidden for the "+role()+" role: "+hidden.map(function(p){return p.name;}).join(", ")+
        ". The built system enforces this on the server, not only in the nav."})
    ]));
  }
  if (S.roleNote) S.roleNote.textContent = ROLE_NOTE[role()];
}

function render(){
  if (!S.body) return;
  S.onPoll = null;
  U.clear(S.body);
  var map = {
    service:panelService, floor:panelFloor, res:panelRes, wait:panelWait,
    menu:panelMenu, tables:panelTables, staff:panelStaff,
    settings:panelSettings, activity:panelActivity
  };
  var fn = map[S.panel];
  if (!allowed(S.panel) || !fn){
    S.body.appendChild(e("div",{class:"card"},[
      e("h3",{text:"Not permitted"}),
      e("p",{class:"muted",text:ROLE_NOTE[role()]})
    ]));
    return;
  }
  fn(S.body);
}
/* ---------- metrics ---------- */
function metrics(){
  var occ = D.occupyingStatuses();
  var rs = dayRes();
  var live = rs.filter(function(r){ return occ.indexOf(r.status)>=0; });
  var covers = live.reduce(function(a,r){ return a+r.party; },0);
  var booked = rs.filter(function(r){ return r.status!=="cancelled" && r.status!=="waitlisted"; });
  var seated = rs.filter(function(r){ return r.status==="seated"||r.status==="completed"; });

  /* no-show rate, trailing 21 days */
  var from = D.atMin(-21,0), to = D.atMin(0,0), ns=0, done=0, i, r;
  for (i=0;i<D.RESERVATIONS.length;i++){
    r = D.RESERVATIONS[i];
    if (r.startsAt < from || r.startsAt >= to) continue;
    if (r.status==="no_show"){ ns++; done++; }
    else if (r.status==="completed"||r.status==="seated") done++;
  }
  var nsRate = done ? (ns/done*100) : 0;

  /* occupancy: booked or seated table-minutes over available table-minutes */
  var winMin = D.SERVICE_CLOSE - D.SERVICE_OPEN;
  var avail = D.TABLES.length * winMin;
  var used = 0;
  booked.forEach(function(r){
    var a = Math.max(r.slotMin, D.SERVICE_OPEN);
    var b = Math.min(r.slotMin + r.turnMin + D.BUFFER_MIN, D.SERVICE_CLOSE);
    if (b>a) used += (b-a);
  });
  var occPct = avail ? used/avail*100 : 0;

  /* average turn from completed reservations, all history */
  var ct = D.RESERVATIONS.filter(function(x){ return x.status==="completed"; });
  var avgTurn = ct.length ? ct.reduce(function(a,x){ return a+x.turnMin; },0)/ct.length : 0;

  /* RevPASH from sample spend */
  var spend = booked.reduce(function(a,r){ return a+(r.spend||0); },0);
  var hours = winMin/60;
  var revpash = (totalSeats()*hours) ? spend/(totalSeats()*hours) : 0;

  return { covers:covers, seatedN:seated.length, bookedN:booked.length,
    nsRate:nsRate, occPct:occPct, avgTurn:avgTurn, revpash:revpash,
    spend:spend, live:live, rs:rs, hours:hours };
}

function kpi(label, def, build){
  var val = e("div",{class:"kpi-val mono",text:"0"});
  var node = e("div",{class:"kpi"},[
    e("div",{class:"kpi-label",text:label}),
    val,
    e("div",{class:"kpi-sub",text:def})
  ]);
  build(val, node);
  return node;
}

function panelService(host){
  var m = metrics();
  var isToday = S.day===0;

  host.appendChild(panelHead("Service pass",
    U.longDate(selDate())+" . "+m.bookedN+" reservations on the book . "+m.covers+" covers committed",
    e("div",{class:"row"},[
      e("span",{class:"badge badge-accent",text:isToday?"Today":(S.day>0?"Future service":"Past service")}),
      canAct() ? e("button",{class:"btn btn-sm",type:"button",
        onclick:function(){ newResModal(); }},"New reservation") : null
    ])));

  if (!canAct()) host.appendChild(readOnlyNote());

  var tiles = e("div",{class:"grid g3 adm-kpis"});
  tiles.appendChild(kpi("Covers today","Guests committed in pending, confirmed and seated bookings",
    function(v){ U.countUp(v, m.covers, {dur:900}); }));
  tiles.appendChild(kpi("Seated vs booked","Parties already at a table out of every booking held for today",
    function(v){
      U.clear(v);
      var n = e("span",{text:"0"});
      v.appendChild(n);
      v.appendChild(e("span",{class:"kpi-of",text:" of "+m.bookedN}));
      U.countUp(n, m.seatedN, {dur:900});
    }));
  tiles.appendChild(kpi("No-show rate","Share of arrivals marked no show over the trailing 21 days",
    function(v){ U.countUp(v, m.nsRate, {dur:900, dec:1, suffix:"%"}); }));
  tiles.appendChild(kpi("Occupancy","Booked table-minutes divided by available table-minutes, "+
    D.hhmm(D.SERVICE_OPEN)+" to "+D.hhmm(D.SERVICE_CLOSE),
    function(v){ U.countUp(v, m.occPct, {dur:900, dec:1, suffix:"%"}); }));
  tiles.appendChild(kpi("Average turn","Mean seated duration from completed reservations across all history",
    function(v){ U.countUp(v, m.avgTurn, {dur:900, dec:0, suffix:" min"}); }));
  tiles.appendChild(kpi("RevPASH","Revenue per available seat hour, derived from sample spend data. "+
    totalSeats()+" seats over "+m.hours.toFixed(1)+" service hours",
    function(v){ U.countUp(v, m.revpash, {dur:900, dec:0, prefix:"\u20b1"}); }));
  host.appendChild(tiles);

  host.appendChild(timeline(m));
  host.appendChild(nextUp(m));
}

/* ---------- host timeline ---------- */
function timeline(m){
  var step = 15;
  var cols = Math.round((D.SERVICE_CLOSE - D.SERVICE_OPEN)/step);
  var wrap = e("section",{class:"card adm-sec"});
  wrap.appendChild(e("div",{class:"row-between adm-sec-h"},[
    e("div",{},[
      e("h3",{class:"adm-sec-t",text:"Host timeline"}),
      e("p",{class:"muted adm-sec-n",text:"Tables down, service time across in 15 minute columns. "+
        "Each block spans the turn time plus the "+D.BUFFER_MIN+" minute reset buffer. Click a block for the full record."})
    ]),
    e("div",{class:"adm-tl-key"},[
      key("pending","Pending"), key("confirmed","Confirmed"),
      key("seated","Seated"), key("completed","Completed"), key("no_show","No show")
    ])
  ]));

  var scroll = e("div",{class:"adm-tl-scroll"});
  var grid = e("div",{class:"adm-tl"});
  grid.style.setProperty("--tl-cols", String(cols));

  /* header row */
  var head = e("div",{class:"adm-tl-row adm-tl-head"});
  head.appendChild(e("div",{class:"adm-tl-lab adm-tl-corner",text:"Table"}));
  var i;
  for (i=0;i<cols;i++){
    var mins = D.SERVICE_OPEN + i*step;
    head.appendChild(e("div",{class:"adm-tl-time mono"+(mins%60===0?" is-hour":""),
      style:{gridColumn:String(i+2)},
      text: mins%60===0 ? D.hhmm(mins) : (mins%30===0 ? D.hhmm(mins).slice(3) : "")}));
  }
  grid.appendChild(head);

  var byTable = {};
  m.rs.forEach(function(r){
    if (r.status==="cancelled"||r.status==="waitlisted") return;
    if (!byTable[r.tableId]) byTable[r.tableId] = [];
    byTable[r.tableId].push(r);
  });

  D.ROOMS.forEach(function(rm){
    var rowG = e("div",{class:"adm-tl-row adm-tl-group"});
    rowG.appendChild(e("div",{class:"adm-tl-lab adm-tl-glab",text:rm.name}));
    rowG.appendChild(e("div",{class:"adm-tl-gbar",style:{gridColumn:"2 / span "+cols}}));
    grid.appendChild(rowG);

    D.TABLES.filter(function(t){ return t.roomId===rm.id; }).forEach(function(t){
      var row = e("div",{class:"adm-tl-row"});
      row.appendChild(e("div",{class:"adm-tl-lab"},[
        e("strong",{text:t.label}),
        e("span",{class:"mute2 adm-tl-cap",text:" "+t.min+"-"+t.max})
      ]));
      var c;
      for (c=0;c<cols;c++){
        row.appendChild(e("div",{class:"adm-tl-cell"+(((D.SERVICE_OPEN+c*step)%60===0)?" is-hour":""),
          style:{gridColumn:String(c+2)}}));
      }
      (byTable[t.id]||[]).forEach(function(r){
        var startCol = Math.round((r.slotMin - D.SERVICE_OPEN)/step);
        var span = Math.max(1, Math.round((r.turnMin + D.BUFFER_MIN)/step));
        if (startCol < 0){ span += startCol; startCol = 0; }
        if (span < 1) return;
        if (startCol + span > cols) span = cols - startCol;
        var blk = e("button",{class:"adm-blk st-"+r.status, type:"button",
          style:{gridColumn:(startCol+2)+" / span "+span},
          "aria-label":r.guest+", party of "+r.party+", "+D.hhmm(r.slotMin)+
            " to "+U.hhmm(r.endsAt)+", table "+r.tableLabel+", "+(STATUS_LABEL[r.status]||r.status),
          onclick:function(){ resModal(r); },
          onmouseenter:function(ev){
            tipShow(r.guest+"  .  party of "+r.party+"\n"+D.hhmm(r.slotMin)+" - "+U.hhmm(r.endsAt)+
              " (+"+D.BUFFER_MIN+"m buffer)\n"+(STATUS_LABEL[r.status]||r.status)+"  .  "+r.ref+
              (r.allergy ? "\nAllergy: "+r.allergy : "\nNo allergies noted"), ev.clientX, ev.clientY);
          },
          onmousemove:function(ev){ tipShow(tipTxt, ev.clientX, ev.clientY); },
          onmouseleave:tipHide, onblur:tipHide},[
          e("span",{class:"adm-blk-t",text:surname(r.guest)+" "+r.party}),
          r.allergy ? e("span",{class:"adm-blk-a","aria-hidden":"true",text:"!"}) : null
        ]);
        row.appendChild(blk);
      });
      grid.appendChild(row);
    });
  });

  /* now line */
  if (S.day===0){
    var line = e("div",{class:"adm-tl-now","aria-hidden":"true"},[ e("span",{class:"adm-tl-now-t mono"}) ]);
    grid.appendChild(line);
    var place = function(){
      var nm = nowMin();
      var p = (nm - D.SERVICE_OPEN)/step;
      if (p < 0 || p > cols){ line.style.display = "none"; return; }
      line.style.display = "";
      line.style.left = "calc(var(--tl-lab) + "+p.toFixed(3)+" * var(--tl-col))";
      line.firstChild.textContent = D.hhmm(nm);
    };
    place();
    S.onPoll = place;
  }

  scroll.appendChild(grid);
  wrap.appendChild(scroll);
  return wrap;
}
function key(st, label){
  return e("span",{class:"adm-key"},[ e("i",{class:"st-"+st}), label ]);
}

function nextUp(m){
  var now = new Date();
  var up = m.rs.filter(function(r){
    return (r.status==="confirmed"||r.status==="pending") && r.startsAt > now;
  }).sort(function(a,b){ return a.startsAt - b.startsAt; }).slice(0,4);

  var list = e("div",{class:"adm-next"});
  if (!up.length){
    list.appendChild(e("p",{class:"muted",text:"No further arrivals booked for this service."}));
  }
  up.forEach(function(r){
    list.appendChild(e("div",{class:"adm-next-row"},[
      e("span",{class:"mono adm-next-tm",text:D.hhmm(r.slotMin)}),
      e("span",{class:"grow adm-next-g"},[
        e("strong",{text:r.guest}),
        e("span",{class:"mute2",text:"  party of "+r.party+"  .  "+r.tableLabel+"  .  "+r.roomId.replace("r_","")})
      ]),
      r.allergy ? e("span",{class:"badge badge-crit",text:"Allergy"}) : null,
      statusBadge(r.status),
      canAct() ? e("button",{class:"btn btn-sm",type:"button",
        "aria-label":"Seat "+r.guest,
        onclick:function(){ seatRes(r); }},"Seat") : null
    ]));
  });

  return e("section",{class:"card adm-sec"},[
    e("div",{class:"adm-sec-h"},[
      e("h3",{class:"adm-sec-t",text:"Next up"}),
      e("p",{class:"muted adm-sec-n",text:"The next four arrivals. Seating writes history and fires a kitchen ticket."})
    ]),
    list
  ]);
}
/* ---------- floor ---------- */
function blockedToday(){
  var d = selDate(), i, b;
  for (i=0;i<D.BLACKOUTS.length;i++){
    b = D.BLACKOUTS[i];
    if (sameDay(b.date, d)) return b;
  }
  return null;
}

function panelFloor(host){
  var bo = blockedToday();
  host.appendChild(panelHead("Live floor",
    "Read-only monitor of the room as it stands right now. Status comes from the reservation engine, not a manual board.",
    e("span",{class:"badge badge-info"},"Monitor")));

  if (bo) host.appendChild(e("div",{class:"adm-ro"},[
    e("span",{class:"badge badge-crit",text:"Blackout"}),
    e("span",{class:"muted",text:" "+bo.label+" ("+bo.scope.replace("_"," ")+")"})
  ]));

  var cols = e("div",{class:"adm-floor"});
  var left = e("div",{class:"adm-floor-plan"});
  var right = e("div",{class:"adm-floor-side stack"});
  cols.appendChild(left); cols.appendChild(right);
  host.appendChild(cols);

  function st(t){
    if (bo && (bo.scope==="venue" || bo.typeId===t.typeId)) return "blocked";
    var r = D.tableStatusAt(t.id, new Date());
    return r.status;
  }
  var fp = window.FloorPlan.render(left, {
    statusOf: st,
    legend: true,
    height: "62vh",
    labelOf: function(t){
      var r = D.tableStatusAt(t.id, new Date());
      return t.label+", "+t.roomName+", seats "+t.min+" to "+t.max+", "+
        (r.res ? (r.status+" by "+r.res.guest) : st(t));
    },
    tipOf: function(t){
      var r = D.tableStatusAt(t.id, new Date());
      if (!r.res) return t.label+"  .  seats "+t.min+"-"+t.max+"  .  "+st(t);
      return t.label+"  .  "+r.res.guest+", party of "+r.res.party+"  .  "+
        D.hhmm(r.res.slotMin)+" - "+U.hhmm(r.res.endsAt);
    }
  });

  var counts = e("div",{class:"adm-fsum","aria-live":"polite"});
  var seatedBox = e("div",{class:"stack"});

  function paint(){
    var c = { free:0, seated:0, booked:0, blocked:0 };
    D.TABLES.forEach(function(t){
      var s = st(t);
      c[s] = (c[s]||0)+1;
      fp.setStatus(t.id, s);
    });
    U.clear(counts);
    [["free","Free","ok"],["seated","Seated","info"],["booked","Reserved","crit"],["blocked","Blocked",""]]
      .forEach(function(row){
        counts.appendChild(e("div",{class:"adm-fsum-c"},[
          e("span",{class:"adm-fsum-n mono",text:String(c[row[0]]||0)}),
          e("span",{class:"adm-fsum-l",text:row[1]}),
          e("span",{class:"badge"+(row[2]?" badge-"+row[2]:""),text:row[0]})
        ]));
      });

    U.clear(seatedBox);
    var now = new Date();
    var seated = D.RESERVATIONS.filter(function(r){ return r.status==="seated"; })
      .sort(function(a,b){ return a.startsAt-b.startsAt; });
    if (!seated.length) seatedBox.appendChild(e("p",{class:"muted",text:"Nobody is seated at this moment."}));
    seated.forEach(function(r){
      var mins = Math.max(0, Math.round((now - r.startsAt)/60000));
      var over = mins > r.turnMin;
      seatedBox.appendChild(e("div",{class:"adm-seated"+(over?" is-over":"")},[
        e("span",{class:"mono adm-seated-t",text:mins+"m"}),
        e("span",{class:"grow"},[
          e("strong",{text:r.guest}),
          e("span",{class:"mute2",text:"  "+r.tableLabel+"  .  party of "+r.party+
            "  .  turn "+r.turnMin+"m"})
        ]),
        over ? e("span",{class:"badge badge-warn",text:"Over turn"}) : null,
        canAct() ? e("button",{class:"btn btn-ghost btn-sm",type:"button",
          "aria-label":"Mark "+r.guest+" complete",
          onclick:function(){ completeRes(r); }},"Mark complete") : null
      ]));
    });
  }
  paint();
  S.onPoll = paint;

  right.appendChild(e("section",{class:"card"},[
    e("h3",{class:"adm-sec-t",text:"Room at a glance"}),
    counts
  ]));
  right.appendChild(e("section",{class:"card"},[
    e("h3",{class:"adm-sec-t",text:"Seated now"}),
    e("p",{class:"muted adm-sec-n",text:"Elapsed time against the turn allowance for the party size."}),
    seatedBox
  ]));
  right.appendChild(e("section",{class:"card adm-planned"},[
    e("h3",{class:"adm-sec-t",text:"Move or edit tables"}),
    e("p",{class:"muted adm-sec-n",text:"In the built system a manager drags a table to a new position, "+
      "resizes it and saves the plan, and the coordinates persist per room. This prototype renders the saved plan only."}),
    e("button",{class:"btn btn-ghost btn-sm",type:"button",disabled:true,
      "aria-disabled":"true"},"Drag to edit (planned)"),
    e("span",{class:"badge badge-warn adm-planned-b",text:"Not built here"})
  ]));
}

function completeRes(r){
  hist(r, r.status, "completed");
  r.status = "completed";
  var next = null, i;
  for (i=0;i<D.WAITLIST.length;i++){
    if (D.WAITLIST[i].status==="waiting"){ next = D.WAITLIST[i]; break; }
  }
  U.toast(r.tableLabel+" is free",
    next ? ("Waitlist rank "+next.rank+", "+next.guest+" (party of "+next.party+
      "), is promoted for this table.")
      : "Nobody is waiting, the table returns to the open pool.", "ok");
  render();
}
/* ---------- reservations ---------- */
var ALL_STATUS = ["pending","confirmed","seated","completed","cancelled","no_show","waitlisted"];
var RANGES = [
  { id:"today", name:"Today" }, { id:"next7", name:"Next 7 days" },
  { id:"past7", name:"Past 7 days" }, { id:"all", name:"All" }
];

function resFiltered(){
  var f = S.res, q = f.q.toLowerCase();
  var t0 = D.atMin(0,0).getTime(), day = 86400000;
  return D.RESERVATIONS.filter(function(r){
    if (f.status.length && f.status.indexOf(r.status)<0) return false;
    if (f.types.length && f.types.indexOf(r.typeId)<0) return false;
    if (q){
      var hay = (r.guest+" "+r.ref+" "+r.phone+" "+r.email).toLowerCase();
      if (hay.indexOf(q)<0) return false;
    }
    var s = r.startsAt.getTime();
    if (f.range==="today") return s>=t0 && s<t0+day;
    if (f.range==="next7") return s>=t0 && s<t0+7*day;
    if (f.range==="past7") return s<t0 && s>=t0-7*day;
    return true;
  }).sort(function(a,b){
    var k = S.res.sortKey, d = S.res.sortDir, av, bv;
    if (k==="ref"){ av=a.ref; bv=b.ref; }
    else if (k==="guest"){ av=a.guest; bv=b.guest; }
    else if (k==="party"){ av=a.party; bv=b.party; }
    else if (k==="room"){ av=a.roomId; bv=b.roomId; }
    else if (k==="table"){ av=a.tableLabel; bv=b.tableLabel; }
    else if (k==="status"){ av=a.status; bv=b.status; }
    else if (k==="source"){ av=a.source; bv=b.source; }
    else { av=a.startsAt.getTime(); bv=b.startsAt.getTime(); }
    if (av<bv) return -1*d;
    if (av>bv) return 1*d;
    return 0;
  });
}

function panelRes(host){
  host.appendChild(panelHead("Reservations",
    "Filter, sort and amend the book. Only legal state transitions are offered on each record.",
    canAct() ? e("button",{class:"btn btn-sm",type:"button",
      onclick:function(){ newResModal(); }},"New reservation") : null));

  var filters = e("div",{class:"card adm-filters"});
  var statRow = e("div",{class:"adm-chiprow"});
  ALL_STATUS.forEach(function(st){
    var on = S.res.status.indexOf(st)>=0;
    statRow.appendChild(e("button",{class:"chip"+(on?" is-on":""),type:"button",
      "aria-pressed":on?"true":"false",
      onclick:function(){
        var i = S.res.status.indexOf(st);
        if (i>=0) S.res.status.splice(i,1); else S.res.status.push(st);
        render();
      }}, STATUS_LABEL[st]));
  });
  var typeRow = e("div",{class:"adm-chiprow"});
  D.ROOM_TYPES.forEach(function(rt){
    var on = S.res.types.indexOf(rt.id)>=0;
    typeRow.appendChild(e("button",{class:"chip"+(on?" is-on":""),type:"button",
      "aria-pressed":on?"true":"false",
      onclick:function(){
        var i = S.res.types.indexOf(rt.id);
        if (i>=0) S.res.types.splice(i,1); else S.res.types.push(rt.id);
        render();
      }}, rt.name));
  });
  var rangeSel = e("select",{class:"select",id:"adm-range",onchange:function(ev){
    S.res.range = ev.target.value; render();
  }});
  RANGES.forEach(function(r){
    rangeSel.appendChild(e("option",{value:r.id,selected:S.res.range===r.id?true:null}, r.name));
  });
  var search = e("input",{class:"input",id:"adm-q",type:"search",value:S.res.q,
    placeholder:"Maya Cruz, LUM-4KQ2PX, +63 9...",
    oninput:function(ev){ S.res.q = ev.target.value; redrawRows(); }});

  filters.appendChild(e("div",{class:"adm-filter-grid"},[
    e("div",{class:"field"},[ e("span",{class:"label",text:"Status"}), statRow ]),
    e("div",{class:"field"},[ e("span",{class:"label",text:"Room type"}), typeRow ]),
    e("div",{class:"field adm-f"},[ e("label",{class:"label",for:"adm-range",text:"Date range"}), rangeSel ]),
    e("div",{class:"field adm-f"},[ e("label",{class:"label",for:"adm-q",text:"Search guest, ref or phone"}), search ])
  ]));
  host.appendChild(filters);

  var count = e("p",{class:"muted adm-count","aria-live":"polite"});
  host.appendChild(count);

  var cols = [
    ["ref","Ref"],["guest","Guest"],["party","Party"],["room","Room"],["table","Table"],
    ["date","Date"],["time","Time"],["status","Status"],["source","Source"]
  ];
  var tbody = e("tbody",{});
  var thead = e("thead",{});
  var hr = e("tr",{});
  cols.forEach(function(c){
    var on = S.res.sortKey===c[0] || (c[0]==="time" && S.res.sortKey==="time");
    hr.appendChild(e("th",{},[
      e("button",{class:"adm-sort"+(S.res.sortKey===c[0]?" is-on":""),type:"button",
        "aria-label":"Sort by "+c[1],
        onclick:function(){
          if (S.res.sortKey===c[0]) S.res.sortDir *= -1;
          else { S.res.sortKey = c[0]; S.res.sortDir = 1; }
          render();
        }},[ c[1], e("span",{class:"adm-sort-i",
          text: S.res.sortKey===c[0] ? (S.res.sortDir>0?" \u2191":" \u2193") : " \u2195"}) ])
    ]));
  });
  thead.appendChild(hr);

  function redrawRows(){
    var rows = resFiltered();
    U.clear(tbody);
    count.textContent = rows.length+" reservation"+(rows.length===1?"":"s")+" match the filters";
    rows.slice(0,400).forEach(function(r){
      var tr = e("tr",{class:"adm-row",tabindex:"0",role:"button",
        "aria-label":"Open "+r.ref+", "+r.guest,
        onclick:function(){ resModal(r); },
        onkeydown:function(ev){ if (ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); resModal(r); } }},[
        e("td",{class:"mono",text:r.ref}),
        e("td",{},[ e("strong",{text:r.guest}),
          r.allergy ? e("span",{class:"adm-allergy-dot",title:"Allergy noted",text:" !"}) : null ]),
        e("td",{class:"mono",text:String(r.party)}),
        e("td",{text:(function(){ var rm=null,i; for(i=0;i<D.ROOMS.length;i++) if(D.ROOMS[i].id===r.roomId) rm=D.ROOMS[i];
          return rm?rm.name:r.roomId; })()}),
        e("td",{class:"mono",text:r.tableLabel}),
        e("td",{text:U.shortDate(r.startsAt)}),
        e("td",{class:"mono",text:D.hhmm(r.slotMin)}),
        e("td",{},statusBadge(r.status)),
        e("td",{class:"mute2",text:r.source})
      ]);
      tbody.appendChild(tr);
    });
    if (!rows.length){
      tbody.appendChild(e("tr",{},[ e("td",{colspan:"9",class:"muted",
        text:"Nothing matches. Widen the date range or clear a chip."}) ]));
    }
  }
  redrawRows();

  host.appendChild(e("div",{class:"card adm-tblcard"},[
    e("div",{class:"tbl-scroll adm-tbl-scroll"},[
      e("table",{class:"tbl"},[ thead, tbody ])
    ])
  ]));
}

/* ---------- state machine ---------- */
function transitions(st){
  if (st==="pending")   return ["confirmed","cancelled"];
  if (st==="confirmed") return ["seated","no_show","cancelled"];
  if (st==="seated")    return ["completed"];
  if (st==="waitlisted")return ["confirmed","cancelled"];
  return [];
}
var ACTION_LABEL = { confirmed:"Confirm", seated:"Seat", completed:"Complete",
  no_show:"Mark no show", cancelled:"Cancel" };

function applyTransition(r, to, closeFn){
  if (to==="seated"){ if (closeFn) closeFn(); seatRes(r); return; }
  if (to==="completed"){ if (closeFn) closeFn(); completeRes(r); return; }
  var from = r.status;
  hist(r, from, to);
  r.status = to;
  if (to==="confirmed") D.send("email", r.email, "Your table at Lumina is confirmed",
    "Hello "+r.guest+", your table "+r.tableLabel+" for "+r.party+" on "+
    U.longDate(r.startsAt)+" at "+D.hhmm(r.slotMin)+" is confirmed. Reference "+r.ref+".");
  if (to==="cancelled") D.send("email", r.email, "Your Lumina reservation is cancelled",
    "Hello "+r.guest+", reservation "+r.ref+" on "+U.longDate(r.startsAt)+" has been cancelled. "+
    "The table is released back to the floor.");
  if (to==="no_show") D.send("sms", r.phone, "Lumina",
    "We held "+r.tableLabel+" for "+D.VENUE.noShowGraceMin+" minutes and have now released it. "+
    "Call "+D.VENUE.phone+" to rebook.");
  U.toast(r.ref+" is now "+(STATUS_LABEL[to]||to), r.guest+" moved from "+from+" to "+to+
    ", written to the audit trail by "+actor().name+".", to==="cancelled"||to==="no_show"?"crit":"ok");
  if (closeFn) closeFn();
  render();
}

function resModal(r){
  var body = e("div",{class:"stack adm-rm"});
  function row(k,v){ return e("div",{class:"adm-rm-row"},[
    e("span",{class:"label",text:k}), e("span",{text:v}) ]); }

  body.appendChild(e("div",{class:"row adm-rm-top"},[
    statusBadge(r.status),
    e("span",{class:"mono",text:r.ref}),
    e("span",{class:"mute2",text:r.source+" booking"})
  ]));
  var rmName = r.roomId, i;
  for (i=0;i<D.ROOMS.length;i++) if (D.ROOMS[i].id===r.roomId) rmName = D.ROOMS[i].name;

  var facts = e("div",{class:"adm-rm-grid"},[
    row("Guest", r.guest), row("Party", String(r.party)+" covers"),
    row("Phone", r.phone), row("Email", r.email),
    row("Date", U.longDate(r.startsAt)),
    row("Time", D.hhmm(r.slotMin)+" - "+U.hhmm(r.endsAt)+" (turn "+r.turnMin+"m, buffer "+D.BUFFER_MIN+"m)"),
    row("Room", rmName), row("Table", r.tableLabel),
    row("Occasion", r.occasion || "None given"),
    row("Sample spend", U.money(r.spend)),
    row("Booked", U.longDate(r.createdAt)+" ("+U.ago(r.createdAt)+")")
  ]);
  body.appendChild(facts);

  if (r.request) body.appendChild(e("div",{class:"adm-rm-note"},[
    e("span",{class:"label",text:"Request"}), e("p",{text:r.request}) ]));
  if (r.allergy) body.appendChild(e("div",{class:"adm-rm-note is-crit"},[
    e("span",{class:"label",text:"Allergy and dietary"}), e("p",{text:r.allergy}) ]));

  var tl = e("ol",{class:"adm-hist"});
  r.history.slice().sort(function(a,b){ return a.at-b.at; }).forEach(function(h){
    tl.appendChild(e("li",{},[
      e("span",{class:"mono adm-hist-t",text:U.hhmm(h.at)+" "+U.shortDate(h.at)}),
      e("span",{class:"grow",text:(h.from?h.from+" to ":"created as ")+h.to}),
      e("span",{class:"mute2",text:h.by})
    ]));
  });
  body.appendChild(e("div",{},[
    e("span",{class:"label",text:"History"}), tl ]));

  var m = U.modal({ title:r.guest+", party of "+r.party, body:body, actions:[] });
  var acts = transitions(r.status);
  var holder = e("div",{class:"row adm-rm-acts"});
  if (!canAct()){
    holder.appendChild(e("span",{class:"muted",text:ROLE_NOTE[role()]}));
  } else if (!acts.length){
    holder.appendChild(e("span",{class:"muted",
      text:"No transitions are legal from "+(STATUS_LABEL[r.status]||r.status)+". This record is closed."}));
  } else {
    acts.forEach(function(to){
      holder.appendChild(e("button",{
        class:"btn btn-sm"+(to==="cancelled"||to==="no_show"?" btn-danger":(to==="seated"?"":" btn-ghost")),
        type:"button", onclick:function(){ applyTransition(r, to, m.close); }
      }, ACTION_LABEL[to]));
    });
  }
  m.box.appendChild(holder);
}

/* ---------- new reservation ---------- */
function newResModal(prefill){
  prefill = prefill || {};
  var slots = D.slotList();
  var nm = nowMin(), i, defSlot = slots[0];
  for (i=0;i<slots.length;i++){ if (slots[i] >= nm){ defSlot = slots[i]; break; } }
  if (S.day !== 0) defSlot = slots[0];

  var name = e("input",{class:"input",id:"nr-name",required:true,value:prefill.guest||""});
  var phone = e("input",{class:"input",id:"nr-phone",type:"tel",value:prefill.phone||""});
  var party = e("input",{class:"input",id:"nr-party",type:"number",min:"1",max:"16",
    value:String(prefill.party||2)});
  var when = e("select",{class:"select",id:"nr-slot"});
  slots.forEach(function(s){
    when.appendChild(e("option",{value:String(s),selected:s===(prefill.wantedSlot||defSlot)?true:null}, D.hhmm(s)));
  });
  var type = e("select",{class:"select",id:"nr-type"});
  type.appendChild(e("option",{value:"any"},"Any room"));
  D.ROOM_TYPES.forEach(function(rt){
    type.appendChild(e("option",{value:rt.id,selected:prefill.typeId===rt.id?true:null}, rt.name));
  });
  var allergy = e("input",{class:"input",id:"nr-allergy",value:prefill.allergy||""});
  var out = e("div",{class:"adm-nr-out","aria-live":"polite"});
  var chosen = null;

  function look(){
    var p = Math.max(1, parseInt(party.value,10)||2);
    var a = D.availability(S.day, parseInt(when.value,10), p, type.value);
    U.clear(out);
    chosen = null;
    if (!a.ok && a.reason==="blackout"){
      out.appendChild(e("p",{class:"err",text:"Blocked: "+a.blackout.label}));
      return;
    }
    if (!a.ok){
      var combos = D.combinations(S.day, parseInt(when.value,10), p, type.value);
      out.appendChild(e("p",{class:"err",text:"No single table fits "+p+" at "+D.hhmm(parseInt(when.value,10))+"."}));
      if (combos.length) out.appendChild(e("p",{class:"muted",
        text:"Joinable option: "+combos[0].tables[0].label+" plus "+combos[0].tables[1].label+
          " seats "+combos[0].seats+". Joining is a manager action in the built system."}));
      return;
    }
    chosen = a.tables[0];
    out.appendChild(e("p",{class:"muted"},[
      e("strong",{text:"Best fit "+chosen.label}),
      " in "+chosen.roomName+", seats "+chosen.min+" to "+chosen.max+
        ", turn "+a.turn+" minutes. "+(a.tables.length-1)+" other table(s) free at this time."
    ]));
  }
  [party, when, type].forEach(function(n){ n.addEventListener("change", look); });

  var form = e("div",{class:"stack"},[
    e("p",{class:"muted",text:"Walk-in or phone booking for "+U.longDate(selDate())+
      ". Availability comes straight from the engine, including the "+D.BUFFER_MIN+" minute buffer."}),
    e("div",{class:"grid g2"},[
      e("div",{class:"field"},[ e("label",{class:"label",for:"nr-name",text:"Guest name"}), name ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"nr-phone",text:"Phone"}), phone ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"nr-party",text:"Party size"}), party ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"nr-slot",text:"Time"}), when ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"nr-type",text:"Room"}), type ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"nr-allergy",text:"Allergy or dietary"}), allergy ])
    ]),
    out
  ]);

  var m = U.modal({ title:"New reservation", body:form, actions:[] });
  look();
  m.box.appendChild(e("div",{class:"row adm-rm-acts"},[
    e("button",{class:"btn btn-ghost btn-sm",type:"button",onclick:function(){ m.close(); }},"Discard"),
    e("button",{class:"btn btn-sm",type:"button",onclick:function(){
      if (!name.value.trim()){ U.toast("Guest name is required","Enter a name before booking.","crit"); name.focus(); return; }
      if (!chosen){ U.toast("No table available","Change the time, party size or room.","crit"); return; }
      var p = Math.max(1, parseInt(party.value,10)||2);
      var slot = parseInt(when.value,10);
      var starts = D.atMin(S.day, slot), turn = D.turnFor(p);
      var r = {
        id: Math.max.apply(null, D.RESERVATIONS.map(function(x){return x.id;}))+1,
        ref: D.ref(), guest:name.value.trim(),
        phone: phone.value || D.VENUE.phone,
        email: name.value.trim().toLowerCase().replace(/[^a-z]/g,".")+"@mail.test",
        party:p, tableId:chosen.id, tableLabel:chosen.label,
        roomId:chosen.roomId, typeId:chosen.typeId,
        startsAt:starts, endsAt:new Date(starts.getTime()+turn*60000),
        blocksUntil:new Date(starts.getTime()+(turn+D.BUFFER_MIN)*60000),
        slotMin:slot, turnMin:turn, status:"confirmed",
        occasion:"", request:"", allergy:allergy.value || "",
        createdAt:new Date(), source:"walk-in", covers:p,
        spend: Math.round(p*D.int(900,2600)/10)*10, history:[]
      };
      r.history.push({ at:new Date(), from:null, to:"pending", by:role()+" "+actor().name });
      r.history.push({ at:new Date(), from:"pending", to:"confirmed", by:role()+" "+actor().name });
      D.RESERVATIONS.push(r);
      D.send("sms", r.phone, "Lumina",
        "Booked: "+r.party+" at "+D.hhmm(slot)+" on "+U.shortDate(starts)+", table "+r.tableLabel+". Ref "+r.ref+".");
      m.close();
      U.toast("Reservation "+r.ref+" created", r.guest+", party of "+r.party+" on "+r.tableLabel+".", "ok");
      render();
    }},"Book table")
  ]));
  return m;
}
/* ---------- waitlist ---------- */
var CLAIM_MIN = 10;
function panelWait(host){
  host.appendChild(panelHead("Waitlist",
    "Ranked queue for tonight. Offering a table runs the availability engine, picks the best fit and texts the guest.",
    e("span",{class:"badge badge-accent",text:D.WAITLIST.length+" in queue"})));

  host.appendChild(e("p",{class:"muted adm-explain",text:
    "In the built system a cancellation or an early finish auto-promotes rank 1, sends the offer and starts a "+
    CLAIM_MIN+" minute claim window. Here the promotion is triggered by the host action below or by marking a table complete."}));

  var list = e("div",{class:"grid g2 adm-wl"});
  if (!D.WAITLIST.length) list.appendChild(e("p",{class:"muted",text:"The waitlist is empty."}));

  D.WAITLIST.forEach(function(w){
    var typeName = w.typeId, i;
    for (i=0;i<D.ROOM_TYPES.length;i++) if (D.ROOM_TYPES[i].id===w.typeId) typeName = D.ROOM_TYPES[i].name;
    var waited = Math.max(0, Math.round((Date.now()-w.addedAt.getTime())/60000));
    var card = e("article",{class:"card adm-wl-c"+(w.status==="notified"?" is-notified":"")});
    var countdown = e("span",{class:"mono adm-wl-cd","aria-live":"polite"});

    card.appendChild(e("div",{class:"row-between"},[
      e("span",{class:"adm-wl-rank mono",text:"#"+w.rank}),
      e("span",{class:"badge"+(w.status==="notified"?" badge-warn":w.status==="seated"?" badge-ok":""),
        text:w.status})
    ]));
    card.appendChild(e("h3",{class:"adm-wl-g",text:w.guest}));
    card.appendChild(e("p",{class:"muted adm-wl-m",text:"Party of "+w.party+" . wants "+D.hhmm(w.wantedSlot)+
      " . "+typeName+" . "+w.phone}));
    card.appendChild(e("p",{class:"mute2 adm-wl-m",text:"Waiting "+waited+" minutes (added "+U.hhmm(w.addedAt)+")"}));
    if (w.status==="notified" && w.notifiedAt){
      card.appendChild(e("p",{class:"adm-wl-claim"},[
        e("span",{class:"label",text:"Claim window"}), countdown ]));
      var tickClaim = function(){
        var left = CLAIM_MIN*60 - (Date.now()-w.notifiedAt.getTime())/1000;
        countdown.textContent = left>0 ? U.mmss(left)+" left" : "expired";
        countdown.className = "mono adm-wl-cd"+(left<=0?" is-gone":"");
      };
      tickClaim();
      var cid = setInterval(tickClaim, 1000);
      APP.addTimer(cid);
    }

    if (canAct()){
      card.appendChild(e("div",{class:"row adm-wl-acts"},[
        e("button",{class:"btn btn-ghost btn-sm",type:"button",
          onclick:function(){ offerTable(w); }},"Offer table"),
        e("button",{class:"btn btn-sm",type:"button",
          onclick:function(){ seatFromWaitlist(w); }},"Seat now"),
        e("button",{class:"btn btn-danger btn-sm",type:"button",
          "aria-label":"Remove "+w.guest+" from the waitlist",
          onclick:function(){
            var i = D.WAITLIST.indexOf(w);
            if (i>=0) D.WAITLIST.splice(i,1);
            D.WAITLIST.forEach(function(x,n){ x.rank = n+1; });
            U.toast("Removed from waitlist", w.guest+" was taken off the queue and ranks were rebuilt.","");
            render();
          }},"Remove")
      ]));
    } else {
      card.appendChild(e("p",{class:"mute2",text:"Read only for the "+role()+" role."}));
    }
    list.appendChild(card);
  });
  host.appendChild(list);
  if (!canAct()) host.appendChild(readOnlyNote());
}

function bestFor(w){
  var a = D.availability(S.day, w.wantedSlot, w.party, w.typeId);
  if (a.ok) return a.tables[0];
  var b = D.availability(S.day, w.wantedSlot, w.party, "any");
  return b.ok ? b.tables[0] : null;
}
function offerTable(w){
  var t = bestFor(w);
  if (!t){
    U.toast("Nothing free for that party","No table fits "+w.party+" at "+D.hhmm(w.wantedSlot)+
      ". Offer a later slot or a different room.","crit");
    return;
  }
  w.status = "notified";
  w.notifiedAt = new Date();
  D.send("sms", w.phone, "Lumina",
    "Good news "+w.guest+", table "+t.label+" in "+t.roomName+" is free for "+w.party+" at "+
    D.hhmm(w.wantedSlot)+". Reply YES within "+CLAIM_MIN+" minutes to claim it, or it returns to the floor.");
  U.toast("Offer sent to "+w.guest, "Table "+t.label+" held, "+CLAIM_MIN+" minute claim window started. SMS is in the outbox.","info");
  render();
}
function seatFromWaitlist(w){
  var t = bestFor(w);
  if (!t){ U.toast("Cannot seat yet","No table fits that party right now.","crit"); return; }
  var slot = w.wantedSlot, starts = D.atMin(S.day, slot), turn = D.turnFor(w.party);
  var r = {
    id: Math.max.apply(null, D.RESERVATIONS.map(function(x){return x.id;}))+1,
    ref: D.ref(), guest:w.guest, phone:w.phone,
    email: w.guest.toLowerCase().replace(/[^a-z]/g,".")+"@mail.test",
    party:w.party, tableId:t.id, tableLabel:t.label, roomId:t.roomId, typeId:t.typeId,
    startsAt:starts, endsAt:new Date(starts.getTime()+turn*60000),
    blocksUntil:new Date(starts.getTime()+(turn+D.BUFFER_MIN)*60000),
    slotMin:slot, turnMin:turn, status:"confirmed",
    occasion:"", request:"Converted from waitlist rank "+w.rank, allergy:"",
    createdAt:new Date(), source:"walk-in", covers:w.party,
    spend: Math.round(w.party*D.int(900,2600)/10)*10, history:[]
  };
  r.history.push({ at:new Date(), from:null, to:"confirmed", by:role()+" "+actor().name });
  D.RESERVATIONS.push(r);
  w.status = "seated";
  var i = D.WAITLIST.indexOf(w);
  if (i>=0) D.WAITLIST.splice(i,1);
  D.WAITLIST.forEach(function(x,n){ x.rank = n+1; });
  seatRes(r);
}

/* ---------- menu ---------- */
var STATIONS = ["cold","fry","grill","hot","pastry","bar"];
function inlineText(getter, setter, extra){
  var cell = e("span",{class:"adm-ie"+(extra?" "+extra:""),tabindex:"0",role:"button",
    "aria-label":"Edit value, currently "+getter(),
    text:String(getter())});
  function open(){
    var input = e("input",{class:"input adm-ie-in",value:String(getter()),
      onblur:function(){ commit(input.value); },
      onkeydown:function(ev){
        if (ev.key==="Enter"){ ev.preventDefault(); input.blur(); }
        if (ev.key==="Escape"){ ev.preventDefault(); input.value = String(getter()); input.blur(); }
      }});
    U.clear(cell);
    cell.removeAttribute("tabindex");
    cell.removeAttribute("role");
    cell.appendChild(input);
    input.focus();
    input.select();
  }
  function commit(v){
    setter(v);
    U.clear(cell);
    cell.textContent = String(getter());
    cell.setAttribute("tabindex","0");
    cell.setAttribute("role","button");
    cell.setAttribute("aria-label","Edit value, currently "+getter());
  }
  cell.addEventListener("click", function(){ if (!cell.querySelector("input")) open(); });
  cell.addEventListener("keydown", function(ev){
    if ((ev.key==="Enter"||ev.key===" ") && !cell.querySelector("input")){ ev.preventDefault(); open(); }
  });
  return cell;
}

function panelMenu(host){
  host.appendChild(panelHead("Menu",
    D.MENU.length+" dishes. Click a name or a price to edit it in place, the change is written straight into the shared menu.",
    e("button",{class:"btn btn-sm",type:"button",onclick:function(){ addDishModal(); }},"Add dish")));

  var tbody = e("tbody",{});
  D.CATS.forEach(function(c){
    var items = D.MENU.filter(function(m){ return m.cat===c.id; });
    if (!items.length) return;
    tbody.appendChild(e("tr",{class:"adm-catrow"},[
      e("td",{colspan:"6"},[ e("strong",{text:c.name}), e("span",{class:"mute2",text:"  "+c.note}) ])
    ]));
    items.forEach(function(m){
      var stSel = e("select",{class:"select adm-mini","aria-label":"Station for "+m.name,
        onchange:function(ev){ m.station = ev.target.value;
          U.toast("Station updated", m.name+" now fires from "+m.station+".",""); }});
      STATIONS.forEach(function(s){
        stSel.appendChild(e("option",{value:s,selected:m.station===s?true:null}, s));
      });
      var soldId = "sold-"+m.id;
      var sold = e("input",{type:"checkbox",id:soldId,checked:m.soldOut?true:null,
        onchange:function(ev){
          m.soldOut = ev.target.checked;
          U.toast(m.soldOut?"Marked sold out":"Back on", m.name+(m.soldOut?
            " is hidden from new orders and kitchen tickets." : " is available again."),
            m.soldOut?"crit":"ok");
        }});
      tbody.appendChild(e("tr",{class:m.soldOut?"is-sold":""},[
        e("td",{},inlineText(function(){ return m.name; }, function(v){
          if (v.trim()) m.name = v.trim(); }, "is-name")),
        e("td",{class:"mono"},inlineText(function(){ return m.price; }, function(v){
          var n = parseInt(String(v).replace(/[^0-9]/g,""),10);
          if (!isNaN(n) && n>0) m.price = n; }, "is-num")),
        e("td",{class:"mute2 mono",text:m.kcal+" kcal"}),
        e("td",{},stSel),
        e("td",{class:"mute2",text:(m.tags||[]).join(", ")}),
        e("td",{},[ e("label",{class:"adm-check",for:soldId},[ sold, e("span",{text:"Sold out"}) ]) ])
      ]));
    });
  });

  host.appendChild(e("div",{class:"card adm-tblcard"},[
    e("div",{class:"tbl-scroll adm-tbl-scroll"},[
      e("table",{class:"tbl"},[
        e("thead",{},[ e("tr",{},[
          e("th",{text:"Dish"}), e("th",{text:"Price"}), e("th",{text:"Energy"}),
          e("th",{text:"Station"}), e("th",{text:"Tags"}), e("th",{text:"Availability"})
        ]) ]),
        tbody
      ])
    ])
  ]));
}

function addDishModal(){
  var name = e("input",{class:"input",id:"ad-name",required:true});
  var price = e("input",{class:"input",id:"ad-price",type:"number",min:"0",value:"320"});
  var kcal = e("input",{class:"input",id:"ad-kcal",type:"number",min:"0",value:"400"});
  var cat = e("select",{class:"select",id:"ad-cat"});
  D.CATS.forEach(function(c){ cat.appendChild(e("option",{value:c.id}, c.name)); });
  var stn = e("select",{class:"select",id:"ad-stn"});
  STATIONS.forEach(function(s){ stn.appendChild(e("option",{value:s}, s)); });
  var desc = e("textarea",{class:"textarea",id:"ad-desc"});

  var m = U.modal({ title:"Add dish", body:e("div",{class:"stack"},[
    e("div",{class:"grid g2"},[
      e("div",{class:"field"},[ e("label",{class:"label",for:"ad-name",text:"Name"}), name ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"ad-price",text:"Price, pesos"}), price ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"ad-kcal",text:"Energy, kcal"}), kcal ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"ad-cat",text:"Section"}), cat ]),
      e("div",{class:"field"},[ e("label",{class:"label",for:"ad-stn",text:"Station"}), stn ])
    ]),
    e("div",{class:"field"},[ e("label",{class:"label",for:"ad-desc",text:"Description"}), desc ])
  ]), actions:[] });

  m.box.appendChild(e("div",{class:"row adm-rm-acts"},[
    e("button",{class:"btn btn-ghost btn-sm",type:"button",onclick:function(){ m.close(); }},"Discard"),
    e("button",{class:"btn btn-sm",type:"button",onclick:function(){
      if (!name.value.trim()){ U.toast("Name is required","","crit"); name.focus(); return; }
      var ids = D.MENU.map(function(x){ return x.id; });
      var item = {
        id: Math.max.apply(null, ids)+1, cat:cat.value, name:name.value.trim(),
        price: parseInt(price.value,10)||0, kcal: parseInt(kcal.value,10)||0,
        station: stn.value, desc: desc.value||"", tags:["new"], img:"new", pop:50
      };
      D.MENU.push(item);
      m.close();
      U.toast("Dish added", item.name+" is live in "+cat.options[cat.selectedIndex].text+
        " and available to the booking flow.","ok");
      render();
    }},"Add dish")
  ]));
}
/* ---------- tables and rooms ---------- */
function panelTables(host){
  host.appendChild(panelHead("Tables and rooms",
    D.TABLES.length+" tables, "+totalSeats()+" seats across "+D.ROOMS.length+" rooms. "+
    "Capacity, shape, joinable flag and seating priority are editable in place."));

  host.appendChild(e("p",{class:"muted adm-explain",text:
    "Table coordinates are not edited here. In the built system they come from the floor-plan editor, "+
    "where a manager drags each table and saves the layout per room."}));

  D.ROOMS.forEach(function(rm){
    var rt = null, i;
    for (i=0;i<D.ROOM_TYPES.length;i++) if (D.ROOM_TYPES[i].id===rm.typeId) rt = D.ROOM_TYPES[i];
    var tabs = D.TABLES.filter(function(t){ return t.roomId===rm.id; });
    var seats = tabs.reduce(function(a,t){ return a+t.max; },0);

    var tbody = e("tbody",{});
    tabs.forEach(function(t){
      var shape = e("select",{class:"select adm-mini","aria-label":"Shape of "+t.label,
        onchange:function(ev){ t.shape = ev.target.value;
          U.toast("Shape updated", t.label+" is now "+t.shape+". The floor plan redraws on next visit.",""); }});
      ["round","square","rect"].forEach(function(s){
        shape.appendChild(e("option",{value:s,selected:t.shape===s?true:null}, s));
      });
      var jid = "join-"+t.id;
      var join = e("input",{type:"checkbox",id:jid,checked:t.joinable?true:null,
        onchange:function(ev){ t.joinable = ev.target.checked;
          U.toast(t.joinable?"Joinable":"Not joinable",
            t.label+(t.joinable?" can now be combined with a neighbour for large parties."
              :" is excluded from table combinations."),""); }});
      tbody.appendChild(e("tr",{},[
        e("td",{},e("strong",{text:t.label})),
        e("td",{class:"mono"},inlineText(function(){ return t.min; }, function(v){
          var n = parseInt(v,10); if (!isNaN(n) && n>0 && n<=t.max) t.min = n; }, "is-num")),
        e("td",{class:"mono"},inlineText(function(){ return t.max; }, function(v){
          var n = parseInt(v,10); if (!isNaN(n) && n>=t.min) t.max = n; }, "is-num")),
        e("td",{},shape),
        e("td",{},[ e("label",{class:"adm-check",for:jid},[ join, e("span",{text:"Joinable"}) ]) ]),
        e("td",{class:"mono"},inlineText(function(){ return t.priority; }, function(v){
          var n = parseInt(v,10); if (!isNaN(n)) t.priority = n; }, "is-num")),
        e("td",{class:"mute2 mono",text:t.shape==="round" ? ("r"+t.r+" @ "+t.x+","+t.y)
          : (t.w+"x"+t.h+" @ "+t.x+","+t.y)})
      ]));
    });

    host.appendChild(e("section",{class:"card adm-sec"},[
      e("div",{class:"row-between adm-sec-h"},[
        e("div",{},[
          e("h3",{class:"adm-sec-t",text:rm.name}),
          e("p",{class:"muted adm-sec-n",text:rt ? rt.blurb : ""})
        ]),
        e("div",{class:"row"},[
          e("span",{class:"badge badge-accent",text:rt?rt.name:rm.typeId}),
          e("span",{class:"badge",text:tabs.length+" tables"}),
          e("span",{class:"badge",text:seats+" seats"})
        ])
      ]),
      rt ? e("div",{class:"adm-rules"},[
        e("span",{class:"badge",text:"Party "+rt.minParty+" to "+rt.maxParty}),
        e("span",{class:"badge",text:rt.minSpend ? "Minimum spend "+U.money(rt.minSpend) : "No minimum spend"}),
        e("span",{class:"badge",text:"Lead time "+rt.lead}),
        e("span",{class:"badge badge-warn",text:rt.badge})
      ]) : null,
      e("div",{class:"tbl-scroll adm-tbl-scroll is-short"},[
        e("table",{class:"tbl"},[
          e("thead",{},[ e("tr",{},[
            e("th",{text:"Table"}), e("th",{text:"Min"}), e("th",{text:"Max"}),
            e("th",{text:"Shape"}), e("th",{text:"Combine"}), e("th",{text:"Priority"}),
            e("th",{text:"Plan coords"})
          ]) ]),
          tbody
        ])
      ])
    ]));
  });
}

/* ---------- staff ---------- */
function panelStaff(host){
  host.appendChild(panelHead("Staff and access",
    D.STAFF.length+" people. Changing a role here changes what that person can reach, the same rule the nav enforces."));

  var grid = e("div",{class:"grid g2"});
  D.STAFF.forEach(function(p){
    var sel = e("select",{class:"select","aria-label":"Role for "+p.name,
      onchange:function(ev){
        p.role = ev.target.value;
        U.toast("Role changed", p.name+" is now "+p.role+". "+ROLE_NOTE[p.role],"info");
        renderNav(); render();
      }});
    ["owner","manager","host","kitchen","waiter"].forEach(function(r){
      sel.appendChild(e("option",{value:r,selected:p.role===r?true:null}, r));
    });
    grid.appendChild(e("article",{class:"card adm-staff"},[
      e("div",{class:"row-between"},[
        e("h3",{class:"adm-staff-n",text:p.name}),
        e("span",{class:"badge badge-accent",text:p.role})
      ]),
      e("p",{class:"muted adm-staff-m",text:p.email}),
      e("p",{class:"mute2 adm-staff-m",text:p.pin}),
      e("div",{class:"field adm-f"},[ e("span",{class:"label",text:"Role"}), sel ]),
      p.id===S.actorId ? e("span",{class:"badge badge-ok",text:"Acting as this person"}) : null
    ]));
  });
  host.appendChild(grid);

  var rules = e("div",{class:"stack"});
  ROLE_RULES.forEach(function(r){
    rules.appendChild(e("div",{class:"adm-rule"},[
      e("span",{class:"badge badge-accent",text:r.role}),
      e("p",{class:"muted",text:r.can})
    ]));
  });
  host.appendChild(e("section",{class:"card adm-sec"},[
    e("h3",{class:"adm-sec-t",text:"What each role may do"}),
    e("p",{class:"muted adm-sec-n",text:"This is the same matrix the sidebar applies. The built system checks it again on every API call."}),
    rules
  ]));
}
/* ---------- settings ---------- */
function numField(id, label, hint, get, set, min, max){
  var input = e("input",{class:"input",id:id,type:"number",value:String(get()),
    min:min===undefined?null:String(min), max:max===undefined?null:String(max),
    onchange:function(ev){
      var n = parseInt(ev.target.value,10);
      if (isNaN(n) || (min!==undefined && n<min) || (max!==undefined && n>max)){
        ev.target.value = String(get());
        U.toast("Value out of range","Keep "+label.toLowerCase()+" between "+min+" and "+max+".","crit");
        return;
      }
      set(n);
      U.toast("Setting saved", label+" is now "+n+". The booking flow uses this immediately.","ok");
    }});
  return e("div",{class:"field"},[
    e("label",{class:"label",for:id,text:label}), input,
    e("span",{class:"hint",text:hint})
  ]);
}
function timeField(id, label, hint, get, set){
  var input = e("input",{class:"input",id:id,type:"time",value:D.hhmm(get()),
    onchange:function(ev){
      var p = String(ev.target.value).split(":");
      var mins = (parseInt(p[0],10)||0)*60 + (parseInt(p[1],10)||0);
      set(mins);
      U.toast("Setting saved", label+" is now "+D.hhmm(mins)+".","ok");
      render();
    }});
  return e("div",{class:"field"},[
    e("label",{class:"label",for:id,text:label}), input,
    e("span",{class:"hint",text:hint})
  ]);
}

function panelSettings(host){
  host.appendChild(panelHead("Service policy",
    "These values drive the availability engine. Changing one here changes what the guest booking flow offers."));

  host.appendChild(e("section",{class:"card adm-sec"},[
    e("h3",{class:"adm-sec-t",text:"Timing and holds"}),
    e("div",{class:"grid g3 adm-settings"},[
      numField("set-slot","Slot interval, minutes","Spacing between bookable times.",
        function(){ return D.VENUE.slotMinutes; }, function(v){ D.VENUE.slotMinutes = v; }, 5, 60),
      numField("set-hold","Hold TTL, seconds","How long a seat selection is reserved during checkout.",
        function(){ return D.VENUE.holdSeconds; }, function(v){ D.VENUE.holdSeconds = v; }, 60, 1800),
      numField("set-grace","No-show grace, minutes","How long a table is held past the booked time.",
        function(){ return D.VENUE.noShowGraceMin; }, function(v){ D.VENUE.noShowGraceMin = v; }, 0, 60),
      numField("set-buffer","Reset buffer, minutes","Clearing time added after every turn before the table is offered again.",
        function(){ return D.BUFFER_MIN; }, function(v){ window.DATA.BUFFER_MIN = v; D.BUFFER_MIN = v; }, 0, 60),
      timeField("set-open","Service open","First bookable slot.",
        function(){ return D.SERVICE_OPEN; }, function(v){ window.DATA.SERVICE_OPEN = v; D.SERVICE_OPEN = v; }),
      timeField("set-last","Last seating","Final bookable slot.",
        function(){ return D.SERVICE_LAST; }, function(v){ window.DATA.SERVICE_LAST = v; D.SERVICE_LAST = v; }),
      timeField("set-close","Service close","Kitchen and floor close, used for occupancy.",
        function(){ return D.SERVICE_CLOSE; }, function(v){ window.DATA.SERVICE_CLOSE = v; D.SERVICE_CLOSE = v; })
    ])
  ]));

  var tt = e("tbody",{});
  D.TURN_TIMES.forEach(function(t, i){
    tt.appendChild(e("tr",{},[
      e("td",{text: t.upTo>=99 ? "Any larger party" : ("Up to "+t.upTo+" guests")}),
      e("td",{class:"mono"},inlineText(function(){ return t.minutes; }, function(v){
        var n = parseInt(v,10);
        if (!isNaN(n) && n>=30 && n<=300){
          t.minutes = n;
          U.toast("Turn time saved", (t.upTo>=99?"Large parties":"Parties up to "+t.upTo)+
            " now get "+n+" minutes.","ok");
        }
      }, "is-num")),
      e("td",{class:"mute2",text:"Plus "+D.BUFFER_MIN+" minutes buffer, so the table is blocked for "+
        (t.minutes+D.BUFFER_MIN)+" minutes"}),
      e("td",{class:"mute2 mono",text:"tier "+(i+1)})
    ]));
  });
  host.appendChild(e("section",{class:"card adm-sec"},[
    e("h3",{class:"adm-sec-t",text:"Turn time by party size"}),
    e("p",{class:"muted adm-sec-n",text:"Click a value to edit it. Availability recalculates from these tiers."}),
    e("table",{class:"tbl"},[
      e("thead",{},[ e("tr",{},[ e("th",{text:"Party"}), e("th",{text:"Minutes"}),
        e("th",{text:"Effective block"}), e("th",{text:"Tier"}) ]) ]),
      tt
    ])
  ]));

  var bl = e("div",{class:"stack"});
  if (!D.BLACKOUTS.length) bl.appendChild(e("p",{class:"muted",text:"No blackout dates on file."}));
  D.BLACKOUTS.forEach(function(b){
    var scope = b.scope==="venue" ? "Whole venue" : "Room type: "+b.typeId;
    bl.appendChild(e("div",{class:"adm-rule"},[
      e("span",{class:"badge badge-crit",text:U.shortDate(b.date)}),
      e("div",{},[
        e("strong",{text:b.label}),
        e("p",{class:"mute2",text:scope+" . "+U.longDate(b.date)+" . blocks every slot in scope"})
      ])
    ]));
  });
  host.appendChild(e("section",{class:"card adm-sec"},[
    e("h3",{class:"adm-sec-t",text:"Blackout dates"}),
    e("p",{class:"muted adm-sec-n",text:"The availability engine refuses any booking that falls inside one of these."}),
    bl
  ]));
}

/* ---------- activity ---------- */
function panelActivity(host){
  host.appendChild(panelHead("Activity and audit",
    "Every status change and every simulated message, newest first. This stands in for the audit log and the outbound queue."));

  var feed = [];
  D.RESERVATIONS.forEach(function(r){
    r.history.forEach(function(h){
      feed.push({ at:h.at, kind:"audit", actor:h.by,
        what:(h.from ? h.from+" to "+h.to : "created as "+h.to),
        ref:r.ref, res:r });
    });
  });
  D.OUTBOX.forEach(function(o){
    feed.push({ at:o.at, kind:o.channel, actor:"system", what:o.subject,
      to:o.to, bodyTxt:o.body, ref:null });
  });
  feed.sort(function(a,b){ return b.at - a.at; });

  var list = e("ol",{class:"adm-feed"});
  if (!feed.length) list.appendChild(e("li",{class:"muted"},"No activity recorded yet."));
  feed.slice(0,250).forEach(function(f){
    var item = e("li",{class:"adm-feed-i kind-"+f.kind},[
      e("span",{class:"mono adm-feed-t",text:U.hhmm(f.at)+" . "+U.shortDate(f.at)}),
      e("div",{class:"grow"},[
        e("div",{class:"adm-feed-h"},[
          e("span",{class:"badge"+(f.kind==="audit"?"":" badge-info"),
            text:f.kind==="audit"?"audit":f.kind}),
          e("strong",{text:f.what}),
          f.ref ? e("span",{class:"mono mute2",text:f.ref}) : null
        ]),
        f.bodyTxt ? e("p",{class:"adm-feed-b",text:f.bodyTxt}) : null,
        e("span",{class:"mute2 adm-feed-a",
          text: f.kind==="audit" ? ("by "+f.actor) : ("to "+f.to+" . "+U.ago(f.at))})
      ]),
      f.res ? e("button",{class:"btn btn-ghost btn-sm",type:"button",
        "aria-label":"Open reservation "+f.ref,
        onclick:function(){ resModal(f.res); }},"Open") : null
    ]);
    list.appendChild(item);
  });

  host.appendChild(e("section",{class:"card adm-sec"},[
    e("div",{class:"row-between adm-sec-h"},[
      e("h3",{class:"adm-sec-t",text:feed.length+" events"}),
      e("span",{class:"badge badge-accent",text:D.OUTBOX.length+" messages in the outbox"})
    ]),
    list
  ]));
}

window.Admin = { mount:mount };

})();
