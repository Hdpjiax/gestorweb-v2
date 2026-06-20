const net = require("net");

function proxyRulesFor(profile, proxy) {
  if (profile?.tor_mode) return "socks5://127.0.0.1:9050";
  if (!proxy) return "";
  const scheme = proxy.scheme || "http";
  const host = proxy.host;
  const port = proxy.port;
  if (proxy.username || proxy.password) {
    return `${scheme}://${encodeURIComponent(proxy.username || "")}:${encodeURIComponent(proxy.password || "")}@${host}:${port}`;
  }
  return `${scheme}://${host}:${port}`;
}

function proxyResult(proxy, started, healthy, lastError = null) {
  return {
    ...proxy,
    healthy,
    latency_ms: healthy ? Date.now() - started : null,
    last_error: lastError
  };
}

function checkHttpProxy(proxy) {
  return new Promise((resolve) => {
    if (!proxy?.host || !proxy?.port) return resolve({ ...proxy, healthy: false, latency_ms: null, last_error: "host/port vacio" });
    const started = Date.now();
    const socket = new net.Socket();
    let done = false;
    let buffer = "";
    const finish = (healthy, lastError = null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(proxyResult(proxy, started, healthy, lastError));
    };
    socket.setTimeout(8000);
    socket.once("connect", () => {
      const auth = proxy.username || proxy.password
        ? `Proxy-Authorization: Basic ${Buffer.from(`${proxy.username || ""}:${proxy.password || ""}`).toString("base64")}\r\n`
        : "";
      socket.write(`CONNECT www.google.com:443 HTTP/1.1\r\nHost: www.google.com:443\r\n${auth}Connection: close\r\n\r\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (!buffer.includes("\r\n")) return;
      const line = buffer.split("\r\n")[0] || "";
      if (/\s200\s/.test(line)) finish(true);
      else if (/\s407\s/.test(line)) finish(false, "proxy auth rechazado");
      else if (/^HTTP\//.test(line)) finish(false, line.replace(/^HTTP\/\d(?:\.\d)?\s*/, ""));
    });
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(proxy.port), proxy.host);
  });
}

function checkSocks5Proxy(proxy) {
  return new Promise((resolve) => {
    if (!proxy?.host || !proxy?.port) return resolve({ ...proxy, healthy: false, latency_ms: null, last_error: "host/port vacio" });
    const started = Date.now();
    const socket = new net.Socket();
    const target = Buffer.from("www.google.com");
    let done = false;
    let stage = "hello";
    const finish = (healthy, lastError = null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(proxyResult(proxy, started, healthy, lastError));
    };
    const connectTarget = () => {
      socket.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, target.length]), target, Buffer.from([0x01, 0xbb])]));
      stage = "connect";
    };
    socket.setTimeout(8000);
    socket.once("connect", () => {
      socket.write(proxy.username || proxy.password ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]));
    });
    socket.on("data", (data) => {
      if (stage === "hello") {
        if (data[0] !== 0x05 || data[1] === 0xff) return finish(false, "socks5 metodo no soportado");
        if (data[1] === 0x02) {
          const user = Buffer.from(String(proxy.username || ""));
          const pass = Buffer.from(String(proxy.password || ""));
          socket.write(Buffer.concat([Buffer.from([0x01, user.length]), user, Buffer.from([pass.length]), pass]));
          stage = "auth";
          return;
        }
        connectTarget();
        return;
      }
      if (stage === "auth") {
        if (data[1] !== 0x00) return finish(false, "socks5 auth rechazado");
        connectTarget();
        return;
      }
      if (stage === "connect") {
        finish(data[1] === 0x00, data[1] === 0x00 ? null : `socks5 connect ${data[1]}`);
      }
    });
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(proxy.port), proxy.host);
  });
}

function checkSocks4Proxy(proxy) {
  return new Promise((resolve) => {
    if (!proxy?.host || !proxy?.port) return resolve({ ...proxy, healthy: false, latency_ms: null, last_error: "host/port vacio" });
    const started = Date.now();
    const socket = new net.Socket();
    const user = Buffer.from(String(proxy.username || ""));
    const domain = Buffer.from("www.google.com");
    let done = false;
    const finish = (healthy, lastError = null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(proxyResult(proxy, started, healthy, lastError));
    };
    socket.setTimeout(8000);
    socket.once("connect", () => {
      socket.write(Buffer.concat([Buffer.from([0x04, 0x01, 0x01, 0xbb, 0x00, 0x00, 0x00, 0x01]), user, Buffer.from([0x00]), domain, Buffer.from([0x00])]));
    });
    socket.on("data", (data) => finish(data[1] === 0x5a, data[1] === 0x5a ? null : `socks4 connect ${data[1]}`));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(proxy.port), proxy.host);
  });
}

function checkProxy(proxy) {
  const scheme = String(proxy?.scheme || "http").toLowerCase();
  if (scheme.startsWith("socks5")) return checkSocks5Proxy(proxy);
  if (scheme.startsWith("socks4")) return checkSocks4Proxy(proxy);
  return checkHttpProxy(proxy);
}

module.exports = {
  proxyRulesFor,
  checkProxy,
  checkHttpProxy,
  checkSocks5Proxy,
  checkSocks4Proxy
};