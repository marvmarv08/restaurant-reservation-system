# Bella Vista menu reference refresh — 2026-11-07

Marvin delegated selection from his food references, removal of blurry/mismatched menu offerings, original dish names/prices/descriptions and complete photo attribution. Applied only to the existing local preview at http://localhost:18080/reserve#menu. No hosted or older-local-main activation, GitHub push or Vercel deployment is part of this change.

## Selection and original demo pricing

The reviewed set contains 27 unique Google image-share references plus the Filipino drinks article; repeated links were deduplicated. Original references and their resolved source pages are retained in [references.json](menu-refresh-20261107/references.json).

The 24 current items retain the three assignment categories: eight mains, five appetizers/soups and eleven desserts/drinks. Prices are invented academic-demo PHP amounts, not quoted restaurant prices. Descriptions are original and match the broad photographed dish; images do not certify real ingredients, portions or allergen handling.

| Category | Selected menu name | PHP price | Actual photo source |
|---|---|---:|---|
| Main Courses / Specialties | Garden-Flame Chicken Inasal | 580.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2012/04/18/chicken-inasal/) |
| Main Courses / Specialties | Claypot Garlic Adobo | 520.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2011/11/23/chicken-adobo/) |
| Main Courses / Specialties | Golden Kawali Platter | 620.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2013/11/07/lechon-kawali-2/) |
| Main Courses / Specialties | Heritage Oxtail Kare-Kare | 780.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2012/04/16/kare-kare-2/) |
| Main Courses / Specialties | Slow-Simmered Beef Kaldereta | 680.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2013/02/25/kaldereta/) |
| Main Courses / Specialties | Golden Garlic Butter Prawns | 640.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2019/03/22/butter-garlic-prawns/) |
| Main Courses / Specialties | Fiesta Palabok | 420.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2011/02/18/pancit-palabok-2/) |
| Main Courses / Specialties | Garden Garlic Fried Rice | 150.00 | [Marvin Sacdalan](https://www.pexels.com/photo/fried-rice-in-a-bowl-13065212/) |
| Appetizers & Soups | Golden Shanghai Rolls | 240.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2011/01/21/spring-rolls-lumpiang-shanghai-2/) |
| Appetizers & Soups | Tamarind Garden Shrimp Sinigang | 520.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2015/01/12/sinigang-na-hipon/) |
| Appetizers & Soups | Market Garden Chopsuey | 360.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2014/08/05/chopsuey/) |
| Appetizers & Soups | Sun-Ripened Tomato Ensalada | 260.00 | [Valeria Boltneva](https://www.pexels.com/photo/tomato-salad-in-plate-beside-knife-1639555/) |
| Appetizers & Soups | Coastal Citrus Kinilaw | 390.00 | [Herbertkikoy](https://commons.wikimedia.org/wiki/File%3APinoy_Kinilaw.jpg) |
| Desserts & Drinks | Golden Caramel Leche Flan | 180.00 | [Ayub Abdul Rahman](https://www.pexels.com/photo/pudding-caramel-on-ceramic-plate-14665242/) |
| Desserts & Drinks | Velvet Ube Halaya | 190.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2012/04/19/ube-halaya/) |
| Desserts & Drinks | Coconut & Sweetcorn Maja | 160.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2011/07/14/maja-mais/) |
| Desserts & Drinks | Garden Oven Bibingka | 190.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2013/03/01/bibingka-2/) |
| Desserts & Drinks | Caramel-Crisp Banana Turon | 180.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2011/03/11/turon/) |
| Desserts & Drinks | Three-Layer Sapin-Sapin | 170.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2013/02/21/sapin-sapin/) |
| Desserts & Drinks | Coconut Bilo-Bilo Bowl | 210.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2013/06/27/ginataang-halo-halo-2/) |
| Desserts & Drinks | Creamy Young Coconut Cooler | 140.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2012/01/05/buko-juice/) |
| Desserts & Drinks | Mango Orchard Shake | 180.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2022/06/20/mango-shake/) |
| Desserts & Drinks | Amber Sago & Gulaman | 150.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2014/03/13/sago-samalamig/) |
| Desserts & Drinks | Honey-Calamansi Garden Tea | 140.00 | [Raymund / Ang Sarap](https://www.angsarap.net/2015/07/22/honey-calamansi-iced-tea/) |

## Photo quality and provenance

Visually reviewed reference and old-menu contact sheets. Replaced generic/mismatched meats, bare noodles, tasting courses, ingredient-only pictures and unrelated alcohol offerings. Retained fitting rice, tomato salad, flan and kinilaw concepts with sharper existing licensed photographs. New assets have unique source hashes; all24 decode at 800–1800px wide, mostly1080px. Twenty Ang Sarap files are kept byte-for-byte and displayed with object-fit:contain; three Pexels files use their1200px downloads and the Commons kinilaw uses its retained960px asset. No watermark removal, retouching or photo generation was used.

Google image result previews are discovery links, not licenses. Paid Shutterstock/iStock/Adobe preview images and unverified blogger/social photographs were not shipped. The Ang Sarap [copyright notice](https://www.angsarap.net/about/copyright/) and [CC BY-NC-ND3.0 terms](https://creativecommons.org/licenses/by-nc-nd/3.0/) explicitly permit attributed noncommercial sharing without adaptations. The school demo is noncommercial; these photos must be replaced or separately licensed before commercial use. Full source/creator/license/hash/reference links are in public/assets/images/menu/curated-2026/credits.json and the visible Menu photo credits.

Found unrelated social-preview fallback images on the sinigang, chopsuey and sapin-sapin pages. Selected the actual named recipe images instead, with a sliced sapin-sapin view showing the layers.

## Data safety and repeatable application

Source manifest: database/catalogs/bella-vista-menu-20261107.json. bin/refresh-menu-preview.php defaults to validation/dry-run and refuses main/hosted/non-isolated targets. Explicit --apply uses one transaction and the existing Bella Vista profile. The original36 active dishes are retained under an inactive archive category; original IDs, names, prices and saved order/preorder snapshots are not deleted or overwritten. New items use stable bv26_ codes; repeat application preserves IDs and values.

An ignored .private/menu-refresh-before-20261107.json catalog backup and44 unrelated-table fingerprints were captured first. Existing image files/manifests remain for historical references. Never restore that private backup into a hosted database.

Independent review identified that retiring a live accepted old preorder could block seating. No such live preorder exists in this preview. The updater now refuses retirement if a live scheduled booking or unexpired active-hold quote still references the previous menu. tests/menu-refresh-dependencies.php proves both refusal paths with real, self-cleaning isolated SQL fixtures and checks zero catalog changes. No PreorderService or reservation policy behavior was changed.

Recovery: stop menu writers, restore original category values and each original item's category_id/is_available from the private backup in a transaction; move bv26_ rows into the inactive archive instead of deleting them if any order now references them. Preserve original records and all post-refresh order history.

## Learning

A menu photograph, a sellable menu item and a saved order line serve different purposes. Replace or retire current offerings while retaining stable identities and accepted historical snapshots. A sharp-looking Google preview is not enough: inspect the actual image, its dimensions, the dish shown and the source license; keep accurate credits alongside the selected assets.

## New-menu order lifecycle verification — 2026-11-07

Verified43 real-service/MySQL checks plus14 authenticated browser/API checks against a separate disposable copy of the current local preview. Tested all24 actual menu prices through accepted booking/preorder, fresh-connection retrieval, seating, table-linked order/ticket creation, kitchen prepare/ready/serve, order closure, demo receipt records and final bill. Confirmation, kitchen and receipt retries do not duplicate records. A PHP580 Standard cart is refused at seating with no partial order; PHP1160 meets the minimum. Role denials and daily finalized-food reconciliation pass.

| Scenario | Food | Separate VIP extras | Demo base credit | Remaining meal payment | Final balance |
|---|---:|---:|---:|---:|---:|
| Standard: two Chicken Inasal | PHP1,160 | PHP0 | PHP0 | PHP1,160 | PHP0 |
| Family: one of every current item | PHP8,050 | PHP0 | PHP500 | PHP7,550 | PHP0 |
| VIP18: one of every current item | PHP8,050 | PHP900 | PHP2,500 | PHP6,450 | PHP0 |

The lifecycle is driven by actual application services. Arrival/order service tests inject a valid future dining-time clock only in the disposable test copy; the laptop/global clock and normal timing guards are unchanged. Browser checks use real staff/kitchen sign-in, persisted order/bill APIs, actual cashier screens and reload, and kitchen recall data. This is not a claim that every guest-to-kitchen UI click was freshly automated, or that the hosted/Vercel system was tested. No real payment was processed.

Source tests: tests/curated-menu-e2e.php and tests/browser-curated-order-review.mjs. The resetting PHP test hard-refuses any database host without the bv-menu-e2e- prefix, any database other than tablebook_p3_test, or non-isolated mode. Random fixture credentials stay in a container-private0600 file and are not emitted. The browser verifier requires the matching disposable container and loopback18480. Provision a separate MySQL container, restore the private preview export there, mount the current application read-only in a separate app container and run the PHP verifier before the browser review; never point this resetting test at the real preview.

The original localhost18080 full SQL export matched before/after, excluding only the dump completion timestamp. Its24-item menu remains available. Owned disposable containers, temporary volumes/network and generated environment files were removed after verification; the private recovery export is retained in the ignored .private folder. No main/hosted records or application behavior changed. Independent focused review found no blocker; the UI coverage limits above remain explicit.
