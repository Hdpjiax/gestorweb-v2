import { attr, esc } from "../helpers.js";
import { liveSet } from "../state.js";
import { ICONS } from "../icons.js";
import { proxyById } from "../utils.js";

export function renderInspectorAuthTab(profile) {
  const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;
  const isLive = liveSet().has(profile.id);

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
            ? `<button class="btn btn-ghost" data-action="remove-proxy" data-id="${profile.id}">quitar</button>`
            : `<button class="btn btn-primary" data-action="assign-proxy" data-id="${profile.id}">asignar</button>`
          }
        </div>
      </div>
      <button class="btn btn-ghost" data-action="open-cookies" data-id="${profile.id}" ${isLive ? "" : "disabled"}>
        ${isLive ? "editor de cookies" : "requiere abrir el perfil"}
      </button>
      <form id="totpForm" class="stack-sm" data-id="${profile.id}">
        <label class="label">2FA / TOTP</label>
        <input class="input mono" name="totp" placeholder="secret base32" value="${attr(profile.totp_secret || "")}" />
        <div class="flex">
          <button class="btn btn-primary" type="submit">guardar TOTP</button>
          ${profile.totp_secret
            ? `<button class="btn btn-ghost" type="button" data-action="copy-totp" data-id="${profile.id}">copiar codigo actual</button>`
            : ""
          }
        </div>
      </form>
    </div>
  `;
}
