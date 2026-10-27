"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  const managePage = document.body.dataset.page === "manage";
  const root = $(managePage ? "#management" : "#flow");
  const feedback = $(managePage ? "#manage-feedback" : "#feedback");
  const storageKey = "lumina.guest.v1";
  let state = {},
    catalog,
    csrf,
    selection,
    managed,
    access,
    timer,
    holdTiming,
    editing = false;
  try {
    state = JSON.parse(sessionStorage.getItem(storageKey) || "{}") || {};
  } catch {
    state = {};
  }
  const persist = () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* This tab can still book when storage is unavailable. */
    }
  };
  function node(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith("on"))
        el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== null && value !== undefined)
        el.setAttribute(key, String(value));
    }
    for (const child of children.flat())
      if (child !== null && child !== undefined)
        el.append(child instanceof Node ? child : String(child));
    return el;
  }
  const button = (label, action, classes = "button") =>
    node("button", { type: "button", class: classes, onclick: action }, label);
  const note = (text) => node("p", { class: "form-note" }, text);
  function message(text = "", success = false) {
    window.LuminaFeedback.message(feedback, text, {
      kind: success ? "success" : "error",
      focus: !success && Boolean(text),
    });
  }
  const ui = window.LuminaFeedback;
  const motion = window.LuminaGuestMotion;
  const showcase = window.LuminaTableShowcase;
  const menuPhotos = window.LuminaMenuPhotos;
  let flowReady = false;
  let guestDraft = {};
  function presentStep(name, transition = true) {
    const heading = $(managePage ? "#manage-title" : "#flow-title");
    const titles = managePage
      ? { search: "Change reservation", management: "Your booking", link: "Open your booking" }
      : { search: "Reserve a table", details: "Your details", confirmation: "Your reservation" };
    heading.textContent = titles[name] || "Your reservation";
    motion?.stop(root);
    if (!flowReady || !transition) return;
    const active = document.activeElement;
    if (active === document.body || root.contains(active) || active === heading) {
      const bounds = heading.getBoundingClientRect();
      const headerBottom = matchMedia("(min-width: 761px)").matches
        ? $(".site-header")?.getBoundingClientRect().bottom || 0 : 0;
      if (bounds.top < headerBottom || bounds.bottom > innerHeight)
        heading.scrollIntoView({ block: "start", behavior: "instant" });
      heading.focus({ preventScroll: true });
    }
    motion?.enter(root);
  }
  function step(name) {
    motion?.stop(root);
    showcase?.setContext(null);
    clearInterval(timer);
    const steps = ["search", "details", "confirmation"];
    const current = steps.indexOf(name);
    steps.forEach((id, index) => {
      const item = $("#step-" + id);
      if (!item) return;
      item.classList.toggle("current", name === id);
      item.classList.toggle("completed", current > index);
      if (name === id) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      item.querySelector(".step-state").textContent = name === id
        ? " — current step" : current > index ? " — completed" : "";
    });
    root.replaceChildren();
  }
  async function api(path, { body, headers = {}, signal } = {}) {
    let response;
    try {
      response = await fetch(path, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal,
        headers: {
          ...headers,
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json", "X-CSRF-Token": csrf }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw Object.assign(
        new Error(
          "Connection interrupted. Check your connection and try again.",
        ),
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
    const finish = ui.pending(control);
    try {
      await work();
    } catch (error) {
      if (error.code === "booking_changed" && managed) {
        try {
          await refreshManaged();
          $("#cancel-dialog").close();
          renderManagement();
        } catch {
          /* Preserve the original error if refreshing fails. */
        }
      }
      message(error.message);
    } finally {
      finish(control.dataset.holdExpired === "true");
      if(control.dataset.idleLabel)control.textContent=control.dataset.idleLabel;
    }
  }
  const money = (cents) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(Number(cents) / 100);
  const roomName = (code) =>
    catalog.room_types.find((room) => room.code === code)?.name || code;
  const dateTime = (value) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value.replace(" ", "T") + "+08:00"));
  const timeLabel = (value) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date("2000-01-01T" + value + ":00+08:00"));
  function privateAccess(path) {
    const url = new URL(path, location.origin);
    const params = new URLSearchParams(url.hash.slice(1));
    const code = params.get("code"),
      token = params.get("token");
    if (
      url.origin !== location.origin ||
      url.pathname !== "/manage" ||
      !/^LUM-[A-Z0-9]{6}$/.test(code || "") ||
      !/^[a-f0-9]{64}$/.test(token || "")
    )
      throw new Error(
        "Paste the complete private booking link saved at confirmation.",
      );
    return {
      code,
      token,
      path: "/manage#" + new URLSearchParams({ code, token }),
    };
  }
  // URL fragments never reach the web server; remove the secret from the address bar immediately.
  let incomingError;
  if (managePage && location.hash) {
    try {
      access = privateAccess(location.href);
      state.managePath = access.path;
      persist();
    } catch (error) {
      incomingError = error.message;
    }
    history.replaceState(null, "", "/manage");
  }
  // A second private link in this tab must boot its own capability and pending cart.
  if(managePage)window.addEventListener('hashchange',()=>{if(location.hash)location.reload();});
  const authHeaders = () => ({ "X-Booking-Token": access.token });
  const queryString = (values) => new URLSearchParams(values).toString();
  function field(label, attrs, children = []) {
    const input = node(
      attrs.tag || "input",
      Object.fromEntries(
        Object.entries(attrs).filter(([key]) => key !== "tag"),
      ),
      ...children,
    );
    const labelId = "label-" + (attrs.id || attrs.name);
    input.setAttribute("aria-labelledby", labelId);
    return node(
      "label",
      { class: "field" + (attrs.name === "room_type" ? " wide" : "") },
      node("span", { id: labelId }, label),
      input,
    );
  }
  function defaultDate() {
    let value = catalog.today;
    if (new Date(value + "T12:00:00+08:00").getUTCDay() === 1) {
      const next = new Date(value + "T00:00:00Z");
      next.setUTCDate(next.getUTCDate() + 1);
      value = next.toISOString().slice(0, 10);
    }
    return value;
  }
  function renderSearch(
    initial = state.query || {
      date: defaultDate(),
      party_size: 2,
      room_type: "any",
    },
    { transition = true } = {},
  ) {
    step("search");
    selection = null;
    const form = node("form", { class: "search-form" });
    const party = field(
      "Guests",
      { tag: "select", name: "party_size" },
      Array.from({ length: catalog.max_party }, (_, i) =>
        node("option", { value: i + 1 }, `${i + 1} ${i ? "guests" : "guest"}`),
      ),
    );
    const date = field("Date · Manila time", {
      type: "date",
      name: "date",
      required: "",
      min: catalog.today,
      max: catalog.max_date,
      value: initial.date,
    });
    const room = field(
      "Room preference",
      { tag: "select", name: "room_type" },
      [
        node("option", { value: "any" }, "Any room · best fit"),
        ...catalog.room_types.map((item) =>
          node("option", { value: item.code }, item.name),
        ),
      ],
    );
    const submit = node(
      "button",
      { type: "submit", class: "button full wide" },
      "Find a table",
    );
    form.append(party, date, room, submit);
    form.elements.party_size.value = initial.party_size;
    form.elements.room_type.value = initial.room_type;
    const results = node("div", { "aria-live": "polite" });
    const capacityNote = node("p", {
      id: "capacity-note", class: "form-note", role: "status",
    });
    const guestSelect = form.elements.party_size;
    const roomSelect = form.elements.room_type;
    guestSelect.setAttribute("aria-describedby", "capacity-note");
    roomSelect.setAttribute("aria-describedby", "capacity-note");
    let guestWasChosen = Boolean(state.query) || editing;
    const fits = (type, count) =>
      count >= Number(type.min_party) && count <= Number(type.max_party);
    function syncCapacity(changed) {
      if (changed === guestSelect) guestWasChosen = true;
      let count = Number(guestSelect.value) || Number(initial.party_size) || 2;
      let code = roomSelect.value || "any";
      let type = catalog.room_types.find(item => item.code === code);
      let adjustment = "";
      if (type) {
        const valid = Array.from({ length: catalog.max_party }, (_, i) => i + 1)
          .filter(value => fits(type, value));
        if (!valid.length) { code = "any"; type = null; }
        else if (!valid.includes(count)) {
          const before = count;
          count = valid.reduce((best, value) =>
            Math.abs(value - before) < Math.abs(best - before) ? value : best);
          adjustment = `Guest count adjusted from ${before} to ${count}. `;
        }
      }
      const allowedGuests = Array.from({ length: catalog.max_party }, (_, i) => i + 1)
        .filter(value => !type || fits(type, value));
      if (!allowedGuests.includes(count)) count = allowedGuests[0];
      guestSelect.replaceChildren(...allowedGuests.map(value =>
        node("option", { value }, `${value} ${value === 1 ? "guest" : "guests"}`)));
      guestSelect.value = String(count);
      const allowedRooms = catalog.room_types.filter(item => !guestWasChosen || fits(item, count));
      if (code !== "any" && !allowedRooms.some(item => item.code === code)) code = "any";
      roomSelect.replaceChildren(
        node("option", { value: "any" }, "Any room · best fit"),
        ...allowedRooms.map(item => node("option", { value: item.code }, item.name)),
      );
      roomSelect.value = code;
      capacityNote.textContent = adjustment + (type
        ? `${type.name}: ${type.min_party}–${Math.min(Number(type.max_party), Number(catalog.max_party))} guests. Choose Any room for the full guest range.`
        : guestWasChosen ? `Showing rooms that fit ${count} ${count === 1 ? "guest" : "guests"}. Date and time availability is checked when you search.`
        : "Choose guests or a room first; the other options will match its booking capacity.");
    }
    syncCapacity();
    form.addEventListener("change", (event) => {
      if (event.target === guestSelect || event.target === roomSelect) syncCapacity(event.target);
      results.replaceChildren();
      selection = null;
      showcase?.setContext(null);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        message();
        showcase?.setContext(null);
        const finishLoading = ui.loading(results, "Checking tables…", { tables: true });
        const query = {
          date: form.elements.date.value,
          party_size: Number(form.elements.party_size.value),
          room_type: form.elements.room_type.value,
        };
        state.query = query;
        persist();
        for (const input of form.querySelectorAll("input,select"))
          input.disabled = true;
        try {
          const path = editing
            ? "/api/manage/availability?" +
              queryString({ ...query, code: access.code })
            : "/api/availability?" + queryString(query);
          const data = await api(path, {
            headers: editing ? authHeaders() : {},
          });
          renderResults(results, data.availability, query);
        } catch (error) {
          results.replaceChildren();
          throw error;
        } finally {
          finishLoading();
          for (const input of form.querySelectorAll("input,select"))
            input.disabled = false;
        }
      });
    });
    if (editing)
      root.append(
        node(
          "p",
          { class: "selection-note" },
          "Your current reservation stays reserved until changes are saved. New options are not held yet.",
        ),
        button(
          "Back to my booking",
          () => {
            editing = false;
            renderManagement();
          },
          "button ghost small",
        ),
      );
    root.append(
      form,
      capacityNote,
      note(
        catalog.profile === "bella_vista_b2"
          ? "Tuesday–Sunday, 10:00–22:00. Starts every 15 minutes; 120-minute dining plus 15-minute cleanup. Last start 20:00. Closed Monday. All times are in Manila."
          : `Book up to 60 days ahead. Closed Monday. VIP: ${catalog.room_types.find((room) => room.code === "vip")?.min_notice_hours ?? 12}-hour notice; group tables: ${catalog.room_types.find((room) => room.code === "group")?.min_notice_hours ?? 12}-hour notice. All times are in Manila.`,
      ),
      results,
    );
    presentStep("search", transition);
  }
  function renderResults(container, availability, query) {
    const fetchedAt = Date.now();
    container.replaceChildren();
    if (!availability.slots.length) {
      container.append(
        node(
          "div",
          { class: "empty-state" },
          node("h3", {}, "No matching tables"),
          node(
            "p",
            {},
            catalog.profile === "bella_vista_b2"
              ? "Try another date, time or room. Service is Tuesday–Sunday, 10:00–22:00; each booking has two hours of dining."
              : "Try another date, a smaller party, or Any room. Service is Tuesday–Sunday. Longer parties need an earlier seating.",
          ),
          note("Contact details are not configured for this academic demo."),
        ),
      );
      motion?.enter(container, "menu");
      return;
    }
    container.append(
      node(
        "div",
        { class: "result-heading" },
        node("h3", {}, "Choose your time"),
        node("small", {}, "Asia/Manila"),
      ),
    );
    const slots = node("div", {
      class: "time-slots",
      role: "group",
      "aria-label": "Available times",
    });
    const picker = node("div", { class: "table-picker" });
    let selectedSlot =
      availability.slots.find(
        (slot) =>
          slot.time === (editing ? managed.starts_at.slice(11, 16) : "19:00"),
      ) || availability.slots[0];
    function selectSlot(slot) {
      selectedSlot = slot;
      for (const control of slots.children)
        control.setAttribute(
          "aria-pressed",
          String(control.dataset.time === slot.time),
        );
      renderPicker(picker, slot, query, null, fetchedAt);
    }
    for (const slot of availability.slots)
      slots.append(
        node(
          "button",
          {
            type: "button",
            class: "slot",
            "data-time": slot.time,
            "aria-pressed": String(slot === selectedSlot),
            onclick: () => selectSlot(slot),
          },
          timeLabel(slot.time),
        ),
      );
    container.append(slots, picker);
    selectSlot(selectedSlot);
    motion?.enter(container, "menu");
  }
  function renderPicker(container, slot, query, preferred = null, fetchedAt = Date.now()) {
    container.replaceChildren();
    selection = slot.options.find(o => preferred && o.kind === preferred.kind && o.id === preferred.id) || slot.options[0];
    const changeAck = node("input", {type:"checkbox", id:"accept-reservation-change"}), changeTerms = node("div");
    const fieldset = node("fieldset", {}, node("legend", {}, "Choose a table"));
    const options = node("div", { class: "options" }),
      detail = node("div", { class: "selection-note" });
    const svgNS = "http://www.w3.org/2000/svg";
    const svgNode = (tag, attrs = {}, text) => {
      const el = document.createElementNS(svgNS, tag);
      for (const [key, value] of Object.entries(attrs))
        el.setAttribute(key, value);
      if (text) el.textContent = text;
      return el;
    };
    const layout = window.LuminaFloorLayout.create(catalog);
    const svg = svgNode("svg", {
      viewBox: window.LuminaFloorLayout.viewBox,
      class: "floor",
      role: "group",
      "aria-label":
        "Floor plan. Click any table to preview its seating and availability for this search.",
    });
    svg.append(svgNode("title", {}, "Bella Vista Dining floor plan"));
    for (const room of layout.rooms) {
      svg.append(
        svgNode("rect", {
          x: room.floor_x,
          y: room.floor_y,
          width: room.floor_w,
          height: room.floor_h,
          rx: 8,
          class: "floor-room",
        }),
      );
      svg.append(
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
    window.LuminaFloorLayout.guides(svg);
    const shapes = new Map();
    for (const table of layout.tables) {
      const option = slot.options.find((item) =>
        item.table_ids.includes(Number(table.id)),
      );
      const attrs =
        table.shape === "round"
          ? { cx: table.pos_x, cy: table.pos_y, r: table.radius }
          : {
              x: table.pos_x,
              y: table.pos_y,
              width: table.pos_w,
              height: table.pos_h,
              rx: 7,
            };
      const shape = svgNode(table.shape === "round" ? "circle" : "rect", {
        ...attrs,
        class: "floor-table" + (option ? " available" : " unavailable"),
      });
      shape.setAttribute("role", "button");
      shape.setAttribute("tabindex", "0");
      shape.setAttribute("data-table", table.code);
      shape.setAttribute("aria-label", `Preview ${table.code}: ${option ? "available" : "unavailable for this search"}`);
      const preview = () => showcase?.open(table.id, shape);
      shape.addEventListener("click", preview);
      shape.addEventListener("keydown", event => {
        if (["Enter", " "].includes(event.key)) { event.preventDefault(); preview(); }
      });
      shapes.set(Number(table.id), shape);
      svg.append(shape);
      const x =
        table.shape === "round"
          ? table.pos_x
          : Number(table.pos_x) + Number(table.pos_w) / 2;
      const y =
        table.shape === "round"
          ? Number(table.pos_y) + 6
          : Number(table.pos_y) + Number(table.pos_h) / 2 + 6;
      svg.append(
        svgNode(
          "text",
          { x, y, "text-anchor": "middle", class: "floor-code" },
          table.code,
        ),
      );
    }
    for (const option of slot.options) {
      const radio = node("input", {
        type: "radio",
        name: "table-option",
        value: `${option.kind}:${option.id}`,
        onchange: () => choose(option),
      });
      options.append(
        node(
          "label",
          { class: "table-option" },
          radio,
          node(
            "span",
            {},
            node("b", {}, option.label),
            node(
              "small",
              {},
              roomName(option.room_type) +
                (option.kind === "group" ? " · joined" : ""),
            ),
          ),
        ),
      );
    }
    function choose(option) {
      selection = option;
      if(editing&&catalog.policies_enabled){
        changeAck.checked=false;
        const fees=option.policy_fees;
        const terms=node('details',{},node('summary',{},'Reservation change terms'));
        for(const text of catalog.terms)terms.append(node('p',{},text));
        changeTerms.replaceChildren(node('p',{},`Replacement fees: ${money(fees.base_fee_cents)} consumable base; ${money(fees.extra_cents)} separate extras; ${money(fees.minimum_cents)} food minimum. The earlier change deadline stays in force: ${dateTime(managed.cancel_deadline)}. Saved food prices and history are preserved.`),terms,node('label',{},changeAck,' I accept the replacement schedule, fees and reservation terms.'));
      }
      for (const radio of options.querySelectorAll("input"))
        radio.checked = radio.value === `${option.kind}:${option.id}`;
      for (const [id, shape] of shapes) {
        const selected = option.table_ids.includes(id);
        shape.classList.toggle("selected", selected);
        if (shape.hasAttribute("role"))
          shape.setAttribute("aria-pressed", String(selected));
      }
      detail.replaceChildren(
        node("strong", {}, `${roomName(option.room_type)} · ${option.label}`),
        node("br"),
        `${option.turn_time_min} minutes at the table. `,
        Number(option.min_spend_cents)
          ? `Minimum spend ${money(option.min_spend_cents)} per booking. `
          : catalog.preorders_enabled&&option.room_type==='bv_standard' ? "₱1,000 food minimum upon seating. " : catalog.preorders_enabled ? "Assigned consumable fee shown before confirmation. " : "No minimum spend. ",
        option.approval_required
          ? "Requires manager approval; this is a request, not a confirmed booking."
          : "Instant confirmation when your details are submitted.",
      );
    }
    fieldset.append(
      node("p", {class: "fine-print"}, "Concept layout · not to scale. Dashed lines show circulation; gaps mark room access."),
      node("div", {class: "floor-viewport", tabindex: "0", role: "region", "aria-label": "Scrollable concept floor map"}, svg),
      node("p", {class: "fine-print floor-pan-note"}, "Swipe the map sideways to explore all rooms."),
      node(
        "div",
        { class: "floor-legend" },
        node("span", {}, "Eligible"),
        node("span", {}, "Selected"),
        node("span", {}, "Unavailable"),
      ),
      options,
    );
    const next = button(
      editing ? "Save reservation changes" : "Continue with this table",
      () =>
        busy(next, async () => {
          message();
          const picked = selection;
          if (editing) {
            if(catalog.policies_enabled&&!changeAck.checked)throw new Error('Review and accept the replacement schedule, fees and terms first.');
            const data = await api("/api/manage/modify", {
              headers: authHeaders(),
              body: {
                ...query,
                time: slot.time,
                code: access.code,
                version: managed.version,
                option: { kind: picked.kind, id: picked.id },
                special_requests: $("#change-notes").value,
                ...(catalog.policies_enabled?{policy_acceptance:{version:catalog.terms_version,...picked.policy_fees}}:{}),
              },
            });
            managed = data.booking;
            editing = false;
            renderManagement();
            message(
              "Reservation updated. Your booking reference stays the same.",
              true,
            );
          } else {
            if(state.pendingConfirmation)throw new Error('Recover the pending confirmation before choosing another table.');
            const data = await api("/api/holds", {
              body: {
                ...query,
                time: slot.time,
                option: { kind: picked.kind, id: picked.id },
              },
            });
            state.hold = data.hold;
            delete state.confirmation;
            persist();
            renderDetails();
          }
        }),
    );
    container.append(fieldset, detail, changeTerms);
    if (editing)
      container.append(
        field(
          "Special requests · optional",
          {
            tag: "textarea",
            id: "change-notes",
            name: "special_requests",
            maxlength: 300,
          },
          [managed.special_requests || ""],
        ),
      );
    container.append(button("Refresh tables", () => showcase?.refresh(), "button ghost small"), next);
    choose(selection);
    showcase?.setContext({
      query: {...query}, time: slot.time, slot, checkedAt: fetchedAt,
      refresh: async (signal) => {
        const path = editing ? "/api/manage/availability?" + queryString({...query, code:access.code}) : "/api/availability?" + queryString(query);
        return (await api(path, {headers:editing ? authHeaders() : {}, signal})).availability;
      },
      choose: (option, latest) => {
        renderPicker(container, latest, query, option);
        const chosen = container.querySelector("input:checked");
        const bounds = chosen?.getBoundingClientRect();
        if (bounds && (bounds.top < 0 || bounds.bottom > innerHeight))
          chosen.scrollIntoView({ block: "nearest", behavior: "instant" });
        const acknowledgment = node("p", { class: "form-note", role: "status" },
          `${option.label} selected. ${editing ? "Save to update your booking." : "Continue to hold these seats for ten minutes."}`);
        container.append(acknowledgment);
        motion?.enter(acknowledgment, "menu");
        return chosen;
      },
      update: latest => {
        const available = latest?.options || [];
        for (const [id, shape] of shapes) {
          const eligible = available.some(o => o.table_ids.includes(id));
          shape.classList.toggle("available", eligible);
          shape.classList.toggle("unavailable", Boolean(latest) && !eligible);
          const table = catalog.tables.find(t => Number(t.id) === id);
          shape.setAttribute("aria-label", `Preview ${table.code}: ${!latest ? "unable to check" : eligible ? "available" : "unavailable for this search"}`);
        }
        for (const radio of options.querySelectorAll("input")) radio.disabled = !available.some(o => radio.value === `${o.kind}:${o.id}`);
        next.disabled = !available.some(o => o.kind === selection?.kind && o.id === selection?.id);
        if (next.disabled) detail.textContent = latest ? "Your selected table is no longer available. Choose another table or search again." : "Check availability again in a table preview or run a new search.";
      },
    });
  }
  function summary(rows) {
    return node(
      "dl",
      { class: "summary" },
      rows.map(([label, value]) =>
        node("div", {}, node("dt", {}, label), node("dd", {}, value)),
      ),
    );
  }
  function renderDetails() {
    step("details");
    const hold = state.hold,
      option = hold.option;
    const countdown = node("strong", {
      "aria-label": "Time remaining",
      id: "hold-countdown",
    });
    const held = node(
      "div",
      { class: "held-bar" },
      node("span", {}, "Your table is held while you finish."),
      countdown,
    );
    const deadline = new Date(option.starts_at.replace(" ", "T") + "+08:00");
    deadline.setMinutes(deadline.getMinutes() - (catalog.preorders_enabled?1440:catalog.cancel_cutoff_min));
    root.append(
      held,
      summary([
        ["Date & time", dateTime(option.starts_at)],
        ["Guests", hold.party_size],
        ["Room & table", `${roomName(option.room_type)} · ${option.label}`],
        ["Dining time", `${option.turn_time_min} minutes`],
        [
          "Minimum spend",
          Number(option.min_spend_cents)
            ? money(option.min_spend_cents)
            : "None",
        ],
      ]),
    );
    const form = node("form", { class: "details-form" });
    form.append(
      field("Full name", {
        name: "full_name",
        autocomplete: "name",
        required: "",
        maxlength: 120,
      }),
      node(
        "div",
        { class: "field-row" },
        field("Phone number", {
          name: "phone",
          type: "tel",
          autocomplete: "tel",
          required: "",
          maxlength: 32,
          pattern: "\\+?[0-9 ()-]{7,32}",
          placeholder: "+63 9xx xxx xxxx",
        }),
        field("Email", {
          name: "email",
          type: "email",
          autocomplete: "email",
          required: "",
          maxlength: 190,
        }),
      ),
      field("Special requests · optional", {
        tag: "textarea",
        name: "special_requests",
        maxlength: 300,
        placeholder: "Dietary needs, occasion, or accessibility requests",
      }),
    );
    const preorderEnabled=Boolean(catalog.preorders_enabled);
    const draftKey=hold.hold_token;
    if(preorderEnabled&&state.preorderDraft?.scope!==draftKey)state.preorderDraft={scope:draftKey,cart:state.preorderDraft?.cart||[]};
    let foodEditor;
    const confirm = node(
      "button",
      { type: "submit", class: "button full", id: "confirm-booking" },
      option.approval_required
        ? "Submit booking request"
        : "Confirm reservation",
    );
    if(preorderEnabled){
      foodEditor=window.LuminaPreorders.editor({catalog,draft:state.preorderDraft,persist,
        review:async cart=>(await api('/api/preorders/quote',{body:{hold_token:hold.hold_token,cart}})).quote,
        changed:reviewed=>{confirm.textContent=confirm.dataset.idleLabel=reviewed?'Confirm reservation':'Review food and fees';},
        locked:Boolean(state.pendingConfirmation)});
      form.append(foodEditor.element);
      confirm.textContent=state.pendingConfirmation?'Retry confirmation':state.preorderDraft.quote?'Confirm reservation':'Review food and fees';
    }
    const back = button(
      "Choose another table",
      () =>
        busy(back, async () => {
          guestDraft = Object.fromEntries(new FormData(form));
          await api("/api/holds/release", {
            body: { hold_token: hold.hold_token },
          });
          delete state.hold;
          persist();
          message();
          renderSearch();
        }),
      "button ghost full",
    );
    back.disabled=Boolean(state.pendingConfirmation);
    if(state.pendingConfirmation)guestDraft=state.pendingConfirmation.guest;
    for (const [name, value] of Object.entries(guestDraft)) {
      if (form.elements[name]) form.elements[name].value = value;
    }
    form.addEventListener("input", () => {
      guestDraft = Object.fromEntries(new FormData(form));
    });
    const cutoff = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(deadline);
    form.append(
      note(
        `Online changes and cancellation close ${cutoff} (Manila), ${preorderEnabled?"24":"two"} hours before your booking. No payments are collected.`,
      ),
      confirm,
      back,
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(confirm, async () => {
        message();
        const guest = Object.fromEntries(new FormData(form));
        try {
          let body=state.pendingConfirmation;
          if(!body){
            const preorder=foodEditor?await foodEditor.prepare():null;
            if(foodEditor&&!preorder)return;
            body={hold_token:hold.hold_token,guest,...(preorder?{preorder}:{})};
            if(preorderEnabled){state.pendingConfirmation=body;persist();foodEditor.lock(true);back.disabled=true;for(const c of form.querySelectorAll('input,textarea,select'))c.disabled=true;}
          }
          const data = await api("/api/reservations", {body});
          await complete(data.booking);
        } catch (error) {
          if(preorderEnabled&&error.status&&error.status<500){delete state.pendingConfirmation;foodEditor.invalidate();foodEditor.lock(false);back.disabled=false;for(const c of form.querySelectorAll('input,textarea,select'))c.disabled=false;persist();}
          else if(state.pendingConfirmation)confirm.textContent=confirm.dataset.idleLabel='Retry confirmation';
          if (error.code === "network") {
            try {
              const data = await api("/api/holds", {
                headers: { "X-Hold-Token": hold.hold_token },
              });
              if (data.hold.booking) {
                await complete(data.hold.booking);
                return;
              }
            } catch {
              /* Keep the retryable form after an ambiguous response. */
            }
          }
          if (
            error.status === 410 ||
            error.code === "unavailable" ||
            error.code === "inventory_changed"
          ) {
            delete state.hold;
            persist();
            renderSearch();
          }
          throw error;
        }
      });
    });
    root.append(form);
    if(state.pendingConfirmation)for(const c of form.querySelectorAll('input,textarea,select'))c.disabled=true;
    holdTiming = {
      expires: Number(hold.expires_at_epoch),
      server: Number(hold.server_time_epoch),
      started: performance.now(),
    };
    let warned = false;
    function tick() {
      const seconds = Math.max(
        0,
        Math.ceil(
          holdTiming.expires -
            holdTiming.server -
            (performance.now() - holdTiming.started) / 1000,
        ),
      );
      countdown.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      if (!seconds) {
        clearInterval(timer);
        const pending=state.pendingConfirmation?.hold_token===hold.hold_token;
        confirm.disabled = !pending;
        confirm.dataset.holdExpired = pending ? "false" : "true";
        if(pending)confirm.textContent=confirm.dataset.idleLabel='Retry confirmation';
        message(pending?'The hold window ended. Retry the pending confirmation to recover its saved outcome.':'Your table hold has ended. Search again to choose a table.');
        back.textContent = "Search again";
      } else if (seconds <= 60 && !warned) {
        warned = true;
        message("Less than a minute remains on your table hold.");
      }
    }
    tick();
    timer = setInterval(tick, 1000);
    presentStep("details");
  }
  async function complete(booking) {
    guestDraft = {};
    delete state.pendingConfirmation;
    delete state.preorderDraft;
    state.confirmation = booking;
    state.managePath = booking.manage_path;
    delete state.hold;
    persist();
    clearInterval(timer);
    access = privateAccess(booking.manage_path);
    let details = booking;
    try {
      details = (
        await api("/api/manage?" + queryString({ code: access.code }), {
          headers: authHeaders(),
        })
      ).booking;
    } catch {
      /* The confirmed booking and its private link remain recoverable. */
    }
    renderConfirmation(details);
  }
  async function copyLink(control) {
    await busy(control, async () => {
      try {
        await navigator.clipboard.writeText(
          new URL(access.path, location.origin).href,
        );
        message(
          "Private link copied. Keep it safe: anyone with it can manage this booking.",
          true,
        );
      } catch {
        message(
          "Copy is unavailable in this browser. Use the private link’s Copy link address option.",
        );
      }
    });
  }
  function bookingSummary(booking) {
    return summary([
      ["Date & time", dateTime(booking.starts_at)],
      ["Guests", booking.party_size],
      [
        "Room & tables",
        booking.room
          ? `${booking.room.name} · ${booking.tables.map((table) => table.code).join(" + ")}`
          : `${roomName(state.query?.room_type || "any")}`,
      ],
      ["Changes close", dateTime(booking.cancel_deadline)],
      ["Timezone", "Asia/Manila"],
    ]);
  }
  function renderConfirmation(booking) {
    step("confirmation");
    message();
    root.append(
      node("span", { class: "confirmation-mark" + (booking.status === "confirmed" ? " is-confirmed" : ""), "aria-hidden": "true" },
        booking.status === "confirmed" ? "✓" : booking.status === "pending" ? "…" : booking.status === "cancelled" ? "×" : "·"),
      node(
        "span",
        { class: "status " + booking.status },
        booking.status === "pending"
          ? "Awaiting manager approval"
          : booking.status === "cancelled"
            ? "Cancelled"
            : ({confirmed:"Confirmed",no_show:"No-show · table released",seated:"Seated",completed:"Completed"}[booking.status]||booking.status),
      ),
      node(
        "h3",
        { class: "confirmation-title" },
        booking.status === "pending"
          ? "Your request is in."
          : booking.status === "cancelled"
            ? "This booking was cancelled."
            : "We saved your seat.",
      ),
      node("p", { class: "booking-code" }, booking.code),
      bookingSummary(booking),
      booking.preorder?window.LuminaPreorders.summary(booking.preorder):null,
      node(
        "p",
        { class: "confirmation-copy" },
        booking.status === "pending"
          ? "Your tables are reserved pending review. A manager must approve your request before it is confirmed."
          : "Save your private booking link to view, change, or cancel your reservation.",
      ),
      note(
        "Demo notification only. No email or SMS has been sent. No payment is collected.",
      ),
    );
    const copy = button(
      "Copy private link",
      () => copyLink(copy),
      "button ghost",
    );
    root.append(
      node(
        "div",
        { class: "actions" },
        node("a", { href: access.path, class: "button" }, "My booking"),
        copy,
      ),
      button(
        "Make another reservation",
        () => {
          delete state.confirmation;
          guestDraft = {};
          persist();
          renderSearch();
        },
        "button ghost full",
      ),
    );
    presentStep("confirmation");
  }
  async function refreshManaged() {
    managed = (
      await api("/api/manage?" + queryString({ code: access.code }), {
        headers: authHeaders(),
      })
    ).booking;
  }
  function renderLinkEntry() {
    motion?.stop(root);
    root.replaceChildren();
    const form = node(
      "form",
      { class: "manage-card details-form" },
      node("h2", {}, "Open your private booking link"),
      node(
        "p",
        { class: "confirmation-copy" },
        "Use the complete link saved at confirmation. Your booking reference alone cannot open your personal details.",
      ),
      field("Private booking link", {
        type: "password",
        name: "link",
        required: "",
        autocomplete: "off",
        placeholder: "Paste your saved link",
      }),
    );
    const submit = node(
      "button",
      { type: "submit", class: "button" },
      "Open my booking",
    );
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      busy(submit, async () => {
        access = privateAccess(form.elements.link.value);
        state.managePath = access.path;
        persist();
        await refreshManaged();
        message();
        renderManagement();
      });
    });
    root.append(form);
    presentStep("link");
  }
  function renderManagement({ transition = true } = {}) {
    const active = document.activeElement;
    const restore = !transition && root.contains(active)
      ? { text: active.textContent, href: active.getAttribute("href") } : null;
    motion?.stop(root);
    clearInterval(timer);
    editing = false;
    root.replaceChildren();
    const card = node("div", { class: "manage-card" }),
      info = node("div"),
      aside = node("div", { class: "manage-aside" });
    info.append(
      node(
        "span",
        { class: "status " + managed.status },
        managed.status === "pending"
          ? "Awaiting manager approval"
          : managed.status === "no_show" ? "No-show · table released" : managed.status[0].toUpperCase() + managed.status.slice(1),
      ),
      node("p", { class: "booking-code" }, managed.code),
      bookingSummary(managed),
      managed.preorder?window.LuminaPreorders.summary(managed.preorder):null,
    );
    aside.append(
      node("h3", {}, `For ${managed.guest.full_name}`),
      node(
        "p",
        {},
        managed.guest.phone,
        node("br"),
        managed.guest.email || "No email supplied",
      ),
      node("h3", {}, "Special requests"),
      node("p", {}, managed.special_requests || "None supplied"),
      note("Requests are subject to restaurant confirmation."),
      note(
        Number(managed.room.min_spend_cents)
          ? `Minimum spend ${money(managed.room.min_spend_cents)} per booking. No payment is collected here.`
          : managed.preorder ? "See your saved food and fee quote. No payment is collected online." : "No minimum spend. No payment is collected.",
      ),
    );
    card.append(node("div", { class: "manage-layout" }, info, aside));
    if(catalog.policies_enabled){
      const terms=node('details',{},node('summary',{},'Current reservation terms'));
      for(const text of catalog.terms)terms.append(node('p',{},text));
      card.append(terms,note('Online cancellation and changes close 24 hours before dining. Arrival grace ends 15 minutes after the start; staff cannot seat a party after this cutoff. Overdue, unseated bookings update on the next availability check.'));
      const refund=managed.policy_refund;
      if(refund)card.append(node('h3',{},'Cancellation / no-show reconciliation'),note(`${refund.reviewed?'Manager review recorded':'Manager review pending'}. Retained same-day base: ${money(refund.forfeited_base_cents)}. Eligible actual receipts awaiting refund: ${money(refund.eligible_base_cents+refund.eligible_extra_cents)}. Actual policy refunds recorded: ${money(refund.refunded_cents)}. Refunds are handled onsite; cancellation does not transfer money.`));
    }
    const foodEdits=state.pendingFoodEdits ||= {};
    if((managed.preorder?.status==='scheduled'&&managed.can_manage)||Boolean(foodEdits[managed.code])){
      const editFood=button('Edit food pre-order',()=>{
        editFood.disabled=true;
        const draft={cart:managed.preorder.quote.cart.map(i=>({...i}))};
        const save=button(Boolean(foodEdits[managed.code])?'Retry saving food':'Review updated food and fees',()=>busy(save,async()=>{
          let body=foodEdits[managed.code];
          if(!body){const preorder=await editor.prepare();if(!preorder)return;body={code:managed.code,version:managed.version,preorder};foodEdits[managed.code]=body;persist();editor.lock(true);}
          try{const data=await api('/api/manage/preorders/save',{headers:authHeaders(),body});delete foodEdits[managed.code];persist();managed=data.booking;renderManagement();message('Food pre-order saved. It remains scheduled until arrival.',true);}
          catch(error){if(error.status&&error.status<500){delete foodEdits[managed.code];persist();editor.lock(false);editor.invalidate();}else save.textContent=save.dataset.idleLabel='Retry saving food';throw error;}
        }));
        const editor=window.LuminaPreorders.editor({catalog,draft,locked:Boolean(foodEdits[managed.code]),
          review:async cart=>(await api('/api/manage/preorders/quote',{headers:authHeaders(),body:{code:managed.code,cart}})).quote,
          changed:reviewed=>{save.textContent=save.dataset.idleLabel=reviewed?'Save food pre-order':'Review updated food and fees';}});
        const cancelEdit=button('Keep saved food',()=>{if(foodEdits[managed.code]){message('Retry the pending save first so its outcome can be recovered.');return;}renderManagement();},'button ghost');
        info.append(editor.element,save,cancelEdit);
      });
      card.append(editFood);
    }
    if (managed.can_manage) {
      const edit = button("Change reservation", () => {
        editing = true;
        message();
        renderSearch({
          date: managed.starts_at.slice(0, 10),
          party_size: managed.party_size,
          room_type: managed.room.code,
        });
      });
      const cancel = button(
        "Cancel reservation",
        () => {
          $("#cancel-description").textContent =
            `${managed.code} · ${dateTime(managed.starts_at)} · ${managed.party_size} guests.`;
          $("#cancel-dialog").showModal();
        },
        "button danger",
      );
      card.append(node("div", { class: "actions" }, ...(managed.preorder&&!catalog.policies_enabled?[]:[edit]), cancel));
    } else
      card.append(
        note(
          managed.status === "cancelled"
            ? "Your reservation is cancelled and the tables have been released."
            : "Online changes and cancellation are closed. Please contact venue staff for assistance.",
        ),
      );
    const copy = button(
      "Copy private link",
      () => copyLink(copy),
      "button ghost small",
    );
    card.append(
      node(
        "div",
        { class: "actions" },
        copy,
        note("Contact details are not configured for this academic demo."),
      ),
      node(
        "a",
        { href: access.path, class: "text-link" },
        "Private booking link",
      ),
      note(
        `Private link valid until ${dateTime(managed.link_expires_at)}. Notifications are simulated; no email or SMS has been sent.`,
      ),
    );
    root.append(card);
    presentStep("management", transition);
    if (restore && document.activeElement === document.body) {
      [...root.querySelectorAll("button,a")].find(control =>
        control.textContent === restore.text && control.getAttribute("href") === restore.href
      )?.focus({ preventScroll: true });
    }
  }
  $("#keep-booking").addEventListener("click", () =>
    $("#cancel-dialog").close(),
  );
  $("#confirm-cancel").addEventListener("click", () =>
    busy($("#confirm-cancel"), async () => {
      const data = await api("/api/manage/cancel", {
        headers: authHeaders(),
        body: { code: access.code, version: managed.version },
      });
      managed = data.booking;
      $("#cancel-dialog").close();
      renderManagement();
      message("Reservation cancelled. Your tables have been released.", true);
    }),
  );
  function renderCatalog() {
    const roomPhotos = {
      bv_vip: "round-table-reference.jpg",
      bv_standard: "main-dining-reference.jpg",
      bv_family: "main-dining-reference.jpg",
      vip: "round-table-reference.jpg",
      common: "main-dining-reference.jpg",
      group: "main-dining-reference.jpg",
      terrace: "terrace-reference.jpg",
    };
    function roomPicture(room) {
      const image = node("img", {
        src: "/assets/images/table-showcase/" + roomPhotos[room.code],
        alt: "",
        width: 1200,
        height: 800,
        loading: "lazy",
      });
      const caption = node("span", { class: "room-image-caption" }, "Room inspiration");
      image.addEventListener("error", () => {
        image.hidden = true;
        caption.textContent = "Room picture unavailable";
      }, { once: true });
      return node("div", { class: "room-art " + room.code }, image, caption);
    }
    for (const room of catalog.room_types)
      $("#room-cards").append(
        node(
          "button",
          { class: "room-card", type:"button", "data-room-type":room.code, onclick:event => {
            const rooms = catalog.rooms.filter(r => Number(r.room_type_id) === Number(room.id));
            const table = catalog.tables.find(t => rooms.some(r => Number(r.id) === Number(t.room_id)));
            if (table) showcase?.open(table.id, event.currentTarget);
          } },
          roomPicture(room),
          node(
            "div",
            { class: "room-copy" },
            node("h3", {}, room.name),
            node("span", {class:"showcase-affordance"}, "Explore tables ↗"),
            node("p", {}, room.description),
            node(
              "small",
              {},
              `${room.min_party}–${room.max_party} guests · ${room.min_notice_hours ? room.min_notice_hours + "-hour notice" : "Same-day bookings"}`,
            ),
            node(
              "small",
              {},
              Number(room.min_spend_cents)
                ? `Minimum spend ${money(room.min_spend_cents)}`
                : "No minimum spend",
            ),
          ),
        ),
      );
    motion?.revealRooms($("#room-cards"));
    function menuTags(item) {
      try {
        const tags = JSON.parse(item.tags_json || "[]");
        return Array.isArray(tags) ? tags.filter(tag => typeof tag === "string") : [];
      } catch {
        return [];
      }
    }
    const signature = $("#signature-dish");
    const featured = catalog.menu.find(item => Number(item.is_available) && menuTags(item).includes("signature"));
    if (signature && featured) {
      signature.replaceChildren(
        menuPhotos?.create(featured.image_path, {featured: true}) || node("div", { class: "menu-image", "aria-hidden": "true" }, "Photo pending"),
        node("div", { class: "signature-copy" },
          node("p", { class: "eyebrow" }, "A Bella Vista Dining signature"),
          node("h3", { id: "signature-title" }, featured.name),
          node("p", { class: "signature-description" }, featured.description),
          node("span", { class: "signature-price" }, money(featured.price_cents)),
          node("div", { class: "signature-tags" }, menuTags(featured).map(tag => node("span", {}, tag))),
        ),
      );
      signature.hidden = false;
    }
    const categories = $("#menu-categories");
    const menuStatus = node("p", { class: "response-announcement", role: "status", "aria-atomic": "true" });
    categories.after(menuStatus);
    const all = { id: 0, name: "All dishes" };
    function showMenu(category, transition = true) {
      for (const control of categories.children)
        control.setAttribute(
          "aria-pressed",
          String(Number(control.dataset.category) === Number(category.id)),
        );
      const items = $("#menu-items");
      items.replaceChildren();
      const dishes = catalog.menu.filter(
        (item) => !category.id || Number(item.category_id) === Number(category.id),
      );
      $("#menu-category-title").textContent = category.name;
      $("#menu-category-note").textContent = category.note || "From opening bites to one last glass.";
      $("#menu-result-count").textContent = `${dishes.length} ${dishes.length === 1 ? "item" : "items"}`;
      for (const item of dishes) {
        const tags = menuTags(item);
        items.append(
          node(
            "article",
            { class: "menu-item" },
            menuPhotos?.create(item.image_path) || node("div", {class: "menu-image", "aria-hidden": "true"}, "Photo pending"),
            node(
              "div",
              { class: "menu-item-copy" },
              node(
                "header",
                {},
                node("h3", {}, item.name),
                node("span", { class: "menu-price" }, money(item.price_cents)),
              ),
              node("p", {}, item.description),
              node(
                "div",
                { class: "menu-tags" },
                [
                  ...tags,
                  ...(Number(item.is_available) ? [] : ["Currently unavailable"]),
                ].join(" · "),
              ),
            ),
          ),
        );
      }
      if (transition) {
        menuStatus.textContent = `${category.name}: ${items.children.length} dishes shown.`;
        motion?.enter(items, "menu");
        $(".menu-results-heading").scrollIntoView({block: "nearest", behavior: "auto"});
      }
    }
    for (const category of [all, ...catalog.categories])
      categories.append(
        node(
          "button",
          {
            type: "button",
            "data-category": category.id,
            "aria-controls": "menu-items",
            "aria-pressed": String(!category.id),
            onclick: () => showMenu(category),
          },
          category.name,
        ),
      );
    showMenu(all, false);
  }
  async function restoreHold() {
    const data = await api("/api/holds", {
      headers: { "X-Hold-Token": state.hold.hold_token },
    });
    if (data.hold.booking) {
      await complete(data.hold.booking);
      return;
    }
    state.hold = { ...state.hold, ...data.hold };
    persist();
    if (data.hold.status === "active") renderDetails();
    else {
      if(state.pendingConfirmation?.hold_token===state.hold.hold_token)delete state.pendingConfirmation;
      delete state.hold;
      persist();
      renderSearch();
      message("Your previous hold has ended. Search again to choose a table.");
    }
  }
  async function boot() {
    if (managePage) {
      $(".guest-content").hidden = true;
      $("#manage-workspace").hidden = false;
      $(".skip-link").href = "#manage-workspace";
      $(".skip-link").textContent = "Skip to your booking";
    }
    try {
      const [session, data] = await Promise.all([
        api("/api/session"),
        api("/api/catalog"),
      ]);
      csrf = session.csrf_token;
      catalog = data.catalog;
      if (catalog.profile === "bella_vista_b2") {
        const service = document.querySelector(".hero-service p");
        if (service) service.replaceChildren(document.createTextNode("Tuesday–Sunday, 10:00–22:00"), document.createElement("br"), node("small", {}, "Last seating 20:00 · Closed Monday"));
        const footer = document.querySelector(".site-footer > div > p");
        if (footer) footer.replaceChildren(document.createTextNode("Academic restaurant project · Philippines"), document.createElement("br"), document.createTextNode("Tuesday–Sunday · 10:00–22:00"));
      }
      showcase?.init(catalog, () => {
        const target = $(managePage ? "#manage-workspace" : "#booking");
        target?.scrollIntoView({block:"start",behavior:"instant"});
        (root.querySelector("input,select,button") || target)?.focus({preventScroll:true});
      });
      if (managePage) {
        if (!access && state.managePath && !incomingError)
          access = privateAccess(state.managePath);
        if (access) {
          try {
            await refreshManaged();
            renderManagement();
          } catch (error) {
            renderLinkEntry();
            message(error.message);
          }
        } else {
          renderLinkEntry();
          if (incomingError) message(incomingError);
        }
      } else {
        renderCatalog();
        if (state.hold) {
          try {
            await restoreHold();
          } catch (error) {
            if(state.pendingConfirmation){renderDetails();message('Unable to check your pending confirmation. Retry it to recover the original outcome.');}
            else{delete state.hold;persist();renderSearch();message(error.message);}
          }
        } else if (state.confirmation?.manage_path) {
          access = privateAccess(state.confirmation.manage_path);
          try {
            await refreshManaged();
            renderConfirmation(managed);
          } catch {
            renderConfirmation(state.confirmation);
          }
        } else renderSearch();
      }
    } catch (error) {
      root.replaceChildren(
        note("The booking service could not load."),
        button("Try again", () => location.reload()),
      );
      message(error.message);
    }
  }
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || !catalog) return;
    try {
      if (!managePage && state.hold && $("#hold-countdown")) {
        const data = await api("/api/holds", {
          headers: { "X-Hold-Token": state.hold.hold_token },
        });
        if (data.hold.booking) await complete(data.hold.booking);
        else if (data.hold.status === "active") {
          holdTiming = {
            expires: Number(data.hold.expires_at_epoch),
            server: Number(data.hold.server_time_epoch),
            started: performance.now(),
          };
        } else {
          delete state.hold;
          persist();
          renderSearch(undefined, { transition: false });
          message("Your table hold has ended. Search again to choose a table.");
        }
      } else if (
        managePage &&
        managed &&
        !editing &&
        !$("#cancel-dialog").open
      ) {
        await refreshManaged();
        renderManagement({ transition: false });
      }
    } catch (error) {
      message(error.message);
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  const finishBoot = ui.loading(root, managePage ? "Loading your booking…" : "Loading booking rules…");
  boot().finally(() => { finishBoot(); flowReady = true; });
})();
