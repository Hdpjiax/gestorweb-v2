const { BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  TRACKER_HOSTS,
  partitionFor,
  sessionFor,
  profileDir,
  writeFingerprintPreload,
  findGestorBrowser,
  addonPaths
} = require("./utils");
const {
  normalizeProxy,
  proxyRouteKey,
  profileProxyRuntime
} = require("./proxy-runtime");
const proxyTrustedSessions = require("./proxy-trust");
const { isEconomy } = require("./resource-mode");

const profileWindows = new Map();

let _mainWindowRef = null;
function setMainWindowRef(ref) { _mainWindowRef = ref; }

function notifyProfileClosed(profileId) {
  try {
    const win = typeof _mainWindowRef === "function" ? _mainWindowRef() : _mainWindowRef;
    if (win && !win.isDestroyed() && win.webContents) {
      win.webContents.send("profiles:windowClosed", { id: profileId });
    }
  } catch {}
}

function sendMainEvent(channel, payload) {
  try {
    const win = typeof _mainWindowRef === "function" ? _mainWindowRef() : _mainWindowRef;
    if (win && !win.isDestroyed() && win.webContents) win.webContents.send(channel, payload);
  } catch {}
}

function capturedRequestId(profileId, requestId) {
  return `${profileId}:${requestId}`;
}

function capturedHeaders(headers) {
  const result = {};
  for (const [name, value] of Object.entries(headers || {})) {
    result[name] = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  }
  return result;
}

function capturedUploadBody(uploadData) {
  const chunks = [];
  for (const item of Array.isArray(uploadData) ? uploadData : []) {
    if (!item?.bytes) continue;
    try { chunks.push(Buffer.from(item.bytes)); } catch {}
  }
  if (!chunks.length) return "";
  const body = Buffer.concat(chunks);
  return body.subarray(0, 64 * 1024).toString("utf8");
}

function notifyNetworkEvent(profile, details, patch = {}) {
  if (!profile?.id || !/^https?:/i.test(details?.url || "")) return;
  sendMainEvent("network:event", {
    id: capturedRequestId(profile.id, details.id),
    profileId: profile.id,
    profileName: profile.name || "Perfil",
    method: details.method || "GET",
    url: details.url,
    resourceType: details.resourceType || "other",
    ...patch
  });
}

// ─── Firefox user.js ───────────────────────────────────────────────────────────
function writeFirefoxProfilePrefs(profile, proxy) {
  const fp = profile.fingerprint || {};
  const dir = profileDir(profile.id);
  const prefs = [];
  const add = (key, value) => prefs.push(`user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`);

  add("browser.shell.checkDefaultBrowser", false);
  add("browser.tabs.warnOnClose", false);
  add("toolkit.telemetry.enabled", false);
  add("datareporting.healthreport.uploadEnabled", false);
  add("dom.webdriver.enabled", false);
  add("general.useragent.override", fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0");
  add("intl.accept_languages", `${fp.locale || "es-MX"},${String(fp.locale || "es-MX").split("-")[0]},en-US,en`);
  add("media.peerconnection.enabled", !profile.webrtc_block);
  add("privacy.globalprivacycontrol.enabled", true);
  add("privacy.donottrackheader.enabled", true);
  add("privacy.trackingprotection.enabled", !!profile.block_trackers);
  add("privacy.trackingprotection.socialtracking.enabled", !!profile.block_trackers);
  add("network.http.sendRefererHeader", profile.strict_referer ? 0 : 2);
  add("network.http.referer.XOriginPolicy", profile.strict_referer ? 2 : 0);
  add("network.trr.mode", profile.doh_enabled ? 3 : 0);
  add("network.trr.uri", "https://cloudflare-dns.com/dns-query");
  add("dom.security.https_only_mode", !!profile.force_https);
  add("browser.cache.disk.enable", !profile.in_memory);
  add("browser.cache.memory.enable", true);
  add("places.history.enabled", !profile.in_memory);
  add("privacy.clearOnShutdown.cache", !!profile.auto_wipe_close);
  add("privacy.clearOnShutdown.cookies", !!profile.auto_wipe_close);
  if (proxy?.host && proxy?.port) {
    add("network.proxy.type", 1);
    if (String(proxy.scheme || "").startsWith("socks")) {
      add("network.proxy.socks", proxy.host);
      add("network.proxy.socks_port", Number(proxy.port));
      add("network.proxy.socks_version", proxy.scheme === "socks4" ? 4 : 5);
      add("network.proxy.socks_remote_dns", true);
    } else {
      add("network.proxy.http", proxy.host);
      add("network.proxy.http_port", Number(proxy.port));
      add("network.proxy.ssl", proxy.host);
      add("network.proxy.ssl_port", Number(proxy.port));
      add("network.proxy.share_proxy_settings", true);
    }
  } else if (profile.tor_mode) {
    add("network.proxy.type", 1);
    add("network.proxy.socks", "127.0.0.1");
    add("network.proxy.socks_port", 9050);
    add("network.proxy.socks_version", 5);
    add("network.proxy.socks_remote_dns", true);
  } else {
    add("network.proxy.type", 0);
  }
  fs.writeFileSync(path.join(dir, "user.js"), prefs.join("\n"), "utf8");
  return dir;
}
// ─── Camoufox config ───────────────────────────────────────────────────────────
function camouConfig(profile, proxy) {
  const fp = profile.fingerprint || {};
  const width = fp.resolution?.width || 1920;
  const height = fp.resolution?.height || 1080;
  const locale = fp.locale || "es-MX";
  const region = locale.includes("-") ? locale.split("-")[1] : "MX";
  const config = {
    addons: addonPaths(),
    "navigator.userAgent": fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "headers.User-Agent": fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "headers.Accept-Language": `${locale},${locale.split("-")[0]};q=0.9,en;q=0.7`,
    "navigator.platform": fp.platform || "Win32",
    "navigator.hardwareConcurrency": fp.cores || 8,
    "navigator.product": "Gecko",
    "navigator.doNotTrack": "1",
    "navigator.appCodeName": "Mozilla",
    "navigator.appName": "Netscape",
    "navigator.appVersion": "5.0 (Windows)",
    "navigator.oscpu": "Windows NT 10.0; Win64; x64",
    "navigator.globalPrivacyControl": true,
    "navigator.language": locale,
    "navigator.languages": [locale, locale.split("-")[0], "en-US", "en"],
    "screen.width": width,
    "screen.height": height,
    "screen.availWidth": width,
    "screen.availHeight": Math.max(1, height - 48),
    "screen.colorDepth": 24,
    "screen.pixelDepth": 24,
    "window.outerWidth": width,
    "window.outerHeight": height,
    "window.screenX": 40,
    "window.screenY": 40,
    "window.history.length": 2,
    timezone: fp.timezone || "America/Mexico_City",
    "locale:language": locale.split("-")[0],
    "locale:region": region,
    "locale:all": locale,
    humanize: true,
    "humanize:maxTime": profile.compat_mode ? 0.6 : 1.2,
    "humanize:minTime": 0.08,
    mostrursor: true,
    "webGl:vendor": "Google Inc. (NVIDIA)",
    "webGl:renderer": fp.webgl || "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar",
    "AudioContext:sampleRate": 48000,
    "mediaDevices:enabled": !profile.webrtc_block,
    "mediaDevices:micros": profile.webrtc_block ? 0 : 1,
    "mediaDevices:webcams": profile.webrtc_block ? 0 : 1,
    "mediaDevices:speakers": 1,
    "canvas:aaOffset": fp.noiseSeed || 11,
    "canvas:aaCapOffset": !profile.compat_mode,
    memorysaver: !!profile.in_memory,
    debug: false
  };
  if (proxy?.host && proxy?.port) {
    const scheme = proxy.scheme || "http";
    config.proxy = {
      mode: "manual",
      proxyDNS: true,
      proxyType: scheme.startsWith("socks") ? "socks" : "http",
      proxyAddr: proxy.host,
      proxyPort: proxy.port,
      proxyUsername: proxy.username || "",
      proxyPassword: proxy.password || ""
    };
  }
  if (profile.tor_mode && !(proxy?.host && proxy?.port)) {
    config.proxy = { mode: "socks5", proxyAddr: "127.0.0.1", proxyPort: 9050, proxyDNS: true };
  }
  return config;
}

// ─── Chromium window ───────────────────────────────────────────────────────────
async function openChromiumWindowLegacy(profile, proxy, startUrl) {
  console.log(`[windows] openChromiumWindow called with profile: ${profile?.id}, proxy: ${proxy ? JSON.stringify(proxy) : 'null'}, startUrl: ${startUrl}`);
  try {
    console.log(`[windows] Calling prepareSession`);
    const prepared = await prepareSession(profile, proxy);
    console.log(`[windows] prepareSession completed, prepared: ${JSON.stringify(prepared)}`);
  } catch (prepareError) {
    console.error(`[windows] Error in prepareSession:`, prepareError);
    throw prepareError;
  }

  const fp = profile.fingerprint || {};
  const width = fp.resolution?.width || 1280;
  const height = fp.resolution?.height || 800;

  const win = new BrowserWindow({
    width,
    height,
    title: profile.name || "Gestor Web Session",
    backgroundColor: "#0a0e14",
    webPreferences: {
      backgroundThrottling: isEconomy(),
      partition: partitionFor(profile.id),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.on("closed", () => {
    if (profileWindows.get(profile.id) === win) {
      profileWindows.delete(profile.id);
      profileProxyRuntime.closeProfile(profile.id).catch(() => {});
      notifyProfileClosed(profile.id);
    }
  });

  profileWindows.set(profile.id, win);

  const RETRIABLE = new Set([-3, -202]);
  try {
    console.log(`[windows] Loading URL: ${startUrl}`);
    await win.loadURL(startUrl);
    console.log(`[windows] URL loaded successfully`);
  } catch (err) {
    console.error(`[windows] Error loading URL:`, err);
    if (RETRIABLE.has(err?.errno)) {
      console.log(`[windows] Retriable error, retrying after 800ms`);
      await new Promise((r) => setTimeout(r, 800));
      try {
        await win.loadURL(startUrl);
        console.log(`[windows] URL loaded successfully on retry`);
      } catch (retryError) {
        console.error(`[windows] Error loading URL on retry:`, retryError);
        throw retryError;
      }
    } else {
      throw err;
    }
  }

  return { ok: true, mode: "chromium", id: profile.id };
}

// ─── Firefox window ────────────────────────────────────────────────────────────
async function openFirefoxWindowLegacy(profile, proxy, startUrl) {
  console.log(`[windows] openFirefoxWindow called with profile: ${profile?.id}, proxy: ${proxy ? JSON.stringify(proxy) : 'null'}, startUrl: ${startUrl}`);
  try {
    const browserPath = findGestorBrowser();
    console.log(`[windows] browserPath: ${browserPath}`);
    if (!browserPath) {
      console.log(`[windows] Browser not found, falling back to openChromiumWindow`);
      return openChromiumWindowLegacy(profile, proxy, startUrl);
    }
    console.log(`[windows] Calling profileProxyRuntime.ensure`);
    const prepared = await profileProxyRuntime.ensure(profile.id, proxy, !!profile.tor_mode);
    console.log(`[windows] profileProxyRuntime.ensure completed, prepared: ${JSON.stringify(prepared)}`);
    const browserProxy = prepared.localPort
      ? { scheme: "http", host: "127.0.0.1", port: prepared.localPort }
      : null;
    console.log(`[windows] browserProxy: ${browserProxy ? JSON.stringify(browserProxy) : 'null'}`);
    const dir = writeFirefoxProfilePrefs(profile, browserProxy);
    console.log(`[windows] Firefox profile dir: ${dir}`);
    const env = {
      ...process.env,
      MOZ_NO_REMOTE: "1",
      CAMOU_CONFIG_1: JSON.stringify(camouConfig(profile, browserProxy))
    };
    if (browserProxy) env.GW_PROXY = `http://127.0.0.1:${prepared.localPort}`;
    console.log(`[windows] Env GW_PROXY: ${env.GW_PROXY}`);
    const args = ["-no-remote", "-profile", dir, startUrl];
    console.log(`[windows] Spawning browser with args: ${args}`);
    const child = spawn(browserPath, args, { cwd: path.dirname(browserPath), env, detached: false, stdio: "ignore" });
    const item = { type: "firefox", child, routeKey: prepared.routeKey, startUrl };
    child.on("exit", () => {
      if (profileWindows.get(profile.id) === item) {
        profileWindows.delete(profile.id);
        profileProxyRuntime.closeProfile(profile.id).catch(() => {});
        notifyProfileClosed(profile.id);
      }
    });
    profileWindows.set(profile.id, item);
    console.log(`[windows] Firefox window started successfully, pid: ${child.pid}`);
    return { ok: true, mode: "firefox", pid: child.pid, id: profile.id, browserPath };
  } catch (error) {
    console.error(`[windows] Error in openFirefoxWindow:`, error);
    throw error;
  }
}

// Ventana controlada común para ambos modos. Camoufox/Firefox y Chromium
// comparten así la misma sesión, proxy, certificados y shell de navegación.
async function openManagedProfileWindow(profile, proxy, startUrl, engineMode) {
  const prepared = await prepareSession(profile, proxy);
  const fp = profile.fingerprint || {};
  const requestedWidth = Number(fp.resolution?.width) || 1440;
  const requestedHeight = Number(fp.resolution?.height) || 900;
  const width = Math.max(980, Math.min(1920, requestedWidth));
  const height = Math.max(700, Math.min(1080, requestedHeight));
  const partition = partitionFor(profile.id);

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 880,
    minHeight: 620,
    icon: path.join(__dirname, "..", "..", "build", "icon.png"),
    frame: false,
    show: false,
    title: profile.name || "Gestor Browser",
    backgroundColor: "#1b1a21",
    webPreferences: {
      backgroundThrottling: isEconomy(),
      partition,
      preload: path.join(__dirname, "..", "..", "profile-browser-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true,
      devTools: false
    }
  });

  win.webContents.on("will-attach-webview", (_event, webPreferences) => {
    webPreferences.backgroundThrottling = isEconomy();
    webPreferences.partition = partition;
    webPreferences.contextIsolation = true;
    webPreferences.nodeIntegration = false;
    webPreferences.sandbox = true;
    webPreferences.devTools = false;
  });

  const item = {
    type: "electron",
    win,
    routeKey: prepared.routeKey,
    startUrl: startUrl || "",
    engineMode
  };

  win.on("closed", () => {
    if (profileWindows.get(profile.id) !== item) return;
    profileWindows.delete(profile.id);
    profileProxyRuntime.closeProfile(profile.id).catch(() => {});
    notifyProfileClosed(profile.id);
  });

  profileWindows.set(profile.id, item);
  await win.loadFile(path.join(__dirname, "..", "..", "profile-browser.html"), {
    query: {
      profileId: String(profile.id),
      profileName: profile.name || "Perfil",
      partition,
      startUrl: startUrl || "",
      userAgent: fp.userAgent || "",
      engineMode
    }
  });
  win.show();
  return { ok: true, mode: engineMode, id: profile.id };
}

function openChromiumWindow(profile, proxy, startUrl) {
  return openManagedProfileWindow(profile, proxy, startUrl, "chromium");
}

function openFirefoxWindow(profile, proxy, startUrl) {
  return openManagedProfileWindow(profile, proxy, startUrl, "camoufox");
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────
async function openProfileWindow(profile, proxy, startUrl) {
  if (!profile?.id) return { ok: false, error: "missing profile" };
  console.log(`[windows] openProfileWindow called with profile: ${profile?.id}, proxy: ${proxy ? JSON.stringify(proxy) : 'null'}, startUrl: ${startUrl}`);
  const existing = profileWindows.get(profile.id);
  const desiredRouteKey = profile.tor_mode
    ? proxyRouteKey({ scheme: "socks5", host: "127.0.0.1", port: 9050 })
    : proxyRouteKey(proxy);
  if (existing) {
    if (existing.routeKey !== desiredRouteKey) {
      if (existing.type === "electron") {
        console.log(`[windows] Existing electron window, preparing session with new proxy`);
        const prepared = await prepareSession(profile, proxy);
        existing.routeKey = prepared.routeKey;
        existing.win.webContents.reload();
        focusProfileWindow(profile.id);
        return { ok: true, reused: true, updatedProxy: true, mode: existing.type };
      }
      console.log(`[windows] Existing non-electron window, updating profile proxy`);
      return updateProfileProxy(profile, proxy);
    }
    console.log(`[windows] Existing window with same route key, focusing`);
    focusProfileWindow(profile.id);
    return { ok: true, reused: true, mode: existing.type };
  }
  const url = startUrl || profile.url || "";
  console.log(`[windows] Creating new window. Using url: ${url}, gw_engine: ${profile.gw_engine}`);
  const result = profile.gw_engine !== false
    ? await openFirefoxWindow(profile, proxy, url)
    : await openChromiumWindow(profile, proxy, url);
  console.log(`[windows] openProfileWindow result: ${JSON.stringify(result)}`);
  return result;
}

function closeProfileWindow(profileId) {
  const item = profileWindows.get(profileId);
  if (!item) return { ok: true, closed: false };
  profileWindows.delete(profileId);
  if (item.type === "electron" && !item.win.isDestroyed()) item.win.close();
  if (item.type === "firefox" && item.child && !item.child.killed) item.child.kill();
  profileProxyRuntime.closeProfile(profileId).catch(() => {});
  notifyProfileClosed(profileId);
  return { ok: true, closed: true };
}

function focusProfileWindow(profileId) {
  const item = profileWindows.get(profileId);
  if (!item) return { ok: false };
  if (item.type === "electron" && !item.win.isDestroyed()) {
    item.win.show();
    item.win.focus();
    return { ok: true };
  }
  if (item.type === "firefox" && item.child?.pid) {
    spawn("powershell.exe", ["-NoProfile", "-Command",
      `$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate(${item.child.pid}) | Out-Null`
    ], { windowsHide: true });
    return { ok: true };
  }
  return { ok: false };
}

// ─── Session / proxy setup ─────────────────────────────────────────────────────
const _sessionHandlersRegistered = new WeakSet();
const _sessionRuntimeState = new WeakMap();

async function prepareSession(profile, proxy) {
  if (!profile?.id) return { ok: false, error: "missing profile id" };
  const ses = sessionFor(profile.id);
  const fp = profile.fingerprint || {};
  const preload = writeFingerprintPreload(profile);

  _sessionRuntimeState.set(ses, { profile, fp });

  try { ses.setUserAgent(fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0", fp.locale || "es-MX"); } catch {}
  try { if (typeof ses.setPreloads === "function") ses.setPreloads([preload]); } catch {}

  const normalizedProxy = profile.tor_mode ? null : normalizeProxy(proxy);
  if (!profile.tor_mode && proxy && !normalizedProxy) throw new Error("proxy invalido para el perfil");
  const prepared = await profileProxyRuntime.ensure(profile.id, normalizedProxy, !!profile.tor_mode);

  // Algunos proxies gratuitos/residenciales sustituyen el certificado TLS del
  // sitio por una CA propia. El usuario pidió permitirlo para poder usar su IP.
  // El bypass queda estrictamente limitado a la partición de este perfil.
  if (prepared.localPort) {
    proxyTrustedSessions.add(ses);
    ses.setCertificateVerifyProc((_request, callback) => callback(0));
  } else {
    proxyTrustedSessions.delete(ses);
    ses.setCertificateVerifyProc(null);
  }

  await ses.setProxy(prepared.proxyConfig);
  if (typeof ses.forceReloadProxyConfig === "function") await ses.forceReloadProxyConfig();
  if (typeof ses.closeAllConnections === "function") await ses.closeAllConnections();

  // Handlers de sesión — registrar UNA SOLA VEZ.
  if (!_sessionHandlersRegistered.has(ses)) {
    _sessionHandlersRegistered.add(ses);

    ses.webRequest.onBeforeRequest((details, callback) => {
      const runtime = _sessionRuntimeState.get(ses) || {};
      const activeProfile = runtime.profile || profile;
      notifyNetworkEvent(activeProfile, details, {
        phase: "request",
        ts: Date.now(),
        body: capturedUploadBody(details.uploadData)
      });
      try {
        const url = new URL(details.url);
        if (activeProfile.block_trackers && TRACKER_HOSTS.some((host) =>
          details.url.includes(host) || url.hostname.includes(host)
        )) {
          notifyNetworkEvent(activeProfile, details, { phase: "error", status: 0, error: "bloqueado por el perfil", completedAt: Date.now() });
          callback({ cancel: true });
          return;
        }
        if (activeProfile.strip_tracking_params) {
          const before = url.toString();
          ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
           "fbclid", "gclid", "msclkid"].forEach((k) => url.searchParams.delete(k));
          const after = url.toString();
          if (after !== before) { callback({ redirectURL: after }); return; }
        }
      } catch {}
      callback({});
    });

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const runtime = _sessionRuntimeState.get(ses) || {};
      const activeFp = runtime.fp || fp;
      const activeProfile = runtime.profile || profile;
      const headers = { ...details.requestHeaders };
      if (activeFp.userAgent) headers["User-Agent"] = activeFp.userAgent;
      if (activeFp.locale) headers["Accept-Language"] = `${activeFp.locale},${String(activeFp.locale).split("-")[0]};q=0.9,en;q=0.7`;
      if (activeProfile.sanitize_headers) {
        Object.keys(headers).forEach((k) => { if (k.toLowerCase().startsWith("sec-ch-ua")) delete headers[k]; });
      }
      if (activeProfile.strict_referer) {
        Object.keys(headers).forEach((k) => { if (k.toLowerCase() === "referer") delete headers[k]; });
      }
      notifyNetworkEvent(activeProfile, details, {
        phase: "request_headers",
        requestHeaders: capturedHeaders(headers)
      });
      callback({ requestHeaders: headers });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
      const runtime = _sessionRuntimeState.get(ses) || {};
      const activeProfile = runtime.profile || profile;
      notifyNetworkEvent(activeProfile, details, {
        phase: "response_headers",
        status: details.statusCode || 0,
        statusLine: details.statusLine || "",
        responseHeaders: capturedHeaders(details.responseHeaders)
      });
      callback({ responseHeaders: details.responseHeaders });
    });

    ses.webRequest.onCompleted((details) => {
      const runtime = _sessionRuntimeState.get(ses) || {};
      notifyNetworkEvent(runtime.profile || profile, details, {
        phase: "completed",
        status: details.statusCode || 0,
        fromCache: !!details.fromCache,
        remoteIp: details.ip || "",
        completedAt: Date.now()
      });
    });

    ses.webRequest.onErrorOccurred((details) => {
      const runtime = _sessionRuntimeState.get(ses) || {};
      notifyNetworkEvent(runtime.profile || profile, details, {
        phase: "error",
        status: 0,
        error: details.error || "error de red",
        completedAt: Date.now()
      });
    });
  }

  return {
    ok: true,
    partition: partitionFor(profile.id),
    proxyRules: prepared.localPort ? "set" : "direct",
    routeKey: prepared.routeKey,
    route: prepared.route,
    localPort: prepared.localPort,
    preload
  };
}

async function updateProfileProxy(profile, proxy) {
  const prepared = await prepareSession(profile, proxy);
  const item = profileWindows.get(profile.id);
  if (!item) return { ...prepared, windowUpdated: false };
  item.routeKey = prepared.routeKey;
  if (item.type === "electron" && !item.win.isDestroyed()) {
    item.win.webContents.reload();
    return { ...prepared, windowUpdated: true, restarted: false };
  }
  return { ...prepared, windowUpdated: false, restarted: false };
}

module.exports = {
  profileWindows,
  setMainWindowRef,
  notifyProfileClosed,
  openChromiumWindow,
  openFirefoxWindow,
  openProfileWindow,
  closeProfileWindow,
  focusProfileWindow,
  prepareSession,
  updateProfileProxy
};
