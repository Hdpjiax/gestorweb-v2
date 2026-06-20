import { state } from "../state.js";
import { renderSidebar } from "./sidebar-view.js";
import { renderTopbar } from "./topbar-view.js";
import { renderView } from "./view-router.js";
import { renderInfoView } from "./info-view-router.js";
import { renderLegacyOverlays } from "./overlay-view.js";

const MODULAR_INFO_VIEWS = new Set(["history", "stats", "settings", "monitor", "schedules", "browse"]);

export function renderShell() {
  const main = MODULAR_INFO_VIEWS.has(state.view)
    ? renderInfoView(state.view)
    : renderView();

  return renderShellFrame({
    sidebar: renderSidebar(),
    topbar: renderTopbar(),
    main,
    overlays: renderLegacyOverlays(),
    showInspector: false,
    viewClass: state.view === "browse" ? "browse-shell" : ""
  });
}

export function renderShellFrame({ sidebar = "", topbar = "", main = "", inspector = "", overlays = "", showInspector = false, viewClass = "" } = {}) {
  return `
    <div class="app-shell ${showInspector ? "" : "no-inspector"} ${viewClass}">
      ${sidebar}
      <div class="workspace">
        ${topbar}
        <main class="content">${main}</main>
      </div>
      ${showInspector ? inspector : ""}
    </div>
    ${overlays}
  `;
}
