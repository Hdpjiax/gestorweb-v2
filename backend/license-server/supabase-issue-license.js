const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

loadDotEnv(path.join(__dirname, ".env"));
loadDotEnv(path.join(__dirname, ".env.example"));

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

function privateKey() {
  const file = path.resolve(__dirname, process.env.PRIVATE_KEY_FILE || "private_key.pem");
  if (!fs.existsSync(file)) throw new Error(`No existe clave privada: ${file}. Ejecuta npm run keys.`);
  return fs.readFileSync(file, "utf8");
}

function createLicenseId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GW-${date}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

function expiresForPlan(plan, now) {
  const item = PLANS[plan];
  if (!item) throw new Error(`plan invalido: ${plan}. Usa ${Object.keys(PLANS).join(", ")}`);
  if (item.days === null) return null;
  return now + item.days * 24 * 60 * 60 * 1000;
}

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createLicenseText(payload) {
  const segment = b64urlJson(payload);
  const signature = crypto.sign("RSA-SHA256", Buffer.from(segment, "utf8"), privateKey()).toString("base64url");
  return `${LICENSE_PREFIX}\n${segment}\n${signature}`;
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Falta ${name} en .env`);
  return value;
}

async function supabaseInsert(row) {
  const url = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${url}/rest/v1/licenses`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  const [hwid, plan = "30d", tier = "standard"] = process.argv.slice(2);
  if (!hwid) {
    console.error("Uso: npm run issue:supabase -- <HWID> <1d|7d|15d|30d|lifetime> [tier]");
    process.exit(1);
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const now = Date.now();
  const expiresAt = expiresForPlan(plan, now);
  const id = createLicenseId();
  const features = [tier];

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
      url: supabaseUrl,
      anon_key: anonKey
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

  await supabaseInsert(row);

  console.log("ID:", id);
  console.log("PLAN:", plan);
  console.log("VENCE:", expiresAt ? new Date(expiresAt).toLocaleString() : "permanente");
  console.log("\nLICENCIA PARA CLIENTE:\n");
  console.log(licenseText);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
