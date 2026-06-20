import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";
import { navItems } from "../icons.js";

export function renderCommandPalette() {
  const query = (ui.commandQuery || "").toLowerCase();

  const commands = [
    ...navItems.map(([id, , label]) => ({ group: "Navegacion", label, run: `view:${id}`, hint: id })),
    { group: "Accion", label: "Crear nuevo perfil", run: "new-profile", hint: "Ctrl+N" },
    ...state.profiles.map((p) => ({
      group: "Perfil",
      label: `Abrir ${p.name}`,
      run:   `open:${p.id}`,
      hint:  state.liveIds.includes(p.id) ? "en vivo" : "inactivo",
    })),
  ].filter((c) => c.label.toLowerCase().includes(query));

  return `
    <div class="modal-backdrop">
      <div class="palette">
        <input
          id="commandInput"
          class="input"
          style="border:0;border-radius:0;padding:18px"
          placeholder="buscar comando o perfil..."
          value="${attr(ui.commandQuery || "")}"
        />
        ${commands.slice(0, 12).map((c) => `
          <button class="palette-row" data-action="run-command" data-run="${attr(c.run)}">
            <span class="dim">${esc(c.group)}</span>
            <span>${esc(c.label)}</span>
            <span class="mono dim">${esc(c.hint)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}
