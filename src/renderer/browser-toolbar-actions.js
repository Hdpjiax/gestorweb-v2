import { state, update } from "./state.js";
import { activeWebview } from "./utils.js";

function toggleMuted() {
  const webview = activeWebview();
  if (!webview?.setAudioMuted) return;
  webview.setAudioMuted(!webview.isAudioMuted?.());
}

function openDevtools() {
  const webview = activeWebview();
  if (webview?.openDevTools) webview.openDevTools();
}

function pinActiveTab() {
  const tabId = state.activeTabId;
  if (!tabId) return;
  update((next) => {
    const tab = next.browserTabs.find((item) => item.id === tabId);
    if (!tab) return;
    tab.pinned = !tab.pinned;
    next.browserTabs = [...next.browserTabs].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  });
}

function refreshAllTabs() {
  document.querySelectorAll("webview[data-tab-id]").forEach((webview) => webview.reload?.());
}

export function installBrowserToolbarActions() {
  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    if (!["browser-toggle-muted", "browser-open-devtools", "browser-pin-tab", "browser-refresh-all"].includes(action)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (action === "browser-toggle-muted") toggleMuted();
    if (action === "browser-open-devtools") openDevtools();
    if (action === "browser-pin-tab") pinActiveTab();
    if (action === "browser-refresh-all") refreshAllTabs();
  }, true);
}
