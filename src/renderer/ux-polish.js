const UX_STYLE_ID = "gestor-ux-polish";

const UX_CSS = `
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --ring: 0 0 0 3px rgb(124 92 255 / 0.28);
}

body.using-keyboard :is(button, input, select, textarea, [tabindex]):focus-visible {
  outline: 0;
  box-shadow: var(--ring);
}

button,
.input,
.select,
.textarea,
.segment,
.proxy-row,
.row-grid,
.palette-row,
.quick-link,
.privacy-flag,
.preset-btn,
.toggle-btn {
  -webkit-tap-highlight-color: transparent;
}

.btn,
.icon-btn,
.icon-btn-sm,
.nav-btn,
.tab,
.palette-row,
.quick-link,
.privacy-flag,
.preset-btn,
.toggle-btn {
  will-change: transform, background, border-color, color;
}

.btn:active,
.icon-btn:active,
.icon-btn-sm:active,
.nav-btn:active,
.quick-link:active,
.palette-row:active,
.preset-btn:active,
.toggle-btn:active {
  transform: translateY(1px) scale(0.99);
}

.panel-card,
.metric,
.callout,
.proxy-table-card,
.proxy-hero,
.modal-card,
.palette {
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.035), 0 18px 60px rgb(0 0 0 / 0.16);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(18px);
  background: rgb(16 21 29 / 0.92);
}

.sidebar {
  position: relative;
  background:
    linear-gradient(180deg, rgb(16 21 29 / 0.98), rgb(10 14 20 / 0.98)),
    var(--bg-panel);
}

.nav-btn.active {
  position: relative;
}

.nav-btn.active::before {
  content: "";
  position: absolute;
  left: -12px;
  width: 3px;
  height: 22px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 18px rgb(124 92 255 / 0.5);
}

.row-grid,
.proxy-row,
.metric,
.quick-link,
.privacy-flag {
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.row-grid:hover,
.proxy-row:hover,
.quick-link:hover,
.privacy-flag:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.16);
}

.row-grid.selected,
.proxy-row.selected {
  border-color: rgb(124 92 255 / 0.48);
  box-shadow: 0 0 0 1px rgb(124 92 255 / 0.12), 0 16px 40px rgb(0 0 0 / 0.18);
}

.empty {
  padding: 32px;
}

.empty > div {
  max-width: 420px;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: var(--radius-lg);
  padding: 28px;
  background:
    radial-gradient(circle at top, rgb(124 92 255 / 0.12), transparent 38%),
    rgb(16 21 29 / 0.76);
}

.empty-title {
  font-size: 20px;
  letter-spacing: -0.03em;
}

.small-note,
.subtitle,
.total,
.crumb,
.label {
  text-wrap: pretty;
}

.pill {
  border: 1px solid rgb(255 255 255 / 0.04);
}

.pill.live .dot,
.live .dot {
  box-shadow: 0 0 0 4px rgb(34 197 94 / 0.1);
}

.input::placeholder,
.textarea::placeholder {
  color: color-mix(in srgb, var(--dim) 82%, transparent);
}

.input:hover,
.select:hover,
.textarea:hover {
  border-color: rgb(255 255 255 / 0.12);
}

.input:focus,
.select:focus,
.textarea:focus {
  box-shadow: var(--ring);
}

.modal-backdrop {
  animation: ux-fade-in 0.14s ease-out;
}

.modal-card,
.palette {
  animation: ux-pop-in 0.16s ease-out;
}

.browser-toolbar .input {
  min-width: 220px;
}

.browser-tab {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webview-shell {
  box-shadow: 0 18px 60px rgb(0 0 0 / 0.22);
}

.toast-region {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 80;
  display: grid;
  gap: 8px;
  pointer-events: none;
}

.toast {
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 12px;
  padding: 11px 13px;
  color: var(--text);
  background: rgb(16 21 29 / 0.94);
  box-shadow: 0 18px 60px rgb(0 0 0 / 0.26);
  animation: ux-slide-up 0.18s ease-out;
  font-size: 12px;
}

@media (max-width: 1280px) {
  .app-shell {
    grid-template-columns: 60px minmax(0, 1fr) 340px;
  }

  .top-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

@media (max-width: 820px) {
  .screen,
  .section,
  .modal-body {
    padding: 18px;
  }

  .sidebar {
    padding-top: 10px;
  }

  .top-actions,
  .flex,
  .between {
    flex-wrap: wrap;
  }

  .top-actions .input,
  .top-actions .select {
    width: 100% !important;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }

  .modal-backdrop {
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}

@keyframes ux-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ux-pop-in {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes ux-slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function injectUxStyles() {
  if (document.getElementById(UX_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = UX_STYLE_ID;
  style.textContent = UX_CSS;
  document.head.appendChild(style);
}

function installKeyboardFocusMode() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") document.body.classList.add("using-keyboard");
  });

  document.addEventListener("pointerdown", () => {
    document.body.classList.remove("using-keyboard");
  });
}

function ensureToastRegion() {
  let region = document.querySelector(".toast-region");
  if (region) return region;
  region = document.createElement("div");
  region.className = "toast-region";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "true");
  document.body.appendChild(region);
  return region;
}

function labelIconButtons(root = document) {
  root.querySelectorAll("button").forEach((button) => {
    if (!button.getAttribute("aria-label")) {
      const title = button.getAttribute("title");
      const text = button.textContent.trim();
      if (title) button.setAttribute("aria-label", title);
      else if (text) button.setAttribute("aria-label", text);
    }
  });
}

function markModalCards(root = document) {
  root.querySelectorAll(".modal-card, .palette").forEach((modal) => {
    if (!modal.getAttribute("role")) modal.setAttribute("role", "dialog");
    if (!modal.getAttribute("aria-modal")) modal.setAttribute("aria-modal", "true");
  });
}

function enhanceDynamicUi() {
  labelIconButtons();
  markModalCards();
}

function installMutationEnhancer() {
  const observer = new MutationObserver(() => enhanceDynamicUi());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  requestAnimationFrame(enhanceDynamicUi);
}

function installCopyFeedback() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("[data-action]");
    if (!target) return;
    const action = target.dataset.action || "";
    if (!/^copy-/.test(action)) return;
    const region = ensureToastRegion();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = "Copiado al portapapeles";
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  });
}

export function installUxPolish() {
  injectUxStyles();
  installKeyboardFocusMode();
  installMutationEnhancer();
  installCopyFeedback();
}
