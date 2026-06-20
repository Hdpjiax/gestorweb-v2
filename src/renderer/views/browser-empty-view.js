import { attr, esc } from "../helpers.js";
import { quickLinks } from "../icons.js";
import { ui } from "../state.js";

export function renderBrowserEmpty() {
  const hasProfile = !!ui.browserProfileId;
  return `
    <div class="browser-empty-screen">
      <div class="browser-empty-panel">
        <div class="browser-empty-icon" aria-hidden="true">⌂</div>
        <h2>Navegador embebido</h2>
        <p>${hasProfile ? "Abre DuckDuckGo o una URL con el perfil elegido." : "Primero selecciona un perfil arriba para aislar la sesion."}</p>
        <button class="btn btn-primary browser-empty-cta" data-action="browser-new-tab" ${hasProfile ? "" : "disabled"}>+ nueva pestana (Ctrl+T)</button>
        <div class="browser-empty-label">Sitios utiles</div>
        <div class="browser-quick-grid">
          ${quickLinks.map(([label, url, tag]) => `
            <button class="browser-quick-link" data-action="quick-open" data-url="${attr(url)}" ${hasProfile ? "" : "disabled"}>
              <span>${esc(label)}</span>
              <span>${esc(tag)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}
