"use strict";
(() => {
  // Only known local assets are accepted; database image keys are never used as URLs.
  const photos = new Map(Object.entries({
  "oyster": "/assets/images/food-showcase/oysters.jpg",
  "taro": "/assets/images/menu/chips.jpg",
  "bread": "/assets/images/food-showcase/bread.jpg",
  "tartare": "/assets/images/menu/tartare.jpg",
  "kinilaw": "/assets/images/menu/kinilaw.jpg",
  "scallop": "/assets/images/menu/scallop.jpg",
  "tomato": "/assets/images/menu/tomato.jpg",
  "tataki": "/assets/images/menu/beef.jpg",
  "grouper": "/assets/images/food-showcase/fish.jpg",
  "duck": "/assets/images/menu/duck.jpg",
  "belly": "/assets/images/food-showcase/pork.jpg",
  "cabbage": "/assets/images/menu/cabbage.jpg",
  "marrow": "/assets/images/menu/marrow.jpg",
  "squid": "/assets/images/menu/squid.jpg",
  "lamb": "/assets/images/menu/lamb.jpg",
  "adobo": "/assets/images/menu/adobo.jpg",
  "karekare": "/assets/images/menu/karekare.jpg",
  "sinigang": "/assets/images/menu/sinigang.jpg",
  "laing": "/assets/images/menu/risotto.jpg",
  "pancit": "/assets/images/menu/noodles.jpg",
  "rice": "/assets/images/menu/rice.jpg",
  "greens": "/assets/images/menu/greens.jpg",
  "flan": "/assets/images/menu/flan.jpg",
  "souffle": "/assets/images/menu/ube.jpg",
  "mango": "/assets/images/menu/mango.jpg",
  "tart": "/assets/images/food-showcase/dessert.jpg",
  "halohalo": "/assets/images/menu/halohalo.jpg",
  "highball": "/assets/images/food-showcase/cocktail.jpg",
  "negroni": "/assets/images/menu/red-cocktail.jpg",
  "oldfash": "/assets/images/food-showcase/cocktail.jpg",
  "tepache": "/assets/images/menu/pineapple.jpg",
  "icedtea": "/assets/images/menu/tea.jpg",
  "espresso": "/assets/images/menu/espresso.jpg",
  "tasting11": "/assets/images/menu/tasting.jpg",
  "tasting7": "/assets/images/menu/tasting.jpg",
  "pairing": "/assets/images/menu/wine.jpg"
}));
  const featurePhotos = new Map([["kinilaw", "/assets/images/menu/kinilaw-feature.jpg"]]);
  let viewer;
  function openPhoto(path, name, trigger) {
    if (!viewer) {
      const dialog = document.createElement("dialog");
      dialog.id = "menu-photo-dialog";
      dialog.className = "menu-photo-dialog";
      dialog.setAttribute("aria-labelledby", "menu-photo-title");
      dialog.innerHTML = `<header class="menu-photo-heading"><h2 id="menu-photo-title"></h2><button type="button" class="button ghost" autofocus aria-label="Close photo">Close <span aria-hidden="true">×</span></button></header><img class="menu-photo-full" alt=""><p id="menu-photo-error" role="status" hidden>Photo unavailable. Please try again later.</p><p class="menu-photo-disclosure">Illustrative menu photography. Actual presentation may vary.</p>`;
      const image = dialog.querySelector("img");
      const error = dialog.querySelector("#menu-photo-error");
      image.addEventListener("error", () => { image.hidden = true; error.hidden = false; });
      const close = dialog.querySelector("button");
      close.addEventListener("click", () => dialog.close());
      dialog.addEventListener("keydown", event => {
        if (event.key === "Tab") { event.preventDefault(); close.focus(); }
      });
      // Require both ends of a pointer gesture outside the panel, so dragging
      // from the photograph onto the backdrop does not dismiss it accidentally.
      let startedOutside = false;
      const outside = event => {
        const box = dialog.getBoundingClientRect();
        return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      };
      dialog.addEventListener("pointerdown", event => { startedOutside = outside(event); });
      dialog.addEventListener("click", event => { if (startedOutside && outside(event)) dialog.close(); startedOutside = false; });
      dialog.addEventListener("close", () => {
        document.documentElement.style.overflow = viewer.previousOverflow;
        viewer.trigger?.focus({preventScroll: true});
      });
      document.body.append(dialog);
      viewer = {dialog, image, error};
    }
    if (viewer.dialog.open) return;
    viewer.trigger = trigger;
    viewer.previousOverflow = document.documentElement.style.overflow;
    viewer.dialog.querySelector("h2").textContent = name;
    viewer.image.alt = `Illustrative photograph for ${name}`;
    viewer.image.hidden = false;
    viewer.error.hidden = true;
    viewer.image.src = path;
    viewer.dialog.showModal();
    document.documentElement.style.overflow = "hidden";
  }
  function create(key, {featured = false, name = "Menu dish"} = {}) {
    const path = (featured ? featurePhotos.get(key) : null) || photos.get(key);
    const wrapper = document.createElement(path ? "button" : "div");
    wrapper.className = "menu-image";
    if (path) {
      wrapper.type = "button";
      wrapper.setAttribute("aria-label", `View photo of ${name}`);
      wrapper.setAttribute("aria-haspopup", "dialog");
      wrapper.title = "View larger photo";
      wrapper.addEventListener("click", () => openPhoto(path, name, wrapper));
    } else wrapper.setAttribute("aria-hidden", "true");
    const fallback = document.createElement("span");
    fallback.className = "menu-image-fallback";
    fallback.textContent = "Photo pending";
    if (!path) {
      wrapper.classList.add("is-missing");
      wrapper.append(fallback);
      return wrapper;
    }
    fallback.hidden = true;
    const image = document.createElement("img");
    image.alt = "";
    image.width = 320;
    image.height = 320;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.hidden = true;
      fallback.hidden = false;
      wrapper.classList.add("is-missing");
      wrapper.disabled = true;
      wrapper.setAttribute("aria-label", `Photo unavailable for ${name}`);
    }, {once: true});
    image.src = path;
    wrapper.append(image, fallback);
    return wrapper;
  }
  window.LuminaMenuPhotos = Object.freeze({create});
})();
