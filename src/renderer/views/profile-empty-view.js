import { state } from "../state.js";

export function renderProfileEmptyState() {
  const title = state.profiles.length ? "Nada coincide" : "Sin perfiles todavia";
  const message = state.profiles.length ? "Limpia el filtro con Esc" : "Pulsa + nuevo perfil o Ctrl+N";

  return `
    <div class="empty">
      <div>
        <div class="empty-title">${title}</div>
        <div>${message}</div>
      </div>
    </div>
  `;
}
