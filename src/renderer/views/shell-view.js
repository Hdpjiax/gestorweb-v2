import { state } from "../state.js";
import { renderOriginalView } from "./original-view.js";
import { renderSidebar } from "./sidebar-view.js";
import { renderTopbar } from "./topbar-view.js";
import { renderInfoView } from "./info-view-router.js";
import { renderLegacyOverlays } from "./overlay-view.js";

const MODULAR_INFO_VIEWS = new Set(["history", "stats", "settings"]);

export function renderShell() {
  if (!MODULAR_INFO_VIEWS.has(state.view)) return renderOriginalView();

  return renderShellFrame({
    sidebar: renderSidebar(),
    topbar: renderTopbar(),
    main: renderInfoView(state.view),
    overlays: renderLegacyOverlays(),
    showInspector: false
  });
}

export function renderShellFrame({ sidebar = "", topbar = "", main = "", inspector = "", overlays = "", showInspector = false } = {}) {
  return `
    <div class="app-shell ${showInspector ? "" : "no-inspector"}">
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
