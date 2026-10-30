# Matching interior concept for Bella Vista About

Date:2026-10-30. User reference:Screenshot2026-10-30 134120. Marvin requested a distinct interior fitting the exterior and system. Built-in OpenAI image-generation tool was used; no API/CLI fallback.

## Asset and visual decision

The existing original exterior was used as a style/architecture reference only. New image shows an interior with the same reddish brick, limestone-trimmed black arched windows, amber lanterns, dark wood/rattan dining furniture and greenery at blue-hour dusk. No claim is made that this is an actual or architecturally surveyed venue. Kept the single-image About layout; no badge/collage or image zoom was reintroduced. Inspected full output and real desktop/phone crops: dining furniture and arches remain visible without covering text/actions.

## Saved files

- Original: `research/intro-assets/garden-interior-concept-original.png` (1448×1086).
- Desktop: `public/assets/images/intro/garden-interior-concept.webp` (1100×825,169736 bytes).
- Phone: `public/assets/images/intro/garden-interior-concept-small.webp` (680×510,81860 bytes).
- Prompt/reference/source hashes: `public/assets/images/intro/interior-credits.json`.

Encoding used the existing cwebp binary, quality82/method6, proportional downscaling only. Original image and exterior remain preserved; no new dependency installed. The saved phone image is selected through native picture/source markup.

## Final generation prompt

Use case: photorealistic-natural. Asset type: original restaurant interior concept image for Bella Vista Dining website About section, a single image, not a website mockup. Input image is a STYLE AND ARCHITECTURAL REFERENCE ONLY of the exterior. Generate a completely new interior view plausibly belonging inside this same garden-estate restaurant. Preserve visual identity: weathered reddish brown brick walls, tall black metal framed arched windows/doors with pale limestone arch surrounds, amber wall lanterns, lush tropical garden glimpses outside at blue-hour dusk. Inside: intimate elegant Filipino/continental garden-estate dining room, a few well-spaced dark walnut tables, upholstered warm brown dining chairs, subtle cream linen runners and simple ceramic table settings, brass warm lamps, restrained potted tropical greenery. Camera eye-level from within the room looking diagonally along dining tables toward arched windows overlooking the garden. Realistic material texture and physically coherent straight furniture, cozy premium hospitality, restrained and believable, no people. Lighting warm amber and deep brown with muted green, match the exterior evening atmosphere, no overexposure. Composition near-square 4:3 landscape with central dining/table and arched-window focal point safe for both square desktop and slightly landscape phone crop. Natural editorial architectural photography, 35mm perspective, not fisheye. No text, no logos, no watermarks, no border, no collage, no exterior-only scene. This must clearly show the INTERIOR of the same concept building, not a different rustic cafe.

## Verification

Observed a real-browser failure while About still referenced the exterior. After wiring the interior, all10 `browser-intro-story.mjs` checks passed, including actual decoding, matching interior path, five-width reflow/accessibility, small caption below image, source disclosure and failed-image readability. Both optimized image responses return image/webp and exact recorded SHA256. PHP template lint, browser-test JS syntax, whitespace and preview smoke passed. Full output and1440/390px in-page screenshots reviewed. Earlier27 intro/11 garden checks are not new executed evidence for this image-only replacement. No database command, push, deployment or hosted privacy change.
