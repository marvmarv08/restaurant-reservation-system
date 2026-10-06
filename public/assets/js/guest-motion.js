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
    const token = kind === "hero" ? "brand" : kind === "menu" ? "feedback" : "content";
    const duration = parseFloat(style.getPropertyValue("--motion-" + token)) || 180;
    const distance = kind === "hero" ? 6 : kind === "menu" ? 0 : 4;
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

  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      for (const animation of running) animation.cancel();
      running.clear();
    }
  });
  window.LuminaGuestMotion = Object.freeze({ enter, stop });
  if (document.body.dataset.page !== "manage") enter(document.querySelector(".hero-copy"), "hero");
})();
