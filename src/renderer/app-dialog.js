function ensureDialogStyles() {
  if (document.getElementById("app-dialog-css")) return;
  const link = document.createElement("link");
  link.id = "app-dialog-css";
  link.rel = "stylesheet";
  link.href = "src/renderer/app-dialog.css";
  document.head.appendChild(link);
}

export function appDialog({ title, message, detail = "", confirmText = "Aceptar", cancelText = "Cancelar", tone = "default", input = null }) {
  ensureDialogStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "app-dialog-backdrop";

    const card = document.createElement("div");
    card.className = `app-dialog-card ${tone}`;
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "app-dialog-head";

    const badge = document.createElement("div");
    badge.className = `app-dialog-badge ${tone}`;
    badge.textContent = tone === "danger" ? "!" : "✓";

    const titleBox = document.createElement("div");
    const small = document.createElement("div");
    small.className = "label";
    small.textContent = tone === "danger" ? "Acción sensible" : "Confirmación";
    const h3 = document.createElement("h3");
    h3.textContent = title || "Confirmar";
    titleBox.append(small, h3);
    head.append(badge, titleBox);

    const body = document.createElement("div");
    body.className = "app-dialog-body";
    const p = document.createElement("p");
    p.textContent = message || "";
    body.append(p);

    if (detail) {
      const detailBox = document.createElement("div");
      detailBox.className = "app-dialog-detail mono";
      detailBox.textContent = detail;
      body.append(detailBox);
    }

    let field = null;
    if (input) {
      const label = document.createElement("label");
      label.className = "stack-sm";
      const span = document.createElement("span");
      span.className = "label";
      span.textContent = input.label || "Detalle";
      field = document.createElement(input.multiline ? "textarea" : "input");
      field.className = input.multiline ? "textarea" : "input";
      field.value = input.value || "";
      field.placeholder = input.placeholder || "";
      if (input.multiline) field.rows = input.rows || 3;
      label.append(span, field);
      body.append(label);
    }

    const actions = document.createElement("div");
    actions.className = "app-dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost";
    cancel.textContent = cancelText;
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = tone === "danger" ? "btn btn-danger-solid" : "btn btn-primary";
    ok.textContent = confirmText;
    actions.append(cancel, ok);

    card.append(head, body, actions);
    overlay.append(card);
    document.body.append(overlay);

    let closed = false;
    const close = (value) => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") close(null);
      if (event.key === "Enter" && !event.shiftKey && document.activeElement !== field) close(field ? field.value.trim() : true);
    };

    cancel.addEventListener("click", () => close(null));
    ok.addEventListener("click", () => close(field ? field.value.trim() : true));
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(null); });
    document.addEventListener("keydown", onKey);
    setTimeout(() => (field || ok).focus(), 40);
  });
}
