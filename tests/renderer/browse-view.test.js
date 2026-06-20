const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function browseViewTests() {
  const browse = read("src/renderer/views/browse-view.js");
  const tabs = read("src/renderer/views/browser-tabs-view.js");
  const toolbar = read("src/renderer/views/browser-toolbar-view.js");
  const active = read("src/renderer/views/browser-active-view.js");
  const empty = read("src/renderer/views/browser-empty-view.js");
  const router = read("src/renderer/views/info-view-router.js");
  const shell = read("src/renderer/views/shell-view.js");
  const facade = read("src/renderer/views/index.js");
  const polish = read("src/renderer/browser-polish.css");
  const size = read("src/renderer/browser-size.css");
  const cleanToolbar = read("src/renderer/browser-clean-toolbar.css");
  const toolbarActions = read("src/renderer/browser-toolbar-actions.js");
  const start = read("src/renderer/browser-redesign-start.js");
  const index = read("index.html");

  assert.match(browse, /export function renderBrowseView/);
  assert.match(browse, /renderBrowserTabs/);
  assert.match(browse, /renderBrowserToolbar/);
  assert.match(browse, /renderBrowserActive/);
  assert.match(browse, /renderBrowserEmpty/);
  assert.match(browse, /ensureBrowserIp/);

  assert.match(tabs, /browser-new-tab/);
  assert.match(tabs, /activate-browser-tab/);
  assert.match(tabs, /close-browser-tab/);
  assert.match(tabs, /browser-tab-plus/);

  assert.match(toolbar, /clean-browser-toolbar/);
  assert.match(toolbar, /browser-back/);
  assert.match(toolbar, /browser-forward/);
  assert.match(toolbar, /browser-reload/);
  assert.match(toolbar, /browser-go/);
  assert.match(toolbar, /browserProfile/);
  assert.match(toolbar, /browserUrl/);
  assert.match(toolbar, /clean-profile-picker/);
  assert.match(toolbar, /select-browser-profile/);
  assert.match(toolbar, /browser-toggle-muted/);
  assert.match(toolbar, /browser-open-devtools/);
  assert.match(toolbar, /browser-pin-tab/);
  assert.match(toolbar, /browser-refresh-all/);
  assert.doesNotMatch(toolbar, /browser-toolbar-reference/);

  assert.match(cleanToolbar, /clean-browser-toolbar/);
  assert.match(cleanToolbar, /browser-toolbar-reference/);
  assert.match(cleanToolbar, /clean-nav-btn/);
  assert.match(cleanToolbar, /display: none !important/);

  assert.match(toolbarActions, /installBrowserToolbarActions/);
  assert.match(toolbarActions, /browser-toggle-muted/);
  assert.match(toolbarActions, /browser-open-devtools/);
  assert.match(toolbarActions, /browser-pin-tab/);
  assert.match(toolbarActions, /browser-refresh-all/);

  assert.match(active, /webview-frame/);
  assert.match(active, /open-external/);

  assert.match(empty, /browser-empty-screen/);
  assert.match(empty, /browser-empty-panel/);
  assert.match(empty, /quick-open/);
  assert.match(empty, /disabled/);

  assert.match(polish, /browser-empty-screen/);
  assert.match(polish, /browser-empty-panel/);
  assert.match(size, /flex-direction: row/);
  assert.match(index, /browser-polish\.css/);
  assert.match(index, /browser-size\.css/);
  assert.match(index, /browser-clean-toolbar\.css/);

  assert.match(start, /DEFAULT_SEARCH_HOME/);
  assert.match(start, /duckduckgo\.com/);
  assert.match(start, /Primero selecciona un perfil/);
  assert.match(start, /installBrowserToolbarActions/);

  assert.match(router, /renderBrowseView/);
  assert.match(router, /view === "browse"/);
  assert.match(shell, /"browse"/);
  assert.match(facade, /renderBrowseView/);
};
