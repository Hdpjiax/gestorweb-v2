import { esc } from "../helpers.js";
import { state, ui } from "../state.js";

export function renderNetworkView() {
  if (!state.liveIds.length) {
    return `
      <div class="empty">
        <div>
          <div class="empty-title">Sin perfiles activos</div>
          <div>Abre un perfil para capturar trafico</div>
        </div>
      </div>
    `;
  }

  return `
    <section class="section stack">
      <form id="repeaterForm" class="metric stack">
        <div class="grid-3">
          <select class="select" name="method">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input class="input" name="url" placeholder="https://api.ejemplo.com" />
          <button class="btn btn-primary" type="submit">enviar</button>
        </div>
        <textarea class="textarea mono" name="headers" placeholder="Headers (key: value)"></textarea>
        <textarea class="textarea mono" name="body"    placeholder="Body"></textarea>
      </form>
      <div class="metric">
        <div class="label">Response</div>
        <pre class="mono small-note">${esc(ui.repeaterOutput || "...")}</pre>
      </div>
      <div class="stack-sm">
        ${state.netEntries.map((n) => `
          <div class="metric between">
            <span class="mono">${esc(n.method)} ${esc(n.url)}</span>
            <span class="pill ${n.status < 400 ? "live" : "danger"}">${n.status}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}
