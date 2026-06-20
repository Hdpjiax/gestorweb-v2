import { esc } from "../helpers.js";
import { state, ui } from "../state.js";
import { radioSegments } from "../utils.js";
import { templates, resolutions, timezones, locales } from "../icons.js";

export function renderProfileAdvancedFields() {
  return `
    <div class="metric stack">
      <div class="grid-3">
        <div>
          <label class="label">Resolucion</label>
          <select class="select" name="resolution">
            ${resolutions.map((r) => `<option value="${r}" ${r === "1920x1080" ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Timezone</label>
          <select class="select" name="timezone">
            ${timezones.map((t) => `<option value="${t}" ${t === "America/Monterrey" ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Idioma</label>
          <select class="select" name="locale">
            ${locales.map((l) => `<option value="${l}" ${l === "es-MX" ? "selected" : ""}>${l}</option>`).join("")}
          </select>
        </div>
      </div>
      <div>
        <label class="label">2FA / TOTP secret</label>
        <input class="input mono" name="totp_secret" />
      </div>
      <div class="grid-3">
        <label class="metric"><input type="checkbox" name="headless" /> headless</label>
        <label class="metric"><input type="checkbox" name="har_enabled" /> grabar HAR</label>
        <label class="metric"><input type="checkbox" name="webrtc_block" checked /> bloquear WebRTC</label>
      </div>
    </div>
  `;
}

export function renderNewProfileModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <form id="newProfileForm" class="modal-card" data-modal-card>
        <div class="modal-head between">
          <div>
            <div class="title">Nuevo perfil</div>
            <div class="subtitle">Sesion aislada con fingerprint propio</div>
          </div>
          <button class="icon-btn" type="button" data-action="close-modal">x</button>
        </div>
        <div class="modal-body stack">
          <div class="grid-2">
            <div><label class="label">Nombre *</label><input class="input" name="name" required autofocus /></div>
            <div><label class="label">Grupo / tag</label><input class="input" name="group_tag" /></div>
          </div>
          <div>
            <label class="label">URL inicial</label>
            <input class="input" name="url" placeholder="shein.com.mx" />
          </div>
          <div>
            <label class="label">Plantilla de fingerprint</label>
            <select class="select" name="template_id">
              <option value="win_firefox_mx">Windows / Firefox 135 (MX)</option>
              ${templates
                .filter((t) => t.id !== "win_firefox_mx")
                .map((t) => `<option value="${t.id}">${esc(t.label)}</option>`)
                .join("")}
            </select>
          </div>
          <div>
            <label class="label">Proxy</label>
            <select class="select" name="proxy_id">
              <option value="">Sin proxy</option>
              ${state.proxies
                .map((p) => `<option value="${p.id}">${esc(p.label || `${p.host}:${p.port}`)} ${p.healthy ? "+" : "-"}</option>`)
                .join("")}
            </select>
          </div>
          <div>
            <label class="label">Privacidad</label>
            ${radioSegments("privacy", ["none", "standard", "hardened", "anonymous"], "standard", 4)}
            <div class="small-note" id="privacy-subtitle">tracker-block · strip-utm · no-clienthints · DoH</div>
          </div>
          <div>
            <label class="label">Motor</label>
            ${radioSegments("engine", ["Firefox / Camoufox (indetectable)", "Chromium (compatibilidad)"], "Firefox / Camoufox (indetectable)", 2)}
            <div class="small-note" id="engine-subtitle">spoofing a nivel de motor estilo Dolphin, maxima indetectabilidad, recomendado para pagos</div>
          </div>
          <div>
            <label class="label">Modo</label>
            ${radioSegments("mode", ["normal", "compatibilidad"], "normal", 2)}
            <div class="small-note" id="mode-subtitle">spoofs agresivos ON · maximo anti-fingerprint · captchas duros pueden fallar</div>
          </div>
          <button class="btn btn-ghost" type="button" data-action="toggle-profile-advanced">
            ${ui.profileAdvanced ? "ocultar" : "mostrar"} avanzado
          </button>
          ${ui.profileAdvanced ? renderProfileAdvancedFields() : ""}
        </div>
        <div class="modal-foot between">
          <button class="btn btn-ghost" type="button" data-action="close-modal">cancelar</button>
          <button class="btn btn-primary" type="submit">crear perfil</button>
        </div>
      </form>
    </div>
  `;
}
