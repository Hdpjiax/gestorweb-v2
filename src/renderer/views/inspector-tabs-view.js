import { ui } from "../state.js";
import { ICONS } from "../icons.js";

export const inspectorTabs = [
  ["fp", ICONS.fingerprint, "Fingerprint"],
  ["privacy", ICONS.shield, "Privacy"],
  ["auth", ICONS.key, "Auth"],
  ["notes", ICONS.database, "Notas"],
  ["logs", ICONS.activity, "Logs"],
  ["macros", ICONS.play, "Macros"]
];

export function renderInspectorTabs() {
  return `
    <div class="tabs">
      ${inspectorTabs.map(([id, icon, label]) => `
        <button class="tab ${ui.inspectorTab === id ? "active" : ""}" data-action="set-inspector-tab" data-tab="${id}">${icon}<span>${label}</span></button>
      `).join("")}
    </div>
  `;
}
