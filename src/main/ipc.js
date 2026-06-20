const { ipcMain, shell, dialog, net: electronNet, app } = require("electron");
const crypto = require("crypto");
const fs = require("fs");

const {
  stateFile,
  readJson,
  writeJson,
  getHwid,
  sessionFor,
  profileDir,
  dataDir
} = require("./utils");
const { profileWindows, setMainWindowRef } = require("./windows");

const {
  openProfileWindow,
  closeProfileWindow,
  focusProfileWindow,
  prepareSession
} = require("./windows");

const { checkProxy } = require("./proxies");
const {
  MAX_STATE_BYTES,
  assertJsonSize,
  assertProfileId,
  isPlainObject,
  safeExternalUrl,
  safeHttpUrl,
  sanitizeCookies,
  sanitizeRepeaterRequest,
  sanitizeTotpSecret
} = require("./security");
const {
  createDefaultState,
  migrateState,
  prepareStateForSave
} = require("./state-schema");

// ─── TOTP ────────────────────────────────────────────────────────────────────
function base32ToBuffer(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = sanitizeTotpSecret(secret).replace(/=+$/g, "");
  let bits = "";
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("invalid base32 secret");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totpCode(secret) {
  const step = 30;
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / step);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = crypto.createHmac("sha1", base32ToBuffer(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
  return { code, secondsLeft: step - (now % step) };
}

// ─── LICENSE ─────────────────────────────────────────────────────────────────
const GW_SIGNING_SECRET = process.env.GW_LICENSE_SECRET || "";

function verifyLicenseKey(key, hwid) {
  const text = String(key || "").trim();

  if (text.startsWith("GW-LIC-V1:")) {
    if (!GW_SIGNING_SECRET) {
      return { active: false, reason: "GW_LICENSE_SECRET no configurado en servidor" };
    }
    try {
      const rest = text.slice("GW-LIC-V1:".length);
      const dotIdx = rest.lastIndexOf(".");
      if (dotIdx < 1) return { active: false, reason: "formato invalido" };
      const payloadB64 = rest.slice(0, dotIdx);
      const sig = rest.slice(dotIdx + 1);
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
      const expected = crypto.createHmac("sha256", GW_SIGNING_SECRET)
        .update(Buffer.from(payloadB64, "base64").toString("utf8"))
        .digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
        return { active: false, reason: "firma invalida" };
      }
      if (payload.hwid && payload.hwid !== hwid) {
        return { active: false, reason: `licencia emitida para otro HWID (${payload.hwid})` };
      }
      if (payload.expiresAt && Date.now() > payload.expiresAt) {
        return { active: false, reason: "licencia expirada" };
      }
      return { active: true, tier: payload.tier || "pro", issuedAt: payload.issuedAt || null };
    } catch (e) {
      return { active: false, reason: `error al parsear licencia: ${e.message}` };
    }
  }

  const stripped = text.replace(/-/g, "").toUpperCase();
  if (!/^GW[A-F0-9]{12}$/.test(stripped)) {
    return { active: false, reason: "formato de clave incorrecto (esperado GW-XXXX-XXXX-XXXX)" };
  }
  const keyTail = stripped.slice(-12);
  const hwidTail = hwid.replace(/-/g, "").toUpperCase().slice(-12);
  if (keyTail !== hwidTail) {
    return { active: false, reason: "clave no corresponde a este HWID" };
  }
  return { active: true, tier: "standard" };
}

// ─── HTTP via electronNet ─────────────────────────────────────────────────────
function requestWithNet(request, requestSession = null) {
  const safeRequest = sanitizeRepeaterRequest(request);
  return new Promise((resolve) => {
    const started = Date.now();
    const req = electronNet.request({ method: safeRequest.method, url: safeRequest.url, session: requestSession || undefined });
    for (const [key, value] of Object.entries(safeRequest.headers || {})) req.setHeader(key, value);
    const chunks = [];
    req.on("response", (res) => {
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8"),
        ms: Date.now() - started
      }));
    });
    req.on("error", (error) => resolve({ status: 0, headers: {}, body: error.message, ms: Date.now() - started }));
    if (safeRequest.body) req.write(safeRequest.body);
    req.end();
  });
}

function repeaterSend(request) {
  return requestWithNet(request);
}

async function profileIpCheck(profileId) {
  const id = assertProfileId(profileId);
  const result = await requestWithNet({ method: "GET", url: "https://api.ipify.org?format=json" }, sessionFor(id));
  try { return JSON.parse(result.body); } catch { return { ip: null, raw: result.body }; }
}

// ─── STATE ────────────────────────────────────────────────────────────────────
function loadAppState() {
  const raw = readJson(stateFile(), null);
  const state = migrateState(raw || createDefaultState());
  writeJson(stateFile(), state);
  return state;
}

function saveAppState(rawState) {
  assertJsonSize(rawState || {});
  const state = prepareStateForSave(rawState || {});
  writeJson(stateFile(), state);
  return state;
}

function resolveWindow(mainWindowRef) {
  if (typeof mainWindowRef === "function") return mainWindowRef();
  return mainWindowRef || null;
}

function safeProfileUrl(url) {
  return url ? safeHttpUrl(url) : null;
}

function sanitizeProfile(profile) {
  if (!isPlainObject(profile)) throw new Error("invalid profile");
  return {
    ...profile,
    id: assertProfileId(profile.id),
    url: safeProfileUrl(profile.url) || ""
  };
}

// Resuelve el proxy asignado a un perfil desde el estado guardado.
// Si el renderer pasa proxy=null pero el perfil tiene proxy_id,
// resolvemos automáticamente para que proxy-per-profile siempre funcione.
function resolveProxyForProfile(profile, explicitProxy) {
  if (explicitProxy?.host && explicitProxy?.port) return explicitProxy;
  if (!profile?.proxy_id) return null;
  try {
    const state = loadAppState();
    const found = (state.proxies || []).find((p) => String(p.id) === String(profile.proxy_id));
    return found || null;
  } catch {
    return null;
  }
}

// ─── IPC HANDLERS ─────────────────────────────────────────────────────────────
function registerIpc(mainWindowRef) {
  const getDialogWindow = () => resolveWindow(mainWindowRef);

  setMainWindowRef(mainWindowRef);

  ipcMain.handle("state:load", () => loadAppState());
  ipcMain.handle("state:save", (_event, state) => {
    saveAppState(state);
    return { ok: true };
  });
  ipcMain.handle("app:openDataDir", () => shell.openPath(dataDir()));
  ipcMain.handle("app:dbStats", () => {
    const file = stateFile();
    const backup = `${file}.bak`;
    const exists = fs.existsSync(file);
    const backupExists = fs.existsSync(backup);
    return {
      dataDir: dataDir(),
      stateFile: file,
      backupFile: backup,
      bytes: exists ? fs.statSync(file).size : 0,
      backupBytes: backupExists ? fs.statSync(backup).size : 0,
      schemaVersion: loadAppState().schema_version
    };
  });
  ipcMain.handle("app:healthcheck", () => ({ ok: true, electron: process.versions.electron, chrome: process.versions.chrome }));
  ipcMain.handle("app:openExternal", async (_event, url) => {
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) return { ok: false, error: "invalid_url" };
    await shell.openExternal(safeUrl);
    return { ok: true };
  });
  ipcMain.handle("browse:prepareSession", (_event, profile, proxy) => {
    const sanitized = sanitizeProfile(profile);
    const resolvedProxy = resolveProxyForProfile(sanitized, proxy);
    return prepareSession(sanitized, resolvedProxy);
  });
  ipcMain.handle("browse:ipcheck", (_event, profileId) => profileIpCheck(profileId));
  ipcMain.handle("browse:freshenMemory", async (_event, profileId) => {
    const id = assertProfileId(profileId);
    await sessionFor(id).clearStorageData({ storages: ["appcache", "shadercache", "serviceworkers", "cachestorage"] });
    return { ok: true };
  });
  ipcMain.handle("cookies:get", (_event, profileId) => sessionFor(assertProfileId(profileId)).cookies.get({}));
  ipcMain.handle("cookies:clear", async (_event, profileId) => {
    await sessionFor(assertProfileId(profileId)).clearStorageData({ storages: ["cookies"] });
    return [];
  });
  ipcMain.handle("cookies:delete", async (_event, profileId, cookie) => {
    const ses = sessionFor(assertProfileId(profileId));
    const [safeCookie] = sanitizeCookies([cookie]);
    if (!safeCookie) return ses.cookies.get({});
    if (safeCookie.url && safeCookie.name) {
      await ses.cookies.delete({ url: safeCookie.url, name: safeCookie.name });
    } else if (safeCookie.domain && safeCookie.name) {
      const url = `https://${String(safeCookie.domain).replace(/^\./, "")}/`;
      await ses.cookies.delete({ url, name: safeCookie.name });
    }
    return ses.cookies.get({});
  });
  ipcMain.handle("cookies:set", async (_event, profileId, cookies) => {
    const ses = sessionFor(assertProfileId(profileId));
    for (const cookie of sanitizeCookies(cookies)) {
      if (cookie._delete) {
        const url = cookie.url || `https://${String(cookie.domain || "").replace(/^\./, "")}/`;
        await ses.cookies.delete({ url, name: cookie.name });
        continue;
      }
      const domain = String(cookie.domain || "").replace(/^\./, "");
      if (!cookie.name || !domain) continue;
      const details = {
        url: cookie.url || `https://${domain}`,
        name: cookie.name,
        value: cookie.value || "",
        domain: cookie.domain,
        path: cookie.path || "/",
        secure: cookie.secure !== false,
        httpOnly: !!cookie.httpOnly
      };
      const expirationDate = Number(cookie.expirationDate || 0);
      if (Number.isFinite(expirationDate) && expirationDate > 0) details.expirationDate = expirationDate;
      await ses.cookies.set(details);
    }
    return ses.cookies.get({});
  });

  // ── Licencia ────────────────────────────────────────────────────────────────
  ipcMain.handle("license:hwid", () => getHwid());
  ipcMain.handle("license:status", () => ({ hwid: getHwid(), active: !!loadAppState()?.license?.active }));
  ipcMain.handle("license:claimByKey", (_event, key) => {
    const hwid = getHwid();
    const result = verifyLicenseKey(key, hwid);
    return { ...result, hwid };
  });
  ipcMain.handle("license:install", (_event, text) => {
    const hwid = getHwid();
    const result = verifyLicenseKey(text, hwid);
    if (result.active) {
      try {
        const state = loadAppState();
        state.license = { active: true, text: String(text || "").trim(), hwid, activatedAt: Date.now(), tier: result.tier || "standard" };
        saveAppState(state);
      } catch {}
    }
    return { ...result, hwid };
  });
  ipcMain.handle("license:ipcheck", async () => {
    const result = await repeaterSend({ method: "GET", url: "https://api.ipify.org?format=json" });
    try { return JSON.parse(result.body); } catch { return { ip: null, raw: result.body }; }
  });

  // ── Perfiles / ventanas ─────────────────────────────────────────────────────
  ipcMain.handle("profiles:openWindow", (_event, profile, proxy, url) => {
    const sanitized = sanitizeProfile(profile);
    // Resolver proxy automáticamente desde proxy_id si el renderer no pasó uno
    const resolvedProxy = resolveProxyForProfile(sanitized, proxy);
    return openProfileWindow(sanitized, resolvedProxy, safeProfileUrl(url));
  });
  ipcMain.handle("profiles:closeWindow", async (_event, profileId) => {
    const id = assertProfileId(profileId);
    const state = loadAppState();
    const profile = state.profiles?.find((p) => String(p.id) === String(id));
    if (profile?.auto_wipe_close) {
      await sessionFor(id).clearStorageData({ storages: ["cookies", "cachestorage", "indexeddb", "localStorage", "sessionStorage"] });
      await sessionFor(id).cookies.set({ url: "https://gestor.invalid/", name: "gw_wipe", value: "1", expirationDate: 1 });
    }
    return closeProfileWindow(id);
  });
  ipcMain.handle("profiles:openPath", (_event, profileId) => shell.openPath(profileDir(assertProfileId(profileId))));
  ipcMain.handle("profiles:focusWindow", (_event, profileId) => focusProfileWindow(assertProfileId(profileId)));
  ipcMain.handle("profiles:isWindowOpen", (_event, profileId) => ({ open: profileWindows.has(assertProfileId(profileId)) }));

  // ── Proxies ─────────────────────────────────────────────────────────────────
  ipcMain.handle("proxies:check", (_event, proxy) => checkProxy(proxy));
  ipcMain.handle("proxies:checkAll", (_event, proxies) => Promise.all((Array.isArray(proxies) ? proxies : []).slice(0, 500).map(checkProxy)));

  // ── Repeater ─────────────────────────────────────────────────────────────────
  ipcMain.handle("repeater:send", async (_event, request) => {
    try {
      return await repeaterSend(request);
    } catch (error) {
      return { status: 0, headers: {}, body: error.message || "invalid request", ms: 0 };
    }
  });

  // ── Misc ────────────────────────────────────────────────────────────────────
  ipcMain.handle("security:status", () => ({
    devtoolsBlocked: app.isPackaged,
    mainSandboxed: true,
    nodeIntegration: false,
    contextIsolation: true,
    webviewSandboxed: true
  }));
  ipcMain.handle("tor:status", () => checkProxy({ host: "127.0.0.1", port: 9050, scheme: "socks5" }));
  ipcMain.handle("tor:detect", () => checkProxy({ host: "127.0.0.1", port: 9050, scheme: "socks5" }));
  ipcMain.handle("totp:code", (_event, secret) => totpCode(secret));
  ipcMain.handle("vault:exportFile", async (_event, state) => {
    const exportState = prepareStateForSave(state || {});
    assertJsonSize(exportState);
    const result = await dialog.showSaveDialog(getDialogWindow(), { defaultPath: "gestor-web-vault.json", filters: [{ name: "JSON", extensions: ["json"] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    writeJson(result.filePath, exportState);
    return { canceled: false, filePath: result.filePath };
  });
  ipcMain.handle("vault:importFile", async () => {
    const result = await dialog.showOpenDialog(getDialogWindow(), { filters: [{ name: "JSON", extensions: ["json"] }], properties: ["openFile"] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    if (fs.statSync(filePath).size > MAX_STATE_BYTES) return { canceled: true, error: "file_too_large" };
    const imported = readJson(filePath, null);
    if (imported) assertJsonSize(imported);
    return { canceled: false, state: imported ? migrateState(imported) : null, filePath };
  });
}

module.exports = { registerIpc };
