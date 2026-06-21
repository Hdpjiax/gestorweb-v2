import { esc } from "../helpers.js";
import { state, ui } from "../state.js";

function licenseLabel() {
  const value = state.license?.id || state.license?.fingerprint || state.license?.shortId || "SIN-LICENCIA";
  return String(value).replace(/^GW-/, "").slice(0, 14).toUpperCase();
}

export function renderGlobalBar() {
  const economy = (state.settings?.resourceMode || "economy") === "economy";
  const ip = ui.globalIp || "detectando...";
  const route = ui.globalIpRoute || "directo";
  return `
    <header class="global-app-bar">
      <div class="global-brand">
        <span class="global-brand-dot"></span>
        <strong>Gestor Web</strong>
        <span>v1.5.0</span>
        <span class="mono global-license-id">${esc(licenseLabel())}</span>
      </div>
      <div class="global-status">
        <span class="global-ip" title="Ruta: ${esc(route)}"><small>IP</small><b id="globalIpValue">${esc(ip)}</b></span>
        <span class="pill accent">midnight</span>
        <button class="resource-mode-toggle ${economy ? "economy" : "normal"}" type="button" data-action="toggle-resource-mode" title="Cambiar consumo de recursos">
          <span class="dot"></span><span id="resourceModeLabel">modo ${economy ? "ahorro" : "normal"} activo</span>
        </button>
      </div>
    </header>
  `;
}
