const net = require("net");
const { normalizeProxy, ProfileProxyBridge } = require("./proxy-runtime");

const HTTP_TEST_URL = "http://api.ipify.org/";
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
      const response = await requestThroughRuntime({ ...proxy, scheme });
      const { status, body } = parseHttpProbe(response);
      if (status === 200) return proxyResult({ ...rawProxy, scheme }, started, true, null);
      lastError = body.replace(/\s+/g, " ").slice(0, 100) || `HTTP ${status || "invalido"}`;
    } catch (error) {
      lastError = error?.message || "conexion rechazada";
    }
  }
  return proxyResult(rawProxy, started, false, lastError);
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
  checkProxy,
  checkHttpProxy,
  checkSocks5Proxy,
  checkSocks4Proxy,
  requestThroughRuntime,
  protocolCandidates
};
