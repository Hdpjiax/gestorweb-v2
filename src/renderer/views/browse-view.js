import { state, ui, native, rerender } from "../state.js";
import { renderBrowserActive } from "./browser-active-view.js";
import { renderBrowserEmpty } from "./browser-empty-view.js";
import { renderBrowserTabs } from "./browser-tabs-view.js";
import { renderBrowserToolbar } from "./browser-toolbar-view.js";

function ensureBrowserIp(profileId) {
  if (!profileId || !native?.browse?.ipcheck) return;
  if (ui.browserIpProfileId === profileId && ui.browserIp) return;
  if (ui.browserIpProfileId === profileId && ui.browserIpStatus === "consultando...") return;

  ui.browserIpProfileId = profileId;
  ui.browserIp = null;
  ui.browserIpStatus = "consultando...";

  native.browse.ipcheck(profileId).then((result) => {
    if (ui.browserIpProfileId !== profileId) return;
    ui.browserIp = result?.ip || null;
    ui.browserIpStatus = ui.browserIp || "sin respuesta";
    rerender();
  }).catch(() => {
    if (ui.browserIpProfileId !== profileId) return;
    ui.browserIp = null;
    ui.browserIpStatus = "no disponible";
    rerender();
  });
}

export function renderBrowseView() {
  const activeTab = state.browserTabs.find((tab) => tab.id === state.activeTabId) || null;
  if (activeTab?.profileId) {
    ui.browserProfileId = activeTab.profileId;
    ensureBrowserIp(activeTab.profileId);
  }

  return `
    <div class="browser browser-pro">
      ${renderBrowserTabs()}
      ${renderBrowserToolbar(activeTab)}
      <div class="browser-stage">${activeTab ? renderBrowserActive(activeTab) : renderBrowserEmpty()}</div>
    </div>
  `;
}
