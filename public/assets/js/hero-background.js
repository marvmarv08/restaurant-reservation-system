"use strict";
(() => {
  const video = document.querySelector("#hero-dining-video");
  if (!video || document.body.dataset.page === "manage" || typeof IntersectionObserver !== "function") return;
  const backdrop = video.closest(".hero-backdrop");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const scroll = window.LuminaScrollActivity;
  let visible = false, failed = false, attempt = 0;
  const shouldPlay = () => visible && !reduced.matches && !document.hidden && !failed && !scroll?.active;
  function update() {
    const token = ++attempt;
    if (!shouldPlay()) {
      video.pause();
      // Keep the last decoded frame during scrolling instead of flashing the poster.
      if (!scroll?.active || !visible || reduced.matches || document.hidden || failed) backdrop.dataset.playing = "false";
      return;
    }
    if (!video.getAttribute("src")) video.src = video.dataset.src;
    video.play().then(() => {
      // A late play promise must not restart motion after scrolling away or changing preferences.
      if (token !== attempt) return;
      if (shouldPlay()) backdrop.dataset.playing = "true";
      else { video.pause(); backdrop.dataset.playing = "false"; }
    }).catch(() => {
      if (token === attempt) backdrop.dataset.playing = "false";
    });
  }
  scroll?.subscribe(update);
  video.addEventListener("error", () => { failed = true; update(); });
  reduced.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    update();
  });
  observer.observe(video.closest(".hero"));
})();
