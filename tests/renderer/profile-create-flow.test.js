const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function profileCreateFlowTests() {
  const actions = read("src/renderer/actions.js");
  const modal = read("src/renderer/views/new-profile-modal-view.js");
  const icons = read("src/renderer/icons.js");
  const createStart = actions.indexOf("function createProfile(event)");
  const closeState = actions.indexOf("ui.newProfile = false;", createStart);
  const stateUpdate = actions.indexOf("update((s) =>", createStart);

  assert.ok(createStart >= 0);
  assert.ok(closeState > createStart && closeState < stateUpdate, "el modal debe cerrarse antes del render de update");
  assert.match(actions, /function toggleProfileAdvanced\(\)/);
  assert.match(actions, /fields\.hidden = !ui\.profileAdvanced/);
  assert.match(modal, /id="profileAdvancedFields"/);
  assert.match(modal, /renderProfileAdvancedFields\(selectedTemplate\)/);
  assert.match(icons, /android_chrome[\s\S]*deviceScaleFactor: 2\.625/);
  assert.match(icons, /iphone_safari[\s\S]*deviceScaleFactor: 3/);
};
