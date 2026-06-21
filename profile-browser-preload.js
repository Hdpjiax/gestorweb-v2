const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("profileBrowser", Object.freeze({
  windowAction: (action) => ipcRenderer.invoke("profile-browser:window-action", action)
}));
