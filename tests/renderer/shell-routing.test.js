const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function shellRoutingTests() {
  const shell = read("src/renderer/views/shell-view.js");

  assert.match(shell, /MODULAR_INFO_VIEWS/);
  assert.match(shell, /history/);
  assert.match(shell, /stats/);
  assert.match(shell, /settings/);
  assert.match(shell, /renderSidebar/);
  assert.match(shell, /renderTopbar/);
  assert.match(shell, /renderInfoView\(state\.view\)/);
  assert.match(shell, /renderOriginalView\(\)/);
};
