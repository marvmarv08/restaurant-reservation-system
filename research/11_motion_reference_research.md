# 11 — Motion references and recommendations for Lumina

Research date: 2026-10-08. Owner: Marvin. Working folder: Windows Desktop `restaurant-reservation-system`.

**Status: research complete. The first selected batch—room-photo reveals and table-picture crossfade—is now delivered locally; other proposals remain unimplemented.** See section 11 for the follow-up implementation evidence. Existing continuous food-gallery/chef motion remains as requested. No application code, database records, GitHub push, or Vercel deployment was changed by this research.

## 1. Recommended direction

Keep Lumina warm, cinematic, and easy to use. Its charcoal background, amber accents, serif headings, food photography, and chef loop already establish the atmosphere. The best next investment is coordinated photo presentation and meaningful state feedback, using the existing styling rather than introducing a new visual identity.

Use three levels of motion:

| Area | Character | Recommendation |
| --- | --- | --- |
| Guest inspiration: food and room browsing | Calm and expressive | Retain the continuous food showcase. Add a few short, one-time photo reveals and smooth image changes. |
| Booking and private management | Clear and reassuring | Keep fast selection and step feedback. Show success only after the server confirms it. |
| Admin, server and kitchen | Quick and practical | Highlight actual changed records once. Keep tables, controls and ticket positions steady during routine refreshes. |

This is a project-specific design judgment, not a measured conversion result or a universal ranking. Creator examples establish possibilities; official motion and browser guidance establish implementation constraints. Atlassian recommends restrained frequent interactions and more expression for occasional brand moments [S12].

A **reveal** introduces an image or heading. A **crossfade** overlaps an old and a new image briefly so the switch has no blank frame. **Stagger** means neighboring elements arrive a few milliseconds apart. **Parallax** means an image moves at a different rate from scrolling. Those effects should serve a clear purpose in this application.

## 2. Evidence and access limits

The research used creator case studies, public demo pages, indexed YouTube descriptions, Reddit discussions, and official browser/design documentation. Direct TikTok pages were blocked by robots restrictions; unrelated TikTok Shop generated pages were rejected. No TikTok clip is represented as watched or recommended on visual evidence.

Visual inspection completed:

- Two public Amici creator showreels linked by Beaucoup: 35.47 and 33 seconds. Each was downloaded temporarily and sampled at six evenly spaced positions. The frames show photographic collage, layered cream/olive compositions, restaurant imagery, and physical-menu-like panels. These are edited presentations, not measurements of the live website's speed or usability.
- Bracken's public GSAP Vault demo: desktop hero and menu inspected in a read-only browser with form submissions blocked. Its near-black surface, gold details, atmospheric full-width photography and serif type are close to Lumina's mood. Ten of 21 image elements were loaded at the initial snapshot, so image delivery was not fully certified. No JavaScript page error was observed in that limited visit. A screenshot does not validate all advertised effects.
- The current Lumina sources were checked, including `guest-motion.js`, `food-showcase.js`, shared feedback CSS, table-showcase CSS, staff rendering and service polling.

Limits:

- YouTube videos below were discovered through indexed creator descriptions or their source repository. Full playback could not be retrieved. Their timestamps are creator-published navigation points, not a claim that this research watched those segments.
- Dribbble creator pages were readable through the web reader, but direct preview media could not be inspected. They remain secondary viewing candidates.
- Rasa Kenangan's creator write-up was readable, but its live demo failed DNS resolution. Its claimed Lighthouse results were not independently tested and are not used as proof of performance.
- The Amici Awwwards detail page timed out. Creator attribution and the design explanation were checked through Beaucoup and its first-person interview instead.
- Protected Lumina staff flows were reviewed from source; no new authenticated user session, order, reservation or deletion was created.

Temporary inspection evidence is in `/tmp/lumina-motion-research/`. Public previews were used for analysis only. They are not licensed application assets and were not copied into the project. The stable references below are the durable record.

## 3. Best references to open

The fit labels are qualitative comparisons against Lumina's palette, existing layout, real booking workflow, phone usability and vanilla PHP/JavaScript stack.

| Reference | Evidence reviewed | Fit | What to borrow | What to leave out |
| --- | --- | --- | --- | --- |
| [Amici by Beaucoup](https://beaucoup.studio/en/projects/amici/) [S1] | Creator case study and two sampled showreels | High for transition ideas; medium for overall branding | Layered photo transitions, a sense of a physical restaurant menu, coordinated imagery | Olive/cream rebrand, playful stickers, rotating collage around booking controls |
| [Bracken public demo](https://gsapvault.com/demos/restaurant-template/index.html) [S3] | Creator documentation and desktop hero/menu inspection | High for atmosphere | Dark photographic treatment, cream serif hierarchy, controlled image movement | Replacing the catalog with cursor-only images or buying/rebuilding around the template |
| [Khufu's creator case study](https://monarqeg.com/case-studies/khufus/) [S4] | First-party design explanation; video not inspected | High as a cinematic direction | Atmosphere leading naturally into menu and reservations | Copying its location story or treating its external booking integration as a proven reservation engine |
| [Bedimcode sushi website video](https://www.youtube.com/watch?v=HW1zt2EPMqY) [S5] | Indexed creator description and published chapter list | High as a practical vanilla learning reference | Responsive section reveals and mobile-first examples | Copying the sushi palette, demo content or theme switch |
| [Bedimcode restaurant source](https://github.com/bedimcode/responsive-website-restaurant) [S6] | Creator repository description and linked video | High as an understandable learning reference | How simple restaurant sections connect to motion | Assuming a static landing page supplies booking, permissions or kitchen behavior |
| [AliJ animated restaurant video](https://www.youtube.com/watch?v=d7nHArQQFg4) [S7] | Indexed creator description; playback unavailable | Medium: richer motion inspiration | Coordinated restaurant presentation | Adding Next.js, ScrollMagic, SASS or Swiper just to reproduce a visual |
| [Akaru-style fullscreen navigation tutorial](https://www.youtube.com/watch?v=OiA33b3BvJY) [S8] | Indexed creator description; playback unavailable | Medium for occasional navigation | Smooth panel entrance with a clear close action | A full-screen menu that slows down Reserve or obscures the booking form |
| [Valery Cheplygin restaurant opening](https://dribbble.com/shots/25459325-Restaurant-Website-Opening-Animation) [S9] | Creator page; preview not inspected | Potentially high palette fit; motion unverified | A viewing candidate for warm photographic openings | Calling a presentation concept a tested live workflow |
| [Vadim Sherbakov restaurant proposal](https://dribbble.com/shots/2976400-Restaurant-website-animation) [S10] | Creator page and video attachment listing; playback unverified | Potentially high amber/charcoal fit | A viewing candidate for restrained hospitality composition | Reusing its client media or assuming the attachment can be redistributed |
| [Rasa Kenangan creator write-up](https://dev.to/rexreus/rasa-kenangan-immersive-scroll-narrative-landing-page-1dm0) [S11] | First-party article; live demo unavailable | High visual/stack resemblance, with verification limits | Warm storytelling and native horizontal browsing | Loading intro, many simultaneous effects, demo-only reservation form |

### Short watch list

Amici's creators describe its navigation opening as reminiscent of a physical restaurant menu [S2]. That is a stronger basis for the recommendation than assuming every movement in an edited showreel belongs to the live site.

Start with the [Amici website-focused showreel](https://streamable.com/wa489m) and [broader Amici presentation](https://streamable.com/82xudf), both linked by the creator [S1]. They illustrate an integrated visual language rather than an isolated effect.

For code learning, Bedimcode's [sushi tutorial](https://www.youtube.com/watch?v=HW1zt2EPMqY&t=6749s) places its scroll-animation chapter at **1:52:29**, according to the published description [S5]. The intro begins at 0:00. Compare it with [the other restaurant tutorial linked by Bedimcode](https://youtu.be/5RIFrZEjURA) [S6]. These are learning references, not a recommendation to replace Lumina's backend.

## 4. Existing effects at the research baseline

| Existing local behavior | Research decision |
| --- | --- |
| Continuous food columns at 40/46/43-second loops; phone strip drift; muted chef loop | Keep the requested continuous visible motion. This is already delivered, not a new proposal. |
| Reduced-motion, hidden/offscreen and image/video-failure fallbacks | Keep and extend to any later effects. |
| Initial hero response at 220ms; booking/content entrance at 180ms; menu changes at 140ms | Preserve. Any redesign must replace an existing effect rather than stack another animation on it. |
| 160ms table dialog entrance; 180ms image fade; 2px card lift and 1.025 image zoom | Preserve sensible defaults. A true overlapping image crossfade would be an enhancement to the current fade-in. |
| Pending labels, stable action width, success/error messages and loading skeletons | Already implemented. Do not present them as missing features. |
| Staff and service regions use DOM replacement | New changed-item feedback needs identity/version tracking first; applying entrance styles to every rendered row would replay on polling. |
| Kitchen polls every two seconds, server every six seconds; interaction guards protect active work | Preserve guards and refresh correctness. A persistent highlight must not restart for identical data. |

This table records the pre-implementation research baseline; section 11 records the later room-reveal/crossfade delivery.

Source anchors: [guest motion](../public/assets/js/guest-motion.js), [food motion](../public/assets/js/food-showcase.js), [shared feedback](../public/assets/css/ui-feedback.css), [table styles](../public/assets/css/table-showcase.css), [staff script](../public/assets/js/staff.js), [service script](../public/assets/js/service.js). Earlier E1/E2 delivery is documented in [the previous research](08_ui_motion_research.md).

## 5. Ranked next effects

All timing values below are **proposed Lumina settings**, not universal rules or measurements taken from another site. An animation must never delay real data, keyboard focus, booking actions or a saved result.

| Priority | Effect and location | Suggested behavior | Effort | Why it fits |
| --- | --- | --- | --- | --- |
| 1 | One-time room/photo reveal | 180–220ms opacity and 4–6px travel when a nonessential photo enters view; at most 25ms stagger, capped across the group | Low | Adds polish to the current photography without hiding the form or prices. |
| 2 | True crossfade in table preview | Old image stays visible until the requested image is ready; overlap for about 180ms; latest selection wins | Medium | Makes browsing the original seating images feel continuous without changing availability logic. |
| 3 | Menu category selection emphasis | Short amber underline/pill response; retain the existing 140ms result transition and immediate item/count update | Low | Clearer browsing using the existing food catalog. This is refinement, not a missing menu system. |
| 4 | Changed reservation/status highlight | Brief amber surface emphasis on the actual changed row, then settle; no row movement | Medium | Lets staff see what changed without losing their reading position. Requires record comparison. |
| 5 | New kitchen ticket / ready-state feedback | New ticket enters once in 140–160ms; ready state uses a labeled badge with one short emphasis | Medium | Supports work under time pressure while preserving the two-second refresh cadence. |
| 6 | Booking confirmation icon | A single 220ms SVG check reveal after successful server confirmation; persistent code/details are instantly readable | Low | A restrained completion moment with truthful meaning. No confetti or fake success. |
| 7 | Connection-restored feedback | One short icon/color response after genuine reconnection; keep last-update/stale wording | Low–medium | Makes recovery understandable without a continuously blinking live indicator. |
| 8 | Shared photo transition into a room preview | Optional 160–200ms image continuity, only for deliberate open/navigation | Medium–high | Attractive, but requires a narrow prototype and focus/fallback checks before adoption. |
| 9 | Small photographic parallax in a future venue story | At most about 8–12px inside a clipped image frame; ordinary stacked mobile layout | Medium | Could add depth if story content is requested; that section is currently deferred. |

For a first visual batch, recommend **room/photo reveals plus table-preview crossfade**. They add something visible beyond the continuous food section and are independent of new venue content. The first operational batch should target **changed-record feedback**, preserving E3's deferred status until Marvin requests it.

### Example sequences

Room browsing: the room photo arrives once → a card responds subtly to hover → the preview opens with its existing short entrance → switching tables crossfades only the picture → capacity and availability remain immediate and textual.

Booking: selected slot changes immediately → the action shows its real pending label → successful server response renders the saved booking → a small checkmark finishes once. An expired hold or failed request must never display the success sequence.

Kitchen: receive a previously unseen ticket ID → show that ticket's short entrance once → subsequent identical polls do nothing visually → a real status revision updates the badge. Changing filter/date/station initializes a fresh baseline rather than pretending every resulting ticket just arrived.

## 6. Technology choice for this project

| Option | Recommendation | Reason and constraint |
| --- | --- | --- |
| CSS plus the existing Web Animations API | Default | Fits the vanilla stack and short effects. Native animation controls are documented by MDN [S13]; existing cancellation/reduced-motion handling should be reused. |
| GSAP core plus ScrollTrigger | Optional for a genuinely coordinated guest sequence | Official ScrollTrigger supports scroll-triggered timelines and one-time handling [S14]. `matchMedia` provides responsive setup and cleanup [S15]. It is not necessary for ordinary button or row feedback. |
| Motion's vanilla `animate` | Capable alternative, not an additional dependency to combine with GSAP | Official documentation supports JavaScript and native-style animation [S16]. Choose one approach only if it solves a need beyond the current helper. |
| Anime.js | Another capable sequence engine | Official documentation is available [S17]; no decisive project need justifies introducing it here. |
| View Transition API | Narrow experimental option for image continuity | MDN documents both DOM and document transitions [S18]. Feature-detect the exact API; preserve an instant/CSS fallback. Avoid global snapshots around private booking details and live staff updates. |
| Native HTML video | Keep the existing decorative chef clip | Useful atmosphere already delivered. No TikTok/YouTube embed or new heavy background download is needed. |
| Lottie, WebGL, full-page smooth-scroll engines | Defer | No selected recommendation requires them. More assets and lifecycle behavior would need separate justification and testing. |

GSAP's official April 2025 announcement made its toolset and bonus plugins available free, including commercial use [S19]. That does not make every third-party GSAP template or its photographs free. No library was installed and no template purchased. If selected later, keep approved files local for the laptop/offline demonstration and check their current license before redistribution.

Favor `transform` and `opacity`, then profile on the actual laptop/phone. Google's browser guidance cautions against layout/paint-heavy animation and indiscriminate `will-change` [S20]. A small clip/mask effect needs profiling rather than an assumption that it is cheap. Native mobile scrolling and visible buttons remain the interaction baseline.

## 7. Reddit findings and effects to reject

The [2024 discussion about scroll effects](https://www.reddit.com/r/web_design/comments/1d91whv/) distinguishes storytelling from fast functional interfaces; participants disagree on aesthetic preference [S21]. The [portfolio feedback thread](https://www.reddit.com/r/webdesign/comments/1nacrc0/roast_my_portfolio_did_i_overdo_the_motion/) raises reading order and too many simultaneous movements [S22]. These are community opinions, not controlled usability research or technical authority.

For Lumina, reject:

- Scroll hijacking or a forced horizontal page journey before guests reach Reserve.
- Long branded loaders, invented loading percentages, and delayed access to menu prices.
- Magnetic Reserve buttons, cursor trails over booking inputs, or 3D tilt on staff controls.
- Continuous blinking/pulsing on operational rows, counters, or kitchen urgency badges.
- Replaying all card entrances every two/six/eight-second refresh.
- Giant split-letter animation on every heading; one restrained brand moment is enough.
- Steam/particle layers on top of the existing chef video and moving photo columns.
- Auto-playing sound, mandatory video completion, or remote social embeds in the offline demo.

Bracken's cursor-image trail is an interesting presentation effect, but Lumina already shows individual menu thumbnails. A moving trail would obscure reading and needs a different touch interaction. Its atmospheric treatment is more valuable here than copying its signature cursor effect.

## 8. Motion preference and accessibility tradeoff

Marvin explicitly requested continuous showcase motion and removal of the in-section Pause button. This research preserves that instruction and does not restore the control.

Reduced-motion support remains necessary, but it is not by itself proof of meeting every accessibility requirement [S23]. WCAG 2.2.2, a Level A criterion, addresses automatically moving content lasting more than five seconds beside other content; its guidance requires a pause/stop/hide mechanism unless the motion is essential [S24]. Decorative food motion is not essential to making a reservation.

If a later public release targets that criterion, a discreet global **Motion preferences** or **Hide animated media** option is a possible design to investigate without restoring the large in-section button. That is a future proposal requiring a choice and verification, not a claim that the current continuous design conforms. Automated scanner passes do not settle this issue.

Keep controls readable, focus outlines immediate, and selected/error/success state understandable without motion or color alone. Native dialog focus, Escape and return-focus behavior must not depend on a transition finishing [S25].

## 9. Local verification before implementing a chosen batch

The research does not claim these new effects were tested. Future implementation should prove:

1. Booking/search/menu controls work immediately, including during animation.
2. Reduced motion shows the same complete content without translation, scaling or decorative loops.
3. Repeated navigation and fast table-photo selection cannot reveal an old image or blank a ready image.
4. The room dialog retains keyboard focus, Escape and opener return behavior.
5. Phone scrolling works normally; 320/390/768/1440px layouts have no horizontal page overflow.
6. No-JavaScript, missing image/video, observer absence and animation errors leave usable content.
7. Staff polls with identical data produce no motion; one actual changed version produces one emphasis.
8. Filters, reconnects and first loads do not mislabel existing records as new arrivals.
9. A failed booking/order action never plays a saved-success effect or suppresses a readable error.
10. CPU/paint behavior is profiled on the target laptop; offline/local asset operation is rehearsed.

## 10. Sources and evidence classes

Checked on 2026-10-08. A reference label indicates exactly what was available; a live demo or creator claim is not proof of Lumina's behavior.

| ID | Direct source | Evidence class |
| --- | --- | --- |
| S1 | [Beaucoup: Amici](https://beaucoup.studio/en/projects/amici/) — [showreel one](https://streamable.com/82xudf), [showreel two](https://streamable.com/wa489m) | Primary creator page; both video previews visually sampled |
| S2 | [Amici design interview](https://www.commarts.com/webpicks/amici) | Primary first-person creator explanation |
| S3 | [GSAP Vault restaurant documentation](https://gsapvault.com/templates/restaurant-template), [public demo](https://gsapvault.com/demos/restaurant-template/index.html) | Primary template creator documentation and limited visual inspection |
| S4 | [MONARQ: Khufu's](https://monarqeg.com/case-studies/khufus/) | Primary creator case study; promotional outcomes not independently verified |
| S5 | [Bedimcode sushi tutorial](https://www.youtube.com/watch?v=HW1zt2EPMqY) | Indexed creator description/chapter list; playback unavailable |
| S6 | [Bedimcode restaurant repository](https://github.com/bedimcode/responsive-website-restaurant), [creator-linked video](https://youtu.be/5RIFrZEjURA) | Primary repository; video link unplayed |
| S7 | [AliJ Coding restaurant animation](https://www.youtube.com/watch?v=d7nHArQQFg4) | Indexed creator description; video unplayed |
| S8 | [Akaru-style navigation tutorial](https://www.youtube.com/watch?v=OiA33b3BvJY) | Indexed creator description; video unplayed |
| S9 | [Valery Cheplygin opening concept](https://dribbble.com/shots/25459325-Restaurant-Website-Opening-Animation) | Primary creator description; motion preview unavailable |
| S10 | [Vadim Sherbakov restaurant concept](https://dribbble.com/shots/2976400-Restaurant-website-animation) | Primary creator description/attachment listing; preview unavailable |
| S11 | [Rasa Kenangan creator article](https://dev.to/rexreus/rasa-kenangan-immersive-scroll-narrative-landing-page-1dm0) | Primary write-up; live demo unavailable |
| S12 | [Atlassian motion foundation](https://atlassian.design/foundations/motion) | Official design guidance |
| S13 | [MDN Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | Primary browser API documentation |
| S14 | [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | Official library documentation |
| S15 | [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | Official library documentation |
| S16 | [Motion animate](https://motion.dev/docs/animate) | Official vanilla library documentation |
| S17 | [Anime.js documentation](https://animejs.com/documentation/) | Official library overview |
| S18 | [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Primary browser API documentation |
| S19 | [GSAP 3.13 announcement](https://gsap.com/blog/3-13/) | Official licensing/availability announcement; not a version pin |
| S20 | [Google: animation performance](https://web.dev/articles/animations-guide) | Primary browser performance guidance |
| S21 | [Reddit: scroll-effect opinions](https://www.reddit.com/r/web_design/comments/1d91whv/) | Community opinion only |
| S22 | [Reddit: portfolio motion feedback](https://www.reddit.com/r/webdesign/comments/1nacrc0/roast_my_portfolio_did_i_overdo_the_motion/) | Community opinion only |
| S23 | [MDN reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | Primary browser documentation |
| S24 | [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | Official criterion explanation |
| S25 | [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Official interaction/accessibility guidance |

The earlier [effects study](08_ui_motion_research.md), [food-photo research](09_food_showcase_research.md), and [chef-video research](10_chef_background_video_research.md) retain their original evidence. This report is the current reference comparison; it does not retroactively mark E3/E4 or any proposed new effect delivered.

## 11. Selected local batch delivered — 2026-10-08

Marvin selected room-photo reveals and table-picture crossfade after reviewing the recommendations. Room photo wrappers now reveal once on entering view, using the existing 220ms/6px guest motion settings while leaving the actual buttons stable. Table previews retain the displayed image and matching caption until the latest requested image loads, then crossfade the old picture over the ready new picture for 180ms. Request revisions, dialog state and cleanup prevent late responses or old overlays from winning; reduced motion, immediate keyboard use and image failure remain supported.

Fresh evidence: 11 focused room-motion, 31 guest-motion and 41 full showcase browser checks passed. New regressions first failed for the missing reveal and the old immediate image removal. JavaScript syntax, whitespace, localhost smoke and exact served source hashes passed. Actual localhost desktop/mobile views and missing-API fallback were exercised read-only and screenshots inspected. Independent code review found no actionable issue. No library was installed, no main database record/reset/seed was changed, and no push/deployment occurred. These counts belong to this follow-up batch, not to the earlier research. E3/E4 and the remaining proposed effects are still deferred.
