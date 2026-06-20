import { esc } from "../helpers.js";
import { state } from "../state.js";
import { profileById } from "../utils.js";

export function renderHistoryView() {
  if (!state.events.length) {
    return `
      <section class="section stack">
        <div class="muted">Ultimos 0 eventos</div>
        <div class="empty"><div>sin eventos</div></div>
      </section>
    `;
  }

  return `
    <section class="section stack">
      <div class="muted">Ultimos ${state.events.length} eventos</div>
      ${state.events.map((event) => `
        <div class="metric schedule-grid">
          <div class="mono dim">${new Date(event.ts).toLocaleString()}</div>
          <div class="accent">${esc(event.kind)}</div>
          <div>${esc(profileById(event.profile_id)?.name || "-")}</div>
          <div class="mono dim">${esc(event.payload || "")}</div>
          <div></div>
          <div></div>
        </div>
      `).join("")}
    </section>
  `;
}
