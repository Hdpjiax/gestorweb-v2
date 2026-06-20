const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function browserCorrectionsTests() {
  const state = read("src/renderer/state.js");
  const topbar = read("src/renderer/views/topbar-view.js");
  const preload = read("preload.js");
  const ipc = read("src/main/ipc.js");
  const main = read("main.js");
  const start = read("src/renderer/browser-redesign-start.js");

  assert.match(state, /browserIp/);
  assert.match(state, /clearBrowserRuntime/);
  assert.match(state, /browserTabs: \[\]/);
  assert.match(state, /activeTabId: null/);

  assert.match(topbar, /renderBrowserIpPill/);
  assert.match(topbar, /IP:/);
  assert.match(topbar, /activeBrowserProfile/);

  assert.match(preload, /browse:ipcheck/);
  assert.match(ipc, /profileIpCheck/);
  assert.match(ipc, /api\.ipify\.org/);

  assert.match(main, /clearBrowserSessionsOnExit/);
  assert.match(main, /before-quit/);

  assert.match(start, /DEFAULT_SEARCH_HOME/);
  assert.match(start, /Primero selecciona un perfil/);
};
