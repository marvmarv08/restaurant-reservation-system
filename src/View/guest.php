<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Reserve a table at Bella Vista Dining. Browse the menu and manage your reservation.">
  <title>Bella Vista Dining · Reservations</title>
  <link rel="stylesheet" href="/assets/css/app.css">
  <link rel="stylesheet" href="/assets/css/table-showcase.css">
  <link rel="stylesheet" href="/assets/css/food-showcase.css">
  <link rel="stylesheet" href="/assets/css/menu-catalog.css">
  <link rel="stylesheet" href="/assets/css/ui-feedback.css">
  <link rel="stylesheet" href="/assets/css/guest-desktop.css">
  <script src="/assets/js/ui-feedback.js" defer></script>
  <script src="/assets/js/guest-scroll.js" defer></script>
  <script src="/assets/js/guest-motion.js" defer></script>
  <script src="/assets/js/guest-navigation.js" defer></script>
  <script src="/assets/js/floor-layout.js" defer></script>
  <script src="/assets/js/table-showcase.js" defer></script>
  <script src="/assets/js/food-showcase.js" defer></script>
  <script src="/assets/js/hero-background.js" defer></script>
  <script src="/assets/js/menu-photos.js" defer></script>
  <link rel="icon" type="image/svg+xml" href="/assets/brand/bella-vista-mark.svg">
  <link rel="stylesheet" href="/assets/css/bella-vista-brand.css">
  <link rel="stylesheet" href="/assets/css/guest-preorders.css">
  <script src="/assets/js/guest-preorders.js" defer></script>
  <script src="/assets/js/guest.js" defer></script>
</head>
<body data-page="{{page}}">
  <a class="skip-link" href="#booking">Skip to booking</a>
  <header class="site-header">
    <a class="brand" href="/">
      <svg class="bella-vista-mark" viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 32V21a15 15 0 0 1 30 0v11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 35h34M11 39c7 5 19 5 26 0M24 31V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M24 25c-7 0-11-4-11-9 7 0 11 3 11 9Zm0-4c0-7 4-10 10-10 0 6-3 10-10 10Z" fill="currentColor"/></svg>
      <span><b>Bella Vista</b> <small>Dining</small></span>
    </a>
    <nav aria-label="Primary navigation"><a href="/#about">About us</a><a href="/#history">Our story</a><a class="experience-link" href="/reserve#rooms">The rooms</a><a href="/reserve#menu">Menu</a><a href="/manage">My booking</a><a class="button small" href="/reserve#booking">Reserve</a></nav>
  </header>
  <main>
    <div class="guest-content">
      <section class="hero wrap" aria-labelledby="hero-title">
        <div class="hero-backdrop" aria-hidden="true">
          <img src="/assets/videos/hero/dining-poster.jpg" alt="" width="1280" height="720" fetchpriority="high">
          <video id="hero-dining-video" data-src="/assets/videos/hero/dining-loop.mp4" width="1280" height="720" muted loop playsinline preload="none" tabindex="-1" disablepictureinpicture></video>
        </div>
        <div class="hero-copy">
          <p class="eyebrow">Farm-to-table · Filipino &amp; continental</p>
          <h1 id="hero-title">A seat<br>by the <em>fire.</em></h1>
          <p class="hero-description">Filipino comfort. Continental favourites.<br>An evening worth making room for.</p>
          <a class="text-link" href="#menu">Explore the menu <span aria-hidden="true">↗</span></a>
          <div class="hero-service"><span class="service-dot" aria-hidden="true"></span><p>Tuesday–Sunday, 17:30–23:30<br><small>Last seating 21:45 · Closed Monday</small></p></div>
          <p class="hero-photo-note">Atmosphere inspiration · <a href="https://www.pexels.com/video/cozy-modern-restaurant-interior-at-night-31631562/">video by gusat silviu / Pexels</a></p>
        </div>
        <section class="booking-card" id="booking" aria-label="Reserve a table" tabindex="-1">
          <div class="card-heading"><span class="eyebrow">Your evening starts here</span><span class="live-tag"><i aria-hidden="true"></i>Live availability</span></div>
          <h2 id="flow-title" tabindex="-1">Reserve a table</h2>
          <ol class="steps" aria-label="Booking steps"><li id="step-search" class="current" aria-current="step"><span class="step-number" aria-hidden="true">1</span><span>Find a table<span class="step-state response-announcement"> — current step</span></span></li><li id="step-details"><span class="step-number" aria-hidden="true">2</span><span>Your details<span class="step-state response-announcement"></span></span></li><li id="step-confirmation"><span class="step-number" aria-hidden="true">3</span><span>Confirmation<span class="step-state response-announcement"></span></span></li></ol>
          <p id="feedback" class="feedback" role="alert" tabindex="-1" hidden></p>
          <div id="flow"><p class="loading">Loading booking rules…</p></div>
          <noscript><p class="feedback">Enable JavaScript to use online reservations. This academic demo has no configured contact number.</p></noscript>
        </section>
      </section>
      <section class="section wrap company-section" id="about" aria-labelledby="about-title" tabindex="-1">
        <div class="company-intro"><p class="eyebrow">About Us</p><h2 id="about-title">A place to gather.<br>A taste of <em>home.</em></h2><p class="company-lead">Bella Vista Dining is a premier farm-to-table restaurant offering a cozy, ambient, and modern dining experience.</p><p>It serves a fusion of local Filipino comfort food and continental specialties, designed for families, couples, and groups seeking a delightful culinary escape.</p><div class="company-links"><a class="text-link" href="#menu">Discover the menu <span aria-hidden="true">↗</span></a><a class="text-link" href="#history">Read our history <span aria-hidden="true">↓</span></a></div></div>
        <aside class="company-emblem" aria-label="Bella Vista Dining identity"><svg class="bella-vista-mark" viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 32V21a15 15 0 0 1 30 0v11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 35h34M11 39c7 5 19 5 26 0M24 31V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M24 25c-7 0-11-4-11-9 7 0 11 3 11 9Zm0-4c0-7 4-10 10-10 0 6-3 10-10 10Z" fill="currentColor"/></svg><p class="company-wordmark">Bella Vista <span>Dining</span></p><p class="eyebrow">Rooted in the garden.<br>Made for the table.</p><p>Filipino comfort food<br>&amp; continental specialties</p></aside>
      </section>
      <section class="company-history section" id="history" aria-labelledby="history-title" tabindex="-1"><div class="wrap history-layout">
        <div><p class="eyebrow">Company History</p><h2 id="history-title">From the estate<br>to <em>your table.</em></h2><p class="history-year"><span>Our beginning</span>2021</p></div>
        <div class="history-copy"><p class="company-lead">Established alongside the Bella Vista estate in 2021, the dining hall initially catered exclusively to in-house guests.</p><p>Due to overwhelming public demand for its signature dishes and scenic garden views, it expanded into an independent destination restaurant known for its exquisite food, ambient atmosphere, and exceptional customer service.</p><p class="company-source">Company profile and history supplied in the restaurant brief for this academic project.</p><a class="button ghost" href="#booking">Plan your visit</a></div>
      </div></section>
      <section class="food-showcase section" id="food-showcase" aria-labelledby="food-title">
        <div class="wrap food-layout">
          <div class="food-copy">
            <div class="food-film" aria-hidden="true"><video id="food-cooking-video" data-src="/assets/videos/food-showcase/chef-loop.mp4" poster="/assets/videos/food-showcase/chef-poster.jpg" width="854" height="480" muted loop playsinline preload="none" tabindex="-1" disablepictureinpicture></video></div>
            <p class="eyebrow">Smoke. Citrus. Something to share.</p>
            <h2 id="food-title">A taste of<br> the <em>evening.</em></h2>
            <p>From the first bite to the last glass.<br>Discover the flavours behind a seat at Bella Vista Dining.</p>
            <a class="button food-menu-link" href="#menu">Explore the menu</a>
            <p class="food-swipe-hint">Swipe to explore <span aria-hidden="true">→</span></p>
            <p class="food-note">Food inspiration · stock photography and video.<br>See our menu for dishes, prices and dietary tags.</p>
          </div>
          <div class="food-gallery" id="food-gallery" role="group" aria-label="Food inspiration photographs" tabindex="0">
          <div class="food-column"><div class="food-track"><div class="food-set"><figure class="food-photo"><img src="/assets/images/food-showcase/bread.jpg" alt="Rustic bread and butter on a warm wooden table" width="640" height="800" loading="lazy" decoding="async"><figcaption>Bread &amp; butter</figcaption></figure><figure class="food-photo"><img src="/assets/images/food-showcase/pork.jpg" alt="Slices of crispy pork belly on a dark plate" width="640" height="800" loading="lazy" decoding="async"><figcaption>Slow cooking, crisp edges</figcaption></figure></div></div></div>
          <div class="food-column"><div class="food-track"><div class="food-set"><figure class="food-photo"><img src="/assets/images/food-showcase/oysters.jpg" alt="Fresh oysters arranged around a bowl of sauce" width="640" height="800" loading="lazy" decoding="async"><figcaption>A taste of the coast</figcaption></figure><figure class="food-photo"><img src="/assets/images/food-showcase/fish.jpg" alt="Grilled fish with vegetables on a ceramic plate against a dark background" width="640" height="800" loading="lazy" decoding="async"><figcaption>From sea to hearth</figcaption></figure></div></div></div>
          <div class="food-column"><div class="food-track"><div class="food-set"><figure class="food-photo"><img src="/assets/images/food-showcase/cocktail.jpg" alt="An amber cocktail in a crystal glass against a dark background" width="640" height="800" loading="lazy" decoding="async"><figcaption>One last glass</figcaption></figure><figure class="food-photo"><img src="/assets/images/food-showcase/dessert.jpg" alt="Chocolate dessert with berries being dusted with sugar" width="640" height="800" loading="lazy" decoding="async"><figcaption>A sweeter ending</figcaption></figure></div></div></div>
          </div>
        </div>
        <details class="wrap food-credits"><summary>Photography credits</summary><p>Food inspiration photographed by <a href="https://www.pexels.com/photo/bread-and-butter-on-the-table-16471855/">hello aesthe</a> · <a href="https://www.pexels.com/photo/close-up-photo-of-a-black-plate-with-crispy-roasted-pork-8408373/">AMANDA LIM</a> · <a href="https://www.pexels.com/photo/oysters-on-plate-2647936/">Elle Hughes</a> · <a href="https://www.pexels.com/photo/grilled-fish-in-a-plate-6046671/">elif tekkaya</a> · <a href="https://www.pexels.com/photo/cold-cocktail-in-glass-on-black-background-16806420/">Blue Arauz</a> · <a href="https://www.pexels.com/photo/chocolate-dessert-on-a-plate-with-berries-5945557/">Any Lane</a>. Used under the <a href="https://www.pexels.com/license/">Pexels License</a>. Cooking footage: <a href="https://www.pexels.com/video/chef-cooking-at-the-kitchen-8964522/">PureRaw: Camera &amp; Film Grain / Pexels</a>, trimmed and crossfaded under the Pexels License. Stock imagery illustrates the culinary mood; exact dishes and presentation may differ.</p></details>
      </section>
      <section class="section wrap" id="rooms" aria-labelledby="rooms-title">
        <div class="section-heading"><div><p class="eyebrow">Four ways to spend the evening</p><h2 id="rooms-title">Find your corner.</h2></div><p>A quiet suite, a place by the hearth,<br>or a table to gather with friends.</p></div>
        <div id="room-cards" class="room-grid"></div>
      </section>
      <section class="section menu-section" id="menu" aria-labelledby="menu-title"><div class="wrap">
        <div class="section-heading"><div><p class="eyebrow">The kitchen & the bar</p><h2 id="menu-title">Made for sharing.</h2></div><p>From opening bites to one last glass.<br>Prices shown in Philippine pesos.</p></div>
        <p class="menu-photo-note">Illustrative photos of dishes and ingredients. Exact recipes and presentation may differ; use each dish's description and dietary tags.</p>
        <section id="signature-dish" class="signature-dish" aria-labelledby="signature-title" hidden></section>
        <div class="menu-layout">
          <aside class="menu-navigation" aria-label="Browse menu categories"><p class="eyebrow">Choose your course</p><div id="menu-categories" class="category-tabs" role="group" aria-label="Menu categories"></div></aside>
          <div class="menu-results"><div class="menu-results-heading"><div><h3 id="menu-category-title">All dishes</h3><p id="menu-category-note">From opening bites to one last glass.</p></div><span id="menu-result-count"></span></div><div id="menu-items" class="menu-grid"></div></div>
        </div>
        <details id="menu-photo-credits" class="menu-photo-credits"><summary>Menu photo credits</summary><p>Stock food and ingredient inspiration. Images are resized thumbnails or existing local photographs; the Kinilaw signature feature uses a larger 960px version. Menu thumbnails use square crops; the signature feature uses a wider CSS crop. The Commons images retain their listed Creative Commons licenses, including ShareAlike where applicable. No photographer endorsement is implied.</p><ul><li><a href="https://www.pexels.com/photo/a-close-up-shot-of-a-bowl-of-chips-8964243/">A close up shot of a bowl of chips</a> — RDNE Stock project · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/meal-on-plate-10806017/">Meal on plate</a> — Dmitriy Ganin · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/a-seafood-dish-on-a-black-plate-16585779/">A seafood dish on a black plate</a> — Nadin Sh · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/tomato-salad-in-plate-beside-knife-1639555/">Tomato salad in plate beside knife</a> — Valeria Boltneva · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/roasted-meat-on-a-plate-17751633/">Roasted meat on a plate</a> — Valeria Boltneva · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/dish-with-squid-15387326/">Dish with squid</a> — Mustafa Erdağ · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/ribs-served-on-white-plate-18674118/">Ribs served on white plate</a> — Nadin Sh · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/toasted-bread-with-bone-marrow-on-the-ceramic-plate-9408165/">Toasted bread with bone marrow on the ceramic plate</a> — Airam Dato-on · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/fried-rice-in-a-bowl-13065212/">Fried rice in a bowl</a> — Marvin Sacdalan · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/photo-of-noodles-on-bowl-3296679/">Photo of noodles on bowl</a> — cottonbro studio · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/pudding-caramel-on-ceramic-plate-14665242/">Pudding caramel on ceramic plate</a> — Ayub Abdul Rahman · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/delicious-mango-sticky-rice-dessert-top-view-36452148/">Delicious mango sticky rice dessert top view</a> — RAQUEL ESPONILLA · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/glass-of-iced-tea-18263138/">Glass of iced tea</a> — Ebru DOĞAN · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/photo-of-glass-mugs-with-pineapple-juice-8230027/">Photo of glass mugs with pineapple juice</a> — Los Muertos Crew · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/cup-of-espresso-18395616/">Cup of espresso</a> — Rana g · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/glass-of-red-wine-19432017/">Glass of red wine</a> — Ahmet Bozkus · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/top-view-of-risotto-plate-12630590/">Top view of risotto plate</a> — Prem Singh Tanwar · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/delicious-gourmet-meal-20205483/">Delicious gourmet meal</a> — Agustin Muñiz · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/mushroom-and-cabbage-asian-cuisine-dish-37297734/">Mushroom and cabbage asian cuisine dish</a> — Gu Ko · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/glass-with-cocktail-on-black-background-5947012/">Glass with cocktail on black background</a> — Charlotte May · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/tasty-roasted-steak-and-mussel-salad-in-restaurant-6542795/">Tasty roasted steak and mussel salad in restaurant</a> — Geraud pfeiffer · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/plates-of-appetizing-assorted-seafood-served-on-table-in-restaurant-6510284/">Plates of appetizing assorted seafood served on table in restaurant</a> — Lachlan Ross · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://commons.wikimedia.org/wiki/File%3AChicken_adobo_%28Philippines%29.jpg">File:Chicken adobo (Philippines).jpg</a> — Arnold Gatilao · <a href="https://creativecommons.org/licenses/by/2.0">CC BY 2.0</a></li><li><a href="https://commons.wikimedia.org/wiki/File%3AHalo-Halo.jpg">File:Halo-Halo.jpg</a> — Herbertkikoy · <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a></li><li><a href="https://commons.wikimedia.org/wiki/File%3AKare_kare.jpg">File:Kare kare.jpg</a> — Anißäb · <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a></li><li><a href="https://commons.wikimedia.org/wiki/File%3APinoy_Kinilaw.jpg">File:Pinoy Kinilaw.jpg</a> — Herbertkikoy · <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a></li><li><a href="https://commons.wikimedia.org/wiki/File%3ASinigang_na_Hito.jpg">File:Sinigang na Hito.jpg</a> — Jeewel · <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a></li><li><a href="https://commons.wikimedia.org/wiki/File%3AUbe_halaya%2C_Filipino_dessert.jpg">File:Ube halaya, Filipino dessert.jpg</a> — Lokalpedia · <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a></li><li><a href="https://www.pexels.com/photo/bread-and-butter-on-the-table-16471855/">Bread culinary inspiration</a> — hello aesthe · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/close-up-photo-of-a-black-plate-with-crispy-roasted-pork-8408373/">Pork culinary inspiration</a> — AMANDA LIM · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/oysters-on-plate-2647936/">Oysters culinary inspiration</a> — Elle Hughes · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/grilled-fish-in-a-plate-6046671/">Fish culinary inspiration</a> — elif tekkaya · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/cold-cocktail-in-glass-on-black-background-16806420/">Cocktail culinary inspiration</a> — Blue Arauz · <a href="https://www.pexels.com/license/">Pexels License</a></li><li><a href="https://www.pexels.com/photo/chocolate-dessert-on-a-plate-with-berries-5945557/">Dessert culinary inspiration</a> — Any Lane · <a href="https://www.pexels.com/license/">Pexels License</a></li></ul></details>
      </div></section>
    </div>
    <section class="manage-content wrap" id="manage-workspace" aria-labelledby="manage-title" tabindex="-1" hidden>
      <p class="eyebrow">Your reservation</p><h1 id="manage-title" tabindex="-1">Your evening,<br><em>all in one place.</em></h1>
      <p id="manage-feedback" class="feedback" role="alert" tabindex="-1" hidden></p><div id="management"><p class="loading">Loading your booking…</p></div>
    </section>
  </main>
  <footer class="wrap site-footer"><div><span class="eyebrow">Bella Vista Dining</span><p>Academic restaurant project · Philippines<br>Tuesday–Sunday · 17:30–23:30</p></div><div><a href="/#about">About us</a><a href="/#history">Company history</a><a href="/manage">Manage your booking</a><a href="/staff/login">Staff sign-in</a><p class="fine-print">Based on the supplied restaurant brief. Notifications are simulated.<br>No payments are collected.</p></div></footer>
  <dialog id="cancel-dialog" aria-labelledby="cancel-title"><h2 id="cancel-title">Cancel your reservation?</h2><p id="cancel-description"></p><p>Your table will be released. No payment or cancellation charge is collected.</p><div class="actions"><button class="button ghost" id="keep-booking" autofocus>Keep reservation</button><button class="button danger" id="confirm-cancel">Confirm cancellation</button></div></dialog>
</body>
</html>
