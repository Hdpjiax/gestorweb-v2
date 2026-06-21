import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";
import { titles } from "../icons.js";
import { filteredProfiles, profileById, proxyById } from "../utils.js";

function totalForCurrentView() {
  if (state.view === "proxies") return state.proxies.length;
  if (state.view === "live") return state.liveIds.length;
  if (state.view === "all") return filteredProfiles().length;
  return state.profiles.length;
}

function renderProfileFilters() {
  const profileChrome = state.view === "all" || state.view === "live";
  if (!profileChrome) return "";

  const groups = [...new Set(state.profiles.map((profile) => profile.group_tag).filter(Boolean))];
  const groupFilter = groups.length ? `
    <select id="groupFilter" class="select" style="width: 160px">
      <option value="">Todos los grupos</option>
      ${groups.map((group) => `<option value="${attr(group)}" ${state.filters.group === group ? "selected" : ""}>${esc(group)}</option>`).join("")}
    </select>
  ` : "";

  return `
    <input id="searchInput" class="input" style="width: 260px" placeholder="buscar  (/ Ctrl+K)" value="${attr(state.filters.search)}" />
    ${groupFilter}
    <select id="proxyFilter" class="select" style="width: 150px">
      <option value="all" ${state.filters.proxyState === "all" ? "selected" : ""}>Cualquier proxy</option>
      <option value="with" ${state.filters.proxyState === "with" ? "selected" : ""}>Con proxy</option>
      <option value="without" ${state.filters.proxyState === "without" ? "selected" : ""}>Sin proxy</option>
    </select>
  `;
}

function activeBrowserProfile() {
  const activeTab = state.browserTabs.find((tab) => tab.id === state.activeTabId);
  return profileById(activeTab?.profileId || ui.browserProfileId || state.selectedId);
}

function renderBrowserIpPill() {
  if (state.view !== "browse") return `<span class="pill dim">IP</span>`;
  const profile = activeBrowserProfile();
  if (!profile) return `<span class="pill warn">IP: elige perfil</span>`;
  const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;
  const route = profile.tor_mode ? "TOR" : proxy ? `${proxy.scheme || "proxy"}` : "directo";
  const ip = ui.browserIpProfileId === profile.id && ui.browserIp ? ui.browserIp : ui.browserIpStatus || "pendiente";
  return `<span class="pill browser-ip-pill" title="Perfil activo: ${attr(profile.name)} · ruta: ${attr(route)}"><span class="dot"></span>IP: ${esc(ip)}</span>`;
}

export function renderTopbar() {
  const [crumb, title] = titles[state.view] || titles.all;

  return `
    <header class="topbar ${state.view === "browse" ? "topbar-browser" : ""}">
      <div>
        <div class="crumb"><span>${esc(crumb)}</span> / <strong>${esc(title)}</strong></div>
        <div class="total">${totalForCurrentView()} total</div>
      </div>
      <div class="top-actions">
        ${renderProfileFilters()}
        <button class="btn btn-primary" data-action="new-profile">+ nuevo perfil</button>
      </div>
    </header>
  `;
}
