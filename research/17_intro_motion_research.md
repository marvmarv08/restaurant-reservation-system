# Bella Vista introduction: ambient motion and interaction

**Historical implementation:** Marvin requested removal of the zoom and its control on 2026-10-30. The current hero image is static; the bottom hero credit caption was also removed. Asset provenance remains in the image manifest.

Research date: 2026-10-28. Latest reference: Screenshot 2026-10-28 065318.png. Local only; preserve the private online release and the existing uncommitted introduction.

## Finding and decision

The screenshot's hierarchy is strong: readable headline/action on the left, warm garden facade on the right. Before implementation, the source had only a 0.4-second copy entrance and a small button hover, with no continuous intro-background animation. Marvin approved implementing the recommended local motion after this research.

**Recommended practical fit:** animate the existing exterior image with a very slow, restrained camera-like zoom; keep the headline and primary-action rectangle stationary; add short hover/focus feedback and once-only About/History reveals. Supply one visible Pause/Resume control, honor reduced motion and suspend background movement when hidden/offscreen. This preserves the original visual identity and adds no new video download. CSS movement of an image does not make leaves move independently and must not be described as actual video.

A matching exterior cinemagraph could provide more natural foliage movement later. No matching video exists in the project and none has been generated or fully reviewed for this phase. The recorded local 11.2-second dining loop (727,492 bytes) and 7.36-second chef loop (1,197,478 bytes) depict different subjects and remain on the reservation experience.

## Comparison — design judgment, not measured conversion results

| Approach | Fit for this page | Cost/tradeoff | Decision |
|---|---|---|---|
| Existing image + restrained zoom + interaction feedback | Preserves the exact garden facade and a calm entrance | No additional media bytes; continuous graphics work still needs profiling and pause controls | Implement now |
| Matching, mostly locked-camera exterior video/cinemagraph | Best natural scene motion if foliage moves gently and building geometry stays stable | New asset, encoding, loop/crop/contrast review, autoplay fallbacks and decoding cost | Optional later enhancement |
| Pointer parallax | Can add depth on a desktop pointer | No equivalent touch behavior; extra motion/control complexity | Exclude from the initial implementation |
| Scroll-jacked scenes, rotating hero carousel, particles, pulsing headline/button | Competes with the clear reservation action | Reading/distraction and maintenance costs | Not recommended |

## Primary resources and applied findings

1. [W3C — Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide): nonessential automatically moving content lasting over five seconds alongside other content needs a usable pause/stop/hide mechanism. A hover-only pause does not provide independent control. Apply a real keyboard-operable button.
2. [W3C — prefers-reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39): user preferences can prevent nonessential motion, helping people affected by distraction or vestibular triggers. Start static when requested and react to setting changes.
3. [web.dev — high-performance animations](https://web.dev/articles/animations-guide): prefer transform/opacity, and profile layout/paint costs. Avoid blindly adding will-change across elements. This supports the implementation approach, not a claim of zero CPU/battery impact.
4. [NN/g — parallax usability](https://www.nngroup.com/articles/parallax-usability/): elaborate scrolling effects can undermine control and readability. Keep normal scrolling, visible content and stationary foreground copy.
5. [NN/g — animation duration](https://www.nngroup.com/articles/animation-duration/): immediate interaction feedback should feel responsive; large transitions need more care. Short feedback/reveal timings below are page-specific starting values, not mandatory universal durations.
6. [web.dev — video performance](https://web.dev/learn/performance/video-performance): video format, codec, poster, loading and embedding choices affect delivery. Retain a promptly visible image, avoid large animated GIFs and do not add a third-party player for decorative ambience.
7. [MDN — autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): autoplay can fail and play() exposes a promise for success/failure. A future video must preserve a usable static fallback and controls rather than assume playback.
8. [WebKit — inline/muted video policy](https://webkit.org/blog/6784/new-video-policies-for-ios/): muted inline playback provides relevant platform guidance; test current devices rather than treat historical policy as a guarantee.
9. [MDN — page visibility](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState): visibility changes identify hidden tabs/windows. Suspend work while the page is hidden, and restore only if user preference still permits it.
10. [Pexels license](https://www.pexels.com/license/): stock-source eligibility does not imply endorsement or prove a venue is Bella Vista. Preserve the current concept disclosure and verify any selected media's provenance.
11. [Outdoor cafe candidate](https://www.pexels.com/video/cozy-outdoor-cafe-with-evening-ambiance-30708795/): source metadata lists 1920×1080, 7 seconds and 30fps. This is a metadata-only reference, not a selected or fully viewed seamless-loop asset; its cafe setting is not the current garden-estate facade.

## Approved implementation brief

- Background only: initial tuning around 24 seconds per direction, scale approximately 1.01 to 1.035, with a smooth alternate return and no hard loop cut. Keep the dark readability scrim static. Fine-tune crop from actual desktop/phone renders.
- Foreground: stationary headline/Continue target; gently move only its decorative arrow on hover/focus (about 4px, 180ms). Maintain a visible keyboard focus outline. No click delay or mandatory animation.
- Story: about 8–10px/300–360ms, once per content group while normally scrolling. Base HTML stays visible; skip effects for direct story fragments and reduced motion.
- Controls: a native Pause motion/Resume motion button of at least 44px height. Pausing freezes the background and suppresses nonessential feedback/reveals. Remember only the local motion preference, separate from booking state; blocked storage must not break controls.
- Lifecycle: load the existing image eagerly, enable continuous motion only once its control/listeners are ready, stop when the hero is offscreen or the tab hidden, and retain an image-failure/no-JavaScript static experience.
- Reduced motion takes priority; no continuous movement, animated entrances or missing content. New video, additional animation libraries, audio, database changes and external publication are outside this implementation.

## If an actual exterior video is selected later

Prefer a matching 8–12-second restrained scene with a locked camera, gently moving foliage and stable architecture/light. This is a creative target, not a fixed technical requirement. Review the entire timeline, first/end seam, phone crop, headline contrast and any AI geometry artifacts. Remove audio, deliver compatible optimized media, preserve the original image as the immediately visible fallback, and handle blocked playback. Define and measure separate desktop/mobile byte and performance budgets before adoption; no untested size or speed guarantee is made here.

## Verification requirements

Observe a failing motion/control test before implementation. Verify actual background movement with stable foreground bounds; keyboard pause/resume and freeze behavior; persisted pause without automatic restart; reduced-motion changes; hidden-tab/offscreen suspension; once-only story animation and direct-fragment visibility; blocked storage; image/JavaScript fallback; phone crop/overflow and accessibility. Rerun the existing intro/reservation journey and preservation checks. The delivered evidence follows.


## Local delivery and evidence — 2026-10-28

Implemented the approved existing-image approach: 24-second alternate background zoom (1.01–1.035), stationary headline/Continue target, 180ms decorative hover/focus feedback and once-only 360ms story reveals. A native 44px Pause/Resume button remembers the local preference. Reduced-motion settings take priority; hidden tabs and offscreen heroes suspend movement. Image failure and no JavaScript retain a usable static page. No video, animation dependency or media download was added; existing concept-image hashes and reservation routes/navigation remain unchanged.

A failing control test was observed before implementation. The final `tests/browser-intro-motion.mjs` run passed all 20 checks, including actual transform progression/freeze, fixed foreground rectangles, keyboard and persisted preference, reduced-motion changes, visibility/offscreen lifecycle, real story animations, direct fragments, storage/image/JavaScript fallback, no HTTP writes and no new video/external resource. Accessibility checks passed at 1366, 390 and 320px; the two phone widths also assert no overlap between the motion button, Continue and provenance. Desktop/phone screenshots were inspected. The existing `tests/browser-intro.mjs` passed all 27 journey checks again. PHP lint (111 files), JS syntax, whitespace and latest-preview smoke passed; main/preview database counts and content hashes matched their preserved baseline.

An independent read-only review found no critical or important defect; its requested explicit phone overlap assertions were added and passed. A 1.8-second desktop Chromium sample measured zero additional layouts during ambient motion. This limited observation does not establish device-wide frame rate or battery performance. Physical iOS/device testing and the full branding/staff suite were not rerun for this change. Source is local and uncommitted; neither remote privacy nor the hosted release was changed.
