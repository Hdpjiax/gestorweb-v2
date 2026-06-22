const { ipcMain } = require("electron");
const crypto = require("crypto");
const { currentLicenseStatus } = require("./license-ipc");
const adminConfigStore = require("./admin-config-store");

const CHANNELS = ["admin:login", "admin:resume", "admin:config", "admin:forgetConfig", "admin:list", "admin:create", "admin:revoke", "admin:logout"];
const APP_ID = "gestor-web";
const LICENSE_PREFIX = "GW-LIC-V1";
const PLANS = {
  "1d": { label: "1 dia", days: 1 },
  "7d": { label: "7 dias", days: 7 },
  "15d": { label: "15 dias", days: 15 },
  "30d": { label: "30 dias", days: 30 },
  lifetime: { label: "permanente", days: null }
};

let session = null;

function isAdminLicense(status) {
  const features = Array.isArray(status?.features) ? status.features : [];
  return !!status?.active && (status.tier === "admin" || features.includes("admin"));
}

async function assertAdminLicense() {
  const status = await currentLicenseStatus();
  if (!isAdminLicense(status)) throw new Error("esta seccion requiere una licencia admin activa");
  return status;
}

function normalizeSupabaseUrl(value) {
  return adminConfigStore.normalizeUrl(value);
}

function requireText(value, label, min = 1) {
  const text = String(value || "").trim();
  if (text.length < min) throw new Error(`${label} invalido`);
  return text;
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

function normalizeFeatures(features, tier) {
  const list = Array.isArray(features)
    ? features
    : String(features || tier || "standard").split(",");
  const clean = list.map((item) => String(item).trim()).filter(Boolean);
  if (tier === "admin" && !clean.includes("admin")) clean.unshift("admin");
  return clean.length ? [...new Set(clean)].slice(0, 25) : ["standard"];
}

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function createLicenseText(payload) {
  if (!session?.privateKeyPem) throw new Error("clave privada no cargada en sesion admin");
  const payloadSegment = b64urlJson(payload);
  const signature = crypto.sign("RSA-SHA256", Buffer.from(payloadSegment, "utf8"), session.privateKeyPem).toString("base64url");
  return `${LICENSE_PREFIX}\n${payloadSegment}\n${signature}`;
}

async function supabaseRequest(pathname, options = {}) {
  if (!session) throw new Error("sesion admin no iniciada");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${session.supabaseUrl}${pathname}`, {
      method: options.method || "GET",
      headers: {
        apikey: session.serviceRoleKey,
        Authorization: `Bearer ${session.serviceRoleKey}`,
        "content-type": "application/json",
        Prefer: options.prefer || "return=representation"
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(typeof data === "string" ? data : (data?.message || data?.error || `HTTP ${response.status}`));
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function publicRow(row) {
  return {
    id: row.id,
    hwid: row.hwid,
    app: row.app,
    plan: row.plan,
    tier: row.tier,
    features: row.features || [],
    issued_at: row.issued_at,
    expires_at: row.expires_at,
    revoked: !!row.revoked,
    revoke_reason: row.revoke_reason || null,
    created_at: row.created_at || null,
    revoked_at: row.revoked_at || null,
    last_check_at: row.last_check_at || null,
    last_hwid: row.last_hwid || null,
    licenseText: row.license_text || ""
  };
}

async function listLicenses() {
  await assertAdminLicense();
  const rows = await supabaseRequest("/rest/v1/licenses?select=id,hwid,app,plan,tier,features,issued_at,expires_at,revoked,revoke_reason,created_at,revoked_at,last_check_at,last_hwid,license_text&order=created_at.desc&limit=200", { prefer: "" });
  return { ok: true, provider: "supabase", supabaseUrl: session.supabaseUrl, licenses: (Array.isArray(rows) ? rows : []).map(publicRow), config: adminConfigStore.info(session) };
}

async function login(config = {}) {
  await assertAdminLicense();
  const clean = adminConfigStore.normalizeConfig(config);
  session = clean;
  try {
    const result = await listLicenses();
    if (config.remember !== false) adminConfigStore.saveConfig(clean);
    return { ok: true, ...result };
  } catch (error) {
    session = null;
    throw error;
  }
}

async function resumeSavedLogin() {
  await assertAdminLicense();
  const saved = adminConfigStore.loadConfig();
  if (!saved) return { ok: false, reason: "sin configuracion admin guardada", config: adminConfigStore.info(null) };
  return login({ ...saved, remember: true });
}

async function createLicense(license = {}) {
  await assertAdminLicense();
  if (!session) throw new Error("sesion admin no iniciada");
  const hwid = requireText(license.hwid, "HWID", 6);
  const plan = String(license.plan || "30d").trim();
  const tier = String(license.tier || "standard").trim();
  const features = normalizeFeatures(license.features, tier);
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
    tier,
    issued_at: now,
    expires_at: expiresAt,
    features,
    online_required: true,
    license_provider: "supabase",
    license_db: {
      provider: "supabase",
      url: session.supabaseUrl,
      anon_key: session.anonKey
    },
    sig_alg: "RSA-SHA256"
  };
  const licenseText = createLicenseText(payload);
  const row = {
    id,
    hwid,
    app: APP_ID,
    plan,
    tier,
    features,
    issued_at: now,
    expires_at: expiresAt,
    revoked: false,
    revoke_reason: null,
    license_hash: sha256(licenseText),
    license_text: licenseText
  };
  const inserted = await supabaseRequest("/rest/v1/licenses", { method: "POST", body: row });
  const saved = Array.isArray(inserted) && inserted[0] ? publicRow(inserted[0]) : publicRow(row);
  return { ok: true, license: saved, licenseText };
}

async function revokeLicense(id, reason) {
  await assertAdminLicense();
  const licenseId = requireText(id, "ID de licencia", 6);
  const updated = await supabaseRequest(`/rest/v1/licenses?id=eq.${encodeURIComponent(licenseId)}`, {
    method: "PATCH",
    body: {
      revoked: true,
      revoke_reason: String(reason || "revocada por administrador"),
      revoked_at: new Date().toISOString()
    }
  });
  const rows = Array.isArray(updated) ? updated : [];
  if (!rows.length) throw new Error("no se encontro la licencia para revocar");
  const currentStatus = await currentLicenseStatus().catch(() => null);
  return { ok: true, license: publicRow(rows[0]), currentStatus };
}

function registerLicenseAdminIpc() {
  for (const channel of CHANNELS) {
    try { ipcMain.removeHandler(channel); } catch {}
  }
  ipcMain.handle("admin:login", (_event, config) => login(config));
  ipcMain.handle("admin:resume", () => resumeSavedLogin());
  ipcMain.handle("admin:config", () => adminConfigStore.info());
  ipcMain.handle("admin:forgetConfig", () => adminConfigStore.forgetConfig());
  ipcMain.handle("admin:list", () => listLicenses());
  ipcMain.handle("admin:create", (_event, license) => createLicense(license));
  ipcMain.handle("admin:revoke", (_event, id, reason) => revokeLicense(id, reason));
  ipcMain.handle("admin:logout", () => { session = null; return { ok: true, config: adminConfigStore.info() }; });
}

module.exports = { registerLicenseAdminIpc, normalizeSupabaseUrl };
