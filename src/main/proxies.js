const tls = require("tls");
const { normalizeProxy, connectThroughProxy } = require("./proxy-runtime");

const TLS_TEST_HOST = "api.ipify.org";
const TLS_TEST_PORT = 443;
const PROXY_TIMEOUT_MS = 12000;

function proxyResult(original, started, healthy, lastError = null) {
  return {
    ...original,
    healthy,
    latency_ms: healthy ? Date.now() - started : null,
    last_error: lastError
  };
}

function tlsErrorMessage(error) {
  const code = error?.code || error?.authorizationError || "";
  const message = error?.message || "fallo TLS";
  return /CERT|UNABLE_TO|SELF_SIGNED|ISSUER|VERIFY/i.test(`${code} ${message}`)
    ? `certificado TLS invalido: ${code || message}`
    : message;
}

function validateTlsOverSocket(socket, servername = TLS_TEST_HOST) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (healthy, lastError = null, tlsSocket = null) => {
      if (settled) return;
      settled = true;
      try { (tlsSocket || socket).destroy(); } catch {}
      resolve({ healthy, lastError });
    };
    const tlsSocket = tls.connect({ socket, servername, rejectUnauthorized: true });
    tlsSocket.setTimeout(PROXY_TIMEOUT_MS);
    tlsSocket.once("secureConnect", () => {
      if (tlsSocket.authorized) finish(true, null, tlsSocket);
      else finish(false, `certificado TLS invalido: ${tlsSocket.authorizationError || "no autorizado"}`, tlsSocket);
    });
    tlsSocket.once("timeout", () => finish(false, "timeout TLS", tlsSocket));
    tlsSocket.once("error", (error) => finish(false, tlsErrorMessage(error), tlsSocket));
  });
}

async function checkProxy(rawProxy) {
  const started = Date.now();
  const proxy = normalizeProxy(rawProxy);
  if (!proxy) return proxyResult(rawProxy || {}, started, false, "proxy invalido");
  try {
    const socket = await connectThroughProxy(proxy, TLS_TEST_HOST, TLS_TEST_PORT, PROXY_TIMEOUT_MS);
    const result = await validateTlsOverSocket(socket, TLS_TEST_HOST);
    return proxyResult(rawProxy, started, result.healthy, result.lastError);
  } catch (error) {
    return proxyResult(rawProxy, started, false, error?.message || "conexion rechazada");
  }
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
  checkProxy,
  checkHttpProxy,
  checkSocks5Proxy,
  checkSocks4Proxy,
  validateTlsOverSocket
};
