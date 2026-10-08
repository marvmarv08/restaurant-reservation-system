"use strict";
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new WeakMap();
  const running = new Set();

  function stop(target) {
    const animation = animations.get(target);
    if (!animation) return;
    animation.cancel();
    running.delete(animation);
    animations.delete(target);
  }

  function enter(target, kind = "content") {
    if (!target) return;
    stop(target);
    if (reduced.matches || !target.isConnected || typeof target.animate !== "function") return;
    const style = getComputedStyle(target);
    const token = (kind === "hero" || kind === "room") ? "brand" : kind === "menu" ? "feedback" : "content";
    const duration = parseFloat(style.getPropertyValue("--motion-" + token)) || 180;
    const distance = (kind === "hero" || kind === "room") ? 6 : kind === "menu" ? 0 : 4;
    let animation;
    try {
      animation = target.animate([
        { opacity: .85, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: "none" },
      ], { duration, easing: style.getPropertyValue("--motion-ease-enter").trim() || "ease-out" });
    } catch {
      return;
    }
    animation.id = "guest-" + kind;
    animations.set(target, animation);
    running.add(animation);
    const finish = () => {
      running.delete(animation);
      if (animations.get(target) === animation) animations.delete(target);
    };
    // No navigation, focus or request depends on an animation finishing.
    animation.finished.then(finish, finish);
  }

  function revealRooms(root) {
    if (!root || typeof IntersectionObserver !== "function" || typeof Element.prototype.animate !== "function") return;
    const photos = [...root.querySelectorAll(".room-art")];
    let remaining = photos.length;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        enter(entry.target, "room");
        if (--remaining === 0) observer.disconnect();
      }
    }, { threshold: 0.15 });
    for (const photo of photos) observer.observe(photo);
  }

  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      for (const animation of running) animation.cancel();
      running.clear();
    }
  });
  window.LuminaGuestMotion = Object.freeze({ enter, stop, revealRooms });
  if (document.body.dataset.page !== "manage") enter(document.querySelector(".hero-copy"), "hero");
})();
