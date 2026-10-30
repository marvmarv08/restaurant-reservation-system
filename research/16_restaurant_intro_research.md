# Bella Vista introduction before reservations

Research and implementation brief · 2026-10-27 · Local development only

## Intent and references

Marvin requested a first page before the existing reservation interface, with restaurant background, one clear continuation action and design decisions delegated to the implementer. Two screenshots were inspected together: the older reservation hero and a real restaurant's brick storefront. The storefront supplies composition/mood only; it does not establish the academic restaurant's location, affiliation or image rights. The supplied company brief remains the authority for the Bella Vista story.

## Research and decisions

| Primary source | Finding applied to this system |
|---|---|
| [NN/g: homepage design principles](https://www.nngroup.com/articles/homepage-design-principles/) | A homepage should explain the organization and provide clear next actions. Build a useful restaurant introduction with readable story content rather than a timed or blocking splash. Returning guests retain direct reservation/management URLs. |
| [The Quality Chop House — official website](https://thequalitychophouse.com/) | The actual homepage combines a front-door image, restaurant identity, menu/history navigation and an immediately available booking link. Use that information hierarchy, without copying its branding, address, history or photography. |
| [Moor Hall — official restaurant story](https://moorhall.com/our-story) | Restaurant/estate history can sit alongside a visible booking route. Bella Vista keeps only its assignment-supplied 2021 narrative; awards, geography and dates from this reference are not transferable facts. |
| [W3C: image alternatives](https://www.w3.org/WAI/tutorials/images/) | Decorative atmosphere imagery uses empty alt text; the restaurant name, story and navigation remain real HTML text. A nearby concept caption distinguishes generated atmosphere from a location photograph. |
| [W3C: minimum contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Image-backed text needs contrast against its actual background. Use a strong dark scrim, existing cream/gold text and a solid gold action. Preserve a dark readable background if imagery fails; inspect actual desktop/phone rendering as well as automated checks. |
| [W3C: focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | Keep a visible keyboard focus outline, a skip link and native link behavior. No click-only element, hidden timer, disabled Continue control or forced new tab. |
| [W3C: target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | WCAG AA defines a 24 CSS-pixel minimum with exceptions. Use a more comfortable 54–56px primary action and roomy navigation; verify phone interaction targets and spacing. |
| [W3C: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Content must remain usable at 320 CSS-pixel width without page-level two-direction scrolling. Allow natural vertical growth on short screens; do not trap the intro inside a fixed-height viewport. |
| [web.dev: optimize LCP](https://web.dev/articles/optimize-lcp) | The main image must be discoverable in HTML and loaded eagerly. Use a local picture/img with dimensions and high fetch priority, plus a smaller phone source. Do not preload the old reservation video or menu galleries on the introduction. |
| [MDN: anchor element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a) | Navigating to another page is a link. The Continue action is a native `/reserve` anchor, supporting Enter, browser history, opening in another tab and navigation without JavaScript. |

These are source-based design decisions, not measured conversion-rate claims. Accessibility automation supplements manual keyboard, failure-state and responsive inspection.

## Chosen experience

- `/`: new garden-estate introduction, original Bella Vista identity, immediate **Continue to reservation**, a secondary story action, supplied About/History and a direct My booking link.
- `/reserve`: existing guest reservation interface, live catalog, menus, room showcase and booking state. Direct navigation/reload does not revisit the introduction.
- `/manage` and staff routes retain their original access paths.
- Existing `/#booking`, `/#rooms`, `/#menu` and `/#food-showcase` bookmarks are moved to the matching reservation fragment by a small, allowlisted compatibility script. Root About/History anchors remain on the introduction. Current navigation links point directly at their destination rather than relying on that migration.
- No consent gate, countdown, autoplay introduction video, extra login, new booking rule, database migration, external font/CDN request or remote publication.

## Visual direction and provenance

Use the existing hearth brown, warm cream and harvest gold, original garden-arch/sprout mark, local Cormorant Garamond/Inter fonts and understated typography. The original generated exterior depicts a fictional garden restaurant with brick arches, tropical planting, warm interior light and a quiet left-hand text area. It is not a photograph of a real Bella Vista property. The original PNG is retained in `research/intro-assets/`; optimized WebP delivery files and provenance are in `public/assets/images/intro/`.

The original reference screenshot is not copied into website assets. Company content continues to identify the assignment source, without invented contacts, awards, location or ownership. The new homepage does not hard-code operational hours; the reservation interface still presents the active catalog's actual rules.

## Verification contract

A new browser test must first fail against the old root page, then verify the real intro → reservation → intro-story journey. Cover direct reservation reload, old fragment bookmarks, management access, no-JavaScript navigation, failed background image, reduced motion, visible keyboard focus, desktop/phone reflow, meaningful source content and local-only assets. Confirm the introduction does not start booking APIs or create guest draft state. Capture desktop/mobile screenshots and run automated accessibility checks. Preserve main/preview database content fingerprints, and run syntax plus affected navigation regressions. Keep GitHub/Vercel private; changes stay on the local feature branch.

## Delivery evidence

Delivered locally on branch `feat/restaurant-introduction`. Observed the new journey test fail against the old root (`guest` instead of `intro`) before implementation. Final evidence: 27 intro/navigation checks and 21 existing seating-image checks passed; automated accessibility checks passed at 1366/320px, with eight viewport layouts and desktop/phone visual inspection. Both latest-preview and preserved older-main smoke checks passed. PHP lint passed on 111 files, changed product scripts and all browser-test scripts parsed, and whitespace checks passed.

All main and isolated-preview table counts/content hashes matched the pre-change baseline. No booking/payment writes, database migration, main-image refresh, GitHub push or Vercel deployment belongs to this change. The intro itself starts no booking API calls, creates no guest draft state, loads no video bundle and uses no external assets. Its optimized background is 322,334 bytes for desktop and 99,672 bytes for phones.

Independent review found no remaining application blocker. The adapted full branding/staff suite is syntax-checked but was not rerun as a new authentication/availability acceptance claim; the executed guest-focused suite covers the changed entry/navigation behavior. Booking-focused browser tests now explicitly enter `/reserve` while retaining their original assertions, including the cache-proxy path and reservation overflow checks. Existing shared `/#menu` and `/#booking` links work on initial load and same-document hash changes; query strings are preserved.
