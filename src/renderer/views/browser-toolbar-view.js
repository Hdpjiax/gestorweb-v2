import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";

export function renderBrowserToolbar(activeTab) {
  const hasProfile = !!ui.browserProfileId;
  return `
    <div class="browser-toolbar browser-toolbar-pro">
      <button class="browser-nav-btn" data-action="browser-back" title="Atras">‹</button>
      <button class="browser-nav-btn" data-action="browser-reload" title="Recargar">↻</button>
      <label class="browser-profile-wrap ${hasProfile ? "" : "needs-profile"}">
        <span>Perfil</span>
        <select id="browserProfile" class="browser-profile-select">
          <option value="">Selecciona perfil...</option>
          ${state.profiles.map((profile) => `<option value="${attr(profile.id)}" ${ui.browserProfileId === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}
        </select>
      </label>
      <div class="browser-url-box ${hasProfile ? "" : "locked"}">
        <span class="browser-url-lock">${hasProfile ? "▣" : "⚠"}</span>
        <input id="browserUrl" class="browser-url-input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || activeTab?.url || "")}" ${hasProfile ? "" : "disabled"} />
      </div>
      <button class="browser-go-btn" data-action="browser-go" ${hasProfile ? "" : "disabled"}>ir</button>
      <button class="browser-tool-btn" title="inspeccion">&lt;/&gt;</button>
      <button class="browser-tool-btn" title="fijar">⌖</button>
      <button class="browser-tool-btn" title="sonido">◔</button>
      <span class="pill accent browser-tor-pill">TOR</span>
    </div>
  `;
}
