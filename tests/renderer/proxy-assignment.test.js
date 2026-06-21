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
  const runtime = read("src/main/proxy-runtime.js");
  const windows = read("src/main/windows.js");
  const main = read("main.js");

  assert.match(browserStart, /installProxyAssignmentGuard/);
  assert.match(guard, /assign-selected-proxy/);
  assert.match(guard, /validateFreeProxy/);
  assert.match(guard, /updateSession\(profile, result\.proxy\)/);
  assert.doesNotMatch(guard, /if \(!proxy\.healthy\)/);

  assert.match(authTab, /proxyAssignSelect/);
  assert.match(authTab, /availableProxiesFor/);
  assert.match(newProfileModal, /freeProxies/);
  assert.match(newProfileModal, /test real es recomendado/);

  assert.match(proxies, /http:\/\/api\.ipify\.org/);
  assert.match(proxies, /ProfileProxyBridge/);
  assert.match(proxies, /protocolCandidates/);
  assert.doesNotMatch(proxies, /rejectUnauthorized/);

  assert.match(runtime, /class ProfileProxyBridge/);
  assert.match(runtime, /connectSocks5Tunnel/);
  assert.match(runtime, /Proxy-Authorization/);
  assert.match(windows, /profileProxyRuntime\.ensure/);
  assert.match(windows, /setCertificateVerifyProc/);
  assert.match(windows, /proxyTrustedSessions\.add/);
  assert.match(main, /certificate-error/);
  assert.match(main, /proxyTrustedSessions\.has/);
};
