const net = require("net");
const tls = require("tls");
const { normalizeProxy, ProfileProxyBridge } = require("./proxy-runtime");

const HTTP_TEST_URL = "http://api.ipify.org/";
const HTTPS_TEST_URL = "https://api.ipify.org/";
const PROXY_TIMEOUT_MS = 7000;

function proxyResult(original, started, healthy, lastError = null) {
  return {
    ...original,
    healthy,
    latency_ms: healthy ? Date.now() - started : null,
    last_error: lastError
  };
}

async function requestThroughRuntime(rawProxy) {
  const bridge = new ProfileProxyBridge(rawProxy);
  await bridge.start();
  try {
    return await new Promise((resolve, reject) => {
      const socket = net.connect(bridge.port, "127.0.0.1");
      let response = "";
      let settled = false;
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        if (error) reject(error);
        else resolve(response);
      };
      const timer = setTimeout(() => finish(new Error("timeout")), PROXY_TIMEOUT_MS);
      socket.once("connect", () => {
        socket.write([
          `GET ${HTTP_TEST_URL} HTTP/1.1`,
          "Host: api.ipify.org",
          "Accept: text/plain",
          "Connection: close",
          "",
          ""
        ].join("\r\n"));
      });
      socket.on("data", (chunk) => {
        response += chunk.toString("utf8");
        if (response.length > 128 * 1024) finish(new Error("respuesta demasiado grande"));
      });
      socket.once("end", () => finish());
      socket.once("error", (error) => finish(error));
    });
  } finally {
    await bridge.close();
  }
}

async function requestHttpsThroughRuntime(rawProxy) {
  const bridge = new ProfileProxyBridge(rawProxy);
  await bridge.start();
  let socket;
  let secureSocket;
  try {
    socket = await new Promise((resolve, reject) => {
      const candidate = net.connect(bridge.port, "127.0.0.1");
      const timer = setTimeout(() => candidate.destroy(new Error("timeout de conexion")), PROXY_TIMEOUT_MS);
      candidate.once("connect", () => { clearTimeout(timer); resolve(candidate); });
      candidate.once("error", (error) => { clearTimeout(timer); reject(error); });
    });

    const connectHeader = await new Promise((resolve, reject) => {
      let data = Buffer.alloc(0);
      const timer = setTimeout(() => reject(new Error("timeout de tunel HTTPS")), PROXY_TIMEOUT_MS);
      const cleanup = () => { clearTimeout(timer); socket.removeListener("data", onData); socket.removeListener("error", onError); };
      const onError = (error) => { cleanup(); reject(error); };
      const onData = (chunk) => {
        data = Buffer.concat([data, chunk]);
        const end = data.indexOf("\r\n\r\n");
        if (end < 0) return;
        cleanup();
        const header = data.subarray(0, end + 4).toString("latin1");
        const rest = data.subarray(end + 4);
        if (rest.length) socket.unshift(rest);
        resolve(header);
      };
      socket.on("data", onData);
      socket.once("error", onError);
      socket.write("CONNECT api.ipify.org:443 HTTP/1.1\r\nHost: api.ipify.org:443\r\nConnection: keep-alive\r\n\r\n");
    });
    const connectStatus = Number((connectHeader.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i) || [])[1]);
    if (connectStatus !== 200) throw new Error(`proxy sin tunel HTTPS (HTTP ${connectStatus || "invalido"})`);

    secureSocket = tls.connect({ socket, servername: "api.ipify.org", rejectUnauthorized: false });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => secureSocket.destroy(new Error("timeout TLS")), PROXY_TIMEOUT_MS);
      secureSocket.once("secureConnect", () => { clearTimeout(timer); resolve(); });
      secureSocket.once("error", (error) => { clearTimeout(timer); reject(error); });
    });

    return await new Promise((resolve, reject) => {
      let response = "";
      const timer = setTimeout(() => secureSocket.destroy(new Error("timeout HTTPS")), PROXY_TIMEOUT_MS);
      const finish = (error = null) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(response);
      };
      secureSocket.on("data", (chunk) => {
        response += chunk.toString("utf8");
        if (response.length > 128 * 1024) secureSocket.destroy(new Error("respuesta demasiado grande"));
      });
      secureSocket.once("end", () => finish());
      secureSocket.once("error", (error) => finish(error));
      secureSocket.write("GET / HTTP/1.1\r\nHost: api.ipify.org\r\nAccept: text/plain\r\nConnection: close\r\n\r\n");
    });
  } finally {
    try { secureSocket?.destroy(); } catch {}
    try { socket?.destroy(); } catch {}
    await bridge.close();
  }
}

function protocolCandidates(proxy) {
  const port = Number(proxy.port);
  const hinted = port === 4145
    ? ["socks4", "socks5", "http", "https"]
    : [1080, 1088].includes(port)
      ? ["socks5", "socks4", "http", "https"]
      : [proxy.scheme, "http", "socks5", "socks4", "https"];
  return [...new Set(hinted)];
}

function parseHttpProbe(response) {
  const separator = response.indexOf("\r\n\r\n");
  const header = separator >= 0 ? response.slice(0, separator) : response;
  const body = separator >= 0 ? response.slice(separator + 4).trim() : "";
  const status = Number((header.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i) || [])[1]);
  return { status, body };
}

async function checkProxy(rawProxy) {
  const started = Date.now();
  const proxy = normalizeProxy(rawProxy);
  if (!proxy) return proxyResult(rawProxy || {}, started, false, "proxy invalido");
  let lastError = "conexion rechazada";
  for (const scheme of protocolCandidates(proxy)) {
    try {
      const response = await requestHttpsThroughRuntime({ ...proxy, scheme });
      const { status, body } = parseHttpProbe(response);
      if (status === 200) return proxyResult({ ...rawProxy, scheme, https_tunnel: true }, started, true, null);
      lastError = body.replace(/\s+/g, " ").slice(0, 100) || `HTTP ${status || "invalido"}`;
    } catch (error) {
      lastError = error?.message || "conexion rechazada";
    }
  }
  return proxyResult({ ...rawProxy, https_tunnel: false }, started, false, lastError);
}

function checkHttpProxy(proxy) {
  return checkProxy({ ...proxy, scheme: proxy?.scheme === "https" ? "https" : "http" });
}

function checkSocks5Proxy(proxy) {
  return checkProxy({ ...proxy, scheme: "socks5" });
}

function checkSocks4Proxy(proxy) {
  return checkProxy({ ...proxy, scheme: "socks4" });
}

module.exports = {
  HTTP_TEST_URL,
  HTTPS_TEST_URL,
  checkProxy,
  checkHttpProxy,
  checkSocks5Proxy,
  checkSocks4Proxy,
  requestThroughRuntime,
  requestHttpsThroughRuntime,
  protocolCandidates
};
