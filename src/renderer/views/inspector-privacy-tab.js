import { esc } from "../helpers.js";
import { ICONS } from "../icons.js";
import { privacyScore } from "../fingerprint.js";

export function renderInspectorPrivacyTab(profile) {
  const score = privacyScore(profile);
  const tier = score >= 90 ? "Anonymous" : score >= 70 ? "Hardened" : score >= 40 ? "Standard" : "Bajo";
  const flags = [
    [ICONS.shield,  "block_trackers",        "Bloquear trackers",         "~80 dominios"],
    [ICONS.link,    "strip_tracking_params",  "Quitar UTM/fbclid/gclid",   "strip-tracking"],
    [ICONS.globe,   "sanitize_headers",       "Limpiar client hints",      "no-clienthints"],
    [ICONS.eye,     "strict_referer",         "No-referrer",               "no-referrer header"],
    [ICONS.wifi,    "webrtc_block",           "Bloquear WebRTC",           "anti-leak"],
    [ICONS.dns,     "doh_enabled",            "DNS over HTTPS",            "cloudflare-dns"],
    [ICONS.lock,    "force_https",            "Force HTTPS",               "https-only"],
    [ICONS.zap,     "harden_all",             "Spoof extremo",             "spoof-extremo"],
    [ICONS.cpu,     "in_memory",              "Solo en memoria",           "RAM-only"],
    [ICONS.refresh, "auto_wipe_close",        "Auto-wipe al cerrar",       "auto-wipe"],
    [ICONS.lock,    "tor_mode",               "Tor mode",                  "SOCKS5 127.0.0.1:9050"],
  ];

  return `
    <div class="section privacy-stack">
      <div class="privacy-header" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="gw_engine">
        ${ICONS.shield}<span>Motor Firefox / Camoufox (indetectable)</span>
        <span class="pill ${profile.gw_engine ? "live" : "dim"}">${profile.gw_engine ? "on" : "off"}</span>
      </div>
      ${profile.gw_engine ? `<div class="callout"><strong class="live">Modo Firefox 135 activo.</strong> User-Agent, locale, pantalla, WebGL, canvas/audio y headers se aplican antes de cargar la pagina.</div>` : ""}
      ${profile.compat_mode ? `<div class="callout"><strong class="live">Modo compatibilidad activo.</strong> Spoofs agresivos desactivados para captchas, pagos y banking.</div>` : ""}
      ${profile.tor_mode ? `<div class="tor-notice">${ICONS.warning}<span>Anonymous requiere Tor en 127.0.0.1:9050. Asegurate de que TOR este corriendo.</span></div>` : ""}
      <div class="metric">
        <div class="">
          <strong class="accent" style="font-size:30px">${score}</strong>
          <span class="dim">/ 100</span>
          <span class="pill accent">${tier}</span>
        </div>
        <div class="progress" style="margin-top:10px"><span style="width:${score}%"></span></div>
      </div>
      <div class="label">Aplicar preset</div>
      <div class="preset-grid">
        ${["none", "standard", "hardened", "anonymous"].map(
          (preset) => `<button class="preset-btn ${profile.privacy_preset === preset ? "active" : ""}" data-action="apply-preset" data-id="${profile.id}" data-preset="${preset}">${preset}</button>`
        ).join("")}
      </div>
      <div class="privacy-flags">
        ${flags.map(([icon, key, label, sub]) => `
          <div class="privacy-flag ${profile[key] ? "on" : ""}" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="${key}">
            <div class="flag-icon">${ICONS.check}</div>
            <span>${esc(label)}</span>
            <span class="flag-state">${profile[key] ? sub : "off"}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
