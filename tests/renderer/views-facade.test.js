const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function viewsFacadeTests() {
  const index = read("src/renderer/views/index.js");
  const app = read("src/renderer/app.js");

  assert.match(index, /renderShell/);
  assert.match(index, /renderSidebar/);
  assert.match(index, /renderTopbar/);
  assert.match(index, /renderInfoView/);
  assert.match(index, /renderInspectorView/);
  assert.match(index, /renderInspectorKnownTab/);
  assert.match(index, /renderProfileViewWithRow/);

  assert.match(app, /\.\/views\/index\.js/);
  assert.doesNotMatch(app, /\.\/views\/shell-view\.js/);
};
