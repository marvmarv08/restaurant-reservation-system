# Garden ambience over the static introduction

Date: 2026-10-30. Screenshot: 2026-10-30 131916. Marvin approved this direction with “do it” after reviewing the recommendation. Local delivery only.

## Decision

Use a separate decorative layer of sparse warm lights and entrance glow matching the garden/evening palette. Preserve the exact exterior image and steady headline/Continue; no zoom, forced scroll or blinking text. This is a designed ambient effect rather than recorded fireflies or a generated video. Seven lights on desktop, four on phones; 7–12-second alternate drift and 9-second alternate glow. Modest opacity transitions avoid hard cuts. No new assets/libraries or audio.

A compact native Pause/Resume button has a 44px target, keyboard focus and changing accessible name. The separate local preference survives reload; failed storage does not break the control. Default HTML is static, with effects enabled only after image/control initialization. Reduced motion hides the effects/control; hidden/offscreen state suspends animation. Image failure omits the layer. Source credits remain in the existing manifest.

## Resources and alternatives

- [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide): ongoing automatic decorative movement alongside text needs user control. The approved compact control replaces the removed full-text zoom button for this different effect.
- [W3C reduced-motion technique](https://www.w3.org/WAI/WCAG22/Techniques/css/C39): respect preference by omitting nonessential animation.
- [web.dev animation performance](https://web.dev/articles/animations-guide): transform/opacity are the chosen animated properties; this is not a guarantee of zero graphics cost.
- [web.dev video performance](https://web.dev/learn/performance/video-performance): actual video would require separate encoding/loading/poster review. No footage is introduced here.
- [Cozy outdoor cafe source](https://www.pexels.com/video/cozy-outdoor-cafe-with-evening-ambiance-30708795/): metadata lists 7 seconds, 1920×1080 and30fps; different building and not fully motion-reviewed.
- [Outdoor restaurant source](https://www.pexels.com/video/restaurant-landscape-lights-hotel-6010309/): metadata lists14 seconds,3840×2160 and25fps; different scene and not fully motion-reviewed. Neither candidate was selected, downloaded or represented as Bella Vista.

## Verification

Initial real-browser assertion failed because the garden control/effect did not exist. Final `tests/browser-intro-garden.mjs`:11 checks passed. Covered actual light movement versus fixed image/CTA, keyboard freeze/resume and persisted pause, offscreen suspension, simulated document visibility events, blocked storage, reduced-motion changes, 1366/390/320px accessibility and control/CTA non-overlap, static no-JavaScript/image-error experience, and no video/HTTP write/browser errors. `tests/browser-intro-static.mjs`:5 passed. `tests/browser-intro.mjs`:27 passed. Desktop/phone screenshots inspected; JS syntax, whitespace and preview smoke passed.

The reduced-motion verifier initially checked before the asynchronous media event arrived; it now waits for that event-driven state, with CSS fallback hiding the control immediately. No physical-device frame-rate/battery testing or full staff/booking-write regression run is claimed. No database command, push, deployment or hosted access change occurred.
