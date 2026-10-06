/* Lumina - guest facing screens: home, menu, booking flow, manage booking.
   Vanilla ES5-safe. All data comes from window.DATA. No network calls. */
(function(){
"use strict";

var D = window.DATA;
var E = U.el;

var PERIODS = [
  { id:"early", name:"Early seating", range:"17:30 - 18:45" },
  { id:"prime", name:"Prime seating", range:"19:00 - 20:30" },
  { id:"late",  name:"Late seating",  range:"20:45 - 21:45" }
];
function periodOf(slot){
  if (slot <= 18*60+45) return "early";
  if (slot <= 20*60+30) return "prime";
  return "late";
}
function nowMin(){ var d = new Date(); return d.getHours()*60 + d.getMinutes(); }

/* next slot we would actually sell, 45 minutes of lead time */
function defaultQuery(){
  var slots = D.slotList(), m = nowMin() + 45, i;
  for (i=0;i<slots.length;i++) if (slots[i] >= m) return { dayOffset:0, slot:slots[i] };
  return { dayOffset:1, slot:19*60 };
}
function roomType(id){
  var i;
  for (i=0;i<D.ROOM_TYPES.length;i++) if (D.ROOM_TYPES[i].id === id) return D.ROOM_TYPES[i];
  return null;
}
function typeName(id){
  if (!id || id === "any") return "Any room";
  var t = roomType(id);
  return t ? t.name : id;
}
function freeCount(off, slot, party, typeId){
  var a = D.availability(off, slot, party, typeId);
  return a.tables ? a.tables.length : 0;
}
function wrapSection(cls, kids){
  return E("section", { class:"section " + (cls||"") }, [ E("div",{class:"wrap"}, kids) ]);
}
function accentArt(accent, h, label){
  var n = E("div", { class:"room-art", style:{ height:(h||170)+"px" } });
  n.style.background =
    "radial-gradient(70% 90% at 26% 18%, " + accent + "55 0%, transparent 62%)," +
    "radial-gradient(62% 72% at 80% 76%, " + accent + "2e 0%, transparent 64%)," +
    "linear-gradient(145deg, var(--ink-800), var(--ink-950))";
  n.appendChild(E("div",{class:"room-art-ring"}));
  if (label) n.appendChild(E("span",{class:"room-art-tag mono",text:label}));
  return n;
}
function jump(pending, hash){
  window.Guest._pending = pending;
  location.hash = hash || "#/book";
}

/* =====================================================================
   HOME
   ===================================================================== */
function home(host){
  var V = D.VENUE;

  var hero = E("section",{class:"g-hero"},[
    E("div",{class:"g-hero-bg","aria-hidden":"true"},[
      E("div",{class:"g-glow g-glow-a"}),
      E("div",{class:"g-glow g-glow-b"}),
      E("div",{class:"g-embers"}),
      E("div",{class:"g-grain"})
    ]),
    E("div",{class:"wrap g-hero-in"},[
      E("div",{class:"g-hero-frame reveal"},[
        E("p",{class:"eyebrow",text:V.hours}),
        E("h1",{class:"g-hero-name",text:V.name}),
        E("p",{class:"g-hero-sub",text:V.suffix}),
        E("p",{class:"lede g-hero-lede",text:V.tagline}),
        E("div",{class:"row g-hero-cta"},[
          E("a",{class:"btn btn-lg",href:"#/book",text:"Reserve a table"}),
          E("a",{class:"btn btn-lg btn-ghost",href:"#/menu",text:"View the menu"})
        ]),
        heroTeaser()
      ])
    ]),
    E("button",{class:"g-cue",type:"button","aria-label":"Scroll to the rooms",
      onclick:function(){
        var n = document.getElementById("rooms");
        if (n) n.scrollIntoView({ behavior:"smooth", block:"start" });
      }},[
      E("span",{class:"g-cue-line","aria-hidden":"true"}),
      E("i",{text:"The rooms"})
    ])
  ]);
  host.appendChild(hero);
  host.appendChild(roomsSection());
  host.appendChild(hearthSection());
  host.appendChild(stepsSection());
  host.appendChild(closingBand());
}

function heroTeaser(){
  var slots = [19*60, 19*60+30, 20*60, 20*60+30];
  var box = E("div",{class:"g-teaser reveal d2"},[
    E("p",{class:"g-teaser-h",text:"Tonight, for two"})
  ]);
  var row = E("div",{class:"g-teaser-row"});
  var anyFree = false;
  slots.forEach(function(slot){
    var n = freeCount(0, slot, 2, "any");
    var gone = n === 0 || slot < nowMin();
    if (!gone) anyFree = true;
    var b = E("button",{
      class:"g-teaser-pill" + (gone ? " is-gone" : ""),
      type:"button",
      disabled: gone ? true : null,
      "aria-label": D.hhmm(slot) + ", " + (gone ? "no tables left" : n + " tables free, book this time"),
      onclick: function(){ jump({ dayOffset:0, slot:slot, party:2, typeId:"any" }); }
    },[
      E("b",{class:"mono",text:D.hhmm(slot)}),
      E("i",{text: gone ? "none left" : n + (n===1?" table":" tables")})
    ]);
    row.appendChild(b);
  });
  box.appendChild(row);
  box.appendChild(E("p",{class:"hint",text: anyFree
    ? "Live from the floor plan. Counts are real tables that fit a party of two."
    : "Tonight is finished. Pick a date on the booking page." }));
  return box;
}

function roomsSection(){
  var grid = E("div",{class:"grid room-grid"});
  D.ROOM_TYPES.forEach(function(rt, i){
    var perks = E("div",{class:"room-perks"});
    rt.perks.forEach(function(p){ perks.appendChild(E("span",{class:"badge",text:p})); });
    var card = E("article",{
      class:"card card-hover room-card reveal d" + (i%3+1),
      tabindex:"0", role:"link",
      "aria-label":"Book " + rt.name + ", seats " + rt.minParty + " to " + rt.maxParty,
      onclick: function(){ jump({ typeId:rt.id, party: Math.max(2, rt.minParty) }); },
      onkeydown: function(e){
        if (e.key === "Enter" || e.key === " "){ e.preventDefault(); jump({ typeId:rt.id, party: Math.max(2, rt.minParty) }); }
      }
    },[
      accentArt(rt.accent, 170, rt.id.toUpperCase()),
      E("div",{class:"room-body"},[
        E("div",{class:"row-between"},[
          E("h3",{text:rt.name}),
          E("span",{class:"room-dot","aria-hidden":"true",style:{background:rt.accent}})
        ]),
        E("p",{class:"muted room-blurb",text:rt.blurb}),
        E("dl",{class:"room-facts"},[
          E("div",{},[ E("dt",{text:"Seats"}), E("dd",{class:"mono",text:rt.minParty+" to "+rt.maxParty}) ]),
          E("div",{},[ E("dt",{text:"Notice"}), E("dd",{text:rt.lead}) ]),
          E("div",{},[ E("dt",{text:"Minimum spend"}),
            E("dd",{class:"mono",text: rt.minSpend ? U.money(rt.minSpend) : "None"}) ])
        ]),
        E("div",{class:"row room-badges"},[ E("span",{class:"badge badge-accent",text:rt.badge}) ]),
        perks,
        E("span",{class:"room-go",text:"Reserve this room"})
      ])
    ]);
    grid.appendChild(card);
  });
  var s = wrapSection("room-sect",[
    E("div",{class:"g-head reveal",id:"rooms"},[
      E("p",{class:"eyebrow",text:"Four rooms, four services"}),
      E("h2",{text:"The four rooms"}),
      E("p",{class:"lede",text:"Every room has its own capacity rules, notice period and minimum spend. The booking engine enforces all three."})
    ]),
    grid
  ]);
  return s;
}

function hearthSection(){
  var top = D.MENU.slice(0).sort(function(a,b){ return b.pop - a.pop; }).slice(0,6);
  var row = E("div",{class:"scroll-x hearth-row"});
  top.forEach(function(m){
    var card = E("a",{class:"hearth-card card card-hover",href:"#/menu",
      "aria-label":m.name+", "+U.money(m.price)},[
      U.dishArt(m.img, 150),
      E("div",{class:"hearth-body"},[
        E("p",{class:"hearth-name",text:m.name}),
        E("div",{class:"row-between"},[
          E("span",{class:"mono hearth-price",text:U.money(m.price)}),
          E("span",{class:"badge" + (m.tags[0]==="signature" ? " badge-accent" : ""),text:m.tags[0]})
        ])
      ])
    ]);
    row.appendChild(card);
  });
  return wrapSection("hearth-sect",[
    E("div",{class:"g-head reveal"},[
      E("p",{class:"eyebrow",text:"On tonight"}),
      E("h2",{text:"Tonight at the hearth"}),
      E("p",{class:"lede",text:"The six dishes leaving the pass most often this week."})
    ]),
    E("div",{class:"reveal d1"},[row]),
    E("a",{class:"btn btn-ghost reveal d2",href:"#/menu",text:"See all 36 dishes"})
  ]);
}

function stepsSection(){
  var steps = [
    ["Choose party and time","Pick a date, a time and a room. We only show what genuinely fits your party."],
    ["We hold your table","The table is locked for ten minutes while you finish. Nobody else can take it."],
    ["Confirm your details","Name, mobile, email. Allergies go straight to the kitchen screen."],
    ["Arrive and check in","Show the code at the host stand. The floor plan seats you in one tap."]
  ];
  var grid = E("div",{class:"grid step-grid"});
  steps.forEach(function(s, i){
    grid.appendChild(E("div",{class:"step-card reveal d"+(i%3+1)},[
      E("span",{class:"step-no mono",text:U.pad(i+1)}),
      E("h4",{text:s[0]}),
      E("p",{class:"muted",text:s[1]})
    ]));
  });
  return wrapSection("step-sect",[
    E("div",{class:"g-head reveal"},[
      E("p",{class:"eyebrow",text:"Four steps, two minutes"}),
      E("h2",{text:"How booking works"})
    ]),
    grid
  ]);
}

function closingBand(){
  var V = D.VENUE;
  return E("section",{class:"g-band"},[
    E("div",{class:"wrap g-band-in reveal"},[
      E("div",{},[
        E("p",{class:"eyebrow",text:"Reservations"}),
        E("h2",{text:"A table by the fire"}),
        E("p",{class:"muted g-band-meta",text:V.address}),
        E("p",{class:"muted g-band-meta mono",text:V.phone}),
        E("p",{class:"muted g-band-meta",text:V.chef})
      ]),
      E("a",{class:"btn btn-lg",href:"#/book",text:"Reserve a table"})
    ])
  ]);
}
/* =====================================================================
   MENU
   ===================================================================== */
var OK_TAGS = ["vegan","vegetarian","zero proof"];
function tagClass(tag){
  if (tag === "signature") return "badge badge-accent";
  if (OK_TAGS.indexOf(tag) >= 0) return "badge badge-ok";
  return "badge";
}
function catOf(id){
  var i;
  for (i=0;i<D.CATS.length;i++) if (D.CATS[i].id === id) return D.CATS[i];
  return { id:id, name:id, note:"" };
}

function menu(host){
  var state = { cat:"all", quick:"", q:"" };

  host.appendChild(E("section",{class:"menu-head"},[
    E("div",{class:"wrap"},[
      E("p",{class:"eyebrow reveal",text:"Kitchen and bar"}),
      E("h1",{class:"reveal",text:"The Menu"}),
      E("p",{class:"lede reveal d1",text:D.VENUE.chef + ", executive chef. Printed fresh each service."}),
      E("p",{class:"muted reveal d2"},[
        E("span",{class:"badge badge-accent",text:"All " + D.MENU.length + " dishes"}),
        E("span",{text:"  Nothing is held back, this is the complete card."})
      ])
    ])
  ]));

  var bar = E("div",{class:"menu-bar"});
  var barIn = E("div",{class:"wrap menu-bar-in"});
  var chipRow = E("div",{class:"menu-chips",role:"group","aria-label":"Filter by category"});

  function chip(id, label){
    var b = E("button",{class:"chip menu-chip",type:"button","aria-pressed": state.cat===id ? "true":"false",
      text:label, onclick:function(){ state.cat = id; sync(); }});
    b.dataset.cat = id;
    return b;
  }
  chipRow.appendChild(chip("all","All"));
  D.CATS.forEach(function(c){ chipRow.appendChild(chip(c.id, c.name)); });

  function quickBtn(key, label){
    var b = E("button",{class:"chip menu-quick",type:"button","aria-pressed":"false",text:label,
      onclick:function(){ state.quick = state.quick===key ? "" : key; sync(); }});
    b.dataset.quick = key;
    return b;
  }
  var quickRow = E("div",{class:"menu-chips",role:"group","aria-label":"Quick filters"},[
    quickBtn("zero proof","Zero proof"),
    quickBtn("signature","Signature")
  ]);

  var search = E("input",{class:"input menu-search",type:"search",id:"menu-q",
    placeholder:"Search dishes, ingredients, tags",autocomplete:"off",
    oninput:function(){ state.q = this.value; sync(); }});
  var searchField = E("div",{class:"field menu-field"},[
    E("label",{class:"sr-only",for:"menu-q",text:"Search the menu"}),
    search
  ]);

  var live = E("p",{class:"hint menu-live","aria-live":"polite",role:"status"});

  barIn.appendChild(chipRow);
  barIn.appendChild(E("div",{class:"menu-bar-right"},[ quickRow, searchField ]));
  bar.appendChild(barIn);
  bar.appendChild(E("div",{class:"wrap"},[live]));
  host.appendChild(bar);

  var body = E("div",{class:"wrap menu-body"});
  host.appendChild(body);

  function matches(m){
    if (state.cat !== "all" && m.cat !== state.cat) return false;
    if (state.quick && m.tags.indexOf(state.quick) < 0) return false;
    if (state.q){
      var q = state.q.toLowerCase();
      var hay = (m.name + " " + m.desc + " " + m.tags.join(" ")).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function sync(){
    var i, nodes = chipRow.querySelectorAll(".menu-chip");
    for (i=0;i<nodes.length;i++)
      nodes[i].setAttribute("aria-pressed", nodes[i].dataset.cat === state.cat ? "true" : "false");
    nodes = quickRow.querySelectorAll(".menu-quick");
    for (i=0;i<nodes.length;i++)
      nodes[i].setAttribute("aria-pressed", nodes[i].dataset.quick === state.quick ? "true" : "false");

    var list = D.MENU.filter(matches);
    live.textContent = list.length === D.MENU.length
      ? "Showing all " + list.length + " dishes."
      : "Showing " + list.length + " of " + D.MENU.length + " dishes.";

    U.clear(body);
    if (!list.length){
      body.appendChild(E("div",{class:"card menu-empty"},[
        E("h3",{text:"Nothing matches that"}),
        E("p",{class:"muted",text:"Clear the filters to see the full card again."}),
        E("button",{class:"btn btn-ghost",type:"button",text:"Clear filters",
          onclick:function(){ state.cat="all"; state.quick=""; state.q=""; search.value=""; sync(); }})
      ]));
      return;
    }
    D.CATS.forEach(function(c){
      var items = list.filter(function(m){ return m.cat === c.id; });
      if (!items.length) return;
      var grid = E("div",{class:"grid menu-grid"});
      items.forEach(function(m){ grid.appendChild(dishCard(m)); });
      body.appendChild(E("section",{class:"menu-cat"},[
        E("div",{class:"menu-cat-head"},[
          E("h2",{text:c.name}),
          E("p",{class:"muted",text:c.note}),
          E("span",{class:"mono menu-cat-n",text:items.length + (items.length===1?" dish":" dishes")})
        ]),
        grid
      ]));
    });
  }

  sync();
}

function dishCard(m){
  var tags = E("div",{class:"dish-tags"});
  m.tags.forEach(function(t){ tags.appendChild(E("span",{class:tagClass(t),text:t})); });
  return E("article",{class:"card card-hover dish-card",tabindex:"0",role:"button",
    "aria-label":"Open details for " + m.name,
    onclick:function(){ dishModal(m); },
    onkeydown:function(e){ if (e.key==="Enter"||e.key===" "){ e.preventDefault(); dishModal(m); } }
  },[
    U.dishArt(m.img, 160),
    E("div",{class:"dish-body"},[
      E("div",{class:"dish-top"},[
        E("h4",{class:"dish-name",text:m.name}),
        E("span",{class:"mono dish-price",text:U.money(m.price)})
      ]),
      E("p",{class:"muted dish-desc",text:m.desc}),
      E("div",{class:"row-between dish-foot"},[ tags, E("span",{class:"mono dish-kcal",text:m.kcal + " kcal"}) ])
    ])
  ]);
}

function dishModal(m){
  var tags = E("div",{class:"dish-tags"});
  m.tags.forEach(function(t){ tags.appendChild(E("span",{class:tagClass(t),text:t})); });
  var body = E("div",{class:"stack dish-modal"},[
    U.dishArt(m.img, 220),
    E("p",{class:"muted",text:m.desc}),
    E("dl",{class:"dish-dl"},[
      E("div",{},[ E("dt",{text:"Price"}), E("dd",{class:"mono",text:U.money(m.price)}) ]),
      E("div",{},[ E("dt",{text:"Energy"}), E("dd",{class:"mono",text:m.kcal + " kcal"}) ]),
      E("div",{},[ E("dt",{text:"Station"}), E("dd",{text:m.station}) ]),
      E("div",{},[ E("dt",{text:"Section"}), E("dd",{text:catOf(m.cat).name}) ])
    ]),
    tags,
    E("p",{class:"hint",text:"Allergies and dietary notes added to your booking are passed to the kitchen screen with the ticket, before anything is fired."})
  ]);
  U.modal({ title:m.name, body:body, actions:[
    E("a",{class:"btn",href:"#/book",text:"Reserve a table"})
  ]});
}
/* =====================================================================
   BOOK - five step flow
   ===================================================================== */
var B = null;
var STEPS = ["Find a table","Choose a time","Your table","Your details","Confirmed"];
var PROTO_TTL = 90;   /* seconds shown in the prototype */
var OCCASIONS = ["","Birthday","Anniversary","Business dinner","Date night","Celebration","First visit"];

function book(host){
  var dq = defaultQuery();
  B = { step:1, party:2, dayOffset:dq.dayOffset, slot:dq.slot, typeId:"any",
        tables:[], hold:null, combo:null, tick:null, res:null, mail:null, sms:null,
        details:{ name:"", phone:"", email:"", occasion:"", allergy:"", request:"", sms:true, deposit:false } };
  var p = window.Guest._pending;
  if (p){
    if (p.party) B.party = p.party;
    if (typeof p.dayOffset === "number") B.dayOffset = p.dayOffset;
    if (p.slot) B.slot = p.slot;
    if (p.typeId) B.typeId = p.typeId;
    window.Guest._pending = null;
    if (p.slot) B.step = 2;
  }

  var head = E("section",{class:"book-head"},[
    E("div",{class:"wrap"},[
      E("p",{class:"eyebrow",text:"Reservations"}),
      E("h1",{text:"Book a table"}),
      E("div",{class:"book-rail-wrap"},[ E("div",{class:"rail",id:"book-rail"}) ])
    ])
  ]);
  host.appendChild(head);
  var body = E("div",{class:"wrap book-body",id:"book-body","aria-live":"polite"});
  host.appendChild(body);
  B.bodyNode = body;
  B.railNode = head.querySelector("#book-rail");
  renderStep();
}

function renderStep(){
  var rail = B.railNode, body = B.bodyNode;
  U.clear(rail);
  STEPS.forEach(function(label, i){
    var n = i+1;
    if (i) rail.appendChild(E("span",{class:"rail-sep","aria-hidden":"true"}));
    rail.appendChild(E("span",{
      class:"rail-step" + (n===B.step ? " is-on" : n<B.step ? " is-done" : ""),
      "aria-current": n===B.step ? "step" : null
    },[ E("i",{text: n<B.step ? "\u2713" : String(n)}), E("span",{text:label}) ]));
  });
  U.clear(body);
  if (B.tick){ clearInterval(B.tick); B.tick = null; }
  if (B.step === 1) stepFind(body);
  else if (B.step === 2) stepTime(body);
  else if (B.step === 3) stepTable(body);
  else if (B.step === 4) stepDetails(body);
  else stepDone(body);
  U.observeReveals(body);
}
function goStep(n){ B.step = n; renderStep(); window.scrollTo({top:0,behavior:"instant"}); }

/* ---------- step 1 ---------- */
function stepFind(host){
  var card = E("div",{class:"card book-card"});
  card.appendChild(E("h2",{class:"book-h",text:"Find a table"}));
  card.appendChild(E("p",{class:"muted",text:"We only offer times where a real table fits your party. Nothing here is decoration."}));

  /* party */
  var out = E("output",{class:"mono",for:"party-dec party-inc",text:String(B.party)});
  function setParty(v){
    B.party = Math.max(1, Math.min(16, v));
    out.textContent = String(B.party);
    syncTypes();
  }
  var stepper = E("div",{class:"stepper"},[
    E("button",{type:"button",id:"party-dec","aria-label":"Fewer guests",text:"\u2212",
      onclick:function(){ setParty(B.party-1); }}),
    out,
    E("button",{type:"button",id:"party-inc","aria-label":"More guests",text:"+",
      onclick:function(){ setParty(B.party+1); }})
  ]);
  var partyField = E("div",{class:"field"},[
    E("span",{class:"label",id:"lbl-party",text:"Guests"}),
    E("div",{role:"group","aria-labelledby":"lbl-party"},[stepper]),
    E("p",{class:"hint",text:"One to sixteen. Over twelve needs manager approval."})
  ]);

  /* date */
  var today = D.startOfToday();
  var max = new Date(today.getTime()); max.setDate(max.getDate()+30);
  var dateIn = E("input",{class:"input",type:"date",id:"bk-date",
    value:U.isoDate(D.atMin(B.dayOffset,0)), min:U.isoDate(today), max:U.isoDate(max),
    onchange:function(){
      var d = U.fromIso(this.value);
      B.dayOffset = Math.max(0, Math.min(30, U.dayOffsetOf(d)));
      this.value = U.isoDate(D.atMin(B.dayOffset,0));
      syncTypes();
    }});
  var dateField = E("div",{class:"field"},[
    E("label",{class:"label",for:"bk-date",text:"Date"}), dateIn,
    E("p",{class:"hint",text:"Bookings open thirty days ahead."})
  ]);

  /* time */
  var timeSel = E("select",{class:"select",id:"bk-time",
    onchange:function(){ B.slot = parseInt(this.value,10); }});
  D.slotList().forEach(function(s){
    timeSel.appendChild(E("option",{value:String(s),selected: s===B.slot ? true : null,
      text:D.hhmm(s) + " \u00b7 " + periodLabel(s)}));
  });
  var timeField = E("div",{class:"field"},[
    E("label",{class:"label",for:"bk-time",text:"Time"}), timeSel,
    E("p",{class:"hint",text:"Fifteen minute slots. Last seating " + D.hhmm(D.SERVICE_LAST) + "."})
  ]);

  /* room type */
  var typeSel = E("select",{class:"select",id:"bk-room",
    onchange:function(){ B.typeId = this.value; syncTypes(); }});
  var typeNote = E("p",{class:"hint",id:"bk-room-note"});
  var typeWarn = E("p",{class:"err",id:"bk-room-warn"});

  function syncTypes(){
    U.clear(typeSel);
    typeSel.appendChild(E("option",{value:"any",selected: B.typeId==="any" ? true : null,text:"Any room"}));
    var blocked = [];
    D.ROOM_TYPES.forEach(function(rt){
      var bad = B.party < rt.minParty || B.party > rt.maxParty;
      if (bad) blocked.push(rt.name + " seat " + rt.minParty + " to " + rt.maxParty);
      typeSel.appendChild(E("option",{
        value:rt.id, disabled: bad ? true : null,
        selected: B.typeId===rt.id ? true : null,
        text: rt.name + (bad ? " \u00b7 not for " + B.party + " guests" : "")
      }));
    });
    var cur = roomType(B.typeId);
    if (cur && (B.party < cur.minParty || B.party > cur.maxParty)){
      B.typeId = "any"; typeSel.value = "any";
    }
    cur = roomType(B.typeId);
    typeNote.textContent = cur
      ? cur.badge + " \u00b7 " + cur.lead + (cur.minSpend ? " \u00b7 minimum spend " + U.money(cur.minSpend) : "")
      : "We will pick the best fitting room for " + B.party + (B.party===1?" guest.":" guests.");
    typeWarn.textContent = blocked.length ? "Unavailable for this party size: " + blocked.join(". ") + "." : "";
  }
  var typeField = E("div",{class:"field"},[
    E("label",{class:"label",for:"bk-room",text:"Room"}), typeSel, typeNote, typeWarn
  ]);

  card.appendChild(E("div",{class:"grid book-grid"},[partyField, dateField, timeField, typeField]));
  card.appendChild(E("div",{class:"book-actions"},[
    E("button",{class:"btn btn-lg",type:"button",text:"Find a table",
      onclick:function(){ goStep(2); }})
  ]));
  syncTypes();
  host.appendChild(card);
}
function periodLabel(slot){
  var id = periodOf(slot), i;
  for (i=0;i<PERIODS.length;i++) if (PERIODS[i].id === id) return PERIODS[i].name;
  return "";
}

/* ---------- step 2 ---------- */
function stepTime(host){
  var card = E("div",{class:"card book-card"});
  card.appendChild(E("h2",{class:"book-h",text:"Choose a time"}));

  var chips = E("div",{class:"row book-chips",role:"group","aria-label":"Edit your search"});
  [[B.party + (B.party===1?" guest":" guests")],
   [U.longDate(D.atMin(B.dayOffset,0))],
   [D.hhmm(B.slot)],
   [typeName(B.typeId)]].forEach(function(c){
    chips.appendChild(E("button",{class:"chip chip-edit",type:"button",
      "aria-label":"Change " + c[0], text:c[0], onclick:function(){ goStep(1); }}));
  });
  card.appendChild(chips);

  var a = D.availability(B.dayOffset, B.slot, B.party, B.typeId);
  if (!a.ok && a.reason === "blackout"){
    card.appendChild(E("div",{class:"notice notice-crit"},[
      E("b",{text:"That date is closed"}),
      E("p",{text:a.blackout.label + ". Nothing can be booked" +
        (a.blackout.scope === "room_type" ? " in " + typeName(a.blackout.typeId) : " at the venue") + " that day."})
    ]));
    card.appendChild(nearestDatesBlock());
    host.appendChild(card);
    return;
  }

  /* time pills for the whole service, grouped by period */
  var counts = {};
  D.slotList().forEach(function(s){ counts[s] = freeCount(B.dayOffset, s, B.party, B.typeId); });
  var sameDayAlt = D.slotList().filter(function(s){ return counts[s] > 0 && s !== B.slot; });
  var chosenFree = counts[B.slot] || 0;

  if (!chosenFree){
    if (sameDayAlt.length){
      card.appendChild(E("div",{class:"notice notice-warn"},[
        E("b",{text:"Fallback 1 of 4: nearest times, same day"}),
        E("p",{text:D.hhmm(B.slot) + " is fully committed for " + B.party +
          (B.party===1?" guest":" guests") + " in " + typeName(B.typeId) +
          ". These times on the same date are still open."})
      ]));
    } else {
      var typeAlt = otherTypesBlock();
      if (typeAlt){
        card.appendChild(E("div",{class:"notice notice-warn"},[
          E("b",{text:"Fallback 2 of 4: another room, same time"}),
          E("p",{text:"Nothing is left in " + typeName(B.typeId) + " on this date, at any time. These rooms can still take you at " + D.hhmm(B.slot) + "."})
        ]));
        card.appendChild(typeAlt);
        host.appendChild(card);
        return;
      }
      var dates = nearestDatesBlock();
      if (dates){
        card.appendChild(E("div",{class:"notice notice-warn"},[
          E("b",{text:"Fallback 3 of 4: nearest dates"}),
          E("p",{text:"This date is finished for a party of " + B.party + ". The next dates with a real table are below."})
        ]));
        card.appendChild(dates);
        host.appendChild(card);
        return;
      }
      card.appendChild(E("div",{class:"notice notice-crit"},[
        E("b",{text:"Fallback 4 of 4: join the waitlist"}),
        E("p",{text:"Every table that fits " + B.party + " guests is committed across the next thirty days. We release cancellations to the waitlist in rank order."})
      ]));
      card.appendChild(waitlistBlock());
      host.appendChild(card);
      return;
    }
  }

  var scar = E("p",{class:"book-scarce","aria-live":"polite"});
  var pace = E("p",{class:"hint book-pace"});
  function syncSlot(){
    var n = counts[B.slot] || 0;
    scar.textContent = n
      ? n + (n===1 ? " table left at " : " tables left at ") + D.hhmm(B.slot) +
        " in " + typeName(B.typeId) + " for " + B.party + (B.party===1?" guest":" guests")
      : "Nothing left at " + D.hhmm(B.slot) + ". Pick another time above.";
    var p = D.pacingFor(B.dayOffset, B.slot);
    pace.textContent = "Pacing for " + D.hhmm(B.slot) + ": " + p.covers + " of " + p.cap.covers +
      " covers committed, " + p.count + " of " + p.cap.count + " tables seated on that slot.";
    cont.disabled = !counts[B.slot];
  }

  var groups = E("div",{class:"stack book-periods"});
  PERIODS.forEach(function(pd){
    var pills = E("div",{class:"pills"});
    var any = false;
    D.slotList().forEach(function(s){
      if (periodOf(s) !== pd.id) return;
      var n = counts[s];
      if (n) any = true;
      var inp = E("input",{type:"radio",name:"slot",value:String(s),
        checked: s===B.slot ? true : null, disabled: n ? null : true,
        "aria-label": D.hhmm(s) + ", " + (n ? n + " tables free" : "no tables"),
        onchange:function(){ B.slot = parseInt(this.value,10); syncSlot(); }});
      pills.appendChild(E("label",{class:"pill" + (n ? "" : " is-gone")},[
        inp, E("span",{class:"mono",text:D.hhmm(s)})
      ]));
    });
    groups.appendChild(E("fieldset",{class:"book-period"},[
      E("legend",{},[ E("b",{text:pd.name}), E("i",{class:"mono",text:pd.range}),
        E("em",{text: any ? "" : "fully committed"}) ]),
      pills
    ]));
  });
  card.appendChild(groups);
  card.appendChild(scar);
  card.appendChild(pace);

  var cont = E("button",{class:"btn btn-lg",type:"button",text:"Hold this time",
    onclick:function(){ beginHold(); }});
  card.appendChild(E("div",{class:"book-actions"},[
    cont,
    E("button",{class:"btn btn-ghost btn-lg",type:"button",text:"Back",onclick:function(){ goStep(1); }})
  ]));
  syncSlot();
  host.appendChild(card);
}

function otherTypesBlock(){
  var rows = [];
  D.ROOM_TYPES.forEach(function(rt){
    if (rt.id === B.typeId) return;
    if (B.party < rt.minParty || B.party > rt.maxParty) return;
    var n = freeCount(B.dayOffset, B.slot, B.party, rt.id);
    if (!n) return;
    rows.push(E("button",{class:"alt-row",type:"button",
      "aria-label":"Switch to " + rt.name + " at " + D.hhmm(B.slot),
      onclick:function(){ B.typeId = rt.id; goStep(2); }},[
      E("span",{class:"alt-dot","aria-hidden":"true",style:{background:rt.accent}}),
      E("span",{class:"grow"},[ E("b",{text:rt.name}), E("i",{text:rt.badge}) ]),
      E("span",{class:"mono",text:n + (n===1?" table":" tables")})
    ]));
  });
  if (!rows.length) return null;
  return E("div",{class:"alt-list"}, rows);
}

function nearestDatesBlock(){
  var rows = [], off, n;
  for (off = B.dayOffset+1; off <= 30 && rows.length < 6; off++){
    n = freeCount(off, B.slot, B.party, B.typeId);
    if (!n) continue;
    rows.push(makeDateRow(off, n));
  }
  for (off = B.dayOffset-1; off >= 0 && rows.length < 6; off--){
    n = freeCount(off, B.slot, B.party, B.typeId);
    if (!n) continue;
    rows.push(makeDateRow(off, n));
  }
  if (!rows.length) return null;
  return E("div",{class:"alt-list"}, rows);
}
function makeDateRow(off, n){
  var d = D.atMin(off, 0);
  return E("button",{class:"alt-row",type:"button",
    "aria-label":"Move to " + U.longDate(d) + " at " + D.hhmm(B.slot),
    onclick:function(){ B.dayOffset = off; goStep(2); }},[
    E("span",{class:"grow"},[ E("b",{text:U.longDate(d)}),
      E("i",{class:"mono",text:D.hhmm(B.slot) + " \u00b7 " + typeName(B.typeId)}) ]),
    E("span",{class:"mono",text:n + (n===1?" table":" tables")})
  ]);
}

function waitlistBlock(){
  var name = E("input",{class:"input",id:"wl-name",autocomplete:"name"});
  var phone = E("input",{class:"input",id:"wl-phone",type:"tel",autocomplete:"tel"});
  var msg = E("p",{class:"hint","aria-live":"polite"});
  var box = E("div",{class:"card card-2 stack"},[
    E("h4",{text:"Waitlist for " + D.hhmm(B.slot) + ", " + U.longDate(D.atMin(B.dayOffset,0))}),
    E("div",{class:"grid g2"},[
      E("div",{class:"field"},[ E("label",{class:"label",for:"wl-name",text:"Full name"}), name ]),
      E("div",{class:"field"},[ E("label",{class:"label",for:"wl-phone",text:"Mobile"}), phone ])
    ]),
    E("button",{class:"btn",type:"button",text:"Add me to the waitlist",onclick:function(){
      if (!name.value.trim() || !phone.value.trim()){
        msg.textContent = "Name and mobile are both required.";
        (name.value.trim() ? phone : name).focus();
        return;
      }
      var w = { id:"w"+(D.WAITLIST.length+1), rank:D.WAITLIST.length+1, guest:name.value.trim(),
        phone:phone.value.trim(), party:B.party, typeId:B.typeId, wantedSlot:B.slot,
        addedAt:new Date(), status:"waiting", notifiedAt:null };
      D.WAITLIST.push(w);
      D.send("sms", w.phone, "Waitlist", "You are number " + w.rank + " on the Lumina waitlist for " +
        D.hhmm(B.slot) + ". We text the moment a table frees up.");
      msg.textContent = "Added. You are number " + w.rank + " in the queue, we will text " + w.phone + ".";
      U.toast("On the waitlist", "Rank " + w.rank + " for " + D.hhmm(B.slot), "ok");
    }}),
    msg
  ]);
  return box;
}
/* ---------- step 3 ---------- */
function releaseHold(){
  if (B.hold && B.hold.status === "active") B.hold.status = "released";
  B.hold = null;
}
function makeHold(table){
  var h = D.createHold(B.dayOffset, B.slot, B.party, table, "guest-web");
  /* prototype shortens the visible TTL so it can be watched expiring */
  h.expiresAt = new Date(Date.now() + PROTO_TTL*1000);
  B.hold = h;
  return h;
}
function beginHold(){
  var a = D.availability(B.dayOffset, B.slot, B.party, B.typeId);
  B.tables = a.tables || [];
  B.combo = null;
  if (!B.tables.length){
    var combos = D.combinations(B.dayOffset, B.slot, B.party, B.typeId);
    if (!combos.length){ U.toast("That time just went","Pick another slot.","crit"); goStep(2); return; }
    B.combo = combos[0];
    makeHold(B.combo.tables[0]);
    goStep(3);
    return;
  }
  makeHold(B.tables[0]);
  goStep(3);
}

function stepTable(host){
  if (!B.hold){ goStep(2); return; }
  var card = E("div",{class:"card book-card"});
  card.appendChild(E("h2",{class:"book-h",text:"Your table"}));

  var label = B.combo
    ? B.combo.tables[0].label + " plus " + B.combo.tables[1].label + ", joined"
    : B.hold.tableLabel;
  var heldLine = E("p",{class:"hold-line"},[
    E("b",{text:"We have held " + label + " for you."}),
    E("span",{class:"muted",text:" " + U.longDate(D.atMin(B.dayOffset,0)) + " at " + D.hhmm(B.slot) +
      ", " + B.party + (B.party===1?" guest":" guests") + ", " + typeName(B.hold.tableId ? tableById(B.hold.tableId).typeId : B.typeId) + "."})
  ]);
  card.appendChild(heldLine);

  /* countdown */
  var bar = E("div",{class:"hold-bar"},[ E("i",{class:"hold-fill"}) ]);
  var clock = E("strong",{class:"mono hold-clock","aria-live":"off"});
  var holdBox = E("div",{class:"hold-box"},[
    E("div",{class:"row-between"},[
      E("span",{class:"label",text:"Table held"}),
      clock
    ]),
    bar,
    E("p",{class:"hint",text:"Production holds a table for 10 minutes. This prototype shortens it to " +
      PROTO_TTL + " seconds so the release can be watched. Token " + B.hold.token + "."}),
    E("p",{class:"sr-only","aria-live":"polite",id:"hold-sr"})
  ]);
  card.appendChild(holdBox);
  var fill = bar.querySelector(".hold-fill");
  var total = PROTO_TTL;
  function tickFn(){
    if (!B.hold) return;
    var left = (B.hold.expiresAt.getTime() - Date.now())/1000;
    if (left <= 0){
      clock.textContent = "00:00";
      fill.style.width = "0%";
      B.hold.status = "expired";
      clearInterval(B.tick); B.tick = null;
      var held = B.hold; B.hold = null;
      var m = U.modal({ title:"The hold expired",
        body:"Table " + U.esc(held.tableLabel) + " at " + D.hhmm(B.slot) +
             " was released back to the floor because the hold ran out. Nothing was booked. Choose a time again and we will hold a table afresh.",
        actions:[ E("button",{class:"btn",type:"button",text:"Choose another time",
          onclick:function(){ m.close(); }}) ],
        onClose:function(){ if (B.step === 3) goStep(2); }});
      return;
    }
    clock.textContent = U.mmss(left);
    fill.style.width = Math.max(0, Math.min(100, (left/total)*100)) + "%";
    holdBox.classList.toggle("is-warn", left < 180);
    holdBox.classList.toggle("is-crit", left < 60);
    if (Math.round(left) === 30) document.getElementById("hold-sr").textContent = "Thirty seconds left on your table hold.";
  }
  tickFn();
  B.tick = setInterval(tickFn, 1000);
  APP.addTimer(B.tick);

  /* availability set for this slot, computed before the hold existed */
  var ids = {}, i;
  for (i=0;i<B.tables.length;i++) ids[B.tables[i].id] = B.tables[i];
  if (B.combo){ ids[B.combo.tables[0].id] = B.combo.tables[0]; ids[B.combo.tables[1].id] = B.combo.tables[1]; }
  var when = D.atMin(B.dayOffset, B.slot);

  var fpHost = E("div",{class:"fp-host"});
  card.appendChild(E("p",{class:"muted",text:"Pick any green table, or use the list underneath if you prefer."}));
  card.appendChild(fpHost);

  var listHost = E("div",{class:"table-list"});
  card.appendChild(listHost);

  var fp = null;
  function statusOf(t){
    if (B.hold && t.id === B.hold.tableId) return "held";
    if (ids[t.id]) return "free";
    var s = D.tableStatusAt(t.id, when);
    if (s.status === "free") return "blocked";
    return s.status;
  }
  function choose(t){
    if (!B.hold) return;
    if (t.id === B.hold.tableId) return;
    var old = B.hold.tableLabel;
    releaseHold();
    makeHold(t);
    U.toast("Moved to " + t.label, old + " released, " + t.label + " held for you.", "ok");
    renderStep();
  }
  fp = FloorPlan.render(fpHost, {
    statusOf: statusOf,
    selectable: function(t){ return !!ids[t.id]; },
    selected: [B.hold.tableId],
    onSelect: choose,
    labelOf: function(t){
      return t.label + " in " + t.roomName + ", seats " + t.min + " to " + t.max + ", " + statusOf(t);
    },
    tipOf: function(t){
      return t.label + " \u00b7 " + t.roomName + " \u00b7 seats " + t.min + "-" + t.max + " \u00b7 " + statusOf(t);
    },
    legend: true,
    height: "62vh"
  });
  fp.pulse(B.hold.tableId);

  /* accessible radio fallback, grouped by room */
  var byRoom = {};
  B.tables.forEach(function(t){
    if (!byRoom[t.roomName]) byRoom[t.roomName] = [];
    byRoom[t.roomName].push(t);
  });
  listHost.appendChild(E("h4",{class:"table-list-h",text:"Available tables at " + D.hhmm(B.slot)}));
  Object.keys(byRoom).forEach(function(room){
    var opts = E("div",{class:"table-opts"});
    byRoom[room].forEach(function(t){
      var id = "tbl-" + t.id;
      opts.appendChild(E("label",{class:"table-opt" + (B.hold && t.id===B.hold.tableId ? " is-on" : ""),for:id},[
        E("input",{type:"radio",name:"table",id:id,value:t.id,
          checked: B.hold && t.id===B.hold.tableId ? true : null,
          onchange:function(){ choose(t); }}),
        E("span",{class:"grow"},[ E("b",{text:t.label}), E("i",{text:t.roomName}) ]),
        E("span",{class:"mono",text:"seats " + t.min + "-" + t.max})
      ]));
    });
    listHost.appendChild(E("fieldset",{class:"table-room"},[
      E("legend",{text:room}), opts
    ]));
  });

  /* joined tables option */
  var combos = B.tables.length ? [] : D.combinations(B.dayOffset, B.slot, B.party, B.typeId);
  if (B.combo || combos.length){
    var list = B.combo ? [B.combo] : combos;
    var block = E("div",{class:"join-block"},[
      E("h4",{text:"Joined tables"}),
      E("p",{class:"muted",text:"No single table seats " + B.party + " guests, so the room is joined. Service is family style across the join."})
    ]);
    list.forEach(function(c){
      block.appendChild(E("button",{class:"alt-row",type:"button",
        "aria-label":"Take " + c.tables[0].label + " joined to " + c.tables[1].label,
        onclick:function(){
          releaseHold(); B.combo = c; makeHold(c.tables[0]); renderStep();
        }},[
        E("span",{class:"grow"},[
          E("b",{text:c.tables[0].label + " plus " + c.tables[1].label + ", joined"}),
          E("i",{text:c.tables[0].roomName})
        ]),
        E("span",{class:"mono",text:"seats " + c.seats})
      ]));
    });
    card.appendChild(block);
  }

  card.appendChild(E("div",{class:"book-actions"},[
    E("button",{class:"btn btn-lg",type:"button",text:"Continue",onclick:function(){ goStep(4); }}),
    E("button",{class:"btn btn-ghost btn-lg",type:"button",text:"Change the time",
      onclick:function(){ releaseHold(); goStep(2); }})
  ]));
  host.appendChild(card);
}
function tableById(id){
  var i;
  for (i=0;i<D.TABLES.length;i++) if (D.TABLES[i].id === id) return D.TABLES[i];
  return null;
}
/* ---------- step 4 ---------- */
function holdCountdown(){
  var clock = E("strong",{class:"mono hold-clock"});
  var bar = E("div",{class:"hold-bar"},[ E("i",{class:"hold-fill"}) ]);
  var box = E("div",{class:"hold-box hold-box-sm"},[
    E("div",{class:"row-between"},[ E("span",{class:"label",text:"Table held"}), clock ]), bar
  ]);
  var fill = bar.querySelector(".hold-fill");
  function t(){
    if (!B.hold) return;
    var left = (B.hold.expiresAt.getTime() - Date.now())/1000;
    if (left <= 0){
      B.hold.status = "expired"; B.hold = null;
      clearInterval(B.tick); B.tick = null;
      var m = U.modal({ title:"The hold expired",
        body:"Your table went back to the floor before the booking was submitted. Nothing was charged and nothing was booked. Pick a time again.",
        actions:[ E("button",{class:"btn",type:"button",text:"Choose another time",onclick:function(){ m.close(); }}) ],
        onClose:function(){ goStep(2); }});
      return;
    }
    clock.textContent = U.mmss(left);
    fill.style.width = Math.min(100,(left/PROTO_TTL)*100) + "%";
    box.classList.toggle("is-warn", left < 180);
    box.classList.toggle("is-crit", left < 60);
  }
  t();
  B.tick = setInterval(t, 1000);
  APP.addTimer(B.tick);
  return box;
}

function stepDetails(host){
  if (!B.hold){ goStep(2); return; }
  var t = tableById(B.hold.tableId);
  var rt = roomType(t.typeId);
  var isVip = t.typeId === "vip";
  var needsApproval = B.party > 12;
  var turn = D.turnFor(B.party);

  var card = E("div",{class:"card book-card"});
  card.appendChild(E("h2",{class:"book-h",text:"Your details"}));

  var f = {};
  function field(key, label, attrs, hint){
    var id = "bk-" + key;
    var input = E(attrs.tag || "input", (function(){
      var o = { class: attrs.tag === "textarea" ? "textarea" : "input", id:id };
      for (var k in attrs) if (k !== "tag") o[k] = attrs[k];
      return o;
    })());
    input.value = B.details[key] || "";
    var err = E("p",{class:"err",id:id+"-err"});
    f[key] = { input:input, err:err };
    return E("div",{class:"field"},[
      E("label",{class:"label",for:id,text:label}), input,
      hint ? E("p",{class:"hint",text:hint}) : null, err
    ]);
  }

  var occ = E("select",{class:"select",id:"bk-occ"});
  OCCASIONS.forEach(function(o){
    occ.appendChild(E("option",{value:o,selected:B.details.occasion===o?true:null,text:o||"Not a special occasion"}));
  });

  var smsBox = E("input",{type:"checkbox",id:"bk-sms",checked:B.details.sms?true:null});
  var depBox = E("input",{type:"checkbox",id:"bk-dep"});
  var depErr = E("p",{class:"err",id:"bk-dep-err"});

  card.appendChild(E("div",{class:"grid book-grid"},[
    field("name","Full name",{autocomplete:"name",required:true}),
    field("phone","Mobile",{type:"tel",autocomplete:"tel",required:true},"Philippine mobile, we text the reminder here."),
    field("email","Email",{type:"email",autocomplete:"email",required:true},"The confirmation and check-in code go here."),
    E("div",{class:"field"},[ E("label",{class:"label",for:"bk-occ",text:"Occasion"}), occ,
      E("p",{class:"hint",text:"Optional. The host stand sees this."}) ])
  ]));
  card.appendChild(field("allergy","Allergies and dietary notes",{tag:"textarea",rows:"3"},
    "This goes straight to the kitchen screen with your ticket, before anything is fired."));
  card.appendChild(field("request","Special request",{tag:"textarea",rows:"3"},
    "Quiet corner, high chair, candle on the dessert. Requests are not guaranteed."));
  card.appendChild(E("label",{class:"check",for:"bk-sms"},[
    smsBox, E("span",{text:"Text me a reminder two hours before the booking"})
  ]));

  if (isVip){
    card.appendChild(E("div",{class:"notice notice-accent"},[
      E("b",{text:"VIP suite, minimum spend " + U.money(rt.minSpend)}),
      E("p",{text:"A deposit equal to the minimum spend is authorised on arrival and credited to the bill. Cancellations inside 48 hours forfeit the deposit."}),
      E("label",{class:"check",for:"bk-dep"},[ depBox,
        E("span",{text:"I understand the " + U.money(rt.minSpend) + " minimum spend and the deposit terms"}) ]),
      depErr
    ]));
  }
  if (needsApproval){
    card.appendChild(E("div",{class:"notice notice-warn"},[
      E("b",{text:"Party of " + B.party + " needs manager approval"}),
      E("p",{text:"Bookings over twelve guests are created as pending. " +
        "Diego Salcedo, service manager, confirms or calls you within one working day. The table stays blocked meanwhile."})
    ]));
  }

  /* summary */
  var summary = E("aside",{class:"card card-2 book-summary"},[
    E("p",{class:"eyebrow",text:"Holding for you"}),
    E("h4",{text: B.combo ? B.combo.tables[0].label + " plus " + B.combo.tables[1].label : t.label}),
    E("dl",{class:"sum-dl"},[
      E("div",{},[ E("dt",{text:"Room"}), E("dd",{text:t.roomName + " \u00b7 " + typeName(t.typeId)}) ]),
      E("div",{},[ E("dt",{text:"Date"}), E("dd",{text:U.longDate(D.atMin(B.dayOffset,0))}) ]),
      E("div",{},[ E("dt",{text:"Time"}), E("dd",{class:"mono",text:D.hhmm(B.slot)}) ]),
      E("div",{},[ E("dt",{text:"Guests"}), E("dd",{class:"mono",text:String(B.party)}) ]),
      E("div",{},[ E("dt",{text:"Table time"}), E("dd",{text:turn + " minutes plus " + D.BUFFER_MIN + " minute reset"}) ])
    ]),
    holdCountdown()
  ]);

  var formErr = E("p",{class:"err","aria-live":"assertive"});
  var submit = E("button",{class:"btn btn-lg",type:"submit",
    text: needsApproval ? "Request this table" : "Confirm reservation"});

  var form = E("form",{novalidate:true,onsubmit:function(e){
    e.preventDefault();
    var bad = null;
    function fail(key, msg){
      f[key].err.textContent = msg;
      f[key].input.setAttribute("aria-invalid","true");
      if (!bad) bad = f[key].input;
    }
    Object.keys(f).forEach(function(k){
      f[k].err.textContent = ""; f[k].input.removeAttribute("aria-invalid");
    });
    depErr.textContent = "";
    var name = f.name.input.value.trim();
    var phone = f.phone.input.value.trim();
    var email = f.email.input.value.trim();
    if (name.length < 2) fail("name","Enter the full name the table is booked under.");
    if (phone.replace(/[^0-9]/g,"").length < 10) fail("phone","Enter a mobile number with at least 10 digits.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail("email","Enter an email address we can send the confirmation to.");
    if (isVip && !depBox.checked){
      depErr.textContent = "The deposit terms must be acknowledged for a VIP suite.";
      if (!bad) bad = depBox;
    }
    if (bad){
      formErr.textContent = "We could not submit this. Fix the highlighted fields and try again.";
      bad.focus();
      return;
    }
    formErr.textContent = "";
    B.details = { name:name, phone:phone, email:email, occasion:occ.value,
      allergy:f.allergy.input.value.trim(), request:f.request.input.value.trim(),
      sms:smsBox.checked, deposit:depBox.checked };
    submitBooking(needsApproval);
  }},[
    card,
    E("div",{class:"book-actions"},[
      submit,
      E("button",{class:"btn btn-ghost btn-lg",type:"button",text:"Back to the floor plan",
        onclick:function(){ goStep(3); }})
    ]),
    formErr
  ]);

  host.appendChild(E("div",{class:"book-split"},[ form, summary ]));
}

function submitBooking(needsApproval){
  var t = tableById(B.hold.tableId);
  var starts = D.atMin(B.dayOffset, B.slot);
  var turn = D.turnFor(B.party);
  var ends = new Date(starts.getTime() + turn*60000);
  var blocks = new Date(ends.getTime() + D.BUFFER_MIN*60000);
  var status = needsApproval ? "pending" : "confirmed";
  var now = new Date();
  var res = {
    id: 90000 + D.RESERVATIONS.length + 1,
    ref: D.ref(), guest: B.details.name, phone: B.details.phone, email: B.details.email,
    party: B.party, tableId: t.id,
    tableLabel: B.combo ? B.combo.tables[0].label + "+" + B.combo.tables[1].label : t.label,
    roomId: t.roomId, typeId: t.typeId,
    startsAt: starts, endsAt: ends, blocksUntil: blocks,
    slotMin: B.slot, turnMin: turn, status: status,
    occasion: B.details.occasion, request: B.details.request, allergy: B.details.allergy,
    createdAt: now, source: "web", covers: B.party, spend: 0,
    history: [ { at:now, from:null, to:"pending", by:"guest" } ]
  };
  if (!needsApproval) res.history.push({ at:now, from:"pending", to:"confirmed", by:"system" });
  D.RESERVATIONS.push(res);
  B.hold.status = "consumed";
  B.res = res;

  var when = U.longDate(starts) + " at " + D.hhmm(B.slot);
  D.send("email", res.email, "Lumina reservation " + res.ref,
    "Hello " + res.guest + ",\n\n" +
    (needsApproval
      ? "Your request for " + res.party + " guests on " + when + " is with our service manager for approval. The table is held while we review.\n\n"
      : "Your table is confirmed. " + res.party + " guests, " + when + ", table " + res.tableLabel + " in " + t.roomName + ".\n\n") +
    "Reference " + res.ref + ". Table time " + turn + " minutes.\n" +
    (res.allergy ? "Kitchen note: " + res.allergy + "\n" : "") +
    D.VENUE.address + ". " + D.VENUE.phone);
  B.mail = D.OUTBOX[0];
  if (B.details.sms){
    D.send("sms", res.phone,
      "Lumina", "Lumina: " + (needsApproval ? "request received" : "table confirmed") + " for " +
      res.party + " on " + U.shortDate(starts) + " at " + D.hhmm(B.slot) +
      ". Ref " + res.ref + ". Reply CANCEL to release it.");
    B.sms = D.OUTBOX[0];
  } else { B.sms = null; }

  window.Guest._lastRef = res.ref;
  U.toast(needsApproval ? "Request submitted" : "Table confirmed", res.ref + " \u00b7 " + res.tableLabel,
    needsApproval ? "info" : "ok");
  goStep(5);
}
/* ---------- step 5 ---------- */
function stepDone(host){
  var res = B.res;
  if (!res){ goStep(1); return; }
  var t = tableById(res.tableId);
  var pending = res.status === "pending";

  var card = E("div",{class:"card book-card done-card"},[
    E("p",{class:"eyebrow",text: pending ? "Request received" : "Reservation confirmed"}),
    E("h2",{class:"done-h",text: pending ? "With the manager" : "Your table is booked"}),
    E("p",{class:"lede",text: pending
      ? "Diego Salcedo reviews parties over twelve. You will hear within one working day, and the table stays blocked until then."
      : "We have you down. The host stand sees this booking the moment you walk in."}),
    E("div",{class:"done-ref"},[
      E("span",{class:"label",text:"Reference"}),
      E("strong",{class:"mono done-code",text:res.ref})
    ]),
    E("dl",{class:"sum-dl done-dl"},[
      E("div",{},[ E("dt",{text:"Table"}), E("dd",{text:res.tableLabel}) ]),
      E("div",{},[ E("dt",{text:"Room"}), E("dd",{text:t.roomName + " \u00b7 " + typeName(res.typeId)}) ]),
      E("div",{},[ E("dt",{text:"Date"}), E("dd",{text:U.longDate(res.startsAt)}) ]),
      E("div",{},[ E("dt",{text:"Time"}), E("dd",{class:"mono",text:U.hhmm(res.startsAt) + " to " + U.hhmm(res.endsAt)}) ]),
      E("div",{},[ E("dt",{text:"Guests"}), E("dd",{class:"mono",text:String(res.party)}) ]),
      E("div",{},[ E("dt",{text:"Table time"}), E("dd",{text:res.turnMin + " minutes"}) ]),
      E("div",{},[ E("dt",{text:"Status"}), E("dd",{},[
        E("span",{class:"badge " + (pending ? "badge-warn" : "badge-ok"),text:res.status}) ]) ])
    ]),
    E("div",{class:"done-next"},[
      E("h4",{text:"What happens next"}),
      E("ol",{class:"done-list"},[
        E("li",{text:"A confirmation email is on its way, with the check-in code."}),
        E("li",{text: B.details.sms ? "A reminder text lands two hours before service." : "No reminder text was requested."}),
        E("li",{text:"Show the code at the host stand. We hold the table " + D.VENUE.noShowGraceMin + " minutes past the booking time."}),
        E("li",{text: res.allergy ? "Kitchen note recorded: " + res.allergy : "No allergies recorded. Tell the host if that changes." })
      ])
    ])
  ]);

  var qr = E("div",{class:"qr-block"},[
    E("p",{class:"label",text:"Check-in code"}),
    qrSvg(res.ref, 168),
    E("strong",{class:"mono qr-ref",text:res.ref}),
    E("p",{class:"hint",text:"This prototype draws a placeholder pattern derived from the reference string. It is not a scannable QR payload, the production system issues a real one."})
  ]);

  var actions = E("div",{class:"book-actions done-actions"},[
    E("button",{class:"btn btn-lg",type:"button",text:"Add to calendar",
      onclick:function(){ downloadIcs(res, t); }}),
    E("button",{class:"btn btn-ghost btn-lg",type:"button",text:"Manage booking",
      onclick:function(){ window.Guest._lastRef = res.ref; location.hash = "#/manage"; }}),
    E("button",{class:"btn btn-ghost btn-lg",type:"button",text:"Book another",
      onclick:function(){ location.hash = "#/home"; setTimeout(function(){ location.hash = "#/book"; }, 30); }})
  ]);

  host.appendChild(E("div",{class:"book-split done-split"},[
    E("div",{class:"stack"},[ card, actions, outboxPanel() ]),
    qr
  ]));
  confetti(host);
}

function outboxPanel(){
  var box = E("div",{class:"card card-2 stack out-panel"},[
    E("p",{class:"eyebrow",text:"Notifications sent"}),
    E("p",{class:"hint",text:"No mail server is attached to the prototype, so both messages are rendered here exactly as they were queued."})
  ]);
  if (B.sms){
    box.appendChild(E("div",{class:"sms-phone"},[
      E("div",{class:"sms-top"},[ E("span",{text:"Messages"}),
        E("span",{class:"mono",text:U.hhmm(B.sms.at)}) ]),
      E("div",{class:"sms-bubble"},[ E("p",{text:B.sms.body}) ]),
      E("p",{class:"sms-meta mono",text:"to " + B.sms.to})
    ]));
  }
  if (B.mail){
    box.appendChild(E("div",{class:"mail-prev"},[
      E("div",{class:"mail-head"},[
        E("div",{},[ E("b",{text:"Lumina Reservations"}), E("i",{text:"no-reply@lumina.test"}) ]),
        E("span",{class:"mono",text:U.hhmm(B.mail.at)})
      ]),
      E("p",{class:"mail-sub",text:B.mail.subject}),
      E("p",{class:"mail-to mono",text:"to " + B.mail.to}),
      E("pre",{class:"mail-body",text:B.mail.body})
    ]));
  }
  return box;
}

/* deterministic placeholder pattern, looks like a QR, is not one */
function qrSvg(seed, size){
  var N = 25, h = U.hash(seed) || 1, s = Math.abs(h) || 7;
  function rnd(){ s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox","0 0 " + N + " " + N);
  svg.setAttribute("width", size); svg.setAttribute("height", size);
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label","Check-in code pattern for reference " + seed + ", placeholder graphic");
  svg.setAttribute("class","qr-svg");
  function rect(x,y,w,hh,cls){
    var r = document.createElementNS(NS,"rect");
    r.setAttribute("x",x); r.setAttribute("y",y);
    r.setAttribute("width",w); r.setAttribute("height",hh);
    if (cls) r.setAttribute("class",cls);
    svg.appendChild(r);
  }
  rect(0,0,N,N,"qr-bg");
  function finder(fx, fy){
    rect(fx,fy,7,7,"qr-m"); rect(fx+1,fy+1,5,5,"qr-bg"); rect(fx+2,fy+2,3,3,"qr-m");
  }
  var x, y, inFinder;
  for (y=0;y<N;y++) for (x=0;x<N;x++){
    inFinder = (x<8 && y<8) || (x>N-9 && y<8) || (x<8 && y>N-9);
    if (inFinder) continue;
    if (rnd() < 0.46) rect(x,y,1,1,"qr-m");
  }
  finder(0,0); finder(N-7,0); finder(0,N-7);
  rect(N-9,N-9,5,5,"qr-m"); rect(N-8,N-8,3,3,"qr-bg"); rect(N-7,N-7,1,1,"qr-m");
  return svg;
}

function icsStamp(d){
  return d.getUTCFullYear() + U.pad(d.getUTCMonth()+1) + U.pad(d.getUTCDate()) + "T" +
    U.pad(d.getUTCHours()) + U.pad(d.getUTCMinutes()) + "00Z";
}
function downloadIcs(res, t){
  var lines = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Lumina Kitchen and Terrace//Reservations//EN",
    "CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
    "UID:" + res.ref + "@lumina.test",
    "DTSTAMP:" + icsStamp(new Date()),
    "DTSTART:" + icsStamp(res.startsAt),
    "DTEND:" + icsStamp(res.endsAt),
    "SUMMARY:Dinner at Lumina, table " + res.tableLabel,
    "LOCATION:" + D.VENUE.address,
    "DESCRIPTION:Reference " + res.ref + ". " + res.party + " guests in " + t.roomName +
      ". Table time " + res.turnMin + " minutes. Phone " + D.VENUE.phone + ".",
    "STATUS:" + (res.status === "pending" ? "TENTATIVE" : "CONFIRMED"),
    "END:VEVENT","END:VCALENDAR"
  ];
  var blob = new Blob([lines.join("\r\n")], { type:"text/calendar;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = E("a",{href:url,download:"lumina-" + res.ref + ".ics"});
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  U.toast("Calendar file downloaded","lumina-" + res.ref + ".ics","ok");
}

/* short confetti burst, skipped entirely under reduced motion */
function confetti(host){
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cv = E("canvas",{class:"confetti","aria-hidden":"true"});
  host.appendChild(cv);
  var w = cv.width = cv.offsetWidth || window.innerWidth;
  var h = cv.height = cv.offsetHeight || 420;
  var ctx = cv.getContext("2d");
  if (!ctx){ cv.remove(); return; }
  var cols = ["#E0A84E","#F0C77E","#5BBE7E","#6AA6D6","#F4EFE6"];
  var bits = [], i;
  for (i=0;i<90;i++) bits.push({
    x: w*0.5 + (Math.random()-0.5)*w*0.5, y: h*0.3 + Math.random()*40,
    vx: (Math.random()-0.5)*7, vy: -4 - Math.random()*8,
    s: 3 + Math.random()*5, r: Math.random()*6.28, vr: (Math.random()-0.5)*0.4,
    c: cols[i % cols.length], life: 1
  });
  var t0 = performance.now();
  function frame(t){
    var el = t - t0;
    ctx.clearRect(0,0,w,h);
    bits.forEach(function(b){
      b.vy += 0.22; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      b.life = Math.max(0, 1 - el/2400);
      ctx.save();
      ctx.globalAlpha = b.life;
      ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s/2, -b.s/2, b.s, b.s*0.6);
      ctx.restore();
    });
    if (el < 2400) requestAnimationFrame(frame);
    else cv.remove();
  }
  requestAnimationFrame(frame);
}
/* =====================================================================
   MANAGE
   ===================================================================== */
function findRes(code){
  var c = String(code||"").trim().toUpperCase(), i;
  if (!c) return null;
  for (i=0;i<D.RESERVATIONS.length;i++) if (D.RESERVATIONS[i].ref === c) return D.RESERVATIONS[i];
  return null;
}
function upcomingExamples(){
  var now = new Date();
  return D.RESERVATIONS.filter(function(r){
    return r.startsAt > now && (r.status === "confirmed" || r.status === "pending");
  }).sort(function(a,b){ return a.startsAt - b.startsAt; }).slice(0,3);
}

function manage(host){
  host.appendChild(E("section",{class:"manage-head"},[
    E("div",{class:"wrap"},[
      E("p",{class:"eyebrow reveal",text:"Self service"}),
      E("h1",{class:"reveal",text:"My booking"}),
      E("p",{class:"lede reveal d1",text:"No account needed. The reference code from your confirmation is the key."})
    ])
  ]));

  var wrap = E("div",{class:"wrap manage-body"});
  host.appendChild(wrap);

  var input = E("input",{class:"input mono",id:"mg-ref",placeholder:"LUM-XXXXXX",
    autocomplete:"off",spellcheck:"false",value: window.Guest._lastRef || ""});
  var err = E("p",{class:"err","aria-live":"assertive"});
  var panel = E("div",{class:"manage-panel"});

  function lookup(code){
    err.textContent = "";
    U.clear(panel);
    var res = findRes(code);
    if (!res){
      err.textContent = "No reservation found for \"" + String(code||"").trim() +
        "\". Check the code on your confirmation email, it looks like LUM-4F7KQ2.";
      panel.appendChild(E("div",{class:"card manage-miss"},[
        E("h3",{text:"Nothing matched that code"}),
        E("p",{class:"muted",text:"Codes are six characters after the LUM prefix. If the booking was made by phone, call " + D.VENUE.phone + " and the host stand can look it up."}),
        E("a",{class:"btn btn-ghost",href:"#/book",text:"Make a new booking"})
      ]));
      return;
    }
    input.value = res.ref;
    window.Guest._lastRef = res.ref;
    panel.appendChild(resCard(res, function(){ lookup(res.ref); }));
    U.observeReveals(panel);
  }

  var form = E("form",{class:"card manage-form",onsubmit:function(e){ e.preventDefault(); lookup(input.value); }},[
    E("div",{class:"manage-row"},[
      E("div",{class:"field grow"},[
        E("label",{class:"label",for:"mg-ref",text:"Reference code"}), input
      ]),
      E("button",{class:"btn btn-lg",type:"submit",text:"Find my booking"})
    ]),
    err,
    (function(){
      var ex = upcomingExamples();
      if (!ex.length) return null;
      var row = E("div",{class:"row manage-ex"},[ E("span",{class:"hint",text:"Try a real booking from the sample data:"}) ]);
      ex.forEach(function(r){
        row.appendChild(E("button",{class:"chip mono",type:"button",text:r.ref,
          "aria-label":"Look up " + r.ref + " for " + r.guest,
          onclick:function(){ input.value = r.ref; lookup(r.ref); }}));
      });
      return row;
    })()
  ]);
  wrap.appendChild(form);
  wrap.appendChild(panel);
  if (input.value) lookup(input.value);
}

function statusBadge(st){
  var cls = st === "confirmed" ? "badge-ok" : st === "pending" ? "badge-warn"
    : st === "seated" ? "badge-info" : st === "cancelled" || st === "no_show" ? "badge-crit" : "";
  return E("span",{class:"badge " + cls,text:st.replace("_"," ")});
}

function resCard(res, refresh){
  var t = tableById(res.tableId) || { roomName: "" };
  var dead = res.status === "cancelled" || res.status === "no_show" || res.status === "completed";
  var tl = E("ol",{class:"timeline"});
  res.history.slice(0).sort(function(a,b){ return a.at - b.at; }).forEach(function(h){
    tl.appendChild(E("li",{class:"tl-item"},[
      E("span",{class:"tl-dot","aria-hidden":"true"}),
      E("div",{},[
        E("b",{text: (h.from ? h.from.replace("_"," ") + " to " : "created as ") + h.to.replace("_"," ")}),
        E("i",{class:"mono",text:U.shortDate(h.at) + " " + U.hhmm(h.at) + " \u00b7 " + U.ago(h.at)}),
        E("em",{text:"by " + h.by})
      ])
    ]));
  });

  var card = E("div",{class:"card manage-card reveal"},[
    E("div",{class:"row-between manage-card-top"},[
      E("div",{},[
        E("p",{class:"eyebrow",text:"Reference"}),
        E("strong",{class:"mono manage-code",text:res.ref})
      ]),
      statusBadge(res.status)
    ]),
    E("h2",{class:"manage-name",text:res.guest}),
    E("dl",{class:"sum-dl manage-dl"},[
      E("div",{},[ E("dt",{text:"Table"}), E("dd",{text:res.tableLabel}) ]),
      E("div",{},[ E("dt",{text:"Room"}), E("dd",{text:t.roomName + " \u00b7 " + typeName(res.typeId)}) ]),
      E("div",{},[ E("dt",{text:"Date"}), E("dd",{text:U.longDate(res.startsAt)}) ]),
      E("div",{},[ E("dt",{text:"Time"}), E("dd",{class:"mono",text:U.hhmm(res.startsAt) + " to " + U.hhmm(res.endsAt)}) ]),
      E("div",{},[ E("dt",{text:"Guests"}), E("dd",{class:"mono",text:String(res.party)}) ]),
      E("div",{},[ E("dt",{text:"Table time"}), E("dd",{text:res.turnMin + " minutes plus " + D.BUFFER_MIN + " minute reset"}) ]),
      E("div",{},[ E("dt",{text:"Occasion"}), E("dd",{text:res.occasion || "None noted"}) ]),
      E("div",{},[ E("dt",{text:"Allergies"}), E("dd",{text:res.allergy || "None recorded"}) ]),
      E("div",{},[ E("dt",{text:"Request"}), E("dd",{text:res.request || "None"}) ]),
      E("div",{},[ E("dt",{text:"Booked via"}), E("dd",{text:res.source + ", " + U.ago(res.createdAt)}) ])
    ]),
    E("div",{class:"manage-actions"},
      dead
        ? [ E("p",{class:"hint",text:"This booking is " + res.status.replace("_"," ") + " and can no longer be changed."}),
            E("a",{class:"btn",href:"#/book",text:"Book a new table"}) ]
        : [ E("button",{class:"btn",type:"button",text:"Change party size or time",
              onclick:function(){ changeModal(res, refresh); }}),
            E("button",{class:"btn btn-danger",type:"button",text:"Cancel reservation",
              onclick:function(){ cancelModal(res, refresh); }}) ]
    ),
    E("div",{class:"manage-tl"},[ E("h4",{text:"Status history"}), tl ])
  ]);
  return card;
}

function changeModal(res, refresh){
  var off = Math.max(0, U.dayOffsetOf(res.startsAt));
  var state = { party:res.party, off:off, slot:res.slotMin, table:null };
  var out = E("output",{class:"mono",text:String(state.party)});
  var pills = E("div",{class:"pills"});
  var note = E("p",{class:"hint","aria-live":"polite"});
  var save = E("button",{class:"btn",type:"button",text:"Save the change"});

  function rebuild(){
    out.textContent = String(state.party);
    U.clear(pills);
    var any = false;
    D.slotList().forEach(function(s){
      var a = D.availability(state.off, s, state.party, res.typeId, res.id);
      var n = a.tables ? a.tables.length : 0;
      if (n) any = true;
      var inp = E("input",{type:"radio",name:"mgslot",value:String(s),
        checked: s===state.slot ? true : null, disabled: n ? null : true,
        "aria-label": D.hhmm(s) + ", " + (n ? n + " tables free" : "unavailable"),
        onchange:function(){ state.slot = parseInt(this.value,10); rebuild(); }});
      pills.appendChild(E("label",{class:"pill" + (n ? "" : " is-gone")},[
        inp, E("span",{class:"mono",text:D.hhmm(s)})
      ]));
    });
    var a2 = D.availability(state.off, state.slot, state.party, res.typeId, res.id);
    state.table = a2.tables && a2.tables.length ? a2.tables[0] : null;
    if (!any){
      note.textContent = "Nothing fits " + state.party + " guests in " + typeName(res.typeId) +
        " on " + U.longDate(D.atMin(state.off,0)) + ". Try another date.";
    } else if (!state.table){
      note.textContent = D.hhmm(state.slot) + " is not available for " + state.party +
        " guests. Pick a time that is not struck through.";
    } else {
      note.textContent = "We would move you to table " + state.table.label + " in " +
        state.table.roomName + ", " + D.hhmm(state.slot) + ", table time " +
        D.turnFor(state.party) + " minutes.";
    }
    save.disabled = !state.table;
  }

  var dateIn = E("input",{class:"input",type:"date",id:"mg-date",
    value:U.isoDate(D.atMin(state.off,0)), min:U.isoDate(D.startOfToday()),
    max:U.isoDate(D.atMin(30,0)),
    onchange:function(){
      state.off = Math.max(0, Math.min(30, U.dayOffsetOf(U.fromIso(this.value))));
      this.value = U.isoDate(D.atMin(state.off,0));
      rebuild();
    }});

  var body = E("div",{class:"stack"},[
    E("div",{class:"field"},[
      E("span",{class:"label",id:"mg-party-l",text:"Guests"}),
      E("div",{class:"stepper",role:"group","aria-labelledby":"mg-party-l"},[
        E("button",{type:"button","aria-label":"Fewer guests",text:"\u2212",
          onclick:function(){ state.party = Math.max(1, state.party-1); rebuild(); }}),
        out,
        E("button",{type:"button","aria-label":"More guests",text:"+",
          onclick:function(){ state.party = Math.min(16, state.party+1); rebuild(); }})
      ])
    ]),
    E("div",{class:"field"},[ E("label",{class:"label",for:"mg-date",text:"Date"}), dateIn ]),
    E("div",{class:"field"},[ E("span",{class:"label",text:"Time"}), pills ]),
    note,
    E("p",{class:"hint",text:"Your current table is excluded from the clash check, so your own booking never blocks the move."})
  ]);

  var m = U.modal({ title:"Change " + res.ref, body:body, actions:[ save,
    E("button",{class:"btn btn-ghost",type:"button",text:"Keep as it is",onclick:function(){ m.close(); }}) ]});

  save.addEventListener("click", function(){
    if (!state.table) return;
    var fromTxt = U.shortDate(res.startsAt) + " " + U.hhmm(res.startsAt) + ", " + res.party + " guests";
    var starts = D.atMin(state.off, state.slot);
    var turn = D.turnFor(state.party);
    res.party = state.party; res.covers = state.party;
    res.slotMin = state.slot; res.turnMin = turn;
    res.startsAt = starts;
    res.endsAt = new Date(starts.getTime() + turn*60000);
    res.blocksUntil = new Date(res.endsAt.getTime() + D.BUFFER_MIN*60000);
    res.tableId = state.table.id; res.tableLabel = state.table.label;
    res.roomId = state.table.roomId; res.typeId = state.table.typeId;
    res.history.push({ at:new Date(), from:res.status, to:res.status + " (moved)", by:"guest" });
    D.send("email", res.email, "Lumina reservation " + res.ref + " moved",
      "Your booking moved from " + fromTxt + " to " + U.longDate(starts) + " at " + D.hhmm(state.slot) +
      ", " + state.party + " guests, table " + state.table.label + " in " + state.table.roomName + ".");
    U.toast("Booking moved", state.table.label + " at " + D.hhmm(state.slot), "ok");
    m.close();
    refresh();
  });
  rebuild();
}

function cancelModal(res, refresh){
  var top = D.WAITLIST.filter(function(w){ return w.status === "waiting"; })
    .sort(function(a,b){ return a.rank - b.rank; })[0];
  var body = E("div",{class:"stack"},[
    E("p",{class:"muted",text:"Cancelling releases table " + res.tableLabel + " on " +
      U.longDate(res.startsAt) + " at " + U.hhmm(res.startsAt) + " for " + res.party +
      (res.party===1?" guest":" guests") + ". This cannot be undone from this page."}),
    top
      ? E("div",{class:"notice notice-accent"},[
          E("b",{text:"Waitlist promotion"}),
          E("p",{text:"The freed table is offered first to " + top.guest + ", rank " + top.rank +
            " on tonight's waitlist, party of " + top.party + " wanting " + D.hhmm(top.wantedSlot) +
            " in " + typeName(top.typeId) + ". They get a text and thirty minutes to accept."})
        ])
      : E("p",{class:"hint",text:"The waitlist is empty, so the table goes straight back to general availability."})
  ]);
  var m = U.modal({ title:"Cancel " + res.ref, body:body, actions:[
    E("button",{class:"btn btn-danger",type:"button",text:"Yes, cancel the booking",onclick:function(){
      res.history.push({ at:new Date(), from:res.status, to:"cancelled", by:"guest" });
      res.status = "cancelled";
      D.send("email", res.email, "Lumina reservation " + res.ref + " cancelled",
        "Your booking for " + U.longDate(res.startsAt) + " at " + U.hhmm(res.startsAt) +
        " has been cancelled. The table has been released. Nothing was charged.");
      if (top){
        D.send("sms", top.phone, "Lumina",
          "Lumina: a table for " + top.party + " just opened at " + D.hhmm(top.wantedSlot) +
          ". Reply YES in the next 30 minutes to take it.");
      }
      U.toast("Reservation cancelled", res.ref + " released" + (top ? ", " + top.guest + " notified" : ""), "crit");
      m.close();
      refresh();
    }}),
    E("button",{class:"btn btn-ghost",type:"button",text:"Keep my table",onclick:function(){ m.close(); }})
  ]});
}
window.Guest = { home:home, menu:menu, book:book, manage:manage, _pending:null, _lastRef:null };
})();
