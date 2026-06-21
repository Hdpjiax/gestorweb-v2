const fs = require("fs");
const path = require("path");

loadDotEnv(path.join(__dirname, ".env"));
loadDotEnv(path.join(__dirname, ".env.example"));

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

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Falta ${name} en .env`);
  return value;
}

async function main() {
  const [id, ...reasonParts] = process.argv.slice(2);
  const reason = reasonParts.join(" ") || "revocada por admin";
  if (!id) {
    console.error("Uso: npm run revoke:supabase -- <LICENSE_ID> [motivo]");
    process.exit(1);
  }

  const url = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${url}/rest/v1/licenses?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      revoked: true,
      revoke_reason: reason,
      revoked_at: new Date().toISOString()
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  console.log(`Licencia ${id} revocada: ${reason}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
