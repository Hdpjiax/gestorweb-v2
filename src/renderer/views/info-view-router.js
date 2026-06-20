import { renderHistoryView } from "./history-view.js";
import { renderStatsView } from "./stats-view.js";
import { renderSettingsView } from "./settings-view.js";
import { renderMonitorView } from "./monitor-view.js";

export function renderInfoView(view, fallback) {
  if (view === "history") return renderHistoryView();
  if (view === "stats") return renderStatsView();
  if (view === "settings") return renderSettingsView();
  if (view === "monitor") return renderMonitorView();
  return fallback ? fallback(view) : "";
}
