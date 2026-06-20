import { esc } from "../helpers.js";
import { state } from "../state.js";
import { ICONS } from "../icons.js";

export function renderBrowserTabs() {
  const tabs = state.browserTabs.map((tab) => `
    <div class="browser-tab-wrap ${tab.id === state.activeTabId ? "active" : ""}">
      <button class="browser-tab" data-action="activate-browser-tab" data-id="${tab.id}">
        <span class="tab-spinner">0</span>
        <span class="tab-title">${esc(tab.title || tab.url || "Nueva pestana")}</span>
      </button>
      <button class="tab-close" data-action="close-browser-tab" data-id="${tab.id}">${ICONS.close}</button>
    </div>
  `).join("");

  return `<div class="browser-tabs browser-tabs-reference">${tabs}<button class="browser-tab-plus" data-action="browser-new-tab">+</button><span class="browser-tor-state">◇ TOR</span></div>`;
}
