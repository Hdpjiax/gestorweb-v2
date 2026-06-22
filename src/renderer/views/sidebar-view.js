import { attr } from "../helpers.js";
import { state } from "../state.js";
import { ICONS, navItems } from "../icons.js";

function isLicenseAdmin() {
  const features = Array.isArray(state.license?.features) ? state.license.features : [];
  return !!state.license?.active && (state.license.tier === "admin" || features.includes("admin"));
}

export function renderSidebar() {
  const free = state.proxies.filter((proxy) => !proxy.in_use && proxy.healthy).length;
  const savings = state.profiles.length
    ? Math.round(((state.profiles.length - state.liveIds.length) / state.profiles.length) * 100)
    : 0;

  return `
    <aside class="sidebar">
      <button class="nav-btn create-btn" title="Crear nuevo perfil (Ctrl+N)" data-action="new-profile">${ICONS.plus}</button>
      ${navItems.map(([id, key, label]) => `
        <button class="nav-btn ${state.view === id ? "active" : ""}" title="${attr(label)}" data-action="set-view" data-view="${id}">${ICONS[key] || key}</button>
      `).join("")}
      ${isLicenseAdmin() ? `<button class="nav-btn ${state.view === "admin" ? "active" : ""}" title="Licencias admin" data-action="set-view" data-view="admin">${ICONS.shield}</button>` : ""}
      <div class="sidebar-foot">
        <div title="${free} proxies libres"><div class="mono muted">${free}</div><div>libres</div></div>
        <div title="${savings}% perfiles en reposo"><div class="mono live">-${savings}%</div><div>ahorro</div></div>
        <button class="icon-btn" title="Paleta (Ctrl+K)" data-action="open-command">${ICONS.search}</button>
      </div>
    </aside>
  `;
}
