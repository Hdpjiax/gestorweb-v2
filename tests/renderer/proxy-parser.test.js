const assert = require("assert/strict");
const { importEsmFromRepo } = require("../_utils/import-esm");

module.exports = async function proxyParserTests() {
  const parser = await importEsmFromRepo("src/renderer/proxy-parser.js");

  assert.deepEqual(parser.parseProxyLine("127.0.0.1:8080", "http"), {
    scheme: "http",
    host: "127.0.0.1",
    port: 8080,
    username: null,
    password: null,
    label: null
  });

  assert.deepEqual(parser.parseProxyLine("user:pass@example.com:3128", "https"), {
    scheme: "https",
    host: "example.com",
    port: 3128,
    username: "user",
    password: "pass",
    label: null
  });

  assert.deepEqual(parser.parseProxyLine("socks5://user:pass@example.com:1080", "http"), {
    scheme: "socks5",
    host: "example.com",
    port: 1080,
    username: "user",
    password: "pass",
    label: null
  });

  assert.equal(parser.parseProxyLine("999.1.1.1:8080", "http"), null);
  assert.equal(parser.parseProxyLine("example:8080", "http"), null);
  assert.equal(parser.parseProxyLine("ftp://example.com:21", "http"), null);

  const bulk = parser.parseProxyBulk("host,port,username,password\nexample.com,8080,u,p\ninvalid,99999,u,p", "http");
  assert.equal(bulk.format, "csv");
  assert.equal(bulk.proxies.length, 1);
  assert.equal(bulk.invalid, 1);
  assert.equal(bulk.proxies[0].host, "example.com");

  const text = parser.parseProxyBulk("example.com:8080\nuser:pass@example.org:3128", "http");
  assert.equal(text.format, "text");
  assert.equal(text.proxies.length, 2);

  assert.equal(parser.proxyKey({ scheme: "HTTP", host: "Example.COM", port: 8080, username: "u" }), "HTTP|example.com|8080|u");
};
