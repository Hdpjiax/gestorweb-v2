import { state } from "../state.js";
import { renderBrowserActive } from "./browser-active-view.js";
import { renderBrowserEmpty } from "./browser-empty-view.js";
import { renderBrowserTabs } from "./browser-tabs-view.js";
import { renderBrowserToolbar } from "./browser-toolbar-view.js";

export function renderBrowseView() {
  const activeTab = state.browserTabs.find((tab) => tab.id === state.activeTabId) || null;

  return `
    <div class="browser">
      ${renderBrowserTabs()}
      ${renderBrowserToolbar(activeTab)}
      <div class="browser-stage">${activeTab ? renderBrowserActive(activeTab) : renderBrowserEmpty()}</div>
    </div>
  `;
}
