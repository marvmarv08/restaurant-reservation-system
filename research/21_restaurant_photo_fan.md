# Bella Vista right-side restaurant photo fan

Date:2026-10-30. Placement approved in Screenshot2026-10-30 152027: the RIGHT-side About picture. User delegated structure/design as long as it keeps the same click-to-change concept and matches Bella Vista. Local implementation, no publication.

Latest refinement: [ten-photo collection and arrow removal](22_ten_photo_showcase.md). The five-photo controls below document the initial delivery.

## Reference and design

Inspected [Mar Wie Ang About](https://www.marwieang.com/about) in a real browser and compared before/after click screenshots with the user's145124/150905 references. Its seven-photo fan moves the next photo to the foreground and updates dots. The initially supplied /stack route lists technologies; /about contains the intended interaction. No personal photographs or source code copied.

Adapted to five original restaurant views, a warm cream/gold border, dark surface and a right-side composition matching the existing brand. Front click advances; an exposed side photo or a dot selects that view. Previous/next buttons and ArrowLeft/ArrowRight/Home/End/Space work; focus and scroll position are preserved. Dots, caption/counter and polite status identify the chosen view.44px targets work on phones; below800px the showcase stacks after the text. Base HTML provides native image links/static grid. Failures display a stable fallback and successful later responsive loads restore the image.

The component uses finite380ms transform/opacity transitions only on interaction, with no autoplay/interval/frame loop. Reduced motion removes transitions. Existing garden effects, static hero picture, History and reservation-page continuous videos are untouched.

## Images and saved files

Used the built-in OpenAI image generation tool. Existing original exterior/interior were architectural/lighting references only. New views share brick, pale arch surrounds, black frames, amber lanterns, walnut/rattan furniture and garden greenery. They are concept illustrations, not photos of an actual property or exact room/seating guarantees. No external stock asset is introduced. All photos are lazy-loaded with dimensions/alt text; existing exterior/interior retain their phone sources.

Optimized files live under `public/assets/images/intro/gallery/`, with full prompt/reference/encoding/checksum metadata in `public/assets/images/intro/gallery/credits.json`. New600px-wide WebPs total299640 bytes; proportional cwebp quality80/method6 encoding only. Original PNGs remain in research, and imagegen's original outputs are preserved.

| WebP | Bytes | Original PNG |
|---|---:|---|
| garden-terrace.webp | 114012 | research/intro-assets/gallery/garden-terrace.png |
| private-dining.webp | 101474 | research/intro-assets/gallery/private-dining.png |
| tableside.webp | 84154 | research/intro-assets/gallery/tableside.png |

## Final prompts

### garden-terrace

Use case: photorealistic-natural. Asset: ONE original architectural restaurant concept photo for a Bella Vista Dining website photo-card gallery, not a UI mockup or collage. Reference image 1 is the restaurant EXTERIOR; reference image 2 is its INTERIOR. Use them only as architectural/material/lighting references, create a NEW different view of the SAME believable garden-estate restaurant: reddish brown weathered brick, pale stone arched surrounds, black metal window/door frames, amber lanterns, dark walnut and brown/rattan dining furniture, restrained cream linens, lush tropical greenery, warm gold and deep brown palette, evening blue-hour ambience. Eye-level architectural editorial photograph, straight coherent geometry, no people, text, logos, watermarks or borders. Portrait 3:4 composition, architectural and table focal points centered for responsive cards. Keep venue scale intimate and realistic. Scene: an intimate garden terrace just outside the reference restaurant. View from a small elegantly set dark walnut dining table toward the reddish brick arched doorways, garden greenery framing the sides, subtle path and lantern lighting, dusk sky glimpses. This is outdoor dining within the same estate, not a beach resort, city cafe or palace.

### private-dining

Use case: photorealistic-natural. Asset: ONE original architectural restaurant concept photo for a Bella Vista Dining website photo-card gallery, not a UI mockup or collage. Reference image 1 is the restaurant EXTERIOR; reference image 2 is its INTERIOR. Use them only as architectural/material/lighting references, create a NEW different view of the SAME believable garden-estate restaurant: reddish brown weathered brick, pale stone arched surrounds, black metal window/door frames, amber lanterns, dark walnut and brown/rattan dining furniture, restrained cream linens, lush tropical greenery, warm gold and deep brown palette, evening blue-hour ambience. Eye-level architectural editorial photograph, straight coherent geometry, no people, text, logos, watermarks or borders. Portrait 3:4 composition, architectural and table focal points centered for responsive cards. Keep venue scale intimate and realistic. Scene: a cozy private dining nook inside the same restaurant. A single rectangular walnut table set for six, warm brown upholstered/rattan chairs, simple ceramic plates, cream linen runner, brass table lamp and tasteful potted greenery. A tall black-framed arched window with pale stone surround and exposed brick wall overlooks the dusk garden. Private-room concept, no signage. Camera from the doorway with the whole table and architectural arch in view.

### tableside

Use case: photorealistic-natural. Asset: ONE original architectural restaurant concept photo for a Bella Vista Dining website photo-card gallery, not a UI mockup or collage. Reference image 1 is the restaurant EXTERIOR; reference image 2 is its INTERIOR. Use them only as architectural/material/lighting references, create a NEW different view of the SAME believable garden-estate restaurant: reddish brown weathered brick, pale stone arched surrounds, black metal window/door frames, amber lanterns, dark walnut and brown/rattan dining furniture, restrained cream linens, lush tropical greenery, warm gold and deep brown palette, evening blue-hour ambience. Eye-level architectural editorial photograph, straight coherent geometry, no people, text, logos, watermarks or borders. Portrait 3:4 composition, architectural and table focal points centered for responsive cards. Keep venue scale intimate and realistic. Scene: a closer tableside view inside the same restaurant, inviting but not an extreme macro. A walnut table set for two with elegant simple ceramics, glasses, cream linen runner, compact warm brass lamp and small natural greenery arrangement. Brown woven dining chairs in foreground, reddish brick wall and black-framed arched window overlooking tropical garden in the middle background. Preserve recognizable architecture, not just food props. No prepared food, no people.

## Verification and limits

Observed red: no fan existed (0 versus5 photos). Final `browser-photo-fan.mjs`:20 passed, including right-side placement, five decoded assets, actual front click/rearrangement, exposed side pointer, genuine phone taps, dots/arrows/wrap, keyboard/focus, rapid input, no autoplay/idle animation, seven-width bounds/accessibility, reduced motion, failed-image fallback, responsive recovery, no-JavaScript links and no writes/external requests/browser errors. Existing story10, intro27, garden11 and static5 passed (73 total). PHP111 lint,58 JS parse, preview smoke and whitespace passed. All3 new served WebPs match image/webp and manifest SHA256; main/preview all-table fingerprints match the task baseline. Desktop/tablet/phone screenshots inspected.

Independent reviewer found no critical/important issue and one minor recovery issue: a mobile-source failure stayed hidden after the desktop source loaded. Added a failing resize regression, then a successful-load handler; the final recovery check passes. The test runner also auto-centered a transformed card during locator.click; direct pointer measurements confirmed real clicks preserve scroll position (1030→1030), and the test now checks the actual pointer action.

Physical iOS/cross-browser performance and full staff/write suites were not run for this local UI feature. This is not accessibility certification or a device FPS guarantee. No GitHub push, Vercel operation, database reset/migration/import or account change. Latest hosted private release remains separate until publication is requested.
