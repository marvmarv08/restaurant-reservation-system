"use strict";
(() => {
  const bookingTargets = new Set(["#booking", "#rooms", "#menu", "#food-showcase"]);
  function forwardBookingBookmark() {
    if (!bookingTargets.has(location.hash)) return false;
    location.replace("/reserve" + location.search + location.hash);
    return true;
  }
  if (forwardBookingBookmark()) return;
  window.addEventListener("hashchange", forwardBookingBookmark);

  const image = document.querySelector(".intro-backdrop img");
  if (!image) return;
  const hero = image.closest(".intro-hero");
  const reduced = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const control = document.getElementById("garden-toggle");
  const storageKey = "bellaVista.intro.garden.v1";
  let paused = false;
  try { paused = localStorage.getItem(storageKey) === "paused"; } catch { /* Optional preference storage. */ }
  let visible = true;
  function syncGarden() {
    const ready = Boolean(control && reduced && !reduced.matches && image.complete && image.naturalWidth);
    document.body.dataset.gardenReady = String(ready);
    document.body.dataset.gardenRunning = String(ready && !paused && visible && !document.hidden);
    if (control) {
      control.hidden = !ready;
      control.dataset.paused = String(paused);
      const label = paused ? "Resume garden animation" : "Pause garden animation";
      control.setAttribute("aria-label", label);
      control.title = label;
    }
  }
  control?.addEventListener("click", () => {
    paused = !paused;
    try { localStorage.setItem(storageKey, paused ? "paused" : "enabled"); } catch { /* Control works without storage. */ }
    syncGarden();
  });
  image.addEventListener("load", syncGarden);
  image.addEventListener("error", syncGarden);
  reduced?.addEventListener("change", syncGarden);
  document.addEventListener("visibilitychange", syncGarden);
  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncGarden(); });
    observer.observe(hero);
  } else {
    const updateVisibility = () => { const box = hero.getBoundingClientRect(); visible = box.bottom > 0 && box.top < innerHeight; syncGarden(); };
    document.addEventListener("scroll", updateVisibility, {passive: true});
    window.addEventListener("resize", updateVisibility, {passive: true});
    updateVisibility();
  }
  syncGarden();
  const reveals = new Set();
  function cancelReveals() {
    for (const animation of reveals) animation.cancel();
    reveals.clear();
  }
  image.addEventListener("error", () => hero.classList.add("intro-image-unavailable"));
  image.addEventListener("load", () => hero.classList.toggle("intro-image-unavailable", !image.naturalWidth));
  if (image.complete && !image.naturalWidth) hero.classList.add("intro-image-unavailable");
  const update = () => { if (reduced?.matches || document.hidden) cancelReveals(); };
  reduced?.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);

  // Content is visible in base HTML. These one-time effects never gate reading or navigation.
  if (typeof IntersectionObserver === "function" && typeof Element.prototype.animate === "function") {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        observer.unobserve(target);
        const section = target.closest("section");
        if (reduced?.matches || document.hidden || location.hash === "#" + section?.id) continue;
        try {
          const animation = target.animate([
            { opacity: .85, transform: "translateY(8px)" },
            { opacity: 1, transform: "none" },
          ], { duration: 360, easing: "cubic-bezier(.2,.65,.3,1)", id: "intro-story-reveal" });
          reveals.add(animation);
          const clear = () => reveals.delete(animation);
          animation.finished.then(clear, clear);
        } catch { /* Unsupported animation must leave normal content visible. */ }
      }
    }, { threshold: .12 });
    document.querySelectorAll("#about .company-intro, #about .company-emblem, #history .history-layout > div").forEach(target => observer.observe(target));
  }
})();
