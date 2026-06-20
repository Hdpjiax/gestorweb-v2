/**
 * DEPRECATED — Este archivo sera eliminado.
 *
 * Todo el codigo de renderizado ha sido migrado a:
 *   src/renderer/views/index.js  (barrel con 32 exports)
 *
 * Usa:
 *   import { renderShell, renderView, ... } from "./views/index.js";
 *
 * Este archivo existe solo como fallback temporal.
 * No agregar codigo nuevo aqui.
 */

import { esc, attr } from "./helpers.js";
import { state, ui, liveSet } from "./state.js";
import { ICONS, navItems, titles, quickLinks, privacyFlags, templates, timezones, locales, resolutions } from "./icons.js";
import { profileById, proxyById, filteredProfiles, normalizeUrl, safeHost, firefoxUserAgent, radioSegments, statCard, lastSevenDays, topProfilesHtml, pLabel, activeWebview } from "./utils.js";
import { buildChecks, privacyScore, presetValues, city } from "./fingerprint.js";

export { renderShell, renderShellFrame } from "./views/shell-view.js";
export { renderSidebar }                 from "./views/sidebar-view.js";
export { renderTopbar }                  from "./views/topbar-view.js";
export { renderView }                    from "./views/view-router.js";
export { renderProfileViewWithRow }      from "./views/profile-view.js";
export { renderProfileRow, toggleButton } from "./views/profile-row-view.js";
export { renderInspectorView }           from "./views/inspector-view.js";
export { renderInspectorActions }        from "./views/inspector-actions-view.js";
export { renderInspectorKnownTab }       from "./views/inspector-tab-router.js";
export { renderProxiesView, renderProxyRow, renderProxyBulk, renderProxyAdd } from "./views/proxies-view.js";
export { renderSchedulesView }           from "./views/schedules-view.js";
export { renderNetworkView }             from "./views/network-view.js";
export { renderHistoryView }             from "./views/history-view.js";
export { renderStatsView }               from "./views/stats-view.js";
export { renderMonitorView }             from "./views/monitor-view.js";
export { renderBrowseView }              from "./views/browse-view.js";
export { renderBrowserEmpty }            from "./views/browser-empty-view.js";
export { renderBrowserActive }           from "./views/browser-active-view.js";
export { renderSettingsView }            from "./views/settings-view.js";
export { renderNewProfileModal, renderProfileAdvancedFields } from "./views/new-profile-modal-view.js";
export { renderWelcomeModal }            from "./views/welcome-modal-view.js";
export { renderCommandPalette }          from "./views/command-palette-view.js";
export { renderCookieEditor }            from "./views/cookie-editor-view.js";
export { renderInspectorFingerprintTab } from "./views/inspector-fingerprint-tab.js";
export { renderInspectorPrivacyTab }     from "./views/inspector-privacy-tab.js";
export { renderInspectorAuthTab }        from "./views/inspector-auth-tab.js";
