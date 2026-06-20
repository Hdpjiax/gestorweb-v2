import { attr, esc } from "../helpers.js";
import { quickLinks } from "../icons.js";

export function renderBrowserEmpty() {
  return `
    <div class="browser-empty-card">
      <div class="browser-empty-icon">⌂</div>
      <h2>Navegador embebido</h2>
      <p class="muted">Selecciona un perfil y abre DuckDuckGo o una URL.</p>
      <button class="btn btn-primary browser-empty-cta" data-action="browser-new-tab">+ nueva pestana (Ctrl+T)</button>
      <div class="label browser-empty-label">Sitios utiles</div>
      <div class="quick-grid browser-quick-grid">
        ${quickLinks.map(([label, url, tag]) => `
          <button class="quick-link browser-quick-link" data-action="quick-open" data-url="${attr(url)}">
            <span>${esc(label)}</span>
            <span class="quick-tag">${esc(tag)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
