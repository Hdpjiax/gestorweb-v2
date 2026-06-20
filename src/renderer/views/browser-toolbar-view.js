import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";

export function renderBrowserToolbar(activeTab) {
  return `
    <div class="browser-toolbar">
      <button class="btn btn-ghost" data-action="browser-back">atras</button>
      <button class="btn btn-ghost" data-action="browser-reload">recargar</button>
      <select id="browserProfile" class="select" style="max-width:220px">
        <option value="">elige perfil...</option>
        ${state.profiles.map((profile) => `<option value="${attr(profile.id)}" ${ui.browserProfileId === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}
      </select>
      <input id="browserUrl" class="input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || activeTab?.url || "")}" />
      <button class="btn btn-primary" data-action="browser-go">ir</button>
      <span class="pill accent">TOR</span>
    </div>
  `;
}
