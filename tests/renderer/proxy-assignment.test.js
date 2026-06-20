const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function proxyAssignmentTests() {
  const guard = read("src/renderer/proxy-assignment-guard.js");
  const browserStart = read("src/renderer/browser-redesign-start.js");
  const authTab = read("src/renderer/views/inspector-auth-tab.js");
  const newProfileModal = read("src/renderer/views/new-profile-modal-view.js");
  const proxies = read("src/main/proxies.js");
  const windows = read("src/main/windows.js");

  assert.match(browserStart, /installProxyAssignmentGuard/);
  assert.match(guard, /assign-selected-proxy/);
  assert.match(guard, /validateFreeProxy/);
  assert.match(guard, /test real OK/);

  assert.match(authTab, /proxyAssignSelect/);
  assert.match(authTab, /availableProxiesFor/);
  assert.match(newProfileModal, /freeHealthyProxies/);
  assert.match(newProfileModal, /proxy\.healthy/);

  assert.match(proxies, /require\("tls"\)/);
  assert.match(proxies, /validateTlsOverSocket/);
  assert.match(proxies, /certificado TLS invalido/);

  assert.doesNotMatch(windows, /setCertificateVerifyProc\(\(_req, cb\) => cb\(0\)\)/);
};
