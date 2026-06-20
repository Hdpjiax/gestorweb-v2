const assert = require("assert/strict");
const {
  assertJsonSize,
  assertProfileId,
  safeExternalUrl,
  safeHttpUrl,
  sanitizeCookies,
  sanitizeRepeaterRequest,
  sanitizeTotpSecret
} = require("../../src/main/security");

module.exports = async function securityTests() {
  assert.equal(safeExternalUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeExternalUrl("http://example.com"), "http://example.com/");
  assert.equal(safeExternalUrl("mailto:test@example.com"), "mailto:test@example.com");
  assert.equal(safeExternalUrl("file:///etc/passwd"), null);
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);

  assert.equal(safeHttpUrl("https://example.com"), "https://example.com/");
  assert.equal(safeHttpUrl("mailto:test@example.com"), null);
  assert.equal(safeHttpUrl("file:///tmp/a"), null);

  assert.equal(assertProfileId("prof_abc-123"), "prof_abc-123");
  assert.throws(() => assertProfileId("../secret"), /invalid profile id/);
  assert.throws(() => assertProfileId(""), /invalid profile id/);

  const request = sanitizeRepeaterRequest({
    method: "post",
    url: "https://api.example.com/data",
    headers: {
      "X-Test": "ok",
      "Bad Header": "drop",
      Inject: "a\r\nb"
    },
    body: "hello"
  });
  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://api.example.com/data");
  assert.deepEqual(request.headers, { "X-Test": "ok", Inject: "a  b" });
  assert.equal(request.body, "hello");
  assert.throws(() => sanitizeRepeaterRequest({ method: "TRACE", url: "https://example.com" }), /invalid HTTP method/);
  assert.throws(() => sanitizeRepeaterRequest({ method: "GET", url: "file:///tmp/a" }), /invalid HTTP URL/);

  const cookies = sanitizeCookies([
    { name: "sid", value: "123", domain: ".example.com", path: "/", httpOnly: true },
    { name: "", value: "bad", domain: "example.com" },
    "invalid"
  ]);
  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, "sid");
  assert.equal(cookies[0].domain, ".example.com");
  assert.equal(cookies[0].httpOnly, true);

  assert.equal(sanitizeTotpSecret(" abcd 2345 "), "ABCD2345");
  assert.throws(() => sanitizeTotpSecret("abc-123"), /invalid TOTP secret/);

  assertJsonSize({ ok: true });
};
