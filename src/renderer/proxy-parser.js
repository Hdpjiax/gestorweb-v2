export function parseProxyLine(line, defaultScheme) {
  const text = String(line || "").trim().replace(/^['"]|['"]$/g, "");
  if (!text) return null;
  try {
    if (text.includes("://")) {
      const u = new URL(text);
      return normalizeProxy({
        scheme: u.protocol.replace(":", ""),
        host: u.hostname,
        port: u.port,
        username: u.username ? decodeURIComponent(u.username) : null,
        password: u.password ? decodeURIComponent(u.password) : null,
        label: proxyGeoLabel(u.username ? decodeURIComponent(u.username) : "")
      }, defaultScheme);
    }
    if (text.includes("@")) {
      const at = text.lastIndexOf("@");
      const auth = text.slice(0, at);
      const hostPort = parseHostPort(text.slice(at + 1));
      if (!hostPort) return null;
      const sep = auth.lastIndexOf(":");
      if (sep <= 0) return null;
      const username = auth.slice(0, sep);
      const password = auth.slice(sep + 1);
      return normalizeProxy({ ...hostPort, scheme: defaultScheme, username, password, label: proxyGeoLabel(username) }, defaultScheme);
    }
    const parts = text.split(":");
    if (parts.length === 2) return normalizeProxy({ scheme: defaultScheme, host: parts[0], port: parts[1] }, defaultScheme);
    if (parts.length === 4) return normalizeProxy({ scheme: defaultScheme, host: parts[0], port: parts[1], username: parts[2], password: parts[3] }, defaultScheme);
  } catch {}
  return null;
}

export function parseProxyBulk(raw, defaultScheme) {
  const text = String(raw || "").trim();
  if (!text) return { proxies: [], invalid: 0, format: "vacio" };
  if (/^[\[{]/.test(text)) return parseProxyJson(text, defaultScheme);
  if (looksLikeCsv(text)) return parseProxyCsv(text, defaultScheme);
  return parseProxyText(text, defaultScheme);
}

export function parseProxyText(text, defaultScheme) {
  const lines = text.split(/\r?\n/).flatMap((line) => line.trim().includes(" ") ? line.trim().split(/\s+/) : [line.trim()]).filter(Boolean);
  const proxies = [];
  let invalid = 0;
  for (const line of lines) {
    const parsed = parseProxyLine(line, defaultScheme);
    if (parsed) proxies.push(parsed); else invalid++;
  }
  return { proxies, invalid, format: "text" };
}

export function parseProxyJson(text, defaultScheme) {
  try {
    const payload = JSON.parse(text);
    const list = Array.isArray(payload) ? payload : Array.isArray(payload.proxies) ? payload.proxies : Array.isArray(payload.data) ? payload.data : [payload];
    const proxies = [];
    let invalid = 0;
    for (const item of list) {
      const parsed = typeof item === "string" ? parseProxyLine(item, defaultScheme) : parseProxyObject(item, defaultScheme);
      if (parsed) proxies.push(parsed); else invalid++;
    }
    return { proxies, invalid, format: "json" };
  } catch {
    return { proxies: [], invalid: 1, format: "json" };
  }
}

export function parseProxyCsv(text, defaultScheme) {
  const delimiter = detectCsvDelimiter(text);
  const rows = text.split(/\r?\n/).map((line) => parseCsvLine(line, delimiter)).filter((row) => row.some((cell) => cell.trim()));
  if (!rows.length) return { proxies: [], invalid: 0, format: "csv" };
  const first = rows[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = first.some((cell) => ["host", "ip", "server", "proxy", "endpoint", "port", "username", "user", "password", "pass", "scheme", "protocol"].includes(cell));
  const headers = hasHeader ? first : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const proxies = [];
  let invalid = 0;
  for (const row of dataRows) {
    const parsed = hasHeader ? parseProxyCsvObject(headers, row, defaultScheme) : parseProxyCsvRow(row, defaultScheme);
    if (parsed) proxies.push(parsed); else invalid++;
  }
  return { proxies, invalid, format: "csv" };
}

export function parseProxyObject(item, defaultScheme) {
  if (!item || typeof item !== "object") return null;
  const proxyText = item.proxy || item.endpoint || item.url || item.line;
  if (proxyText) return parseProxyLine(proxyText, item.scheme || item.protocol || defaultScheme);
  return normalizeProxy({
    scheme: item.scheme || item.protocol || item.type || defaultScheme,
    host: item.host || item.ip || item.server || item.address,
    port: item.port,
    username: item.username || item.user || item.login || null,
    password: item.password || item.pass || null,
    label: item.label || item.name || item.geo || item.country || item.state || null
  }, defaultScheme);
}

export function parseProxyCsvObject(headers, row, defaultScheme) {
  const get = (...names) => {
    const index = headers.findIndex((h) => names.includes(h));
    return index >= 0 ? row[index] : "";
  };
  const proxyText = get("proxy", "endpoint", "url", "line");
  if (proxyText) return parseProxyLine(proxyText, get("scheme", "protocol", "type") || defaultScheme);
  return normalizeProxy({
    scheme: get("scheme", "protocol", "type") || defaultScheme,
    host: get("host", "ip", "server", "address"),
    port: get("port"),
    username: get("username", "user", "login") || null,
    password: get("password", "pass") || null,
    label: get("label", "name", "geo", "country", "state") || null
  }, defaultScheme);
}

export function parseProxyCsvRow(row, defaultScheme) {
  if (row.length === 1) return parseProxyLine(row[0], defaultScheme);
  if (row.length >= 4) return normalizeProxy({ scheme: defaultScheme, host: row[0], port: row[1], username: row[2], password: row[3], label: row[4] || null }, defaultScheme);
  if (row.length >= 2) return normalizeProxy({ scheme: defaultScheme, host: row[0], port: row[1] }, defaultScheme);
  return null;
}

export function normalizeProxy(item, defaultScheme = "http") {
  const rawScheme = String(item.scheme || defaultScheme || "http").toLowerCase().replace(/:$/, "");
  const scheme = rawScheme === "socks" ? "socks5" : rawScheme === "socks4a" ? "socks4" : rawScheme;
  const host = String(item.host || "").trim().replace(/^\[|\]$/g, "");
  const port = parseInt(item.port, 10);
  if (!["http", "https", "socks4", "socks5"].includes(scheme)) return null;
  if (!isValidHost(host) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return {
    scheme,
    host,
    port,
    username: String(item.username || "").trim() || null,
    password: String(item.password || "").trim() || null,
    label: String(item.label || "").trim() || null
  };
}

export function parseHostPort(value) {
  const text = String(value || "").trim();
  const ipv6 = text.match(/^\[([^\]]+)\]:(\d+)$/);
  if (ipv6) return { host: ipv6[1], port: ipv6[2] };
  const idx = text.lastIndexOf(":");
  if (idx <= 0) return null;
  return { host: text.slice(0, idx), port: text.slice(idx + 1) };
}

export function proxyGeoLabel(username) {
  const marker = String(username || "").split("__")[1];
  return marker || null;
}

export function isValidHost(host) {
  if (!host || host.includes("://") || /\s/.test(host)) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host.split(".").every((x) => Number(x) >= 0 && Number(x) <= 255);
  if (/^[a-zA-Z0-9.-]+$/.test(host) && host.includes(".")) return true;
  if (/^[a-fA-F0-9:]+$/.test(host) && host.includes(":")) return true;
  return false;
}

export function proxyKey(p) {
  return `${p.scheme}|${String(p.host).toLowerCase()}|${p.port}|${p.username || ""}`;
}

export function looksLikeCsv(text) {
  const first = text.split(/\r?\n/).find((line) => line.trim()) || "";
  if (!first) return false;
  const lower = first.toLowerCase();
  if (/[\t,|]/.test(first)) return true;
  return first.includes(";") && /(host|ip|proxy|endpoint|port|user|pass|scheme|protocol)/.test(lower);
}

export function detectCsvDelimiter(text) {
  const first = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = ["\t", ",", "|", ";"];
  return candidates.sort((a, b) => first.split(b).length - first.split(a).length)[0];
}

export function parseCsvLine(line, delimiter) {
  const out = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === delimiter && !quoted) { out.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  out.push(current.trim());
  return out;
}
