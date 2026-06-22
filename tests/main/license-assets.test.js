const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

module.exports = async function licenseAssetsTests() {
  const script = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "prepare-license-assets.js"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"));

  assert.match(script, /src["'],\s*["']main["'],\s*["']license-public-key\.pem/);
  assert.match(script, /backend["'],\s*["']license-server["'],\s*["']public_key\.pem/);
  assert.match(script, /BEGIN PUBLIC KEY/);
  assert.match(script, /Sin ese archivo las licencias firmadas se veran como invalidas/);

  assert.match(pkg.scripts["dist:setup"], /prepare-license-assets\.js windows/);
  assert.match(pkg.scripts["dist:apk"], /prepare-license-assets\.js android/);
};
