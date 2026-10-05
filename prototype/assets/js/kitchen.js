/* Kitchen display system (KDS). Wall-screen readable, no hover-only interactions. */
(function(){
"use strict";

var D = window.DATA, E = null;
var STATIONS = ["all","grill","hot","cold","fry","pastry","bar"];
var COURSE_LABEL = { 1:"FIRST", 2:"MAIN", 3:"SWEET" };
var NEXT = { QUEUED:"PREPARING", PREPARING:"READY", READY:"SERVED", HELD:"PREPARING", RECALLED:"PREPARING" };
var NEXT_WORDS = { QUEUED:"Start preparing", PREPARING:"Mark ready", READY:"Serve",
  HELD:"Resume preparing", RECALLED:"Resume preparing" };

var state = {
  station: "all",
  muted: true,
  seen: {},
  seed: null
};
var audioCtx = null;

/* ---------- helpers ---------- */
function el(t,a,k){ return U.el(t,a,k); }
function activeStates(){ return ["QUEUED","PREPARING","READY","HELD","RECALLED"]; }
function isActive(t){ return activeStates().indexOf(t.state) >= 0; }
function ageSec(t){ return Math.max(0, Math.floor((Date.now() - t.firedAt.getTime())/1000)); }

function band(sec){
  if (sec >= 900) return { key:"crit", label:"CRITICAL", rank:3 };
  if (sec >= 600) return { key:"late", label:"LATE", rank:2 };
  if (sec >= 300) return { key:"work", label:"WORKING", rank:1 };
  return { key:"ontime", label:"ON TIME", rank:0 };
}
function stationsOf(t){
  var s = {};
  t.items.forEach(function(it){ s[it.station] = true; });
  return s;
}
function matchesStation(t){
  if (state.station === "all") return true;
  return stationsOf(t)[state.station] === true;
}
function deepCopyTickets(list){
  return list.map(function(t){
    return {
      id:t.id, no:t.no, resId:t.resId, tableLabel:t.tableLabel, roomId:t.roomId,
      party:t.party, guest:t.guest, allergy:t.allergy, orderType:t.orderType,
      firedAt:new Date(t.firedAt.getTime()), state:t.state,
      items:t.items.map(function(it){
        return { menuId:it.menuId, name:it.name, qty:it.qty, station:it.station,
          course:it.course, mods:it.mods.slice(0), done:it.done };
      }),
      events:t.events.map(function(ev){ return { at:new Date(ev.at.getTime()), to:ev.to, by:ev.by }; })
    };
  });
}
function sortedActive(){
  var list = D.TICKETS.filter(isActive).filter(matchesStation);
  list.sort(function(a,b){
    var ra = band(ageSec(a)).rank, rb = band(ageSec(b)).rank;
    if (ra !== rb) return rb - ra;                 /* hotter bands lift */
    return a.firedAt.getTime() - b.firedAt.getTime(); /* then oldest first */
  });
  return list;
}
function servedList(){
  var list = D.TICKETS.filter(function(t){ return t.state === "SERVED"; });
  list.sort(function(a,b){ return lastEventAt(b) - lastEventAt(a); });
  return list.slice(0, 20);
}
function lastEventAt(t){
  if (!t.events.length) return t.firedAt.getTime();
  return t.events[t.events.length-1].at.getTime();
}
function ticketMinutes(t){
  return Math.max(0, Math.round((lastEventAt(t) - t.firedAt.getTime())/60000));
}
function byWho(){ return state.station === "all" ? "chef" : state.station; }

function beep(){
  if (state.muted) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "square"; o.frequency.value = 880;
    g.gain.value = 0.05;
    o.connect(g); g.connect(audioCtx.destination);
    var now = audioCtx.currentTime;
    o.start(now); o.stop(now + 0.14);
  } catch(err){ /* audio unavailable, stay silent */ }
}

function transition(t, to){
  t.state = to;
  t.events.push({ at:new Date(), to:to, by:byWho() });
}

/* ---------- mount ---------- */
function mount(host){
  if (!state.seed) state.seed = deepCopyTickets(D.TICKETS);
  D.TICKETS.forEach(function(t){ state.seen[t.id] = true; });

  var root = el("div",{class:"kds"});
  var head = buildHeader();
  var grid = el("div",{class:"kds-grid", id:"kds-grid", role:"list",
    "aria-label":"Active kitchen tickets", "aria-live":"polite", "aria-relevant":"additions"});
  var rail = el("aside",{class:"kds-rail","aria-label":"Kitchen summary"});
  var body = el("div",{class:"kds-body"},[
    el("div",{class:"kds-main"},[ buildBandNote(), grid, buildEmpty() ]),
    rail
  ]);
  root.appendChild(head.node);
  root.appendChild(body);
  host.appendChild(root);

  E = { grid:grid, rail:rail, head:head, cards:{} };
  paintAll();

  var tick = setInterval(paintTimers, 1000);
  APP.addTimer(tick);
  var slow = setInterval(function(){ paintRail(); }, 5000);
  APP.addTimer(slow);
}

function buildBandNote(){
  return el("p",{class:"kds-note"},[
    el("b",{text:"Redundant encoding. "}),
    "Each aging band carries a word, a border thickness (2, 3, 4, 6px) and a colour, so the ",
    "screen still reads correctly for a colour-blind cook or a washed-out projector."
  ]);
}
function buildEmpty(){
  return el("p",{class:"kds-empty", id:"kds-empty", text:"No open tickets for this station."});
}

/* ---------- header ---------- */
function buildHeader(){
  var clock = el("span",{class:"kds-clock mono", id:"kds-clock","aria-label":"Current time", text:U.hhmm(new Date())});
  var counts = el("div",{class:"kds-counts", id:"kds-counts","aria-live":"polite"});

  var sel = el("select",{class:"select kds-select", id:"kds-station", onchange:function(e){
    state.station = e.target.value;
    paintAll();
  }}, STATIONS.map(function(s){
    return el("option",{value:s, text:s === "all" ? "All stations" : s.toUpperCase()});
  }));

  var soundBtn = el("button",{class:"btn btn-ghost kds-sound", id:"kds-sound",
    "aria-pressed":"false",
    onclick:function(){
      state.muted = !state.muted;
      soundBtn.setAttribute("aria-pressed", state.muted ? "false" : "true");
      soundBtn.classList.toggle("is-on", !state.muted);
      U.clear(soundBtn).appendChild(document.createTextNode(state.muted ? "Sound off" : "Sound on"));
      if (!state.muted) beep();
    }, text:"Sound off"});

  var node = el("header",{class:"kds-head"},[
    el("div",{class:"kds-brand"},[
      el("b",{text:D.VENUE.name}),
      el("span",{class:"kds-brand-sub", text:"Kitchen display"})
    ]),
    el("div",{class:"kds-head-mid"},[
      el("label",{class:"kds-head-lab", for:"kds-station", text:"Station"}),
      sel
    ]),
    counts,
    el("div",{class:"kds-head-right"},[ clock, soundBtn ])
  ]);
  return { node:node, counts:counts, clock:clock };
}

/* ---------- painting ---------- */
function paintAll(){
  var list = sortedActive();
  U.clear(E.grid);
  E.cards = {};
  list.forEach(function(t){
    var card = buildCard(t);
    E.cards[t.id] = card;
    E.grid.appendChild(card.node);
  });
  var empty = document.getElementById("kds-empty");
  if (empty) empty.style.display = list.length ? "none" : "block";
  paintTimers();
  paintRail();
}

function paintTimers(){
  var c = document.getElementById("kds-clock");
  if (c) c.textContent = U.hhmm(new Date());
  var tally = { QUEUED:0, PREPARING:0, READY:0, HELD:0, RECALLED:0 };
  D.TICKETS.filter(isActive).forEach(function(t){ tally[t.state] = (tally[t.state]||0) + 1; });
  var counts = E && E.head ? E.head.counts : null;
  if (counts){
    U.clear(counts);
    ["QUEUED","PREPARING","READY","HELD","RECALLED"].forEach(function(k){
      if (!tally[k] && k === "RECALLED") return;
      counts.appendChild(el("span",{class:"kds-count"},[
        el("b",{text:String(tally[k])}),
        el("i",{text:k})
      ]));
    });
  }
  for (var id in E.cards){
    var card = E.cards[id];
    var sec = ageSec(card.ticket);
    var b = band(sec);
    card.timer.textContent = U.mmss(sec);
    card.bandLab.textContent = b.label;
    if (card.band !== b.key){
      card.node.classList.remove("b-ontime","b-work","b-late","b-crit");
      card.node.classList.add("b-" + b.key);
      card.band = b.key;
    }
  }
}

/* ---------- ticket card ---------- */
function buildCard(t){
  var sec = ageSec(t), b = band(sec);
  var node = el("article",{class:"kt b-" + b.key, role:"listitem",
    "aria-label":"Ticket " + t.no + ", table " + t.tableLabel + ", party of " + t.party});

  var otClass = t.orderType === "VIP SUITE" ? "ot-vip"
    : t.orderType === "GROUP" ? "ot-group"
    : t.orderType === "TERRACE" ? "ot-terrace" : "ot-dine";

  node.appendChild(el("div",{class:"kt-top"},[
    el("span",{class:"kt-no mono", text:t.no}),
    el("span",{class:"kt-table", text:t.tableLabel}),
    el("span",{class:"kt-party mono", text:"x" + t.party}),
    el("span",{class:"kt-ot " + otClass, text:t.orderType})
  ]));

  var timer = el("div",{class:"kt-timer mono", text:U.mmss(sec),
    "aria-label":"Time since fired"});
  var bandLab = el("div",{class:"kt-band", text:b.label});
  node.appendChild(el("div",{class:"kt-age"},[ timer,
    el("div",{class:"kt-age-meta"},[ bandLab,
      el("span",{class:"kt-state", text:t.state}) ]) ]));

  if (t.allergy && String(t.allergy).trim() !== ""){
    node.appendChild(el("div",{class:"kt-allergy", role:"alert",
      text:"ALLERGY: " + String(t.allergy).toUpperCase()}));
  }

  node.appendChild(buildItems(t));

  var primary = el("button",{class:"btn btn-block kt-go", onclick:function(){
    var to = NEXT[t.state] || "PREPARING";
    transition(t, to);
    if (to === "SERVED"){
      U.toast("Ticket " + t.no + " served", t.tableLabel + ", " + ticketMinutes(t) + " min ticket time", "ok");
    }
    paintAll();
  }, text:NEXT_WORDS[t.state] || "Advance"});

  var row = el("div",{class:"kt-acts"},[ primary ]);
  var small = el("div",{class:"kt-acts-sm"});
  if (t.state !== "HELD"){
    small.appendChild(el("button",{class:"btn btn-ghost btn-sm", onclick:function(){
      transition(t, "HELD");
      U.toast("Ticket " + t.no + " held", "Pulled off the pass until a human resumes it", "info");
      paintAll();
    }, text:"Hold"}));
  }
  if (t.state === "READY" || t.state === "HELD"){
    small.appendChild(el("button",{class:"btn btn-ghost btn-sm", onclick:function(){
      recall(t);
    }, text:"Recall"}));
  }
  if (small.childNodes.length) row.appendChild(small);
  node.appendChild(row);

  var card = { node:node, ticket:t, timer:timer, bandLab:bandLab, band:b.key };
  syncReady(card);
  return card;
}

function buildItems(t){
  var wrap = el("div",{class:"kt-items"});
  var courses = [1,2,3];
  courses.forEach(function(c){
    var items = t.items.filter(function(it){ return it.course === c; });
    if (!items.length) return;
    wrap.appendChild(el("div",{class:"kt-course"},[
      el("span",{text:COURSE_LABEL[c] || ("COURSE " + c)})
    ]));
    items.forEach(function(it){
      wrap.appendChild(buildLine(t, it));
    });
  });
  return wrap;
}

function buildLine(t, it){
  var dim = state.station !== "all" && it.station !== state.station;
  var line = el("button",{class:"kt-line" + (it.done ? " is-done" : ""), type:"button",
    "aria-pressed": it.done ? "true" : "false",
    "aria-label":(it.done ? "Undo " : "Strike off ") + it.qty + " " + it.name});
  line.addEventListener("click", function(){
    it.done = !it.done;
    line.classList.toggle("is-done", it.done);
    line.setAttribute("aria-pressed", it.done ? "true" : "false");
    var card = E.cards[t.id];
    if (card) syncReady(card);
    paintRail();
  });
  line.appendChild(el("span",{class:"kt-gut" + (dim ? " is-dim" : ""), text:it.station}));
  var mid = el("span",{class:"kt-line-mid"},[
    el("span",{class:"kt-line-main"},[
      el("b",{class:"kt-qty mono", text:it.qty + "x"}),
      el("span",{class:"kt-name", text:it.name})
    ])
  ]);
  if (it.mods && it.mods.length){
    it.mods.forEach(function(m){
      var minus = /^(no |half )/i.test(m);
      mid.appendChild(el("span",{class:"kt-mod", text:(minus ? "- " : "+ ") + m}));
    });
  }
  line.appendChild(mid);
  return line;
}

function syncReady(card){
  var all = card.ticket.items.length > 0 && card.ticket.items.every(function(it){ return it.done; });
  card.node.classList.toggle("is-plated", all);
}

function recall(t){
  transition(t, "RECALLED");
  t.items.forEach(function(it){ it.done = false; });
  U.toast("Ticket " + t.no + " recalled", "Back on the line as RECALLED for " + t.tableLabel, "crit");
  paintAll();
}

/* ---------- right rail ---------- */
function paintRail(){
  if (!E || !E.rail) return;
  U.clear(E.rail);
  E.rail.appendChild(allDayPanel());
  E.rail.appendChild(pacePanel());
  E.rail.appendChild(recallPanel());
  E.rail.appendChild(protoPanel());
}

function allDayPanel(){
  var agg = {};
  D.TICKETS.filter(isActive).filter(matchesStation).forEach(function(t){
    t.items.forEach(function(it){
      if (state.station !== "all" && it.station !== state.station) return;
      if (it.done) return;
      if (!agg[it.name]) agg[it.name] = { name:it.name, qty:0, station:it.station };
      agg[it.name].qty += it.qty;
    });
  });
  var rows = [];
  for (var k in agg) rows.push(agg[k]);
  rows.sort(function(a,b){ return b.qty - a.qty || (a.name < b.name ? -1 : 1); });

  var body = el("div",{class:"kds-allday","aria-live":"polite"},
    rows.length ? rows.map(function(r){
      return el("div",{class:"kds-ad-row"},[
        el("b",{class:"mono", text:String(r.qty)}),
        el("span",{class:"kds-ad-name", text:r.name}),
        el("i",{class:"kds-ad-st", text:r.station})
      ]);
    }) : [ el("p",{class:"kds-dim", text:"Nothing outstanding."}) ]);

  return panel("All day", body);
}

function pacePanel(){
  var cut = Date.now() - 30*60000;
  var served = D.TICKETS.filter(function(t){
    return t.state === "SERVED" && lastEventAt(t) >= cut;
  });
  var done = D.TICKETS.filter(function(t){ return t.state === "SERVED"; });
  var avg = 0;
  if (done.length){
    var sum = 0;
    done.forEach(function(t){ sum += ticketMinutes(t); });
    avg = Math.round(sum/done.length);
  }
  var body = el("div",{class:"kds-pace","aria-live":"polite"},[
    el("div",{class:"kds-pace-row"},[
      el("b",{class:"mono", text:String(served.length)}),
      el("span",{text:"closed in last 30 min"})
    ]),
    el("div",{class:"kds-pace-row"},[
      el("b",{class:"mono", text:avg + "m"}),
      el("span",{text:"average ticket time"})
    ])
  ]);
  return panel("Service pace", body);
}

function recallPanel(){
  var list = servedList();
  var body = el("div",{class:"kds-recall"},
    list.length ? list.map(function(t){
      return el("div",{class:"kds-rc-row"},[
        el("div",{class:"kds-rc-meta"},[
          el("b",{class:"mono", text:t.no}),
          el("span",{text:t.tableLabel + " \u00b7 x" + t.party}),
          el("i",{class:"mono", text:ticketMinutes(t) + "m"})
        ]),
        el("button",{class:"btn btn-ghost btn-sm", onclick:function(){ recall(t); },
          "aria-label":"Recall ticket " + t.no, text:"Recall"})
      ]);
    }) : [ el("p",{class:"kds-dim", text:"No served tickets yet."}) ]);
  return panel("Recall drawer", body, "Last 20 served");
}

/* ---------- prototype controls ---------- */
function protoPanel(){
  var body = el("div",{class:"kds-proto-in"},[
    el("p",{class:"kds-dim", text:"These three buttons exist only in the prototype. A real KDS fires tickets from the POS."}),
    el("button",{class:"btn btn-ghost btn-sm btn-block", onclick:fireTicket, text:"Fire a new ticket"}),
    el("button",{class:"btn btn-ghost btn-sm btn-block", onclick:ageAll, text:"Age all tickets 4 minutes"}),
    el("button",{class:"btn btn-ghost btn-sm btn-block", onclick:resetTickets, text:"Reset tickets"})
  ]);
  var p = panel("Prototype controls", body);
  p.classList.add("kds-proto");
  return p;
}

function fireTicket(){
  var pool = D.RESERVATIONS.filter(function(r){
    return r.status === "seated" || r.status === "confirmed";
  });
  if (!pool.length){ U.toast("Nothing to fire","No seated or confirmed covers in the sample data","crit"); return; }
  var r = D.pick(pool);
  var food = D.MENU.filter(function(m){ return m.cat !== "drinks"; });
  var n = D.int(2,4), items = [], used = {};
  while (items.length < n){
    var m = D.pick(food);
    if (used[m.id]) continue;
    used[m.id] = true;
    items.push({ menuId:m.id, name:m.name, qty: D.rnd() < 0.25 ? 2 : 1, station:m.station,
      course: (m.cat === "snacks" || m.cat === "raw") ? 1 : m.cat === "sweet" ? 3 : 2,
      mods: D.rnd() < 0.4 ? [ D.pick(["no chilli","extra char","sauce on side","no coriander"]) ] : [],
      done:false });
  }
  var ids = D.TICKETS.map(function(t){ return t.id; });
  var nextId = (ids.length ? Math.max.apply(null, ids) : 180) + 1;
  var now = new Date();
  var t = {
    id:nextId, no:"#" + nextId, resId:r.id, tableLabel:r.tableLabel, roomId:r.roomId,
    party:r.party, guest:r.guest, allergy:r.allergy || "",
    orderType: r.typeId === "vip" ? "VIP SUITE" : r.typeId === "group" ? "GROUP"
      : r.typeId === "terrace" ? "TERRACE" : "DINE IN",
    firedAt:now, state:"QUEUED", items:items,
    events:[{ at:now, to:"QUEUED", by:"pos" }]
  };
  D.TICKETS.push(t);
  state.seen[t.id] = true;
  beep();
  U.toast("Ticket " + t.no + " fired", t.tableLabel + ", " + items.length + " lines", "ok");
  paintAll();
}

function ageAll(){
  D.TICKETS.forEach(function(t){ t.firedAt = new Date(t.firedAt.getTime() - 4*60000); });
  U.toast("Aged 4 minutes","Every ticket shifted back so the bands escalate","info");
  paintAll();
}

function resetTickets(){
  var fresh = deepCopyTickets(state.seed);
  D.TICKETS.length = 0;
  fresh.forEach(function(t){ D.TICKETS.push(t); });
  U.toast("Tickets reset","Seeded ticket set restored","info");
  paintAll();
}

/* ---------- small panel shell ---------- */
function panel(title, body, sub){
  return el("section",{class:"kds-panel"},[
    el("div",{class:"kds-panel-h"},[
      el("h3",{text:title}),
      sub ? el("span",{class:"kds-dim", text:sub}) : null
    ]),
    body
  ]);
}

window.Kitchen = { mount:mount };
})();
