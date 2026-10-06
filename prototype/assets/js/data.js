/* Lumina Kitchen & Terrace - seeded sample data.
   Everything is generated relative to today so every screen looks alive. */
(function(){
"use strict";

/* deterministic RNG so a refresh reproduces the same service */
let _s = 20260404;
function rnd(){ _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; }
function pick(a){ return a[Math.floor(rnd()*a.length)]; }
function int(a,b){ return a + Math.floor(rnd()*(b-a+1)); }

const VENUE = {
  name:"Lumina", suffix:"Kitchen & Terrace",
  tagline:"Coastal fire cooking, eleven courses of smoke and citrus.",
  address:"Lipa City, Batangas, Philippines",
  phone:"+63 2 8891 4420",
  chef:"Chef Ilaria Moreno",
  hours:"Tue-Sun, 17:30 - 23:30 (last seating 21:45)",
  slotMinutes:15, holdSeconds:600, noShowGraceMin:20
};

const ROOM_TYPES = [
  { id:"vip", name:"VIP Rooms", blurb:"Private suites with a dedicated host, tasting-menu service and a sealed door.",
    minParty:2, maxParty:10, minSpend:6500, badge:"Minimum spend", lead:"48h notice",
    accent:"#E0A84E", img:"vip",
    perks:["Dedicated host","Sommelier pairing","Private entrance","Deposit required"] },
  { id:"common", name:"Main Dining", blurb:"The open room. Hearth in the centre, every table within sight of the fire.",
    minParty:1, maxParty:4, minSpend:0, badge:"No minimum", lead:"Same day",
    accent:"#6AA6D6", img:"common",
    perks:["Hearth view","Walk-ins welcome","90 minute turn","À la carte"] },
  { id:"group", name:"Group Tables", blurb:"Long communal oak for six and up. Family service, shared plates.",
    minParty:5, maxParty:16, minSpend:3200, badge:"Manager approval over 12", lead:"24h notice",
    accent:"#5BBE7E", img:"group",
    perks:["Shared plates","Set menu option","120 minute turn","Split billing"] },
  { id:"terrace", name:"Terrace & Bar", blurb:"Open-air counter over the harbour. Smoke, brine, and the last of the light.",
    minParty:1, maxParty:6, minSpend:0, badge:"Weather dependent", lead:"Same day",
    accent:"#C084FC", img:"terrace",
    perks:["Harbour view","Bar snacks","Heaters provided","First-come seating"] }
];

/* ---- rooms + tables on a 1000 x 700 virtual floor ---- */
const ROOMS = [
  { id:"r_vip",     typeId:"vip",     name:"Suites",      x:40,  y:40,  w:280, h:300 },
  { id:"r_common",  typeId:"common",  name:"Main Dining", x:350, y:40,  w:430, h:420 },
  { id:"r_group",   typeId:"group",   name:"The Long Room", x:40, y:370, w:280, h:290 },
  { id:"r_terrace", typeId:"terrace", name:"Terrace",     x:810, y:40,  w:150, h:620 }
];

const TABLES = [
  /* VIP suites - round, large */
  { id:"V1", roomId:"r_vip", label:"Suite 1", min:2, max:6,  shape:"round",  x:110, y:110, r:42 },
  { id:"V2", roomId:"r_vip", label:"Suite 2", min:4, max:10, shape:"round",  x:240, y:130, r:50 },
  { id:"V3", roomId:"r_vip", label:"Suite 3", min:2, max:4,  shape:"round",  x:105, y:255, r:36 },
  { id:"V4", roomId:"r_vip", label:"Suite 4", min:4, max:8,  shape:"round",  x:243, y:272, r:45 },
  /* Main dining - squares and rects, hearth in the middle */
  { id:"C1", roomId:"r_common", label:"12", min:1, max:2, shape:"square", x:400, y:95,  w:52, h:52 },
  { id:"C2", roomId:"r_common", label:"14", min:1, max:2, shape:"square", x:480, y:95,  w:52, h:52 },
  { id:"C3", roomId:"r_common", label:"16", min:2, max:4, shape:"square", x:575, y:95,  w:66, h:62 },
  { id:"C4", roomId:"r_common", label:"18", min:2, max:4, shape:"square", x:683, y:95,  w:66, h:62 },
  { id:"C5", roomId:"r_common", label:"20", min:1, max:2, shape:"square", x:400, y:195, w:52, h:52 },
  { id:"C6", roomId:"r_common", label:"22", min:2, max:4, shape:"square", x:480, y:190, w:66, h:62 },
  { id:"C7", roomId:"r_common", label:"24", min:2, max:4, shape:"square", x:683, y:190, w:66, h:62 },
  { id:"C8", roomId:"r_common", label:"26", min:1, max:2, shape:"square", x:400, y:295, w:52, h:52 },
  { id:"C9", roomId:"r_common", label:"28", min:2, max:4, shape:"square", x:480, y:290, w:66, h:62 },
  { id:"C10",roomId:"r_common", label:"30", min:2, max:4, shape:"square", x:683, y:290, w:66, h:62 },
  { id:"C11",roomId:"r_common", label:"32", min:2, max:4, shape:"rect",   x:565, y:380, w:96, h:54 },
  { id:"C12",roomId:"r_common", label:"34", min:2, max:4, shape:"rect",   x:415, y:380, w:96, h:54 },
  /* Group - long communal */
  { id:"G1", roomId:"r_group", label:"Long A", min:5, max:10, shape:"rect", x:90,  y:430, w:180, h:58, joinable:true },
  { id:"G2", roomId:"r_group", label:"Long B", min:5, max:10, shape:"rect", x:90,  y:530, w:180, h:58, joinable:true },
  { id:"G3", roomId:"r_group", label:"Oak",    min:6, max:16, shape:"rect", x:90,  y:620, w:180, h:48 },
  /* Terrace - bar counter + small */
  { id:"T1", roomId:"r_terrace", label:"B1", min:1, max:2, shape:"square", x:860, y:100, w:48, h:48 },
  { id:"T2", roomId:"r_terrace", label:"B2", min:1, max:2, shape:"square", x:860, y:175, w:48, h:48 },
  { id:"T3", roomId:"r_terrace", label:"B3", min:2, max:4, shape:"square", x:860, y:255, w:60, h:56 },
  { id:"T4", roomId:"r_terrace", label:"B4", min:2, max:4, shape:"square", x:860, y:345, w:60, h:56 },
  { id:"T5", roomId:"r_terrace", label:"B5", min:2, max:6, shape:"rect",   x:845, y:440, w:92, h:56 },
  { id:"T6", roomId:"r_terrace", label:"B6", min:1, max:2, shape:"square", x:860, y:540, w:48, h:48 }
];
TABLES.forEach(function(t){
  const rm = ROOMS.find(function(x){ return x.id===t.roomId; });
  t.typeId = rm.typeId; t.roomName = rm.name;
  t.priority = t.typeId==="vip" ? 3 : t.typeId==="group" ? 2 : 1;
});

/* ---- turn times by party size (minutes) + buffer ---- */
const TURN_TIMES = [
  { upTo:2,  minutes:75  }, { upTo:4,  minutes:90  },
  { upTo:6,  minutes:105 }, { upTo:10, minutes:120 }, { upTo:99, minutes:150 }
];
const BUFFER_MIN = 15;
function turnFor(p){ for (const t of TURN_TIMES) if (p<=t.upTo) return t.minutes; return 150; }

/* ---- menu ---- */
const MENU = [
  /* snacks */
  {id:1, cat:"snacks", name:"Charred Oyster, Burnt Lime", price:180, kcal:90,  station:"cold",  desc:"Local oyster over embers, lime ash, finger chilli.", tags:["shellfish"], img:"oyster", pop:92},
  {id:2, cat:"snacks", name:"Smoked Taro Crisp", price:140, kcal:210, station:"fry", desc:"Taro, coconut vinegar, kalamansi salt.", tags:["vegan"], img:"taro", pop:71},
  {id:3, cat:"snacks", name:"Pandesal, Cultured Butter", price:160, kcal:320, station:"cold", desc:"Overnight sourdough pandesal, seaweed butter.", tags:["vegetarian","gluten"], img:"bread", pop:88},
  {id:4, cat:"snacks", name:"Tuna Tartare Tostada", price:290, kcal:240, station:"cold", desc:"Yellowfin, green mango, coconut cream, crisp masa.", tags:["fish"], img:"tartare", pop:84},
  /* raw */
  {id:5, cat:"raw", name:"Kinilaw of the Day", price:420, kcal:260, station:"cold", desc:"Line-caught fish, cane vinegar, ginger flower, chilli oil.", tags:["fish","signature"], img:"kinilaw", pop:96},
  {id:6, cat:"raw", name:"Scallop, Calamansi Snow", price:460, kcal:190, station:"cold", desc:"Hand-dived scallop, frozen calamansi, nasturtium.", tags:["shellfish"], img:"scallop", pop:78},
  {id:7, cat:"raw", name:"Heirloom Tomato, Aged Ube Vinegar", price:340, kcal:150, station:"cold", desc:"Three tomatoes, ube vinegar aged eight months, basil ash.", tags:["vegan"], img:"tomato", pop:64},
  {id:8, cat:"raw", name:"Beef Tataki, Burnt Onion Dashi", price:520, kcal:310, station:"cold", desc:"Seared wagyu cap, onion dashi, pickled shallot.", tags:["beef"], img:"tataki", pop:81},
  /* fire */
  {id:9,  cat:"fire", name:"Whole Lapu-Lapu, Coconut Embers", price:1480, kcal:720, station:"grill", desc:"Whole grouper buried in coconut husk coals, forty minutes. For two.", tags:["fish","signature","for two"], img:"grouper", pop:99},
  {id:10, cat:"fire", name:"Dry-Aged Duck, Honey Lacquer", price:980, kcal:810, station:"grill", desc:"Twenty-one day aged duck, wild honey, charred citrus.", tags:["poultry","signature"], img:"duck", pop:94},
  {id:11, cat:"fire", name:"Pork Belly, Sugarcane Glaze", price:720, kcal:950, station:"grill", desc:"Twelve-hour belly, sugarcane, pickled papaya.", tags:["pork"], img:"belly", pop:89},
  {id:12, cat:"fire", name:"Hearth Cabbage, Smoked Bagoong", price:380, kcal:280, station:"grill", desc:"Whole cabbage in the embers, fermented shrimp cream, dill.", tags:["shellfish"], img:"cabbage", pop:73},
  {id:13, cat:"fire", name:"Bone Marrow, Garlic Rice Crumb", price:540, kcal:880, station:"grill", desc:"Split marrow, toasted garlic rice, herb salad.", tags:["beef"], img:"marrow", pop:86},
  {id:14, cat:"fire", name:"Grilled Squid, Ink Aioli", price:610, kcal:420, station:"grill", desc:"Whole squid over flame, its own ink, burnt lemon.", tags:["shellfish"], img:"squid", pop:77},
  {id:15, cat:"fire", name:"Lamb Ribs, Tamarind Lacquer", price:890, kcal:1020, station:"grill", desc:"Slow ribs, tamarind, toasted coriander, mint.", tags:["lamb"], img:"lamb", pop:75},
  /* comfort */
  {id:16, cat:"comfort", name:"Smoked Chicken Adobo", price:620, kcal:740, station:"hot", desc:"Free-range chicken, coconut vinegar, soy, bay, served dark.", tags:["poultry","signature"], img:"adobo", pop:97},
  {id:17, cat:"comfort", name:"Kare-Kare Oxtail", price:840, kcal:1100, station:"hot", desc:"Oxtail, peanut, annatto, banana heart, bagoong.", tags:["beef","nuts","shellfish"], img:"karekare", pop:90},
  {id:18, cat:"comfort", name:"Sinigang, Watermelon & Tuna Belly", price:680, kcal:480, station:"hot", desc:"Tamarind broth, watermelon, charred tuna belly.", tags:["fish"], img:"sinigang", pop:83},
  {id:19, cat:"comfort", name:"Laing Risotto, Crab Fat", price:590, kcal:690, station:"hot", desc:"Taro leaf, coconut, crab fat, calamansi zest.", tags:["shellfish"], img:"laing", pop:80},
  {id:20, cat:"comfort", name:"Pancit of Charred Leeks", price:430, kcal:560, station:"hot", desc:"Hand-pulled noodles, leek ash, soy butter.", tags:["vegetarian","gluten"], img:"pancit", pop:68},
  {id:21, cat:"comfort", name:"Garlic Rice, Hearth Butter", price:180, kcal:420, station:"hot", desc:"Day-old rice, confit garlic, smoked butter.", tags:["vegetarian"], img:"rice", pop:91},
  {id:22, cat:"comfort", name:"Charred Greens, Anchovy Cream", price:290, kcal:240, station:"hot", desc:"Seasonal greens, anchovy, lemon, cracked pepper.", tags:["fish"], img:"greens", pop:62},
  /* sweet */
  {id:23, cat:"sweet", name:"Burnt Coconut Leche Flan", price:280, kcal:480, station:"pastry", desc:"Caramel taken to the edge, coconut cream, sea salt.", tags:["vegetarian","dairy","signature"], img:"flan", pop:95},
  {id:24, cat:"sweet", name:"Ube Soufflé, Calamansi Curd", price:340, kcal:520, station:"pastry", desc:"Purple yam soufflé, calamansi curd. Twenty minutes.", tags:["vegetarian","dairy","eggs"], img:"souffle", pop:87},
  {id:25, cat:"sweet", name:"Mango, Sticky Rice Ice Cream", price:260, kcal:390, station:"pastry", desc:"Carabao mango, toasted rice ice cream, coconut tuile.", tags:["vegetarian","dairy"], img:"mango", pop:85},
  {id:26, cat:"sweet", name:"Cacao Tart, Barako Cream", price:310, kcal:610, station:"pastry", desc:"Single-origin Davao cacao, Barako coffee cream.", tags:["vegetarian","dairy","gluten"], img:"tart", pop:79},
  {id:27, cat:"sweet", name:"Pandan Halo-Halo", price:290, kcal:440, station:"pastry", desc:"Shaved ice, pandan, nine components, served to share.", tags:["vegetarian","dairy"], img:"halohalo", pop:82},
  /* drinks */
  {id:28, cat:"drinks", name:"Smoked Calamansi Highball", price:420, kcal:180, station:"bar", desc:"Rum, smoked calamansi, soda, pandan oil.", tags:["alcohol","signature"], img:"highball", pop:93},
  {id:29, cat:"drinks", name:"Tamarind Negroni", price:480, kcal:220, station:"bar", desc:"Gin, tamarind vermouth, bitter orange.", tags:["alcohol"], img:"negroni", pop:76},
  {id:30, cat:"drinks", name:"Lambanog Old Fashioned", price:460, kcal:210, station:"bar", desc:"Coconut spirit, muscovado, cacao bitters.", tags:["alcohol"], img:"oldfash", pop:74},
  {id:31, cat:"drinks", name:"Pineapple Tepache, No Alcohol", price:220, kcal:90, station:"bar", desc:"Fermented pineapple, chilli, lime. Zero proof.", tags:["zero proof"], img:"tepache", pop:70},
  {id:32, cat:"drinks", name:"Pandan Iced Tea", price:180, kcal:60, station:"bar", desc:"Cold-brewed pandan, jasmine, calamansi. Zero proof.", tags:["zero proof"], img:"icedtea", pop:66},
  {id:33, cat:"drinks", name:"Barako Espresso", price:160, kcal:10, station:"bar", desc:"Liberica from Batangas, pulled short.", tags:["zero proof"], img:"espresso", pop:72},
  /* tasting */
  {id:34, cat:"tasting", name:"Eleven Courses of Smoke & Citrus", price:3800, kcal:1900, station:"grill", desc:"The full progression. Two and a half hours. Whole table only.", tags:["signature","whole table"], img:"tasting11", pop:98},
  {id:35, cat:"tasting", name:"Seven Courses, Hearth", price:2400, kcal:1400, station:"grill", desc:"The shorter road through the fire. Ninety minutes.", tags:["whole table"], img:"tasting7", pop:91},
  {id:36, cat:"tasting", name:"Wine Pairing, Five Glasses", price:1900, kcal:520, station:"bar", desc:"Chosen the morning of service. Low intervention.", tags:["alcohol"], img:"pairing", pop:88}
];

const CATS = [
  { id:"snacks",  name:"Opening Bites",  note:"Served at the counter while you settle" },
  { id:"raw",     name:"Raw & Cured",    note:"Cold larder, dressed to order" },
  { id:"fire",    name:"From the Hearth",note:"Everything here meets flame" },
  { id:"comfort", name:"The Kitchen",    note:"Dishes we grew up on, taken seriously" },
  { id:"sweet",   name:"Sweet",          note:"Pastry section, Chef Reyes" },
  { id:"drinks",  name:"Bar",            note:"Zero-proof marked, ask the bar" },
  { id:"tasting", name:"Tasting Menus",  note:"Whole table, book 48 hours ahead" }
];

/* ---- people ---- */
const STAFF = [
  { id:"u1", name:"Ilaria Moreno",  role:"owner",   email:"ilaria@lumina.test",  pin:"Executive chef and owner" },
  { id:"u2", name:"Diego Salcedo",  role:"manager", email:"diego@lumina.test",   pin:"Service manager, approves group bookings" },
  { id:"u3", name:"Mika Tanaka",    role:"host",    email:"mika@lumina.test",    pin:"Front of house, seats and times the room" },
  { id:"u4", name:"Paolo Reyes",    role:"kitchen", email:"paolo@lumina.test",   pin:"Pastry, runs the sweet station" },
  { id:"u5", name:"Ana Villaruel",  role:"waiter",  email:"ana@lumina.test",     pin:"Terrace section" }
];

const FIRST = ["Maya","Teodoro","Celine","Rafael","Noor","Jun","Beatriz","Emil","Sofia","Luis","Hana","Marco",
  "Divina","Kenji","Clara","Ramon","Priya","Tomas","Iris","Gabriel","Lena","Arturo","Yuki","Nadia","Felix",
  "Camila","Ibrahim","Rosa","Dmitri","Elena","Samuel","Thea","Olivier","Mei","Andres"];
const LAST = ["Alvarez","Okafor","Bautista","Lim","Haddad","Nakamura","Cruz","Fischer","Moreau","Delgado",
  "Santos","Rossi","Abad","Yamada","Novak","Garcia","Sharma","Silva","Keller","Mendoza","Weiss","Tan",
  "Ferrer","Ocampo","Vidal","Castro","Reyes","Park","Dizon","Lagman"];

const OCCASIONS = ["","","","Birthday","Anniversary","Business dinner","Date night","Celebration","First visit"];
const REQUESTS = ["","","","Quiet corner if possible","Celebrating, candle on the dessert please",
  "Wheelchair access needed","Arriving 10 minutes late, please hold",
  "Would love the hearth-side table","High chair for a toddler","Window seat if free"];
const ALLERGENS = ["","","","","Shellfish allergy, severe","No peanuts","Gluten intolerant",
  "Dairy free","Vegetarian in party of 4","Pork restriction, religious"];

/* ---- time helpers ---- */
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function atMin(dayOffset, mins){
  const d = startOfToday(); d.setDate(d.getDate()+dayOffset); d.setMinutes(mins); return d;
}
const SERVICE_OPEN = 17*60 + 30;   /* 17:30 */
const SERVICE_LAST = 21*60 + 45;   /* 21:45 last seating */
const SERVICE_CLOSE= 23*60 + 30;

function slotList(){
  const out=[]; for(let m=SERVICE_OPEN;m<=SERVICE_LAST;m+=VENUE.slotMinutes) out.push(m); return out;
}
function hhmm(mins){
  const h=Math.floor(mins/60), m=mins%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

/* ---- generate reservations across past / today / future ---- */
const STATUSES_PAST = ["completed","completed","completed","completed","completed","no_show","cancelled"];
let resSeq = 4100;
const RESERVATIONS = [];

function ref(){
  const A="ACDEFGHJKLMNPQRSTUVWXYZ2346789";
  let s=""; for(let i=0;i<6;i++) s+=A[Math.floor(rnd()*A.length)];
  return "LUM-"+s;
}

/* a table is only occupied by pending, confirmed or seated bookings.
   cancelled, no_show and completed free the table, so they may legitimately overlap
   a later booking on the same table. */
function occupied(tableId, starts, blocks){
  return RESERVATIONS.some(function(r){
    if (r.tableId!==tableId) return false;
    if (["pending","confirmed","seated"].indexOf(r.status)<0) return false;
    return starts < r.blocksUntil && blocks > r.startsAt;
  });
}

function makeRes(dayOffset, slotMin, table, party, status){
  const starts = atMin(dayOffset, slotMin);
  const turn = turnFor(party);
  const ends = new Date(starts.getTime() + turn*60000);
  const blocks = new Date(ends.getTime() + BUFFER_MIN*60000);
  /* never seed a double-book: the whole point of the system is that this cannot happen */
  if (["pending","confirmed","seated"].indexOf(status)>=0 && occupied(table.id, starts, blocks)) return null;
  const guest = pick(FIRST)+" "+pick(LAST);
  const r = {
    id: ++resSeq, ref: ref(), guest: guest,
    phone:"+63 9"+int(10,99)+" "+int(100,999)+" "+int(1000,9999),
    email: guest.toLowerCase().replace(/[^a-z]/g,".")+"@mail.test",
    party: party, tableId: table.id, tableLabel: table.label,
    roomId: table.roomId, typeId: table.typeId,
    startsAt: starts, endsAt: ends, blocksUntil: blocks,
    slotMin: slotMin, turnMin: turn, status: status,
    occasion: pick(OCCASIONS), request: pick(REQUESTS), allergy: pick(ALLERGENS),
    createdAt: new Date(starts.getTime() - int(2,600)*60000*24),
    source: pick(["web","web","web","phone","walk-in"]),
    covers: party, spend: 0, history:[]
  };
  r.spend = Math.round(party * int(900, 2600) / 10) * 10;
  r.history.push({ at:r.createdAt, from:null, to:"pending", by:r.source==="web"?"guest":"host Mika" });
  if (status!=="pending" && status!=="waitlisted")
    r.history.push({ at:new Date(r.createdAt.getTime()+120000), from:"pending", to:"confirmed", by:"system" });
  if (status==="seated"||status==="completed")
    r.history.push({ at:starts, from:"confirmed", to:"seated", by:"host Mika" });
  if (status==="completed")
    r.history.push({ at:ends, from:"seated", to:"completed", by:"host Mika" });
  if (status==="no_show")
    r.history.push({ at:new Date(starts.getTime()+VENUE.noShowGraceMin*60000), from:"confirmed", to:"no_show", by:"system" });
  if (status==="cancelled")
    r.history.push({ at:new Date(starts.getTime()-int(1,48)*3600000), from:"confirmed", to:"cancelled", by:"guest" });
  RESERVATIONS.push(r);
  return r;
}

/* try random table + slot combinations until one does not clash */
function seedOne(dayOffset, statusFn, tries){
  for (let k=0;k<(tries||14);k++){
    const t = pick(TABLES);
    const slot = pick(slotList());
    const p = int(t.min, t.max);
    const r = makeRes(dayOffset, slot, t, p, statusFn(slot, p, t));
    if (r) return r;
  }
  return null;
}

/* past 21 days */
for (let d=-21; d<0; d++){
  const n = int(16, 30);
  for (let i=0;i<n;i++) seedOne(d, function(){ return pick(STATUSES_PAST); });
}
/* today - a believable service with a few seated right now */
(function today(){
  const nowMin = new Date().getHours()*60 + new Date().getMinutes();
  for (let i=0;i<40;i++){
    seedOne(0, function(slot, p){
      const end = slot + turnFor(p);
      if (end < nowMin) return rnd()<0.1 ? "no_show" : "completed";
      if (slot <= nowMin && end >= nowMin) return "seated";
      return rnd()<0.08 ? "cancelled" : (rnd()<0.2 ? "pending" : "confirmed");
    });
  }
  /* guarantee a handful of parties are seated right now so the kitchen screen and the
     floor plan are never empty, whatever time of day the prototype is opened */
  if (!RESERVATIONS.some(function(r){ return r.status==="seated"; })){
    const anchor = Math.max(SERVICE_OPEN, Math.min(SERVICE_LAST, Math.floor(nowMin/15)*15));
    let made = 0;
    for (let k=0;k<TABLES.length && made<6;k++){
      const t = TABLES[k];
      const p = int(t.min, t.max);
      const slot = anchor - 15*(made%3);
      const r = makeRes(0, slot, t, p, "seated");
      if (r){
        /* pull the window around the real clock so elapsed time looks plausible */
        const nowD = new Date();
        r.startsAt = new Date(nowD.getTime() - (10 + made*7)*60000);
        r.endsAt = new Date(r.startsAt.getTime() + r.turnMin*60000);
        r.blocksUntil = new Date(r.endsAt.getTime() + BUFFER_MIN*60000);
        made++;
      }
    }
  }
})();
/* next 30 days */
for (let d=1; d<=30; d++){
  const n = d<=7 ? int(18,30) : int(6,16);
  for (let i=0;i<n;i++) seedOne(d, function(){ return rnd()<0.18 ? "pending" : "confirmed"; });
}

/* waitlist for tonight */
const WAITLIST = [];
for (let i=0;i<4;i++){
  const guest = pick(FIRST)+" "+pick(LAST);
  WAITLIST.push({
    id:"w"+(i+1), rank:i+1, guest:guest,
    phone:"+63 9"+int(10,99)+" "+int(100,999)+" "+int(1000,9999),
    party:int(2,6), typeId:pick(["common","common","terrace","vip"]),
    wantedSlot:pick([19*60, 19*60+30, 20*60, 20*60+30]),
    addedAt:new Date(Date.now()-int(5,90)*60000),
    status:"waiting", notifiedAt:null
  });
}

/* blackout dates */
const BLACKOUTS = [
  { date: atMin(9, 0),  scope:"venue",     label:"Private buyout - Alvarez wedding" },
  { date: atMin(14, 0), scope:"room_type", typeId:"terrace", label:"Terrace closed, typhoon signal" },
  { date: atMin(23, 0), scope:"venue",     label:"Staff training, kitchen closed" }
];

/* ---- live kitchen tickets, derived from seated reservations ---- */
const SEATED = RESERVATIONS.filter(function(r){ return r.status==="seated"; });
const TICKET_STATES = ["QUEUED","PREPARING","READY","SERVED","HELD"];
let tkSeq = 180;
const TICKETS = [];
(function buildTickets(){
  /* seated parties first, then topped up from confirmed bookings, so the grid always
     shows the full aging spread from ON TIME through CRITICAL */
  const pool = SEATED.concat(
    RESERVATIONS.filter(function(r){ return r.status==="confirmed"; })
  ).slice(0, 9);
  pool.forEach(function(r, idx){
    const items=[]; const nItems = int(2, 5);
    for (let i=0;i<nItems;i++){
      const m = pick(MENU.filter(function(x){ return x.cat!=="drinks"; }));
      if (items.some(function(it){ return it.menuId===m.id; })) continue;
      items.push({
        menuId:m.id, name:m.name, qty: rnd()<0.25 ? 2 : 1, station:m.station,
        course: m.cat==="snacks"||m.cat==="raw" ? 1 : m.cat==="sweet" ? 3 : 2,
        mods: rnd()<0.42 ? [pick(["no chilli","extra char","sauce on side","half portion",
          "split two plates","no coriander","well done"])] : [],
        done:false
      });
    }
    /* aging spread so every colour band shows on screen */
    const ageMin = [1, 3, 6, 8, 11, 13, 16, 19, 2][idx] + rnd();
    const fired = new Date(Date.now() - ageMin*60000);
    const st = idx===8 ? "HELD" : ageMin>15 ? "PREPARING" : ageMin>10 ? "PREPARING"
      : ageMin>6 ? (rnd()<0.5?"PREPARING":"READY") : "QUEUED";
    TICKETS.push({
      id: ++tkSeq, no:"#"+(tkSeq), resId:r.id, tableLabel:r.tableLabel, roomId:r.roomId,
      party:r.party, guest:r.guest, allergy:r.allergy, orderType: r.typeId==="vip" ? "VIP SUITE"
        : r.typeId==="group" ? "GROUP" : r.typeId==="terrace" ? "TERRACE" : "DINE IN",
      firedAt: fired, state: st, items: items,
      events:[{at:fired, to:"QUEUED", by:"system"}]
    });
  });
  /* a couple of recalled / served for the recall drawer */
  for (let i=0;i<3;i++){
    const r = pick(RESERVATIONS.filter(function(x){return x.status==="completed";}));
    TICKETS.push({
      id: ++tkSeq, no:"#"+tkSeq, resId:r.id, tableLabel:r.tableLabel, roomId:r.roomId,
      party:r.party, guest:r.guest, allergy:"", orderType:"DINE IN",
      firedAt:new Date(Date.now()-int(22,50)*60000), state:"SERVED",
      items:[{menuId:21,name:"Garlic Rice, Hearth Butter",qty:1,station:"hot",course:2,mods:[],done:true}],
      events:[]
    });
  }
})();

/* ---- derived helpers exposed to the app ---- */
function occupyingStatuses(){ return ["pending","confirmed","seated"]; }

function tableStatusAt(tableId, when){
  const t = when || new Date();
  const hit = RESERVATIONS.find(function(r){
    return r.tableId===tableId && occupyingStatuses().indexOf(r.status)>=0 &&
      r.startsAt <= t && r.blocksUntil > t;
  });
  if (!hit) return { status:"free", res:null };
  return { status: hit.status==="seated" ? "seated" : "booked", res:hit };
}

/* half-open overlap, exactly the rule in the plan */
function overlaps(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

function availability(dayOffset, slotMin, party, typeId, excludeResId){
  const winStart = atMin(dayOffset, slotMin);
  const turn = turnFor(party);
  const winEnd = new Date(winStart.getTime() + (turn + BUFFER_MIN)*60000);
  const blackout = BLACKOUTS.find(function(b){
    const sameDay = b.date.toDateString() === winStart.toDateString();
    if (!sameDay) return false;
    return b.scope==="venue" || (b.scope==="room_type" && b.typeId===typeId);
  });
  if (blackout) return { ok:false, reason:"blackout", blackout:blackout, tables:[] };
  let cand = TABLES.filter(function(t){
    if (typeId && typeId!=="any" && t.typeId!==typeId) return false;
    return t.max >= party && t.min <= party;
  });
  cand = cand.filter(function(t){
    const clash = RESERVATIONS.some(function(r){
      if (r.tableId!==t.id) return false;
      if (excludeResId && r.id===excludeResId) return false;
      if (occupyingStatuses().indexOf(r.status)<0) return false;
      return overlaps(winStart, winEnd, r.startsAt, r.blocksUntil);
    });
    if (clash) return false;
    const held = HOLDS.some(function(h){
      return h.tableId===t.id && h.status==="active" && h.expiresAt>new Date() &&
        overlaps(winStart, winEnd, h.startsAt, h.blocksUntil);
    });
    return !held;
  });
  /* best fit: least wasted seats, then priority */
  cand.sort(function(a,b){ return (a.max-party)-(b.max-party) || a.priority-b.priority; });
  return { ok:cand.length>0, reason:cand.length?null:"full", tables:cand, winStart:winStart, winEnd:winEnd, turn:turn };
}

/* combinations, only when no single table fits */
function combinations(dayOffset, slotMin, party, typeId){
  const joinable = TABLES.filter(function(t){
    return t.joinable && (!typeId || typeId==="any" || t.typeId===typeId);
  });
  const out=[];
  for (let i=0;i<joinable.length;i++) for (let j=i+1;j<joinable.length;j++){
    const a=joinable[i], b=joinable[j];
    if (a.roomId!==b.roomId) continue;
    if (a.max+b.max < party) continue;
    const freeA = availability(dayOffset, slotMin, Math.min(a.max,party), a.typeId).tables.some(function(t){return t.id===a.id;});
    const freeB = availability(dayOffset, slotMin, Math.min(b.max,party), b.typeId).tables.some(function(t){return t.id===b.id;});
    if (freeA && freeB) out.push({ tables:[a,b], seats:a.max+b.max });
  }
  return out;
}

/* holds, with real TTL */
const HOLDS = [];
let holdSeq = 0;
function createHold(dayOffset, slotMin, party, table, sessionId){
  const starts = atMin(dayOffset, slotMin);
  const turn = turnFor(party);
  const h = {
    id:"h"+(++holdSeq),
    token:"HLD-"+Math.random().toString(36).slice(2,10).toUpperCase(),
    tableId:table.id, tableLabel:table.label, party:party, slotMin:slotMin, dayOffset:dayOffset,
    startsAt:starts, endsAt:new Date(starts.getTime()+turn*60000),
    blocksUntil:new Date(starts.getTime()+(turn+BUFFER_MIN)*60000),
    createdAt:new Date(), expiresAt:new Date(Date.now()+VENUE.holdSeconds*1000),
    sessionId:sessionId||"me", status:"active"
  };
  HOLDS.push(h); return h;
}
function sweepHolds(){
  const now=new Date();
  HOLDS.forEach(function(h){ if(h.status==="active" && h.expiresAt<=now) h.status="expired"; });
}

/* pacing: covers already committed per slot today */
function pacingFor(dayOffset, slotMin){
  const day = atMin(dayOffset,0).toDateString();
  const rs = RESERVATIONS.filter(function(r){
    return r.startsAt.toDateString()===day && r.slotMin===slotMin &&
      occupyingStatuses().indexOf(r.status)>=0;
  });
  return { covers: rs.reduce(function(a,r){return a+r.party;},0), count: rs.length, cap:{covers:48, count:9} };
}

/* simulated outbox, stands in for email + SMS */
const OUTBOX = [];
function send(channel, to, subject, body){
  OUTBOX.unshift({ id:OUTBOX.length+1, at:new Date(), channel:channel, to:to, subject:subject, body:body });
}

window.DATA = {
  VENUE:VENUE, ROOM_TYPES:ROOM_TYPES, ROOMS:ROOMS, TABLES:TABLES,
  MENU:MENU, CATS:CATS, STAFF:STAFF,
  RESERVATIONS:RESERVATIONS, WAITLIST:WAITLIST, BLACKOUTS:BLACKOUTS,
  TICKETS:TICKETS, HOLDS:HOLDS, OUTBOX:OUTBOX,
  TURN_TIMES:TURN_TIMES, BUFFER_MIN:BUFFER_MIN,
  SERVICE_OPEN:SERVICE_OPEN, SERVICE_LAST:SERVICE_LAST, SERVICE_CLOSE:SERVICE_CLOSE,
  slotList:slotList, hhmm:hhmm, atMin:atMin, startOfToday:startOfToday,
  turnFor:turnFor, availability:availability, combinations:combinations,
  tableStatusAt:tableStatusAt, occupyingStatuses:occupyingStatuses,
  createHold:createHold, sweepHolds:sweepHolds, pacingFor:pacingFor,
  send:send, overlaps:overlaps, ref:ref, rnd:rnd, int:int, pick:pick
};
})();
