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
  const topbarView = read("src/renderer/views/topbar-view.js");
  const globalBar = read("src/renderer/views/global-bar-view.js");
  const globalCss = read("src/renderer/global-topbar.css");

  assert.match(css, /\.app-shell \.topbar/);
  assert.match(css, /visibility: visible/);
  assert.match(css, /height: 74px/);
  assert.match(css, /\.app-shell \.content/);
  assert.match(index, /topbar-always\.css/);
  assert.match(shell, /renderTopbar/);
  assert.match(shell, /renderGlobalBar/);
  assert.match(shell, /application-frame/);
  assert.match(topbarView, /renderTopbar/);
  assert.match(globalBar, /global-app-bar/);
  assert.match(globalBar, /globalIpValue/);
  assert.match(globalBar, /toggle-resource-mode/);
  assert.match(globalCss, /grid-template-rows: 34px minmax\(0, 1fr\)/);
};
