import { ui } from "../state.js";
import { renderInspectorNotesTab }        from "./inspector-notes-tab.js";
import { renderInspectorLogsTab }         from "./inspector-logs-tab.js";
import { renderInspectorMacrosTab }       from "./inspector-macros-tab.js";
import { renderInspectorFingerprintTab }  from "./inspector-fingerprint-tab.js";
import { renderInspectorPrivacyTab }      from "./inspector-privacy-tab.js";
import { renderInspectorAuthTab }         from "./inspector-auth-tab.js";

// Tab IDs must match data-tab values in inspector-tabs-view.js:
// "fp", "privacy", "auth", "notes", "logs", "macros"
export function renderInspectorKnownTab(profile, fallback) {
  if (ui.inspectorTab === "fp")      return renderInspectorFingerprintTab(profile);
  if (ui.inspectorTab === "privacy") return renderInspectorPrivacyTab(profile);
  if (ui.inspectorTab === "auth")    return renderInspectorAuthTab(profile);
  if (ui.inspectorTab === "notes")   return renderInspectorNotesTab(profile);
  if (ui.inspectorTab === "logs")    return renderInspectorLogsTab(profile);
  if (ui.inspectorTab === "macros")  return renderInspectorMacrosTab(profile);
  return fallback ? fallback(profile) : renderInspectorFingerprintTab(profile);
}
