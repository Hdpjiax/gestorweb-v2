import { esc } from "../helpers.js";

export function renderInspectorMacrosTab(profile) {
  const macros = profile.macros || [];

  return `
    <div class="section stack">
      <div class="between"><span class="small-note">${macros.length} macros</span><button class="btn btn-primary" data-action="add-macro" data-id="${profile.id}">nueva</button></div>
      <button class="btn btn-ghost" data-action="warmup" data-id="${profile.id}">warmup / navegacion humanizada</button>
      ${macros.length ? macros.map((macro) => `
        <div class="metric between">
          <div><strong>${esc(macro.name)}</strong><div class="small-note">${macro.steps.length} pasos</div></div>
          <button class="btn btn-ghost" data-action="run-macro" data-id="${profile.id}" data-macro="${macro.id}">ejecutar</button>
        </div>
      `).join("") : `<div class="small-note">Sin macros. Puedes crear un JSON o generar un warmup.</div>`}
    </div>
  `;
}
