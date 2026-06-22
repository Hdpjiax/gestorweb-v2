const assert = require("assert/strict");
const crypto = require("crypto");
const {
  createLicenseText,
  parseLicenseText,
  verifySignedLicense
} = require("../../src/main/license");

module.exports = async function licenseTests() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  const hwid = "GW-TEST-0001-0002";
  const payload = {
    id: "GW-TEST-LIC-1",
    hwid,
    app: "gestor-web",
    plan: "1d",
    type: "1 dia",
    tier: "standard",
    issued_at: Date.now(),
    expires_at: Date.now() + 24 * 60 * 60 * 1000,
    features: ["standard"],
    online_required: false,
    sig_alg: "RSA-SHA256"
  };

  const licenseText = createLicenseText(payload, privateKey);
  assert.match(licenseText, /^GW-LIC-V1\n/);

  const parsed = parseLicenseText(licenseText);
  assert.equal(parsed.payload.id, payload.id);
  assert.equal(parsed.payload.hwid, hwid);

  const ok = verifySignedLicense(licenseText, hwid, { publicKey });
  assert.equal(ok.active, true);
  assert.equal(ok.id, payload.id);
  assert.equal(ok.plan, "1d");

  const wrongDevice = verifySignedLicense(licenseText, "GW-OTHER-DEVICE", { publicKey });
  assert.equal(wrongDevice.active, false);
  assert.match(wrongDevice.reason, /otro HWID/);

  const expiredText = createLicenseText({ ...payload, id: "GW-EXPIRED", expires_at: Date.now() - 1000 }, privateKey);
  const expired = verifySignedLicense(expiredText, hwid, { publicKey });
  assert.equal(expired.active, false);
  assert.equal(expired.reason, "licencia expirada");

  const tamperedParts = licenseText.split("\n");
  tamperedParts[2] = `${tamperedParts[2][0] === "A" ? "B" : "A"}${tamperedParts[2].slice(1)}`;
  const tampered = tamperedParts.join("\n");
  const bad = verifySignedLicense(tampered, hwid, { publicKey });
  assert.equal(bad.active, false);
  assert.equal(bad.reason, "firma criptografica invalida");
};
