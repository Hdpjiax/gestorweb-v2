const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function profileInspectorPolishTests() {
  const css = read("src/renderer/profile-inspector-polish.css");
  const js = read("src/renderer/profile-inspector-polish.js");
  const start = read("src/renderer/browser-redesign-start.js");
  const index = read("index.html");

  assert.match(css, /\.inspector/);
  assert.match(css, /\.inspector-body::-webkit-scrollbar/);
  assert.match(css, /\.inspector \.tabs/);
  assert.match(css, /\.privacy-header/);
  assert.match(css, /\.privacy-flag\.on/);
  assert.match(css, /\.inspector-actions/);
  assert.match(css, /test deteccion/);
  assert.match(css, /\.audit-row/);

  assert.match(js, /installProfileInspectorPolish/);
  assert.match(js, /lastInspectorScroll/);
  assert.match(js, /toggle-profile-flag/);
  assert.match(js, /apply-preset/);
  assert.match(js, /requestAnimationFrame/);

  assert.match(start, /installProfileInspectorPolish/);
  assert.match(index, /profile-inspector-polish\.css/);
};
