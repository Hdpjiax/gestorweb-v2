import { esc } from "../helpers.js";
import { state } from "../state.js";

export function renderSettingsView() {
  const native = window.api || null;

  return `
    <section class="section stack">
      <div class="metric stack">
        <h3>Ajustes</h3>
        <div class="grid-3">
          <div><label class="label">Tema</label><input class="input" value="midnight" readonly /></div>
          <div><label class="label">Electron</label><span class="pill ${native ? "live" : "warn"}">${native ? "nativo" : "browser"}</span></div>
          <div><label class="label">Tor</label><span class="pill ${state.settings.torReady ? "live" : "warn"}">${state.settings.torReady ? "detectado" : "no detectado"}</span></div>
        </div>
        <div class="flex">
          <button class="btn btn-ghost" data-action="toggle-chromium">marcar Chromium</button>
          <button class="btn btn-ghost" data-action="toggle-tor">detectar Tor</button>
          <button class="btn btn-ghost" data-action="open-data-dir">abrir datos</button>
          <button class="btn btn-primary" data-action="export-vault">exportar vault</button>
          <button class="btn btn-ghost" data-action="import-vault">importar vault</button>
          <button class="btn btn-ghost btn-danger" data-action="reset-data">reset data</button>
        </div>
        <div class="small-note mono">Token vault: ${esc(state.settings.vaultToken)}</div>
      </div>
      <div class="metric small-note">Modo Electron: persistencia local, webview por perfil, particiones separadas y controles nativos disponibles.</div>
    </section>
  `;
}
