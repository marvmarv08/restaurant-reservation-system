# 14 — Desktop UI and motion research for Lumina

Research date: 2026-10-14. Owner: Marvin. Status: research complete; Marvin approved the first desktop guest batch and it is delivered locally. Later proposals remain unimplemented.

## Purpose and selected audience

Marvin requested deep research across websites, existing restaurant systems, apps and GitHub projects, including motion and other fitting UI improvements. He clarified that the system will be presented through a laptop or desktop computer. This supersedes the initial phone-focused recommendation: prioritize 1280×720, 1366×768 and 1440×900 desktop views. Preserve basic small-screen usability without turning this into a phone redesign.

The recommended outcome is an elegant, coherent restaurant presentation with a clear live booking demonstration and readable operational screens. Keep Lumina's warm charcoal, bone-white and amber identity, existing imagery and real PHP/MySQL workflows. Success means visible improvements during the presentation while the audience can follow actual search, selection, confirmation and service states.

This is a design recommendation grounded in inspected sources and screens, not a measured conversion improvement or a universal ranking of restaurant websites.

## Research method and limits

- Read current templates, guest/service scripts, CSS, existing motion research and authoritative roadmap. Checked the current app rather than assuming the original architecture description reflects delivered UI.
- Reviewed public primary sources: restaurant sites, their creators, restaurant-software product/training pages, animation repositories, browser documentation and accessibility guidance.
- Opened six public restaurant references in a read-only Chromium browser: HIDE, Duddell's, Bracken, Amici, Khufu's and Alchemist. Five produced screenshots; Amici timed out. Inspected both initial and subsequent frames, including Khufu's after its Skip Intro action. This is a limited visual comparison, not a full motion or usability audit.
- Reviewed Lumina's live home, room cards, menu, staff login, real availability results and table preview. GET/HEAD requests were allowed; form mutations were blocked. No booking, hold, order or staff record was intentionally created or changed.
- Lumina had no JavaScript page errors in the initial read-only inspection. Its 390px check was performed before Marvin's desktop-only steering and is not an implementation priority.
- HIDE initially displayed a loading logo, then a promotional overlay and cookie banner. Its visual review is limited to those observed states. Duddell's produced fetch errors while non-read requests were blocked; these are not presented as proven site defects.
- SevenRooms, Resy and Toast operational recommendations use official public descriptions and documentation. Their authenticated products were not operated. Lumina's authenticated staff/kitchen screens were inspected in source, not signed into or certified visually during this task.
- The Playwright interactive skill could not be used as written because this session has no `js_repl` tool. Temporary Node/Playwright scripts provided read-only captures instead. Browser tooling and libraries were installed/extracted only in `/tmp`; no application dependency was added.

## What the current system already delivers

| Existing feature | Verified location | Implication |
| --- | --- | --- |
| Warm theme and serif display headings | `public/assets/css/app.css` | Refine the identity rather than replace it. Actual fonts are Georgia and Arial/system fallbacks; proposed Fraunces/Inter in the original plan are not currently delivered. |
| Dining hero video and static poster | `hero-background.js`, guest template | Reuse current footage; new video is a lower-value investment. |
| Room-photo reveal, hover lift and photo zoom | `guest-motion.js`, `table-showcase.css` | These are existing effects, not new recommendations to count as delivered again. |
| Native table dialog, photo crossfade and location map | `table-showcase.js`, `floor-layout.js` | Improve visual hierarchy if needed; retain availability freshness and the existing Close toolbar. |
| Continuous food gallery and chef footage | `food-showcase.js` | Already provides a large expressive moment. Avoid competing loops around the booking form. |
| Menu thumbnails, categories, item counts and brief result entrance | `guest.js`, `menu-catalog.css` | A signature spotlight can add hierarchy; a generic menu fade would duplicate existing work. |
| Booking pending labels, errors, skeletons and step entrances | `ui-feedback.js`, `guest.js` | Upgrade completed-step markers and confirmation composition rather than invent pending feedback. |
| Real service totals, floor and persistent ticket states | `staff.js`, `service.js` | Presentation must represent real records. No fabricated live KPIs or charts. |

Current shared timings are 80ms for press, 140ms for feedback, 160ms for dialogs, 180ms for content and 220ms for brand moments. Reuse these where appropriate instead of adding an unrelated timing system.

## Desktop findings from the actual app

The home fits at the tested laptop sizes. At 1366×768 and 1280×720, the booking card runs from y=210 to y=713; the Find a table button runs from y=553 to y=599. Document width matched viewport width. At 720px height, the card has little spare room, so a new font or larger padding must be checked carefully.

After a successful availability search, the right booking column grows while the hero's left copy is vertically re-centered. A fresh 1440×900 read-only measurement moved the left copy from y=172 to y=651, a 479px shift, while the hero height grew from about 746px to 1704px. The results screenshot shows the eyebrow near the lower part of the viewport and the large headline extending below it. This is a specific composition opportunity: keep the left headline anchored while results grow naturally down the right. It makes a live demonstration easier to follow.

The three booking steps show only the current state. Completed markers, a stronger active indicator and an accessible current-step label would make progress easier for the audience to understand. These markers should follow actual application states; a pending request is not a completed reservation.

The menu presents many similarly weighted rows. Its existing database `tags_json`, `is_available`, price, description and approved photo mapping can support one featured signature dish without a new database feature. The rest of the menu should remain browseable.

Screens captured from the unmodified app:

- [Desktop home](ui-refresh-previews/lumina-desktop.png), [1366px laptop](ui-refresh-previews/lumina-1366.png), [1280px laptop](ui-refresh-previews/lumina-1280.png).
- [Expanded booking search](ui-refresh-previews/lumina-results.png), [table preview](ui-refresh-previews/lumina-table-preview.png).
- [Room cards](ui-refresh-previews/lumina-rooms.png), [menu](ui-refresh-previews/lumina-menu.png).

These are baseline screenshots, not previews of an implemented redesign.

## Reference comparison and application fit

| Reference | Evidence | Fit and idea to adapt | Boundary |
| --- | --- | --- | --- |
| [Bracken](https://gsapvault.com/demos/restaurant-template/index.html) | Live desktop hero and scrolled section | Closest overall atmosphere: dark photography, cream serif typography, gold details, persistent Reserve navigation and spacious editorial composition | A template's booking link is not a replacement for Lumina's transactional engine. Do not reuse its assets or purchase it for this task. |
| [Khufu's](https://khufus.com/) and [creator case study](https://monarqeg.com/case-studies/khufus/) | Live initial/after-intro screens and creator explanation | Strong large-scale heading composition and a continuous visual identity between atmosphere, menu and reservation access | Its intro postpones the main screen until skipped/completed. Keep Lumina usable immediately. Creator traffic/award claims were not independently verified. |
| [Duddell's](https://duddells.co/) | Live desktop and public page | Food-led composition, clear room-specific menu organization, repeated visible reservation actions | Its cream palette and wide promotional slideshow are not a proposed Lumina rebrand. |
| [HIDE](https://hide.co.uk/) | Public page and limited live overlay states | Explicit private dining destinations and practical reservation/help links | Loading and promotion overlays are not suitable for the class demonstration. Full live motion remains unverified. |
| [Amici / Beaucoup](https://beaucoup.studio/en/projects/amici/) | Creator case study; live site timeout | Optional inspiration for layering photographs and coordinated transitions | Prior research sampled its showreels; this task did not replay them. No new claim of watching the animation. |
| [Alchemist](https://alchemist.dk/) | Live animated opening frames and public navigation | A useful example of a highly theatrical brand experience | Its rotating graphic opening is a weak fit for Lumina's straightforward booking demonstration. |
| [SevenRooms table management](https://sevenrooms.com/platform/table-management/) | Official product page and [training](https://sevenrooms.com/newcustomer/training) | Clear relation between reservation list, floor and guest context; strong reference for the host screen | Product capabilities are descriptions, not benchmarked workflows. Preserve Lumina roles and existing selected-date semantics. |
| [Resy for Restaurants](https://resy.com/join/) | Official product page | Operational reservation presentation and guest-facing booking structure | The Tock reservations URL now redirects here. Historical search snippets do not prove the old Tock interface is still current. |
| [Toast KDS guide](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html) | Official illustrated operational guide | Readable ticket timers, age cues, item completion and feedback for new/changed tickets | Adapt one brief highlight rather than copying repeated flashing. Existing allergy labels and action protections remain essential. |
| [Bedimcode restaurant repository](https://github.com/bedimcode/responsive-website-restaurant) | Creator README | Useful plain HTML/CSS/JS learning reference for simple page composition | Static frontend source does not provide booking persistence, staff authorization or kitchen logic. Copying code would require a separate license check. |

## Three possible directions

| Direction | Benefit | Cost or tradeoff | Recommendation |
| --- | --- | --- | --- |
| Refine the existing warm restaurant identity | Stronger typography, stable booking composition, coherent reveals and a signature menu moment | Requires careful laptop sizing and font fallback checks | Best first investment. |
| Add a more theatrical guest experience | Elaborate scene changes, parallax and longer sequences can be striking | More visual complexity, less predictable scrolling and greater demonstration risk | Consider one optional scene later, after the first batch is verified. |
| Prioritize staff and kitchen clarity | Clearer changed records and operational hierarchy support the full system demonstration | Less obvious in the initial guest landing page; requires real isolated service fixtures | Best second investment. |

## Ranked improvements

This table records the research-stage proposals. Priorities 1–6 are now delivered locally; priorities 7–10 remain proposals. Priority reflects Marvin's desktop presentation and the inspected implementation.

| Priority | Improvement | Concrete proposed behavior | Scope / risk |
| --- | --- | --- | --- |
| 1 | Stable desktop booking composition | Anchor hero copy near its initial position while availability/results expand; preserve natural page scrolling | Guest CSS; low-to-medium layout risk |
| 2 | Typography and hierarchy | Local Cormorant Garamond medium/semibold for large guest headings; Inter for body/form text and operational data; Georgia/Arial fallback | Local assets and CSS; verify font metrics and projector readability |
| 3 | Desktop navigation continuity | A restrained sticky header with Reserve always reachable, active section indication and correct anchor offsets | Guest template/CSS/helper; test focus and occlusion |
| 4 | Coordinated heading entrances | Eyebrow, heading and supporting copy arrive in a short sequence; controls stay immediately visible and usable; only play once per section | Existing animation helper; avoid duplicating room image reveals |
| 5 | Clear booking progress | Completed steps gain static checkmarks; active step has a clear amber marker and `aria-current`; optional confirmation icon draws once after a real successful response | Guest rendering/CSS; requires real success and failure regression tests |
| 6 | Signature-dish spotlight | One available, existing signature-tagged dish appears in a larger photo/text feature before the menu list, with real price and tags | Guest menu rendering; omit feature if no eligible item exists |
| 7 | Shared voluntary motion control | A discreet Pause visuals / Resume visuals action controls hero, chef and gallery decoration without pausing bookings or live data | Cross-helper lifecycle work; separately review the earlier continuous-motion preference |
| 8 | Changed-record feedback | New/changed host records or tickets get one brief amber highlight; identical polls do nothing | Staff/service scripts; requires record identity/version baseline and real isolated fixtures |
| 9 | Operational visual hierarchy | Stronger ticket number/table/timer hierarchy, clear text badges, compact real totals and persistent sync/error context | Staff/service CSS; keep controls steady and allergy notes prominent |
| 10 | Optional limited photographic depth | A small clipped image translation in one guest storytelling section, disabled under Reduce Motion | Lower priority; no content or scene is currently approved |

[Cormorant](https://github.com/CatharsisFonts/Cormorant) is an open-source display family under the SIL Open Font License; [Inter](https://github.com/rsms/inter) is the supporting font candidate. Preserve each downloaded font's license/copyright and serve only needed files locally. Cormorant should be used at large sizes with adequate weight, not for small kitchen text. [Fraunces](https://github.com/googlefonts/fraunces) remains a valid warmer alternative; the current recommendation favors Cormorant for the refined desktop presentation, subject to actual font rendering checks.

## Motion rules for the proposed design

Use motion to establish continuity: heading sequence → section context → selection → saved result. A stagger means neighboring elements begin a few milliseconds apart. It should never be a loading gate.

[Atlassian's guidance](https://atlassian.design/foundations/motion/applying-motion) supports consistent semantic timings, immediate focus/error feedback and restrained property combinations. [Carbon's older v10 motion guide](https://v10.carbondesignsystem.com/guidelines/motion/overview/) distinguishes subtle task motion from expressive moments. It is a useful conceptual reference, not a recommendation to install Carbon or adopt an old component version.

Keep existing 80–220ms interaction timings. A new large heading entrance can use approximately 280–360ms with a 35–50ms stagger and only 6–10px movement; these values are proposed project judgments. Use one or two properties, usually transform and opacity. Avoid bouncing the form, animating countdown values, or delaying errors behind an animation.

For service updates, baseline by record ID and version. First load, date/station/filter changes, session changes and reconnects establish context rather than announcing every visible record as new. Identical polls do not replay entrances. Maintain keyboard focus, scroll position and operator targeting. Current `service.js` replaces card content after refresh; adding an entrance to every replacement would generate false updates. The timer continues from server time and never waits for a visual effect.

[W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) explains control of automatically moving content lasting more than five seconds alongside other content. The hero currently follows OS Reduce Motion and visibility but has no manual pause control. A shared voluntary control deserves an explicit decision: earlier tests deliberately expect continuous hero playback and no pause button. Default playback can remain continuous while a voluntary pause is available; those expectations must be updated deliberately if this proposal is selected. This is not a claim of a complete accessibility audit.

## Technology decision

| Tool | Research result | Decision for Lumina |
| --- | --- | --- |
| CSS + [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | Native browser controls; already used by the current helper | Recommended for the first batch; no new animation library required. |
| [Motion](https://motion.dev/docs/animate), [source repository](https://github.com/motiondivision/motion) | Supports vanilla JavaScript as well as frameworks; repository identifies an MIT license | A capable alternative if a later approved effect needs it. React is unnecessary. |
| [GSAP + ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [source](https://github.com/greensock/GSAP) | Useful for coordinated timelines and scroll sequences | Optional later. [Current official license](https://gsap.com/community/standard-license/) and [3.13 announcement](https://gsap.com/blog/3-13/) replace assumptions from old paid-plugin discussions. No installation or license approval is claimed here. |
| [Anime.js](https://animejs.com/documentation/) | Timelines, SVG/text tools and native-animation support are documented | Capable, but does not solve a first-batch gap better than the existing helper. |
| [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Supports visual continuity between views | Feature-detected optional enhancement only. Avoid whole-page snapshots around private booking or rapidly changing service data. |

[Google's animation performance guide](https://web.dev/articles/animations-guide) favors careful rendering choices, especially transform/opacity. Keep assets self-hosted, retain poster/image failure fallbacks and verify offline delivery. Do not combine multiple animation engines for the same small set of effects.

## Approved first implementation batch

Implement priorities 1–6 as one coherent desktop guest UI improvement, delivered in small verified steps. Expected files are the guest template, `app.css`, `ui-feedback.css`, menu styles, `guest-motion.js`, `guest.js`, local font/license assets and focused existing browser suites. Keep current food and table motion; change their styling only where necessary for consistency. Staff/kitchen changes and the shared motion control are subsequent bounded batches with their own reviewed designs.

Visible demonstration: open the home page → see the refined heading/navigation → search without the left composition jumping → use clear booking progress → browse one genuine signature dish and the existing menu → inspect a room/table with current availability.

Verification requirements:

- Actual 1280×720, 1366×768 and 1440×900 screenshots, including expanded results and dialogs. Reserve, Find a table, focus targets and Close must remain reachable and unobscured.
- Show basic booking controls immediately, even during the heading entrance or after animation/font failure.
- Verify real isolated search, hold, confirmation, approval-required, expiry, error and management flows. Failed/pending responses must not produce success markers.
- Rapid category/section/slot changes keep the latest selection and correct data; missing images/fonts and no signature item have useful fallbacks.
- Keyboard navigation, Reduce Motion, normal scrolling, local offline assets and correct dialog focus restoration remain functional. W3C [dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) inform these checks; a generous 44px control target is a design choice, not the minimum criterion's quoted requirement.
- Existing relevant booking, menu, motion, showcase and readiness checks run after the final change. Rebuild only the local application when needed; preserve main database/configuration and do not rerun its demo seed.

## What to omit and why

Do not add loading intros, forced smooth scrolling, cursor replacements, magnetic form buttons, particle/fire backgrounds, automatic menu sliders, new giant video files, decorative analytics or constant ticket pulsing. Their novelty competes with the reservation demonstration or adds maintenance without resolving the observed gaps. Browser source references do not authorize copying third-party photography, video or proprietary product interfaces.

Main lesson: a polished interface combines typography, spacing, hierarchy and truthful state feedback. Motion should make those relationships easier to follow. Lumina already has atmosphere; the next improvement should make the audience understand and trust the working system.

## First desktop guest batch delivered — 2026-10-14

Marvin approved priorities 1–6. The canonical Desktop application now delivers:

- Stable two-column desktop booking composition. Real availability searches produced **0px** headline shift at 1280×720, 1366×768 and 1440×900. The Find a table button ends at y=564 on those tested screens and remains immediately usable.
- Guest-only Cormorant Garamond/Inter typography with locally hosted WOFF2 files, licenses, source URLs and hashes. The three font files total 109,820 bytes. Staff/kitchen pages retain their existing typography and source behavior.
- Sticky desktop navigation, truthful active section indication, anchor offsets and booking-heading focus that accounts for the sticky header. Native scrolling remains; settled section captures confirm header y=0.
- One-time eyebrow/heading/supporting-copy choreography through the existing native animation helper. Reduced-motion and missing-animation cases remain static and usable. Existing room, table-photo, food and video effects remain functional.
- Completed form-step markers and one accessible current step. Markers follow actual hold/save states; pending requests remain awaiting manager approval. The saved confirmation mark is static and only green for a confirmed booking.
- A spotlight selected from an available signature-tagged catalog item, retaining the real name, description, price and dietary tags. Missing eligibility hides the feature. Known local photo keys and text insertion preserve the safe rendering boundary.

The default signature dish is currently Kinilaw of the Day. Its old 330px thumbnail became visibly soft when rendered at about 539px. A test reproduced that upscale; the feature now uses the same [Herbertkikoy photograph](https://commons.wikimedia.org/wiki/File:Pinoy_Kinilaw.jpg) in a 960px version (114,910 bytes), with its [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) attribution, license link, crop description and hash retained in menu credits. The ordinary menu thumbnail remains unchanged. Another eligible dish uses its existing approved photo mapping.

Actual localhost delivery views:

- [Laptop home at 1366×768](ui-refresh-previews/delivered-home-1366.png).
- [Rooms and persistent navigation](ui-refresh-previews/delivered-rooms.png).
- [Signature dish and menu](ui-refresh-previews/delivered-signature.png).

Verification evidence:

- **20 focused desktop checks passed.** The first test run failed on 14 expected missing-feature/layout cases; implementation made them pass. The later photograph-resolution check failed with 330px being enlarged to 539px, then passed with the sharper photo. Actual real isolated hold, saved confirmation, refresh recovery and approval-pending workflows were exercised.
- Database suites: booking 41, management 14, staff 43 and orders 28 checks passed (**126**). HTTP suites: booking 11, management 7, staff 14 and orders 12 passed (**44**).
- Existing browser suites passed: booking 12, staff 10, orders 10, readiness 36, menu 21, capacity 34, feedback 26, guest motion 31, room motion 11, table showcase 41, Close behavior 6, food showcase 20, hero video 12, chef video 8, floor layout 6, multi-date reservations 6 and workspace loading 6 (**296**), plus the separate returning-browser asset-cache regression. The new desktop suite adds 20, for **486 counted application checks plus the cache regression**.
- PHP lint passed on 65 files. Changed JavaScript/test syntax, whitespace checks and both isolated/main smoke checks passed. All 15 served guest styles/scripts exactly match canonical source; font/license and feature-photo hashes match their credit records.
- Read-only actual main inspection covered the three laptop sizes, loaded fonts, expanded search, room/table preview, signature dish and reduced-motion poster. No browser/CSP errors, external asset requests or attempted mutations occurred in that inspection.
- Before/after fingerprints matched all **37 main database tables** and existing configuration. Only the main application image/container was refreshed. No main demo seed/reset, hosted write, GitHub publication or deployment occurred.

Verification repairs and review:

- The font-failure test initially sampled the allowed heading fade. It now isolates font fallback under Reduce Motion so it tests font failure independently.
- The hero verifier used playback time alone as proof that the visual fade had finished. Its readiness wait now checks both playback progress and fully visible video; the original strict silent/loop/inline/decorative assertions remain intact.
- The pre-existing loading verifier assumed a future saved booking would appear on the first All-dates page. The preceding multi-date fixture reproduced failure; a small dataset passed. It now filters by a unique test guest before freezing the old read and matches the saved row containing both name and phone. With the same preceding pagination fixture, all six loading checks passed. Staff product code did not change.
- Independent read-only review found no critical issue and raised a hidden-feature concern. Inspection showed shared `app.css` already enforces `[hidden] { display: none !important; }`; a strengthened actual-visibility assertion passed. No extra product rule was needed. Review exclusions—staff/kitchen redesign, shared motion control and data/publication changes—remain outside this approved batch.

New lessons: scope a display stylesheet to the guest pages when operational views share base styles; account for sticky navigation when moving keyboard focus; choose image resolution for its rendered size; and keep form progress distinct from the server's booking status.
