"use strict";
(() => {
  const money = cents => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(cents)/100);
  const el=(tag,attrs={},...children)=>{
    const n=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
    for(const child of children.flat())if(child!==null&&child!==undefined)n.append(child instanceof Node?child:String(child));
    return n;
  };
  function totals(q,historical=false){
    const list=el('dl',{class:'summary preorder-totals'});
    for(const [label,value] of [
      ['Food subtotal',money(q.food_cents)],
      [historical?'Quoted consumable reservation base':'Consumable reservation base · unpaid',money(q.fees.base_fee_cents)],
      ['Extra-person charge · not food credit',money(q.fees.extra_cents)],
      [historical?'Received / food credit at quote acceptance':'Received / food credit now',money(q.received_cents)+' / '+money(q.food_credit_cents)],
      ['Food + extras estimate',money(q.estimated_due_cents)]
    ])list.append(el('div',{},el('dt',{},label),el('dd',{},value)));
    return list;
  }
  function summary(p){
    const q=p.quote,section=el('section',{class:'preorder-summary','aria-label':'Saved food pre-order'});
    section.append(el('h3',{},'Your food pre-order'),el('p',{},({scheduled:'Scheduled · sent to the kitchen after arrival',handed_off:'Released to the kitchen',cancelled:'Cancelled · scheduled food stopped'})[p.status]||p.status));
    const list=el('ul');for(const i of q.lines)list.append(el('li',{},`${i.qty} × ${i.name} · ${money(i.qty*i.unit_price_cents)}`));
    section.append(q.lines.length?list:el('p',{},'No food selected yet.'),totals(q,true));
    const policy=el('details',{},el('summary',{},'Accepted quote and food policy'));
    policy.append(el('p',{},'Original acceptance: '+p.accepted_quote.accepted_at+' · Manila time'));
    for(const text of p.accepted_quote.policy)policy.append(el('p',{},text));
    if(p.history.length)policy.append(el('p',{},p.history.length+' saved food change(s); original acceptance is preserved.'));
    section.append(policy);return section;
  }
  function editor({catalog,draft,review,persist=()=>{},changed=()=>{},locked=false}){
    draft.cart=Array.isArray(draft.cart)?draft.cart:[];
    const section=el('fieldset',{class:'preorder-editor'}),legend=el('legend',{},'Food pre-order · optional');
    const select=el('select',{'aria-label':'Food item'}),qty=el('input',{type:'number',min:1,max:30,step:1,value:1,'aria-label':'Quantity to add'});
    for(const category of catalog.categories){
      const group=el('optgroup',{label:category.name});
      for(const m of catalog.menu.filter(m=>Number(m.category_id)===Number(category.id)&&Number(m.is_available)))group.append(el('option',{value:m.id},m.name+' · '+money(m.price_cents)));
      if(group.children.length)select.append(group);
    }
    const add=el('button',{type:'button',class:'button ghost'},'Add dish');
    const rows=el('div',{class:'preorder-lines'}),subtotal=el('p',{class:'preorder-subtotal',role:'status','aria-atomic':'true'});
    const quote=el('section',{class:'preorder-quote','aria-label':'Review food and fees'});
    const accept=el('input',{type:'checkbox',id:'accept-food-quote'});
    section.append(legend,el('p',{class:'fine-print'},'Choose dishes now or order onsite. Standard needs at least ₱1,000 in accepted food upon seating.'),el('div',{class:'preorder-add'},el('label',{},'Dish',select),el('label',{},'Quantity',qty),add),rows,subtotal,quote);
    function invalidate(){delete draft.quote;accept.checked=false;quote.replaceChildren();persist();changed();}
    function render(){
      rows.replaceChildren();let total=0;
      for(const line of draft.cart){
        const m=catalog.menu.find(m=>Number(m.id)===line.id);
        const name=m?.name||'Unavailable dish';total+=line.qty*Number(m?.price_cents||0);
        const input=el('input',{type:'number',min:1,max:30,step:1,value:line.qty,'aria-label':'Quantity for '+name});
        input.addEventListener('change',()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>30){input.setCustomValidity('Choose a whole quantity from 1 to 30.');input.reportValidity();return;}input.setCustomValidity('');line.qty=n;invalidate();render();rows.querySelector('[aria-label="'+CSS.escape('Quantity for '+name)+'"]')?.focus();});
        const remove=el('button',{type:'button',class:'button ghost small','aria-label':'Remove '+name},'Remove');
        remove.addEventListener('click',()=>{draft.cart=draft.cart.filter(i=>i!==line);invalidate();render();select.focus();});
        rows.append(el('div',{class:'preorder-line'},el('span',{},name+' · '+money(line.qty*Number(m?.price_cents||0))),el('label',{},'Quantity',input),remove));
      }
      subtotal.textContent='Estimated food subtotal: '+money(total);
      persist();
    }
    function paintQuote(){
      const q=draft.quote;if(!q)return;
      quote.replaceChildren(el('h3',{},'Review food and fees'),totals(q));
      const lines=el('ul');for(const i of q.lines)lines.append(el('li',{},`${i.qty} × ${i.name} · ${money(i.qty*i.unit_price_cents)}`));
      quote.append(q.lines.length?lines:el('p',{},'No food selected. You can order onsite.'));
      for(const text of q.policy)quote.append(el('p',{class:'fine-print'},text));
      if(q.fees.minimum_cents>q.food_cents)quote.append(el('p',{class:'form-note'},'Below the ₱1,000 Standard seating minimum. You may book now; complete the food order with staff before seating.'));
      quote.append(el('label',{class:'preorder-accept'},accept,el('span',{},catalog.policies_enabled?'I reviewed and accept this food quote, fees and full reservation terms.':'I reviewed and accept this food quote, fees and food policy.')));
      quote.append(el('p',{class:'fine-print'},'No payment received. Base allowance is not added again to the same food bill. Unused allowance requires staff review.'));
      accept.checked=false;
    }
    add.addEventListener('click',()=>{
      const id=Number(select.value),count=Number(qty.value),current=draft.cart.find(i=>i.id===id);
      if(!Number.isInteger(count)||count<1||count>30||(current&&current.qty+count>30)){qty.setCustomValidity('Choose a whole quantity; maximum 30 per dish.');qty.reportValidity();return;}
      qty.setCustomValidity('');if(!id)return;
      if(!current&&draft.cart.length>=30){qty.setCustomValidity('Choose up to 30 distinct dishes.');qty.reportValidity();return;}
      if(current)current.qty+=count;else draft.cart.push({id,qty:count});
      invalidate();render();
    });
    qty.addEventListener('input',()=>qty.setCustomValidity(''));
    render();paintQuote();section.disabled=locked;
    return {element:section,invalidate,lock:value=>{section.disabled=value;},async prepare(){
      if(draft.quote&&accept.checked)return {cart:draft.cart.map(i=>({...i})),quote_token:draft.quote.quote_token,accepted:true};
      if(draft.quote){accept.focus();throw new Error('Accept the reviewed food quote, fees and food policy before continuing.');}
      draft.quote=await review(draft.cart);persist();paintQuote();changed(true);quote.scrollIntoView({block:'nearest',behavior:'instant'});accept.focus();return null;
    }};
  }
  window.LuminaPreorders={editor,summary};
})();
