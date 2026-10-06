<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Reserve your evening at Lumina Kitchen & Terrace. Private suites, dining by the hearth, and the harbour terrace.">
  <title>Lumina Kitchen & Terrace · Reservations</title>
  <link rel="stylesheet" href="/assets/css/app.css">
  <link rel="stylesheet" href="/assets/css/table-showcase.css">
  <script src="/assets/js/table-showcase.js" defer></script>
  <script src="/assets/js/guest.js" defer></script>
</head>
<body data-page="{{page}}">
  <a class="skip-link" href="#booking">Skip to booking</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Lumina home">
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor"/><path d="M16 6.5C19.6 11 21.4 13.6 21.4 17a5.4 5.4 0 0 1-10.8 0c0-3.4 1.8-6 5.4-10.5Z" fill="currentColor"/><path d="M16 13.5c1.6 2.1 2.4 3.2 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.4.8-2.5 2.4-4.6Z" class="flame-cut"/></svg>
      <span><b>Lumina</b><small>Kitchen & Terrace</small></span>
    </a>
    <nav aria-label="Primary navigation"><a class="experience-link" href="/#rooms">The rooms</a><a href="/#menu">Menu</a><a href="/manage">My booking</a><a class="button small" href="/#booking">Reserve</a></nav>
  </header>
  <main>
    <div class="guest-content">
      <section class="hero wrap" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Lipa City, Batangas · Smoke & citrus</p>
          <h1 id="hero-title">A seat<br>by the <em>fire.</em></h1>
          <p class="hero-description">Coastal fire cooking. A harbour breeze.<br>An evening worth making room for.</p>
          <a class="text-link" href="#menu">Explore the menu <span aria-hidden="true">↗</span></a>
          <div class="hero-service"><span class="service-dot" aria-hidden="true"></span><p>Tuesday–Sunday, 17:30–23:30<br><small>Last seating 21:45 · Closed Monday</small></p></div>
          <div class="hearth-art" aria-hidden="true"><span class="hearth-ring"></span><span class="hearth-ring second"></span><span class="hearth-core"></span><i>LUMINA · EST. FOR THE EVENING</i></div>
        </div>
        <section class="booking-card" id="booking" aria-label="Reserve a table" tabindex="-1">
          <div class="card-heading"><span class="eyebrow">Your evening starts here</span><span class="live-tag"><i aria-hidden="true"></i>Live availability</span></div>
          <h2 id="flow-title">Reserve a table</h2>
          <ol class="steps" aria-label="Booking steps"><li id="step-search" class="current">1 <span>Find a table</span></li><li id="step-details">2 <span>Your details</span></li><li id="step-confirmation">3 <span>Confirmation</span></li></ol>
          <p id="feedback" class="feedback" role="alert" tabindex="-1" hidden></p>
          <div id="flow"><p class="loading">Loading booking rules…</p></div>
          <noscript><p class="feedback">Enable JavaScript to reserve online, or call +63 2 8891 4420.</p></noscript>
        </section>
      </section>
      <section class="section wrap" id="rooms" aria-labelledby="rooms-title">
        <div class="section-heading"><div><p class="eyebrow">Four ways to spend the evening</p><h2 id="rooms-title">Find your corner.</h2></div><p>A quiet suite, a place by the hearth,<br>or the last light over the harbour.</p></div>
        <div id="room-cards" class="room-grid"></div>
      </section>
      <section class="section menu-section" id="menu" aria-labelledby="menu-title"><div class="wrap">
        <div class="section-heading"><div><p class="eyebrow">The kitchen & the bar</p><h2 id="menu-title">Made for sharing.</h2></div><p>From opening bites to one last glass.<br>Prices shown in Philippine pesos.</p></div>
        <div id="menu-categories" class="category-tabs" role="group" aria-label="Menu categories"></div><div id="menu-items" class="menu-grid"></div>
      </div></section>
    </div>
    <section class="manage-content wrap" id="manage-workspace" aria-labelledby="manage-title" tabindex="-1" hidden>
      <p class="eyebrow">Your reservation</p><h1 id="manage-title">Your evening,<br><em>all in one place.</em></h1>
      <p id="manage-feedback" class="feedback" role="alert" tabindex="-1" hidden></p><div id="management"><p class="loading">Loading your booking…</p></div>
    </section>
  </main>
  <footer class="wrap site-footer"><div><span class="eyebrow">Lumina Kitchen & Terrace</span><p>Lipa City, Batangas, Philippines<br>Tuesday–Sunday · 17:30–23:30</p></div><div><a href="/manage">Manage your booking</a><a href="/staff/login">Staff sign-in</a><a href="tel:+63288914420">+63 2 8891 4420</a><p class="fine-print">Fictional demo venue. Notifications are simulated.<br>No payments are collected.</p></div></footer>
  <dialog id="cancel-dialog" aria-labelledby="cancel-title"><h2 id="cancel-title">Cancel your reservation?</h2><p id="cancel-description"></p><p>Your table will be released. No payment or cancellation charge is collected.</p><div class="actions"><button class="button ghost" id="keep-booking" autofocus>Keep reservation</button><button class="button danger" id="confirm-cancel">Confirm cancellation</button></div></dialog>
</body>
</html>
