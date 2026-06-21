const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpc } = require("./src/main/ipc");
const { registerLicenseIpc, currentLicenseStatus } = require("./src/main/license-ipc");
const { registerLicenseAdminIpc } = require("./src/main/license-admin-ipc");
const { readJson, stateFile, sessionFor } = require("./src/main/utils");
const { profileProxyRuntime } = require("./src/main/proxy-runtime");
const proxyTrustedSessions = require("./src/main/proxy-trust");
const { profileWindows, closeProfileWindow } = require("./src/main/windows");
const { applyToWindow } = require("./src/main/resource-mode");

if (process.env.GW_TEST_USERDATA) {
  app.setPath("userData", process.env.GW_TEST_USERDATA);
}

let mainWindow = null;
let licenseEnforcementTimer = null;

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
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#0a0e14",
    title: "Gestor Web",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  applyToWindow(mainWindow);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function enforceLicense() {
  const status = await currentLicenseStatus().catch((error) => ({
    active: false,
    reason: error?.message || "no se pudo validar la licencia"
  }));
  if (status.active) return;
  for (const profileId of [...profileWindows.keys()]) closeProfileWindow(profileId);
  const win = getMainWindow();
  if (win) win.webContents.send("license:invalidated", status);
}

function startLicenseEnforcement() {
  clearInterval(licenseEnforcementTimer);
  licenseEnforcementTimer = setInterval(enforceLicense, 60 * 1000);
  licenseEnforcementTimer.unref?.();
}

// Respaldo para el error -202 de Chromium. Nunca se aplica a la ventana
// principal ni a perfiles con conexión directa: solo a sesiones proxy marcadas
// por prepareSession antes de iniciar la navegación.
app.on("certificate-error", (event, webContents, _url, _error, _certificate, callback) => {
  if (proxyTrustedSessions.has(webContents.session)) {
    event.preventDefault();
    callback(true);
    return;
  }
  callback(false);
});

app.whenReady().then(() => {
  registerIpc(getMainWindow);
  registerLicenseIpc();
  registerLicenseAdminIpc();
  createWindow();
  startLicenseEnforcement();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", (event) => {
  clearInterval(licenseEnforcementTimer);
  if (app.__browserSessionsCleared) return;
  app.__browserSessionsCleared = true;
  event.preventDefault();
  Promise.all([clearBrowserSessionsOnExit(), profileProxyRuntime.closeAll()]).finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
