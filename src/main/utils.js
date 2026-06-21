const { app, session } = require("electron");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

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

function backupFile(file) {
  return `${file}.bak`;
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJson(file, fallback) {
  try {
    return readJsonFile(file);
  } catch {
    try {
      return readJsonFile(backupFile(file));
    } catch {
      return fallback;
    }
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  const serialized = JSON.stringify(value, null, 2);
  fs.writeFileSync(tmp, serialized, "utf8");

  if (fs.existsSync(file)) {
    try {
      fs.copyFileSync(file, backupFile(file));
    } catch {}
  }

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
    vendor: fp.vendor == null ? "" : fp.vendor,
    browser: fp.browser || "Firefox",
    os: fp.os || "Windows",
    mobile: !!fp.mobile,
    touchPoints: Number(fp.touchPoints || 0),
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
  define(Navigator.prototype, 'vendor', fp.vendor);
  define(Navigator.prototype, 'maxTouchPoints', fp.touchPoints);
  define(Navigator.prototype, 'language', fp.locale);
  define(Navigator.prototype, 'languages', [fp.locale, fp.locale.split('-')[0], 'en-US', 'en']);
  define(Navigator.prototype, 'hardwareConcurrency', fp.cores);
  define(Navigator.prototype, 'deviceMemory', fp.memoryGB);
  define(Navigator.prototype, 'webdriver', false);
  define(Navigator.prototype, 'doNotTrack', '1');
  define(Navigator.prototype, 'globalPrivacyControl', true);
  if (/Chrome/i.test(fp.browser)) {
    const platformName = fp.os === 'Android' ? 'Android' : fp.os === 'macOS' ? 'macOS' : 'Windows';
    const uaData = {
      brands: [{ brand: 'Chromium', version: '126' }, { brand: 'Google Chrome', version: '126' }, { brand: 'Not/A)Brand', version: '99' }],
      mobile: fp.mobile,
      platform: platformName,
      getHighEntropyValues: async (hints) => Object.fromEntries((hints || []).map((hint) => [hint, ({
        architecture: fp.mobile ? 'arm' : 'x86',
        bitness: fp.mobile ? '64' : '64',
        model: fp.mobile ? 'Pixel 8' : '',
        platformVersion: fp.os === 'Android' ? '14.0.0' : fp.os === 'Windows' ? '10.0.0' : '14.4.0',
        uaFullVersion: '126.0.0.0',
        fullVersionList: [{ brand: 'Chromium', version: '126.0.0.0' }, { brand: 'Google Chrome', version: '126.0.0.0' }]
      })[hint]]))
    };
    define(Navigator.prototype, 'userAgentData', uaData);
  } else {
    define(Navigator.prototype, 'userAgentData', undefined);
  }
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
    // ── Seeded xorshift32 PRNG ────────────────────────────────────────────
    // Produces a deterministic sequence per profile (stable across renders)
    // while being unique across profiles. Magnitude is sub-visual (~0.004 alpha).
    function makeRng(seed) {
      let s = (seed >>> 0) || 1;
      return function () {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        return (s >>> 0) / 4294967296;
      };
    }
    // ── Canvas noise (toDataURL + getImageData) ───────────────────────────
    // Paints 4-6 semi-transparent pixels at seeded positions before export.
    // getImageData is also patched so raw reads get the same mutation.
    try {
      const _toDataURL = HTMLCanvasElement.prototype.toDataURL;
      const _toBlob    = HTMLCanvasElement.prototype.toBlob;
      function applyCanvasNoise(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx || canvas.width < 2 || canvas.height < 2) return;
        const rng   = makeRng(fp.seed ^ (canvas.width * 7 + canvas.height * 13));
        const count = 4 + Math.floor(rng() * 3); // 4-6 pixels
        for (let i = 0; i < count; i++) {
          const x = Math.floor(rng() * canvas.width);
          const y = Math.floor(rng() * canvas.height);
          const r = Math.floor(rng() * 8);
          const g = Math.floor(rng() * 8);
          const b = Math.floor(rng() * 8);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.004)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        applyCanvasNoise(this);
        return _toDataURL.apply(this, args);
      };
      HTMLCanvasElement.prototype.toBlob = function (cb, ...args) {
        applyCanvasNoise(this);
        return _toBlob.call(this, cb, ...args);
      };
      const _getImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        const imgData = _getImageData.apply(this, args);
        const rng = makeRng(fp.seed ^ (imgData.width * 3 + imgData.height * 5));
        const count = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(rng() * (imgData.data.length / 4)) * 4;
          imgData.data[idx]     = (imgData.data[idx]     + Math.floor(rng() * 4)) & 0xff;
          imgData.data[idx + 1] = (imgData.data[idx + 1] + Math.floor(rng() * 4)) & 0xff;
          imgData.data[idx + 2] = (imgData.data[idx + 2] + Math.floor(rng() * 4)) & 0xff;
        }
        return imgData;
      };
    } catch {}
    // ── Audio noise (full-array micro-dither) ─────────────────────────────
    // Applies ±1e-8 dither to every sample — below human hearing threshold
    // but enough to change the AudioBuffer hash that fingerprinters read.
    try {
      const _getChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (...args) {
        const data = _getChannelData.apply(this, args);
        if (data && data.length > 0) {
          const rng = makeRng(fp.seed ^ (this.sampleRate | 0));
          for (let i = 0; i < data.length; i++) {
            data[i] += (rng() - 0.5) * 2e-8;
          }
        }
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
  function installThemedCursor() {
    const attach = () => {
      if (!document.documentElement || document.getElementById('gw-themed-cursor')) return;
      const style = document.createElement('style');
      style.id = 'gw-themed-cursor';
      const cursor = 'url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2728%27%20height=%2732%27%20viewBox=%270%200%2028%2032%27%3E%3Cpath%20d=%27M3%202v24l6-6%205%2010%206-3-5-9h9z%27%20fill=%27%238b5cf6%27%20stroke=%27%23060a12%27%20stroke-width=%272%27%20stroke-linejoin=%27round%27/%3E%3Cpath%20d=%27M5%205v15l4-4h9z%27%20fill=%27%2367e8f9%27%20opacity=%27.78%27/%3E%3C/svg%3E") 3 2, auto';
      style.textContent = 'html,body,body *{cursor:' + cursor + '!important;}';
      document.documentElement.appendChild(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
    else attach();
  }
  installThemedCursor();
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

module.exports = {
  TRACKER_HOSTS,
  dataDir,
  profilesDir,
  profileDir,
  stateFile,
  backupFile,
  readJson,
  writeJson,
  getHwid,
  partitionFor,
  sessionFor,
  preloadDir,
  preloadFileFor,
  writeFingerprintPreload,
  findGestorBrowser,
  addonPaths
};
