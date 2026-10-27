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
