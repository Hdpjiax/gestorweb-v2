const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

// Canales permitidos para escuchar eventos push desde main → renderer.
// Solo se permite suscribirse a canales explícitamente whitelisted.
const ALLOWED_LISTEN_CHANNELS = [
  "profiles:windowClosed",
  "network:event",
  "license:invalidated"
];

contextBridge.exposeInMainWorld("api", Object.freeze({
  app: Object.freeze({
    loadState: () => invoke("state:load"),
    saveState: (state) => invoke("state:save", state),
    openDataDir: () => invoke("app:openDataDir"),
    dbStats: () => invoke("app:dbStats"),
    healthcheck: () => invoke("app:healthcheck"),
    setResourceMode: (mode) => invoke("app:setResourceMode", mode),
    openExternal: (url) => invoke("app:openExternal", url)
  }),
  browse: Object.freeze({
    prepareSession: (profile, proxy) => invoke("browse:prepareSession", profile, proxy),
    freshenMemory: (profileId) => invoke("browse:freshenMemory", profileId),
    ipcheck: (profileId) => invoke("browse:ipcheck", profileId)
  }),
  cookies: Object.freeze({
    get: (profileId) => invoke("cookies:get", profileId),
    set: (profileId, cookies) => invoke("cookies:set", profileId, cookies),
    delete: (profileId, cookie) => invoke("cookies:delete", profileId, cookie),
    clear: (profileId) => invoke("cookies:clear", profileId)
  }),
  license: Object.freeze({
    hwid: () => invoke("license:hwid"),
    status: () => invoke("license:status"),
    claimByKey: (key) => invoke("license:claimByKey", key),
    install: (text) => invoke("license:install", text),
    ipcheck: () => invoke("license:ipcheck")
  }),
  admin: Object.freeze({
    login: (config) => invoke("admin:login", config),
    resume: () => invoke("admin:resume"),
    config: () => invoke("admin:config"),
    forgetConfig: () => invoke("admin:forgetConfig"),
    list: () => invoke("admin:list"),
    create: (license) => invoke("admin:create", license),
    revoke: (id, reason) => invoke("admin:revoke", id, reason),
    logout: () => invoke("admin:logout")
  }),
  profiles: Object.freeze({
    openWindow: (profile, proxy, url) => invoke("profiles:openWindow", profile, proxy, url),
    closeWindow: (profileId) => invoke("profiles:closeWindow", profileId),
    focusWindow: (profileId) => invoke("profiles:focusWindow", profileId),
    isWindowOpen: (profileId) => invoke("profiles:isWindowOpen", profileId),
    capturePreview: (profileId) => invoke("profiles:capturePreview", profileId),
    openPath: (profileId) => invoke("profiles:openPath", profileId)
  }),
  proxies: Object.freeze({
    check: (proxy) => invoke("proxies:check", proxy),
    checkAll: (proxies) => invoke("proxies:checkAll", proxies),
    updateSession: (profile, proxy) => invoke("proxy:update-session", profile, proxy)
  }),
  repeater: Object.freeze({
    send: (request) => invoke("repeater:send", request)
  }),
  security: Object.freeze({
    status: () => invoke("security:status")
  }),
  tor: Object.freeze({
    status: () => invoke("tor:status"),
    detect: () => invoke("tor:detect")
  }),
  totp: Object.freeze({
    code: (secret) => invoke("totp:code", secret)
  }),
  vault: Object.freeze({
    exportFile: (state) => invoke("vault:exportFile", state),
    importFile: () => invoke("vault:importFile")
  }),
  // Listener seguro para eventos push main → renderer.
  // Uso: window.api.on('profiles:windowClosed', ({ id }) => { ... })
  // Devuelve una función de cleanup: const off = api.on(...); off();
  on: (channel, callback) => {
    if (!ALLOWED_LISTEN_CHANNELS.includes(channel)) {
      console.warn(`[preload] canal no permitido: ${channel}`);
      return () => {};
    }
    const wrapped = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  }
}));
