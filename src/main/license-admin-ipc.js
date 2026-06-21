const { ipcMain } = require("electron");

const CHANNELS = ["admin:login", "admin:list", "admin:create", "admin:revoke", "admin:logout"];
let session = null;

function normalizeServerUrl(value) {
  const url = new URL(String(value || "").trim());
  const local = new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error("el servidor admin debe usar HTTPS");
  return url.toString().replace(/\/+$/, "");
}

async function adminRequest(pathname, options = {}) {
  if (!session) throw new Error("sesion admin no iniciada");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${session.serverUrl}${pathname}`, {
      method: options.method || "GET",
      headers: {
        "content-type": "application/json",
        "x-admin-token": session.credential
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function login(serverUrl, credential) {
  const cleanCredential = String(credential || "").trim();
  if (cleanCredential.length < 24) throw new Error("credencial admin invalida");
  session = { serverUrl: normalizeServerUrl(serverUrl), credential: cleanCredential };
  try {
    const result = await adminRequest("/admin/licenses");
    return { ok: true, serverUrl: session.serverUrl, licenses: result.licenses || [] };
  } catch (error) {
    session = null;
    throw error;
  }
}

function registerLicenseAdminIpc() {
  for (const channel of CHANNELS) {
    try { ipcMain.removeHandler(channel); } catch {}
  }
  ipcMain.handle("admin:login", (_event, serverUrl, credential) => login(serverUrl, credential));
  ipcMain.handle("admin:list", async () => {
    const result = await adminRequest("/admin/licenses");
    return { ok: true, serverUrl: session.serverUrl, licenses: result.licenses || [] };
  });
  ipcMain.handle("admin:create", (_event, license) => adminRequest("/admin/licenses", { method: "POST", body: license }));
  ipcMain.handle("admin:revoke", (_event, id, reason) => adminRequest("/admin/revoke", { method: "POST", body: { id, reason } }));
  ipcMain.handle("admin:logout", () => { session = null; return { ok: true }; });
}

module.exports = { registerLicenseAdminIpc, normalizeServerUrl };
