const assert = require("assert/strict");
const { normalizeServerUrl } = require("../../src/main/license-admin-ipc");

module.exports = async function licenseAdminTests() {
  assert.equal(normalizeServerUrl("https://licenses.example.com/"), "https://licenses.example.com");
  assert.equal(normalizeServerUrl("http://127.0.0.1:8787"), "http://127.0.0.1:8787");
  assert.throws(() => normalizeServerUrl("http://licenses.example.com"), /HTTPS/);
  assert.throws(() => normalizeServerUrl("file:///tmp/license"), /HTTPS/);
};
