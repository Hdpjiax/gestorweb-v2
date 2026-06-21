import { esc, attr } from "../helpers.js";
import { state, liveSet, ui } from "../state.js";
import { ICONS } from "../icons.js";
import { proxyById } from "../utils.js";

export function toggleButton(profile, key, icon, label) {
  return `<button
    class="toggle-btn ${profile[key] ? "on" : ""}"
    data-action="toggle-profile-flag"
    data-id="${profile.id}"
    data-key="${key}"
    title="${label}"
  >${icon}<span class="toggle-label">${label}</span><span class="toggle-state">${profile[key] ? "on" : "off"}</span></button>`;
}

export function renderProfileRow(p) {
  const isLive = liveSet().has(p.id);
  const proxy  = p.proxy_id ? proxyById(p.proxy_id) : null;
  const fp     = p.fingerprint || {};
  const isMobile = /Mobile|Android|iPhone/i.test(fp.userAgent || "");

  return `
    <div class="row-grid ${state.selectedId === p.id ? "selected" : ""}" data-action="select-profile" data-id="${p.id}">
      <input type="checkbox" aria-label="seleccionar perfil" />
      <div class="profile-mini-preview ${isLive ? "is-live" : ""}">
        ${isLive
          ? `<img data-profile-preview="${attr(p.id)}" ${ui.profilePreviews[p.id] ? `src="${attr(ui.profilePreviews[p.id])}"` : ""} alt="Vista en vivo de ${attr(p.name)}" />`
          : `<span class="pill ${isMobile ? "accent" : "dim"}">${isMobile ? "MOB" : "WEB"}</span>`
        }
      </div>
      <div>
        <div class="between">
          <strong>${esc(p.name)}</strong>
          ${p.group_tag ? `<span class="pill accent">${esc(p.group_tag)}</span>` : ""}
        </div>
        <div class="small-note mono">${esc(p.url || "sin URL")}</div>
      </div>
      <div>
        ${isLive
          ? `<span class="pill live"><span class="dot"></span>en vivo</span>`
          : `<span class="pill dim">inactivo</span>`
        }
      </div>
      <div class="small-note mono">
        ${p.tor_mode
          ? "tor -> 127.0.0.1:9050"
          : proxy
          ? `${esc(proxy.scheme)}://${esc(proxy.host)}:${esc(proxy.port)}`
          : "sin proxy"
        }
      </div>
      <div>
        <div class="progress"><span style="width:${p.warmup || 0}%"></span></div>
        <div class="small-note">${p.warmup || 0}%</div>
      </div>
      <div class="flex right gap-1">
        <button class="icon-btn-sm" title="Editor de cookies" data-action="open-cookies"   data-id="${p.id}">${ICONS.cookie}</button>
        <button class="icon-btn-sm" title="Clonar perfil"      data-action="clone-profile"  data-id="${p.id}">${ICONS.clone}</button>
        <button class="icon-btn-sm" title="Abrir ruta"         data-action="open-profile-path" data-id="${p.id}">${ICONS.folder}</button>
        <button class="icon-btn-sm danger" title="Eliminar"    data-action="delete-profile" data-id="${p.id}">${ICONS.trash}</button>
        <button class="btn btn-ghost" data-action="${isLive ? "close-profile" : "open-profile"}" data-id="${p.id}">
          ${isLive ? ICONS.stop : ICONS.play}
        </button>
      </div>
    </div>
  `;
}
