const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpc } = require("./src/main/ipc");
const { readJson, stateFile, sessionFor } = require("./src/main/utils");
const proxyPartitions = require("./src/main/proxy-partitions");

// ── Test isolation: redirect userData to a temp dir when running IPC tests ──────
// Must be called BEFORE app.whenReady() — after that, setPath() is a no-op.
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
  mainWindow.webContents.openDevTools(); // DEBUG: auto-abre DevTools
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── Global cert hook — must be registered before app.whenReady() ────────────
// CertVerifyProcBuiltin runs on Chromium's network thread and can race with
// setCertificateVerifyProc on the first TLS handshake. This app-level handler
// fires synchronously on the main process and is guaranteed to be evaluated
// before Chromium rejects any certificate, eliminating the race entirely.
// We only bypass verification for partitions that have an active proxy (MITM
// proxies use a self-signed CA). All other sessions keep the default OS chain.
app.on("certificate-error", (event, webContents, _url, _error, _certificate, callback) => {
  try {
    const partition = webContents?.session?.partition ?? "";
    if (proxyPartitions.has(partition)) {
      event.preventDefault();
      return callback(true);
    }
  } catch {}
  callback(false);
});

app.whenReady().then(() => {
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
