# 08 — UI effects for the current restaurant application

Research date: 2026-10-06. Owner: Marvin. Scope: recommendations for the guest, booking, showcase, management, authentication, host, admin, server and kitchen interfaces.

**Delivery status: E0 research, E1 shared response states and E2 guest transitions are complete locally; E3–E4 are deferred at Marvin’s request (2026-10-06), and remain unfinished.** Sections 12–13 record implementation and evidence. The remaining screen-specific effects below are recommendations. “Best fit” means a design recommendation based on this application's workflows and the reviewed guidance; it is not a measured usability result or a universal ranking.

## 1. Recommendation

Use a small, consistent motion system: warm, restrained presentation for guests; quick state feedback for booking; minimal movement for staff operations. Preserve the current charcoal surfaces, amber accents, serif headings and original seating renders.

The main investment should be in loading, selection and action feedback. Decorative motion belongs in a few guest presentation moments. Keep buttons usable immediately, show results as soon as they arrive, and communicate the actual server state.

A **microinteraction** is a small response to an action: a selected time gets a border, a submit button says “Checking tables…”, or a successful copy says “Private link copied”. **Easing** describes how an animation speeds up and settles. A **motion token** is a shared named setting, such as `--motion-feedback: 140ms`, so related controls respond consistently.

This direction is our application-specific synthesis. NN/G recommends brief, restrained animation for meaningful feedback [S1]; Carbon's archived v10 guidance distinguishes everyday task motion from occasional expressive moments [S4]. Atlassian's current guidance similarly ties motion to clarity, frequency and response speed [S2–S3].

## 2. Repository and evidence boundary

The supplied [GitHub repository](https://github.com/marvmarv08/restaurant-reservation-system) was checked through authenticated, read-only GitHub API calls using the workspace owner's account. Its default branch was `main`; the remote tip was [b053f2f](https://github.com/marvmarv08/restaurant-reservation-system/commit/b053f2f18714d4927f8326adae6de697662c915e), “Finalize phase 0 booking policy and schema design”. The GitHub web page itself could not be retrieved through the web reader.

The current local application is ahead of that remote snapshot. Its reviewed application baseline was `ae447c5`, “Relocate the demo venue address to Lipa City, Batangas”. Recommendations therefore map to the local implementation Marvin is using, not to an assertion that these files are already published on GitHub. No push was performed.

### Inspected implementation

| Surface | Source anchors | What matters for effects |
|---|---|---|
| Guest homepage, search, details, confirmation, management | [guest view](../src/View/guest.php), [guest script](../public/assets/js/guest.js), [app styles](../public/assets/css/app.css) | `renderSearch`, `renderResults`, `renderPicker`, `renderDetails`, `renderConfirmation`, `renderManagement`, `renderCatalog`; whole regions are replaced during transitions. |
| Table preview and gallery | [showcase script](../public/assets/js/table-showcase.js), [showcase styles](../public/assets/css/table-showcase.css) | Native dialog, image revision guards, thumbnails, neutral/green/red status, explicit selection and freshness checks. |
| Authentication, host, waitlist, settings, accounts, audit, notifications | [staff view](../src/View/staff.php), [staff script](../public/assets/js/staff.js), [staff styles](../public/assets/css/staff.css) | Dialogs, disabled pending controls, role-based tabs, reservation rows and SVG floor. Service/waitlist refresh every eight seconds under interaction guards. |
| Server orders and kitchen tickets | [service view](../src/View/service.php), [service script](../public/assets/js/service.js), [service styles](../public/assets/css/service.css) | `execute`, `refresh`, `renderOrders`, `renderKitchen`, ticket ages; server polls every six seconds and kitchen every two seconds under interaction guards. Lists use `replaceChildren`. |
| Historical design catalogue | [earlier effects study](04_ui_effects.md) | Competition-oriented ideas and browser-version notes are historical. This report takes precedence for the live app's motion choices. |

### Read-only browser observations

Guest homepage, room dialog and staff sign-in were inspected at 1440px and 390px. Both widths displayed four room cards; homepage and sign-in had no horizontal page overflow. Opening the showcase focused its heading; Escape returned focus to the room card. Computed styles confirmed the existing 160ms dialog entrance and 140ms room-card transition. Reduced-motion emulation produced no showcase entrance animation and a zero-duration image transition.

The audit issued zero POST requests in the normal-motion browser contexts. Screenshots were inspected; showcase screenshots waited for image readiness and animation completion. Ephemeral evidence is in `/tmp/ui-effects-research/`; it is not a portable test artifact or a new automated regression suite.

Protected host/admin/server/kitchen behavior was reviewed from source, not through a newly authenticated browser session. No staff password was requested or changed. This research does not claim a new full accessibility audit, performance benchmark or user study.

## 3. What exists and what needs attention

| Current behavior | Decision |
|---|---|
| Buttons and time slots transition background/border in 150ms, guarded by reduced-motion preference. | Keep; standardize naming and extend to related controls. |
| Room cards lift 2px in 140ms; photos zoom to 1.025 in 180ms for hover-capable pointers. | Keep these restrained values. Add no tilt or cursor-following movement. |
| Showcase enters with opacity and 6px vertical travel in 160ms. | Keep; use as the reference for related dialogs. |
| New showcase images fade in over 180ms; status surfaces transition over 160ms. | Keep; investigate a true image crossfade only if later testing shows a visible gap. The current image replacement is a fade-in, not an overlapping crossfade. |
| The thumbnail strip uses native horizontal scrolling with proximity snapping. | Keep native interaction and Previous/Next buttons [S17]. |
| Native focus rings, dialog controls, text status and capacity announcements already exist. | Preserve them; motion must add to these cues. |
| General async helpers disable controls but often keep the original action label. | Highest-value improvement: explicit pending text, stable button width and truthful completion/error feedback. |
| Most booking steps, menu category results and staff content change immediately. | Add short, scoped entrances on deliberate user navigation. |
| Polling replaces server/kitchen lists and staff rows. | Do not attach an entrance animation to every rendered card. Identify genuine data changes first. |
| Disabled buttons globally use `cursor: wait`. | Distinguish pending from permanently unavailable. Use busy styling only during a request; give unavailable actions an explanation. |

## 4. Effects mapped to every major UI workflow

Except for the delivered E1/E2 settings recorded in sections 12–13, timings and distances in this section are **proposed project defaults**. They are not prescribed WCAG values and have not been validated with restaurant guests or staff. “Instant” means the information/control changes without a decorative delay. Every motion effect has an instant alternative when reduced motion is requested.

### Guest presentation and browsing

| UI / trigger | Best-fit effect | Proposed setting | State and interaction rules |
|---|---|---|---|
| Homepage hero, first successful page render | One soft fade with slight upward settle on the decorative copy/art only | 220ms, 6px, once per page load | Booking form is visible and usable immediately; no replay on booking updates. Optional, lower priority. |
| Primary navigation and ordinary links | Color transition; short underline emphasis on hover | 120–140ms | Keyboard focus gets an immediate visible outline. Native anchor navigation remains available. |
| Primary buttons | Background/border response, with an optional 1px pressed translation | Hover 140ms; press 80ms | No movement away from the pointer. Do not animate layout dimensions. Disabled controls have no press effect. |
| Room cards and photo covers | Existing 2px lift and 1.025 photo zoom | 140ms card; 180ms image | Pointer hover only; focus and touch use border/selection cues. Retain visible inspiration captions and picture fallback. |
| All-table inventory disclosure | Immediate native expand/collapse; optional fade of newly revealed grid | 140ms fade | Avoid animating an unknown `height`; summary remains an ordinary keyboard control. |
| Menu category click | Update active pill immediately; fade in the new menu region | 140ms, one region | Keep focus on the category button. No stagger of every dish, fake loading or moving prices. Announce the resulting category/count once. |
| Scrolling between sections | Existing native smooth anchor scroll | Browser-controlled | Instant for reduced motion. Keep normal wheel/touch behavior; no scroll hijacking. |

### Search, selection and reservation

| UI / trigger | Best-fit effect | Proposed setting | State and interaction rules |
|---|---|---|---|
| Date, Guests and Room preference changes | Immediate native selection and helper update | Instant | Preserve compatible values; clear stale results at once. A text notice explains adjusted guest counts. Do not animate native option removal. |
| Find a table request | Button text becomes “Checking tables…”; contextual busy status | Immediate state; optional stationary placeholder after 200ms | Preserve form layout. No invented progress percentage or forced minimum wait. Keep results non-selectable until the actual response. |
| Initial catalog/loading of a known card/list layout | Static placeholders shaped like expected content | Delayed appearance after 200ms if needed | Mark content busy; hide placeholder shapes from assistive technology. Remove immediately on actual completion. Skeletons are a layout aid, not a speed improvement [S15]. |
| Available time results arrive | Fade the result region once | 160ms | Publish text/state immediately; selection need not wait for animation. Keep “No tables fit” distinct from a network failure. |
| Time or radio table selection | Persistent amber border/check plus brief surface transition | 120–140ms | Selection is distinguishable from availability. Green means eligible, amber means chosen. Native radio state remains authoritative for the UI. |
| SVG floor selection | Border/stroke and label emphasis | 120ms color at most | Keep geometry fixed. Do not scale furniture or animate red tables; all preview controls stay discoverable. |
| Checking, stale or failed availability | Neutral badge with clear explanation and Refresh action | Immediate label; 140ms surface transition optional | Remove misleading green immediately. The label/icon must communicate state independently of color [S10]. |
| Continue / creating a hold | “Holding table…” busy label | Immediate | Table is held only after server success. Browsing and preview motion must never create a hold. |
| Search → details or details → confirmation | Scoped entrance for the newly committed step | 180ms fade and up to 4px travel | Preserve heading focus behavior; no full-screen curtain, old interactive snapshot or delayed form access. Back transitions preserve entered state. |
| Hold countdown and expiry | Stable digits, persistent expiry message and action | Instant updates; tabular numerals | Use existing server expiry. No pulsing timer; announce meaningful thresholds/expiry rather than each second. |
| Invalid field or failed request | Persistent inline text and field border; focus the appropriate error target | Instant | Use specific text where available [S13]. No shaking form or brief error toast that disappears while being read. |
| Confirm request | “Confirming reservation…” label while request is pending | Immediate | A spinner is optional and small. On an ambiguous connection failure, preserve the existing recovery checks before claiming success or retrying a mutation. |
| Confirmed reservation | One brief check icon fade/draw, plus persistent reference and details | 220ms once | Text appears immediately. For 13–16 guests show “Request submitted — manager approval pending”, not “Confirmed”. No confetti. |
| Copy private link | Inline “Private link copied” status | Instant; optional 120ms fade | Report success only after clipboard success. Failure keeps the existing manual-copy path. Never display the private secret in a decorative toast or log. |

### Table showcase and private booking management

| UI / trigger | Best-fit effect | Proposed setting | State and interaction rules |
|---|---|---|---|
| Open any table showcase | Existing short dialog entrance over a dark backdrop | Keep 160ms / 6px | Focus heading immediately, keep controls inside dialog, retain Close/Escape and opener restoration [S9]. |
| Previous/Next, thumbnail or Seating/Room inspiration switch | Existing image fade-in; optional layered crossfade later | Keep 180ms; optional crossfade 180ms | Current title, facts and availability update immediately. During loading, clearly distinguish any old image from the newly selected table. Reject late image responses; keep fallback. |
| Swipe thumbnail strip | Native scrolling and proximity snap | No bespoke drag animation | Keep visible buttons, scrollbar and selected outline. No autoplay, infinite loop, forced wrapping or gesture-only control [S17]. |
| Availability refresh completes | Change text/icon at once; optionally soften surface color | 140–160ms | Keep the response context/version guard. Never celebrate a table remaining available on every poll. |
| Use this table | Clear chosen-table outline and inline acknowledgment | 140ms surface change | Existing recheck and explicit selection stay intact; this is not booking confirmation. |
| Open My booking or start editing | Scoped content fade | 160ms | Never fade out the only copy of current booking details before the replacement is ready. |
| Save booking changes | “Saving changes…” then persistent updated summary | Immediate busy state; 160ms summary entrance | The original remains booked until the atomic server save succeeds. A failed save keeps the original summary and edited input. |
| Cancel booking | Quiet native dialog, optional short entrance | 160ms entrance; instant close initially | Initial focus favors keeping the reservation. Display cancellation success only after the server response; no pretend Undo if the backend cannot restore it. |

### Authentication, host and admin

| UI / trigger | Best-fit effect | Proposed setting | State and interaction rules |
|---|---|---|---|
| Staff sign-in / activation initial display | Immediate form; optional card fade | 140ms, no travel | Autofill, password managers and keyboard submission keep native behavior. No bouncing welcome text. |
| Sign-in / activation submission | Pending label and stable-width button | Immediate | Generic login failure remains generic; animation does not disclose whether an email exists. Never show success before authenticated response. |
| Host sidebar tab navigation | Active indicator updates instantly; scoped new-panel fade | 120–140ms | Keep focus on the chosen tab; no animation of the whole sidebar or page on data refresh. |
| Reservation filters, search and pagination | Contextual pending state then one region fade for explicit navigation | 120ms | Keep existing rows while fetching when safe; mark them as the previous result and avoid acting on an unconfirmed filter context. |
| Host floor table click / reservation detail | Existing dialog semantics plus short entrance | 140–160ms | Focus and action availability are immediate; floor positions remain fixed. |
| Seat, approve, no-show, complete or cancel action | Busy label, then persistent updated status | Immediate; 120ms surface transition | Reflect only completed server actions. Explain an unavailable action in text. No animated dragging that suggests inventory has changed locally. |
| Waitlist offer creation | Inline acknowledgment in the affected row/detail | 120–140ms optional | “Offer held” appears only after a real hold is created. Expiry shows stable deadline text. |
| Booking settings / blackout save | Inline saved/error status near the action | Instant | Preserve dirty input on failure. No fake Undo, successful save animation or disappearing warning before server validation. |
| Staff role/invitation/account action | Same restrained pending/result feedback | Instant | Retain role checks and session revocation. Private activation links remain outside general toasts/logs. |
| Audit history and demo notification outbox | Static readable list; explicit filter-change fade only | 120ms optional | No animated counters or auto-scrolling; label notifications as simulated. |
| Eight-second host refresh | Keep reading position; surface only relevant changed state | No general entrance | Do not replay panel, floor or row entrances each refresh. Consider ID-based updates before adding data-change effects. |

### Server orders and kitchen

| UI / trigger | Best-fit effect | Proposed setting | State and interaction rules |
|---|---|---|---|
| Server order detail / add-item controls | Immediate dialog/form with a short entrance | 140–160ms | Quantity changes are instant. Food amounts, allergens and prices do not bounce or count up. |
| Add item, save allergy note, assign order, send to kitchen | Specific pending label and persistent result | Immediate; optional 120ms acknowledgment | Preserve retry IDs/version checks. Keep allergy notes prominent as text. No “sent” animation until the transaction succeeds. |
| Genuinely new kitchen ticket | One entrance or brief changed-state emphasis | 120ms, up to 4px travel | Trigger once per new ticket ID after the initial baseline. Keep tickets already being read stationary. |
| Prepare, item-ready, ready, hold/resume, deliver or recall | Updated badge and stable textual acknowledgment | 120ms surface change | Must match the saved state. Never label a service closure as paid; payment collection is outside this app. |
| Ticket age / late / critical | Static age label and contrasting border/icon | Instant threshold change | No blinking, red pulse, timer wobble or repeating glow. Color is supplemented by text [S10–S11]. |
| Two-second kitchen / six-second server refresh | Update unchanged cards without entrance replay | No general animation | Diff by stable ID and meaningful fields before adding change cues. Current full list replacements would otherwise replay CSS animation continuously. |
| Connection failure / stale operational data | Persistent sync notice with last successful update and Refresh | Instant | Preserve last data; clearly label stale status. Do not cover all tickets with a full-screen loader. |

## 5. Shared motion settings

E1 defines the shared settings below in ui-feedback.css. Buttons use the press/feedback settings; content, dialog and brand tokens are reserved for later scope and do not imply those new animations were delivered. Atlassian documents short interactions and longer transitions, and gives explicit example tokens [S2–S3]; our exact values below are project choices.

| Proposed token | Value | Use |
|---|---|---|
| `--motion-press` | `80ms` | Deliberate press response |
| `--motion-feedback` | `140ms` | Hover, active pill, small surface state |
| `--motion-dialog` | `160ms` | Dialog entrance |
| `--motion-content` | `180ms` | Booking step / image fade |
| `--motion-brand` | `220ms` | Optional initial hero / success icon |
| `--motion-ease-enter` | `cubic-bezier(0, 0, 0.38, 0.9)` | Fast arrival, smooth settling; Carbon's productive entrance curve [S4] |
| `--motion-ease-state` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | State transitions; Carbon's productive standard curve [S4] |
| `--motion-distance` | `4px` | Content entrance; showcase retains its existing 6px |

Start with instant dialog close. If an exit is added later, it must not trap focus, delay Escape or wait for `animationend` to perform essential cleanup. A failed or interrupted animation must still leave the final state usable.

### Loading policy

1. Immediately show pending text and prevent duplicate submission using the existing action guard.
2. If a known content region remains pending after 200ms, optionally add a static skeleton matching that region. This threshold is a project hypothesis to test, not a research-established universal rule.
3. Finish as soon as the real response is ready. Cancel delayed placeholders so fast responses do not flash them.
4. On failure show the error and recovery action. No perpetual skeleton, fabricated percentage or branded wait screen.
5. For refreshes, keep readable prior data with a stale/pending label. Do not replace the whole operating workspace with a skeleton.

## 6. Implementation technology comparison

| Option | Fit here | Recommendation and constraint |
|---|---|---|
| CSS transitions/keyframes | Best default for these short state and entrance effects | Local CSS; exact properties; enable motion through `prefers-reduced-motion: no-preference`. No new dependency. |
| Web Animations API | Useful for a cancellable entrance after a deliberate DOM replacement | Native JS timing/playback controls [S18]. Feature-detect and apply final state even if unavailable. Use only where lifecycle control adds value. |
| View Transition API | Possible optional experiment for a specific booking region | MDN documents same-document and cross-document transitions [S16]. Test those features separately; check runtime availability. Avoid a blanket root snapshot around forms, private details and live polling. CSS/instant fallback remains mandatory. |
| Native scroll snap | Already a good match for showcase thumbnails | Keep `x proximity`; preserve ordinary scrolling and explicit navigation [S17]. |
| GSAP | Capable, but excessive for the selected short effects | Official `matchMedia` supports preference-aware setup/reversion [S19]. Reconsider only if a later scope genuinely requires complex coordinated sequences. No installation recommended now. |
| Heavy scroll systems, particle backgrounds, WebGL previews | Poor fit for the current transaction and service screens | More lifecycle and performance work without a demonstrated user need. Original seating pictures already provide the requested realism. |

Use `transform` and `opacity` for movement/fades. Browser guidance warns against unnecessary layout/paint work and premature `will-change` optimization [S14]. Small border/background color transitions can be reasonable here, but must be profiled; they are not guaranteed to run on the compositor. Avoid `transition: all`, animated layout heights, large live blur layers and permanent `will-change` on all cards.

The previous study's fixed browser-version table is historical. This report deliberately relies on feature detection and testing on Marvin's actual browsers rather than repeating potentially stale support numbers. The Material 3 page returned only a JavaScript requirement, so it was not used as evidence for detailed timing claims.

## 7. Accessibility and interaction requirements

- Motion should be opt-in through the browser/OS preference. With reduced motion, omit translation, scaling, drawing sequences, smooth scrolling and decorative fades; keep the same information and working controls. MDN explains the preference [S6]. WCAG's interaction-animation criterion is **AAA**, not AA [S5]; respecting it is our design choice, not proof of full conformance.
- State messages should be available to assistive technology without moving focus unnecessarily [S8]. Use one existing polite status region for ordinary action results; reserve assertive errors for events that require immediate attention. Do not announce every timer tick or polling timestamp.
- Modal behavior includes contained keyboard focus, Escape and returning focus to the opener or a logical next target [S9]. Animation must not postpone those behaviors.
- Green/red/amber cues need labels, icons, shapes or selected control state [S10]. Relevant component/state boundaries need appropriate non-text contrast [S11]. Preserve readable text contrast throughout a fade by keeping persistent messages outside any decorative fading container where necessary.
- WCAG 2.5.8 is an **AA** criterion with a 24 CSS-pixel minimum and specified exceptions [S12]. Aim for 44px controls for this project's mobile/touch interactions; 44px is our more generous design target, not the universal wording of that criterion.
- Persistent errors identify what went wrong [S13]. Keep them readable and linked to their inputs when adding field feedback; no shake-only cue.
- WCAG Pause/Stop/Hide distinguishes automatic moving content from auto-updating information [S7]. The latter has no five-second exemption. Evaluate a visible “Pause live updates” / manual Refresh option for reading-heavy staff views; pausing must visibly mark old data and revalidate actions. Do not freeze holds, ticket ages or the server's authoritative policy. Do not declare all auto-updates exempt merely because this is a restaurant application.
- Hover must never be the only way to see an action. Keyboard and touch get clear, stationary cues. Keep content readable if motion APIs fail or are disabled.

These are implementation requirements to verify later. This research makes no new accessibility-conformance claim about protected screens.

## 8. Effects to exclude from this design

| Candidate | Why it is a poor fit here |
|---|---|
| Branded 700–1200ms preloader | Adds delay to the reservation entry point; the form should appear as soon as ready. |
| Cursor replacement or magnetic buttons | Moves the interaction target and contributes little to finding/securing a table. |
| Hero parallax, pinned horizontal menu and scroll hijacking | Adds motion to reading and conflicts with straightforward mobile navigation. |
| Bouncing step panels, large 3D card tilt and springy controls | Repeated movement competes with dense labels and precise form use. |
| Red/green pulsing availability, flashing late tickets | Constant attention demand; state text and a stable visual cue are sufficient. |
| Autoplay table slideshow | Can change the table being inspected; keep explicit navigation. |
| Animated slot/ticket counters and repeated card stagger | Makes live inventory harder to scan; polling can replay it continuously. |
| Confetti for confirmation or service closure | The user needs the saved status, reference and next step; pending approval must stay visibly distinct. |
| Success toast before server completion / universal Undo | Gives false assurance; only saved actions and supported recovery paths may be offered. |

These exclusions are design judgments for this repository, informed by the restrained-motion guidance in S1–S4. They are not claims that the effects are universally invalid.

## 9. Implementation phases

E0 research, E1 shared response states and E2 guest transitions are complete locally. E3–E4 are **deferred at Marvin’s request (2026-10-06)** and remain unfinished. E2 adds scoped guest motion; operational data-change animations are still future work. Keep existing booking rules, authorization, inventory transactions, private-link handling and order state machines intact.

| Phase | Priority / scope | Completion evidence |
|---|---|---|
| E0 — Research | Done: screen inventory, source review, effect decisions and implementation map | This report, source anchors, read-only browser observations and documentation verification. |
| E1 — Shared response states | Done locally: shared tokens/styles, pending labels, stationary loading regions and persistent success/error feedback | 26 focused checks plus 143 existing browser checks passed; main source/smoke/lint and unchanged record counts verified. See section 12. |
| E2 — Guest flow polish | Done locally: scoped booking/menu entrances, one hero entrance, logical focus, same-page contact draft and explicit table-choice acknowledgment | 31 focused guest-motion checks plus 149 relevant regressions passed; main source/smoke/lint, read-only mobile check and retained records verified. See section 13. |
| E3 — Operational feedback | Deferred: Host/admin dialog/action consistency; server/kitchen changes tracked by ID; no polling animation replay | Isolated staff/order browser regressions, two-second poll observation, stable focus/scroll, real saved status and stale-data behavior. |
| E4 — Accessibility and performance | Deferred: Desktop/mobile review, motion-disabled operation, contrast/status review and target-browser profiling | 320/390/768/1440px; keyboard; actual touch browser where available; reduced motion; offline flow; targeted DevTools recording. Record browser limitations and measured results. |

**Resume when requested: E3, then E4.** Marvin deferred both phases on 2026-10-06. Guest transitions are delivered; future E3 work adds operational feedback tied to genuine saved data changes. E3 requires deliberate data-change handling; a global `.ticket { animation: ... }` patch is insufficient.

### Verification scenarios for implementation

1. A fast response finishes without flashing a delayed skeleton or waiting for a minimum animation duration.
2. A slow response gives immediate truthful pending feedback and a stable layout; duplicate clicks create no duplicate mutation.
3. A failed or interrupted confirmation keeps the existing recovery behavior; no false success checkmark appears.
4. Guest/room changes clear stale eligibility immediately; old green badges cannot linger while checking.
5. Search/details/confirmation work through Back, refresh, joined tables and manager approval with motion disabled.
6. Twenty rapid thumbnail changes under slow image loading cannot display the wrong table picture or stale caption.
7. A dialog can be closed during its entrance. Focus is restored and reopening starts at the correct top position.
8. Menu category changes do not move keyboard focus or animate every dish separately.
9. Repeated kitchen/server/host polls with unchanged data cause no entrance replay, blink, scrolling or repeated announcement.
10. A genuinely new ticket gets at most one cue. Existing ticket focus and reading position survive refresh.
11. Late/critical tickets stay readable; stale/offline status remains visible with a working manual refresh path.
12. Touch does not require hover; selected/disabled/busy states remain distinguishable at 320px.
13. Motion preference changes during a session cancel/skip optional JS animation without losing action state.
14. Performance recordings show whether proposed effects cause layout, broad paint or dropped frames. Do not assume a 60fps result from property choice alone.

Use the existing [verification guide](../docs/verification.md) and [verifier map](../docs/00-project-memory/verifier-map.md). Run mutation tests only in the guarded disposable environment, not against main booking data.

## 10. Sources and what they support

All references below were retrieved on 2026-10-06. Sources support principles or API behavior; exact project timing, effect placement and prioritization are our proposed choices. No customer conversion or task-speed improvement was measured.

| ID | Primary source | Used for |
|---|---|---|
| S1 | [NN/G — The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) | Brief, unobtrusive motion to communicate feedback and changes. |
| S2 | [Atlassian — Motion](https://atlassian.design/foundations/motion) | Frequency, clarity, duration categories and reduced-motion behavior. Its motion-token rollout is described as Early Access; no package adoption is proposed here. |
| S3 | [Atlassian — Applying motion](https://atlassian.design/foundations/motion/applying-motion) | Choosing timings by context and moving focus/announcements without animation delay. |
| S4 | [Carbon v10 — Motion](https://v10.carbondesignsystem.com/guidelines/motion/overview/) | Productive/expressive distinction and productive easing curves. This is the archived v10 guidance, not a current-package compatibility claim. |
| S5 | [W3C — Animation from Interactions, SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | AAA interaction-motion criterion and disabling non-essential movement. |
| S6 | [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | CSS detection of the user's motion preference. |
| S7 | [W3C — Pause, Stop, Hide, SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | Separate moving-content and auto-updating requirements. |
| S8 | [W3C — Status Messages, SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Programmatically available status without unnecessary focus changes. |
| S9 | [W3C APG — Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Dialog keyboard, focus placement, Escape and focus restoration. |
| S10 | [W3C — Use of Color, SC 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | State information independent of color. |
| S11 | [W3C — Non-text Contrast, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Visual component and state contrast. |
| S12 | [W3C — Target Size (Minimum), SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | AA minimum target size and exceptions. |
| S13 | [W3C — Error Identification, SC 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) | Identifying invalid inputs with text. |
| S14 | [web.dev — High-performance CSS animations](https://web.dev/articles/animations-guide) | Transform/opacity, layout/paint costs and profiling. |
| S15 | [NN/G — Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/) | Loading placeholders that represent content layout; not a substitute for faster loading. |
| S16 | [MDN — View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Scoped evaluation of view changes and distinct transition features. |
| S17 | [MDN — scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) | Native snap behavior for the existing thumbnail strip. |
| S18 | [MDN — Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | Native animation timing and playback control. |
| S19 | [GSAP — gsap.matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | Preference-aware setup and cleanup if a future complex-motion scope needs this library. |

## 11. Research conclusion and limitations

The strongest fit is a consistent set of short transitions and truthful response states. The showcase already demonstrates that approach; extend it carefully across the booking and staff workflows. Use optional guest presentation motion sparingly, and tie operational cues to genuine changes in saved data.

This is desk research plus source review and a limited read-only browser inspection. It does not establish which effect restaurant users prefer. Before calling an effect successful, have Marvin try the complete booking and staff tasks, check whether anything feels slow or distracting, and verify the relevant scenarios on the changed application.

## 12. E1 local delivery — 2026-10-06

- Added [shared response script](../public/assets/js/ui-feedback.js) and [shared response styles](../public/assets/css/ui-feedback.css), loaded before callers in guest, staff and service views. No new runtime library is needed.
- The existing duplicate-action guards now show specific pending labels with `aria-busy`, preserve button geometry and restore original labels/attributes. An expired guest hold remains disabled after request cleanup. Unavailable and pending controls have distinct cursor behavior.
- Guest and host table searches reserve a loading region. Static, hidden-from-assistive-technology placeholders appear only when a search is still pending after 200 ms; completion cancels the timer immediately. Initial workspace loading uses truthful text without a polling skeleton.
- Success feedback uses polite status semantics and does not focus the message. Errors remain readable, with existing explicit error-focus behavior retained; background host refresh errors do not move focus. Service saves show actual saved outcomes. A save followed by a failed read refresh reports that the change was saved inside the currently open dialog, without offering a duplicate-mutation retry.
- Shared button feedback uses 140 ms surface/color transitions and 80 ms press movement, enabled only without a reduced-motion preference. Focus cues remain immediate. No step/hero entrance, ticket entrance, flashing badge, spinner loop or polling replay was added.
- Verification: 26 focused feedback checks and 143 existing browser checks passed (12 guest/management, 10 staff, 10 orders, 41 showcase, 34 capacity, 36 readiness). Focused checks cover real delayed GET/POST responses, duplicate guards, fast completion with a paused placeholder clock, timer cleanup, failure/recovery, touch, reduced motion,320/390/768/1440px and zero automated A/AA violations in tested states. The cancellation regression now checks polite success status while retaining the actual cancelled-record check; errors keep alert semantics.
- Main delivery: rebuilt and recreated only app with `--no-deps`; no seed/reset. Health, 54-file PHP lint, smoke and exact served source checks passed. Aggregate records stayed 198 reservations, 31 guests, 208 status-history rows, 6 users including 1 active staff, 0 orders and0 kitchen tickets. The main mobile pending/error check issued zero booking POSTs, and the database safeguard verifier passed using rolled-back temporary writes. Existing credentials remain valid; app recreation may require signing in again.
- These checks do not constitute a full accessibility certification, performance benchmark or user study. E2–E4 remain unfinished. Use [the verification guide](../docs/verification.md) to rerun current evidence.

## 13. E2 local delivery — 2026-10-06

- Added [guest motion helper](../public/assets/js/guest-motion.js), loaded before the guest/showcase scripts. It uses native Web Animations with the existing E1 timing tokens. An unavailable animation API leaves the final UI static and usable; no dependency was installed.
- The hero copy/art enters once per page load over 220 ms with 6px travel and opacity from 0.85 to 1. The booking form stays usable as soon as its data is ready. Deliberate booking/management changes use 180 ms and up to 4px travel; menu/results/disclosure feedback uses 140 ms with no travel. No dish stagger, page curtain or autoplay was added.
- Rapid updates cancel the earlier effect on the same region. Changing the motion preference cancels active effects. Focus, requests, DOM updates and booking state never wait for animation completion; final content remains visible if an effect is interrupted.
- Booking headings describe the current step and receive focus immediately on deliberate navigation, with an instant reveal only when outside the viewport. An active control elsewhere is preserved. Menu category focus remains on its button, with one category/count announcement. Passive management refresh skips entrances and restores the corresponding control when its DOM node is replaced.
- Guest details entered before choosing another table are retained in page memory and restored on returning to details. This new draft is not written to sessionStorage. Successful completion or starting another reservation clears it; refresh creates a new page memory context. Existing hold/confirmation/private-link recovery storage remains unchanged.
- Explicit Use this table selection adds a truthful acknowledgment and returns focus to the new selected radio after the dialog closes. It still rechecks availability and creates no hold until Continue. Existing picture fade-in, revision guards and seating fallback are preserved; E2 does not claim a new overlapping image crossfade.
- Verification: 31 focused guest-motion checks passed, including paused/interrupted animation, changing motion preference, unsupported API, visible heading focus, preserved/cleared inputs, actual confirmed and pending bookings, private management refresh, late/reopened/missing images, four widths and zero automated A/AA violations in tested states. The guarded fixture runs only against disposable verification data; owned fake bookings are cancelled with verified private-capability responses.
- Relevant regression: 149 checks passed sequentially (26 E1 feedback, 12 guest/management, 34 capacity, 41 showcase, 36 readiness). Main app-only rebuild/recreation passed health, 54-file PHP lint, smoke, rollback-based DB safeguards and exact source matching. A read-only 390px main browser check verified hero/menu/search/motion/pictures/Escape behavior with zero booking POSTs. Main 198 reservations, 31 guests, 208 history rows, 6 users including 1 active staff, 0 orders and 0 tickets were retained.
- Limits: Automated verification used Chromium, not a full cross-browser performance benchmark or accessibility certification. E3 operational feedback and E4 final review remain unfinished and are deferred at Marvin’s request (2026-10-06).

## 14. Restaurant video reference — 2026-10-06

- Reference: Marvin supplied [Ahmed Codes — Premium Restaurant](https://www.tiktok.com/@ahmed_codes/video/7622363792369847553), also reachable through [the supplied short link](https://vt.tiktok.com/ZSbXYcqh6/). The public page metadata identifies a 57-second video. The ordinary stream URLs returned HTTP 403; the accessible cover image was inspected directly. This supports the visible design direction, not claims about the complete video or its animation timing.
- Observed preview: Horai's opening screen uses full-width cooking imagery, a dark overlay, a large ivory italic serif wordmark, widely spaced subtitle text, and restrained gold details. The code-editor cover is a different image and was not treated as a rendered design preview.
- Adaptation: Lumina keeps its identity and booking-first layout. The guest hero uses the existing locally licensed dining inspiration photo by Michel Stockman, a dark gradient, a large italic headline, softer gold, and an opaque booking card. Staff and service headers share the palette and italic display typography; operational controls retain their established layout and labels. The photograph is labelled as atmosphere inspiration, not an actual Lumina venue.
- Behavior: The background is decorative, reserves its layout, uses a local asset and falls back to the base color if unavailable. Existing E1/E2 feedback, focus, timings and reduced-motion behavior are retained. No autoplay, parallax, new animation library, or E3/E4 implementation was added. PHP services, policy, authentication, polling and database writes are unchanged.
- Verification: All eight existing browser suites passed sequentially: 12 guest, 10 staff, 10 orders, 41 showcase, 34 capacity, 26 feedback, 31 guest motion and 36 readiness checks (200 total). Desktop/mobile guest, authenticated staff, server and kitchen screenshots were inspected. Eight read-only main checks passed for the local photograph, 320/390/768/1440px reflow and automated A/AA rules, image failure without booking movement, Reserve navigation and zero mutation requests/JavaScript errors. Main/test smoke, 54-file PHP lint, rollback-based main DB safeguards and exact matching of all five delivered visual/credit files passed. Main retained 198 reservations, 31 guests, 208 history rows, six staff including one active, and zero orders/tickets. This is Chromium verification, not full-video motion reproduction, a performance benchmark or accessibility certification.
- Lesson: A visual reference can guide typography, image placement and palette while existing controls keep their purpose. Inspect the actual preview, distinguish it from a code screenshot, and record access limits rather than inventing unseen animations.


## 15. Full browser reference review — 2026-10-06

The supplied desktop URL, https://www.tiktok.com/@ahmed_codes/video/7622363792369847553?is_from_webapp=1&sender_device=pc, played normally in a fresh Chromium browser after the test libraries were restored. The player reported about 57.77 seconds, readyState 4 and no media error. Native seeking captured eleven timestamps from 0 through 57 seconds. Ordinary direct playback downloads still returned HTTP 403; the earlier access limitation above is historical and does not mean current browser playback is unavailable. Temporary frames are under /tmp/table-reserve-video-frames and may disappear after reboot.

Observed rendered screens:

- Around 6 seconds: full-width moving cooking imagery behind the large italic restaurant wordmark; minimal navigation and a spaced subtitle.
- Around 12 seconds: a dense multi-column food-photo gallery beneath the experience heading, with an Explore Menu call to action.
- Around 18 seconds: a featured-food composition with a heading, short story and large chopstick imagery. Intermediate screenshots alone do not establish the exact transition timing.
- Around 24–30 seconds: a separate menu presentation with photographic heading artwork, a left category list, dish thumbnails, names, descriptions, prices and fine divider lines. Clicking a category changes the visible menu position/state; precise scroll synchronization needs a closer interaction review.
- Around 36–42 seconds: a chef-image banner followed by an asymmetric editorial story layout with dining photographs and short copy.
- Around 48 seconds: a centered reservation form with two-column inputs, a notes field and an outlined booking action. The video does not demonstrate persistent reservations, availability validation or double-booking prevention.
- Around 54 seconds: a photographic locations banner and city labels. Lumina remains a fictional single-location demo in Lipa City; these cities should not be copied into the app.

Possible later adaptations, not implemented by this access review: a licensed food-image gallery, image-supported category navigation, a focused featured dish, a concise dining story, a truthful Lipa location presentation, and bounded scroll entrances with reduced-motion alternatives. Lumina's real availability/hold/details flow remains authoritative. Only use creator imagery as visual reference; new app assets need their own license or original creation. E3/E4 remain deferred until requested. The earlier 200 browser checks verify the delivered static adaptation, not these proposed extensions.

Status update (2026-10-06): Marvin authorized food-photo research and a moving gallery with design discretion. The locally licensed food gallery is now delivered and independently verified; see research/09_food_showcase_research.md. Its 20 focused checks and all 200 existing browser checks passed. Image-supported menu navigation, a featured dish and story/location extensions remain future scope; E3/E4 stay deferred.

Menu status update (2026-10-06): Marvin authorized menu photos and category navigation. These are now delivered locally: 36 real dishes, 34 local photos, a desktop sidebar, a mobile horizontal category strip, existing short menu motion and reduced-motion behavior. Twenty-one focused menu checks and all 220 existing browser checks passed; ten read-only main checks and eleven isolated booking HTTP checks passed. See research/09_food_showcase_research.md for provenance, source-license distinctions and exact-photo limitations. Featured dishes, story/location and E3/E4 remain deferred/separate scope.
