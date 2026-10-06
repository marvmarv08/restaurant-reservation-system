"use strict";
(() => {
  const section = document.querySelector("#food-showcase");
  if (!section || document.body.dataset.page === "manage") return;
  const gallery = section.querySelector(".food-gallery");
  for (const image of gallery.querySelectorAll("img")) {
    const failed = () => image.closest("figure").classList.add("food-image-missing");
    image.addEventListener("error", failed, {once: true});
    if (image.complete && !image.naturalWidth) failed();
  }
  // Without visibility observation, retain the complete static gallery.
  if (typeof IntersectionObserver !== "function") return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width: 761px)");
  const control = section.querySelector(".food-motion-toggle");
  let visible = false, paused = false, hovered = false, focused = false;
  for (const group of gallery.querySelectorAll(".food-set")) {
    const copy = group.cloneNode(true);
    copy.dataset.copy = "true";
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    for (const figure of copy.querySelectorAll("figure")) figure.setAttribute("aria-hidden", "true");
    for (const image of copy.querySelectorAll("img")) {
      image.alt = "";
      image.addEventListener("error", () => image.closest("figure").classList.add("food-image-missing"), {once: true});
    }
    group.after(copy);
  }
  function update() {
    const enabled = desktop.matches && !reduced.matches;
    section.dataset.motionReady = String(enabled);
    section.dataset.running = String(enabled && visible && !document.hidden && !paused && !hovered && !focused);
    control.hidden = !enabled;
    control.textContent = paused ? "Resume motion" : "Pause motion";
    control.setAttribute("aria-pressed", String(paused));
  }
  control.addEventListener("click", () => { paused = !paused; update(); });
  gallery.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") { hovered = true; update(); }
  });
  gallery.addEventListener("pointerleave", () => { hovered = false; update(); });
  gallery.addEventListener("focusin", () => { focused = true; update(); });
  gallery.addEventListener("focusout", () => {
    queueMicrotask(() => { focused = gallery.contains(document.activeElement); update(); });
  });
  reduced.addEventListener("change", update);
  desktop.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    update();
  });
  observer.observe(gallery);
  update();
})();
