"use strict";
(() => {
  const $=s=>document.querySelector(s), detail=$("#billing-detail"), list=$("#billing-list"), feedback=$("#billing-feedback");
  let csrf="",user=null,bill=null,busy=false,pending=null;
  const storageKey="bella_billing_pending";
  const money=n=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(n/100);
  const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
  const button=(text,work,cls="button ghost")=>{const b=el("button",{type:"button",class:cls},text);b.addEventListener("click",()=>perform(work));return b;};
  function tell(message){feedback.textContent=message;}
  async function api(path,body){let response;try{response=await fetch(path,{credentials:"same-origin",headers:body?{"Content-Type":"application/json","X-CSRF-Token":csrf}:{},...(body?{method:"POST",body:JSON.stringify(body)}:{})});}catch{throw Object.assign(new Error("Connection interrupted. Review receipts and retry the same record."),{network:true});}const data=await response.json();if(!response.ok||!data.ok)throw Object.assign(new Error(data.error?.message||"Unable to load cashier."),{status:response.status});return data;}
  async function perform(work){if(busy)return;busy=true;tell("");for(const b of document.querySelectorAll("button"))b.disabled=true;try{await work();}catch(e){tell(e.message);}finally{busy=false;for(const b of document.querySelectorAll("button"))b.disabled=false;}}
  async function loadBill(id){bill=(await api("/api/billing/quote?reservation_id="+id)).bill;render();}
  function label(text,control){control.setAttribute("aria-label",text);const l=el("label",{},text);l.append(control);return l;}
  function render(){
    detail.replaceChildren(el("h2",{},bill.code),el("p",{},(bill.category_name||"Dining reservation")+" · "+bill.party_size+" guests · "+({unopened:"No receipts yet",open:"Open bill",finalized:"Finalized"}[bill.status]||bill.status)));
    const terminal=['cancelled','no_show'].includes(bill.reservation_status), policy=bill.policy, balances=bill.policy_money;
    const summary=el("dl",{class:"billing-summary"});
    for(const[name,amount]of [["Food subtotal",bill.food_cents],["Consumable base assessed",bill.base_fee_cents],["Separate VIP extras",bill.extra_cents],["Base receipts received",bill.advance_cents],["Advance food credit applied",bill.credit_applied_cents],["Bill payments received",bill.payment_cents],["Credit refunds recorded",bill.refund_cents],["Unused received credit",bill.unused_credit_cents],["Remaining bill balance",bill.due_cents]])summary.append(el("dt",{},name),el("dd",{},money(amount)));
    if(balances)for(const[name,amount]of [['Separate extras received',balances.extra_receipt],['Base refunds recorded',balances.refund_base],['Extra refunds recorded',balances.refund_extra],['Retained same-day base',policy?.forfeited_base_cents||0]])summary.append(el('dt',{},name),el('dd',{},money(amount)));
    if(terminal&&policy)detail.append(el('p',{},`${bill.reservation_status==='no_show'?'Absent arrival released':'Reservation cancelled'} · ${policy.reviewed?'Manager review recorded':'Manager review required'}. Eligible actual receipts awaiting refund: ${money(Math.max(0,balances.net_base_cents-policy.forfeited_base_cents)+balances.net_extra_cents)}. Cancellation does not transfer money.`));
    detail.append(summary,el("p",{class:"fine-print"},"The consumable base is included in eligible food value, not added to food again. An advance is food credit; it cannot pay VIP extras."));
    if(!bill.minimum_met)detail.append(el("p",{},"Standard food minimum: ₱1,000. Add accepted food before seating or finalizing."));
    if(pending){detail.append(el("p",{},"A receipt may be unresolved. Retry this same record before starting another."),button("Retry the same record",()=>record(pending.body)));}
    else if(bill.status!=="finalized"){
      const form=el("form",{class:"billing-form"}),action=el("select",{name:"action"}),method=el("select",{name:"method"});
      const choices=terminal?[['refund_base','Record actual eligible base refund'],['refund_extra','Record actual extra refund']]:[['payment','Record onsite bill payment'],['advance','Record received consumable base'],['refund_credit','Record reviewed unused-credit refund'],...(balances?[['extra_receipt','Record received VIP extras'],['refund_base','Record actual eligible base refund'],['refund_extra','Record actual extra refund']]:[])];
      for(const[value,text]of choices)action.append(el('option',{value},text));
      for(const[value,text]of [["cash","Cash"],["external_card","Card completed externally"]])method.append(el("option",{value},text));
      const amount=el("input",{name:"amount",inputmode:"decimal",required:"",value:(bill.due_cents/100).toFixed(2)}),reason=el("input",{name:"reason",required:"",minlength:3,maxlength:255,value:"Onsite payment recorded by staff"});
      action.addEventListener("change",()=>{amount.value=((action.value==='refund_base'?Math.max(0,balances.net_base_cents-(policy?.forfeited_base_cents||0)):action.value==='refund_extra'?balances.net_extra_cents:action.value==='extra_receipt'?Math.max(0,bill.extra_cents-balances.net_extra_cents):action.value==="advance"?Math.max(0,bill.base_fee_cents-bill.advance_cents+bill.refund_cents):action.value==="refund_credit"?bill.unused_credit_cents:bill.due_cents)/100).toFixed(2);});
      const submit=el("button",{type:"submit",class:"button"},"Record receipt");form.append(label("Action",action),label("Amount applied (PHP)",amount),label("Payment method",method),label("Reason · no card numbers",reason),submit);
      form.addEventListener("submit",e=>{e.preventDefault();perform(async()=>{const text=amount.value.trim();if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text))throw new Error("Enter a peso amount with at most two decimal places.");const[a,b=""]=text.split(".");const cents=Number(a)*100+Number(b.padEnd(2,"0"));await record({reservation_id:bill.reservation_id,action:action.value,revision:bill.revision,request_key:crypto.randomUUID(),data:{amount_cents:cents,method:method.value,reason:reason.value.trim()}});});});
      action.dispatchEvent(new Event('change'));
      const reviewNeeded=!terminal&&bill.food_cents<bill.base_fee_cents&&bill.refund_cents===0;
      const review=el("input",{id:"fee-review-reason",maxlength:180,minlength:10});
      detail.append(form);
      if(terminal&&policy){
        const cancellationReason=el('input',{minlength:10,maxlength:180});
        detail.append(label('Manager cancellation / no-show review reason',cancellationReason),button('Record manager policy review',()=>record({reservation_id:bill.reservation_id,action:'review_cancellation',revision:bill.revision,request_key:crypto.randomUUID(),data:{reason:cancellationReason.value.trim()}})));
      }
      if(reviewNeeded)detail.append(label("Manager review of unused allowance",review),el("p",{class:"fine-print"},"The assessed fee stays visible. Explain the unused unreceived allowance; no automatic extra food minimum, shortfall charge or fictitious refund is created."));
      detail.append(button("Finalize reviewed bill",()=>record({reservation_id:bill.reservation_id,action:"finalize",revision:bill.revision,request_key:crypto.randomUUID(),data:reviewNeeded?{review_reason:review.value.trim()}:{}})));
    }
    const policyHistory=el('ol',{class:'billing-history'});
    for(const r of bill.policy_receipts||[])policyHistory.append(el('li',{},({extra_receipt:'VIP extras received',refund_base:'Actual base refund',refund_extra:'Actual extras refund'}[r.kind]||r.kind)+' · '+money(Number(r.amount_cents))+' · '+(r.method==='cash'?'Cash':'External card')+' · '+r.created_at+' · '+r.reason));
    if(policyHistory.children.length)detail.append(el('h3',{},'Policy receipt history'),policyHistory);
    const history=el("ol",{class:"billing-history"});for(const r of bill.receipts)history.append(el("li",{},({advance:"Consumable base received",payment:"Onsite bill payment",refund_credit:"Unused credit refunded",finalize:"Bill finalized"}[r.kind]||r.kind)+" · "+money(Number(r.amount_cents))+" · "+({cash:"Cash",external_card:"External card",none:"Review"}[r.method]||r.method)+" · "+r.created_at+" · "+r.reason));detail.append(el("h3",{},"Receipt history"),history);
  }
  async function record(body){
    if(pending&&pending.user!==user.id)throw new Error("An unresolved record belongs to another staff member. Review its receipt history with that staff member before proceeding.");
    pending={user:user.id,body};sessionStorage.setItem(storageKey,JSON.stringify(pending));render();
    try{const result=await api("/api/billing/record",body);pending=null;sessionStorage.removeItem(storageKey);await loadBill(body.reservation_id);tell(result.replayed?"Recovered the existing receipt; no duplicate was created.":"Recorded. No money was transferred by the app.");}
    catch(e){if(!e.network&&e.status>=400&&e.status<500&&e.status!==401){pending=null;sessionStorage.removeItem(storageKey);await loadBill(body.reservation_id);}tell(e.message);render();}
  }
  async function loadList(){sessionStorage.setItem("bella_billing_date",$("#billing-filter").elements.date.value);const data=await api("/api/billing/reservations?date="+$("#billing-filter").elements.date.value);list.replaceChildren();for(const r of data.reservations)list.append(button(r.code+" · "+r.category+" · "+r.party_size+" guests",()=>loadBill(r.id),"button ghost billing-row"));if(!data.reservations.length)list.append(el("p",{},"No target reservations on this service date."));}
  $("#billing-filter").addEventListener("submit",e=>{e.preventDefault();perform(loadList);});
  perform(async()=>{const auth=await api("/api/auth/me");user=auth.user;if(!user){location.assign("/staff/login");return;}csrf=auth.csrf_token;$("#cashier-user").textContent=user.full_name;const catalog=(await api("/api/catalog")).catalog;if(catalog.operations_enabled)document.querySelector(".billing-header nav").append(el("a",{href:"/reports"},"Daily reports"));$("#billing-filter").elements.date.value=sessionStorage.getItem("bella_billing_date")||catalog.today;$("#billing-filter").elements.date.disabled=false;try{pending=JSON.parse(sessionStorage.getItem(storageKey));}catch{pending=null;}await loadList();if(pending)await loadBill(pending.body.reservation_id);});
})();
