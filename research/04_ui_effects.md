# 04 - UI / Visual Effects Research (Vanilla CSS + Vanilla JS)

Project: table reservation system (multi-page PHP app). Goal: win a class competition on live-demo impact.
Constraints: no framework, no build step. CDN script tags allowed.

Legend: **DESIGN** = proposed but untested in this repo. Browser support numbers below were read from MDN browser-compat-data (raw.githubusercontent.com/mdn/browser-compat-data, main branch, fetched this session). Anything not listed there is marked NOT_FOUND rather than guessed.

Verified support table (source: mdn/browser-compat-data main):

| Feature | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| `Document.startViewTransition()` (same-doc) | 111 | mirror | 144 | 18 |
| `@view-transition` (cross-document) | 126 | mirror | **not supported (false)** | 18.2 |
| `animation-timeline` (scroll/view) | 115 | mirror | preview only | 26 |
| `timeline-scope` | 116 | mirror | preview only | 26 |
| `backdrop-filter` | 76 | 79 | 103 | 18 unprefixed / 9 with `-webkit-` |
| Container queries (`@container`) | 105 | mirror | 110 | 16 |
| `:has()` | 105 | mirror | 121 | 15.4 |
| `scroll-behavior` | 61 | - | 36 | 15.4 |

Read as: scroll-driven CSS animations and cross-document view transitions are **Chromium/Safari-only today**. Demo on Chrome or Edge; always ship a fallback so Firefox degrades to static, not broken.

Reference URLs:
- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations
- https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- https://developer.mozilla.org/en-US/docs/Web/CSS/@container
- https://developer.mozilla.org/en-US/docs/Web/CSS/:has
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- https://web.dev/articles/view-transitions (Chrome team write-ups)
- https://caniuse.com/view-transitions , https://caniuse.com/css-scroll-timeline , https://caniuse.com/css-backdrop-filter

---

## Visual language of award-winning hospitality sites

Galleries surveyed as references (public, read-only): awwwards.com/websites/restaurant, cssdesignawards.com, godly.website, land-book.com, siteinspire.com/categories/food-drink. GitHub "awwwards clone" repos were checked for implementation patterns (they are mostly GSAP + Locomotive/Lenis + CSS grid). **DESIGN** note: the synthesis below is a pattern summary, not a quote from any single site.

Recurring visual language:

1. **Editorial, print-borrowed layout.** Asymmetric 12-column grid, generous negative space, oversized section numbers ("01 / Menu"), hairline rules, and a deliberately broken grid where one image bleeds off-canvas. Restaurant sites read like a magazine spread, not a SaaS landing page.
2. **Typography pairing = one expressive display + one quiet neutral.** Display is a high-contrast serif (didone / transitional) or a wide grotesque, set at `clamp()` sizes up to 12-18vw for the hero word. Body is a neutral grotesque at 16-18px with 1.6 line-height and generous `letter-spacing: -0.01em` on headings only. Small caps + wide tracking for eyebrow labels.
3. **Two dominant colour systems.**
   - *Dark luxe*: near-black base (not #000), warm paper-white text, single metallic/ember accent (amber, copper, saffron), film-grain overlay. Signals fine dining, evening service, price point.
   - *Warm minimal*: bone/cream base, espresso text, terracotta or olive accent. Signals bakery, brunch, farm-to-table.
   Pick one and commit. Mixing both is the #1 "template" tell.
4. **Food photography is the hero, treated like fashion photography.** Full-bleed, tight crop, shallow depth of field, single dish per viewport. Treatments: subtle scale-on-scroll (1.0 -> 1.08), `clip-path` reveal wipes, duotone/grain overlay via `mix-blend-mode`, and a dark bottom gradient so text stays legible. Never a 3-up grid of stock food thumbnails.
5. **Motion personality: slow, heavy, confident.** Durations 600-1200ms for reveals, custom easing that starts fast and settles (`cubic-bezier(.16,1,.3,1)`), staggered children 60-90ms apart. Luxury reads as *weight*, not bounce. Avoid springy overshoot; that reads as "app", not "restaurant".
6. **Micro-interaction density.** Custom cursor, magnetic buttons, link underline that draws in, hover state on every single interactive element, and an intentional page-transition curtain. Judges notice that *nothing feels dead*.
7. **Structural signature moves.** Pinned horizontal menu gallery; a sticky stacked-cards "our story" section; a marquee ticker of dish names; and a reservation CTA that follows the user as a floating pill.
8. **Loading as theatre.** A 700-1200ms branded preloader with a counter or a wiping mask. Cheap to build, disproportionately impressive, and it hides font-swap flash.

Anti-patterns that scream template: centered everything, three equal feature cards with icons, carousel with dots and no reason, drop shadows on everything, default `border-radius: 8px` on all surfaces, Bootstrap-ish 1140px container, emoji as icons.

---

## Effects catalogue (with snippets)

All snippets are vanilla. Every motion block assumes the global reduced-motion guard at the end of this section.

### 1. CSS scroll-driven animations + IntersectionObserver fallback
**What:** `animation-timeline: view()` ties an animation's progress to an element's position in the viewport; `scroll()` ties it to a scroll container. Runs off the main thread, so it is the cheapest possible scroll effect.
**Where:** section reveals, hero image scale, a top-of-page scroll progress bar, menu card fade-ups.
**Cost:** near zero (compositor-driven). No JS, no scroll listener.
**Support:** Chrome 115, Safari 26, Firefox preview only. Must feature-detect.
**A11y:** wrap in reduced-motion guard; reveals must end at `opacity:1` so content is never trapped invisible.

```css
@keyframes reveal-up {
  from { opacity: 0; transform: translateY(2.5rem); }
  to   { opacity: 1; transform: none; }
}
@supports (animation-timeline: view()) {
  .reveal {
    animation: reveal-up linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 35%;
  }
}
/* scroll progress bar */
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.progress {
  position: fixed; inset: 0 0 auto; height: 3px; transform-origin: 0 50%;
  background: var(--accent);
  animation: grow linear both;
  animation-timeline: scroll(root block);
}
```

```js
// Fallback for Firefox / older Safari
if (!CSS.supports('animation-timeline: view()')) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}
```
```css
.is-in { animation: reveal-up .8s cubic-bezier(.16,1,.3,1) both; }
```

### 2. View Transitions API (same-document AND cross-document)
**What:** the browser snapshots old and new DOM and animates between them. Cross-document `@view-transition { navigation: auto; }` gives a **multi-page PHP app SPA-grade transitions with zero JS**. This is the single biggest "how did you do that without React" moment available.
**Where:** every page nav (home -> menu -> reserve -> confirmation); the dish card that morphs into the dish detail hero; theme toggle cross-fade.
**Cost:** one snapshot per navigation; avoid assigning `view-transition-name` to more than ~10 elements or you pay layout cost per snapshot.
**Support:** `startViewTransition()` Chrome 111 / Safari 18 / Firefox 144. `@view-transition` cross-document Chrome 126 / Safari 18.2 / **Firefox not supported**. Degrades to a normal instant navigation, so it is safe to ship.
**A11y:** transitions ignore reduced-motion by default. You must opt out manually.

```css
/* cross-document: put this in the SAME stylesheet on both pages */
@view-transition { navigation: auto; }

::view-transition-group(*) { animation-duration: .5s; animation-timing-function: cubic-bezier(.16,1,.3,1); }
::view-transition-old(root) { animation: fade-out .35s both; }
::view-transition-new(root) { animation: fade-in .45s both; }

/* morph a dish card into the detail hero: same name on both pages */
.dish-card__img[data-dish="truffle-risotto"],
.dish-hero__img[data-dish="truffle-risotto"] { view-transition-name: dish-truffle-risotto; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

PHP tip: generate the name server-side so each dish gets a unique, matching name on both pages:
```php
<img class="dish-card__img" style="view-transition-name: dish-<?= htmlspecialchars($dish['slug']) ?>" ...>
```
Note: `view-transition-name` must be unique per snapshot; two visible elements sharing a name aborts the transition.

Same-document version (used for the booking stepper and theme toggle):
```js
function transition(update) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { update(); return; }
  document.startViewTransition(update);
}
```

### 3. GSAP + ScrollTrigger patterns
**What:** the industry-standard tween engine. ScrollTrigger adds pinning, scrubbing and snapping.
**Where:** pinned horizontal menu gallery, stacked story cards, split-text hero headline, staggered dish reveals.
**Cost:** ~70KB gzipped for gsap + ScrollTrigger. Real but acceptable *if* it carries 3+ signature effects. Do not load it for one fade.
**A11y:** kill all ScrollTriggers under reduced-motion.

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js"></script>
```

```js
gsap.registerPlugin(ScrollTrigger);

// (a) pinned horizontal gallery
const track = document.querySelector('.gallery__track');
gsap.to(track, {
  x: () => -(track.scrollWidth - innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: '.gallery', start: 'top top',
    end: () => '+=' + (track.scrollWidth - innerWidth),
    pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
  }
});

// (b) staggered dish reveal
gsap.from('.dish-card', {
  y: 48, opacity: 0, duration: .9, ease: 'power3.out', stagger: .08,
  scrollTrigger: { trigger: '.menu-grid', start: 'top 75%' }
});

// (c) split-text hero (SplitText is now free in GSAP 3.13+; otherwise split manually)
const h = document.querySelector('.hero h1');
h.innerHTML = h.textContent.replace(/\S+/g, w => `<span class="w"><i>${w}</i></span>`);
gsap.from('.hero h1 .w i', { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: .06 });

// (d) pinned stacked cards
gsap.utils.toArray('.story-card').forEach((card, i, arr) => {
  ScrollTrigger.create({ trigger: card, start: 'top 12%', endTrigger: arr[arr.length-1], end: 'top 12%', pin: true, pinSpacing: false });
});
```
```css
.hero h1 .w { display: inline-block; overflow: hidden; }
.hero h1 .w i { display: inline-block; font-style: normal; }
```
Reduced motion: `if (matchMedia('(prefers-reduced-motion: reduce)').matches) { ScrollTrigger.getAll().forEach(t => t.kill()); gsap.globalTimeline.clear(); }`

### 4. Smooth scroll: Lenis vs CSS-only, and when it hurts
**CSS-only (free, zero risk):**
```css
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
```
Supported Chrome 61 / Firefox 36 / Safari 15.4. This only affects anchor jumps, not wheel inertia.

**Lenis** hijacks the wheel to add inertia. It makes GSAP scrub effects feel premium and is what most Awwwards sites use.
```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js"></script>
```
```js
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
```
**When smooth scroll hurts:** long menu or admin tables (users want instant), trackpad users who already have inertia (feels mushy/laggy), `Ctrl+F` browser find (scroll position fights the hijack), keyboard and screen-reader focus jumps, and anything that must respond to a judge rapidly scrolling to find a feature. **Rule: Lenis on marketing pages only. Never on /admin, /kitchen, or the reservation form.** Also note it conflicts with CSS `scroll-behavior: smooth` and with scroll-driven `animation-timeline` in some setups; pick one mechanism per page.

### 5. Glassmorphism, done tastefully
**Where:** the sticky nav bar over food photography, the floating reserve-a-table pill, modal/dialog backdrop. Nowhere else.
**Cost:** `backdrop-filter: blur()` forces a new compositing layer and re-blurs on every paint behind it. **The trap:** a blurred element over a scrolling/animating background, or a large blurred area, will tank FPS on integrated-GPU laptops, exactly the demo-day machine. Keep blurred surfaces small, few (<=2 on screen), and avoid animating anything behind them.
**Support:** Chrome 76, Edge 79, Firefox 103, Safari 18 unprefixed (Safari 9 with `-webkit-`). Always ship `-webkit-backdrop-filter` too.
**A11y:** contrast. Always put a semi-opaque tint *under* the blur so text passes 4.5:1 even if the blur fails.

```css
.nav {
  background: color-mix(in oklab, var(--surface) 72%, transparent);
  border-bottom: 1px solid var(--hairline);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nav {
    background: color-mix(in oklab, var(--surface) 45%, transparent);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
            backdrop-filter: blur(14px) saturate(140%);
  }
}
```

### 6. Magnetic cursor, custom cursor, tilt, image hover reveal, clip-path wipes
**Cost:** all cheap if you only write `transform` and you throttle with rAF. Never animate `top/left/width`.
**A11y:** every one of these is pointer-only. Gate on `(hover: hover) and (pointer: fine)` and on reduced-motion. A custom cursor must never hide the real cursor on touch, and must not reduce the visible focus ring.

```js
// custom cursor dot + magnetic buttons
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot = document.querySelector('.cursor');
  let x = 0, y = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
  (function loop() {
    tx += (x - tx) * .18; ty += (y - ty) * .18;
    dot.style.transform = `translate3d(${tx}px,${ty}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const mx = (e.clientX - r.left - r.width / 2) * .25;
      const my = (e.clientY - r.top - r.height / 2) * .25;
      btn.style.transform = `translate(${mx}px, ${my}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });

  // 3D tilt on dish cards
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty('--rx', (-py * 8) + 'deg');
      card.style.setProperty('--ry', (px * 10) + 'deg');
      card.style.setProperty('--mx', (px * 100 + 50) + '%');
      card.style.setProperty('--my', (py * 100 + 50) + '%');
    });
    card.addEventListener('pointerleave', () => card.style.cssText = '');
  });
}
```
```css
[data-tilt] {
  transform: perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0));
  transition: transform .4s cubic-bezier(.16,1,.3,1);
  will-change: transform;
}
[data-tilt]::after { /* specular sheen follows pointer */
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(240px at var(--mx,50%) var(--my,50%), rgb(255 255 255 / .16), transparent 70%);
}

/* image hover reveal via clip-path wipe */
.dish-card__img { clip-path: inset(0 0 0 0); transition: clip-path .7s cubic-bezier(.16,1,.3,1), transform .7s; }
.dish-card:hover .dish-card__img { transform: scale(1.06); }
.reveal-wipe { clip-path: inset(0 0 100% 0); transition: clip-path 1s cubic-bezier(.16,1,.3,1); }
.reveal-wipe.is-in { clip-path: inset(0 0 0 0); }

/* link underline draw-in */
.link { background: linear-gradient(var(--accent),var(--accent)) 0 100%/0 1px no-repeat; transition: background-size .4s; }
.link:hover, .link:focus-visible { background-size: 100% 1px; }
```

### 7. Marquee / ticker and infinite logo strip
**Where:** a band of dish names or "SEASONAL / LOCAL / WOOD-FIRED" between sections; supplier logos on the About page.
**Cost:** trivial if you animate `transform` on a duplicated track. **Do not** use `<marquee>`.
**A11y:** pause on hover and on focus-within, respect reduced-motion, and `aria-hidden="true"` on the duplicated copy so screen readers do not read it twice.

```css
.ticker { overflow: hidden; display: flex; gap: 3rem; mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.ticker__track { display: flex; gap: 3rem; flex: none; animation: slide 28s linear infinite; }
@keyframes slide { to { transform: translateX(-50%); } }
.ticker:hover .ticker__track, .ticker:focus-within .ticker__track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .ticker__track { animation: none; } }
```
```html
<div class="ticker"><div class="ticker__track">
  <span>Wood-fired</span><span>Seasonal</span><span>Local</span>
  <span aria-hidden="true">Wood-fired</span><span aria-hidden="true">Seasonal</span><span aria-hidden="true">Local</span>
</div></div>
```
(The track must contain the list exactly twice for a seamless `-50%` loop.)

### 8. Skeleton loaders, optimistic UI, toasts, confetti
**Where:** skeletons on the availability grid while slots fetch; optimistic UI when a user taps a time slot; toast for "Table held for 10:00 minutes"; confetti exactly once on the confirmation page.
**Cost:** skeleton = one gradient animation, cheap. canvas-confetti = ~6KB, one canvas, ~2s. Fine.
**A11y:** toasts need `role="status"` + `aria-live="polite"` (use `role="alert"` only for errors). Skeletons need `aria-busy="true"` on the container. Confetti must be skipped under reduced-motion and must never block the confirmation text.

```css
.skeleton { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 37%, var(--surface-2) 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: var(--r-sm); }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```
```js
// toast
function toast(msg, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = msg;
  document.querySelector('.toast-stack').append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => { el.classList.remove('is-in'); el.addEventListener('transitionend', () => el.remove(), { once: true }); }, 4000);
}

// optimistic slot selection: paint immediately, roll back on server reject
async function pickSlot(btn, slotId) {
  const prev = document.querySelector('.slot.is-selected');
  prev?.classList.remove('is-selected');
  btn.classList.add('is-selected');
  try {
    const r = await fetch('/api/hold.php', { method: 'POST', body: new URLSearchParams({ slot: slotId }) });
    if (!r.ok) throw new Error(await r.text());
    toast('Table held for 10 minutes');
  } catch (e) {
    btn.classList.remove('is-selected'); prev?.classList.add('is-selected');
    toast('That slot was just taken. Pick another.', 'error');
  }
}
```
```html
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js"></script>
<script>
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  confetti({ particleCount: 120, spread: 70, startVelocity: 42, origin: { y: .7 },
             colors: ['#E0A84E', '#F4EFE6', '#8C6B3F'] });
}
</script>
```

### 9. Number counters / animated stats (admin dashboard)
**Cost:** trivial. Use rAF, not setInterval.
**A11y:** render the final value in the HTML so it is correct with JS off and for screen readers; animate only when reduced-motion is not set.

```html
<span class="stat" data-count-to="128">128</span>
```
```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
new IntersectionObserver((es, o) => es.forEach(e => {
  if (!e.isIntersecting) return;
  o.unobserve(e.target);
  const end = +e.target.dataset.countTo, t0 = performance.now(), dur = 900;
  if (reduce) return;
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
    e.target.textContent = Math.round(end * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}), { threshold: .4 }).observe(document.querySelector('.stat'));
```
Also use `@property` + a counter trick if you want it CSS-only, but `@property` support is narrower; stick to JS here.

### 10. Container queries and `:has()` for genuinely adaptive components
**Where:** one `.dish-card` component that renders compact in the admin sidebar and editorial in the menu grid, with no variant classes. `:has()` for form-state styling with zero JS.
**Support:** `@container` Chrome 105 / Firefox 110 / Safari 16. `:has()` Chrome 105 / Firefox 121 / Safari 15.4. Both are safe to rely on with a sane fallback.

```css
.card-area { container-type: inline-size; container-name: card; }
@container card (min-width: 30rem) {
  .dish-card { grid-template-columns: 1.1fr 1fr; align-items: center; }
  .dish-card__desc { display: block; }
}

/* :has() - light up the fieldset when a party size is chosen */
.booking-step:has(input:checked) { border-color: var(--accent); }
/* show the "guests" field only once a date exists */
.booking-form:not(:has(#date:valid)) .guests { opacity: .4; pointer-events: none; }
/* invalid-state label without JS */
label:has(+ input:user-invalid) { color: var(--danger); }
/* dim siblings of the hovered card */
.menu-grid:has(.dish-card:hover) .dish-card:not(:hover) { opacity: .55; }
```

### 11. Scroll-snap gallery, 3D card flip, non-nauseating parallax
```css
/* snap gallery - works everywhere, no JS, no library */
.snap { display: grid; grid-auto-flow: column; grid-auto-columns: min(78vw, 42rem);
        gap: 1.5rem; overflow-x: auto; scroll-snap-type: x mandatory;
        overscroll-behavior-x: contain; scrollbar-width: none; padding-inline: max(1.5rem, 8vw); }
.snap > * { scroll-snap-align: center; }

/* 3D flip - dish front, allergens/price back */
.flip { perspective: 1200px; }
.flip__inner { transform-style: preserve-3d; transition: transform .7s cubic-bezier(.16,1,.3,1); }
.flip:hover .flip__inner, .flip:focus-within .flip__inner { transform: rotateY(180deg); }
.flip__face { backface-visibility: hidden; }
.flip__back { transform: rotateY(180deg); position: absolute; inset: 0; }
```
**Parallax rules so it does not induce nausea:** max ~12% of viewport height of differential travel, background layers only (never text the user is reading), never on the element currently in focus, always disabled under reduced-motion, and prefer the compositor-only scroll-driven version:
```css
@supports (animation-timeline: view()) {
  @keyframes drift { from { transform: translateY(-6%) scale(1.06); } to { transform: translateY(6%) scale(1.06); } }
  .parallax-bg { animation: drift linear both; animation-timeline: view(); }
}
```
A11y note: full-page parallax is the most common accessibility complaint on award sites. Keep it to the hero and one mid-page band.

### 12. Dark/light theme switch with a View Transitions cross-fade
```js
const btn = document.querySelector('#theme');
btn.addEventListener('click', () => {
  const apply = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(apply);
  } else { apply(); }
});
```
```css
/* circular wipe from the toggle instead of a plain cross-fade */
::view-transition-old(root) { animation: none; mix-blend-mode: normal; }
::view-transition-new(root) { animation: wipe .5s cubic-bezier(.16,1,.3,1); }
@keyframes wipe { from { clip-path: circle(0% at var(--tx, 92%) var(--ty, 6%)); }
                  to   { clip-path: circle(140% at var(--tx, 92%) var(--ty, 6%)); } }
```
Set `--tx/--ty` from the toggle's bounding rect before starting the transition. Read the stored theme in a tiny inline `<script>` in `<head>` to avoid a flash of wrong theme.

### 13. Ambient hero video with poster fallback
**Rules (per the HTML spec / browser autoplay policies):** autoplay only works when the video is `muted` (or has no audio track). Required attributes: `autoplay muted loop playsinline preload="metadata"` plus a `poster`. `playsinline` is mandatory or iOS takes over fullscreen.
**Cost:** the real risk. A 20MB hero video on conference wifi destroys the demo. Budget: <= 2.5MB, <= 10s loop, 1280px wide max, no audio track at all, and host it locally rather than relying on a CDN.
**A11y:** must be decorative, must be pausable, and must not autoplay under reduced-motion.

```html
<video class="hero__video" poster="/img/hero-poster.avif" muted loop playsinline
       preload="metadata" autoplay aria-hidden="true" tabindex="-1">
  <source src="/video/hero.webm" type="video/webm">
  <source src="/video/hero.mp4" type="video/mp4">
</video>
<button class="hero__pause" aria-pressed="false">Pause background video</button>
```
```js
const v = document.querySelector('.hero__video');
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); }
// also pause when offscreen to save battery/CPU
new IntersectionObserver(([e]) => e.isIntersecting ? v.play().catch(()=>{}) : v.pause()).observe(v);
```
Fallback worth considering: ship **only** a high-quality AVIF/WebP still with a slow `scale` drift. On a projector, nobody can tell, and it costs 200KB instead of 2.5MB. **DESIGN**

### 14. Branded preloader / page-entry curtain
Cheap, high impact, hides font swap.
```css
.curtain { position: fixed; inset: 0; z-index: 99; background: var(--bg);
           display: grid; place-items: center; transition: clip-path 1s cubic-bezier(.16,1,.3,1); }
.curtain.is-done { clip-path: inset(0 0 100% 0); pointer-events: none; }
```
```js
addEventListener('load', () => {
  document.fonts.ready.then(() => document.querySelector('.curtain').classList.add('is-done'));
});
```
Hard cap it with a `setTimeout` of 1200ms so a slow network never traps the judge behind a loading screen.

### Global reduced-motion guard (ship this)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
    scroll-behavior: auto !important;
  }
}
```
Plus the JS guard `const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;` consulted before any GSAP/Lenis/confetti init. Also always keep a visible `:focus-visible` ring; custom cursors and magnetic buttons commonly destroy it.

---

## Library evaluation table

Metadata below (stars, SPDX license, last push, archived flag) was read live from api.github.com this session. **File sizes are approximate and were NOT measured this session — verify against the CDN response before quoting them.** Marked `~` accordingly.

| Library | CDN snippet | ~Size (min+gzip, unverified) | License (GitHub API) | Activity (last push) | Verdict |
|---|---|---|---|---|---|
| **GSAP 3 + ScrollTrigger** | `<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>` + `.../ScrollTrigger.min.js` | ~50KB core, ~70KB with ScrollTrigger | **No SPDX id returned** (custom GreenSock license file) - check https://gsap.com/licensing/ before relying on bonus plugins | 2026-04-13, 28.8k stars, active | **YES.** Worth the weight only because it carries the pinned gallery, stacked cards and split-text. Single biggest visual lever. |
| **Lenis** | `<script src="https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js"></script>` | ~5KB | MIT | 2026-10-02, 16.1k stars, very active | **YES, scoped.** Marketing pages only. Never on admin/kitchen/form pages. |
| **Swiper** | `<link href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" rel="stylesheet">` + `<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js">` | ~120KB bundle (large) | MIT | 2026-09-28, 41.9k stars, very active | **NO for us.** CSS `scroll-snap` (effect 11) does 90% of it for 0KB. Only adopt if you need coverflow/3D-cube effects specifically. |
| **Splide** | `<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4/dist/js/splide.min.js"></script>` | ~29KB | MIT | **2024-07-08**, 5.4k stars - low activity, not archived | Lighter than Swiper, but **flag: no commits in a long while.** Skip; use scroll-snap. |
| **AOS (Animate On Scroll)** | `<link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet">` + `aos.js` | ~14KB | MIT | **2024-03-26**, 28.1k stars - **effectively unmaintained**, not archived | **NO.** Its canned fades are the most recognisable "template" signature on the web, and it is stale. Use effect 1 instead. |
| **Motion (motion.dev, ex Motion One)** | `<script type="module">import { animate, inView } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";</script>` | ~18KB (mini build smaller) | MIT | 2026-10-02, 33.8k stars, very active | **MAYBE.** Great modern alternative if you want to avoid GSAP entirely, but no equivalent to ScrollTrigger pinning. Do not load alongside GSAP. |
| **anime.js** | `<script src="https://cdn.jsdelivr.net/npm/animejs@3/lib/anime.min.js"></script>` | ~17KB | MIT | 2026-08-21, 73.3k stars, active | **NO (redundant).** Lovely API, but GSAP already covers it. Two tween engines = dead weight. |
| **canvas-confetti** | `<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js"></script>` | ~6KB | ISC | 2025-10-25, 12.8k stars, active | **YES.** Best impact-per-byte on the site. One line on the confirmation page. |
| **tsParticles** | `<script src="https://cdn.jsdelivr.net/npm/@tsparticles/slim@3/tsparticles.slim.bundle.min.js"></script>` | ~60KB+ slim bundle | MIT | 2026-10-04, 9.0k stars, very active | **NO.** Particle fields read as crypto-landing-page, not fine dining, and it burns GPU on the demo laptop. |
| **Lottie (lottie-web)** | `<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js"></script>` | ~70KB (light build ~37KB) | MIT | 2025-09-01, 32.1k stars, maintained | **ONLY IF** you have a real designed animation (e.g. an animated logo mark). Do not add it for a spinner. Use `<dotlottie-wc>`/lottie-player only if you accept another dependency. |
| **Chart.js 4** | `<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>` | ~70KB | MIT | 2026-10-03, 67.7k stars, very active | **YES for the admin dashboard.** Canvas-based, fast, trivially themeable from CSS variables. Loaded on /admin only. |
| **ApexCharts** | `<script src="https://cdn.jsdelivr.net/npm/apexcharts@4/dist/apexcharts.min.js"></script>` | ~140KB+ (SVG based) | **NOASSERTION** (custom/unclear SPDX via API - verify the LICENSE file) | 2026-10-04, 15.2k stars, very active | **NO.** Prettier defaults, but 2x the weight and an unclear SPDX id. Chart.js wins. |
| Vanilla, no library | - | 0KB | - | - | `<dialog>` for modals, `popover` attribute for menus, `scroll-snap` for galleries, `:has()` for form logic, Intl.DateTimeFormat for dates, `view-transition` for nav. **Use these first.** |

**Final shortlist (total ~130KB JS, and only ~76KB of it on marketing pages):** GSAP + ScrollTrigger, Lenis, canvas-confetti, Chart.js (admin only). Everything else: vanilla.

Loading rules: every CDN tag gets `defer`, is loaded **per page** (no global bundle), and is pinned to a major version (`gsap@3`, not `gsap@latest`) so a CDN release cannot break the demo. **Download local copies of all four into `/assets/vendor/` before demo day** - venue wifi failing is the most likely way to lose the competition, and a CDN-only site is dead offline.

---

## Design system tokens (:root block)

Direction: **dark-first "warm ember" luxe.** Near-black with a warm cast (never pure #000, never blue-grey), bone-white text, a single amber/ember accent, hairline borders instead of shadows, and large radii only on images.

Font pairing (both free, both on Google Fonts): **Fraunces** (variable display serif with a `SOFT`/`WONK` axis - high-contrast editorial feel, far less overused than Playfair) for display, **Inter** for UI/body. Alternate if Fraunces feels too quirky: **Cormorant Garamond** + **Jost**. All are SIL Open Font License per Google Fonts. Self-host the woff2 subsets for the demo rather than depending on fonts.googleapis.com. **DESIGN**

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@300..700&display=swap">
```

```css
:root {
  color-scheme: dark light;

  /* ---- Type ---- */
  --font-display: "Fraunces", "Iowan Old Style", Georgia, serif;
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, monospace;

  /* Fluid scale, 1.25 ratio at 360px -> 1.333 at 1440px */
  --step--2: clamp(0.69rem, 0.67rem + 0.11vw, 0.76rem);
  --step--1: clamp(0.83rem, 0.79rem + 0.22vw, 1.00rem);
  --step-0:  clamp(1.00rem, 0.93rem + 0.37vw, 1.33rem);
  --step-1:  clamp(1.20rem, 1.08rem + 0.59vw, 1.77rem);
  --step-2:  clamp(1.44rem, 1.26rem + 0.92vw, 2.37rem);
  --step-3:  clamp(1.73rem, 1.45rem + 1.39vw, 3.16rem);
  --step-4:  clamp(2.07rem, 1.66rem + 2.07vw, 4.21rem);
  --step-5:  clamp(2.49rem, 1.88rem + 3.03vw, 5.61rem);
  --step-6:  clamp(2.99rem, 2.11rem + 4.38vw, 7.48rem);
  --display-hero: clamp(3.2rem, 11vw, 11rem); /* the one oversized word */

  --lh-tight: 1.02;
  --lh-head: 1.1;
  --lh-body: 1.6;
  --tracking-head: -0.02em;
  --tracking-eyebrow: 0.18em;

  /* ---- Colour ramp (dark-first, warm) ---- */
  --ink-950: #0B0A09;   /* page bg */
  --ink-900: #121010;
  --ink-850: #171414;   /* surface */
  --ink-800: #1E1A19;   /* surface-2 */
  --ink-700: #2A2523;   /* surface-3 / skeleton highlight */
  --ink-600: #3A3330;
  --ink-400: #6E635D;
  --ink-200: #A99F97;
  --ink-100: #D6CEC6;
  --bone-50: #F4EFE6;   /* primary text on dark */

  --ember-300: #F2C879;
  --ember-400: #E0A84E;  /* ACCENT */
  --ember-500: #C98B2E;
  --ember-700: #8C6B3F;
  --olive-400: #7C8C5A;  /* secondary accent, used sparingly */

  --success: #6FA86A;
  --warning: #D9A13B;
  --danger:  #C8524B;
  --info:    #6B8CA8;

  /* Semantic */
  --bg: var(--ink-950);
  --surface: var(--ink-850);
  --surface-2: var(--ink-800);
  --surface-3: var(--ink-700);
  --text: var(--bone-50);
  --text-muted: var(--ink-200);
  --text-faint: var(--ink-400);
  --accent: var(--ember-400);
  --accent-ink: #1A1206;             /* text ON accent */
  --hairline: color-mix(in oklab, var(--bone-50) 12%, transparent);
  --hairline-strong: color-mix(in oklab, var(--bone-50) 22%, transparent);
  --overlay: color-mix(in oklab, var(--ink-950) 72%, transparent);
  --focus: var(--ember-300);

  /* ---- Space: 4px base, modular ---- */
  --sp-1: 0.25rem;  --sp-2: 0.5rem;  --sp-3: 0.75rem; --sp-4: 1rem;
  --sp-5: 1.5rem;   --sp-6: 2rem;    --sp-7: 3rem;    --sp-8: 4rem;
  --sp-9: 6rem;     --sp-10: 8rem;   --sp-11: 12rem;
  --gutter: clamp(1.25rem, 5vw, 6rem);
  --section-y: clamp(4rem, 10vw, 11rem);
  --measure: 62ch;
  --container: 84rem;

  /* ---- Radii ---- */
  --r-xs: 2px; --r-sm: 6px; --r-md: 12px; --r-lg: 20px; --r-xl: 32px;
  --r-pill: 999px; --r-circle: 50%;
  --r-image: var(--r-md);   /* images get radius; buttons stay near-square for an editorial feel */

  /* ---- Shadows: restrained. Depth comes from hairlines + contrast. ---- */
  --sh-0: none;
  --sh-1: 0 1px 2px rgb(0 0 0 / .32);
  --sh-2: 0 4px 16px rgb(0 0 0 / .36);
  --sh-3: 0 18px 48px -12px rgb(0 0 0 / .55);
  --sh-glow: 0 0 0 1px color-mix(in oklab, var(--accent) 45%, transparent),
             0 12px 40px -14px color-mix(in oklab, var(--accent) 55%, transparent);
  --ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--focus);

  /* ---- Easing + duration (the "luxury" feel lives here) ---- */
  --ease-out-expo:  cubic-bezier(.16, 1, .3, 1);     /* default reveal */
  --ease-out-quart: cubic-bezier(.25, 1, .5, 1);
  --ease-in-out:    cubic-bezier(.76, 0, .24, 1);    /* curtains, page transitions */
  --ease-spring:    cubic-bezier(.34, 1.56, .64, 1); /* micro-interactions only */
  --ease-linear:    linear;

  --dur-instant: 80ms;
  --dur-fast: 180ms;     /* hover, button press */
  --dur-base: 320ms;     /* state change */
  --dur-slow: 620ms;     /* section reveal */
  --dur-slower: 950ms;   /* hero, curtain */
  --stagger: 70ms;

  /* ---- Z ---- */
  --z-base: 0; --z-sticky: 10; --z-nav: 20; --z-modal: 40; --z-toast: 60; --z-cursor: 80; --z-curtain: 99;
}

:root[data-theme="light"] {
  --bg: #F7F3EC;
  --surface: #FFFDF9;
  --surface-2: #F0EAE0;
  --surface-3: #E4DBCD;
  --text: #1A1512;
  --text-muted: #574C44;
  --text-faint: #8A7D73;
  --accent: var(--ember-500);
  --accent-ink: #FFF8EC;
  --hairline: color-mix(in oklab, #1A1512 12%, transparent);
  --hairline-strong: color-mix(in oklab, #1A1512 24%, transparent);
  --overlay: color-mix(in oklab, #F7F3EC 76%, transparent);
}
```

Usage conventions:
- Headings: `font-family: var(--font-display); line-height: var(--lh-head); letter-spacing: var(--tracking-head);`
- Eyebrow labels: `font: var(--step--2)/1 var(--font-sans); text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); color: var(--text-faint);`
- Body copy: `max-width: var(--measure)`.
- **Contrast check (DESIGN, must be measured):** `--bone-50` on `--ink-950` and `--accent-ink` on `--accent` are intended to clear 4.5:1, but these ratios were NOT computed this session - run them through a contrast checker before locking the palette. `--text-faint` on `--bg` will likely fail for body text; restrict it to large/decorative text.
- `color-mix()` is used above; check support for your demo browser (MDN: CSS `color-mix()`) or hardcode rgba fallbacks. Support was NOT verified this session: NOT_FOUND.

---

## Page-by-page visual plan

Hard rule for every page: **max 3 signature effects.** A fourth one does not add impact, it adds jank.

### 1. Landing / hero
- **Signature:** (a) oversized split-text headline with masked line-by-line rise on load; (b) full-bleed hero still or <=2.5MB muted loop with a slow `scale` drift driven by `animation-timeline: view()`; (c) branded curtain preloader wiping up to reveal.
- Supporting, non-negotiable: sticky glass nav, a dish-name ticker band, floating "Reserve a table" pill.
- **Budget:** LCP element is the hero image, served as AVIF with `fetchpriority="high"` and a `<link rel="preload">`. Target LCP < 2.0s on the demo laptop. Hero JS <= GSAP + Lenis. No confetti, no particles, no Lottie.

### 2. Menu showcase
- **Signature:** (a) GSAP ScrollTrigger pinned **horizontal** course gallery (Starters -> Mains -> Desserts as one sideways scroll); (b) `:has()`-driven "dim the siblings" hover with a `clip-path` image wipe and `[data-tilt]` sheen; (c) a dish card that **morphs into the dish detail page** via cross-document `view-transition-name` (this is the moment that wins the demo).
- Component built once with `@container` so the same markup serves the menu grid and the admin list.
- **Budget:** all dish images lazy except the first row (`loading="lazy" decoding="async"`, explicit `width/height` to stop CLS). Cap the pinned track at 8 cards; more than that and the pin feels endless. Total page images <= 1.2MB.

### 3. Reservation flow
- **Signature:** (a) same-document View Transition between stepper steps (date -> party size -> time -> details), so a plain PHP multi-step form feels like an app; (b) skeleton shimmer on the time-slot grid, then optimistic slot selection with rollback toast; (c) a progress rail that fills using `animation-timeline` or a simple width transition.
- **Deliberately boring here:** no Lenis, no parallax, no custom cursor, no tilt. This page's job is conversion and the judges will try to break it. Native `<input type="date">`, real `<fieldset>/<legend>`, `:user-invalid` styling, visible focus rings, `aria-live` on the availability region.
- **Budget:** < 25KB page JS. Zero layout shift when skeletons swap for real slots (reserve the exact grid size up front).

### 4. Confirmation
- **Signature:** (a) one-shot `canvas-confetti` burst in the brand palette, reduced-motion gated; (b) a "ticket stub" card with a dashed perforation and the booking reference, animating in with `--ease-spring`; (c) an "add to calendar" .ics download and a copy-reference button with a success micro-toast.
- **Budget:** confetti canvas is removed from the DOM after ~3s. The reservation details must be fully readable with JS disabled.

### 5. Admin dashboard
- **Signature:** (a) animated stat counters on four KPI cards (covers tonight, no-show rate, occupancy, avg spend); (b) Chart.js line + donut themed from the CSS custom properties; (c) a live-filtering bookings table with `:has()` row-state styling and sticky header.
- **Data density beats drama here.** No Lenis, no pin, no curtain, no custom cursor. Tabular numbers (`font-variant-numeric: tabular-nums`).
- **Budget:** Chart.js loaded **only** on /admin, `defer`. Table virtualisation not needed below ~500 rows; paginate server-side instead. Target interaction-to-paint < 100ms on filter keystrokes (debounce 120ms).

### 6. Kitchen display (KDS)
- **Signature:** (a) CSS Grid auto-fit ticket wall with a colour-coded age ramp (green -> amber -> red) driven by a single `--age` custom property; (b) a subtle pulse on new tickets plus an optional audio chime; (c) auto-refresh via `fetch` polling with a "last updated" heartbeat dot.
- **Must be legible from 3 metres**: min font-size `--step-1`, high contrast, zero decoration, zero hover dependence (kitchen screens are touch or no-pointer). Everything else on this page is off.
- **Budget:** polling at 10s with `AbortController`; no animation libraries at all; page must survive 8 hours without a memory leak (remove listeners on ticket removal).

---

## Top 10 ranked by impact per effort

Effort estimates are **DESIGN** (my own estimates, not measured): assume a competent dev working in vanilla CSS/JS on this codebase.

| # | Effect | Impact | Effort | Risk on an unfamiliar laptop / projector |
|---|---|---|---|---|
| 1 | **Cross-document View Transitions** (`@view-transition { navigation: auto; }` + one morphing dish image) | Enormous. Judges' first question is "wait, is this a SPA?" | **30-60 min** for page-level, +45 min for the element morph | **Low.** Firefox silently falls back to a normal nav; nothing breaks. Only risk: a duplicate `view-transition-name` aborting it. **Verify the demo machine is Chrome/Edge 126+ or Safari 18.2+.** |
| 2 | **Design tokens + fluid type + the font pairing** | The difference between "student project" and "studio work". Every other effect inherits from this. | **2-3 hrs** | None. This is the one with zero downside. Do it first. |
| 3 | **Masked split-text hero reveal** (GSAP or vanilla `<span>` wrapping) | Very high; it is the first 1.5 seconds of the demo | **45 min** vanilla, 20 min with GSAP SplitText | Low. Must set a final-state fallback so the headline is never stuck invisible if JS fails. |
| 4 | **Scroll-driven CSS reveals + scroll progress bar** (`animation-timeline: view()`) with IO fallback | High, and it makes the whole page feel intentional | **1-1.5 hrs** including the fallback | **Low** if you ship the IntersectionObserver fallback. **Medium if you don't** - Firefox gets a dead static page. |
| 5 | **Pinned horizontal menu gallery** (GSAP ScrollTrigger) | Very high "wow", most memorable single section | **2-3 hrs** incl. responsive + refresh handling | **Medium-high.** Pinning is the most fragile effect here: it breaks on resize, on an unexpected aspect ratio, and fights Lenis. Test at 1366x768 and on a 16:10 projector. Use `invalidateOnRefresh`. |
| 6 | **Confetti on booking confirmed** | High emotional payoff for ~6KB. Judges smile. | **10 min** | Very low. Honest label: this is a **cheap trick** - but it lands on the exact moment you want remembered. |
| 7 | **Tasteful glass nav + magnetic CTA + custom cursor dot** | High perceived polish, continuously visible | **1.5-2 hrs** for all three | **Medium.** `backdrop-filter` over a moving background is the #1 FPS killer on integrated GPUs. Keep blurred area small; have a `data-no-glass` kill switch you can toggle in 2 seconds if the demo machine stutters. Custom cursor must not kill focus rings. |
| 8 | **Animated counters + themed Chart.js dashboard** | High *credibility* impact - proves the system has real data, not just pretty pages | **2-3 hrs** | Low. Make sure charts have hardcoded fallback data if the DB is empty on demo day; an empty dashboard is worse than no dashboard. |
| 9 | **Skeleton loaders + optimistic slot selection + toasts** | High with technical judges; shows you understand perceived performance | **2-3 hrs** | Low technically, **medium conceptually**: optimistic UI must roll back correctly or you will demo a bug. Test the double-booking race deliberately. |
| 10 | **Theme toggle with a circular View Transition wipe** | Medium-high, and it is the easiest thing to ask you to "show again" | **45-60 min** (needs a full light palette, which is the real cost) | Low. Degrades to an instant swap. Risk is an unfinished light palette looking worse than the dark one - if the light theme is not genuinely good, **cut it**. |

Just below the line (good, do if time remains): dish-name marquee ticker (**20 min**, cheap trick, high charm), branded curtain preloader (**30 min**, cheap trick that hides font swap), scroll-snap gallery (**30 min**, zero risk), 3D dish card flip for allergens (**40 min**).

**Deliberately rejected:** tsParticles fields, full-page Locomotive-style scroll hijack, parallax on text, cursor-trail effects, Lottie for spinners, Swiper for a 4-image gallery, AOS. All cost more than they return, and three of them actively signal "template".

**Demo-day risk list (be honest with yourself):**
1. **Projector gamma crushes dark themes.** A near-black luxe palette can turn into mud on a cheap projector. Build a `data-theme="dark-hc"` variant that lifts `--bg` to `--ink-900` and raises accent contrast, and test on the actual room's projector if possible.
2. **Unknown browser.** Scroll-driven animations and cross-document VT are Chromium/Safari-only. Bring your own laptop with Chrome. If you must use theirs, verify the version before you present.
3. **No wifi.** Vendor everything locally. A CDN-dependent site is an instant zero.
4. **Integrated GPU.** `backdrop-filter` + pinned scrub + video can drop to 20fps. Have the kill switch.
5. **Font swap flash.** `font-display: swap` plus the curtain hides it; a FOUT mid-headline-animation looks broken.

---

## Performance and accessibility budget

**Performance budget (per page, uncached, DESIGN targets):**

| Metric | Marketing pages | Reservation flow | Admin / KDS |
|---|---|---|---|
| JS transferred | <= 90KB gz (GSAP+ScrollTrigger+Lenis) | <= 25KB gz | <= 85KB gz (Chart.js) |
| CSS transferred | <= 45KB gz, one file, no `@import` chains | <= 45KB | <= 45KB |
| Images per page | <= 1.5MB, AVIF/WebP, all with `width`/`height` | <= 300KB | <= 150KB |
| Hero video | <= 2.5MB, no audio track, or replaced by a still | n/a | n/a |
| Fonts | <= 2 families, <= 4 woff2 files, self-hosted, `font-display: swap`, subset to latin | same | same |
| LCP target | < 2.0s | < 1.5s | < 1.8s |
| CLS target | < 0.05 (reserve space for every image, skeleton and chart canvas) | **0** | < 0.05 |
| INP target | < 200ms | < 150ms | < 150ms |
| Long tasks | none > 150ms during scroll | - | - |
| Animated properties | `transform` / `opacity` / `clip-path` only. Never `width`, `height`, `top`, `left`, `margin`, `box-shadow` in a scroll-linked animation. | | |
| `will-change` | max 3 elements at once, added on hover/enter and removed after | | |
| `backdrop-filter` | max 2 on screen, each < 15% of viewport area | | |

Measurement plan (not yet run - **DESIGN**): Chrome DevTools Performance panel at 4x CPU throttle, Lighthouse mobile preset, and a manual FPS check while scrolling the pinned gallery. Any effect that cannot hold 50fps at 4x throttle gets cut, not optimised.

**Accessibility budget (all mandatory, no exceptions):**
- `prefers-reduced-motion: reduce` honoured globally (CSS block + JS `REDUCE` guard before every library init). This includes View Transitions, which do **not** respect it automatically.
- Every reveal animation ends at `opacity: 1`; no content is reachable only after an animation. No-JS users see the full page.
- Visible `:focus-visible` ring on every interactive element, using `--ring`. Custom cursor and magnetic buttons must not suppress it.
- Keyboard: full tab order through the reservation flow, `<dialog>` for modals (native focus trap + Esc), skip-link to main.
- Contrast: 4.5:1 body, 3:1 large text and UI borders. `--text-faint` is decorative only. **Must be measured, not assumed.**
- Motion limits: no parallax on text, no infinite animation in the user's reading path, marquee pauses on hover/focus, autoplay video muted + pausable + offscreen-paused.
- Semantics: real `<h1>-<h3>` hierarchy (the oversized hero word is still an `<h1>`), `<table>` for the admin table (not divs), `role="status"`/`aria-live="polite"` for toasts and availability updates, `aria-busy` on skeleton containers, `aria-hidden` on decorative duplicated marquee content and the hero video.
- Pointer: nothing functional behind hover only; all hover-revealed info (allergens, prices on the card back) also available on focus and on tap.
- Zoom: usable at 200% browser zoom and at 320px width without horizontal scroll (except the deliberately horizontal gallery, which must also be keyboard-scrollable).
- Target size: >= 44x44px for time-slot buttons and the KDS ticket actions.

**Open items / gaps (not verified this session):**
- `color-mix()` browser support: NOT_FOUND (not fetched). Verify on MDN before relying on it, or precompute the rgba values.
- `@property`, `popover` attribute and `<dialog>` support numbers: NOT_FOUND (not fetched this session).
- All library file sizes above are approximate and unmeasured.
- Contrast ratios for the proposed palette are unmeasured.
- Awwwards/CSSDA/Godly gallery pages were not individually scraped for this document; the "visual language" section is a pattern synthesis and should be treated as **DESIGN**, not as a citation of any specific site.
