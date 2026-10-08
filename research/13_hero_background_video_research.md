# Full booking-hero background video research

Reviewed: 2026-10-08. Status: research complete; Marvin approved the recommendation and it is delivered on localhost. Original research evidence below is retained separately from the implementation result.

## Requested area and recommendation

Marvin clarified that the video should cover the **entire background shown in his screenshot**, behind both “A seat by the fire” and the reservation form. This is the full guest booking hero, not the separate cooking-video panel below it. The existing hero backdrop already spans both columns.

**Recommended source: [Cozy Modern Restaurant Interior at Night](https://www.pexels.com/video/cozy-modern-restaurant-interior-at-night-31631562/), by gusat silviu.** Its dark evening dining room, amber lamps, wood table and restrained sideways camera movement match Lumina's existing cream/gold/dark palette. This fit is a visual design judgment, not a measured conversion or usability result. The licensed source is 12 seconds; the downloaded 4K original is about 22.38 MB and must be reduced before application delivery.

Recommended treatment: one silent dining-room shot across the full hero, a softened loop join, the existing dark gradient, and the existing solid booking card. Continuous motion while visible fits Marvin's preference. Preserve a static poster when motion is reduced, playback fails or the browser cannot autoplay. Update the atmosphere-inspiration credit to the actual video creator; stock footage should not be represented as the real Lumina venue.

## Candidate comparison

Four clips were downloaded from public offered video URLs and visually sampled at six decoded times each. Other entries below were inspected as source pages only. These are fit rankings, not numerical quality scores.

| Candidate and primary source | Evidence inspected | Fit and decision |
| --- | --- | --- |
| **1. [Pexels 31631562 — restaurant at night](https://www.pexels.com/video/cozy-modern-restaurant-interior-at-night-31631562/), gusat silviu** | Actual 12-second 3840×2160 clip; six frames across 0.04–11.96 seconds; full-hero desktop/phone playback previews | Best match: warm lamps, dark surroundings, prepared dining table and gentle movement. End/start framing differs, so the original is not a seamless loop. |
| **2. [Pexels 31877279 — empty restaurant with warm lighting](https://www.pexels.com/video/cozy-empty-restaurant-interior-with-warm-lighting-31877279/), Sururi Ballıdağ Director** | Actual 8.24-second 2560×1440 download; six decoded frames | Usable backup for a brighter café direction. Woven amber lamps fit, but daylight windows, air conditioning and more obvious camera movement fit the evening theme less well. |
| **3. [Mixkit 4195 — classically styled restaurant](https://mixkit.co/free-stock-video/classically-styled-restaurant-4195/)** | Actual 74.33-second 1280×720 clip; six decoded frames across its duration | Prepared tables and green seating; much brighter daylight and white tablecloths. Camera pan changes the composition substantially. Would need a short selected segment and darkening. |
| [Pexels 36805137 — restaurant with modern lighting](https://www.pexels.com/video/cozy-restaurant-ambiance-with-modern-lighting-36805137/), Monirul Islam | Actual 7.38-second 1920×1080 clip; six decoded frames | Reject for this hero: teal lighting and magenta flowers conflict with the palette; a person enters the foreground later, adding distraction. |
| [Pexels 31877282 — modern restaurant interior design](https://www.pexels.com/video/cozy-modern-restaurant-interior-design-31877282/), Sururi Ballıdağ Director | Source page only | Related dining-interior alternative; not selected without temporal inspection. |
| [Pexels 3768326 — lighted candles and wine glass](https://www.pexels.com/video/lighted-candles-and-wine-glass-on-a-table-3768326/), Taryn Elliott | Source page describes six-second landscape footage and a home/board-game setting | Candle motion is promising, but a home game table weakens restaurant identity. Not ranked above inspected restaurant footage. |
| [Pexels 9096926 — candle light on a dining table](https://www.pexels.com/video/candle-light-on-a-dining-table-9096926/), Timur Weber | Source page only; vertical/home-oriented tags | Portrait composition is difficult to stretch behind both desktop columns. A reference for subtle light movement, not the selected asset. |
| [Pexels 5722538 — dinner table with candle lights](https://www.pexels.com/video/dinner-table-with-candle-lights-5722538/), Any Lane | Source page lists vertical 2160×3840 Christmas footage | Seasonal scene and portrait crop make it a weak year-round full-width background. |
| [Mixkit 101565 — candlelit autumn table](https://mixkit.co/free-stock-video/candlelit-autumn-table-in-chiaroscuro-101565/) | Source page: ten seconds, static camera with candle flicker; commercial-use Free License | Best alternative motion *style*: tiny local movement without camera drift. Pumpkin/fig/pie autumn theme does not match the general Lumina hero. Actual stream not inspected. |
| [Mixkit 101556 — autumn table with candles](https://mixkit.co/free-stock-video/autumn-table-with-candles-101556/) | Source page: 16 seconds, seasonal setting; Free License | Seasonal décor rather than a general evening restaurant. Actual stream not inspected. |
| [Pixabay 177733 — dining table, night, candles, flowers](https://pixabay.com/videos/dining-table-night-candles-flowers-177733/), Eartvideos | Source page and content-license summary | Possible candle-table alternative, but not downloaded or temporally inspected. Individual asset provenance/AI status was not established; do not infer it from the creator's other work. |

The [Coverr restaurant collection](https://coverr.co/stock-video-footage/restaurant) and its public search were also explored. Search results mix footage types and access tiers, so the collection is a discovery pool rather than a selected licensed item. One collection fetch exceeded the browsing tool's size limit. No subscription or purchase was made.

TikTok/YouTube/social videos are useful mood references, but a public post alone does not establish permission to reuse its footage. This shortlist prioritizes primary stock-source pages with usable terms. No social video is claimed as watched or licensed in this research.

## Actual video measurements

These values describe downloaded files, not assumed page labels or planned compressed output.

| File | Decoded duration | Dimensions | Download size |
| --- | --- | --- | --- |
| Pexels 31631562 | 12.00 s | 3840×2160 | 22,377,626 bytes |
| Pexels 31877279 | 8.24 s | 2560×1440 | 10,839,686 bytes |
| Pexels 36805137 | 7.38 s | 1920×1080 | 5,440,175 bytes |
| Mixkit 4195 | 74.33 s | 1280×720 | 23,542,182 bytes |

Selected original SHA-256: `52da8594f4203ebcd6db2c44cf1147dd03b647beadf2297c75b104ca0c986a43`.

Initial preview sampling returned repeated first frames because the temporary HTTP server did not honor byte-range requests. It was corrected to serve video ranges; new decoded media times then matched all 24 requested sample positions within 0.06 seconds. Only the corrected contact sheets were used for temporal judgments. This also resolved provisional incomplete duration readings. The six-position inspection is not a frame-by-frame audit of every clip.

## Full-background research previews

The existing localhost guest page was inspected at 1440px desktop width and 390px phone width. In a temporary browser session only, the backdrop photo was replaced with the selected video; the heading, form, dark gradient and layout came from the actual current application. Network requests were restricted to read-only local requests. No booking was submitted and no application source was changed.

- [Desktop full-hero preview](hero-video-previews/desktop.png): both columns remain legible; warm lighting and the foreground table connect the background to dining.
- [Phone full-hero preview](hero-video-previews/mobile.png): heading and form remain readable and the document has no horizontal overflow, but the tall stacked hero crops away much of the dining room. A dedicated mobile framing/export should be reviewed before delivery.

The raw video's playback time advanced on both viewports. Seeking near the decoded end confirmed browser repeat to the start. **This proves repeat behavior, not a seamless visual join.** First/last frames differ visibly; a soft crossfade is still required. The screenshots show early playback frames; six source-frame samples supported the exposure/movement assessment. No quantified contrast certification, physical-device Safari check or compressed-video performance benchmark is claimed.

## Loop and delivery design for a later local implementation

1. Select roughly 8–12 seconds from the recommended shot with consistent exposure. Blend the final 0.6–1.0 second into the beginning and inspect the transition at normal speed. Avoid reversing the whole shot: it can make ordinary camera movement visibly oscillate.
2. Export a silent H.264 MP4 at approximately 1280×720 and 24–25 fps, with web-friendly metadata placement. A 1–3 MB payload is a project target to measure, not an achieved result. Keep a matching poster. The original 22 MB download should stay out of the app bundle.
3. Put the video in the existing full-size `.hero-backdrop`, behind both text and form. Retain `object-fit: cover`, review mobile positioning separately and keep the existing gradient. Video should never intercept clicks or keyboard focus.
4. Use muted inline playback with repeat, and handle an autoplay refusal by displaying the poster. Keep booking controls immediately usable while video loads. Pause decoding when the hero is offscreen or the document hidden; resume when visible. Honor reduced motion with the poster. These lifecycle behaviors are proposed, not tested application features.
5. Test the actual compressed loop, brightest frames, poster/loading/error behavior, keyboard/form use, desktop and mobile crop, and phone playback before calling implementation complete.

[MDN's native video reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video) documents repeat, muted playback, inline display and posters. [web.dev's video performance guidance](https://web.dev/learn/performance/video-performance) supports removing unnecessary audio, compressing delivery, considering a poster and avoiding heavy third-party players for decorative footage. A locally served native video suits this project's vanilla stack.

For a later accessibility review, [W3C SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) addresses automatically moving content lasting more than five seconds alongside other content. Reduced-motion support by itself is not proof of full compliance. Marvin's existing no-visible-Pause preference is recorded; this research makes no conformance claim.

## Reuse terms and provenance

- [Pexels License](https://www.pexels.com/license/): free website/app use and edits are permitted; attribution is optional but helpful. Restrictions include implied endorsement and stock-platform redistribution. Retain the creator, page URL and download date in the eventual asset manifest.
- [Mixkit licensing](https://mixkit.co/license/): check the individual video's Free versus Restricted terms. The 4195 and 101565 source pages explicitly offer the Stock Video Free License for commercial/personal use; this does not establish that every Mixkit asset has the same terms.
- [Coverr License](https://coverr.co/license): generally allows free-footage use and modification without mandatory attribution. Collection membership alone does not establish an individual premium item's download entitlement.
- [Pixabay Content License summary](https://pixabay.com/service/license-summary/): permits free use and adaptation subject to restrictions including standalone redistribution and other applicable rights.

These are source-term summaries, not a guarantee covering every trademark/property/person in every possible use. No reuse right was inferred from a search thumbnail or social repost. Current research previews credit gusat silviu and are illustrative atmosphere studies.

## Outcome and remaining work

Research is complete: eleven candidate pages compared, four actual clips temporally sampled, selected footage previewed behind the whole current hero on desktop/phone, and reuse/browser guidance checked. Recommendation: **warm evening dining ambience using Pexels 31631562**, with a softened loop and a deliberate mobile crop. Candle-flicker-only footage is the quieter alternative style, but the reviewed seasonal candle clips are poorer year-round scene matches.

At the research checkpoint, the application still used its photograph. Marvin subsequently approved implementation; the delivery result is recorded below. GitHub pushes and Vercel deployments remain paused.

## Approved local delivery — 2026-10-08

Marvin approved the recommended footage and reiterated that it must fit the actual system. The full hero now uses a warm dining-room video behind both heading and booking card, with the existing dark gradient and solid form surface. The first-frame poster matches the footage, and phone framing uses a 38% horizontal position to include the warm lamp. Actual main-localhost desktop and phone views were inspected at early playback and during the blend.

- Delivered media: silent H.264, 1280×720 at 25 fps, 11.2 seconds; 727,492-byte video and 81,894-byte poster, approximately 0.81 MB combined. The 22 MB original is not bundled. A 0.8-second encoded crossfade softens the camera position reset; briefly blended imagery remains visible rather than claiming a mathematically identical scene throughout.
- [Actual desktop delivery](hero-video-previews/delivered-desktop.png) and [actual phone delivery](hero-video-previews/delivered-mobile.png). These are the running application's screenshots, separate from the earlier in-memory studies.
- Creator, source URL, license, checksums and processing are recorded in public/assets/videos/hero/credits.json. Visible credit now names gusat silviu/Pexels and retains the atmosphere-inspiration label.
- The native decorative video starts only when visible and motion is allowed; hover, form focus and touch do not stop it. Offscreen/hidden states stop decoding. Reduced motion, missing observation/JavaScript, failed media or autoplay refusal retain the poster. Management does not load the hidden stream. The new controller receives the existing content-versioned script URL.
- Verification: The new focused check failed against the old photo-only hero before implementation, then 12 hero, eight chef, 20 gallery and 41 showcase browser checks passed (81 total). Checks use the isolated database; main desktop/phone verification allows only read-only requests. Controlled visibility events test lifecycle handling, not physical background-tab certification.
- JavaScript syntax, PHP lint, local build/smoke, exact served script/style/video/poster hashes and desktop/phone layout checks passed. The delivered 280-frame video decoded without errors; six join-adjacent frames were inspected. Independent read-only review found no actionable issue.
- No new application dependency, database reset/seeding, booking submission on main, GitHub push or Vercel deployment. Browser tests do not establish physical-device Safari support, full accessibility certification or a network performance benchmark.

Lesson: Fit depends on the actual page composition. A matching poster and dark gradient keep booking readable; a short compressed loop delivers atmosphere without loading the original stock file.
