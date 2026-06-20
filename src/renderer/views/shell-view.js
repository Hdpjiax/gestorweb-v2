import { renderOriginalView } from "./original-view.js";

export function renderShell() {
  return renderOriginalView();
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
