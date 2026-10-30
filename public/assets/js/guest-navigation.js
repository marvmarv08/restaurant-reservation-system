"use strict";
(() => {
  if (document.body.dataset.page === "manage") return;
  const header = document.querySelector(".site-header");
  if (!header) return;
  const sections = ["booking", "about", "history", "rooms", "menu"].map(id => ({
    section: document.getElementById(id),
    link: [...header.querySelectorAll("a[href]")].find(link => {
      const url = new URL(link.href);
      return url.pathname === location.pathname && url.hash === `#${id}`;
    }),
  })).filter(item => item.section && item.link);
  let scheduled = false;
  function update() {
    scheduled = false;
    const edge = header.getBoundingClientRect().height + 160;
    let current = sections[0];
    for (const item of sections) {
      if (item.section.getBoundingClientRect().top <= edge) current = item;
    }
    for (const item of sections) {
      if (item === current) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  document.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("hashchange", schedule);
  update();
})();
