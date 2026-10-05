/* screen router + simulation clock */
(function(){
"use strict";
const SCREENS = {
  "#/home":    { mod:"Guest",   fn:"home",    label:"Guest site" },
  "#/menu":    { mod:"Guest",   fn:"menu",    label:"Menu" },
  "#/book":    { mod:"Guest",   fn:"book",    label:"Book a table" },
  "#/manage":  { mod:"Guest",   fn:"manage",  label:"My reservation" },
  "#/admin":   { mod:"Admin",   fn:"mount",   label:"Admin" },
  "#/kitchen": { mod:"Kitchen", fn:"mount",   label:"Kitchen" }
};
const stage = function(){ return document.getElementById("stage"); };
let current = null;
let timers = [];
function addTimer(id){ timers.push(id); }
function clearTimers(){ timers.forEach(clearInterval); timers.forEach(clearTimeout); timers=[]; }
window.APP = { addTimer:addTimer, go:go, active:function(){return current;} };

function go(hash){
  if (!SCREENS[hash]) hash = "#/home";
  if (location.hash !== hash){ location.hash = hash; return; }
  render(hash);
}
function render(hash){
  const def = SCREENS[hash] || SCREENS["#/home"];
  clearTimers();
  const host = stage();
  while (host.firstChild) host.removeChild(host.firstChild);
  document.querySelectorAll("[data-nav]").forEach(function(a){
    const on = a.getAttribute("data-nav")===hash ||
      (hash==="#/book" && a.getAttribute("data-nav")==="#/book");
    a.classList.toggle("is-on", on);
  });
  const chrome = hash==="#/admin"||hash==="#/kitchen";
  document.body.classList.toggle("is-app", chrome);
  current = hash;
  const mod = window[def.mod];
  if (!mod || typeof mod[def.fn]!=="function"){
    host.appendChild(U.el("div",{class:"wrap section"},[
      U.el("h2",{text:"Screen unavailable"}),
      U.el("p",{class:"muted",text:def.mod+"."+def.fn+" did not load."})
    ]));
    return;
  }
  mod[def.fn](host);
  window.scrollTo({top:0,behavior:"instant"});
  U.observeReveals(host);
}
window.addEventListener("hashchange", function(){ render(location.hash); });

/* service clock in the nav */
function clock(){
  const n = document.getElementById("svc-clock");
  if (!n) return;
  const d = new Date();
  const mins = d.getHours()*60+d.getMinutes();
  const D = window.DATA;
  let state = "Closed";
  if (mins>=D.SERVICE_OPEN && mins<=D.SERVICE_LAST) state="Seating now";
  else if (mins>D.SERVICE_LAST && mins<=D.SERVICE_CLOSE) state="Last tables";
  else if (mins<D.SERVICE_OPEN) state="Opens "+D.hhmm(D.SERVICE_OPEN);
  n.textContent = U.hhmm(d)+" \u00b7 "+state;
}
setInterval(clock, 1000);

document.addEventListener("DOMContentLoaded", function(){
  clock();
  setInterval(function(){ window.DATA.sweepHolds(); }, 1000);
  render(location.hash || "#/home");
  const y = document.getElementById("yr"); if (y) y.textContent = new Date().getFullYear();
});
})();
