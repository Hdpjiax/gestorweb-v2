const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function infoViewsTests() {
  const history = read("src/renderer/views/history-view.js");
  const stats = read("src/renderer/views/stats-view.js");
  const settings = read("src/renderer/views/settings-view.js");
  const network = read("src/renderer/views/network-view.js");
  const app = read("src/renderer/app.js");
  const router = read("src/renderer/views/info-view-router.js");

  assert.match(history, /export function renderHistoryView/);
  assert.match(history, /state\.events/);
  assert.match(history, /sin eventos/);

  assert.match(stats, /export function renderStatsView/);
  assert.match(stats, /statCard/);
  assert.match(stats, /Actividad ultimos 7 dias/);
  assert.match(stats, /topProfilesHtml/);

  assert.match(settings, /export function renderSettingsView/);
  assert.match(settings, /Token vault/);
  assert.match(settings, /open-data-dir/);

  assert.match(network, /renderNetworkEntryList/);
  assert.match(network, /load-network-entry/);
  assert.match(network, /enviar modificado/);
  assert.match(network, /requestHeaders/);
  assert.match(app, /network:event/);
  assert.match(app, /capturePreview/);

  assert.match(router, /renderHistoryView/);
  assert.match(router, /renderStatsView/);
  assert.match(router, /renderSettingsView/);
};
