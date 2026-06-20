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
const { proxyRulesFor } = require("./proxies");

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
  if (profile.tor_mode) {
    add("network.proxy.type", 1);
    add("network.proxy.socks", "127.0.0.1");
    add("network.proxy.socks_port", 9050);
    add("network.proxy.socks_version", 5);
    add("network.proxy.socks_remote_dns", true);
  } else if (proxy?.host && proxy?.port) {
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
    }
    if (proxy.username || proxy.password) add("signon.autologin.proxy", true);
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
  if (profile.tor_mode) {
    config.proxy = { mode: "socks5", proxyAddr: "127.0.0.1", proxyPort: 9050, proxyDNS: true };
  }
  return config;
}

// ─── Chromium window ───────────────────────────────────────────────────────────
async function openChromiumWindow(profile, proxy, startUrl) {
  await prepareSession(profile, proxy);

  const fp = profile.fingerprint || {};
  const width = fp.resolution?.width || 1280;
  const height = fp.resolution?.height || 800;

  const win = new BrowserWindow({
    width,
    height,
    title: profile.name || "Gestor Web Session",
    backgroundColor: "#0a0e14",
    webPreferences: {
      partition: partitionFor(profile.id),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.on("closed", () => {
    profileWindows.delete(profile.id);
    notifyProfileClosed(profile.id);
  });

  profileWindows.set(profile.id, { type: "electron", win });

  // Errores esperados al abrir con proxy MITM:
  //   -3   ERR_ABORTED               — proxy negociando, reintentar
  //   -202 ERR_CERT_AUTHORITY_INVALID — cert del proxy aun no activo, reintentar
  const RETRIABLE = new Set([-3, -202]);
  try {
    await win.loadURL(startUrl);
  } catch (err) {
    if (RETRIABLE.has(err?.errno)) {
      await new Promise((r) => setTimeout(r, 800));
      try { await win.loadURL(startUrl); } catch { /* silencioso */ }
    } else {
      throw err;
    }
  }

  return { ok: true, mode: "chromium", id: profile.id };
}

// ─── Firefox window ────────────────────────────────────────────────────────────
async function openFirefoxWindow(profile, proxy, startUrl) {
  const browserPath = findGestorBrowser();
  if (!browserPath) return openChromiumWindow(profile, proxy, startUrl);
  const dir = writeFirefoxProfilePrefs(profile, proxy);
  const env = {
    ...process.env,
    MOZ_NO_REMOTE: "1",
    CAMOU_CONFIG_1: JSON.stringify(camouConfig(profile, proxy))
  };
  if (proxyRulesFor(profile, proxy)) env.GW_PROXY = proxyRulesFor(profile, proxy);
  const args = ["-no-remote", "-profile", dir, startUrl];
  const child = spawn(browserPath, args, { cwd: path.dirname(browserPath), env, detached: false, stdio: "ignore" });
  child.on("exit", () => {
    profileWindows.delete(profile.id);
    notifyProfileClosed(profile.id);
  });
  profileWindows.set(profile.id, { type: "firefox", child });
  return { ok: true, mode: "firefox", pid: child.pid, id: profile.id, browserPath };
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────
async function openProfileWindow(profile, proxy, startUrl) {
  if (!profile?.id) return { ok: false, error: "missing profile" };
  const existing = profileWindows.get(profile.id);
  if (existing) {
    focusProfileWindow(profile.id);
    return { ok: true, reused: true, mode: existing.type };
  }
  const url = startUrl || profile.url || (profile.tor_mode ? "https://check.torproject.org/" : "https://duckduckgo.com/");
  return profile.gw_engine !== false
    ? openFirefoxWindow(profile, proxy, url)
    : openChromiumWindow(profile, proxy, url);
}

function closeProfileWindow(profileId) {
  const item = profileWindows.get(profileId);
  if (!item) return { ok: true, closed: false };
  if (item.type === "electron" && !item.win.isDestroyed()) item.win.close();
  if (item.type === "firefox" && item.child && !item.child.killed) item.child.kill();
  profileWindows.delete(profileId);
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
const _sessionProxyCreds = new WeakMap();
const _sessionRuntimeState = new WeakMap();

async function prepareSession(profile, proxy) {
  if (!profile?.id) return { ok: false, error: "missing profile id" };
  const ses = sessionFor(profile.id);
  const fp = profile.fingerprint || {};
  const preload = writeFingerprintPreload(profile);

  _sessionRuntimeState.set(ses, { profile, fp });

  try { ses.setUserAgent(fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0", fp.locale || "es-MX"); } catch {}
  try { if (typeof ses.setPreloads === "function") ses.setPreloads([preload]); } catch {}

  const hasProxy = !!(proxy?.host && proxy?.port) || !!profile.tor_mode;
  const hasProxyCreds = !!(proxy?.username || proxy?.password);

  // 1. Proxy — PRIMERO
  try {
    if (hasProxy) {
      let cleanRules;
      if (profile.tor_mode) {
        cleanRules = "socks5://127.0.0.1:9050";
      } else {
        const scheme = (proxy.scheme || "http").replace(/^socks$/, "socks5");
        cleanRules = `${scheme}://${proxy.host}:${proxy.port}`;
      }
      await ses.setProxy({ proxyRules: cleanRules, proxyBypassRules: "<-loopback>" });
    } else {
      await ses.setProxy({ proxyRules: "direct://", proxyBypassRules: "<-loopback>" });
    }
  } catch (e) {
    console.error("[windows] setProxy error:", e.message);
  }

  // 2. Certificados — DESPUES de setProxy, re-aplicado en cada prepareSession
  if (hasProxy) {
    ses.setCertificateVerifyProc((_req, cb) => cb(0));
  } else {
    ses.setCertificateVerifyProc(null);
  }

  // 3. Vaciar sockets TLS pre-existentes
  try { ses.closeAllConnections(); } catch { /* Electron < 21 */ }

  // 4. Credenciales de proxy
  if (hasProxyCreds) {
    _sessionProxyCreds.set(ses, { username: proxy.username || "", password: proxy.password || "" });
  } else {
    _sessionProxyCreds.delete(ses);
  }

  // 5. Handlers — una sola vez por sesión
  if (!_sessionHandlersRegistered.has(ses)) {
    _sessionHandlersRegistered.add(ses);

    ses.on("login", (_event, _webContents, authInfo, callback) => {
      if (!authInfo.isProxy) return callback("", "");
      const creds = _sessionProxyCreds.get(ses);
      if (creds) callback(creds.username, creds.password);
      else callback("", "");
    });

    ses.webRequest.onBeforeRequest((details, callback) => {
      try {
        const runtime = _sessionRuntimeState.get(ses) || {};
        const activeProfile = runtime.profile || profile;
        const url = new URL(details.url);
        if (activeProfile.block_trackers && TRACKER_HOSTS.some((host) =>
          details.url.includes(host) || url.hostname.includes(host)
        )) { callback({ cancel: true }); return; }
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
      callback({ requestHeaders: headers });
    });
  }

  return { ok: true, partition: partitionFor(profile.id), proxyRules: hasProxy ? "set" : "direct", preload };
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
  prepareSession
};
