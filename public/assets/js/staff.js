"use strict";
(() => {
  const $ = (s) => document.querySelector(s),
    workspace = $("#staff-workspace"),
    dialog = $("#staff-dialog"),
    content = $("#staff-dialog-content");
  const view = document.body.dataset.view;
  let csrf,
    user,
    catalog,
    tab = "service",
    page = 1,
    filters = {},
    config,
    dashboard,
    serial = 0,
    inviteToken,
    serverEpoch,
    serverStarted;
  const allowed = (permission) => user?.permissions.includes(permission);
  function node(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith("on"))
        el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== null && value !== undefined)
        el.setAttribute(key, String(value));
    }
    for (const child of children.flat())
      if (child !== undefined && child !== null)
        el.append(child instanceof Node ? child : String(child));
    return el;
  }
  const button = (text, fn, cls = "button") =>
    node("button", { type: "button", class: cls, onclick: fn }, text);
  const note = (text) => node("p", { class: "form-note" }, text);
  const money = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(Number(value) / 100);
  const dateTime = (value) =>
    value
      ? new Intl.DateTimeFormat("en-PH", {
          timeZone: "Asia/Manila",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(value.replace(" ", "T") + "+08:00"))
      : "—";
  function field(label, attrs, ...children) {
    const id = "staff-field-" + ++serial,
      tag = attrs.tag || "input";
    const input = node(
      tag,
      Object.fromEntries(
        Object.entries(attrs).filter(([key]) => key !== "tag"),
      ),
      ...children.flat(),
    );
    input.setAttribute("aria-labelledby", id);
    return node(
      "label",
      { class: "field" + (attrs.wide ? " wide" : "") },
      node("span", { id }, label),
      input,
    );
  }
  function feedback(text = "", success = false, inDialog = dialog.open) {
    const target = $(inDialog ? "#dialog-feedback" : "#staff-feedback");
    target.textContent = text;
    target.hidden = !text;
    target.classList.toggle("success", success);
    if (text) target.focus();
  }
  async function api(path, body) {
    let response;
    try {
      response = await fetch(path, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers:
          body === undefined
            ? {}
            : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw Object.assign(
        new Error("Connection interrupted. Please try again."),
        { code: "network" },
      );
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("The server could not respond. Please try again.");
    }
    if (!response.ok || !data.ok)
      throw Object.assign(
        new Error(data.error?.message || "Please try again."),
        { code: data.error?.code, status: response.status },
      );
    return data;
  }
  async function busy(control, work) {
    if (control.disabled) return;
    control.disabled = true;
    try {
      await work();
    } catch (error) {
      if (error.status === 401 && view === "admin") {
        workspace.replaceChildren();
        content.replaceChildren();
        location.assign("/staff/login");
        return;
      }
      feedback(error.message);
      if (error.code === "csrf_failed") {
        try {
          const session = await api("/api/auth/me");
          csrf = session.csrf_token;
          if (!session.user && view === "admin")
            location.assign("/staff/login");
        } catch {}
      }
      if (error.code === "booking_changed" && view === "admin") {
        try {
          dialog.close();
          await refreshDashboard();
          feedback(error.message, false, false);
        } catch {}
      }
      if (error.code === "settings_changed") {
        try {
          await renderSettings();
          feedback(error.message, false, false);
        } catch {}
      }
    } finally {
      if (control.isConnected) control.disabled = false;
    }
  }
  function openDialog(title, ...children) {
    $("#staff-dialog-title").textContent = title;
    content.replaceChildren(...children);
    $("#dialog-feedback").hidden = true;
    if (!dialog.open) dialog.showModal();
  }
  $("#staff-close-dialog").addEventListener("click", () => dialog.close());
  $("#staff-logout").addEventListener("click", () =>
    busy($("#staff-logout"), async () => {
      await api("/api/auth/logout", {});
      workspace.replaceChildren();
      content.replaceChildren();
      location.assign("/staff/login");
    }),
  );
  function welcome(activeUser) {
    workspace.replaceChildren(
      node(
        "section",
        { class: "auth-card" },
        node("p", { class: "eyebrow" }, "Account active"),
        node("h1", {}, "Welcome, " + activeUser.full_name),
        node(
          "p",
          {},
          `Your ${activeUser.role} account is active. Its dedicated workspace is not available yet.`,
        ),
        node("a", { href: "/", class: "button ghost" }, "Return to guest site"),
      ),
    );
    $("#staff-user").textContent =
      activeUser.full_name + " · " + activeUser.role;
    $("#staff-logout").hidden = false;
  }
  function authenticated(activeUser) {
    if (activeUser.permissions.includes("reservations.read"))
      location.assign("/admin");
    else if (activeUser.permissions.includes("orders.read"))
      location.assign("/server");
    else if (activeUser.permissions.includes("kitchen.read"))
      location.assign("/kitchen");
    else welcome(activeUser);
  }
  if (view === "activate" && location.hash) {
    const params = new URLSearchParams(location.hash.slice(1));
    inviteToken = params.get("token");
    history.replaceState(null, "", "/staff/activate");
  }
  function renderAuth() {
    const card = node(
      "section",
      { class: "auth-card" },
      node("p", { class: "eyebrow" }, "Lumina staff"),
      node(
        "h1",
        {},
        view === "activate" ? "Choose your password." : "Welcome back.",
      ),
      node(
        "p",
        {},
        view === "activate"
          ? "Activate your staff account with a unique passphrase. This link works once and expires after 24 hours."
          : "Sign in to your staff workspace. Guest reservations do not require an account.",
      ),
    );
    const form = node("form");
    if (view === "activate") {
      if (!/^[a-f0-9]{64}$/.test(inviteToken || ""))
        form.append(
          field("Private activation link", {
            name: "activation_link",
            type: "password",
            required: "",
            autocomplete: "off",
            placeholder: "Paste your activation link",
          }),
        );
      form.append(
        field("New password", {
          name: "password",
          type: "password",
          required: "",
          autocomplete: "new-password",
          minlength: 15,
          maxlength: 72,
        }),
        field("Confirm new password", {
          name: "password_confirmation",
          type: "password",
          required: "",
          autocomplete: "new-password",
          minlength: 15,
          maxlength: 72,
        }),
        note(
          "Use 15–72 bytes. A long phrase is easier to remember; spaces are allowed.",
        ),
      );
    } else
      form.append(
        field("Staff email", {
          name: "email",
          type: "email",
          required: "",
          autocomplete: "username",
          maxlength: 190,
        }),
        field("Password", {
          name: "password",
          type: "password",
          required: "",
          autocomplete: "current-password",
          maxlength: 72,
        }),
      );
    const submit = node(
      "button",
      { type: "submit", class: "button full" },
      view === "activate" ? "Activate account" : "Sign in",
    );
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        const data = Object.fromEntries(new FormData(form));
        if (view === "activate") {
          if (!inviteToken) {
            const url = new URL(data.activation_link, location.origin);
            if (
              url.origin !== location.origin ||
              url.pathname !== "/staff/activate"
            )
              throw new Error(
                "Use the private activation link supplied by your administrator.",
              );
            inviteToken = new URLSearchParams(url.hash.slice(1)).get("token");
          }
          const result = await api("/api/auth/activate", {
            token: inviteToken,
            password: data.password,
            password_confirmation: data.password_confirmation,
          });
          authenticated(result.user);
        } else {
          const result = await api("/api/auth/login", data);
          authenticated(result.user);
        }
      });
    });
    card.append(
      form,
      note(
        "Need access or a new activation link? Contact your administrator. No public staff registration is available.",
      ),
    );
    workspace.replaceChildren(card);
  }
  function title(heading, description, ...actions) {
    return node(
      "header",
      { class: "staff-title" },
      node(
        "div",
        {},
        node("p", { class: "eyebrow" }, "Lumina operations"),
        node("h1", {}, heading),
        note(description),
      ),
      node("div", { class: "actions" }, ...actions),
    );
  }
  function badge(row) {
    const label =
      row.status === "pending"
        ? "Pending approval"
        : row.status === "no_show"
          ? "No-show"
          : row.status === "waitlisted"
            ? row.waitlist_offer_state === "offered"
              ? "Offer held"
              : row.waitlist_offer_state === "expired"
                ? "Offer expired"
                : "Waiting"
            : row.status[0].toUpperCase() + row.status.slice(1);
    return node("span", { class: "status " + row.status }, label);
  }
  function table(headers, rows) {
    return node(
      "div",
      { class: "staff-table-wrap" },
      node(
        "table",
        { class: "staff-table" },
        node(
          "thead",
          {},
          node(
            "tr",
            {},
            headers.map((text) => node("th", { scope: "col" }, text)),
          ),
        ),
        node(
          "tbody",
          {},
          rows.length
            ? rows
            : node(
                "tr",
                {},
                node(
                  "td",
                  { colspan: headers.length, class: "empty-row" },
                  "No records match this view.",
                ),
              ),
        ),
      ),
    );
  }
  function renderService() {
    workspace.replaceChildren(
      title(
        tab === "waitlist" ? "The waitlist." : "Service overview.",
        "Manage the evening with current reservations and table inventory.",
        button(tab === "waitlist" ? "Add to waitlist" : "New reservation", () =>
          openBooking(tab === "waitlist"),
        ),
        ...(tab === "waitlist"
          ? [
              button(
                "Recheck available tables",
                () =>
                  busy(
                    document.querySelector("#recheck-waitlist"),
                    async () => {
                      const result = await api("/api/admin/waitlist/promote", {
                        date: filters.date,
                      });
                      await refreshDashboard();
                      feedback(
                        result.offered.length
                          ? `Created ${result.offered.length} real table offer(s). Notifications are simulated.`
                          : "No new offers fit the current inventory or booking rules.",
                        true,
                        false,
                      );
                    },
                  ),
                "button ghost",
              ),
            ]
          : []),
      ),
    );
    if (tab === "waitlist")
      workspace.querySelector(".staff-title .actions .ghost").id =
        "recheck-waitlist";
    const toolbar = node(
      "form",
      { class: "staff-toolbar" },
      field("Service date", {
        type: "date",
        name: "date",
        value: filters.date,
        required: "",
      }),
      ...(tab === "service"
        ? [
            field(
              "Status",
              { tag: "select", name: "status" },
              [
                "all",
                "pending",
                "confirmed",
                "seated",
                "completed",
                "cancelled",
                "no_show",
              ].map((value) =>
                node("option", { value }, value.replace("_", " ")),
              ),
            ),
          ]
        : []),
      field("Guest, phone, or reference", {
        name: "q",
        value: filters.q || "",
        maxlength: 100,
      }),
    );
    toolbar
      .querySelector("[name=q]")
      .parentElement.classList.add("search-field");
    if (toolbar.elements.status)
      toolbar.elements.status.value = filters.status || "all";
    const refresh = node(
      "button",
      { class: "button ghost", type: "submit" },
      "Refresh",
    );
    toolbar.append(refresh);
    toolbar.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(refresh, async () => {
        filters = { ...filters, ...Object.fromEntries(new FormData(toolbar)) };
        page = 1;
        await refreshDashboard();
      });
    });
    workspace.append(
      toolbar,
      node("div", { id: "staff-stats", class: "staff-stats" }),
    );
    if (tab === "service")
      workspace.append(
        node(
          "section",
          { class: "staff-panel" },
          node("h2", {}, "The floor"),
          node("div", { id: "staff-floor" }),
          node(
            "div",
            { class: "staff-floor-legend" },
            ...["Free", "Reserved", "Seated", "Held", "Blocked / reset"].map(
              (text) => node("span", {}, text),
            ),
          ),
          note(
            "Shows physical table status at the selected time. Online availability also checks party size, notice, and pacing.",
          ),
        ),
      );
    workspace.append(
      node(
        "section",
        { class: "staff-panel" },
        node("h2", {}, tab === "waitlist" ? "Waiting parties" : "Reservations"),
        node("div", { id: "staff-rows" }),
        node("div", { id: "staff-pagination", class: "staff-pagination" }),
      ),
      note(
        "Refreshes every eight seconds while this view is idle and visible.",
      ),
    );
    return refreshDashboard();
  }
  async function refreshDashboard() {
    const data = await api(
      "/api/admin/dashboard?" +
        new URLSearchParams({
          ...filters,
          status: tab === "waitlist" ? "waitlisted" : filters.status || "all",
          page,
        }),
    );
    dashboard = data;
    serverEpoch = data.server_time_epoch;
    serverStarted = performance.now();
    $("#staff-stats")?.replaceChildren(
      ...[
        ["Reservations", data.stats.total],
        ["Seated now", data.stats.seated || 0],
        ["Covers served", data.stats.covers],
        [
          "Pending / waiting",
          `${data.stats.pending || 0} / ${data.stats.waitlisted || 0}`,
        ],
      ].map(([label, value]) =>
        node(
          "div",
          { class: "stat-card" },
          node("p", {}, label),
          node("b", {}, value),
        ),
      ),
    );
    $("#staff-rows")?.replaceChildren(
      table(
        [
          "Time / reference",
          "Guest",
          "Room / tables",
          "Party",
          "Status",
          "Action",
        ],
        data.rows.map((row) =>
          node(
            "tr",
            {},
            node(
              "td",
              {},
              row.starts_at.slice(11, 16),
              node("small", { class: "table-reference" }, row.code),
            ),
            node("td", {}, row.full_name, node("small", {}, row.phone)),
            node(
              "td",
              {},
              row.room,
              node("small", {}, row.tables || "Unassigned"),
            ),
            node("td", {}, row.party_size),
            node(
              "td",
              {},
              badge(row),
              ...(row.status === "waitlisted"
                ? [
                    node("small", {}, `Rank ${row.waitlist_rank}`),
                    node(
                      "small",
                      {},
                      row.waitlist_offer_expires_at
                        ? "Offer until " +
                            dateTime(row.waitlist_offer_expires_at)
                        : "No table held",
                    ),
                  ]
                : []),
            ),
            node(
              "td",
              {},
              button(
                "Open " + row.code,
                () => openDetail(row.code),
                "button ghost small",
              ),
            ),
          ),
        ),
      ),
    );
    const prev = button(
        "Previous",
        () => {
          page--;
          refreshDashboard().catch((error) => feedback(error.message));
        },
        "button ghost small",
      ),
      next = button(
        "Next",
        () => {
          page++;
          refreshDashboard().catch((error) => feedback(error.message));
        },
        "button ghost small",
      );
    prev.disabled = page <= 1;
    next.disabled = page >= data.pages;
    $("#staff-pagination")?.replaceChildren(
      prev,
      `Page ${page} of ${data.pages} · ${data.count} results`,
      next,
    );
    if ($("#staff-floor")) renderFloor(data);
  }
  function renderFloor(data) {
    const ns = "http://www.w3.org/2000/svg",
      svgNode = (tag, attrs, text) => {
        const el = document.createElementNS(ns, tag);
        for (const [key, value] of Object.entries(attrs))
          el.setAttribute(key, value);
        if (text) el.textContent = text;
        return el;
      };
    const svg = svgNode("svg", {
      class: "floor staff-floor",
      viewBox: "20 15 965 685",
      role: "group",
      "aria-label": `Floor status ${data.date} at ${data.time} Manila`,
    });
    for (const room of catalog.rooms) {
      svg.append(
        svgNode("rect", {
          x: room.floor_x,
          y: room.floor_y,
          width: room.floor_w,
          height: room.floor_h,
          rx: 8,
          class: "floor-room",
        }),
        svgNode(
          "text",
          {
            x: Number(room.floor_x) + 12,
            y: Number(room.floor_y) + 24,
            class: "floor-label",
          },
          room.name,
        ),
      );
    }
    for (const item of catalog.tables) {
      const occupied = data.floor
          .filter((row) => Number(row.table_id) === Number(item.id))
          .at(-1),
        held = data.holds.some(
          (row) => Number(row.table_id) === Number(item.id),
        );
      const room = catalog.rooms.find(
          (room) => Number(room.id) === Number(item.room_id),
        ),
        at = data.date + " " + data.time + ":00";
      const blocked = data.blackouts.some(
        (row) =>
          Number(row.blocks_booking) &&
          row.starts_at <= at &&
          row.ends_at > at &&
          (row.scope === "venue" ||
            (row.scope === "table" &&
              Number(row.scope_id) === Number(item.id)) ||
            (row.scope === "room" &&
              Number(row.scope_id) === Number(room.id)) ||
            (row.scope === "room_type" &&
              Number(row.scope_id) === Number(room.room_type_id))),
      );
      const state = occupied
        ? occupied.status === "seated"
          ? "seated"
          : "reserved"
        : blocked
          ? "blocked"
          : held
            ? "held"
            : "free";
      const attrs =
        item.shape === "round"
          ? { cx: item.pos_x, cy: item.pos_y, r: item.radius }
          : {
              x: item.pos_x,
              y: item.pos_y,
              width: item.pos_w,
              height: item.pos_h,
              rx: 7,
            };
      const shape = svgNode(item.shape === "round" ? "circle" : "rect", {
        ...attrs,
        class: "floor-table " + state,
      });
      if (occupied) {
        shape.setAttribute("role", "button");
        shape.setAttribute("tabindex", "0");
        shape.setAttribute(
          "aria-label",
          `${item.code}, ${state}, ${occupied.code}, ${occupied.full_name}`,
        );
        shape.addEventListener("click", () => openDetail(occupied.code));
        shape.addEventListener("keydown", (event) => {
          if (["Enter", " "].includes(event.key)) {
            event.preventDefault();
            openDetail(occupied.code);
          }
        });
      }
      shape.append(
        svgNode(
          "title",
          {},
          `${item.code} · ${state}${occupied ? " · " + occupied.code : ""}`,
        ),
      );
      svg.append(shape);
      const x =
          item.shape === "round"
            ? item.pos_x
            : Number(item.pos_x) + Number(item.pos_w) / 2,
        y =
          item.shape === "round"
            ? Number(item.pos_y) + 6
            : Number(item.pos_y) + Number(item.pos_h) / 2 + 6;
      svg.append(
        svgNode(
          "text",
          { x, y, "text-anchor": "middle", class: "floor-code" },
          item.code,
        ),
      );
    }
    const timeForm = node(
      "form",
      { class: "staff-toolbar" },
      field("Floor time · Manila", {
        type: "time",
        name: "time",
        value: data.time,
        required: "",
      }),
    );
    const apply = node(
      "button",
      { type: "submit", class: "button ghost small" },
      "Show time",
    );
    timeForm.append(apply);
    timeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(apply, async () => {
        filters.time = timeForm.elements.time.value;
        await refreshDashboard();
      });
    });
    $("#staff-floor").replaceChildren(
      timeForm,
      note(`Physical status at ${data.date}, ${data.time} (Manila).`),
      svg,
    );
  }
  async function openDetail(code) {
    try {
      const data = await api(
          "/api/admin/reservation?" + new URLSearchParams({ code }),
        ),
        booking = data.booking;
      const active = booking.tables.filter(
          (table) => table.released_at === null,
        ),
        info = node(
          "div",
          {},
          badge(booking),
          node("p", { class: "booking-code" }, booking.code),
          node(
            "dl",
            { class: "summary" },
            ...Object.entries({
              "Date & time": dateTime(booking.starts_at),
              Guests: booking.party_size,
              Room:
                catalog.room_types.find(
                  (room) => room.code === booking.room_code,
                )?.name || booking.room_code,
              Tables:
                active.map((table) => table.code).join(" + ") || "Unassigned",
              Source: booking.source,
            }).map(([label, value]) =>
              node("div", {}, node("dt", {}, label), node("dd", {}, value)),
            ),
          ),
        );
      const contact = node(
        "div",
        {},
        node("h3", {}, booking.guest.full_name),
        node(
          "p",
          {},
          booking.guest.phone,
          node("br"),
          booking.guest.email || "No email supplied",
        ),
        node("h3", {}, "Special requests"),
        node("p", {}, booking.special_requests || "None supplied"),
      );
      const actions = [];
      if (["pending", "confirmed"].includes(booking.status))
        actions.push(
          button(
            "Edit reservation",
            () => openBooking(false, booking),
            "button ghost",
          ),
        );
      if (booking.status === "pending" && allowed("reservations.approve"))
        actions.push(
          button("Approve request", () => confirmAction(booking, "approve")),
          button(
            "Decline request",
            () => confirmAction(booking, "reject"),
            "button danger",
          ),
        );
      if (booking.status === "confirmed") {
        const start =
          Date.parse(booking.starts_at.replace(" ", "T") + "+08:00") / 1000;
        const end =
          Date.parse(booking.ends_at.replace(" ", "T") + "+08:00") / 1000;
        const now = Number(data.server_time_epoch),
          seat = button("Seat party", () => confirmAction(booking, "seat"));
        const noShow = button(
          "Mark no-show",
          () => confirmAction(booking, "no_show"),
          "button ghost",
        );
        seat.disabled = now < start - 1800 || now >= end;
        noShow.disabled = now < start + Number(data.no_show_grace_min) * 60;
        seat.title = seat.disabled
          ? "Seating is available from 30 minutes before start until the dining interval ends."
          : "Seat this party";
        noShow.title = noShow.disabled
          ? "Available after the no-show grace period."
          : "Mark the absent party as a no-show";
        actions.push(seat, noShow);
      }
      if (booking.status === "seated")
        actions.push(
          button("Complete visit", () => confirmAction(booking, "complete")),
        );
      if (
        booking.status === "waitlisted" &&
        booking.waitlist_offer_state === "offered"
      )
        actions.push(
          button("Accept held offer", () =>
            confirmAction(booking, "accept_offer"),
          ),
        );
      if (["pending", "confirmed", "waitlisted"].includes(booking.status))
        actions.push(
          button(
            "Cancel reservation",
            () => confirmAction(booking, "cancel"),
            "button danger",
          ),
        );
      const history = node(
        "ul",
        { class: "staff-history" },
        booking.history.map((row) =>
          node(
            "li",
            {},
            node("b", {}, `${row.from_status || "New"} → ${row.to_status}`),
            node(
              "small",
              {},
              dateTime(row.changed_at) +
                " · " +
                (row.actor || "Guest / system"),
            ),
            row.reason || "",
          ),
        ),
      );
      openDialog(
        "Reservation details",
        node("div", { class: "staff-detail-columns" }, info, contact),
        node("div", { class: "dialog-actions" }, ...actions),
        note(
          "Seating opens an order record. Complete closes an empty order and preserves the table reset buffer. No-show is available after the grace period.",
        ),
        node("h3", {}, "Status history"),
        history,
        ...(booking.orders.length
          ? [
              node("h3", {}, "Orders"),
              ...booking.orders.map((order) =>
                note(
                  `Order #${order.id} · ${order.status} · opened ${dateTime(order.opened_at)}`,
                ),
              ),
            ]
          : []),
      );
    } catch (error) {
      feedback(error.message);
    }
  }
  function confirmAction(booking, action) {
    const labels = {
      approve: "Approve request",
      reject: "Decline request",
      seat: "Seat party",
      complete: "Complete visit",
      cancel: "Cancel reservation",
      no_show: "Mark no-show",
      accept_offer: "Accept held offer",
    };
    const reasons = {
      approve: "Manager reviewed the request",
      reject: "Manager declined the request",
      seat: "Guest arrived for service",
      complete: "Party finished their visit",
      cancel: "Guest requested cancellation",
      no_show: "Guest absent after the grace period",
      accept_offer: "Guest accepted the held offer",
    };
    const form = node(
      "form",
      { class: "staff-form" },
      note(
        `${booking.code} · ${dateTime(booking.starts_at)} · ${booking.party_size} guests. This changes the saved booking.`,
      ),
      field("Reason for the audit record", {
        name: "reason",
        value: reasons[action],
        required: "",
        minlength: 3,
        maxlength: 255,
      }),
    );
    const submit = node(
      "button",
      {
        type: "submit",
        class:
          action === "cancel" || action === "reject"
            ? "button danger"
            : "button",
      },
      "Confirm " + labels[action].toLowerCase(),
    );
    form.append(
      node(
        "div",
        { class: "actions" },
        button(
          "Keep current booking",
          () => openDetail(booking.code),
          "button ghost",
        ),
        submit,
      ),
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        const result = await api("/api/admin/reservations/status", {
          code: booking.code,
          version: Number(booking.version),
          action,
          reason: form.elements.reason.value,
        });
        dialog.close();
        await refreshDashboard();
        feedback(
          `${booking.code} updated.${result.offered?.length ? " Created " + result.offered.length + " waitlist offer(s)." : ""}`,
          true,
          false,
        );
      });
    });
    openDialog(labels[action] + "?", form);
  }
  function openBooking(waitlist = false, booking = null) {
    const form = node("form", { class: "staff-form staff-new-booking" }),
      room = field(
        "Room",
        { tag: "select", name: "room_type" },
        catalog.room_types.map((room) =>
          node("option", { value: room.code }, room.name),
        ),
      ),
      party = field("Guests", {
        type: "number",
        name: "party_size",
        min: 1,
        max: 16,
        value: booking?.party_size || 2,
        required: "",
      }),
      date = field("Date · Manila", {
        type: "date",
        name: "date",
        min: catalog.today,
        max: catalog.max_date,
        value: booking?.starts_at.slice(0, 10) || filters.date,
        required: "",
      }),
      source = field(
        "Booking source",
        { tag: "select", name: "source" },
        node("option", { value: "phone" }, "Phone booking"),
        node("option", { value: "walk_in" }, "Walk-in"),
      );
    form.append(
      node("div", { class: "staff-form-grid" }, party, date, room, source),
    );
    form.elements.room_type.value = booking?.room_code || "common";
    form.elements.source.value =
      booking?.source === "walk_in" ? "walk_in" : "phone";
    if (booking) form.elements.source.disabled = true;
    const results = node("div");
    let picked,
      selectedTime,
      requestKey = crypto.randomUUID();
    if (waitlist)
      form.append(
        field("Requested time", {
          name: "time",
          type: "time",
          value: "17:30",
          required: "",
          step: 900,
        }),
        note(
          "Adding to the queue does not hold a table. Offers are made only after inventory fits, with a ten-minute claim window.",
        ),
      );
    else {
      const find = button(
        "Find available tables",
        () =>
          busy(find, async () => {
            results.replaceChildren(note("Checking current inventory…"));
            picked = null;
            const query = {
              date: form.elements.date.value,
              party_size: Number(form.elements.party_size.value),
              room_type: form.elements.room_type.value,
              source: form.elements.source.value,
              ...(booking ? { code: booking.code } : {}),
            };
            const data = await api(
              "/api/admin/availability?" + new URLSearchParams(query),
            );
            results.replaceChildren();
            if (!data.availability.slots.length) {
              results.append(
                note(
                  "No eligible tables. Try another time/date/room, or add a waitlist request.",
                ),
              );
              return;
            }
            const slots = node("div", { class: "time-slots" }),
              options = node("div", { class: "options" }),
              summary = node("p", { class: "selection-note" });
            function selectSlot(slot) {
              selectedTime = slot.time;
              picked = slot.options[0];
              for (const control of slots.children)
                control.setAttribute(
                  "aria-pressed",
                  String(control.dataset.time === slot.time),
                );
              options.replaceChildren(
                ...slot.options.map((option) =>
                  node(
                    "label",
                    { class: "table-option" },
                    node("input", {
                      type: "radio",
                      name: "staff-table-option",
                      value: `${option.kind}:${option.id}`,
                      onchange: () => {
                        picked = option;
                        showPicked();
                      },
                    }),
                    node(
                      "span",
                      {},
                      option.label,
                      node(
                        "small",
                        {},
                        catalog.room_types.find(
                          (room) => room.code === option.room_type,
                        ).name,
                      ),
                    ),
                  ),
                ),
              );
              showPicked();
            }
            function showPicked() {
              for (const radio of options.querySelectorAll("input"))
                radio.checked = radio.value === `${picked.kind}:${picked.id}`;
              summary.textContent = `${picked.label} · ${picked.turn_time_min} min · ${Number(picked.min_spend_cents) ? money(picked.min_spend_cents) + " minimum spend" : "No minimum spend"}${picked.approval_required ? " · Manager approval required" : ""}`;
            }
            for (const slot of data.availability.slots)
              slots.append(
                node(
                  "button",
                  {
                    type: "button",
                    class: "slot",
                    "data-time": slot.time,
                    "aria-pressed": "false",
                    onclick: () => selectSlot(slot),
                  },
                  slot.time,
                ),
              );
            results.append(
              slots,
              node("div", { class: "table-picker" }, options),
              summary,
            );
            selectSlot(
              data.availability.slots.find(
                (slot) =>
                  slot.time === (booking?.starts_at.slice(11, 16) || "19:00"),
              ) || data.availability.slots[0],
            );
          }),
        "button ghost",
      );
      form.append(
        find,
        results,
        note(
          "Walk-ins in Main Dining/Terrace may use the next slot without the online lead time. Room notice, opening hours, pacing, and inventory still apply.",
        ),
      );
      for (const control of form.querySelectorAll(
        "[name=date],[name=party_size],[name=room_type],[name=source]",
      ))
        control.addEventListener("change", () => {
          picked = null;
          results.replaceChildren();
        });
    }
    if (!booking)
      form.append(
        node(
          "div",
          { class: "staff-form-grid" },
          field("Guest full name", {
            name: "full_name",
            required: "",
            maxlength: 120,
            autocomplete: "off",
          }),
          field("Guest phone", {
            name: "phone",
            type: "tel",
            required: "",
            maxlength: 32,
            pattern: "\\+?[0-9 ()-]{7,32}",
            autocomplete: "off",
          }),
          field("Guest email · optional", {
            name: "email",
            type: "email",
            maxlength: 190,
            autocomplete: "off",
          }),
        ),
      );
    form.append(
      field(
        "Special requests · optional",
        { tag: "textarea", name: "special_requests", maxlength: 300 },
        [booking?.special_requests || ""],
      ),
    );
    if (booking)
      form.append(
        field("Reason for this change", {
          name: "reason",
          required: "",
          minlength: 3,
          maxlength: 255,
          value: "Guest requested a reservation change",
        }),
      );
    const save = node(
      "button",
      { type: "submit", class: "button" },
      booking
        ? "Save reservation changes"
        : waitlist
          ? "Add to waitlist"
          : "Create reservation",
    );
    form.append(save);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(save, async () => {
        if (!waitlist && !picked)
          throw new Error("Find availability and choose a time/table first.");
        const data = Object.fromEntries(new FormData(form));
        const body = {
          date: data.date,
          party_size: Number(data.party_size),
          room_type: data.room_type,
          time: waitlist ? data.time : selectedTime,
          ...(!waitlist
            ? { option: { kind: picked.kind, id: picked.id } }
            : {}),
        };
        if (booking)
          Object.assign(body, {
            code: booking.code,
            version: Number(booking.version),
            reason: data.reason,
            special_requests: data.special_requests,
          });
        else
          Object.assign(body, {
            source: data.source,
            request_key: requestKey,
            guest: {
              full_name: data.full_name,
              phone: data.phone,
              email: data.email,
              special_requests: data.special_requests,
            },
          });
        let result;
        try {
          result = await api(
            booking
              ? "/api/admin/reservations/modify"
              : waitlist
                ? "/api/admin/waitlist"
                : "/api/admin/reservations",
            body,
          );
        } catch (error) {
          if (error.code === "network" && !booking) {
            try {
              const recovered = await api(
                "/api/admin/request?" +
                  new URLSearchParams({ key: requestKey }),
              );
              result = { booking: recovered.booking };
            } catch {
              throw error;
            }
          } else throw error;
        }
        dialog.close();
        await refreshDashboard();
        feedback(
          `${result.booking.code} ${waitlist ? "added to the waitlist. No table is held until an offer appears." : booking ? "updated." : "created."}`,
          true,
          false,
        );
      });
    });
    openDialog(
      booking
        ? "Edit reservation"
        : waitlist
          ? "Add waitlist request"
          : "New reservation",
      form,
    );
  }
  async function renderSettings() {
    const data = await api("/api/admin/settings");
    config = data.configuration;
    workspace.replaceChildren(
      title(
        "Booking settings.",
        "Changes are version checked and recorded in audit history. Existing bookings retain their saved intervals.",
      ),
    );
    if (allowed("settings.write")) {
      const form = node("form", { class: "staff-setting-grid" });
      for (const [key, limits] of Object.entries(config.limits))
        form.append(
          field(key.replaceAll("_", " "), {
            type: "number",
            name: key,
            min: limits[0],
            max: limits[1],
            required: "",
            value: config.settings[key],
          }),
        );
      form.append(
        field("Last seating time", {
          type: "time",
          name: "last_seating_time",
          value: config.settings.last_seating_time,
          required: "",
        }),
      );
      addSave(form, "settings", () =>
        Object.fromEntries(
          [...new FormData(form)].map(([key, value]) => [
            key,
            key === "last_seating_time" ? value : Number(value),
          ]),
        ),
      );
      workspace.append(
        node(
          "section",
          { class: "staff-panel" },
          node("h2", {}, "Online booking rules"),
          form,
        ),
      );
    }
    for (const kind of [
      "hours",
      "turns",
      ...(allowed("settings.write") ? ["pacing"] : []),
    ]) {
      const form = node("form", { class: "staff-setting-grid" }),
        rows = [];
      for (const row of config[kind]) {
        const group = node("div", { class: "configuration-row" });
        if (kind === "hours") {
          group.append(
            node(
              "h3",
              {},
              [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][Number(row.weekday)] +
                (row.room_type_id ? " · Room " + row.room_type_id : " · Venue"),
            ),
            field("Opens", {
              type: "time",
              name: "open-" + row.id,
              value: row.open_time.slice(0, 5),
              required: "",
            }),
            field("Closes", {
              type: "time",
              name: "close-" + row.id,
              value: row.close_time.slice(0, 5),
              required: "",
            }),
            field("Closed", { type: "checkbox", name: "closed-" + row.id }),
          );
          group.querySelector("[type=checkbox]").checked = Boolean(
            Number(row.is_closed),
          );
          rows.push(() => ({
            id: Number(row.id),
            open_time: group.querySelector('[name="open-' + row.id + '"]')
              .value,
            close_time: group.querySelector('[name="close-' + row.id + '"]')
              .value,
            is_closed: group.querySelector("[type=checkbox]").checked,
          }));
        } else if (kind === "turns") {
          group.append(
            node("h3", {}, `${row.party_min}–${row.party_max} guests`),
            field("Dining minutes", {
              type: "number",
              min: 30,
              max: 240,
              required: "",
              value: row.turn_time_min,
            }),
          );
          rows.push(() => ({
            id: Number(row.id),
            turn_time_min: Number(group.querySelector("input").value),
          }));
        } else {
          group.append(
            node("h3", {}, row.code),
            field("Covers per slot", {
              type: "number",
              name: "covers",
              min: 1,
              max: 200,
              required: "",
              value: row.max_covers,
            }),
            field("Bookings per slot", {
              type: "number",
              name: "bookings",
              min: 1,
              max: 50,
              required: "",
              value: row.max_reservations,
            }),
          );
          rows.push(() => ({
            id: Number(row.id),
            max_covers: Number(group.querySelector("[name=covers]").value),
            max_reservations: Number(
              group.querySelector("[name=bookings]").value,
            ),
          }));
        }
        form.append(group);
      }
      addSave(form, kind, () => rows.map((read) => read()));
      workspace.append(
        node(
          "section",
          { class: "staff-panel" },
          node(
            "h2",
            {},
            kind === "hours"
              ? "Service hours"
              : kind === "turns"
                ? "Dining times"
                : "Service pacing caps",
          ),
          form,
        ),
      );
    }
    const block = button("Add blackout", () => openBlackout());
    workspace.append(
      node(
        "section",
        { class: "staff-panel" },
        node("h2", {}, "Blackouts"),
        note(
          "New blackouts must not overlap existing bookings or active holds. Table reset buffers cannot be removed here.",
        ),
        block,
      ),
    );
    const dataBlock = await api(
      "/api/admin/dashboard?" +
        new URLSearchParams({ date: filters.date, page: 1 }),
    );
    const tablePanel = node(
      "section",
      { class: "staff-panel" },
      node("h2", {}, "Blackouts for " + filters.date),
    );
    tablePanel.append(
      table(
        ["Scope", "Interval", "Reason", "Action"],
        dataBlock.blackouts.map((row) =>
          node(
            "tr",
            {},
            node(
              "td",
              {},
              row.scope + (row.scope_id ? " #" + row.scope_id : ""),
            ),
            node(
              "td",
              {},
              dateTime(row.starts_at) + " – " + dateTime(row.ends_at),
            ),
            node("td", {}, row.reason),
            node(
              "td",
              {},
              row.reason.startsWith("Staff blackout: ")
                ? button(
                    "Remove blackout #" + row.id,
                    () => openRemoveBlackout(row),
                    "button danger small",
                  )
                : "Reset / reference rule",
            ),
          ),
        ),
      ),
    );
    workspace.append(tablePanel);
  }
  function addSave(form, kind, values) {
    const save = node(
      "button",
      { type: "submit", class: "button" },
      "Save " + (kind === "settings" ? "booking rules" : kind),
    );
    form.append(save);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(save, async () => {
        await api("/api/admin/settings", {
          revision: config.revision,
          kind,
          values: values(),
        });
        await renderSettings();
        feedback("Settings saved and audit recorded.", true, false);
      });
    });
  }
  function openBlackout() {
    const form = node(
      "form",
      { class: "staff-form" },
      field(
        "Scope",
        { tag: "select", name: "scope" },
        ["venue", "room_type", "room", "table"].map((value) =>
          node("option", { value }, value.replace("_", " ")),
        ),
      ),
      field("Room/table ID · leave blank for venue", {
        type: "number",
        name: "scope_id",
        min: 1,
      }),
      field("Starts · Manila", {
        type: "datetime-local",
        name: "starts_at",
        required: "",
        value: filters.date + "T17:30",
      }),
      field("Ends · Manila", {
        type: "datetime-local",
        name: "ends_at",
        required: "",
        value: filters.date + "T23:30",
      }),
      field("Reason", {
        name: "reason",
        required: "",
        minlength: 3,
        maxlength: 130,
      }),
    );
    const legend = catalog.room_types
        .map((room) => `${room.id}: ${room.name}`)
        .join(" · "),
      tables = catalog.tables
        .map((table) => `${table.id}: ${table.code}`)
        .join(" · ");
    form.append(
      note("Room types: " + legend),
      note(
        "Rooms: " +
          catalog.rooms.map((room) => `${room.id}: ${room.name}`).join(" · "),
      ),
      note("Tables: " + tables),
    );
    const submit = node(
      "button",
      { type: "submit", class: "button" },
      "Save blackout",
    );
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        const data = Object.fromEntries(new FormData(form));
        await api("/api/admin/blackouts", {
          ...data,
          scope_id: data.scope === "venue" ? null : Number(data.scope_id),
          starts_at: data.starts_at.replace("T", " "),
          ends_at: data.ends_at.replace("T", " "),
        });
        dialog.close();
        await renderSettings();
        feedback("Blackout saved.", true, false);
      });
    });
    openDialog("Add service blackout", form);
  }
  function openRemoveBlackout(row) {
    const confirm = button(
      "Confirm removal",
      () =>
        busy(confirm, async () => {
          await api("/api/admin/blackouts", { delete_id: Number(row.id) });
          dialog.close();
          await renderSettings();
          feedback("Blackout removed.", true, false);
        }),
      "button danger",
    );
    openDialog(
      "Remove blackout?",
      note(row.reason + " · " + dateTime(row.starts_at)),
      node(
        "div",
        { class: "actions" },
        button("Keep blackout", () => dialog.close(), "button ghost"),
        confirm,
      ),
    );
  }
  async function renderStaff() {
    const data = await api("/api/admin/staff");
    workspace.replaceChildren(
      title(
        "Staff accounts.",
        "Activation links are private and one-use. Deactivation or role changes end existing sessions.",
        button("Invite staff", () => openInvite()),
      ),
    );
    workspace.append(
      node(
        "section",
        { class: "staff-panel" },
        table(
          ["Staff", "Role", "Status", "Last sign-in", "Action"],
          data.users.map((staff) =>
            node(
              "tr",
              {},
              node("td", {}, staff.full_name, node("small", {}, staff.email)),
              node("td", {}, staff.role),
              node("td", {}, Number(staff.is_active) ? "Active" : "Inactive"),
              node("td", {}, dateTime(staff.last_login_at)),
              node(
                "td",
                {},
                button(
                  "Manage " + staff.full_name,
                  () => openStaffChange(staff),
                  "button ghost small",
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
  function openInvite() {
    const form = node(
      "form",
      { class: "staff-form" },
      field("Staff full name", {
        name: "full_name",
        required: "",
        maxlength: 120,
      }),
      field("Staff email", {
        name: "email",
        type: "email",
        required: "",
        maxlength: 190,
      }),
      field(
        "Role",
        { name: "role", tag: "select" },
        ["host", "manager", "server", "kitchen", "admin"].map((role) =>
          node("option", { value: role }, role),
        ),
      ),
    );
    const submit = node(
      "button",
      { type: "submit", class: "button" },
      "Create activation link",
    );
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        const data = await api(
          "/api/admin/staff/invite",
          Object.fromEntries(new FormData(form)),
        );
        const result = node(
          "div",
          { class: "staff-invite-result" },
          note(
            "Share this private link only with that staff member. No email was sent. Valid until " +
              dateTime(data.expires_at),
          ),
          node(
            "a",
            { href: data.activation_path, class: "text-link" },
            "Private activation link",
          ),
        );
        const copy = button(
          "Copy activation link",
          () =>
            busy(copy, async () => {
              try {
                await navigator.clipboard.writeText(
                  new URL(data.activation_path, location.origin).href,
                );
                feedback("Activation link copied.", true);
              } catch {
                feedback(
                  "Copy is unavailable. Use the private link’s Copy link address option.",
                );
              }
            }),
          "button ghost",
        );
        result.append(copy);
        content.replaceChildren(result);
        await renderStaff();
      });
    });
    openDialog("Invite staff", form);
  }
  function openStaffChange(staff) {
    const form = node(
      "form",
      { class: "staff-form" },
      note(staff.full_name + " · " + staff.email),
      field(
        "Role",
        { tag: "select", name: "role" },
        ["admin", "manager", "host", "server", "kitchen"].map((role) =>
          node("option", { value: role }, role),
        ),
      ),
      field("Active", { type: "checkbox", name: "is_active" }),
    );
    form.elements.role.value = staff.role;
    form.elements.is_active.checked = Boolean(Number(staff.is_active));
    form.append(
      note(
        "Inactive staff with no password must use an activation link. The last active administrator is protected.",
      ),
    );
    const submit = node(
      "button",
      { type: "submit", class: "button" },
      "Save staff account",
    );
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        await api("/api/admin/staff/change", {
          id: Number(staff.id),
          role: form.elements.role.value,
          is_active: form.elements.is_active.checked,
        });
        dialog.close();
        await renderStaff();
        feedback(
          "Staff account updated. Prior sessions with changed permissions are revoked.",
          true,
          false,
        );
      });
    });
    openDialog("Manage staff account", form);
  }
  async function renderAudit(auditPage = 1) {
    const data = await api(
      "/api/admin/audit?" + new URLSearchParams({ page: auditPage }),
    );
    workspace.replaceChildren(
      title(
        "Audit history.",
        "Records include the acting staff member and saved changes. Passwords and private activation tokens are excluded.",
      ),
    );
    workspace.append(
      node(
        "section",
        { class: "staff-panel" },
        table(
          ["When", "Actor", "Action", "Record", "Changes"],
          data.events.map((event) =>
            node(
              "tr",
              {},
              node("td", {}, dateTime(event.created_at)),
              node(
                "td",
                {},
                event.actor || "Guest / system",
                node("small", {}, event.actor_role || "system"),
              ),
              node("td", {}, event.action),
              node("td", {}, event.entity_type + " " + (event.entity_id || "")),
              node(
                "td",
                {},
                button(
                  "View change #" + event.id,
                  () => {
                    const pretty = (value) =>
                      value
                        ? JSON.stringify(JSON.parse(value), null, 2)
                        : "None";
                    openDialog(
                      "Audit change #" + event.id,
                      node("h3", {}, "Before"),
                      node(
                        "pre",
                        { class: "audit-detail" },
                        pretty(event.before_json),
                      ),
                      node("h3", {}, "After"),
                      node(
                        "pre",
                        { class: "audit-detail" },
                        pretty(event.after_json),
                      ),
                    );
                  },
                  "button ghost small",
                ),
              ),
            ),
          ),
        ),
      ),
    );
    const prev = button(
        "Previous",
        () =>
          renderAudit(auditPage - 1).catch((error) => feedback(error.message)),
        "button ghost small",
      ),
      next = button(
        "Next",
        () =>
          renderAudit(auditPage + 1).catch((error) => feedback(error.message)),
        "button ghost small",
      );
    prev.disabled = auditPage <= 1;
    next.disabled = auditPage >= data.pages;
    workspace.append(
      node(
        "div",
        { class: "staff-pagination" },
        prev,
        `Page ${auditPage} of ${data.pages}`,
        next,
      ),
    );
  }
  async function renderOutbox() {
    const data = await api("/api/admin/outbox");
    workspace.replaceChildren(
      title(
        "Demo notifications.",
        "These are simulated records. No email or SMS has been delivered.",
      ),
    );
    workspace.append(
      node(
        "section",
        { class: "staff-panel" },
        table(
          ["Created", "Channel / recipient", "Booking", "Message"],
          data.messages.map((item) =>
            node(
              "tr",
              {},
              node("td", {}, dateTime(item.created_at)),
              node("td", {}, item.channel, node("small", {}, item.recipient)),
              node("td", {}, item.code || "—"),
              node(
                "td",
                {},
                node("strong", {}, item.subject || "Notification"),
                node("small", {}, item.body),
              ),
            ),
          ),
        ),
      ),
    );
  }
  async function changeTab(value) {
    tab = value;
    page = 1;
    feedback("", false, false);
    for (const control of $("#staff-sidebar nav").children)
      control.setAttribute(
        "aria-current",
        control.dataset.tab === tab ? "page" : "false",
      );
    try {
      if (tab === "service" || tab === "waitlist") await renderService();
      else if (tab === "settings") await renderSettings();
      else if (tab === "staff") await renderStaff();
      else if (tab === "audit") await renderAudit();
      else await renderOutbox();
    } catch (error) {
      if (error.status === 401) location.assign("/staff/login");
      else feedback(error.message, false, false);
    }
  }
  async function boot() {
    try {
      const session = await api("/api/auth/me");
      csrf = session.csrf_token;
      user = session.user;
      serverEpoch = session.server_time_epoch;
      serverStarted = performance.now();
      if (view !== "admin") {
        if (user && view === "activate") {
          const switchAccount = button(
            "Sign out to activate another account",
            () =>
              busy(switchAccount, async () => {
                await api("/api/auth/logout", {});
                const fresh = await api("/api/auth/me");
                csrf = fresh.csrf_token;
                user = null;
                renderAuth();
              }),
          );
          workspace.replaceChildren(
            node(
              "section",
              { class: "auth-card" },
              node("h1", {}, "Already signed in."),
              note(
                "You are signed in as " +
                  user.full_name +
                  ". Sign out before choosing a password for another account.",
              ),
              switchAccount,
            ),
          );
          return;
        }
        if (user) {
          authenticated(user);
          return;
        }
        renderAuth();
        return;
      }
      if (!user || !allowed("reservations.read")) {
        workspace.replaceChildren();
        location.assign("/staff/login");
        return;
      }
      catalog = (await api("/api/catalog")).catalog;
      filters = { date: catalog.today, status: "all", q: "" };
      $("#staff-user").textContent = user.full_name + " · " + user.role;
      $("#staff-logout").hidden = false;
      $("#staff-sidebar").hidden = false;
      const workspaceLinks = node("div", { class: "staff-workspace-links" });
      if (allowed("orders.read"))
        workspaceLinks.append(node("a", { href: "/server" }, "Food orders ↗"));
      if (allowed("kitchen.read"))
        workspaceLinks.append(
          node("a", { href: "/kitchen" }, "Kitchen tickets ↗"),
        );
      $("#staff-sidebar").append(workspaceLinks);
      for (const control of $("#staff-sidebar nav").children) {
        const needed = {
          settings: "settings.read",
          staff: "staff.manage",
          audit: "audit.read",
          outbox: "audit.read",
        }[control.dataset.tab];
        control.hidden = Boolean(needed && !allowed(needed));
        control.addEventListener("click", () => changeTab(control.dataset.tab));
      }
      await changeTab("service");
      setInterval(async () => {
        if (
          document.hidden ||
          dialog.open ||
          !["service", "waitlist"].includes(tab) ||
          document.activeElement.matches("input,select,textarea") ||
          document.activeElement.closest(".staff-table,.staff-floor")
        )
          return;
        try {
          await refreshDashboard();
        } catch (error) {
          if (error.status === 401) {
            workspace.replaceChildren();
            location.assign("/staff/login");
          } else feedback(error.message, false, false);
        }
      }, 8000);
    } catch (error) {
      workspace.replaceChildren(
        note("Could not load the staff workspace."),
        button("Try again", () => location.reload()),
      );
      feedback(error.message, false, false);
    }
  }
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || view !== "admin") return;
    try {
      const session = await api("/api/auth/me");
      if (!session.user) {
        workspace.replaceChildren();
        content.replaceChildren();
        location.assign("/staff/login");
      }
    } catch {}
  });
  boot();
})();
