# Chef cooking background research — 2026-10-07

Marvin marked the existing food showcase copy in a screenshot and chose a subtle background behind that text. The heading, menu link and existing photo strip remain authoritative. Match Lumina's dark brown/gold palette and the cooking-video mood of the supplied TikTok reference without slowing the booking flow.

## Reference

The earlier browser review of [Ahmed Codes' reference](https://www.tiktok.com/@ahmed_codes/video/7622363792369847553) captured moving cooking imagery around six seconds. That frame was reinspected from the preserved research screenshots: close pan/food action, warm flames, dark treatment and text over footage. The public TikTok page failed through the current web reader; this work reuses the directly inspected prior frame, not a claim of fresh full-video playback. No TikTok asset is copied.

## Candidate comparison

Checked 12 candidate pages; three eligible candidates were downloaded for temporal contact-sheet inspection. “Page only” means the description, format and license were checked, not a claimed full playback review.

| Candidate | Inspection | Fit and decision |
|---|---|---|
| [Pexels 8964522 — Chef Cooking at the Kitchen](https://www.pexels.com/video/chef-cooking-at-the-kitchen-8964522/) | Source page and frames across the actual 14.61-second 1080p video | **Selected.** Pan and chef action, dark kitchen, orange flames and no title overlays. Source is visually energetic, so use strong dark treatment and a short crossfaded crop. |
| [Pexels 4003980 — frying pan/flambé](https://www.pexels.com/video/a-chef-cooling-with-a-frying-pan-4003980/) | Page only, about four seconds | Good dark palette; very short original needs care to avoid an obvious repeated action. Alternate. |
| [Pexels 32046423 — fiery professional kitchen](https://www.pexels.com/video/fiery-cooking-in-professional-kitchen-32046423/) | Page only, about 22 seconds | Potential alternative; dramatic action can compete with the copy. |
| [Pexels 27814658 — restaurant chef preparing food](https://www.pexels.com/video/a-chef-is-preparing-food-in-a-restaurant-kitchen-27814658/) | Page only | Clear chef/environment context; busier kitchen suits a separate panel better. |
| [Pexels 33108152 — high-end restaurant flambé](https://www.pexels.com/video/sizzling-flambe-in-high-end-restaurant-kitchen-33108152/) | Page only | Warm cooking action; alternate requiring crop/playback review. |
| [Pexels 34804760 — professional wok cooking](https://www.pexels.com/video/professional-wok-cooking-with-flames-34804760/) | Page only | Relevant cooking technique; alternate requiring crop/playback review. |
| [Mixkit 4678 — chef at a large grill](https://mixkit.co/free-stock-video/chef-cooking-on-a-large-grill-4678/) | Frames across downloaded ~14-second clip; item explicitly Free License | Best calm alternative. Hands and grill move naturally, with warm restaurant ambience; diners remain in the background. |
| [Mixkit 4118 — black-suited chef/flambé](https://mixkit.co/free-stock-video/chef-in-black-suit-cooking-with-fire-4118/) | Frames across downloaded ~52-second clip; item explicitly Free License | Warm palette but yellow table settings, dessert service and a visible bottle make the composition busier. |
| [Mixkit 39535 — restaurant kitchen chef](https://mixkit.co/free-stock-video/professional-chef-cooking-in-a-restaurant-kitchen-39535/) | Item/license page | Rejected: free download is restricted to personal use. |
| [Mixkit 13258 — salad preparation](https://mixkit.co/free-stock-video/chef-preparing-salad-in-the-restaurant-kitchen-13258/) | Item/license page | Rejected: free download is restricted to personal use. |
| [Mixkit 15875 — chefs working](https://mixkit.co/free-stock-video/professional-chefs-work-in-restaurant-kitchen-15875/) | Item/license page | Rejected: free download is restricted to personal use. |
| [Mixkit 47555 — high-heat vegetables](https://mixkit.co/free-stock-video/chef-cooking-stir-fry-vegetables-on-high-heat-47555/) | Item/license page | Rejected: free download is restricted to personal use. |

## License and attribution

The [Pexels License](https://www.pexels.com/license/) permits free website/app use and modification; credit is appreciated rather than required. It forbids implied endorsement, unaltered resale, stock-library redistribution and trademark use. The selected footage is decorative stock inspiration, not presented as Lumina's actual chef or kitchen. Source/creator/date/processing and file hashes are retained in `public/assets/videos/food-showcase/credits.json`; visible credits link to the clip and license. Original high-resolution research downloads stay ignored under `.private`.

Mixkit distinguishes [Free and Restricted video licenses](https://mixkit.co/license/). The individual item page matters: a listing headed “free” does not establish commercial website use for every clip.

## Integration decisions

- Existing left copy only; no whole-page video or embedded third-party player. Apply a dark brown gradient strong enough for the light body copy even over a white flame. Keep the existing desktop photo animation and phone horizontal motion.
- Silent H.264 MP4, 854x480, 7.36 seconds, approximately 1.2 MB, with a 0.6-second tail/head blend at the loop seam. Small poster for static and failure states; no runtime video-editing dependency.
- Attach the stream only when the background is visible and motion is permitted. Stop when offscreen/hidden or explicitly paused. Existing Pause/Resume governs both video and photo motion. Reduced Motion keeps the poster and does not request the stream on a first visit.
- Use `muted`, `playsinline`, `loop`, `preload=none`, decorative semantics, and a poster fallback. Catch blocked-play promises so browser autoplay restrictions do not break booking. These choices follow the [HTML video element documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).

## Verification

The new background-video test failed before implementation because the element did not exist. All eight new video checks and 21 existing showcase regressions passed. Genuine currentTime playback and end-to-start looping, shared controls, phone layout, deferred/reduced-motion loading and unavailable-stream fallback were tested. JavaScript/PHP syntax and git diff checks passed; there were no external requests, mutations or JavaScript/CSP errors. Desktop and phone screenshots at a bright flame frame were inspected. A conservative white-frame compositing calculation for the least-dark overlay gives about 5.07:1 body-copy contrast, 4.88:1 gold and 8.63:1 heading; this is a design bound, not a complete accessibility certification. No database, authentication or booking-rule change is required.

## Hosted delivery

READY [Singapore Preview](https://restaurant-reservation-system-30y3y3ho8-marvmarv08.vercel.app), deployment `dpl_A9UckcTc6HWto8S51QhmnBWNG4Qf`, source `05cd40c`, verified owner `team_iFSlIHJejPUYm3ONVSXzLiG6`. All eight real hosted playback/fallback checks passed with no external requests, mutations or JavaScript/CSP errors. No QA staff or booking was created. Private/Preview APP_URL is updated. Existing idle-startup limits remain a separate issue.
