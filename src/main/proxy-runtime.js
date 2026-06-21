const net = require("net");
const tls = require("tls");

const SUPPORTED_PROXY_SCHEMES = new Set(["http", "https", "socks4", "socks5"]);
const DEFAULT_TIMEOUT_MS = 12000;

function normalizeProxy(proxy) {
  if (!proxy || typeof proxy !== "object") return null;
  const rawScheme = String(proxy.scheme || "http").trim().toLowerCase().replace(/:$/, "");
  const scheme = rawScheme === "socks" ? "socks5" : rawScheme === "socks4a" ? "socks4" : rawScheme;
  const host = String(proxy.host || "").trim().replace(/^\[|\]$/g, "");
  const port = Number(proxy.port);
  if (!SUPPORTED_PROXY_SCHEMES.has(scheme)) return null;
  if (!host || /\s|:\/\//.test(host)) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return {
    scheme,
    host,
    port,
    username: proxy.username == null ? "" : String(proxy.username),
    password: proxy.password == null ? "" : String(proxy.password)
  };
}

function proxyRouteKey(proxy) {
  const value = normalizeProxy(proxy);
  if (!value) return "direct";
  return [value.scheme, value.host.toLowerCase(), value.port, value.username, value.password].join("\u0000");
}

function proxyLabel(proxy) {
  const value = normalizeProxy(proxy);
  if (!value) return "direct";
  return `${value.scheme}://${value.host}:${value.port}${value.username || value.password ? " (auth)" : ""}`;
}

function basicProxyAuthorization(proxy) {
  if (!proxy.username && !proxy.password) return "";
  return `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`, "utf8").toString("base64")}`;
}

function createSocketReader(socket) {
  let buffer = Buffer.alloc(0);
  let failure = null;
  const waiters = [];

  const pump = () => {
    while (waiters.length) {
      const waiter = waiters[0];
      if (failure) {
        waiters.shift();
        waiter.reject(failure);
        continue;
      }
      let size;
      try {
        size = waiter.find(buffer);
      } catch (error) {
        waiters.shift();
        waiter.reject(error);
        continue;
      }
      if (!size) break;
      waiters.shift();
      const result = buffer.subarray(0, size);
      buffer = buffer.subarray(size);
      waiter.resolve(result);
    }
  };

  const onData = (chunk) => {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
    pump();
  };
  const onError = (error) => { failure = error; pump(); };
  const onEnd = () => { failure = new Error("conexion cerrada durante el handshake del proxy"); pump(); };

  socket.on("data", onData);
  socket.once("error", onError);
  socket.once("end", onEnd);

  const waitFor = (find) => new Promise((resolve, reject) => {
    waiters.push({ find, resolve, reject });
    pump();
  });

  return {
    bytes(size) {
      return waitFor((current) => current.length >= size ? size : 0);
    },
    until(marker, maxBytes = 65536) {
      return waitFor((current) => {
        if (current.length > maxBytes) throw new Error("respuesta del proxy demasiado grande");
        const index = current.indexOf(marker);
        return index >= 0 ? index + marker.length : 0;
      });
    },
    release() {
      socket.pause();
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("end", onEnd);
      if (buffer.length) socket.unshift(buffer);
      buffer = Buffer.alloc(0);
    }
  };
}

function waitForConnect(socket, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error("timeout conectando al proxy"));
    }, timeoutMs);
    const onReady = () => { cleanup(); resolve(socket); };
    const onError = (error) => { cleanup(); reject(error); };
    const cleanup = () => {
      clearTimeout(timer);
      socket.removeListener(eventName, onReady);
      socket.removeListener("error", onError);
    };
    socket.once(eventName, onReady);
    socket.once("error", onError);
  });
}

async function connectProxyTransport(proxy, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (proxy.scheme === "https") {
    const socket = tls.connect({
      host: proxy.host,
      port: proxy.port,
      servername: net.isIP(proxy.host) ? undefined : proxy.host,
      rejectUnauthorized: true
    });
    return waitForConnect(socket, "secureConnect", timeoutMs);
  }
  const socket = net.connect({ host: proxy.host, port: proxy.port });
  return waitForConnect(socket, "connect", timeoutMs);
}

async function connectHttpTunnel(proxy, targetHost, targetPort, timeoutMs) {
  const socket = await connectProxyTransport(proxy, timeoutMs);
  try {
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error("timeout del proxy")));
    const reader = createSocketReader(socket);
    const auth = basicProxyAuthorization(proxy);
    const authority = net.isIP(targetHost) === 6 ? `[${targetHost}]:${targetPort}` : `${targetHost}:${targetPort}`;
    socket.write([
      `CONNECT ${authority} HTTP/1.1`,
      `Host: ${authority}`,
      auth ? `Proxy-Authorization: ${auth}` : "",
      "Proxy-Connection: Keep-Alive",
      "",
      ""
    ].filter((line, index) => line || index >= 4).join("\r\n"));
    const header = (await reader.until(Buffer.from("\r\n\r\n"))).toString("latin1");
    const status = Number((header.split("\r\n", 1)[0].match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/) || [])[1]);
    if (status !== 200) {
      reader.release();
      throw new Error(status === 407 ? "credenciales de proxy rechazadas" : `proxy HTTP respondio ${status || "invalido"}`);
    }
    reader.release();
    socket.setTimeout(0);
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

async function connectSocks5Tunnel(proxy, targetHost, targetPort, timeoutMs) {
  const socket = await connectProxyTransport({ ...proxy, scheme: "http" }, timeoutMs);
  try {
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error("timeout del proxy SOCKS5")));
    const reader = createSocketReader(socket);
    const wantsAuth = !!(proxy.username || proxy.password);
    socket.write(wantsAuth ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]));
    const method = await reader.bytes(2);
    if (method[0] !== 0x05 || method[1] === 0xff) throw new Error("SOCKS5 no acepta un metodo de autenticacion compatible");
    if (method[1] === 0x02) {
      const username = Buffer.from(proxy.username, "utf8");
      const password = Buffer.from(proxy.password, "utf8");
      if (username.length > 255 || password.length > 255) throw new Error("credenciales SOCKS5 demasiado largas");
      socket.write(Buffer.concat([Buffer.from([0x01, username.length]), username, Buffer.from([password.length]), password]));
      const authResult = await reader.bytes(2);
      if (authResult[1] !== 0x00) throw new Error("credenciales SOCKS5 rechazadas");
    } else if (method[1] !== 0x00) {
      throw new Error(`metodo SOCKS5 no soportado: ${method[1]}`);
    }
    const host = Buffer.from(String(targetHost), "utf8");
    if (!host.length || host.length > 255) throw new Error("destino SOCKS5 invalido");
    socket.write(Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03, host.length]),
      host,
      Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff])
    ]));
    const response = await reader.bytes(4);
    if (response[0] !== 0x05 || response[1] !== 0x00) throw new Error(`SOCKS5 rechazo el destino (${response[1]})`);
    if (response[3] === 0x01) await reader.bytes(4);
    else if (response[3] === 0x04) await reader.bytes(16);
    else if (response[3] === 0x03) await reader.bytes((await reader.bytes(1))[0]);
    else throw new Error("respuesta SOCKS5 invalida");
    await reader.bytes(2);
    reader.release();
    socket.setTimeout(0);
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

async function connectSocks4Tunnel(proxy, targetHost, targetPort, timeoutMs) {
  const socket = await connectProxyTransport({ ...proxy, scheme: "http" }, timeoutMs);
  try {
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error("timeout del proxy SOCKS4")));
    const reader = createSocketReader(socket);
    const user = Buffer.from(proxy.username || "", "utf8");
    const host = Buffer.from(String(targetHost), "utf8");
    socket.write(Buffer.concat([
      Buffer.from([0x04, 0x01, (targetPort >> 8) & 0xff, targetPort & 0xff, 0x00, 0x00, 0x00, 0x01]),
      user,
      Buffer.from([0x00]),
      host,
      Buffer.from([0x00])
    ]));
    const response = await reader.bytes(8);
    if (response[1] !== 0x5a) throw new Error(`SOCKS4 rechazo el destino (${response[1]})`);
    reader.release();
    socket.setTimeout(0);
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

async function connectThroughProxy(rawProxy, targetHost, targetPort, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const proxy = normalizeProxy(rawProxy);
  const port = Number(targetPort);
  if (!proxy) throw new Error("proxy invalido");
  if (!targetHost || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("destino invalido");
  if (proxy.scheme === "socks5") return connectSocks5Tunnel(proxy, targetHost, port, timeoutMs);
  if (proxy.scheme === "socks4") return connectSocks4Tunnel(proxy, targetHost, port, timeoutMs);
  return connectHttpTunnel(proxy, targetHost, port, timeoutMs);
}

function parseAuthority(authority, fallbackPort) {
  const ipv6 = String(authority).match(/^\[([^\]]+)](?::(\d+))?$/);
  if (ipv6) return { host: ipv6[1], port: Number(ipv6[2] || fallbackPort) };
  const index = String(authority).lastIndexOf(":");
  if (index > 0 && /^\d+$/.test(String(authority).slice(index + 1))) {
    return { host: String(authority).slice(0, index), port: Number(String(authority).slice(index + 1)) };
  }
  return { host: String(authority), port: Number(fallbackPort) };
}

function rewriteHeaders(header, firstLine, extraHeaders = {}) {
  const lines = header.split("\r\n");
  const blocked = new Set(Object.keys(extraHeaders).map((key) => key.toLowerCase()).concat(["proxy-authorization"]));
  const next = [firstLine];
  for (const line of lines.slice(1)) {
    if (!line) break;
    if (!blocked.has(line.split(":", 1)[0].trim().toLowerCase())) next.push(line);
  }
  next.push(...Object.entries(extraHeaders).map(([key, value]) => `${key}: ${value}`));
  return `${next.join("\r\n")}\r\n\r\n`;
}

class ProfileProxyBridge {
  constructor(proxy) {
    this.proxy = normalizeProxy(proxy);
    if (!this.proxy) throw new Error("proxy invalido");
    this.server = null;
    this.port = null;
    this.sockets = new Set();
  }

  async start() {
    if (this.server) return this.port;
    this.server = net.createServer((client) => this.handle(client));
    this.server.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.once("close", () => this.sockets.delete(socket));
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(0, "127.0.0.1", () => {
        this.server.removeListener("error", reject);
        resolve();
      });
    });
    this.port = this.server.address().port;
    return this.port;
  }

async handle(client) {
  // Set up overall timeout for the entire handle operation
  const handleTimeout = setTimeout(() => {
    if (!client.destroyed) {
      client.end(`HTTP/1.1 504 Gateway Timeout\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nGateway timeout`);
    }
  }, DEFAULT_TIMEOUT_MS * 2); // 2x the normal timeout for overall operation

  // Set client timeout
  client.setTimeout(DEFAULT_TIMEOUT_MS, () => {
    if (!client.destroyed) {
      client.end(`HTTP/1.1 408 Request Timeout\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nRequest timeout`);
    }
  });

  const reader = createSocketReader(client);
  try {
    const headerBuffer = await reader.until(Buffer.from("\r\n\r\n"));
    const header = headerBuffer.toString("latin1");
    const [requestLine] = header.split("\r\n");
    const [method, destination, version = "HTTP/1.1"] = requestLine.split(" ");
    if (!method || !destination) throw new Error("peticion de proxy invalida");

    if (method.toUpperCase() === "CONNECT") {
      const target = parseAuthority(destination, 443);
      let upstream;
      try {
        upstream = await connectThroughProxy(this.proxy, target.host, target.port);
      } catch (connectError) {
        throw new Error(`Failed to connect to upstream proxy: ${connectError.message}`);
      }

      reader.release();
      client.setTimeout(0);
      try {
        client.write(`${version} 200 Connection Established\r\nProxy-Agent: Gestor-Web\r\n\r\n`);
      } catch (writeError) {
        // If we can't write the response, destroy the client
        if (!client.destroyed) client.destroy();
        throw writeError;
      }

      // Set up error handling for the pipes
      upstream.on("error", () => {
        if (!client.destroyed) client.destroy();
      });
      client.on("error", () => {
        if (!upstream.destroyed) upstream.destroy();
      });

      // Pipe the tunnels
      client.pipe(upstream).pipe(client);
      return;
    }

    // Handle regular HTTP/HTTPS requests
    const url = new URL(destination);
    const targetPort = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    let upstream;
    let outboundHeader;

    try {
      if (this.proxy.scheme === "http" || this.proxy.scheme === "https") {
        upstream = await connectProxyTransport(this.proxy);
        const auth = basicProxyAuthorization(this.proxy);
        outboundHeader = rewriteHeaders(header, requestLine, auth ? { "Proxy-Authorization": auth } : {});
      } else {
        upstream = await connectThroughProxy(this.proxy, url.hostname, targetPort);
        const path = `${url.pathname || "/"}${url.search || ""}`;
        outboundHeader = rewriteHeaders(header, `${method} ${path} ${version}`);
      }
    } catch (connectError) {
      throw new Error(`Failed to connect to upstream proxy: ${connectError.message}`);
    }

    reader.release();
    client.setTimeout(0);

    try {
      upstream.write(outboundHeader, "latin1");
    } catch (writeError) {
      // If we can't write to upstream, clean up and throw
      try { upstream.destroy(); } catch {}
      if (!client.destroyed) client.end(`HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nFailed to write request to upstream proxy`);
      throw writeError;
    }

    // Set up error handling for the pipes
    upstream.on("error", () => {
      if (!client.destroyed) client.destroy();
    });
    client.on("error", () => {
      if (!upstream.destroyed) upstream.destroy();
    });

    // Pipe the response from upstream to client, and client request to upstream
    client.pipe(upstream).pipe(client);
  } catch (error) {
    // Clear the overall timeout
    clearTimeout(handleTimeout);

    // Ensure we always send a response to the client
    try { reader.release(); } catch {}
    if (!client.destroyed) {
      // Determine appropriate status code
      let statusCode = 502;
      let statusMessage = "Bad Gateway";
      if (error.message.includes("timeout")) {
        statusCode = 408;
        statusMessage = "Request Timeout";
      } else if (error.message.includes("failed to connect") || error.message.includes("connect")) {
        statusCode = 502;
        statusMessage = "Bad Gateway";
      } else if (error.message.includes("invalid request")) {
        statusCode = 400;
        statusMessage = "Bad Request";
      }

      client.end(`HTTP/1.1 ${statusCode} ${statusMessage}\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\n${error.message}`);
    }

    // Ensure sockets are cleaned up
    try { if (reader) reader.release(); } catch {}
    try { if (!client.destroyed) client.destroy(); } catch {}
  } finally {
    // Clear the overall timeout if we haven't already
    clearTimeout(handleTimeout);
  }
}

  async close() {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    await new Promise((resolve) => server.close(() => resolve()));
  }
}

class ProfileProxyRuntime {
  constructor() {
    this.routes = new Map();
  }

  async ensure(profileId, rawProxy, torMode = false) {
    const id = String(profileId || "");
    const proxy = torMode
      ? { scheme: "socks5", host: "127.0.0.1", port: 9050, username: "", password: "" }
      : normalizeProxy(rawProxy);
    if (!proxy) {
      await this.closeProfile(id);
      return { proxyConfig: { mode: "direct" }, routeKey: "direct", route: "direct", localPort: null };
    }
    const routeKey = proxyRouteKey(proxy);
    const current = this.routes.get(id);
    if (current?.routeKey === routeKey && current.bridge.port) {
      return this.describe(current.bridge, routeKey);
    }
    await this.closeProfile(id);
    const bridge = new ProfileProxyBridge(proxy);
    await bridge.start();
    this.routes.set(id, { routeKey, bridge });
    return this.describe(bridge, routeKey);
  }

  describe(bridge, routeKey) {
    return {
      proxyConfig: {
        mode: "fixed_servers",
        proxyRules: `http://127.0.0.1:${bridge.port}`,
        proxyBypassRules: "<-loopback>"
      },
      routeKey,
      route: proxyLabel(bridge.proxy),
      localPort: bridge.port
    };
  }

  async closeProfile(profileId) {
    const current = this.routes.get(String(profileId || ""));
    if (!current) return;
    this.routes.delete(String(profileId || ""));
    await current.bridge.close();
  }

  async closeAll() {
    await Promise.all([...this.routes.keys()].map((id) => this.closeProfile(id)));
  }
}

const profileProxyRuntime = new ProfileProxyRuntime();

module.exports = {
  SUPPORTED_PROXY_SCHEMES,
  DEFAULT_TIMEOUT_MS,
  normalizeProxy,
  proxyRouteKey,
  proxyLabel,
  connectThroughProxy,
  ProfileProxyBridge,
  ProfileProxyRuntime,
  profileProxyRuntime
};
