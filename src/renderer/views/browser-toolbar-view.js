import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";

export function renderBrowserToolbar(activeTab) {
  const hasProfile = !!ui.browserProfileId;
  return `
    <div class="browser-toolbar browser-toolbar-reference">
      <button class="browser-chrome-btn" data-action="browser-back" title="Atras">‹</button>
      <button class="browser-chrome-btn" data-action="browser-forward" title="Adelante">›</button>
      <button class="browser-chrome-btn" data-action="browser-reload" title="Recargar">↻</button>
      <button class="browser-profile-chip ${hasProfile ? "" : "needs-profile"}" data-action="browser-profile-menu" title="Elegir perfil">
        <span class="profile-chip-label">${hasProfile ? esc(state.profiles.find((profile) => profile.id === ui.browserProfileId)?.name || "perfil") : "elige perfil..."}</span>
      </button>
      <select id="browserProfile" class="browser-profile-native" aria-label="Perfil">
        <option value="">elige perfil...</option>
        ${state.profiles.map((profile) => `<option value="${attr(profile.id)}" ${ui.browserProfileId === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}
      </select>
      <div class="browser-url-box ${hasProfile ? "" : "locked"}">
        <span class="browser-url-lock">${hasProfile ? "▣" : "⚠"}</span>
        <input id="browserUrl" class="browser-url-input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || activeTab?.url || "")}" ${hasProfile ? "" : "disabled"} />
      </div>
      <button class="browser-go-btn" data-action="browser-go" ${hasProfile ? "" : "disabled"}>ir</button>
      <button class="browser-chrome-btn" title="buscar">⌕</button>
      <button class="browser-chrome-btn" title="devtools">&lt;/&gt;</button>
      <button class="browser-chrome-btn" title="pin">♙</button>
      <button class="browser-chrome-btn" title="sonido">◔</button>
      <button class="browser-chrome-btn" data-action="browser-reload" title="recargar">↻</button>
      <button class="browser-profile-badge" title="perfil activo">${hasProfile ? esc((state.profiles.find((profile) => profile.id === ui.browserProfileId)?.name || "p").slice(0, 2)) : "--"}</button>
      <button class="browser-chrome-btn" title="codigo">&lt;/&gt;</button>
    </div>
  `;
}
