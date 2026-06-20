const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpc } = require("./src/main/ipc");
const { readJson, stateFile, sessionFor } = require("./src/main/utils");
const proxySessions = require("./src/main/proxy-partitions");
const { prepareSession } = require("./src/main/windows");

if (process.env.GW_TEST_USERDATA) {
  app.setPath("userData", process.env.GW_TEST_USERDATA);
}

let mainWindow = null;

function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

async function clearBrowserSessionsOnExit() {
  const stored = readJson(stateFile(), null);
  const profiles = Array.isArray(stored?.profiles) ? stored.profiles : [];
  await Promise.all(profiles.map(async (profile) => {
    if (!profile?.id) return;
    try {
      await sessionFor(profile.id).clearStorageData({
        storages: ["cookies", "cachestorage", "indexeddb", "localStorage", "sessionStorage", "serviceworkers"]
      });
    } catch {}
  }));
}

// Pre-aplica setCertificateVerifyProc a todas las sesiones que ya tienen
// proxy asignado en el estado guardado. Esto elimina la race condition donde
// Chromium abre una conexión TLS antes de que prepareSession corra por primera vez.
async function prewarmProxySessions() {
  try {
    const stored = readJson(stateFile(), null);
    if (!stored) return;
    const profiles = Array.isArray(stored.profiles) ? stored.profiles : [];
    const proxies = Array.isArray(stored.proxies) ? stored.proxies : [];
    const proxyMap = new Map(proxies.map((p) => [String(p.id), p]));

    await Promise.all(profiles.map(async (profile) => {
      if (!profile?.id) return;
      const proxy = profile.proxy_id ? proxyMap.get(String(profile.proxy_id)) : null;
      const hasTorMode = !!profile.tor_mode;
      const hasProxy = !!(proxy?.host && proxy?.port) || hasTorMode;
      if (!hasProxy) return;
      try {
        await prepareSession(profile, proxy || null);
      } catch {}
    }));
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0a0e14",
    title: "Gestor Web",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: true,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Hook global: intercepta certificate-error antes de que Chromium lo rechace.
// Compara por identidad de objeto Session (Session.partition no existe en la API).
app.on("certificate-error", (event, webContents, _url, _error, _certificate, callback) => {
  try {
    if (proxySessions.has(webContents.session)) {
      event.preventDefault();
      return callback(true);
    }
  } catch {}
  callback(false);
});

app.whenReady().then(async () => {
  // Pre-calentar sesiones con proxy ANTES de crear ventanas
  await prewarmProxySessions();
  registerIpc(getMainWindow);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", (event) => {
  if (app.__browserSessionsCleared) return;
  app.__browserSessionsCleared = true;
  event.preventDefault();
  clearBrowserSessionsOnExit().finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
