"use strict";
(() => {
  const gallery = document.querySelector(".restaurant-gallery");
  if (!gallery) return;
  const cards = [...gallery.querySelectorAll(".photo-fan-card")];
  const dots = [...gallery.querySelectorAll(".gallery-dot")];
  const controls = gallery.querySelector(".gallery-controls");
  const caption = gallery.querySelector(".gallery-caption");
  const status = gallery.querySelector(".gallery-status");
  if (cards.length < 2 || !controls || !caption || !status) return;
  let active = 0;

  function show(index, announce = true) {
    const oldFocused = cards.includes(document.activeElement);
    active = ((index % cards.length) + cards.length) % cards.length;
    cards.forEach((card, i) => {
      let slot = (i - active + cards.length) % cards.length;
      if (slot > Math.floor(cards.length / 2)) slot -= cards.length;
      card.dataset.slot = String(slot);
      const visible = Math.abs(slot) <= 2;
      card.dataset.visible = String(visible);
      if (visible) card.removeAttribute("aria-hidden");
      else card.setAttribute("aria-hidden", "true");
      card.tabIndex = i === active ? 0 : -1;
      if (i === active) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
      card.setAttribute("aria-label", i === active ? `Next photo; currently ${card.dataset.title}` : `Show photo ${i + 1}: ${card.dataset.title}`);
    });
    const joined = active === cards.length - 1 ? active - 1 : active + 1;
    dots.forEach((dot, i) => {
      dot.dataset.joined = String(i === joined);
      if (i === active) dot.dataset.bridge = active === cards.length - 1 ? "backward" : "forward";
      else delete dot.dataset.bridge;
      if (i === active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    caption.textContent = cards[active].dataset.title;
    if (announce) status.textContent = `Photo ${active + 1} of ${cards.length}: ${cards[active].dataset.title}`;
    if (oldFocused) cards[active].focus({ preventScroll: true });
  }

  cards.forEach((card, index) => {
    card.setAttribute("role", "button");
    card.addEventListener("click", event => {
      event.preventDefault();
      show(index === active ? active + 1 : index);
    });
    card.addEventListener("keydown", event => {
      if (event.key !== " ") return;
      event.preventDefault();
      card.click();
    });
    const image = card.querySelector("img");
    if (!image) return;
    const failed = () => {
      image.hidden = true;
      const fallback = card.querySelector(".photo-fallback");
      if (fallback) fallback.hidden = false;
    };
    image.addEventListener("error", failed);
    image.addEventListener("load", () => {
      image.hidden = false;
      const fallback = card.querySelector(".photo-fallback");
      if (fallback) fallback.hidden = true;
    });
    if (image.complete && !image.naturalWidth) failed();
  });
  dots.forEach((dot, index) => dot.addEventListener("click", () => show(index)));
  gallery.addEventListener("keydown", event => {
    let target;
    if (event.key === "ArrowRight") target = active + 1;
    else if (event.key === "ArrowLeft") target = active - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = cards.length - 1;
    else return;
    event.preventDefault();
    show(target);
  });
  show(0, false);
  controls.hidden = false;
  gallery.dataset.ready = "true";
})();
