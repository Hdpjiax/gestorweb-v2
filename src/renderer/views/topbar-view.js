import { attr, esc } from "../helpers.js";
import { state } from "../state.js";
import { titles } from "../icons.js";
import { filteredProfiles } from "../utils.js";

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

export function renderTopbar() {
  const [crumb, title] = titles[state.view] || titles.all;

  return `
    <header class="topbar">
      <div>
        <div class="crumb"><span>${esc(crumb)}</span> / <strong>${esc(title)}</strong></div>
        <div class="total">${totalForCurrentView()} total</div>
      </div>
      <div class="top-actions">
        ${renderProfileFilters()}
        <span class="pill dim">v1.3.0</span>
        <span class="pill accent">${esc(state.license.shortId)}</span>
        <span class="pill live"><span class="dot"></span>modo ahorro activo</span>
        <button class="btn btn-primary" data-action="new-profile">+ nuevo perfil</button>
      </div>
    </header>
  `;
}
