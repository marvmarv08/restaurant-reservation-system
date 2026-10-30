# Bella Vista Dining — identity and company content

This is the original visual identity for Marvin's academic restaurant system. The supplied restaurant.docx is the source of the company profile and history; Rubrics.docx requires original branding, prominent company content and responsive navigation. Project Documents.docx also requests a company banner and a palette/aesthetic justification. This identity guide and the banner cover those branding inputs; they do not complete the wider proposal or verify a real restaurant affiliation.

## Logo and banner

- [Original emblem](../../public/assets/brand/bella-vista-mark.svg): garden arch, sprout and plate, built from original SVG paths. The arch refers to the garden/estate narrative, the sprout to farm-to-table food, and the plate to shared dining. It replaces the previous generic flame mark.
- [Company banner](../../public/assets/brand/bella-vista-banner.svg): 1200 × 360 vector artwork, with the emblem, Bella Vista Dining name and Filipino/continental concept. It scales without blurring and can be inserted into a proposal that supports SVG.
- The emblem appears in guest, management, staff sign-in/host, server/kitchen, cashier and reports headers, with the restaurant name as selectable text. A local SVG favicon uses the same mark. Decorative copies are hidden from screen readers; the standalone files have accessible titles.
- Artwork was created for this project, with no borrowed restaurant logo, external image/font references or script. The company banner uses Georgia/Arial system fonts; exact letter shapes can vary by device. Preserve this source rather than presenting it as a traced real-business logo.

## Palette and aesthetic

| Color | Hex | Purpose and reason |
|---|---|---|
| Hearth brown | `#100e0c` | Main background; quiet contrast behind food photography |
| Warm charcoal | `#191510` | Panels/history surface; separates content without a bright block |
| Raised brown | `#211c16` | Existing raised controls/cards |
| Warm cream | `#f4efe6` | Main copy and headings; readable against the dark background |
| Soft stone | `#c5b8a6` | Secondary descriptions and source notes |
| Harvest gold | `#d7b078` | Original emblem, links and emphasis; warmth and hospitality |
| Garden sage | `#a8b89b` | Restrained story accent connecting the identity to the garden |

Cream, stone, gold and sage on the main background have calculated contrast ratios of 16.82:1, 9.89:1, 9.51:1 and 9.17:1 respectively. These color-pair calculations do not replace checking actual page components and focus states. Desktop and 320px automated accessibility checks cover the new company sections and navigation.

The design keeps the existing realistic licensed food/interior photography and original realistic seating renders. A garden-arch identity card gives the company story its own visual space without inventing a photograph of the client's estate. Serif headings use the existing locally hosted Cormorant Garamond with Georgia fallback; body text uses local Inter and existing fallbacks. Their existing font licenses remain in public/assets/fonts.

## Content source and placement

About Us and Company History are visible after the booking hero and before the food gallery, with dedicated header/footer links. The company profile and history reproduce the supplied brief, split into readable paragraphs. The history says the dining hall began alongside the Bella Vista estate in 2021 for in-house guests, then expanded into an independent destination because of public demand. No later opening year, owner, address, award, supplier certification or real contact detail is invented.

A nearby note identifies the company profile/history as supplied for the academic project. The static footer retains the academic identity and existing media credits remain intact. Gallery photographs are still labeled inspiration; the new company section does not imply that stock media depicts an actual Bella Vista property. Developer/team contacts and experience remain separate B7 inputs requiring confirmed facts.

Navigation retains rooms, menu, booking management and Reserve while adding About us/Our story. Small screens show all six links in a two-row grid instead of hiding the menu or company links. Keyboard anchors reach visible headings, and the booking form remains first in the guest journey. On the management page, story links return to the landing page instead of targeting hidden content.

## Delivery boundary and verification

The source is available in the isolated preview at http://localhost:18080. The running main image at port 8080 is not refreshed by editing these files. No main database/configuration changes, account changes, pricing edits, payment operations or publication belong to this branding batch. Keep B1 In progress until main activation and final acceptance are separately completed.

`tests/browser-bella-vista-branding.mjs` checks source-relevant content, local SVGs, eight viewport sizes, keyboard anchors, desktop/mobile accessibility, management links, actual booking availability and the branded protected workspaces. It uses existing synthetic staff sign-in without changing accounts or creating a reservation. `tests/browser-bella-vista-seating.mjs` checks the preserved 21 image/caption/interaction/accessibility cases. No database-resetting suite is needed for this content/vector change.

Learning: an original brand needs a repeatable visual idea, a readable palette and traceable content. A supplied company narrative is valid assignment content, while its source should remain clear; it does not establish real-world ownership or location.

Final isolated evidence: 19 branding browser checks and 21 preserved seating browser checks, nine unchanged seating assets, exact live company-text/source match, valid SVG XML, PHP 109 lint, JS syntax and main/test smoke passed. Main 37-table/configuration and 267 protected-file fingerprints matched; seven intended existing files changed. Independent read-only review found no actionable issue and measured additional tablet widths.

## Local introduction page — 2026-10-27

The local homepage now introduces Bella Vista before reservations, using original garden-estate concept imagery, existing identity/fonts and the supplied company profile/history. The native **Continue to reservation** link opens `/reserve`; About/History links return to the introduction, while room/menu/booking anchors stay on the reservation page. Old root booking/menu bookmarks are forwarded without a countdown or login gate. `/manage` and staff access retain their original paths.

The image is explicitly labeled an AI-generated concept, with original source and WebP provenance retained; it does not represent a real property. The introduction remains readable without JavaScript or successful image loading. Read [the source-based design/verification report](../../research/16_restaurant_intro_research.md). This work is local only; online access remains private and the hosted release is unchanged.

## Local introduction motion — 2026-10-28

A slow alternate zoom animates only the concept image. Headline and Continue stay stationary; decorative arrows respond to hover/keyboard focus, and story groups reveal once during normal scrolling. The visible Pause/Resume control remembers a local preference; reduced motion takes priority, and hidden/offscreen backgrounds stop. Static content remains usable with image/JavaScript failure. No video or additional media was added. Verified 20 motion/control checks plus 27 existing intro journey checks, with desktop/phone visual review and 1366/390/320px accessibility. Details and primary sources: [motion research](../../research/17_intro_motion_research.md). Delivery remains local only.

## Static hero revision — 2026-10-30

Marvin requested removal of the background zoom, its Pause/Resume button and the hero image-credit caption. These are removed locally; the existing restaurant concept image is static. Asset provenance remains in `public/assets/images/intro/credits.json`, and the company-story source note remains. Earlier ambient-motion notes describe the superseded implementation.

## Garden ambience revision — 2026-10-30

The static concept photo now has a separate decorative layer of warm drifting lights and slow entrance glow, approved by Marvin. Seven points on desktop and four on phones keep the composition restrained; the background image and reading/action targets stay fixed. A compact lower-right Pause/Resume icon controls only the garden ambience, with a separate remembered preference. Reduced-motion and static fallback behavior remain. This is CSS animation, not actual footage; no video/media asset is added. Verified 11 garden checks, five static-image checks and 27 intro journey checks, with desktop/phone visual review.

## About and History editorial layout — 2026-10-30

Replaced the large standalone emblem panel with an arched dining inspiration photograph, compact original brand seal and small layered bread image. The arch continues the identity; photographs introduce the hospitality/food theme without adding business claims. History uses the existing garden-estate concept with2021 typography and two story markers; it is not presented as an archival photograph. Supplied profile/history paragraphs remain verbatim. Existing reveal behavior is retained; no new continuous motion is added to these sections.

All images are local and lazy-loaded with alt text and dimensions. Source notes identify Michel Stockman/Unsplash and hello aesthe/Pexels, and distinguish generated concept imagery. Existing credits/checksums remain in table-showcase, food-showcase and intro manifests. Five-width checks include caption/card non-overlap, accessibility and image-failure reflow. Original reservation links and garden controls are preserved.

## About visual cohesion correction — 2026-10-30

Marvin found the stock dining/bread collage inconsistent with the garden-estate homepage. The approved revision uses one existing original exterior concept image, a restrained rectangular frame and a small caption below; the floating badge, secondary bread card and extra decorative outline are removed. The original company text and History timeline remain. Source notes identify the displayed concept images without stale stock attribution.10 updated story and27 intro checks passed, including five-width accessibility/reflow and failed-image behavior.

## Matching original interior — 2026-10-30

Marvin requested an interior instead of repeating the exterior in About. A new original generated interior uses the exterior as reference for brick arches, black window frames, limestone surrounds, warm amber lighting and garden greenery. The same single-image frame/caption remains. Responsive WebPs are169736 and81860 bytes; original PNG and full prompt/checksums are retained. These are concept views, not evidence of an actual venue. Read `research/19_matching_interior.md` for the prompt, assets and verification.10 updated story checks, five-width accessibility/reflow, desktop/phone visual review, exact served hashes, syntax and smoke passed.
