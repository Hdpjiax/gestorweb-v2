import { esc, attr } from "../helpers.js";
import { state, ui } from "../state.js";
import { radioSegments } from "../utils.js";
import { templates, resolutions, timezones, locales } from "../icons.js";

function freeProxies() {
  const usedProxyIds = new Set(state.profiles.map((profile) => profile.proxy_id).filter(Boolean));
  return state.proxies.filter((proxy) => !usedProxyIds.has(proxy.id));
}

export function renderProfileAdvancedFields(template) {
  const selectedResolution = `${template.width}x${template.height}`;
  return `
    <div class="metric stack">
      <div class="grid-3">
        <div>
          <label class="label">Resolucion</label>
          <select class="select" name="resolution">
            ${resolutions.map((r) => `<option value="${attr(r)}" ${r.startsWith(selectedResolution) ? "selected" : ""}>${esc(r)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Timezone</label>
          <select class="select" name="timezone">
            ${timezones.map((t) => `<option value="${attr(t)}" ${t === template.timezone ? "selected" : ""}>${esc(t)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="label">Idioma</label>
          <select class="select" name="locale">
            ${locales.map((l) => `<option value="${attr(l)}" ${l === template.locale ? "selected" : ""}>${esc(l)}</option>`).join("")}
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
  const selectedTemplate = templates.find((template) => template.id === ui.profileTemplateId) || templates[0];
  const engineDefault = selectedTemplate.browser.includes("Firefox")
    ? "Firefox / Camoufox (indetectable)"
    : "Chromium (compatibilidad)";
  const availableProxies = freeProxies();
  const proxyNote = state.proxies.length
    ? "Aparecen todos los proxies libres. El test real es recomendado, pero no obligatorio."
    : "Aun no hay proxies cargados. Puedes crear el perfil sin proxy y asignarlo despues.";

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
              ${templates
                .map((t) => `<option value="${attr(t.id)}" ${t.id === selectedTemplate.id ? "selected" : ""}>${esc(t.label)}</option>`)
                .join("")}
            </select>
          </div>
          <div>
            <label class="label">Proxy libre</label>
            <select class="select mono" name="proxy_id">
              <option value="">Sin proxy</option>
              ${availableProxies
                .map((p) => `<option value="${attr(p.id)}">${esc(p.label || `${p.scheme}://${p.host}:${p.port}`)} · ${p.healthy ? `${p.latency_ms ?? "?"}ms` : !p.last_error || p.last_error === "sin test" ? "sin test" : "test fallido"}</option>`)
                .join("")}
            </select>
            <div class="small-note">${esc(proxyNote)}</div>
          </div>
          <div>
            <label class="label">Privacidad</label>
            ${radioSegments("privacy", ["none", "standard", "hardened", "anonymous"], "standard", 4)}
            <div class="small-note" id="privacy-subtitle">tracker-block · strip-utm · no-clienthints · DoH</div>
          </div>
          <div>
            <label class="label">Motor</label>
            ${radioSegments("engine", ["Firefox / Camoufox (indetectable)", "Chromium (compatibilidad)"], engineDefault, 2)}
            <div class="small-note" id="engine-subtitle">identidad ${engineDefault.startsWith("Firefox") ? "Firefox / Camoufox" : "Chromium"} aplicada a la sesion aislada del perfil</div>
          </div>
          <div>
            <label class="label">Modo</label>
            ${radioSegments("mode", ["normal", "compatibilidad"], "normal", 2)}
            <div class="small-note" id="mode-subtitle">spoofs agresivos ON · maximo anti-fingerprint · captchas duros pueden fallar</div>
          </div>
          <button class="btn btn-ghost" type="button" data-action="toggle-profile-advanced">
            ${ui.profileAdvanced ? "ocultar" : "mostrar"} avanzado
          </button>
          <div id="profileAdvancedFields" ${ui.profileAdvanced ? "" : "hidden"}>
            ${renderProfileAdvancedFields(selectedTemplate)}
          </div>
        </div>
        <div class="modal-foot between">
          <button class="btn btn-ghost" type="button" data-action="close-modal">cancelar</button>
          <button class="btn btn-primary" type="submit">crear perfil</button>
        </div>
      </form>
    </div>
  `;
}
