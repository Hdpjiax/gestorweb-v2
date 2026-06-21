import { shortId } from "./helpers.js";
import { ICONS } from "./icons.js";

export function makeFingerprint(template, overrides) {
  const isMobile = template.os === "Android" || template.os === "iOS";
  const platform = template.os === "macOS" ? "MacIntel" : template.os === "Android" ? "Linux armv8l" : template.os === "iOS" ? "iPhone" : "Win32";
  let ua;
  if (template.os === "iOS") {
    ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
  } else if (template.os === "Android") {
    ua = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
  } else if (template.browser.includes("Firefox")) {
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0";
  } else if (template.browser.includes("Safari")) {
    ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
  } else {
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  }
  const gpus = [
    "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (Intel, Intel(R) Iris Xe Graphics Direct3D11 vs_5_0 ps_5_0), or similar"
  ];
  const gpu = gpus[Math.floor(Math.random() * gpus.length)];
  return {
    templateId: template.id,
    os: template.os,
    browser: template.browser,
    platform,
    userAgent: ua,
    vendor: template.browser.includes("Safari") ? "Apple Computer, Inc." : template.browser.includes("Firefox") ? "" : "Google Inc.",
    mobile: isMobile,
    touchPoints: isMobile ? 5 : 0,
    webgl: gpu,
    canvas: `gw-${shortId(10).toLowerCase()}`,
    audio: `gw-${shortId(10).toLowerCase()}`,
    timezone: overrides.timezone,
    locale: overrides.locale,
    cores: isMobile ? 8 : [4, 8, 12, 16][Math.floor(Math.random() * 4)],
    memoryGB: isMobile ? 8 : [8, 16, 32][Math.floor(Math.random() * 3)],
    noiseSeed: Math.floor(Math.random() * 1e9),
    resolution: { width: overrides.width, height: overrides.height }
  };
}

export function forceFirefoxFingerprint(profile) {
  profile.fingerprint ||= {};
  profile.fingerprint.os = "Windows";
  profile.fingerprint.browser = "Firefox";
  profile.fingerprint.platform = "Win32";
  profile.fingerprint.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0";
  const gpus = [
    "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0), or similar",
    "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0), or similar"
  ];
  profile.fingerprint.webgl = profile.fingerprint.webgl || gpus[Math.floor(Math.random() * gpus.length)];
  profile.fingerprint.locale ||= "es-MX";
  profile.fingerprint.timezone ||= "America/Mexico_City";
  profile.fingerprint.resolution ||= { width: 1920, height: 1080 };
  profile.fingerprint.cores ||= [4, 8, 16][Math.floor(Math.random() * 3)];
  profile.fingerprint.memoryGB ||= [8, 16, 32][Math.floor(Math.random() * 3)];
}

export function buildChecks(profile, fp, isLive) {
  return [
    ["Canvas hash", profile.gw_engine || profile.harden_all ? "ok" : "warn", profile.gw_engine || profile.harden_all ? "noise inyectado" : "sin ruido", ICONS.fingerprint],
    ["Audio hash", profile.gw_engine || profile.harden_all ? "ok" : "warn", profile.gw_engine || profile.harden_all ? "noise inyectado" : "sin ruido", ICONS.audio],
    ["User Agent", fp.userAgent ? "ok" : "fail", fp.userAgent ? "unico" : "fallback", ICONS.globe],
    ["WebGL renderer", fp.webgl ? "ok" : "warn", fp.webgl ? "spoofed" : "default", ICONS.cpu],
    ["Timezone", fp.timezone ? "ok" : "warn", city(fp.timezone), ICONS.dns],
    ["Resolucion", fp.resolution ? "ok" : "warn", `${fp.resolution?.width || 1280}x${fp.resolution?.height || 720}`, ICONS.shield],
    [profile.tor_mode ? "Tor SOCKS5" : "Proxy", profile.tor_mode || profile.proxy_id ? "ok" : "warn", profile.tor_mode ? "tor 127.0.0.1:9050" : profile.proxy_id ? "asignado" : "sin proxy", profile.tor_mode ? ICONS.lock : ICONS.wifi],
    ["WebRTC leak", profile.webrtc_block ? "ok" : "warn", profile.webrtc_block ? "bloqueado" : "expuesto", ICONS.cpu],
    ["Bloqueo trackers", profile.block_trackers ? "ok" : "warn", profile.block_trackers ? "~80 dominios" : "off", ICONS.shield],
    ["Client hints", profile.sanitize_headers ? "ok" : "warn", profile.sanitize_headers ? "limpios" : "expuestos", ICONS.globe],
    ["No-referrer", profile.strict_referer ? "ok" : "warn", profile.strict_referer ? "activado" : "off", ICONS.eye],
    ["Force HTTPS", profile.force_https ? "ok" : "warn", profile.force_https ? "activado" : "off", ICONS.lock],
    ["DNS over HTTPS", profile.doh_enabled ? "ok" : "warn", profile.doh_enabled ? "cloudflare" : "off", ICONS.dns],
    ["Spoof extremo", profile.harden_all ? "ok" : "warn", profile.harden_all ? "activado" : "off", ICONS.zap],
    ["Solo en memoria", profile.in_memory ? "ok" : "warn", profile.in_memory ? "RAM only" : "disco", ICONS.cpu],
    ["Auto-wipe", profile.auto_wipe_close ? "ok" : "warn", profile.auto_wipe_close ? "al cerrar" : "off", ICONS.refresh],
    ["Sesion", isLive ? "ok" : "warn", isLive ? "aislada" : "inactiva", ICONS.play],
    ["Compat mode", !profile.compat_mode ? "ok" : "warn", !profile.compat_mode ? "spoofs full" : "reducido", ICONS.cpu]
  ].map(([label, status, value, icon]) => ({ label, status, value, icon }));
}

export function privacyScore(profile) {
  const keys = ["block_trackers", "strip_tracking_params", "sanitize_headers", "strict_referer", "webrtc_block", "doh_enabled", "force_https", "harden_all", "in_memory", "auto_wipe_close", "tor_mode"];
  const base = profile.gw_engine ? 20 : 5;
  const compatPenalty = profile.compat_mode ? -15 : 0;
  return Math.max(0, Math.min(100, base + keys.reduce((sum, key) => sum + (profile[key] ? 8 : 0), 0) + compatPenalty));
}

export function presetValues(preset) {
  const off = { block_trackers: false, strip_tracking_params: false, sanitize_headers: false, strict_referer: false, in_memory: false, auto_wipe_close: false, tor_mode: false, doh_enabled: false, harden_all: false, force_https: false };
  if (preset === "none") return off;
  if (preset === "standard") return { ...off, block_trackers: true, strip_tracking_params: true, sanitize_headers: true, doh_enabled: true, webrtc_block: true };
  if (preset === "hardened") return { ...off, block_trackers: true, strip_tracking_params: true, sanitize_headers: true, strict_referer: true, auto_wipe_close: true, doh_enabled: true, harden_all: true, webrtc_block: true };
  return { ...off, block_trackers: true, strip_tracking_params: true, sanitize_headers: true, strict_referer: true, in_memory: true, auto_wipe_close: true, tor_mode: true, doh_enabled: true, harden_all: true, webrtc_block: true };
}

export function city(tz) {
  return String(tz || "UTC").split("/").pop().replaceAll("_", " ");
}
