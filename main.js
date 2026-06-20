const { app, BrowserWindow, dialog, ipcMain, net: electronNet, shell, session } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

let mainWindow = null;
const profileWindows = new Map();

const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "facebook.net",
  "facebook.com/tr",
  "fingerprint.com",
  "fingerprintjs.com",
  "hotjar.com",
  "segment.io",
  "mixpanel.com",
  "amplitude.com",
  "clarity.ms",
  "fullstory.com",
  "sentry.io",
  "bugsnag.com"
];

function dataDir() {
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function profilesDir() {
  const dir = path.join(dataDir(), "profiles");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function profileDir(profileId) {
  const dir = path.join(profilesDir(), String(profileId).replace(/[^a-zA-Z0-9_-]/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function stateFile() {
  return path.join(dataDir(), "state.json");
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function getHwid() {
  const cpus = os.cpus().map((cpu) => cpu.model).join("|");
  const nets = Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .map((iface) => iface.mac)
    .filter((mac) => mac && mac !== "00:00:00:00:00:00")
    .sort()
    .join("|");
  const source = [os.hostname(), os.platform(), os.arch(), os.totalmem(), cpus, nets].join("::");
  const digest = crypto.createHash("sha256").update(source).digest("hex").toUpperCase();
  return `GW-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
}

function partitionFor(profileId) {
  return `persist:gw-${String(profileId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function sessionFor(profileId) {
  return session.fromPartition(partitionFor(profileId));
}

function preloadDir() {
  const dir = path.join(app.getPath("userData"), "preloads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function preloadFileFor(profileId) {
  return path.join(preloadDir(), `${String(profileId).replace(/[^a-zA-Z0-9_-]/g, "")}.js`);
}

function writeFingerprintPreload(profile) {
  const file = preloadFileFor(profile.id);
  const fp = profile.fingerprint || {};
  const payload = JSON.stringify({
    ua: fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    platform: fp.platform || "Win32",
    locale: fp.locale || "es-MX",
    timezone: fp.timezone || "America/Mexico_City",
    width: fp.resolution?.width || 1920,
    height: fp.resolution?.height || 1080,
    cores: fp.cores || 8,
    memoryGB: fp.memoryGB || 16,
    webgl: fp.webgl || "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar",
    seed: fp.noiseSeed || 123456,
    webrtcBlock: !!profile.webrtc_block,
    compatMode: !!profile.compat_mode
  });
  const code = `(() => {
  const fp = ${payload};
  const define = (target, key, value) => {
    try { Object.defineProperty(target, key, { get: () => value, configurable: true }); } catch {}
  };
  define(Navigator.prototype, 'userAgent', fp.ua);
  define(Navigator.prototype, 'platform', fp.platform);
  define(Navigator.prototype, 'language', fp.locale);
  define(Navigator.prototype, 'languages', [fp.locale, fp.locale.split('-')[0], 'en-US', 'en']);
  define(Navigator.prototype, 'hardwareConcurrency', fp.cores);
  define(Navigator.prototype, 'deviceMemory', fp.memoryGB);
  define(Navigator.prototype, 'webdriver', false);
  define(Navigator.prototype, 'doNotTrack', '1');
  define(Navigator.prototype, 'globalPrivacyControl', true);
  define(screen, 'width', fp.width);
  define(screen, 'height', fp.height);
  define(screen, 'availWidth', fp.width);
  define(screen, 'availHeight', Math.max(1, fp.height - 48));
  define(screen, 'colorDepth', 24);
  define(screen, 'pixelDepth', 24);
  try {
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      return { ...originalResolvedOptions.call(this), timeZone: fp.timezone, locale: fp.locale };
    };
  } catch {}
  try {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return 'Google Inc. (NVIDIA)';
      if (param === 37446) return fp.webgl;
      return getParameter.call(this, param);
    };
    if (window.WebGL2RenderingContext) {
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (param) {
        if (param === 37445) return 'Google Inc. (NVIDIA)';
        if (param === 37446) return fp.webgl;
        return getParameter2.call(this, param);
      };
    }
  } catch {}
  if (!fp.compatMode) {
    try {
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        const ctx = this.getContext('2d');
        if (ctx) {
          const x = Math.abs(fp.seed % Math.max(1, this.width || 1));
          const y = Math.abs((fp.seed >> 8) % Math.max(1, this.height || 1));
          ctx.fillStyle = 'rgba(' + (fp.seed % 255) + ',0,0,0.004)';
          ctx.fillRect(x, y, 1, 1);
        }
        return toDataURL.apply(this, args);
      };
    } catch {}
    try {
      const getChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (...args) {
        const data = getChannelData.apply(this, args);
        if (data && data.length) data[0] = data[0] + ((fp.seed % 97) / 1e9);
        return data;
      };
    } catch {}
  }
  if (fp.webrtcBlock) {
    try {
      const Blocked = function () { throw new Error('WebRTC blocked by Gestor Web'); };
      window.RTCPeerConnection = Blocked;
      window.webkitRTCPeerConnection = Blocked;
      if (navigator.mediaDevices) {
        navigator.mediaDevices.enumerateDevices = async () => [];
        navigator.mediaDevices.getUserMedia = async () => { throw new Error('media devices blocked'); };
      }
    } catch {}
  }
})();`;
  fs.writeFileSync(file, code, "utf8");
  return file;
}

function findGestorBrowser() {
  const searchPaths = [];
  if (app.isPackaged && process.resourcesPath) {
    searchPaths.push(
      path.join(process.resourcesPath, "gestor-browser", "GestorWeb.exe"),
      path.join(process.resourcesPath, "gestor-browser", "firefox.exe"),
      path.join(process.resourcesPath, "gestor-browser", "Camoufox.exe"),
      path.join(process.resourcesPath, "..", "gestor-browser", "GestorWeb.exe"),
      path.join(process.resourcesPath, "..", "gestor-browser", "Camoufox.exe"),
      path.join(path.dirname(process.execPath), "resources", "gestor-browser", "GestorWeb.exe"),
      path.join(path.dirname(process.execPath), "resources", "gestor-browser", "Camoufox.exe")
    );
  } else {
    const base = app.getAppPath().replace(/[/\\]resources[/\\]app\.asar.*/, "");
    searchPaths.push(
      path.join(base, "gestor-browser", "GestorWeb.exe"),
      path.join(base, "gestor-browser", "Camoufox.exe"),
      path.join(base, "Gestor Web-1.3.0-Setup", "resources", "gestor-browser", "GestorWeb.exe"),
      path.join(base, "Gestor Web-1.3.0-Setup", "resources", "gestor-browser", "Camoufox.exe"),
      path.join(__dirname, "..", "gestor-browser", "GestorWeb.exe"),
      path.join(__dirname, "..", "gestor-browser", "Camoufox.exe"),
      path.join(__dirname, "..", "Gestor Web-1.3.0-Setup", "resources", "gestor-browser", "GestorWeb.exe"),
      path.join(__dirname, "..", "Gestor Web-1.3.0-Setup", "resources", "gestor-browser", "Camoufox.exe")
    );
  }
  const found = searchPaths.find((p) => fs.existsSync(p));
  if (!found && app.isPackaged) {
    try { fs.mkdirSync(path.join(dataDir(), "logs"), { recursive: true }); } catch {}
    const logFile = path.join(dataDir(), "logs", "browser-find.log");
    fs.writeFileSync(logFile, `findGestorBrowser search paths:\n${searchPaths.join("\n")}\n`, "utf8");
  }
  return found || null;
}

function addonPaths() {
  const base = findGestorBrowser();
  if (!base) return [];
  const ubo = path.join(path.dirname(base), "addons", "UBO");
  return fs.existsSync(ubo) ? [ubo] : [];
}

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
    if (String(proxy.scheme).startsWith("socks")) {
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
    if (proxy.username || proxy.password) {
      add("signon.autologin.proxy", true);
    }
  } else {
    add("network.proxy.type", 0);
  }
  fs.writeFileSync(path.join(dir, "user.js"), prefs.join("\n"), "utf8");
  return dir;
}

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

function injectCursorAndSpoof(win, profile) {
  win.webContents.on("did-finish-load", () => {
    win.webContents.insertCSS(`
      #gw-cursor-dot { position: fixed; z-index: 2147483647; width: 10px; height: 10px; margin-left: -5px; margin-top: -5px; border-radius: 999px; background: #ef4444; pointer-events: none; box-shadow: 0 0 0 3px rgba(239,68,68,.25), 0 0 18px rgba(239,68,68,.65); transform: translate(-100px,-100px); }
    `).catch(() => {});
    win.webContents.executeJavaScript(`
      (() => {
        if (!document.getElementById('gw-cursor-dot')) {
          const dot = document.createElement('div');
          dot.id = 'gw-cursor-dot';
          document.documentElement.appendChild(dot);
          window.addEventListener('mousemove', (e) => { dot.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
        }
      })();
    `).catch(() => {});
  });
}

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
  injectCursorAndSpoof(win, profile);
  await win.loadURL(startUrl);
  win.on("closed", () => profileWindows.delete(profile.id));
  profileWindows.set(profile.id, { type: "electron", win });
  return { ok: true, mode: "chromium", id: profile.id };
}

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
  child.on("exit", () => profileWindows.delete(profile.id));
  profileWindows.set(profile.id, { type: "firefox", child });
  return { ok: true, mode: "firefox", pid: child.pid, id: profile.id, browserPath };
}

async function openProfileWindow(profile, proxy, startUrl) {
  if (!profile?.id) return { ok: false, error: "missing profile" };
  const existing = profileWindows.get(profile.id);
  if (existing) {
    focusProfileWindow(profile.id);
    return { ok: true, reused: true, mode: existing.type };
  }
  const url = startUrl || profile.url || (profile.tor_mode ? "https://check.torproject.org/" : "https://duckduckgo.com/");
  return profile.gw_engine !== false ? openFirefoxWindow(profile, proxy, url) : openChromiumWindow(profile, proxy, url);
}

function closeProfileWindow(profileId) {
  const item = profileWindows.get(profileId);
  if (!item) return { ok: true, closed: false };
  if (item.type === "electron" && !item.win.isDestroyed()) item.win.close();
  if (item.type === "firefox" && item.child && !item.child.killed) item.child.kill();
  profileWindows.delete(profileId);
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
    spawn("powershell.exe", ["-NoProfile", "-Command", `$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate(${item.child.pid}) | Out-Null`], { windowsHide: true });
    return { ok: true };
  }
  return { ok: false };
}

function proxyRulesFor(profile, proxy) {
  if (profile?.tor_mode) return "socks5://127.0.0.1:9050";
  if (!proxy) return "";
  const scheme = proxy.scheme || "http";
  const host = proxy.host;
  const port = proxy.port;
  if (proxy.username || proxy.password) {
    return `${scheme}://${encodeURIComponent(proxy.username || "")}:${encodeURIComponent(proxy.password || "")}@${host}:${port}`;
  }
  return `${scheme}://${host}:${port}`;
}

async function prepareSession(profile, proxy) {
  if (!profile?.id) return { ok: false, error: "missing profile id" };
  const ses = sessionFor(profile.id);
  const fp = profile.fingerprint || {};
  const preload = writeFingerprintPreload(profile);
  try {
    ses.setUserAgent(fp.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0", fp.locale || "es-MX");
  } catch {}
  try {
    if (typeof ses.setPreloads === "function") ses.setPreloads([preload]);
  } catch {}
  const proxyRules = proxyRulesFor(profile, proxy);
  const hasProxyCreds = proxy && (proxy.username || proxy.password);
  try {
    if (hasProxyCreds) {
      const cleanRules = `${proxy.scheme || "http"}://${proxy.host}:${proxy.port}`;
      await ses.setProxy({ proxyRules: cleanRules, proxyBypassRules: "<-loopback>" });
      ses.webRequest.onAuthRequired((details, callback) => {
        if (details.isProxy === false) return callback({});
        callback({ authCredentials: { username: String(proxy.username || ""), password: String(proxy.password || "") } });
      });
    } else if (proxyRules) {
      await ses.setProxy({ proxyRules, proxyBypassRules: "<-loopback>" });
    } else {
      await ses.setProxy({ proxyRules: "direct://", proxyBypassRules: "<-loopback>" });
    }
  } catch (e) { console.error("setProxy error:", e); }

  ses.webRequest.onBeforeRequest((details, callback) => {
    try {
      const url = new URL(details.url);
      if (profile.block_trackers && TRACKER_HOSTS.some((host) => details.url.includes(host) || url.hostname.includes(host))) {
        callback({ cancel: true });
        return;
      }
      if (profile.strip_tracking_params) {
        const before = url.toString();
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "msclkid"].forEach((key) => url.searchParams.delete(key));
        const after = url.toString();
        if (after !== before) {
          callback({ redirectURL: after });
          return;
        }
      }
    } catch {
      // Ignore invalid internal URLs.
    }
    callback({});
  });

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    const fp = profile.fingerprint || {};
    if (fp.userAgent) headers["User-Agent"] = fp.userAgent;
    if (fp.locale) headers["Accept-Language"] = `${fp.locale},${String(fp.locale).split("-")[0]};q=0.9,en;q=0.7`;
    if (profile.sanitize_headers) {
      Object.keys(headers).forEach((key) => {
        if (key.toLowerCase().startsWith("sec-ch-ua")) delete headers[key];
      });
    }
    if (profile.strict_referer) {
      Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() === "referer") delete headers[key];
      });
    }
    callback({ requestHeaders: headers });
  });

  return { ok: true, partition: partitionFor(profile.id), proxyRules, preload };
}

function checkProxy(proxy) {
  const scheme = String(proxy?.scheme || "http").toLowerCase();
  if (scheme.startsWith("socks5")) return checkSocks5Proxy(proxy);
  if (scheme.startsWith("socks4")) return checkSocks4Proxy(proxy);
  return checkHttpProxy(proxy);
}

function proxyResult(proxy, started, healthy, lastError = null) {
  return {
    ...proxy,
    healthy,
    latency_ms: healthy ? Date.now() - started : null,
    last_error: lastError
  };
}

function checkHttpProxy(proxy) {
  return new Promise((resolve) => {
    if (!proxy?.host || !proxy?.port) return resolve({ ...proxy, healthy: false, latency_ms: null, last_error: "host/port vacio" });
    const started = Date.now();
    const socket = new net.Socket();
    let done = false;
    let buffer = "";
    const finish = (healthy, lastError = null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(proxyResult(proxy, started, healthy, lastError));
    };
    socket.setTimeout(8000);
    socket.once("connect", () => {
      const auth = proxy.username || proxy.password
        ? `Proxy-Authorization: Basic ${Buffer.from(`${proxy.username || ""}:${proxy.password || ""}`).toString("base64")}\r\n`
        : "";
      socket.write(`CONNECT www.google.com:443 HTTP/1.1\r\nHost: www.google.com:443\r\n${auth}Connection: close\r\n\r\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (!buffer.includes("\r\n")) return;
      const line = buffer.split("\r\n")[0] || "";
      if (/\s200\s/.test(line)) finish(true);
      else if (/\s407\s/.test(line)) finish(false, "proxy auth rechazado");
      else if (/^HTTP\//.test(line)) finish(false, line.replace(/^HTTP\/\d(?:\.\d)?\s*/, ""));
    });
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(proxy.port), proxy.host);
  });
}

function checkSocks5Proxy(proxy) {
  return new Promise((resolve) => {
    if (!proxy?.host || !proxy?.port) return resolve({ ...proxy, healthy: false, latency_ms: null, last_error: "host/port vacio" });
    const started = Date.now();
    const socket = new net.Socket();
    const target = Buffer.from("www.google.com");
    let done = false;
    let stage = "hello";
    const finish = (healthy, lastError = null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(proxyResult(proxy, started, healthy, lastError));
    };
    const connectTarget = () => {
      socket.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, target.length]), target, Buffer.from([0x01, 0xbb])]));
      stage = "connect";
    };
    socket.setTimeout(8000);
    socket.once("connect", () => {
      socket.write(proxy.username || proxy.password ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]));
    });
    socket.on("data", (data) => {
      if (stage === "hello") {
        if (data[0] !== 0x05 || data[1] === 0xff) return finish(false, "socks5 metodo no soportado");
        if (data[1] === 0x02) {
          const user = Buffer.from(String(proxy.username || ""));
          const pass = Buffer.from(String(proxy.password || ""));
          socket.write(Buffer.concat([Buffer.from([0x01, user.length]), user, Buffer.from([pass.length]), pass]));
          stage = "auth";
          return;
        }
        connectTarget();
        return;
      }
      if (stage === "auth") {
        if (data[1] !== 0x00) return finish(false, "socks5 auth rechazado");
        connectTarget();
        return;
      }
      if (stage === "connect") {
        finish(data[1] === 0x00, data[1] === 0x00 ? null : `socks5 connect ${data[1]}`);
      }
    });
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(proxy.port), proxy.host);
  });
}

function checkSocks4Proxy(proxy) {
  return new Promise((resolve) => {
    if (!proxy?.host || !proxy?.port) return resolve({ ...proxy, healthy: false, latency_ms: null, last_error: "host/port vacio" });
    const started = Date.now();
    const socket = new net.Socket();
    const user = Buffer.from(String(proxy.username || ""));
    const domain = Buffer.from("www.google.com");
    let done = false;
    const finish = (healthy, lastError = null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(proxyResult(proxy, started, healthy, lastError));
    };
    socket.setTimeout(8000);
    socket.once("connect", () => {
      socket.write(Buffer.concat([Buffer.from([0x04, 0x01, 0x01, 0xbb, 0x00, 0x00, 0x00, 0x01]), user, Buffer.from([0x00]), domain, Buffer.from([0x00])]));
    });
    socket.on("data", (data) => finish(data[1] === 0x5a, data[1] === 0x5a ? null : `socks4 connect ${data[1]}`));
    socket.once("timeout", () => finish(false, "timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(proxy.port), proxy.host);
  });
}

function base32ToBuffer(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(secret || "").replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("invalid base32 secret");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totpCode(secret) {
  const step = 30;
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / step);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = crypto.createHmac("sha1", base32ToBuffer(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
  return { code, secondsLeft: step - (now % step) };
}

async function repeaterSend(request) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = electronNet.request({ method: request.method || "GET", url: request.url });
    for (const [key, value] of Object.entries(request.headers || {})) req.setHeader(key, value);
    const chunks = [];
    req.on("response", (res) => {
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8"),
        ms: Date.now() - started
      }));
    });
    req.on("error", (error) => resolve({ status: 0, headers: {}, body: error.message, ms: Date.now() - started }));
    if (request.body) req.write(request.body);
    req.end();
  });
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
      sandbox: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function registerIpc() {
  ipcMain.handle("state:load", () => readJson(stateFile(), null));
  ipcMain.handle("state:save", (_event, state) => {
    writeJson(stateFile(), state || {});
    return { ok: true };
  });
  ipcMain.handle("app:openDataDir", () => shell.openPath(dataDir()));
  ipcMain.handle("app:dbStats", () => {
    const file = stateFile();
    const exists = fs.existsSync(file);
    return { dataDir: dataDir(), stateFile: file, bytes: exists ? fs.statSync(file).size : 0 };
  });
  ipcMain.handle("app:healthcheck", () => ({ ok: true, electron: process.versions.electron, chrome: process.versions.chrome }));
  ipcMain.handle("app:openExternal", (_event, url) => shell.openExternal(url));
  ipcMain.handle("browse:prepareSession", (_event, profile, proxy) => prepareSession(profile, proxy));
  ipcMain.handle("browse:freshenMemory", async (_event, profileId) => {
    await sessionFor(profileId).clearStorageData({ storages: ["appcache", "shadercache", "serviceworkers", "cachestorage"] });
    return { ok: true };
  });
  ipcMain.handle("cookies:get", (_event, profileId) => sessionFor(profileId).cookies.get({}));
  ipcMain.handle("cookies:clear", async (_event, profileId) => {
    await sessionFor(profileId).clearStorageData({ storages: ["cookies"] });
    return [];
  });
  ipcMain.handle("cookies:delete", async (_event, profileId, cookie) => {
    const ses = sessionFor(profileId);
    if (cookie?.url && cookie?.name) {
      await ses.cookies.delete({ url: cookie.url, name: cookie.name });
    } else if (cookie?.domain && cookie?.name) {
      const url = `https://${String(cookie.domain).replace(/^\./, "")}/`;
      await ses.cookies.delete({ url, name: cookie.name });
    }
    return ses.cookies.get({});
  });
  ipcMain.handle("cookies:set", async (_event, profileId, cookies) => {
    const ses = sessionFor(profileId);
    for (const cookie of cookies || []) {
      if (cookie._delete) {
        const url = cookie.url || `https://${String(cookie.domain || "").replace(/^\./, "")}/`;
        await ses.cookies.delete({ url, name: cookie.name });
        continue;
      }
      const domain = String(cookie.domain || "").replace(/^\./, "");
      if (!cookie.name || !domain) continue;
      const details = {
        url: cookie.url || `https://${domain}`,
        name: String(cookie.name),
        value: String(cookie.value || ""),
        domain: cookie.domain,
        path: cookie.path || "/",
        secure: cookie.secure !== false,
        httpOnly: !!cookie.httpOnly
      };
      const expirationDate = Number(cookie.expirationDate || cookie.expires || 0);
      if (Number.isFinite(expirationDate) && expirationDate > 0) details.expirationDate = expirationDate;
      await ses.cookies.set(details);
    }
    return ses.cookies.get({});
  });
  ipcMain.handle("license:hwid", () => getHwid());
  ipcMain.handle("license:status", () => ({ hwid: getHwid(), active: !!readJson(stateFile(), {})?.license?.active }));
  ipcMain.handle("license:claimByKey", (_event, key) => ({ active: /^GW-/i.test(String(key || "")), hwid: getHwid() }));
  ipcMain.handle("license:install", (_event, text) => ({ active: !!String(text || "").trim(), hwid: getHwid() }));
  ipcMain.handle("license:ipcheck", async () => {
    const result = await repeaterSend({ method: "GET", url: "https://api.ipify.org?format=json" });
    try { return JSON.parse(result.body); } catch { return { ip: null, raw: result.body }; }
  });
  ipcMain.handle("profiles:openWindow", (_event, profile, proxy, url) => openProfileWindow(profile, proxy, url));
  ipcMain.handle("profiles:closeWindow", async (_event, profileId) => {
    const state = readJson(stateFile(), {});
    const profile = state.profiles?.find((p) => String(p.id) === String(profileId));
    if (profile?.auto_wipe_close) {
      await sessionFor(profileId).clearStorageData({ storages: ["cookies", "cachestorage", "indexeddb", "localStorage", "sessionStorage"] });
      await sessionFor(profileId).cookies.set({ url: "https://gestor.invalid/", name: "gw_wipe", value: "1", expirationDate: 1 });
    }
    return closeProfileWindow(profileId);
  });
  ipcMain.handle("profiles:openPath", (_event, profileId) => shell.openPath(profileDir(profileId)));
  ipcMain.handle("profiles:focusWindow", (_event, profileId) => focusProfileWindow(profileId));
  ipcMain.handle("profiles:isWindowOpen", (_event, profileId) => ({ open: profileWindows.has(profileId) }));
  ipcMain.handle("proxies:check", (_event, proxy) => checkProxy(proxy));
  ipcMain.handle("proxies:checkAll", (_event, proxies) => Promise.all((proxies || []).map(checkProxy)));
  ipcMain.handle("repeater:send", (_event, request) => repeaterSend(request));
  ipcMain.handle("security:status", () => ({ devtoolsBlocked: app.isPackaged, webviewSandboxed: true }));
  ipcMain.handle("tor:status", () => checkProxy({ host: "127.0.0.1", port: 9050, scheme: "socks5" }));
  ipcMain.handle("tor:detect", () => checkProxy({ host: "127.0.0.1", port: 9050, scheme: "socks5" }));
  ipcMain.handle("totp:code", (_event, secret) => totpCode(secret));
  ipcMain.handle("vault:exportFile", async (_event, state) => {
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: "gestor-web-vault.json", filters: [{ name: "JSON", extensions: ["json"] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    writeJson(result.filePath, state || {});
    return { canceled: false, filePath: result.filePath };
  });
  ipcMain.handle("vault:importFile", async () => {
    const result = await dialog.showOpenDialog(mainWindow, { filters: [{ name: "JSON", extensions: ["json"] }], properties: ["openFile"] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { canceled: false, state: readJson(result.filePaths[0], null), filePath: result.filePaths[0] };
  });
}
