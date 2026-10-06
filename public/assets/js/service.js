(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    mode = document.body.dataset.mode,
    root = $("#service-content"),
    dialog = $("#service-dialog"),
    detailRoot = $("#service-dialog-content"),
    filters = $("#service-filters");
  const ui = window.LuminaFeedback;
  let csrf = "",
    user = null,
    menu = [],
    selected = null,
    busy = false,
    pending = null,
    clockEpoch = 0,
    clockAt = 0,
    pollBusy = false,
    dialogOpener = null;
  const permitted = (p) => user?.permissions.includes(p);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== false && v !== null) n.setAttribute(k, String(v));
    }
    for (const c of children.flat(Infinity))
      if (c !== null && c !== undefined)
        n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  };
  const btn = (label, fn, attrs = {}) => {
    const b = el(
      "button",
      { type: "button", class: "button ghost", ...attrs },
      label,
    );
    b.addEventListener("click", () => {
      if (!dialog.open) dialogOpener = b;
      execute(fn, b);
    });
    return b;
  };
  const money = (c) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(c) / 100);
  const field = (label, attrs, options) =>
    el(
      "label",
      {},
      label,
      options
        ? el("select", { ...attrs, "aria-label": label }, options)
        : el("input", { ...attrs, "aria-label": label }),
    );
  function feedback(
    message,
    target = dialog.open
      ? $("#service-dialog-feedback")
      : $("#service-feedback"),
  ) {
    ui.message(target, message, { kind: "error" });
    if (pending && !target.querySelector("button"))
      target.append(btn("Retry same request", () => submitPending()));
  }
  async function api(path, body) {
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      headers: body
        ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
        : {},
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    });
    const value = await response.json();
    if (!response.ok) {
      const error = new Error(value.error?.message || "Request failed.");
      error.code = value.error?.code;
      error.status = response.status;
      if (response.status === 401) {
        root.replaceChildren();
        detailRoot.replaceChildren();
        location.assign("/staff/login");
      }
      throw error;
    }
    return value;
  }
  async function execute(fn, control) {
    if (busy) return;
    busy = true;
    const target = $(dialog.open ? "#service-dialog-feedback" : "#service-feedback");
    if (target.dataset.kind === "success") ui.message(target, "", { kind: "info" });
    const finish = ui.pending(control);
    try {
      await fn();
    } catch (error) {
      feedback(error.message || "Could not connect. Try again.");
      if (error.code === "order_changed") {
        await refresh().catch(() => {});
        if (selected && dialog.open) await openOrder(selected).catch(() => {});
        feedback(error.message);
      }
      if (error.code === "csrf_failed") {
        const s = await api("/api/auth/me").catch(() => null);
        if (s) csrf = s.csrf_token;
      }
    } finally {
      busy = false;
      finish();
    }
  }
  async function mutate(order, action, data = {}) {
    if (pending)
      throw new Error(
        "Resolve the interrupted request before making another change.",
      );
    pending = {
      id: Number(order.id || order.order_id),
      version: Number(order.version),
      action,
      request_key: crypto.randomUUID(),
      data,
    };
    await submitPending();
  }
  async function submitPending() {
    if (!pending) return;
    const action = pending.action;
    let result;
    try {
      result = await api("/api/service/orders/action", pending);
    } catch (error) {
      if (error.status) pending = null;
      else
        error.message =
          "Connection interrupted. Retry the same request to recover safely.";
      throw error;
    }
    pending = null;
    $("#service-feedback").hidden = true;
    $("#service-dialog-feedback").hidden = true;
    try {
      await refresh();
      if (mode === "server" && dialog.open)
        await openOrder(Number(result.order.id));
      else if (dialog.open) dialog.close();
    } catch {
      ui.message($(dialog.open ? "#service-dialog-feedback" : "#service-feedback"), "Change saved. The latest view could not load; refresh to see the updated details.", { kind: "info" });
      return;
    }
    const saved = {
      claim: "Order assigned to you.", add: "Dish added to the order.",
      edit: "Order line updated.", allergies: "Allergy notes saved.",
      fire: "Order sent to the kitchen.", start: "Preparation started.",
      item_ready: "Item marked ready.", item_prepare: "Item returned to preparation.", ready: "Ticket marked ready.",
      hold: "Ticket placed on hold.", resume: "Ticket resumed.",
      serve: "Order marked served.", close: "Service round closed. No payment was recorded.",
      round: "New service round started.", void: "Order voided.", recall: "Ticket recalled.",
    };
    ui.message($(dialog.open ? "#service-dialog-feedback" : "#service-feedback"), saved[action] || "Order updated.", { kind: "success" });
  }
  function show(title, content) {
    $("#service-dialog-title").textContent = title;
    detailRoot.replaceChildren(content);
    $("#service-dialog-feedback").hidden = true;
    if (!dialog.open) dialog.showModal();
  }
  function reason(order, action, label) {
    const form = el(
      "form",
      {},
      el(
        "label",
        {},
        "Reason",
        el("textarea", { name: "reason", required: "", maxlength: 255 }),
      ),
      el(
        "div",
        { class: "service-actions" },
        el("button", { type: "submit", class: "button" }, label),
        btn("Keep current state", () => dialog.close()),
      ),
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      execute(
        () =>
          mutate(order, action, { reason: new FormData(form).get("reason") }),
        form.querySelector("[type=submit]"),
      );
    });
    show(label, form);
  }
  async function openOrder(id) {
    const order = (await api("/api/service/order?id=" + id)).order;
    selected = Number(order.id);
    const panel = el(
      "section",
      {},
      el(
        "p",
        { class: "muted" },
        `${order.code} · ${order.tables.join(" + ")} · ${order.party_size} guests`,
      ),
      el("span", { class: "service-badge" }, order.status.replaceAll("_", " ")),
    );
    if (order.assigned_server_id === null && permitted("orders.write"))
      panel.append(btn("Claim order", () => mutate(order, "claim")));
    if (
      user.role === "server" &&
      Number(order.assigned_server_id) !== Number(user.id)
    ) {
      panel.append(
        el(
          "p",
          { class: "help" },
          "Claim this unassigned order before editing it.",
        ),
      );
      show("Order #" + order.id, panel);
      return;
    }
    const lines = el("ul", { class: "order-lines" });
    for (const item of order.items) {
      const line = el(
        "li",
        { class: "order-line " + (item.status === "void" ? "void" : "") },
        el(
          "div",
          {},
          el("strong", {}, `${item.qty} × ${item.item_name}`),
          el(
            "p",
            { class: "muted" },
            `${money(item.unit_price_cents)} each · ${item.station_snapshot} · Course ${item.course_no}`,
          ),
          item.notes ? el("p", {}, item.notes) : null,
        ),
        el(
          "strong",
          {},
          money(Number(item.qty) * Number(item.unit_price_cents)),
        ),
      );
      if (order.status === "open" && item.status !== "void") {
        const actions = el(
          "div",
          { class: "service-actions" },
          btn("Edit", () => editLine(order, item)),
          btn("Remove", () =>
            mutate(order, "edit", {
              item_id: Number(item.id),
              qty: 0,
              course_no: Number(item.course_no),
              notes: item.notes || "",
            }),
          ),
        );
        line.append(actions);
      }
      lines.append(line);
    }
    panel.append(
      lines,
      el(
        "p",
        { class: "order-total" },
        "Order total · " + money(order.total_cents),
      ),
    );
    if (order.status === "open") {
      const allergy = el(
        "form",
        { class: "order-form" },
        el(
          "label",
          { class: "wide" },
          "Confirmed allergy / dietary instructions",
          el(
            "textarea",
            { name: "allergy_notes", maxlength: 1000 },
            order.allergy_notes,
          ),
        ),
        el(
          "p",
          { class: "help wide" },
          "Confirm allergies with the guest before sending food. Menu tags are descriptions, not a guarantee that a dish is allergen-free.",
        ),
        el(
          "button",
          { type: "submit", class: "button ghost wide" },
          "Save allergy notes",
        ),
      );
      allergy.addEventListener("submit", (e) => {
        e.preventDefault();
        execute(
          () =>
            mutate(order, "allergies", {
              allergy_notes: new FormData(allergy).get("allergy_notes"),
            }),
          allergy.querySelector("button"),
        );
      });
      const form = lineForm(order);
      panel.append(
        allergy,
        form,
        btn("Send to kitchen", () => mutate(order, "fire"), {
          class: "button",
          disabled: !order.items.some((i) => i.status !== "void"),
        }),
      );
    } else if (order.ticket) {
      panel.append(
        el("p", { class: "help" }, "Kitchen ticket · " + order.ticket.status),
        order.ticket.allergy_snapshot
          ? el(
              "p",
              { class: "ticket-allergy" },
              "ALLERGY / DIETARY · " + order.ticket.allergy_snapshot,
            )
          : null,
        order.ticket.booking_notes
          ? el(
              "p",
              { class: "ticket-notes" },
              "Booking notes · " + order.ticket.booking_notes,
            )
          : null,
      );
      if (order.ticket.status === "ready" && order.status === "ready")
        panel.append(
          btn("Mark served", () => mutate(order, "serve"), { class: "button" }),
        );
      if (order.status === "served")
        panel.append(
          btn("Close service", () => mutate(order, "close"), {
            class: "button",
          }),
          el(
            "p",
            { class: "help" },
            "Closes this food round without recording or collecting payment. The host completes the reservation separately.",
          ),
        );
    }
    if (
      ["closed", "void"].includes(order.status) &&
      order.reservation_status === "seated"
    )
      panel.append(btn("Start another round", () => mutate(order, "round")));
    if (
      permitted("orders.void") &&
      !["closed", "void", "paid"].includes(order.status)
    )
      panel.append(
        btn("Void order", () => reason(order, "void", "Void order")),
      );
    if (order.events.length)
      panel.append(
        el(
          "details",
          {},
          el("summary", {}, "Order history"),
          el(
            "ol",
            { class: "service-history" },
            order.events.map((e) =>
              el(
                "li",
                {},
                `${e.created_at} · ${e.action} · ${e.actor}${e.reason ? " · " + e.reason : ""}`,
              ),
            ),
          ),
        ),
      );
    show("Order #" + order.id, panel);
  }
  function lineForm(order, item = null) {
    const form = el(
      "form",
      { class: "order-form" },
      item
        ? el("p", { class: "wide" }, item.item_name)
        : field("Dish", { name: "menu_item_id", required: "" }, [
            el("option", { value: "" }, "Choose a dish"),
            ...menu.map((m) =>
              el(
                "option",
                { value: m.id, disabled: !Number(m.is_available) },
                `${m.name} · ${money(m.price_cents)}${Number(m.is_available) ? "" : " · Unavailable"}`,
              ),
            ),
          ]),
      field("Quantity", {
        name: "qty",
        type: "number",
        min: 1,
        max: 30,
        value: item?.qty || 1,
        required: "",
      }),
      field("Course", { name: "course_no" }, [
        el("option", { value: 1 }, "Starter"),
        el("option", { value: 2 }, "Main"),
        el("option", { value: 3 }, "Dessert"),
      ]),
      el(
        "label",
        { class: "wide" },
        "Preparation notes",
        el("textarea", { name: "notes", maxlength: 255 }, item?.notes || ""),
      ),
      el(
        "button",
        { type: "submit", class: "button wide" },
        item ? "Save line" : "Add dish",
      ),
    );
    form.elements.course_no.value = item?.course_no || 2;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      for (const k of ["qty", "course_no", "menu_item_id"])
        if (k in d) d[k] = Number(d[k]);
      if (item) d.item_id = Number(item.id);
      execute(
        () => mutate(order, item ? "edit" : "add", d),
        form.querySelector("button"),
      );
    });
    return form;
  }
  function editLine(order, item) {
    show("Edit order line", lineForm(order, item));
  }
  function renderOrders(data) {
    const grid = el("div", { class: "service-grid" });
    for (const o of data.orders)
      grid.append(
        el(
          "article",
          { class: "order-card" },
          el("span", { class: "service-badge" }, o.status.replaceAll("_", " ")),
          el("h2", {}, o.tables || "Released tables"),
          el("p", {}, `${o.code} · ${o.party_size} guests`),
          el(
            "p",
            { class: "muted" },
            o.server_name
              ? "Server · " + o.server_name
              : "Unassigned · ready to claim",
          ),
          el("p", {}, money(o.total_cents)),
          btn("Open order #" + o.id, () => openOrder(Number(o.id)), {
            "data-order-id": o.id,
          }),
        ),
      );
    root.replaceChildren(
      data.orders.length
        ? grid
        : el(
            "section",
            { class: "empty-service" },
            el("p", { class: "eyebrow" }, "Ready for service"),
            el("h2", {}, "No orders for this date."),
            el(
              "p",
              { class: "help" },
              "A host seats a confirmed party to open its first order. Your assigned and unassigned orders appear here.",
            ),
          ),
    );
  }
  function ticketCard(t, station) {
    const order = { id: t.order_id, version: t.version };
    const card = el(
      "article",
      {
        class: "ticket " + (t.status === "held" ? "held" : ""),
        "data-fired": t.fired_epoch,
        "data-ticket": t.id,
      },
      el(
        "div",
        { class: "ticket-header" },
        el(
          "div",
          {},
          el("p", { class: "eyebrow" }, "Dine-in · #T-" + t.id),
          el("h2", {}, t.tables || "Released tables"),
          el("p", { class: "muted" }, `${t.party_size} guests · ${t.code}`),
        ),
        el("span", { class: "service-badge" }, t.status),
      ),
      el(
        "div",
        {
          class: "ticket-timer",
          "aria-label": "Elapsed since sent to kitchen",
        },
        "00:00",
      ),
      el("p", { class: "ticket-age" }, "ON TIME"),
    );
    const lines = el("ul", { class: "ticket-lines" });
    for (const i of t.items) {
      const line = el(
        "li",
        {
          class:
            (i.status === "ready" ? "ready " : "") +
            (station === i.station_snapshot ? "station-match" : ""),
        },
        el("strong", {}, `${i.qty} × ${i.item_name}`),
        el(
          "small",
          {},
          `${i.station_snapshot.toUpperCase()} · Course ${i.course_no} · ${i.status}`,
        ),
        i.notes ? el("p", {}, i.notes) : null,
      );
      let tags = [];
      try {
        tags = JSON.parse(i.tags_snapshot || "[]");
      } catch {}
      if (Array.isArray(tags) && tags.length)
        line.append(el("small", {}, "Menu tags · " + tags.join(", ")));
      if (t.status === "preparing")
        line.append(
          btn(i.status === "ready" ? "Needs preparation" : "Item ready", () =>
            mutate(
              order,
              i.status === "ready" ? "item_prepare" : "item_ready",
              { item_id: Number(i.id) },
            ),
          ),
        );
      lines.append(line);
    }
    card.append(lines);
    if (t.allergy_snapshot)
      card.append(
        el(
          "div",
          { class: "ticket-allergy" },
          "ALLERGY / DIETARY\n" + t.allergy_snapshot,
        ),
      );
    if (t.booking_notes)
      card.append(
        el("p", { class: "ticket-notes" }, "BOOKING NOTES\n" + t.booking_notes),
      );
    card.append(
      el(
        "p",
        { class: "muted" },
        "Server · " + (t.server_name || "Unassigned"),
      ),
    );
    if (t.status === "queued")
      card.append(
        btn("Start preparation", () => mutate(order, "start"), {
          class: "button primary-action",
        }),
      );
    if (t.status === "preparing")
      card.append(
        btn("Mark entire ticket ready", () => mutate(order, "ready"), {
          class: "button primary-action",
        }),
      );
    if (t.status === "ready")
      card.append(
        el(
          "p",
          { class: "help" },
          "Ready for pickup · server confirms delivery.",
        ),
      );
    if (t.status === "held")
      card.append(
        btn("Resume ticket", () => reason(order, "resume", "Resume ticket"), {
          class: "button primary-action",
        }),
      );
    else
      card.append(
        btn("Hold ticket", () => reason(order, "hold", "Hold ticket")),
      );
    return card;
  }
  function renderKitchen(data) {
    const grid = el("div", { class: "ticket-grid" });
    for (const t of data.tickets)
      grid.append(ticketCard(t, filters.elements.station.value));
    const counts = el(
      "section",
      { class: "service-panel" },
      el("h2", {}, "All-day prep"),
      el("p", { class: "help" }, "Outstanding quantities in this view."),
      el(
        "ul",
        {},
        Object.entries(data.all_day).map(([label, qty]) =>
          el("li", {}, el("strong", {}, qty + " × "), label),
        ),
      ),
    );
    const recall = el(
      "section",
      { class: "service-panel" },
      el("h2", {}, "Recent served"),
      el(
        "p",
        { class: "help" },
        "Last 20 tickets. Closed rounds cannot be recalled.",
      ),
    );
    for (const t of data.recall)
      recall.append(
        el("p", {}, `#T-${t.id} · ${t.tables || t.code}`),
        btn(
          "Recall #T-" + t.id,
          () =>
            reason(
              { id: t.order_id, version: t.version },
              "recall",
              "Recall ticket",
            ),
          { class: "button ghost recall-button", disabled: !t.can_recall },
        ),
      );
    root.replaceChildren(
      el(
        "div",
        { class: "kitchen-layout" },
        data.tickets.length
          ? grid
          : el(
              "section",
              { class: "empty-service" },
              el("h2", {}, "The pass is clear."),
              el(
                "p",
                { class: "help" },
                "Sent orders appear here automatically. Change the date or station if needed.",
              ),
            ),
        el("aside", { class: "kitchen-rail" }, counts, recall),
      ),
    );
    updateTimers();
  }
  function updateTimers() {
    const now = clockEpoch + (performance.now() - clockAt) / 1000;
    for (const card of document.querySelectorAll("[data-fired]")) {
      const age = Math.max(0, Math.floor(now - Number(card.dataset.fired))),
        level =
          age >= 900
            ? "critical"
            : age >= 600
              ? "late"
              : age >= 300
                ? "working"
                : "on-time";
      card.querySelector(".ticket-timer").textContent =
        String(Math.floor(age / 60)).padStart(2, "0") +
        ":" +
        String(age % 60).padStart(2, "0");
      card.querySelector(".ticket-age").textContent = level
        .toUpperCase()
        .replace("-", " ");
      for (const value of ["critical", "late", "working", "on-time"])
        card.classList.toggle("age-" + value, value === level);
    }
  }
  async function refresh() {
    if (pollBusy) return;
    pollBusy = true;
    try {
      const date = filters.elements.date.value;
      const data = await api(
        mode === "kitchen"
          ? `/api/kitchen/tickets?date=${date}&station=${filters.elements.station.value}`
          : `/api/service/orders?date=${date}`,
      );
      clockEpoch = Number(data.server_time_epoch);
      clockAt = performance.now();
      if (mode === "kitchen") renderKitchen(data);
      else renderOrders(data);
      $("#service-sync").textContent =
        `Live service · Asia/Manila · refreshed ${new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(clockEpoch * 1000))}${mode === "kitchen" ? " · Ticket actions apply to all stations" : ""}`;
    } finally {
      pollBusy = false;
    }
  }
  $("#service-dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    // Async actions disable/recreate the opener, so native restoration can lose it.
    const target = dialogOpener?.isConnected
      ? dialogOpener
      : root.querySelector(`[data-order-id="${selected}"]`) || $("#service-main");
    target.focus();
  });
  $("#service-logout").addEventListener("click", () =>
    execute(async () => {
      await api("/api/auth/logout", {});
      root.replaceChildren();
      detailRoot.replaceChildren();
      location.assign("/staff/login");
    }, $("#service-logout")),
  );
  filters.addEventListener("submit", (e) => {
    e.preventDefault();
    execute(refresh, filters.querySelector("button"));
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
  async function init() {
    const session = await api("/api/auth/me");
    csrf = session.csrf_token;
    user = session.user;
    if (!user) {
      location.assign("/staff/login");
      return;
    }
    $("#service-user").textContent = user.full_name + " · " + user.role;
    $("#service-heading").textContent =
      mode === "kitchen" ? "The kitchen pass." : "Food orders.";
    for (const [permission, path, label] of [
      ["reservations.read", "/admin", "Host dashboard"],
      ["orders.read", "/server", "Food orders"],
      ["kitchen.read", "/kitchen", "Kitchen tickets"],
    ])
      if (permitted(permission))
        $("#service-nav").append(
          el(
            "a",
            {
              href: path,
              "aria-current": path === location.pathname ? "page" : null,
            },
            label,
          ),
        );
    filters.elements.date.value = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(session.server_time_epoch * 1000));
    $("#station-field").hidden = mode !== "kitchen";
    if (mode === "server") menu = (await api("/api/service/menu")).menu;
    await refresh();
    setInterval(
      () => {
        if (
          document.hidden ||
          dialog.open ||
          busy ||
          pending ||
          document.activeElement.matches("input,select,textarea") ||
          document.activeElement.closest(".ticket,.order-card")
        )
          return;
        refresh().catch((e) => {
          $("#service-sync").textContent =
            "Connection lost · showing last received data";
          feedback(e.message);
        });
      },
      mode === "kitchen" ? 2000 : 6000,
    );
    setInterval(updateTimers, 1000);
  }
  const finishBoot = ui.loading(root, "Loading service workspace…");
  init().catch((e) => feedback(e.message)).finally(finishBoot);
})();
