import { attr, esc } from "../helpers.js";
import { liveSet, state } from "../state.js";
import { ICONS } from "../icons.js";
import { proxyById } from "../utils.js";

function availableProxiesFor(profile) {
  const usedByOther = new Set(
    state.profiles
      .filter((item) => item.id !== profile.id)
      .map((item) => item.proxy_id)
      .filter(Boolean)
  );
  return state.proxies.filter((proxy) => proxy.healthy && !usedByOther.has(proxy.id));
}

function proxyLabel(proxy) {
  const base = proxy.label || `${proxy.scheme}://${proxy.host}:${proxy.port}`;
  return `${base}${proxy.latency_ms != null ? ` · ${proxy.latency_ms}ms` : ""}`;
}

export function renderInspectorAuthTab(profile) {
  const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;
  const isLive = liveSet().has(profile.id);
  const availableProxies = availableProxiesFor(profile);

  return `
    <div class="section stack">
      <div>
        <label class="label">Proxy actual</label>
        <div class="between">
          <div class="input mono">${
            profile.tor_mode
              ? "tor -> 127.0.0.1:9050"
              : proxy
              ? `${esc(proxy.scheme)}://${esc(proxy.host)}:${esc(proxy.port)}`
              : "sin proxy"
          }</div>
          ${profile.tor_mode
            ? `<span class="pill accent">tor</span>`
            : proxy
            ? `<button class="btn btn-ghost" data-action="remove-proxy" data-id="${attr(profile.id)}">quitar</button>`
            : `<button class="btn btn-primary" data-action="assign-proxy" data-id="${attr(profile.id)}">auto asignar</button>`
          }
        </div>
      </div>

      ${profile.tor_mode ? "" : `
        <div class="metric stack-sm">
          <label class="label">Asignar proxy libre</label>
          <div class="between">
            <select id="proxyAssignSelect" class="select mono" data-profile-id="${attr(profile.id)}" ${availableProxies.length ? "" : "disabled"}>
              <option value="">${availableProxies.length ? "Selecciona proxy libre testeado" : "No hay proxies libres con test OK"}</option>
              ${availableProxies.map((item) => `
                <option value="${attr(item.id)}" ${item.id === profile.proxy_id ? "selected" : ""}>${esc(proxyLabel(item))}</option>
              `).join("")}
            </select>
            <button class="btn btn-primary" data-action="assign-selected-proxy" data-id="${attr(profile.id)}" ${availableProxies.length ? "" : "disabled"}>asignar</button>
          </div>
          <div class="small-note">Solo se puede usar un proxy por perfil. Si no aparece, esta asignado a otro perfil o no paso el test real.</div>
        </div>
      `}

      <button class="btn btn-ghost" data-action="open-cookies" data-id="${attr(profile.id)}" ${isLive ? "" : "disabled"}>
        ${isLive ? "editor de cookies" : "requiere abrir el perfil"}
      </button>
      <form id="totpForm" class="stack-sm" data-id="${attr(profile.id)}">
        <label class="label">2FA / TOTP</label>
        <input class="input mono" name="totp" placeholder="secret base32" value="${attr(profile.totp_secret || "")}" />
        <div class="flex">
          <button class="btn btn-primary" type="submit">guardar TOTP</button>
          ${profile.totp_secret
            ? `<button class="btn btn-ghost" type="button" data-action="copy-totp" data-id="${attr(profile.id)}">copiar codigo actual</button>`
            : ""
          }
        </div>
      </form>
    </div>
  `;
}
