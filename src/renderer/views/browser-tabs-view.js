import { esc } from "../helpers.js";
import { state } from "../state.js";
import { ICONS } from "../icons.js";

export function renderBrowserTabs() {
  const tabs = state.browserTabs.map((tab) => `
    <div class="browser-tab-wrap ${tab.id === state.activeTabId ? "active" : ""}">
      <button class="browser-tab" data-action="activate-browser-tab" data-id="${tab.id}">${esc(tab.title || tab.url)}</button>
      <button class="tab-close" data-action="close-browser-tab" data-id="${tab.id}">${ICONS.close}</button>
    </div>
  `).join("");

  return `<div class="browser-tabs">${tabs}<button class="btn btn-primary" data-action="browser-new-tab">+ nueva pestana</button></div>`;
}
