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

async function main() {
  const [id, ...reasonParts] = process.argv.slice(2);
  const reason = reasonParts.join(" ") || "revocada por admin";
  if (!id) {
    console.error("Uso: node revoke-license.js <LICENSE_ID> [motivo]");
    process.exit(1);
  }

  const port = process.env.PORT || 8787;
  const serverUrl = (process.env.LICENSE_SERVER_ADMIN_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, "");
  const token = process.env.LICENSE_ADMIN_TOKEN;
  if (!token) {
    console.error("Falta LICENSE_ADMIN_TOKEN en .env");
    process.exit(1);
  }

  const response = await fetch(`${serverUrl}/admin/revoke`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-token": token
    },
    body: JSON.stringify({ id, reason })
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    console.error(data.error || `HTTP ${response.status}`);
    process.exit(1);
  }

  console.log(`Licencia ${id} revocada: ${data.license.revoke_reason}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
