"use strict";
(() => {
  const data = window.SHOWCASE_INVENTORY;
  const $ = s => document.querySelector(s);
  const dialog = $('#showcase');
  const photos = { r_vip:'round-table-reference.jpg', r_common:'main-dining-reference.jpg', r_group:'main-dining-reference.jpg', r_terrace:'terrace-reference.jpg' };
  const descriptions = { r_vip:'Private suites for a quieter evening.', r_common:'Open dining around the hearth.', r_group:'Long tables for larger parties.', r_terrace:'Open-air terrace seating.' };
  let tables = [], index = 0, opener = null, view = 'seating', imageRevision = 0;
  const element = (tag, text, className) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (className) e.className = className;
    return e;
  };
  // Original illustrations use catalog shapes/capacity; coordinates are design units, not metres.
  function illustration(table) {
    const n = Number(table.capacity_max), round = table.shape === 'round';
    const w = table.shape === 'rect' ? 220 : 140, h = 140;
    const chairs = [];
    for (let i = 0; i < n; i++) {
      let x,y;
      if (round) { const angle = i / n * Math.PI * 2; x = Math.cos(angle) * 112; y = Math.sin(angle) * 112; }
      else if (n === 2) { x = 0; y = i === 0 ? -110 : 110; }
      else if (i < n - 2) { const side = i % 2, slots = Math.ceil((n-2)/2); x = -w/2 + (Math.floor(i/2)+.5)*w/slots; y = side ? 108 : -108; }
      else { x = i === n-2 ? -w/2-40 : w/2+40; y = 0; }
      chairs.push(`<g transform="translate(${x} ${y})"><rect x="-17" y="-16" width="34" height="32" rx="7" fill="#76513b" stroke="#d0a076" stroke-width="2"/><rect x="-16" y="-18" width="32" height="8" rx="3" fill="#bf9067"/></g>`);
    }
    const surface = (fill,offset) => round
      ? `<ellipse cx="0" cy="${offset}" rx="80" ry="80" fill="${fill}" stroke="#d8aa70" stroke-width="2"/>`
      : `<rect x="${-w/2}" y="${-h/2+offset}" width="${w}" height="${h}" rx="9" fill="${fill}" stroke="#d8aa70" stroke-width="2"/>`;
    return `<svg viewBox="0 0 600 430" role="img" aria-label="Illustrative ${table.shape} table with up to ${n} seats"><g transform="translate(300 215)">${chairs.join('')}${surface('#b17b47',0)}<ellipse cx="0" cy="0" rx="15" ry="15" fill="#d9c6a0"/><circle cx="0" cy="0" r="7" fill="#546743"/></g></svg>`;
  }
  function tableButton(table, className, action) {
    const b = element('button',null,className); b.type='button'; b.dataset.table=table.code;
    const art=element('span'); art.setAttribute('aria-hidden','true');
    const img=element('img'); img.src=`assets/seating/${table.code}.jpg`; img.alt=''; img.width=960; img.height=720; img.loading='lazy';
    img.addEventListener('error',()=>{art.innerHTML=illustration(table);},{once:true}); art.append(img);
    b.append(art,element('strong',table.code),element('span',`${table.capacity_min}–${table.capacity_max} guests`));
    b.addEventListener('click',()=>action(b)); return b;
  }
  for (const room of data.rooms) {
    const list=data.tables.filter(t=>Number(t.room_id)===Number(room.id));
    const card=element('button',null,'room-card'); card.type='button'; card.dataset.room=room.code;
    const img=element('img'); img.src='assets/'+photos[room.code]; img.alt=''; img.width=1200; img.height=800;
    const copy=element('span',null,'room-copy');
    const category=data.room_types.find(t=>Number(t.id)===Number(room.room_type_id));
    copy.append(element('strong',category?.name || room.name),element('span',descriptions[room.code],'description'),element('span',`Explore ${list.length} tables ↗`,'count'));
    card.append(img,copy); card.addEventListener('click',()=>open(room,list[0],card)); $('#room-cards').append(card);
    for (const table of list) $('#table-grid').append(tableButton(table,'table-tile',b=>open(room,table,b)));
  }
  function open(room,table,trigger) {
    opener=trigger; tables=data.tables.filter(t=>Number(t.room_id)===Number(room.id));
    index=tables.findIndex(t=>t.code===table.code); view='seating'; $('#room-name').textContent=room.name;
    $('#thumbnails').replaceChildren(...tables.map(t=>tableButton(t,'thumbnail',()=>{index=tables.indexOf(t);render();})));
    render(); dialog.showModal(); dialog.scrollTop=0; $('#showcase-title').focus({preventScroll:true});
  }
  function render() {
    const table=tables[index], room=data.rooms.find(r=>Number(r.id)===Number(table.room_id));
    $('#showcase-title').textContent=`Table ${table.code}`; $('#table-label').textContent=/^\d+$/.test(table.label)?`Table ${table.label}`:table.label;
    $('#position').textContent=`${room.name} · Table ${index+1} of ${tables.length}`;
    $('#facts').replaceChildren();
    const facts={Room:room.name,Seats:`${table.capacity_min}–${table.capacity_max} guests`,Shape:table.shape==='rect'?'Rectangular':table.shape==='square'?'Square':'Round',Availability:'Check your date and time'};
    for(const [label,value] of Object.entries(facts)){const row=element('div');row.append(element('dt',label),element('dd',value));$('#facts').append(row);}
    const revision=++imageRevision, currentView=view, hero=$('#hero'), img=element('img');
    hero.setAttribute('aria-busy','true');
    img.width=960; img.height=720; img.decoding='async';
    img.alt=currentView==='photo'?'Illustrative restaurant atmosphere reference, not the actual table':`Rendered seating layout for ${table.code}, ${table.shape} table with ${table.capacity_max} chairs`;
    img.addEventListener('load',()=>{if(revision!==imageRevision)return;img.classList.add('is-ready');hero.setAttribute('aria-busy','false');},{once:true});
    img.addEventListener('error',()=>{if(revision!==imageRevision)return;hero.innerHTML=illustration(table);hero.setAttribute('aria-busy','false');$('#image-caption').textContent=`${table.code} · Picture unavailable; showing its seating layout.`;},{once:true});
    img.src=currentView==='photo'?'assets/'+photos[room.code]:`assets/seating/${table.code}.jpg`;
    hero.replaceChildren(img);
    $('#image-caption').textContent=currentView==='photo'?'Stock reference from another venue · See source credits.':`${table.code} · ${table.capacity_max} seats shown · Rendered seating concept; dimensions are illustrative.`;
    for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===view));
    for(const b of $('#thumbnails').children)b.setAttribute('aria-pressed',String(b.dataset.table===table.code));
    $('#previous').disabled=index===0;$('#next').disabled=index===tables.length-1;
    const selected=$('#thumbnails').querySelector('[aria-pressed="true"]');
    selected?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  }
  $('#previous').addEventListener('click',()=>{if(index>0){index--;render();}});
  $('#next').addEventListener('click',()=>{if(index<tables.length-1){index++;render();}});
  for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{view=b.dataset.view;render();});
  $('#close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  $('#choose').addEventListener('click',()=>{
    const code=tables[index].code;
    for(const b of $('#table-grid').children)b.setAttribute('aria-pressed',String(b.dataset.table===code));
    $('#selection').textContent=`Chosen in the design study: ${code}. Availability and booking would be checked in the live flow.`;
    $('#selection').classList.remove('is-confirmed');
    requestAnimationFrame(()=>$('#selection').classList.add('is-confirmed'));
    dialog.close();
  });
})();
