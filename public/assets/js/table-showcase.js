"use strict";
(() => {
  const assetRoot = '/assets/images/table-showcase/';
  let catalog, dialog, ui, context = null, status = 'idle', checkedAt = 0;
  let roomTables = [], index = 0, opener, view = 'seating', revision = 0, imageRevision = 0, interval, expiry;
  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, fn, cls = 'button ghost small') => {
    const b = el('button', {type:'button', class:cls}, text); b.addEventListener('click', fn); return b;
  };
  const room = table => catalog.rooms.find(r => Number(r.id) === Number(table.room_id));
  const type = table => catalog.room_types.find(r => Number(r.id) === Number(room(table).room_type_id));
  const current = () => roomTables[index];
  const optionFor = table => context?.slot?.options.find(o => o.table_ids.includes(Number(table.id)));
  function tableState(table) {
    if (!context) return ['unknown', 'Choose date & time'];
    if (status === 'stale') return ['unknown', 'Refresh to check'];
    if (status === 'error') return ['unknown', 'Unable to check'];
    if (status === 'checking') return ['unknown', 'Checking…'];
    const option = optionFor(table);
    return option ? ['available', option.kind === 'group' ? 'Available · joined' : 'Available'] : ['unavailable', 'Unavailable'];
  }
  function badge(table) {
    return el('span', {class:'showcase-badge', 'data-status-table':table.id});
  }
  function fallback(table) {
    const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 600 430');svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`Illustrative ${table.shape} table with ${table.capacity_max} seats`);
    const add=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);};
    const n=Math.max(1,Math.min(24,Number(table.capacity_max))), w=table.shape==='joined'?300:table.shape==='rect'?220:140;
    for(let i=0;i<n;i++){
      let x,y;
      if(table.shape==='round'){x=Math.cos(i/n*Math.PI*2)*112;y=Math.sin(i/n*Math.PI*2)*112;}
      else if(n===2){x=0;y=i===0?-110:110;}
      else if(i<n-2){x=-w/2+(Math.floor(i/2)+.5)*w/Math.ceil((n-2)/2);y=i%2?108:-108;}
      else{x=i===n-2?-w/2-40:w/2+40;y=0;}
      add('rect',{x:x+283,y:y+199,width:34,height:32,rx:7,fill:'#76513b',stroke:'#d0a076','stroke-width':2});
    }
    if(table.shape==='joined'){for(const x of [148,302])add('rect',{x,y:145,width:150,height:140,rx:6,fill:'#b17b47'});}
    else add(table.shape==='round'?'circle':'rect',table.shape==='round'?{cx:300,cy:215,r:80,fill:'#b17b47'}:{x:300-w/2,y:145,width:w,height:140,rx:9,fill:'#b17b47'});
    return svg;
  }
  function image(table, className='') {
    const wrap=el('span',{class:className,'aria-hidden':'true'}), img=el('img',{alt:'',width:960,height:720,loading:'lazy'});
    img.addEventListener('error',()=>wrap.replaceChildren(fallback(table)),{once:true});
    img.src=assetRoot+encodeURIComponent(table.code)+'.jpg';wrap.append(img);return wrap;
  }
  function tile(table, cls, action) {
    const b=button('',()=>action?action():open(table.id,b),cls);b.dataset.table=table.code;
    b.append(image(table),el('strong',{},table.code),el('small',{},`${table.capacity_min}–${table.capacity_max} guests`),badge(table));
    return b;
  }
  function paintImage() {
    const table=current();if(!table)return;
    const option=optionFor(table);
    const members=option?.kind==='group'?catalog.tables.filter(t=>option.table_ids.includes(Number(t.id))):[];
    const joined=members.map(t=>t.code).sort().join('-')==='G1-G2';
    const filename=view==='photo'?({vip:'round-table-reference.jpg',terrace:'terrace-reference.jpg'}[type(table).code]||'main-dining-reference.jpg'):(joined?'G1-G2.jpg':table.code+'.jpg');
    const key=view+':'+filename;
    if(ui.hero.dataset.image===key)return;
    ui.hero.dataset.image=key;const version=++imageRevision;
    const img=el('img',{width:960,height:720,decoding:'async',alt:view==='photo'?'Atmosphere reference from another venue':`Rendered seating concept for ${joined?'G1 and G2 together':table.code}`});
    ui.hero.setAttribute('aria-busy','true');
    const caption=view==='photo'?'Room inspiration from another venue · not an actual table photograph.':`${joined?'G1 + G2 · 16 seats':table.code+' · '+table.capacity_max+' seats'} shown · Rendered concept; proportions are illustrative.`;
    img.addEventListener('load',()=>{if(version!==imageRevision)return;img.classList.add('is-ready');ui.hero.setAttribute('aria-busy','false');},{once:true});
    img.addEventListener('error',()=>{if(version!==imageRevision)return;ui.hero.replaceChildren(fallback(joined?{...table,shape:'joined',capacity_max:16}:table));ui.hero.setAttribute('aria-busy','false');ui.caption.textContent='Picture unavailable; the seating layout and availability controls still work.';},{once:true});
    img.src=assetRoot+encodeURIComponent(filename);ui.hero.replaceChildren(img);ui.caption.textContent=caption;
  }
  function syncStatus() {
    if(!catalog)return;
    for(const node of document.querySelectorAll('[data-status-table]')){
      const table=catalog.tables.find(t=>Number(t.id)===Number(node.dataset.statusTable));
      const [state,label]=tableState(table);node.dataset.state=state;node.textContent=(state==='available'?'✓ ':state==='unavailable'?'× ':'○ ')+label;
    }
    if(!current())return;
    const table=current(), option=status==='ready'?optionFor(table):null;
    ui.schedule.textContent=context?`${context.query.date} · ${context.time} · ${context.query.party_size} guests · Manila time`:'Choose your date, time and guest count to check availability.';
    ui.freshness.textContent=status==='stale'?'Status needs a fresh check. Refresh availability.':status==='checking'?'Checking current availability…':status==='error'?'Connection interrupted. Status is unknown; retry to check.':context?`Checked at ${new Date(checkedAt).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} · refreshes while open`:'Availability depends on your schedule and party size.';
    ui.refresh.hidden=!context;ui.refresh.disabled=status==='checking';
    ui.choose.disabled=Boolean(context)&&(!option||status!=='ready');
    ui.choose.textContent=!context?'Choose date and time':status==='checking'?'Checking availability…':status!=='ready'?'Check availability first':option?.kind==='group'?'Use joined tables':option?'Use this table':'Unavailable for this search';
    if(!context)ui.reason.textContent='Start a search in the booking form. Exploring tables does not reserve one.';
    else if(status==='error'||status==='checking'||status==='stale')ui.reason.textContent='We need a current server response before you can choose this table.';
    else if(option)ui.reason.textContent=(option.kind==='group'?'This option reserves '+catalog.tables.filter(t=>option.table_ids.includes(Number(t.id))).map(t=>t.code).join(' + ')+' together. ':'')+(option.approval_required?'Manager approval required. ':'')+'Available for this search; the server checks again when you continue.';
    else if(context.query.party_size<Number(table.capacity_min)||context.query.party_size>Number(table.capacity_max))ui.reason.textContent='This table does not fit your guest count as an individual table. Try another party size or table.';
    else if(context.query.room_type!=='any'&&context.query.room_type!==type(table).code)ui.reason.textContent='Outside your chosen room preference. Change the room preference to check this table.';
    else ui.reason.textContent='Unavailable for this date, time and party. Bookings, holds or restaurant rules may apply. Try another time or table.';
    paintImage();
  }
  function render() {
    ui.announcement.textContent='';
    const table=current();ui.title.textContent='Table '+table.code;ui.room.textContent=room(table).name;
    ui.facts.replaceChildren();
    for(const [name,value] of [['Seats',`${table.capacity_min}–${table.capacity_max} guests individually`],['Shape',table.shape==='rect'?'Rectangular':table.shape==='round'?'Round':'Square'],['Minimum spend',Number(type(table).min_spend_cents)?new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(type(table).min_spend_cents)/100):'None'],['Booking notice',Number(type(table).min_notice_hours)?type(table).min_notice_hours+' hours':'Same-day bookings']]){
      const row=el('div');row.append(el('dt',{},name),el('dd',{},value));ui.facts.append(row);
    }
    ui.status.replaceChildren(badge(table));
    ui.position.textContent=`${room(table).name} · ${table.code} · Table ${index+1} of ${roomTables.length}`;
    for(const b of ui.strip.children)b.setAttribute('aria-pressed',String(b.dataset.table===table.code));
    for(const b of ui.views.children)b.setAttribute('aria-pressed',String(b.dataset.view===view));
    ui.previous.disabled=index===0;ui.next.disabled=index===roomTables.length-1;
    ui.strip.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    syncStatus();
  }
  function scheduleRefresh() {
    clearInterval(interval);
    if(context&&dialog.open)interval=setInterval(()=>{if(document.visibilityState==='visible'&&status!=='checking')refresh(false,false);},30000);
  }
  async function refresh(apply=false, announce=true) {
    if(!context||status==='checking')return;
    const captured=context, version=++revision, prior=tableState(current() || catalog.tables[0]).join(':');status='checking';syncStatus();
    const controller=new AbortController(), deadline=setTimeout(()=>controller.abort(),12000);
    try{
      const availability=await captured.refresh(controller.signal);
      if(version!==revision||captured!==context)return;
      captured.slot=availability.slots.find(s=>s.time===captured.time)||{time:captured.time,options:[]};
      markFresh();status='ready';captured.update?.(captured.slot);syncStatus();
      if(current()&&(announce||prior!==tableState(current()).join(':')))ui.announcement.textContent=current().code+': '+tableState(current())[1]+' for this search.';
      if(apply){
        const option=optionFor(current());
        if(option){const choose=captured.choose;dialog.close();choose(option,captured.slot);}
        else ui.announcement.textContent='That table is no longer available for this search. Choose another table or time.';
      }
    }catch{
      if(version!==revision||captured!==context)return;
      status='error';captured.update?.(null);syncStatus();
    }finally{clearTimeout(deadline);}
  }
  function open(tableId, trigger) {
    const table=catalog.tables.find(t=>Number(t.id)===Number(tableId));if(!table)return;
    opener=trigger;roomTables=catalog.tables.filter(t=>Number(t.room_id)===Number(table.room_id));index=roomTables.indexOf(table);view='seating';
    ui.strip.replaceChildren(...roomTables.map(t=>tile(t,'showcase-thumbnail',()=>{index=roomTables.indexOf(t);render();})));
    ui.announcement.textContent='';ui.hero.dataset.image='';render();dialog.showModal();dialog.scrollTop=0;ui.title.focus({preventScroll:true});
    refresh();scheduleRefresh();
  }
  function markFresh(timestamp=Date.now()) {
    checkedAt=timestamp;clearTimeout(expiry);
    const remaining=45000-(Date.now()-checkedAt);
    if(remaining<=0){status='stale';context?.update?.(null);return;}
    expiry=setTimeout(()=>{if(context&&status==='ready'){status='stale';context.update?.(null);syncStatus();}},remaining);
  }
  function setContext(value) {
    revision++;context=value;status=value?'ready':'idle';clearTimeout(expiry);if(value)markFresh(value.checkedAt);else checkedAt=0;
    syncStatus();scheduleRefresh();
    if(value&&(dialog?.open||status==='stale'))refresh();
  }
  function init(data, jump) {
    catalog=data;dialog=el('dialog',{id:'table-showcase',class:'table-showcase','aria-labelledby':'table-showcase-title'});ui={};
    ui.title=el('h2',{id:'table-showcase-title',tabindex:-1});ui.room=el('p',{class:'eyebrow'});
    const close=button('Close ×',()=>dialog.close());close.setAttribute('aria-label','Close table showcase');
    const heading=el('div',{class:'showcase-heading'}), titles=el('div');titles.append(ui.room,ui.title);heading.append(titles,close);
    ui.hero=el('div',{class:'showcase-hero','aria-busy':'false'});ui.caption=el('p',{class:'fine-print'});ui.views=el('div',{class:'showcase-views',role:'group','aria-label':'Views of this table'});
    for(const [name,label] of [['seating','Seating view'],['photo','Room inspiration']]){const b=button(label,()=>{view=name;render();});b.dataset.view=name;ui.views.append(b);}
    const visual=el('section',{'aria-label':'Table pictures'});visual.append(ui.hero,ui.caption,ui.views);
    ui.schedule=el('p',{class:'showcase-schedule'});ui.status=el('p');ui.freshness=el('p',{class:'fine-print'});ui.reason=el('p',{class:'showcase-reason'});ui.facts=el('dl',{class:'summary'});
    ui.refresh=button('Refresh availability',()=>refresh());
    ui.choose=button('Choose date and time',()=>{if(!context){dialog.close();jump();}else refresh(true);},'button full');
    ui.announcement=el('p',{class:'form-note',role:'status'});
    const detail=el('section',{'aria-label':'Table availability',class:'showcase-details'});detail.append(ui.schedule,ui.status,ui.freshness,ui.refresh,ui.facts,ui.reason,ui.choose,ui.announcement);
    const layout=el('div',{class:'showcase-layout'});layout.append(visual,detail);
    ui.previous=button('← Previous',()=>{index--;render();});ui.previous.setAttribute('aria-label','Previous table');
    ui.next=button('Next →',()=>{index++;render();});ui.next.setAttribute('aria-label','Next table');
    ui.position=el('span',{role:'status'});const nav=el('div',{class:'showcase-nav'}), arrows=el('div');arrows.append(ui.previous,ui.next);nav.append(ui.position,arrows);
    ui.strip=el('div',{class:'showcase-strip','aria-label':'Tables in this room'});
    dialog.append(heading,layout,nav,ui.strip,el('p',{class:'fine-print'},'Swipe the strip or use the arrows. Browsing does not change your booking selection.'),el('a',{class:'text-link',href:assetRoot+'credits.json',target:'_blank',rel:'noopener'},'Image sources and credits ↗'));
    dialog.addEventListener('close',()=>{clearInterval(interval);revision++;if(status==='checking'){status='error';context?.update?.(null);}syncStatus();(opener?.isConnected?opener:document.querySelector(document.body.dataset.page==='manage'?'#manage-workspace':'#booking'))?.focus({preventScroll:true});});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&dialog.open&&context&&status!=='checking')refresh();});
    document.body.append(dialog);
    if(document.body.dataset.page!=='manage'){
      const disclosure=el('details',{class:'showcase-inventory'});disclosure.append(el('summary',{},`View all ${catalog.tables.length} table previews`));
      const grid=el('div',{class:'showcase-grid'});grid.append(...catalog.tables.map(t=>tile(t,'showcase-tile')));disclosure.append(grid);document.querySelector('#rooms').append(disclosure);
    }
    syncStatus();
  }
  window.LuminaTableShowcase={init,open,setContext,refresh};
})();
