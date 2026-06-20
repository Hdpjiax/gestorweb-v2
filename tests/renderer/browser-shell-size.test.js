const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function browserShellSizeTests() {
  const shell = read("src/renderer/views/shell-view.js");
  const size = read("src/renderer/browser-size.css");
  const index = read("index.html");

  assert.match(shell, /viewClass/);
  assert.match(shell, /browse-shell/);
  assert.match(size, /\.browse-shell/);
  assert.match(size, /row-reverse/);
  assert.match(size, /\.browse-shell \.browser-stage/);
  assert.match(size, /height: 100%/);
  assert.match(index, /browser-size\.css/);
};
