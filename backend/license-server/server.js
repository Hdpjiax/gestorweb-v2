const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

loadDotEnv(path.join(__dirname, ".env"));
loadDotEnv(path.join(__dirname, ".env.example"));

const PORT = Number(process.env.PORT || 8787);
const ADMIN_TOKEN = process.env.LICENSE_ADMIN_TOKEN || "dev-admin-change-me";
const DB_FILE = path.resolve(__dirname, process.env.DB_FILE || "licenses-db.json");
const PRIVATE_KEY_FILE = path.resolve(__dirname, process.env.PRIVATE_KEY_FILE || "private_key.pem");
const PUBLIC_KEY_FILE = path.resolve(__dirname, process.env.PUBLIC_KEY_FILE || "public_key.pem");
const PUBLIC_LICENSE_SERVER_URL = String(process.env.PUBLIC_LICENSE_SERVER_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, "");
const APP_ID = "gestor-web";
const LICENSE_PREFIX = "GW-LIC-V1";

const PLANS = {
  "1d": { label: "1 dia", days: 1 },
  "7d": { label: "7 dias", days: 7 },
  "15d": { label: "15 dias", days: 15 },
  "30d": { label: "30 dias", days: 30 },
  lifetime: { label: "permanente", days: null }
};

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const idx = clean.indexOf("=");
    const key = clean.slice(0, idx).trim();
    const value = clean.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function loadDb() {
  return readJson(DB_FILE, { version: 1, licenses: [] });
}

function saveDb(db) {
  writeJson(DB_FILE, db);
}

function privateKey() {
  if (!fs.existsSync(PRIVATE_KEY_FILE)) throw new Error(`No existe PRIVATE_KEY_FILE: ${PRIVATE_KEY_FILE}. Ejecuta: npm run keys`);
  return fs.readFileSync(PRIVATE_KEY_FILE, "utf8");
}

function publicKey() {
  if (fs.existsSync(PUBLIC_KEY_FILE)) return fs.readFileSync(PUBLIC_KEY_FILE, "utf8");
  return crypto.createPublicKey(privateKey()).export({ type: "spki", format: "pem" });
}

function send(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-admin-token"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        reject(new Error("body demasiado grande"));
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try { resolve(JSON.parse(text)); } catch { reject(new Error("JSON invalido")); }
    });
    req.on("error", reject);
  });
}

function isAdmin(req) {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const token = req.headers["x-admin-token"] || bearer;
  return token && token === ADMIN_TOKEN;
}

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function licenseHash(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function createLicenseId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GW-${date}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

function expiresForPlan(plan, now) {
  const item = PLANS[plan];
  if (!item) throw new Error(`plan invalido: ${plan}`);
  if (item.days === null) return null;
  return now + item.days * 24 * 60 * 60 * 1000;
}

function createLicenseText(payload) {
  const segment = b64urlJson(payload);
  const signature = crypto.sign("RSA-SHA256", Buffer.from(segment, "utf8"), privateKey()).toString("base64url");
  return `${LICENSE_PREFIX}\n${segment}\n${signature}`;
}

function parseLicenseText(text) {
  const raw = String(text || "").trim();
  if (!raw.startsWith(LICENSE_PREFIX)) throw new Error("prefijo invalido");
  let body = raw.slice(LICENSE_PREFIX.length).trim();
  if (body.startsWith(":") || body.startsWith(".")) body = body.slice(1).trim();
  const newlineParts = body.replace(/\r/g, "\n").split(/\n+/).map((part) => part.trim()).filter(Boolean);
  let payloadSegment = "";
  let signatureSegment = "";
  if (newlineParts.length >= 2) {
    [payloadSegment, signatureSegment] = newlineParts;
  } else {
    const dotParts = body.split(".").map((part) => part.trim()).filter(Boolean);
    [payloadSegment, signatureSegment] = dotParts;
  }
  if (!payloadSegment || !signatureSegment) throw new Error("formato invalido");
  const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"));
  const signature = Buffer.from(signatureSegment, "base64url");
  return { payload, payloadSegment, signature };
}

function verifySignature(licenseText) {
  const parsed = parseLicenseText(licenseText);
  const ok = crypto.verify("RSA-SHA256", Buffer.from(parsed.payloadSegment, "utf8"), publicKey(), parsed.signature);
  if (!ok) throw new Error("firma invalida");
  return parsed.payload;
}

function normalizeFeatures(features) {
  if (!Array.isArray(features) || !features.length) return ["standard"];
  return features.map((item) => String(item).trim()).filter(Boolean).slice(0, 25);
}

function adminCreateLicense(body) {
  const hwid = String(body.hwid || "").trim();
  if (!hwid) throw new Error("hwid requerido");
  const plan = String(body.plan || "30d").trim();
  if (!PLANS[plan]) throw new Error(`plan invalido. Usa: ${Object.keys(PLANS).join(", ")}`);

  const now = Date.now();
  const expiresAt = expiresForPlan(plan, now);
  const id = createLicenseId();
  const payload = {
    v: 1,
    id,
    hwid,
    app: APP_ID,
    plan,
    type: PLANS[plan].label,
    tier: String(body.tier || "standard"),
    issued_at: now,
    expires_at: expiresAt,
    features: normalizeFeatures(body.features),
    online_required: body.online_required !== false,
    license_server: PUBLIC_LICENSE_SERVER_URL,
    sig_alg: "RSA-SHA256"
  };
  const licenseText = createLicenseText(payload);
  const db = loadDb();
  db.licenses.unshift({
    id,
    hwid,
    app: APP_ID,
    plan,
    tier: payload.tier,
    features: payload.features,
    issued_at: now,
    expires_at: expiresAt,
    revoked: false,
    revoke_reason: null,
    created_at: new Date(now).toISOString(),
    license_hash: licenseHash(licenseText),
    license_text: licenseText
  });
  saveDb(db);
  return { ok: true, license: db.licenses[0], licenseText };
}

function adminRevoke(body) {
  const id = String(body.id || body.licenseId || "").trim();
  if (!id) throw new Error("id requerido");
  const db = loadDb();
  const item = db.licenses.find((license) => license.id === id);
  if (!item) throw new Error("licencia no encontrada");
  item.revoked = true;
  item.revoke_reason = String(body.reason || "revocada por admin");
  item.revoked_at = new Date().toISOString();
  saveDb(db);
  return { ok: true, license: item };
}

function verifyOnline(body) {
  const hwid = String(body.hwid || "").trim();
  const licenseText = String(body.licenseText || "").trim();
  const payload = verifySignature(licenseText);
  const now = Date.now();

  if (payload.app !== APP_ID) return { active: false, reason: "app invalida", serverTime: now };
  if (payload.hwid && payload.hwid !== hwid) return { active: false, reason: "HWID no coincide", serverTime: now };

  const db = loadDb();
  const id = String(payload.id || payload.license_id || "");
  const item = db.licenses.find((license) => license.id === id);
  if (!item) return { active: false, reason: "licencia no registrada en servidor", serverTime: now };
  if (item.license_hash !== licenseHash(licenseText)) return { active: false, reason: "licencia no coincide con registro", serverTime: now };
  if (item.revoked) return { active: false, revoked: true, reason: item.revoke_reason || "licencia revocada", serverTime: now };

  const expiresAt = Number(payload.expires_at || 0) || null;
  if (expiresAt && now > expiresAt) return { active: false, reason: "licencia expirada", expiresAt, serverTime: now };

  item.last_check_at = new Date(now).toISOString();
  item.last_hwid = hwid;
  saveDb(db);

  return {
    active: true,
    reason: "ok",
    id,
    plan: payload.plan,
    tier: payload.tier,
    expiresAt,
    permanent: !expiresAt,
    features: payload.features || [],
    serverTime: now
  };
}

async function route(req, res) {
  if (req.method === "OPTIONS") return send(res, 200, { ok: true });

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, { ok: true, app: APP_ID, serverTime: Date.now() });
  }

  try {
    if (url.pathname.startsWith("/admin/")) {
      if (!isAdmin(req)) return send(res, 401, { ok: false, error: "admin token invalido" });
      if (req.method === "GET" && url.pathname === "/admin/licenses") {
        const db = loadDb();
        return send(res, 200, { ok: true, licenses: db.licenses.map(({ license_text, ...item }) => item) });
      }
      const body = await readBody(req);
      if (req.method === "POST" && url.pathname === "/admin/licenses") return send(res, 200, adminCreateLicense(body));
      if (req.method === "POST" && url.pathname === "/admin/revoke") return send(res, 200, adminRevoke(body));
    }

    if (req.method === "POST" && url.pathname === "/v1/verify") {
      const body = await readBody(req);
      return send(res, 200, verifyOnline(body));
    }

    return send(res, 404, { ok: false, error: "ruta no encontrada" });
  } catch (error) {
    return send(res, 400, { ok: false, error: error?.message || "error" });
  }
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => send(res, 500, { ok: false, error: error?.message || "error interno" }));
});

server.listen(PORT, () => {
  console.log(`License server listo en http://127.0.0.1:${PORT}`);
  console.log(`Public URL usada en licencias: ${PUBLIC_LICENSE_SERVER_URL}`);
  console.log(`DB: ${DB_FILE}`);
});
