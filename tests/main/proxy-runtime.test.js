const assert = require("assert/strict");
const net = require("net");
const {
  normalizeProxy,
  connectThroughProxy,
  ProfileProxyRuntime
} = require("../../src/main/proxy-runtime");
const { protocolCandidates } = require("../../src/main/proxies");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function createEchoServer() {
  return net.createServer((socket) => socket.pipe(socket));
}

function createHttpProxy(expectedAuth, stats) {
  return net.createServer((client) => {
    let buffer = Buffer.alloc(0);
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const end = buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      client.removeListener("data", onData);
      const header = buffer.subarray(0, end + 4).toString("latin1");
      const rest = buffer.subarray(end + 4);
      stats.requests++;
      stats.auth.push((header.match(/Proxy-Authorization:\s*([^\r\n]+)/i) || [])[1] || "");
      if (expectedAuth && stats.auth.at(-1) !== expectedAuth) {
        client.end("HTTP/1.1 407 Proxy Authentication Required\r\n\r\n");
        return;
      }
      const authority = (header.match(/^CONNECT\s+([^\s]+)/i) || [])[1];
      const [host, port] = authority.split(":");
      const upstream = net.connect(Number(port), host, () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (rest.length) upstream.write(rest);
        client.pipe(upstream).pipe(client);
      });
      upstream.on("error", () => client.destroy());
    };
    client.on("data", onData);
  });
}

function createSocks5Proxy(username, password, stats) {
  return net.createServer((client) => {
    let stage = "hello";
    let buffer = Buffer.alloc(0);
    const consume = () => {
      if (stage === "hello" && buffer.length >= 2) {
        const count = buffer[1];
        if (buffer.length < 2 + count) return;
        buffer = buffer.subarray(2 + count);
        client.write(Buffer.from([0x05, 0x02]));
        stage = "auth";
      }
      if (stage === "auth" && buffer.length >= 2) {
        const userLength = buffer[1];
        if (buffer.length < 3 + userLength) return;
        const passLength = buffer[2 + userLength];
        if (buffer.length < 3 + userLength + passLength) return;
        const user = buffer.subarray(2, 2 + userLength).toString();
        const pass = buffer.subarray(3 + userLength, 3 + userLength + passLength).toString();
        buffer = buffer.subarray(3 + userLength + passLength);
        const ok = user === username && pass === password;
        stats.authenticated = ok;
        client.write(Buffer.from([0x01, ok ? 0x00 : 0x01]));
        if (!ok) return client.end();
        stage = "connect";
      }
      if (stage === "connect" && buffer.length >= 5) {
        const hostLength = buffer[4];
        if (buffer.length < 7 + hostLength) return;
        const host = buffer.subarray(5, 5 + hostLength).toString();
        const port = buffer.readUInt16BE(5 + hostLength);
        const rest = buffer.subarray(7 + hostLength);
        buffer = Buffer.alloc(0);
        stage = "tunnel";
        const upstream = net.connect(port, host, () => {
          stats.requests++;
          client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]));
          if (rest.length) upstream.write(rest);
          client.pipe(upstream).pipe(client);
        });
        upstream.on("error", () => client.destroy());
      }
    };
    client.on("data", (chunk) => {
      if (stage === "tunnel") return;
      buffer = Buffer.concat([buffer, chunk]);
      consume();
    });
  });
}

function createSocks4Proxy(expectedUser, stats) {
  return net.createServer((client) => {
    let buffer = Buffer.alloc(0);
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 10) return;
      const userEnd = buffer.indexOf(0x00, 8);
      if (userEnd < 0) return;
      const hostEnd = buffer.indexOf(0x00, userEnd + 1);
      if (hostEnd < 0) return;
      client.removeListener('data', onData);
      const user = buffer.subarray(8, userEnd).toString();
      const host = buffer.subarray(userEnd + 1, hostEnd).toString();
      const port = buffer.readUInt16BE(2);
      const rest = buffer.subarray(hostEnd + 1);
      stats.authenticated = user === expectedUser;
      if (!stats.authenticated) return client.end(Buffer.from([0, 0x5b, 0, 0, 0, 0, 0, 0]));
      const upstream = net.connect(port, host, () => {
        stats.requests++;
        client.write(Buffer.from([0, 0x5a, 0, 0, 0, 0, 0, 0]));
        if (rest.length) upstream.write(rest);
        client.pipe(upstream).pipe(client);
      });
      upstream.on('error', () => client.destroy());
    };
    client.on('data', onData);
  });
}

async function roundTrip(socket, payload) {
  return new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.once("data", (data) => resolve(data.toString()));
    socket.write(payload);
    socket.resume();
  });
}

async function connectViaBridge(port, targetPort, payload) {
  const socket = net.connect(port, "127.0.0.1");
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  socket.write(`CONNECT 127.0.0.1:${targetPort} HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\n\r\n`);
  let buffer = Buffer.alloc(0);
  await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.includes("\r\n\r\n")) {
        socket.removeListener("data", onData);
        resolve();
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
  const answer = await roundTrip(socket, payload);
  socket.destroy();
  return answer;
}

module.exports = async function proxyRuntimeTests() {
  assert.equal(protocolCandidates({ scheme: "http", port: 4145 })[0], "socks4");
  assert.equal(protocolCandidates({ scheme: "http", port: 1088 })[0], "socks5");
  assert.deepEqual(normalizeProxy({ scheme: "socks", host: "proxy.test", port: "1080", username: "u", password: "p" }), {
    scheme: "socks5", host: "proxy.test", port: 1080, username: "u", password: "p"
  });
  assert.equal(normalizeProxy({ scheme: "ftp", host: "proxy.test", port: 21 }), null);

  const echo = createEchoServer();
  const echoPort = await listen(echo);
  const httpStatsA = { requests: 0, auth: [] };
  const httpStatsB = { requests: 0, auth: [] };
  const authA = `Basic ${Buffer.from("alice:secret").toString("base64")}`;
  const authB = `Basic ${Buffer.from("bob:clave").toString("base64")}`;
  const proxyA = createHttpProxy(authA, httpStatsA);
  const proxyB = createHttpProxy(authB, httpStatsB);
  const proxyPortA = await listen(proxyA);
  const proxyPortB = await listen(proxyB);
  const socksStats = { requests: 0, authenticated: false };
  const socks = createSocks5Proxy("sock-user", "sock-pass", socksStats);
  const socksPort = await listen(socks);
  const socks4Stats = { requests: 0, authenticated: false };
  const socks4 = createSocks4Proxy("legacy-user", socks4Stats);
  const socks4Port = await listen(socks4);
  const runtime = new ProfileProxyRuntime();

  try {
    const routeA = await runtime.ensure("profile-a", { scheme: "http", host: "127.0.0.1", port: proxyPortA, username: "alice", password: "secret" });
    const routeB = await runtime.ensure("profile-b", { scheme: "http", host: "127.0.0.1", port: proxyPortB, username: "bob", password: "clave" });
    assert.notEqual(routeA.localPort, routeB.localPort, "cada perfil debe tener un puente aislado");
    assert.equal(await connectViaBridge(routeA.localPort, echoPort, "perfil-a"), "perfil-a");
    assert.equal(await connectViaBridge(routeB.localPort, echoPort, "perfil-b"), "perfil-b");
    assert.deepEqual(httpStatsA.auth, [authA]);
    assert.deepEqual(httpStatsB.auth, [authB]);

    const socksSocket = await connectThroughProxy({ scheme: "socks5", host: "127.0.0.1", port: socksPort, username: "sock-user", password: "sock-pass" }, "127.0.0.1", echoPort);
    assert.equal(await roundTrip(socksSocket, "socks-ok"), "socks-ok");
    socksSocket.destroy();
    assert.equal(socksStats.authenticated, true);
    assert.equal(socksStats.requests, 1);

    const socks4Socket = await connectThroughProxy({ scheme: "socks4", host: "127.0.0.1", port: socks4Port, username: "legacy-user" }, "127.0.0.1", echoPort);
    assert.equal(await roundTrip(socks4Socket, "socks4-ok"), "socks4-ok");
    socks4Socket.destroy();
    assert.equal(socks4Stats.authenticated, true);
    assert.equal(socks4Stats.requests, 1);
  } finally {
    await runtime.closeAll();
    await Promise.all([close(proxyA), close(proxyB), close(socks), close(socks4), close(echo)]);
  }
};
