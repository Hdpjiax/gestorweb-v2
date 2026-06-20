const assert = require("assert/strict");
const { webcrypto } = require("crypto");
const { importEsmFromRepo } = require("../_utils/import-esm");

module.exports = async function helpersTests() {
  global.window = { crypto: webcrypto };
  const { attr, clone, esc, shortId, uid } = await importEsmFromRepo("src/renderer/helpers.js");

  assert.equal(esc('<img src=x onerror="alert(1)">&'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;');
  assert.equal(attr("a'b\"c<d>"), "a&#39;b&quot;c&lt;d&gt;");

  const source = { nested: { a: 1 } };
  const copy = clone(source);
  copy.nested.a = 2;
  assert.equal(source.nested.a, 1);
  assert.equal(copy.nested.a, 2);

  const id = shortId(16);
  assert.match(id, /^[A-HJ-NP-Z2-9]{16}$/);

  const generated = uid("prof");
  assert.match(generated, /^prof_[a-z0-9]+_[a-z2-9]{5}$/);
};
