import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";
import { ICONS } from "../icons.js";

const BROWSER_ICONS = {
  back: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
  forward: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/><path d="M14 4l-4 16"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M5 17h14"/><path d="M9 3h6l1 7 3 3v4H5v-4l3-3 1-7z"/></svg>`,
  volume: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>`
};

function selectedProfileName() {
  return state.profiles.find((profile) => profile.id === ui.browserProfileId)?.name || "elige perfil...";
}

function renderProfileOverlay() {
  if (ui.browserProfileId) return "";
  return `
    <div class="browser-profile-popover">
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
    <div class="browser-toolbar browser-toolbar-reference">
      <button class="browser-chrome-btn" data-action="browser-back" title="Atras">${BROWSER_ICONS.back}</button>
      <button class="browser-chrome-btn" data-action="browser-forward" title="Adelante">${BROWSER_ICONS.forward}</button>
      <button class="browser-chrome-btn" data-action="browser-reload" title="Recargar">${ICONS.refresh}</button>
      <div class="browser-profile-holder">
        <button class="browser-profile-chip ${hasProfile ? "" : "needs-profile"}" data-action="browser-profile-menu" title="Elegir perfil">
          <span class="profile-chip-label">${esc(profileName)}</span>
        </button>
        ${renderProfileOverlay()}
      </div>
      <select id="browserProfile" class="browser-profile-native" aria-label="Perfil">
        <option value="">elige perfil...</option>
        ${state.profiles.map((profile) => `<option value="${attr(profile.id)}" ${ui.browserProfileId === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}
      </select>
      <div class="browser-url-box ${hasProfile ? "" : "locked"}">
        <span class="browser-url-lock">${hasProfile ? ICONS.lock : ICONS.warning}</span>
        <input id="browserUrl" class="browser-url-input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || activeTab?.url || "")}" ${hasProfile ? "" : "disabled"} />
      </div>
      <button class="browser-chrome-btn browser-go-icon" data-action="browser-go" title="Buscar o abrir" ${hasProfile ? "" : "disabled"}>${ICONS.search}</button>
      <button class="browser-chrome-btn" title="Codigo">${BROWSER_ICONS.code}</button>
      <button class="browser-chrome-btn" title="Fijar">${BROWSER_ICONS.pin}</button>
      <button class="browser-chrome-btn" title="Sonido">${BROWSER_ICONS.volume}</button>
      <button class="browser-chrome-btn" data-action="browser-reload" title="Recargar">${ICONS.refresh}</button>
      <button class="browser-profile-badge" title="Perfil activo">${hasProfile ? esc(profileName.slice(0, 2)) : "--"}</button>
    </div>
  `;
}
