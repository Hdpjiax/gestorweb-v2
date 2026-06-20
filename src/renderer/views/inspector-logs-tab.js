import { esc } from "../helpers.js";
import { state } from "../state.js";

export function renderInspectorLogsTab(profile) {
  const logs = state.events.filter((event) => event.profile_id === profile.id).slice(0, 40);
  if (!logs.length) return `<div class="section stack-sm mono small-note">sin actividad</div>`;

  return `
    <div class="section stack-sm mono small-note">
      ${logs.map((event) => `<div>[${new Date(event.ts).toLocaleTimeString()}] ${esc(event.kind)} ${esc(event.payload)}</div>`).join("")}
    </div>
  `;
}
