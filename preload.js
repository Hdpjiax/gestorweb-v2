const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("api", {
  app: {
    loadState: () => invoke("state:load"),
    saveState: (state) => invoke("state:save", state),
    openDataDir: () => invoke("app:openDataDir"),
    dbStats: () => invoke("app:dbStats"),
    healthcheck: () => invoke("app:healthcheck"),
    openExternal: (url) => invoke("app:openExternal", url)
  },
  browse: {
    prepareSession: (profile, proxy) => invoke("browse:prepareSession", profile, proxy),
    freshenMemory: (profileId) => invoke("browse:freshenMemory", profileId)
  },
  cookies: {
    get: (profileId) => invoke("cookies:get", profileId),
    set: (profileId, cookies) => invoke("cookies:set", profileId, cookies),
    clear: (profileId) => invoke("cookies:clear", profileId)
  },
  license: {
    hwid: () => invoke("license:hwid"),
    status: () => invoke("license:status"),
    claimByKey: (key) => invoke("license:claimByKey", key),
    install: (text) => invoke("license:install", text),
    ipcheck: () => invoke("license:ipcheck")
  },
  profiles: {
    openWindow: (profile, proxy, url) => invoke("profiles:openWindow", profile, proxy, url),
    closeWindow: (profileId) => invoke("profiles:closeWindow", profileId),
    focusWindow: (profileId) => invoke("profiles:focusWindow", profileId),
    isWindowOpen: (profileId) => invoke("profiles:isWindowOpen", profileId)
  },
  proxies: {
    check: (proxy) => invoke("proxies:check", proxy),
    checkAll: (proxies) => invoke("proxies:checkAll", proxies)
  },
  repeater: {
    send: (request) => invoke("repeater:send", request)
  },
  security: {
    status: () => invoke("security:status")
  },
  tor: {
    status: () => invoke("tor:status"),
    detect: () => invoke("tor:detect")
  },
  totp: {
    code: (secret) => invoke("totp:code", secret)
  },
  vault: {
    exportFile: (state) => invoke("vault:exportFile", state),
    importFile: () => invoke("vault:importFile")
  },
  on: (channel, callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
