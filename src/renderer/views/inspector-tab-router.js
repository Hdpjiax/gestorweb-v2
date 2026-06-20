import { ui } from "../state.js";
import { renderInspectorNotesTab } from "./inspector-notes-tab.js";
import { renderInspectorLogsTab } from "./inspector-logs-tab.js";
import { renderInspectorMacrosTab } from "./inspector-macros-tab.js";

export function renderInspectorKnownTab(profile, fallback) {
  if (ui.inspectorTab === "notes") return renderInspectorNotesTab(profile);
  if (ui.inspectorTab === "logs") return renderInspectorLogsTab(profile);
  if (ui.inspectorTab === "macros") return renderInspectorMacrosTab(profile);
  return fallback(profile);
}
