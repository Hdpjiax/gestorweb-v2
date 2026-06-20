import { filteredProfiles } from "../utils.js";
import { renderProfileEmptyState } from "./profile-empty-view.js";

export function renderProfileTable(renderRow) {
  const rows = filteredProfiles();
  if (!rows.length) return renderProfileEmptyState();

  return `
    <section class="section">
      <div class="table-head row-grid">
        <div></div>
        <div></div>
        <div>Perfil</div>
        <div>Estado</div>
        <div>Proxy</div>
        <div>Warmup</div>
        <div></div>
      </div>
      ${rows.map(renderRow).join("")}
    </section>
  `;
}
