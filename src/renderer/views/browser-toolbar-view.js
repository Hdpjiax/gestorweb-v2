import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";
import { ICONS } from "../icons.js";

const CLEAN_ICONS = {
  devtools: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/><path d="M14 4l-4 16"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M5 17h14"/><path d="M9 3h6l1 7 3 3v4H5v-4l3-3 1-7z"/></svg>`,
  mute: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>`,
  refreshAll: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>`
};

function activeProfileName() {
  return state.profiles.find((profile) => profile.id === ui.browserProfileId)?.name || "elige perfil";
}

function renderProfilePicker() {
  if (ui.browserProfileId) return "";
  return `
    <div class="clean-profile-picker">
      <div class="clean-profile-search">${ICONS.search}<span>elige perfil...</span></div>
      <div class="clean-profile-list">
        ${state.profiles.map((profile) => `<button class="clean-profile-option" data-action="select-browser-profile" data-id="${attr(profile.id)}">${esc(profile.name)}</button>`).join("")}
      </div>
    </div>
  `;
}

export function renderBrowserToolbar(activeTab) {
  const hasProfile = !!ui.browserProfileId;
  const profileName = activeProfileName();
  return `
    <div class="clean-browser-toolbar">
      ${renderProfilePicker()}
      <select id="browserProfile" class="clean-profile-native" aria-label="Perfil">
        <option value="">elige perfil...</option>
        ${state.profiles.map((profile) => `<option value="${attr(profile.id)}" ${ui.browserProfileId === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}
      </select>
      <div class="clean-url-bar ${hasProfile ? "" : "is-locked"}">
        <span class="clean-url-status">${hasProfile ? ICONS.lock : ICONS.warning}</span>
        <input id="browserUrl" class="clean-url-input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || activeTab?.url || "")}" ${hasProfile ? "" : "disabled"} />
      </div>
      <button class="clean-browser-btn clean-go" data-action="browser-go" title="Ir" ${hasProfile ? "" : "disabled"}>ir</button>
      <button class="clean-browser-btn" data-action="browser-toggle-muted" title="Silenciar pestana">${CLEAN_ICONS.mute}</button>
      <button class="clean-browser-btn" data-action="browser-open-devtools" title="Devtools">${CLEAN_ICONS.devtools}</button>
      <button class="clean-browser-btn" data-action="browser-pin-tab" title="Pinear tab">${CLEAN_ICONS.pin}</button>
      <button class="clean-browser-btn" data-action="browser-refresh-all" title="Recargar todas las pestanas">${CLEAN_ICONS.refreshAll}</button>
      <div class="clean-profile-name" title="Perfil activo">${esc(profileName)}</div>
    </div>
  `;
}
