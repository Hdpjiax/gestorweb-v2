import { state } from "../state.js";
import { renderBrowseView }    from "./browse-view.js";
import { renderProfileViewWithRow } from "./profile-view.js";
import { renderProfileRow }    from "./profile-row-view.js";
import { renderProxiesView }   from "./proxies-view.js";
import { renderSchedulesView } from "./schedules-view.js";
import { renderHistoryView }   from "./history-view.js";
import { renderStatsView }     from "./stats-view.js";
import { renderSettingsView }  from "./settings-view.js";
import { renderMonitorView }   from "./monitor-view.js";
import { renderNetworkView }   from "./network-view.js";
import { renderAdminLicensesView } from "./admin-licenses-view.js";

/**
 * Router principal de vistas.
 * Lee state.view y despacha al modulo correspondiente.
 * Sustituye a renderView() en el legado views.js.
 */
export function renderView() {
  if (state.view === "browse")                    return renderBrowseView();
  if (state.view === "all" || state.view === "live") return renderProfileViewWithRow(renderProfileRow);
  if (state.view === "proxies")                   return renderProxiesView();
  if (state.view === "schedules")                 return renderSchedulesView();
  if (state.view === "history")                   return renderHistoryView();
  if (state.view === "stats")                     return renderStatsView();
  if (state.view === "settings")                  return renderSettingsView();
  if (state.view === "monitor")                   return renderMonitorView();
  if (state.view === "network")                   return renderNetworkView();
  if (state.view === "admin")                     return renderAdminLicensesView();
  return renderProfileViewWithRow(renderProfileRow); // fallback
}
