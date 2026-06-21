const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function profileBrowserTests() {
  const html = read("profile-browser.html");
  const css = read("profile-browser.css");
  const browser = read("profile-browser.js");
  const windows = read("src/main/windows.js");
  const actions = read("src/renderer/actions.js");
  const modal = read("src/renderer/views/new-profile-modal-view.js");
  const fingerprint = read("src/renderer/fingerprint.js");

  assert.match(html, /id="tabTitle"/);
  assert.match(html, /id="addressInput"/);
  assert.match(html, /id="blankSurface"/);
  assert.match(css, /\.blank-surface/);
  assert.match(css, /-webkit-app-region: drag/);
  assert.match(browser, /if \(startUrl\) navigate\(startUrl\);\s*else showBlank\(\);/);
  assert.match(browser, /duckduckgo\.com\/\?q=/);
  assert.match(browser, /canGoBack/);
  assert.match(browser, /canGoForward/);

  assert.match(windows, /openManagedProfileWindow/);
  assert.match(windows, /profile-browser\.html/);
  assert.match(windows, /startUrl \|\| profile\.url \|\| ""/);
  assert.match(windows, /setCertificateVerifyProc/);

  assert.doesNotMatch(actions, /forceFirefoxFingerprint/);
  assert.match(actions, /template_id: template\.id/);
  assert.match(modal, /selectedTemplate/);
  assert.match(fingerprint, /templateId: template\.id/);
  assert.match(fingerprint, /Chrome\/126\.0\.0\.0/);
};
