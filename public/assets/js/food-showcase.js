"use strict";
(() => {
  const section = document.querySelector("#food-showcase");
  if (!section || document.body.dataset.page === "manage") return;
  const gallery = section.querySelector(".food-gallery");
  const video = section.querySelector("#food-cooking-video");
  let videoVisible = false, videoFailed = false;
  video?.addEventListener("error", () => { videoFailed = true; video.hidden = true; });
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
  let frame = null, lastFrame = null, position = 0, direction = 1;
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
  function drift(timestamp) {
    const elapsed = lastFrame === null ? 0 : Math.min(timestamp - lastFrame, 64);
    lastFrame = timestamp;
    const end = Math.max(0, gallery.scrollWidth - gallery.clientWidth);
    position += direction * elapsed * 0.018;
    if (position >= end) { position = end; direction = -1; }
    if (position <= 0) { position = 0; direction = 1; }
    gallery.scrollLeft = position;
    frame = requestAnimationFrame(drift);
  }
  function update() {
    const enabled = !reduced.matches;
    const running = enabled && visible && !document.hidden && !paused && !hovered && !focused;
    section.dataset.motionReady = String(enabled && desktop.matches);
    section.dataset.mobileMotion = String(enabled && !desktop.matches);
    section.dataset.running = String(running);
    if (running && !desktop.matches) {
      if (frame === null) {
        position = gallery.scrollLeft;
        lastFrame = null;
        frame = requestAnimationFrame(drift);
      }
    } else if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      lastFrame = null;
    }
    if (video) {
      if (enabled && videoVisible && !document.hidden && !paused && !videoFailed) {
        if (!video.getAttribute("src")) video.src = video.dataset.src;
        if (video.paused) video.play().catch(() => {});
      } else video.pause();
    }
    control.hidden = !enabled;
    control.textContent = paused ? "Resume motion" : "Pause motion";
    control.setAttribute("aria-pressed", String(paused));
  }
  control.addEventListener("click", () => { paused = !paused; update(); });
  // Keep manual phone swipes in control until the guest chooses Resume.
  gallery.addEventListener("pointerdown", () => {
    if (!desktop.matches && !reduced.matches) { paused = true; update(); }
  });
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
    for (const entry of entries) {
      if (entry.target === gallery) visible = entry.isIntersecting;
      if (entry.target === video) videoVisible = entry.isIntersecting;
    }
    update();
  });
  observer.observe(gallery);
  if (video) observer.observe(video);
  update();
})();
