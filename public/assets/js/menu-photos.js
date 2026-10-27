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
  function create(key, {featured = false} = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "menu-image";
    wrapper.setAttribute("aria-hidden", "true");
    const fallback = document.createElement("span");
    fallback.className = "menu-image-fallback";
    fallback.textContent = "Photo pending";
    const path = (featured ? featurePhotos.get(key) : null) || photos.get(key);
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
    }, {once: true});
    image.src = path;
    wrapper.append(image, fallback);
    return wrapper;
  }
  window.LuminaMenuPhotos = Object.freeze({create});
})();
