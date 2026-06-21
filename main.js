const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpc } = require("./src/main/ipc");
const { readJson, stateFile, sessionFor } = require("./src/main/utils");
const { profileProxyRuntime } = require("./src/main/proxy-runtime");

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
      devTools: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

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
  Promise.all([clearBrowserSessionsOnExit(), profileProxyRuntime.closeAll()]).finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
