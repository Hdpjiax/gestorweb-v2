const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpc } = require("./src/main/ipc");
const { readJson, stateFile, sessionFor } = require("./src/main/utils");
const proxySessions = require("./src/main/proxy-partitions");

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
  mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── Hook global de certificados ───────────────────────────────────────────────
// Debe registrarse ANTES de app.whenReady().
//
// CertVerifyProcBuiltin corre en el hilo de red de Chromium y puede ganarle
// la carrera a setCertificateVerifyProc en el primer handshake TLS.
// Este hook del proceso main se evalúa de forma síncrona y está garantizado
// a dispararse antes de que Chromium rechace cualquier certificado.
//
// Solo bypaseamos la verificación para sesiones que tienen un proxy MITM activo
// (proxies residenciales, Bright Data, etc. que usan su propia CA).
// La comparación es por identidad de objeto Session — Session.partition
// NO existe en la API de Electron, por lo que comparar strings de partición
// siempre devuelve undefined y nunca funcionaría.
app.on("certificate-error", (event, webContents, _url, _error, _certificate, callback) => {
  try {
    if (proxySessions.has(webContents.session)) {
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
