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

  assert.match(browse, /export function renderBrowseView/);
  assert.match(browse, /renderBrowserTabs/);
  assert.match(browse, /renderBrowserToolbar/);
  assert.match(browse, /renderBrowserActive/);
  assert.match(browse, /renderBrowserEmpty/);

  assert.match(tabs, /browser-new-tab/);
  assert.match(tabs, /activate-browser-tab/);
  assert.match(tabs, /close-browser-tab/);

  assert.match(toolbar, /browser-go/);
  assert.match(toolbar, /browserProfile/);
  assert.match(toolbar, /browserUrl/);

  assert.match(active, /webview-frame/);
  assert.match(active, /open-external/);

  assert.match(empty, /quick-grid/);
  assert.match(empty, /quick-open/);

  assert.match(router, /renderBrowseView/);
  assert.match(router, /view === "browse"/);
  assert.match(shell, /"browse"/);
  assert.match(facade, /renderBrowseView/);
};
