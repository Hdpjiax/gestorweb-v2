const assert = require("assert/strict");
const { importEsmFromRepo } = require("../_utils/import-esm");

function setupDom() {
  global.window = {};
  global.document = {
    getElementById: () => ({ innerHTML: "" })
  };
  global.localStorage = {
    getItem: () => null,
    setItem: () => {}
  };
}

module.exports = async function inspectorTabsTests() {
  setupDom();
  const notes = await importEsmFromRepo("src/renderer/views/inspector-notes-tab.js");
  const logs = await importEsmFromRepo("src/renderer/views/inspector-logs-tab.js");
  const macros = await importEsmFromRepo("src/renderer/views/inspector-macros-tab.js");

  const profile = {
    id: "p1",
    name: "Perfil <Uno>",
    url: "https://example.com",
    group_tag: "ventas",
    notes: "nota",
    macros: [{ id: "m1", name: "Macro 1", steps: [{ type: "open" }] }]
  };

  const notesHtml = notes.renderInspectorNotesTab(profile);
  assert.match(notesHtml, /notesForm/);
  assert.match(notesHtml, /Perfil &lt;Uno&gt;/);
  assert.match(notesHtml, /guardar notas/);

  const logsHtml = logs.renderInspectorLogsTab(profile);
  assert.match(logsHtml, /sin actividad/);

  const macrosHtml = macros.renderInspectorMacrosTab(profile);
  assert.match(macrosHtml, /Macro 1/);
  assert.match(macrosHtml, /1 pasos/);
};
