import { attr, esc } from "../helpers.js";
import { quickLinks } from "../icons.js";

export function renderBrowserEmpty() {
  return `
    <div style="max-width:680px;width:100%;text-align:center">
      <h2>Navegador embebido</h2>
      <p class="muted">Abre una pestana eligiendo perfil</p>
      <button class="btn btn-primary" data-action="browser-new-tab">+ nueva pestana (Ctrl+T)</button>
      <div class="label" style="margin-top:28px">Sitios utiles</div>
      <div class="quick-grid">
        ${quickLinks.map(([label, url, tag]) => `
          <button class="quick-link" data-action="quick-open" data-url="${attr(url)}">
            <span class="pill accent">${esc(tag)}</span>
            <div style="margin-top:8px">${esc(label)}</div>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
