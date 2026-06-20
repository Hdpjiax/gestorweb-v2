const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function monitorViewTests() {
  const monitor = read("src/renderer/views/monitor-view.js");
  const router = read("src/renderer/views/info-view-router.js");
  const shell = read("src/renderer/views/shell-view.js");

  assert.match(monitor, /export function renderMonitorView/);
  assert.match(monitor, /state\.liveIds\.includes/);
  assert.match(monitor, /Sin perfiles activos/);

  assert.match(router, /renderMonitorView/);
  assert.match(router, /view === "monitor"/);
  assert.match(shell, /"monitor"/);
};
