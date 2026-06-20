const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function topbarAlwaysTests() {
  const css = read("src/renderer/topbar-always.css");
  const index = read("index.html");
  const shell = read("src/renderer/views/shell-view.js");
  const legacyViews = read("src/renderer/views.js");

  assert.match(css, /\.app-shell \.topbar/);
  assert.match(css, /visibility: visible/);
  assert.match(css, /height: 74px/);
  assert.match(css, /\.app-shell \.content/);
  assert.match(index, /topbar-always\.css/);
  assert.match(shell, /renderTopbar/);
  assert.match(legacyViews, /renderTopbar/);
};
