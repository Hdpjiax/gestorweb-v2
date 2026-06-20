const MAX_URL_LENGTH = 2048;
const MAX_STATE_BYTES = 5 * 1024 * 1024;
const MAX_REPEATER_BODY_BYTES = 1024 * 1024;
const MAX_COOKIE_COUNT = 500;
const MAX_COOKIE_VALUE_LENGTH = 4096;
const SAFE_PROFILE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sizeOfJson(value) {
  return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
}

function assertJsonSize(value, maxBytes = MAX_STATE_BYTES) {
  const bytes = sizeOfJson(value);
  if (bytes > maxBytes) throw new Error(`payload too large: ${bytes} bytes`);
  return value;
}

function parseUrl(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > MAX_URL_LENGTH) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function safeExternalUrl(value) {
  const url = parseUrl(value);
  if (!url || !EXTERNAL_PROTOCOLS.has(url.protocol)) return null;
  return url.toString();
}

function safeHttpUrl(value) {
  const url = parseUrl(value);
  if (!url || !HTTP_PROTOCOLS.has(url.protocol)) return null;
  return url.toString();
}

function assertProfileId(profileId) {
  const id = String(profileId || "");
  if (!SAFE_PROFILE_ID.test(id)) throw new Error("invalid profile id");
  return id;
}

function safeString(value, maxLength = 512) {
  return String(value ?? "").slice(0, maxLength);
}

function sanitizeHeaders(headers) {
  const clean = {};
  if (!isPlainObject(headers)) return clean;
  for (const [key, value] of Object.entries(headers)) {
    const name = String(key || "").trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,64}$/.test(name)) continue;
    clean[name] = safeString(value, 2048).replace(/[\r\n]/g, " ");
  }
  return clean;
}

function sanitizeRepeaterRequest(request) {
  if (!isPlainObject(request)) throw new Error("invalid request");
  const method = safeString(request.method || "GET", 16).toUpperCase();
  if (!SAFE_HTTP_METHODS.has(method)) throw new Error("invalid HTTP method");
  const url = safeHttpUrl(request.url);
  if (!url) throw new Error("invalid HTTP URL");
  const body = safeString(request.body || "", MAX_REPEATER_BODY_BYTES);
  return {
    method,
    url,
    headers: sanitizeHeaders(request.headers),
    body
  };
}

function sanitizeCookie(cookie) {
  if (!isPlainObject(cookie)) return null;
  const name = safeString(cookie.name, 256).trim();
  const domain = safeString(cookie.domain, 255).trim();
  const url = cookie.url ? safeHttpUrl(cookie.url) : null;
  if (!name || (!domain && !url)) return null;
  return {
    name,
    value: safeString(cookie.value, MAX_COOKIE_VALUE_LENGTH),
    domain: domain || undefined,
    url: url || undefined,
    path: safeString(cookie.path || "/", 512) || "/",
    secure: cookie.secure !== false,
    httpOnly: !!cookie.httpOnly,
    expirationDate: Number(cookie.expirationDate || cookie.expires || 0) || undefined,
    _delete: !!cookie._delete
  };
}

function sanitizeCookies(cookies) {
  if (!Array.isArray(cookies)) return [];
  return cookies.slice(0, MAX_COOKIE_COUNT).map(sanitizeCookie).filter(Boolean);
}

function sanitizeTotpSecret(secret) {
  const clean = safeString(secret, 256).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z2-7]+=*$/.test(clean)) throw new Error("invalid TOTP secret");
  return clean;
}

module.exports = {
  MAX_STATE_BYTES,
  assertJsonSize,
  assertProfileId,
  isPlainObject,
  safeExternalUrl,
  safeHttpUrl,
  sanitizeCookies,
  sanitizeRepeaterRequest,
  sanitizeTotpSecret
};
