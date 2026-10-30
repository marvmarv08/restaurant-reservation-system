"use strict";
(() => {
  if (document.body.dataset.page === "manage") return;
  const subscribers = new Set();
  let active = false, timer;
  function setActive(value) {
    if (active === value) return;
    active = value;
    for (const listener of subscribers) listener();
  }
  window.LuminaScrollActivity = Object.freeze({
    get active() { return active; },
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  });
  // Observe viewport scrolling only; horizontal gallery swipes remain independent.
  document.addEventListener("scroll", () => {
    clearTimeout(timer);
    setActive(true);
    timer = setTimeout(() => setActive(false), 160);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    clearTimeout(timer);
    setActive(false);
  });
})();
