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
const { profileWindows } = require("./windows");

const {
  openProfileWindow,
  closeProfileWindow,
  focusProfileWindow,
  prepareSession
} = require("./windows");

const { checkProxy } = require("./proxies");

function base32ToBuffer(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(secret || "").replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
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

async function repeaterSend(request) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = electronNet.request({ method: request.method || "GET", url: request.url });
    for (const [key, value] of Object.entries(request.headers || {})) req.setHeader(key, value);
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
    if (request.body) req.write(request.body);
    req.end();
  });
}

function resolveWindow(mainWindowRef) {
  if (typeof mainWindowRef === "function") return mainWindowRef();
  return mainWindowRef || null;
}

function registerIpc(mainWindowRef) {
  const getDialogWindow = () => resolveWindow(mainWindowRef);

  ipcMain.handle("state:load", () => readJson(stateFile(), null));
  ipcMain.handle("state:save", (_event, state) => {
    writeJson(stateFile(), state || {});
    return { ok: true };
  });
  ipcMain.handle("app:openDataDir", () => shell.openPath(dataDir()));
  ipcMain.handle("app:dbStats", () => {
    const file = stateFile();
    const exists = fs.existsSync(file);
    return { dataDir: dataDir(), stateFile: file, bytes: exists ? fs.statSync(file).size : 0 };
  });
  ipcMain.handle("app:healthcheck", () => ({ ok: true, electron: process.versions.electron, chrome: process.versions.chrome }));
  ipcMain.handle("app:openExternal", (_event, url) => shell.openExternal(url));
  ipcMain.handle("browse:prepareSession", (_event, profile, proxy) => prepareSession(profile, proxy));
  ipcMain.handle("browse:freshenMemory", async (_event, profileId) => {
    await sessionFor(profileId).clearStorageData({ storages: ["appcache", "shadercache", "serviceworkers", "cachestorage"] });
    return { ok: true };
  });
  ipcMain.handle("cookies:get", (_event, profileId) => sessionFor(profileId).cookies.get({}));
  ipcMain.handle("cookies:clear", async (_event, profileId) => {
    await sessionFor(profileId).clearStorageData({ storages: ["cookies"] });
    return [];
  });
  ipcMain.handle("cookies:delete", async (_event, profileId, cookie) => {
    const ses = sessionFor(profileId);
    if (cookie?.url && cookie?.name) {
      await ses.cookies.delete({ url: cookie.url, name: cookie.name });
    } else if (cookie?.domain && cookie?.name) {
      const url = `https://${String(cookie.domain).replace(/^\./, "")}/`;
      await ses.cookies.delete({ url, name: cookie.name });
    }
    return ses.cookies.get({});
  });
  ipcMain.handle("cookies:set", async (_event, profileId, cookies) => {
    const ses = sessionFor(profileId);
    for (const cookie of cookies || []) {
      if (cookie._delete) {
        const url = cookie.url || `https://${String(cookie.domain || "").replace(/^\./, "")}/`;
        await ses.cookies.delete({ url, name: cookie.name });
        continue;
      }
      const domain = String(cookie.domain || "").replace(/^\./, "");
      if (!cookie.name || !domain) continue;
      const details = {
        url: cookie.url || `https://${domain}`,
        name: String(cookie.name),
        value: String(cookie.value || ""),
        domain: cookie.domain,
        path: cookie.path || "/",
        secure: cookie.secure !== false,
        httpOnly: !!cookie.httpOnly
      };
      const expirationDate = Number(cookie.expirationDate || cookie.expires || 0);
      if (Number.isFinite(expirationDate) && expirationDate > 0) details.expirationDate = expirationDate;
      await ses.cookies.set(details);
    }
    return ses.cookies.get({});
  });
  ipcMain.handle("license:hwid", () => getHwid());
  ipcMain.handle("license:status", () => ({ hwid: getHwid(), active: !!readJson(stateFile(), {})?.license?.active }));
  ipcMain.handle("license:claimByKey", (_event, key) => ({ active: /^GW-/i.test(String(key || "")), hwid: getHwid() }));
  ipcMain.handle("license:install", (_event, text) => ({ active: !!String(text || "").trim(), hwid: getHwid() }));
  ipcMain.handle("license:ipcheck", async () => {
    const result = await repeaterSend({ method: "GET", url: "https://api.ipify.org?format=json" });
    try { return JSON.parse(result.body); } catch { return { ip: null, raw: result.body }; }
  });
  ipcMain.handle("profiles:openWindow", (_event, profile, proxy, url) => openProfileWindow(profile, proxy, url));
  ipcMain.handle("profiles:closeWindow", async (_event, profileId) => {
    const state = readJson(stateFile(), {});
    const profile = state.profiles?.find((p) => String(p.id) === String(profileId));
    if (profile?.auto_wipe_close) {
      await sessionFor(profileId).clearStorageData({ storages: ["cookies", "cachestorage", "indexeddb", "localStorage", "sessionStorage"] });
      await sessionFor(profileId).cookies.set({ url: "https://gestor.invalid/", name: "gw_wipe", value: "1", expirationDate: 1 });
    }
    return closeProfileWindow(profileId);
  });
  ipcMain.handle("profiles:openPath", (_event, profileId) => shell.openPath(profileDir(profileId)));
  ipcMain.handle("profiles:focusWindow", (_event, profileId) => focusProfileWindow(profileId));
  ipcMain.handle("profiles:isWindowOpen", (_event, profileId) => ({ open: profileWindows.has(profileId) }));
  ipcMain.handle("proxies:check", (_event, proxy) => checkProxy(proxy));
  ipcMain.handle("proxies:checkAll", (_event, proxies) => Promise.all((proxies || []).map(checkProxy)));
  ipcMain.handle("repeater:send", (_event, request) => repeaterSend(request));
  ipcMain.handle("security:status", () => ({ devtoolsBlocked: app.isPackaged, webviewSandboxed: true }));
  ipcMain.handle("tor:status", () => checkProxy({ host: "127.0.0.1", port: 9050, scheme: "socks5" }));
  ipcMain.handle("tor:detect", () => checkProxy({ host: "127.0.0.1", port: 9050, scheme: "socks5" }));
  ipcMain.handle("totp:code", (_event, secret) => totpCode(secret));
  ipcMain.handle("vault:exportFile", async (_event, state) => {
    const result = await dialog.showSaveDialog(getDialogWindow(), { defaultPath: "gestor-web-vault.json", filters: [{ name: "JSON", extensions: ["json"] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    writeJson(result.filePath, state || {});
    return { canceled: false, filePath: result.filePath };
  });
  ipcMain.handle("vault:importFile", async () => {
    const result = await dialog.showOpenDialog(getDialogWindow(), { filters: [{ name: "JSON", extensions: ["json"] }], properties: ["openFile"] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { canceled: false, state: readJson(result.filePaths[0], null), filePath: result.filePaths[0] };
  });
}

module.exports = { registerIpc };
