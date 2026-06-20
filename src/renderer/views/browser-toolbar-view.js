import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";
import { ICONS } from "../icons.js";

const BROWSER_ICONS = {
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/><path d="M14 4l-4 16"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M5 17h14"/><path d="M9 3h6l1 7 3 3v4H5v-4l3-3 1-7z"/></svg>`,
  volume: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>`,
  refreshAll: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>`
};

function selectedProfileName() {
  return state.profiles.find((profile) => profile.id === ui.browserProfileId)?.name || "elige perfil...";
}

function renderProfilePopover() {
  if (ui.browserProfileId) return "";
  return `
    <div class="browser-profile-popover browser-profile-floating">
      <div class="browser-profile-search">${ICONS.search} <span>elige perfil...</span></div>
      <div class="browser-profile-list">
        ${state.profiles.map((profile) => `<button class="browser-profile-option" data-action="select-browser-profile" data-id="${attr(profile.id)}">${esc(profile.name)}</button>`).join("")}
      </div>
    </div>
  `;
}

export function renderBrowserToolbar(activeTab) {
  const hasProfile = !!ui.browserProfileId;
  const profileName = selectedProfileName();
  return `
    <div class="browser-toolbar browser-toolbar-reference browser-toolbar-clean">
      ${renderProfilePopover()}
      <select id="browserProfile" class="browser-profile-native" aria-label="Perfil">
        <option value="">elige perfil...</option>
        ${state.profiles.map((profile) => `<option value="${attr(profile.id)}" ${ui.browserProfileId === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}
      </select>
      <div class="browser-url-box ${hasProfile ? "" : "locked"}">
        <span class="browser-url-lock">${hasProfile ? ICONS.lock : ICONS.warning}</span>
        <input id="browserUrl" class="browser-url-input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || activeTab?.url || "")}" ${hasProfile ? "" : "disabled"} />
      </div>
      <button class="browser-chrome-btn browser-go-icon" data-action="browser-go" title="Ir" ${hasProfile ? "" : "disabled"}>${ICONS.search}</button>
      <button class="browser-chrome-btn" data-action="browser-toggle-muted" title="Silenciar pestana">${BROWSER_ICONS.volume}</button>
      <button class="browser-chrome-btn" data-action="browser-open-devtools" title="Devtools">${BROWSER_ICONS.code}</button>
      <button class="browser-chrome-btn" data-action="browser-pin-tab" title="Pinear tab">${BROWSER_ICONS.pin}</button>
      <button class="browser-chrome-btn" data-action="browser-refresh-all" title="Recargar todas las pestanas">${BROWSER_ICONS.refreshAll}</button>
      <button class="browser-profile-badge browser-profile-name" title="Perfil activo">${hasProfile ? esc(profileName) : "elige perfil"}</button>
    </div>
  `;
}
