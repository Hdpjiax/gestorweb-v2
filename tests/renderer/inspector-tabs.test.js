const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function inspectorTabsTests() {
  const notes = read("src/renderer/views/inspector-notes-tab.js");
  const logs = read("src/renderer/views/inspector-logs-tab.js");
  const macros = read("src/renderer/views/inspector-macros-tab.js");
  const router = read("src/renderer/views/inspector-tab-router.js");

  assert.match(notes, /export function renderInspectorNotesTab/);
  assert.match(notes, /notesForm/);
  assert.match(notes, /guardar notas/);
  assert.match(notes, /attr\(profile\.name\)/);
  assert.match(notes, /esc\(profile\.notes/);

  assert.match(logs, /export function renderInspectorLogsTab/);
  assert.match(logs, /state\.events\.filter/);
  assert.match(logs, /sin actividad/);
  assert.match(logs, /slice\(0, 40\)/);

  assert.match(macros, /export function renderInspectorMacrosTab/);
  assert.match(macros, /profile\.macros/);
  assert.match(macros, /warmup/);
  assert.match(macros, /run-macro/);

  assert.match(router, /renderInspectorNotesTab/);
  assert.match(router, /renderInspectorLogsTab/);
  assert.match(router, /renderInspectorMacrosTab/);
};
