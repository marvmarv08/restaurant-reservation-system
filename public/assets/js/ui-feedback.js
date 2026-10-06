"use strict";
(() => {
  const loadingRegions = new WeakMap();
  const announcement = document.createElement("p");
  announcement.className = "response-announcement";
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-atomic", "true");
  document.body.append(announcement);

  function announce(text) {
    if (announcement.textContent !== text) announcement.textContent = text;
  }

  function pendingLabel(control) {
    if (control.dataset.pendingLabel) return control.dataset.pendingLabel;
    const label = control.textContent.trim();
    if (/^Find/i.test(label)) return "Checking tables…";
    if (/^Continue with/i.test(label)) return "Holding table…";
    if (/^Confirm reservation/i.test(label)) return "Confirming…";
    if (/^Submit booking/i.test(label)) return "Submitting…";
    if (/^Confirm cancel/i.test(label)) return "Cancelling…";
    if (/^Copy/i.test(label)) return "Copying…";
    if (/^Sign in$/i.test(label)) return "Signing in…";
    if (/^Sign out/i.test(label)) return "Signing out…";
    if (/^Activate/i.test(label)) return "Activating…";
    if (/^Save/i.test(label)) return "Saving…";
    if (/^Send/i.test(label)) return "Sending…";
    if (/^Refresh|^Show time|^Previous|^Next|^Open/i.test(label)) return "Loading…";
    if (/^Retry/i.test(label)) return "Retrying…";
    if (/^Add/i.test(label)) return "Adding…";
    if (/^Create/i.test(label)) return "Creating…";
    if (/^Remove/i.test(label)) return "Removing…";
    return "Updating…";
  }

  function pending(control, label = control && pendingLabel(control)) {
    if (!control) return () => {};
    const original = [...control.childNodes];
    const attributes = ["aria-busy", "aria-label"].map(name => [name, control.getAttribute(name)]);
    const wasDisabled = control.disabled;
    const retained = document.createElement("span");
    retained.className = "response-original-label";
    retained.setAttribute("aria-hidden", "true");
    retained.append(...original);
    const visible = document.createElement("span");
    visible.className = "response-pending-label";
    visible.textContent = label;
    // Retaining the original label in layout keeps the button's size unchanged.
    control.replaceChildren(retained, visible);
    control.classList.add("is-pending");
    control.setAttribute("aria-busy", "true");
    control.setAttribute("aria-label", label);
    control.disabled = true;
    announce(label);
    let finished = false;
    return (keepDisabled = false) => {
      if (finished) return;
      finished = true;
      control.replaceChildren(...original);
      control.classList.remove("is-pending");
      for (const [name, value] of attributes) {
        if (value === null) control.removeAttribute(name);
        else control.setAttribute(name, value);
      }
      control.disabled = wasDisabled || keepDisabled;
      if (announcement.textContent === label) announce("");
    };
  }

  function loading(target, text, { tables = false } = {}) {
    loadingRegions.get(target)?.();
    const previousBusy = target.getAttribute("aria-busy");
    const holder = document.createElement("div");
    holder.className = "response-loading" + (tables ? " response-loading-tables" : "");
    const status = document.createElement("p");
    status.className = "loading";
    status.textContent = text;
    holder.append(status);
    target.replaceChildren(holder);
    target.setAttribute("aria-busy", "true");
    announce(text);
    // Only a slow initial/search load gets placeholders; never use these for polling.
    const timer = tables ? setTimeout(() => {
      if (!holder.isConnected || holder.parentNode !== target) return;
      const skeleton = document.createElement("div");
      skeleton.className = "response-skeleton";
      skeleton.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 8; i++) skeleton.append(document.createElement("span"));
      holder.append(skeleton);
    }, 200) : null;
    const finish = () => {
      clearTimeout(timer);
      if (loadingRegions.get(target) !== finish) return;
      loadingRegions.delete(target);
      holder.remove();
      if (previousBusy === null) target.removeAttribute("aria-busy");
      else target.setAttribute("aria-busy", previousBusy);
      if (announcement.textContent === text) announce("");
    };
    loadingRegions.set(target, finish);
    return finish;
  }

  function message(target, text = "", { kind = "error", focus = false } = {}) {
    target.setAttribute("role", kind === "error" ? "alert" : "status");
    target.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    target.setAttribute("aria-atomic", "true");
    target.classList.add("response-message");
    target.classList.toggle("success", kind === "success");
    target.dataset.kind = kind;
    target.hidden = !text;
    // Repeated polling failures must not re-announce an unchanged message.
    if (target.textContent !== text) target.textContent = text;
    if (text && focus) target.focus();
  }

  window.LuminaFeedback = Object.freeze({ pending, loading, message });
})();
