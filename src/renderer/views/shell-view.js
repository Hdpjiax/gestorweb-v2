import { state } from "../state.js";
import { profileById } from "../utils.js";
import { renderSidebar } from "./sidebar-view.js";
import { renderTopbar } from "./topbar-view.js";
import { renderGlobalBar } from "./global-bar-view.js";
import { renderView } from "./view-router.js";
import { renderInfoView } from "./info-view-router.js";
import { renderLegacyOverlays } from "./overlay-view.js";
import { renderInspectorView } from "./inspector-view.js";
import { renderInspectorKnownTab } from "./inspector-tab-router.js";
import { renderInspectorActions } from "./inspector-actions-view.js";

const MODULAR_INFO_VIEWS = new Set(["history", "stats", "settings", "monitor", "schedules", "browse"]);
const PROFILE_VIEWS = new Set(["all", "live"]);

export function renderShell() {
  const isModularInfo = MODULAR_INFO_VIEWS.has(state.view);
  const isProfileView = PROFILE_VIEWS.has(state.view);
  const selectedProfile = isProfileView ? profileById(state.selectedId) : null;

  const main = isModularInfo
    ? renderInfoView(state.view)
    : renderView();

  const inspector = isProfileView
    ? renderInspectorView(
        selectedProfile,
        (profile) => renderInspectorKnownTab(profile),
        (profile) => renderInspectorActions(profile)
      )
    : "";

  return renderShellFrame({
    sidebar: renderSidebar(),
    topbar: renderTopbar(),
    main,
    inspector,
    overlays: renderLegacyOverlays(),
    showInspector: isProfileView,
    viewClass: state.view === "browse" ? "browse-shell" : ""
  });
}

export function renderShellFrame({
  sidebar = "",
  topbar = "",
  main = "",
  inspector = "",
  overlays = "",
  showInspector = false,
  viewClass = ""
} = {}) {
  return `
    <div class="application-frame ${viewClass}">
      ${renderGlobalBar()}
      <div class="app-shell ${showInspector ? "" : "no-inspector"}">
        ${sidebar}
        <div class="workspace">
          ${topbar}
          <main class="content">${main}</main>
        </div>
        ${showInspector ? inspector : ""}
      </div>
    </div>
    ${overlays}
  `;
}
