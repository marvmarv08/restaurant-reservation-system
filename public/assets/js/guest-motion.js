"use strict";
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new WeakMap();
  const running = new Set();
  const scroll = window.LuminaScrollActivity;

  function stop(target) {
    const animation = animations.get(target);
    if (!animation) return;
    animation.cancel();
    running.delete(animation);
    animations.delete(target);
  }

  function enter(target, kind = "content", delay = 0) {
    if (!target) return;
    stop(target);
    if (reduced.matches || scroll?.active || !target.isConnected || typeof target.animate !== "function") return;
    const style = getComputedStyle(target);
    const token = kind === "heading" ? "heading" : (kind === "hero" || kind === "room") ? "brand" : kind === "menu" ? "feedback" : "content";
    const duration = parseFloat(style.getPropertyValue("--motion-" + token)) || 180;
    const distance = kind === "heading" ? 8 : (kind === "hero" || kind === "room") ? 6 : kind === "menu" ? 0 : 4;
    let animation;
    try {
      animation = target.animate([
        { opacity: .85, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: "none" },
      ], { duration, delay, easing: style.getPropertyValue("--motion-ease-enter").trim() || "ease-out" });
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

  scroll?.subscribe(() => {
    if (!scroll.active) return;
    for (const animation of running) animation.cancel();
    running.clear();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      for (const animation of running) animation.cancel();
      running.clear();
    }
  });
  window.LuminaGuestMotion = Object.freeze({ enter, stop, revealRooms });
  if (document.body.dataset.page === "manage") return;
  const groups = [...document.querySelectorAll(".hero-copy, .food-copy, .section-heading")];
  const reveal = group => {
    const parts = [...group.querySelectorAll(".eyebrow, h1, h2, .hero-description")];
    if (group.classList.contains("section-heading")) {
      const supporting = group.querySelector(":scope > p");
      if (supporting) parts.push(supporting);
    }
    parts.forEach((part, index) => enter(part, "heading", index * 45));
  };
  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        reveal(entry.target);
      }
    }, { threshold: .15 });
    groups.forEach(group => observer.observe(group));
  }

})();
