import { esc, attr } from "./helpers.js";
import { state, ui, liveSet } from "./state.js";
import { ICONS, navItems, titles, quickLinks, privacyFlags, templates, timezones, locales, resolutions } from "./icons.js";
import { profileById, proxyById, filteredProfiles, normalizeUrl, safeHost, firefoxUserAgent, radioSegments, statCard, lastSevenDays, topProfilesHtml, pLabel, activeWebview } from "./utils.js";
import { buildChecks, privacyScore, presetValues, city } from "./fingerprint.js";

export function renderShell() {
  const showInspector = state.view === "all" || state.view === "live";
  return `
    <div class="app-shell ${showInspector ? "" : "no-inspector"}">
      ${renderSidebar()}
      <div class="workspace">
        ${renderTopbar()}
        <main class="content">${renderView()}</main>
      </div>
      ${showInspector ? renderInspector() : ""}
    </div>
    ${ui.newProfile ? renderNewProfileModal() : ""}
    ${ui.welcome ? renderWelcomeModal() : ""}
    ${ui.command ? renderCommandPalette() : ""}
    ${ui.cookieProfileId ? renderCookieEditor(ui.cookieProfileId) : ""}
  `;
}

function renderSidebar() {
  const free = state.proxies.filter((p) => !p.in_use && p.healthy).length;
  const savings = state.profiles.length ? Math.round(((state.profiles.length - state.liveIds.length) / state.profiles.length) * 100) : 0;
  return `
    <aside class="sidebar">
      <button class="nav-btn create-btn" title="Crear nuevo perfil (Ctrl+N)" data-action="new-profile">${ICONS.plus}</button>
      ${navItems.map(([id, key, label]) => `<button class="nav-btn ${state.view === id ? "active" : ""}" title="${attr(label)}" data-action="set-view" data-view="${id}">${ICONS[key] || key}</button>`).join("")}
      <div class="sidebar-foot">
        <div title="${free} proxies libres"><div class="mono muted">${free}</div><div>libres</div></div>
        <div title="${savings}% perfiles en reposo"><div class="mono live">-${savings}%</div><div>ahorro</div></div>
        <button class="icon-btn" title="Paleta (Ctrl+K)" data-action="open-command">${ICONS.search}</button>
      </div>
    </aside>
  `;
}

function renderTopbar() {
  const [crumb, title] = titles[state.view] || titles.all;
  const total = state.view === "proxies" ? state.proxies.length : state.view === "live" ? state.liveIds.length : state.view === "all" ? filteredProfiles().length : state.profiles.length;
  const profileChrome = state.view === "all" || state.view === "live";
  const groups = [...new Set(state.profiles.map((p) => p.group_tag).filter(Boolean))];
  return `
    <header class="topbar">
      <div>
        <div class="crumb"><span>${esc(crumb)}</span> / <strong>${esc(title)}</strong></div>
        <div class="total">${total} total</div>
      </div>
      <div class="top-actions">
        ${profileChrome ? `
          <input id="searchInput" class="input" style="width: 260px" placeholder="buscar  (/ Ctrl+K)" value="${attr(state.filters.search)}" />
          ${groups.length ? `<select id="groupFilter" class="select" style="width: 160px"><option value="">Todos los grupos</option>${groups.map((g) => `<option value="${attr(g)}" ${state.filters.group === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>` : ""}
          <select id="proxyFilter" class="select" style="width: 150px">
            <option value="all" ${state.filters.proxyState === "all" ? "selected" : ""}>Cualquier proxy</option>
            <option value="with" ${state.filters.proxyState === "with" ? "selected" : ""}>Con proxy</option>
            <option value="without" ${state.filters.proxyState === "without" ? "selected" : ""}>Sin proxy</option>
          </select>
        ` : ""}
        <span class="pill dim">v1.3.0</span>
        <span class="pill accent">${esc(state.license.shortId)}</span>
        <span class="pill live"><span class="dot"></span>modo ahorro activo</span>
        <button class="btn btn-primary" data-action="new-profile">+ nuevo perfil</button>
      </div>
    </header>
  `;
}

function renderView() {
  if (state.view === "browse") return renderBrowseView();
  if (state.view === "all" || state.view === "live") return renderProfileView();
  if (state.view === "proxies") return renderProxiesView();
  if (state.view === "schedules") return renderSchedulesView();
  if (state.view === "history") return renderHistoryView();
  if (state.view === "stats") return renderStatsView();
  if (state.view === "settings") return renderSettingsView();
  if (state.view === "monitor") return renderMonitorView();
  if (state.view === "network") return renderNetworkView();
  return renderProfileView();
}

function renderProfileView() {
  const rows = filteredProfiles();
  if (!rows.length) {
    return `<div class="empty"><div><div class="empty-title">${state.profiles.length ? "Nada coincide" : "Sin perfiles todavia"}</div><div>${state.profiles.length ? "Limpia el filtro con Esc" : "Pulsa + nuevo perfil o Ctrl+N"}</div></div></div>`;
  }
  return `
    <section class="section">
      <div class="table-head row-grid"><div></div><div></div><div>Perfil</div><div>Estado</div><div>Proxy</div><div>Warmup</div><div></div></div>
      ${rows.map(renderProfileRow).join("")}
    </section>
  `;
}

function renderProfileRow(p) {
  const isLive = liveSet().has(p.id);
  const proxy = p.proxy_id ? proxyById(p.proxy_id) : null;
  const fp = p.fingerprint || {};
  return `
    <div class="row-grid ${state.selectedId === p.id ? "selected" : ""}" data-action="select-profile" data-id="${p.id}">
      <input type="checkbox" aria-label="seleccionar perfil" />
      <div class="pill ${/Mobile|Android|iPhone/i.test(fp.userAgent || "") ? "accent" : "dim"}">${/Mobile|Android|iPhone/i.test(fp.userAgent || "") ? "MOB" : "WEB"}</div>
      <div>
        <div class="between"><strong>${esc(p.name)}</strong>${p.group_tag ? `<span class="pill accent">${esc(p.group_tag)}</span>` : ""}</div>
        <div class="small-note mono">${esc(p.url || "sin URL")}</div>
      </div>
      <div>${isLive ? `<span class="pill live"><span class="dot"></span>en vivo</span>` : `<span class="pill dim">inactivo</span>`}</div>
      <div class="small-note mono">${p.tor_mode ? "tor -> 127.0.0.1:9050" : proxy ? `${esc(proxy.scheme)}://${esc(proxy.host)}:${esc(proxy.port)}` : "sin proxy"}</div>
      <div><div class="progress"><span style="width:${p.warmup || 0}%"></span></div><div class="small-note">${p.warmup || 0}%</div></div>
      <div class="flex right gap-1">
        <button class="icon-btn-sm" title="Editor de cookies" data-action="open-cookies" data-id="${p.id}">${ICONS.cookie}</button>
        <button class="icon-btn-sm" title="Clonar perfil" data-action="clone-profile" data-id="${p.id}">${ICONS.clone}</button>
        <button class="icon-btn-sm" title="Abrir ruta del perfil" data-action="open-profile-path" data-id="${p.id}">${ICONS.folder}</button>
        <button class="icon-btn-sm danger" title="Eliminar perfil" data-action="delete-profile" data-id="${p.id}">${ICONS.trash}</button>
        <button class="btn btn-ghost" data-action="${isLive ? "close-profile" : "open-profile"}" data-id="${p.id}">${isLive ? ICONS.stop : ICONS.play}</button>
      </div>
    </div>
  `;
}

function renderInspector() {
  const profile = profileById(state.selectedId);
  if (!profile) return `<aside class="inspector"><div class="inspector-empty"><div class="label">Inspector</div><div>Selecciona un perfil para ver y editar.</div></div></aside>`;
  const isLive = liveSet().has(profile.id);
  const fp = profile.fingerprint || {};
  const checks = buildChecks(profile, fp, isLive);
  const score = Math.round(checks.reduce((sum, c) => sum + (c.status === "ok" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / checks.length * 100);
  const tier = score >= 95 ? "AISLADO" : score >= 75 ? "ALTO" : score >= 50 ? "MEDIO" : "BAJO";
  const tabs = [
    ["fp", ICONS.fingerprint, "Fingerprint"],
    ["privacy", ICONS.shield, "Privacy"],
    ["auth", ICONS.key, "Auth"],
    ["notes", ICONS.database, "Notas"],
    ["logs", ICONS.activity, "Logs"],
    ["macros", ICONS.play, "Macros"]
  ];
  return `
    <aside class="inspector">
      <div class="inspector-head">
        <div class="between"><h2 class="title">${esc(profile.name)}</h2>${profile.group_tag ? `<span class="pill accent">${esc(profile.group_tag)}</span>` : ""}</div>
        <div class="small-note mono">${esc(profile.url || "sin URL")}</div>
        <div class="inspector-score">
          <div class="score-bar"><div class="score-fill" style="width:${score}%"></div></div>
          <div class="score-labels"><span class="${score >= 95 ? "live" : score >= 75 ? "warn" : "danger"}">${tier}</span><span class="mono">${score}%</span></div>
        </div>
      </div>
      <div class="tabs">${tabs.map(([id, icon, label]) => `<button class="tab ${ui.inspectorTab === id ? "active" : ""}" data-action="set-inspector-tab" data-tab="${id}">${icon}<span>${label}</span></button>`).join("")}</div>
      <div class="inspector-body">${renderInspectorTab(profile)}</div>
      <div class="inspector-actions">
        <div class="action-row">
          ${toggleButton(profile, "headless", ICONS.server, "headless")}
          ${toggleButton(profile, "har_enabled", ICONS.database, "HAR")}
          ${toggleButton(profile, "webrtc_block", ICONS.wifi, "anti-leak")}
          ${toggleButton(profile, "doh_enabled", ICONS.dns, "DoH")}
          ${toggleButton(profile, "force_https", ICONS.lock, "HTTPS")}
          ${toggleButton(profile, "in_memory", ICONS.cpu, "RAM")}
        </div>
        <div class="action-row">
          ${toggleButton(profile, "block_trackers", ICONS.shield, "trackers")}
          ${toggleButton(profile, "strip_tracking_params", ICONS.link, "UTM")}
          ${toggleButton(profile, "sanitize_headers", ICONS.globe, "hints")}
          ${toggleButton(profile, "strict_referer", ICONS.eye, "referer")}
          ${toggleButton(profile, "harden_all", ICONS.zap, "spoof")}
          ${toggleButton(profile, "auto_wipe_close", ICONS.refresh, "wipe")}
        </div>
        <div class="action-row">
          <button class="btn btn-primary flex" data-action="assign-proxy" data-id="${profile.id}">${ICONS.globe}<span>asignar proxy</span></button>
          <button class="btn btn-ghost flex" data-action="open-cookies" data-id="${profile.id}">${ICONS.cookie}<span>cookies</span></button>
          <button class="btn btn-ghost flex" data-action="wipe-profile" data-id="${profile.id}">${ICONS.trash}<span>wipe</span></button>
        </div>
        <div class="audit-row">
          <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="creepjs">${ICONS.bot}<span>creepjs</span></button>
          <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="sannysoft">${ICONS.lab}<span>sannysoft</span></button>
          <button class="btn btn-ghost audit-btn" data-action="open-detection" data-id="${profile.id}" data-kind="pixelscan">${ICONS.fingerprint}<span>pixelscan</span></button>
        </div>
        <div class="warning-note">${ICONS.warning} Lo que NO se puede mitigar en esta capa: TLS JA3 fingerprint, HTTP/2, behavioral biometrics y stylometry. Para anonimato real usa Tor Browser o Tails OS.</div>
      </div>
    </aside>
  `;
}

function toggleButton(profile, key, icon, label) {
  return `<button class="toggle-btn ${profile[key] ? "on" : ""}" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="${key}" title="${label}">${icon}<span class="toggle-label">${label}</span><span class="toggle-state">${profile[key] ? "on" : "off"}</span></button>`;
}

function renderInspectorTab(profile) {
  if (ui.inspectorTab === "fp") return renderFingerprintTab(profile);
  if (ui.inspectorTab === "privacy") return renderPrivacyTab(profile);
  if (ui.inspectorTab === "auth") return renderAuthTab(profile);
  if (ui.inspectorTab === "notes") return renderNotesTab(profile);
  if (ui.inspectorTab === "logs") return renderLogsTab(profile);
  if (ui.inspectorTab === "macros") return renderMacrosTab(profile);
  return renderFingerprintTab(profile);
}

function renderFingerprintTab(profile) {
  const isLive = liveSet().has(profile.id);
  const fp = profile.fingerprint || {};
  const checks = buildChecks(profile, fp, isLive);
  return `
    <div class="fp-tab">
      <div class="fp-header">
        <div class="fp-info">
          <div class="fp-item"><span class="fp-label">${ICONS.fingerprint} Canvas</span><span class="fp-value mono">${esc(fp.canvas || "unico")}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.audio} Audio</span><span class="fp-value mono">${esc(fp.audio || "unico")}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.globe} User-Agent</span><span class="fp-value mono warn">${esc(fp.userAgent?.slice(0, 60) || "sin UA")}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.cpu} WebGL</span><span class="fp-value mono">${esc(fp.webgl?.slice(0, 50) || "sin WebGL")}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.dns} Timezone</span><span class="fp-value mono">${esc(fp.timezone || "UTC")}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.shield} Resolucion</span><span class="fp-value mono">${fp.resolution?.width || 1280}x${fp.resolution?.height || 720}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.globe} Locale</span><span class="fp-value mono">${esc(fp.locale || "es-MX")}</span></div>
          <div class="fp-item"><span class="fp-label">${ICONS.cpu} Hardware</span><span class="fp-value mono">${fp.cores || 4} cores · ${fp.memoryGB || 8}GB</span></div>
        </div>
        <button class="btn btn-ghost" data-action="refresh-fingerprint" data-id="${profile.id}">${ICONS.refresh} recalcular</button>
      </div>
      <div class="check-list">${checks.map((c) => `<div class="check-row"><span class="check-icon ${c.status === "ok" ? "ok" : c.status === "warn" ? "warn" : "fail"}">${c.status === "ok" ? ICONS.check : c.status === "warn" ? ICONS.warning : ICONS.close}</span><span>${c.icon} ${esc(c.label)}</span><span class="mono ${c.status}">${esc(c.value)}</span></div>`).join("")}</div>
      <details class="raw-data"><summary>${ICONS.database} datos crudos del fingerprint</summary><pre class="small-note mono">${esc(JSON.stringify(fp, null, 2))}</pre></details>
    </div>
  `;
}

function renderPrivacyTab(profile) {
  const score = privacyScore(profile);
  const tier = score >= 90 ? "Anonymous" : score >= 70 ? "Hardened" : score >= 40 ? "Standard" : "Bajo";
  const flags = [
    [ICONS.shield, "block_trackers", "Bloquear trackers", "~80 dominios"],
    [ICONS.link, "strip_tracking_params", "Quitar UTM/fbclid/gclid", "strip-tracking"],
    [ICONS.globe, "sanitize_headers", "Limpiar client hints", "no-clienthints"],
    [ICONS.eye, "strict_referer", "No-referrer", "no-referrer header"],
    [ICONS.wifi, "webrtc_block", "Bloquear WebRTC", "anti-leak"],
    [ICONS.dns, "doh_enabled", "DNS over HTTPS", "cloudflare-dns"],
    [ICONS.lock, "force_https", "Force HTTPS", "https-only"],
    [ICONS.zap, "harden_all", "Spoof extremo", "spoof-extremo"],
    [ICONS.cpu, "in_memory", "Solo en memoria", "RAM-only"],
    [ICONS.refresh, "auto_wipe_close", "Auto-wipe al cerrar", "auto-wipe"],
    [ICONS.lock, "tor_mode", "Tor mode", "SOCKS5 127.0.0.1:9050"]
  ];
  return `
    <div class="section privacy-stack">
      <div class="privacy-header" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="gw_engine">
        ${ICONS.shield}<span>Motor Firefox / Camoufox (indetectable)</span><span class="pill ${profile.gw_engine ? "live" : "dim"}">${profile.gw_engine ? "on" : "off"}</span>
      </div>
      ${profile.gw_engine ? `<div class="callout"><strong class="live">Modo Firefox 135 activo.</strong> User-Agent, locale, pantalla, WebGL, canvas/audio y headers se aplican antes de cargar la pagina.</div>` : ""}
      ${profile.compat_mode ? `<div class="callout"><strong class="live">Modo compatibilidad activo.</strong> Spoofs agresivos desactivados para captchas, pagos y banking.</div>` : ""}
      ${profile.tor_mode ? `<div class="tor-notice">${ICONS.warning}<span>Anonymous requiere Tor en 127.0.0.1:9050. Asegurate de que TOR este corriendo.</span></div>` : ""}
      <div class="metric">
        <div class="between"><strong class="accent" style="font-size:30px">${score}</strong><span class="dim">/ 100</span><span class="pill accent">${tier}</span></div>
        <div class="progress" style="margin-top:10px"><span style="width:${score}%"></span></div>
      </div>
      <div class="label">Aplicar preset</div>
      <div class="preset-grid">${["none", "standard", "hardened", "anonymous"].map((preset) => `<button class="preset-btn ${profile.privacy_preset === preset ? "active" : ""}" data-action="apply-preset" data-id="${profile.id}" data-preset="${preset}">${preset}</button>`).join("")}</div>
      <div class="privacy-flags">${flags.map(([icon, key, label, sub]) => `
        <div class="privacy-flag ${profile[key] ? "on" : ""}" data-action="toggle-profile-flag" data-id="${profile.id}" data-key="${key}">
          <div class="flag-icon">${ICONS.check}</div>
          <span>${esc(label)}</span>
          <span class="flag-state">${profile[key] ? sub : "off"}</span>
        </div>
      `).join("")}</div>
    </div>
  `;
}

function renderAuthTab(profile) {
  const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;
  const isLive = liveSet().has(profile.id);
  return `
    <div class="section stack">
      <div><label class="label">Proxy actual</label><div class="between"><div class="input mono">${profile.tor_mode ? "tor -> 127.0.0.1:9050" : proxy ? `${esc(proxy.scheme)}://${esc(proxy.host)}:${esc(proxy.port)}` : "sin proxy"}</div>${profile.tor_mode ? `<span class="pill accent">tor</span>` : proxy ? `<button class="btn btn-ghost" data-action="remove-proxy" data-id="${profile.id}">quitar</button>` : `<button class="btn btn-primary" data-action="assign-proxy" data-id="${profile.id}">asignar</button>`}</div></div>
      <button class="btn btn-ghost" data-action="open-cookies" data-id="${profile.id}" ${isLive ? "" : "disabled"}>${isLive ? "editor de cookies" : "requiere abrir el perfil"}</button>
      <form id="totpForm" class="stack-sm" data-id="${profile.id}">
        <label class="label">2FA / TOTP</label>
        <input class="input mono" name="totp" placeholder="secret base32" value="${attr(profile.totp_secret || "")}" />
        <div class="flex"><button class="btn btn-primary" type="submit">guardar TOTP</button>${profile.totp_secret ? `<button class="btn btn-ghost" type="button" data-action="copy-totp" data-id="${profile.id}">copiar codigo actual</button>` : ""}</div>
      </form>
    </div>
  `;
}

function renderNotesTab(profile) {
  return `
    <form id="notesForm" class="section stack" data-id="${profile.id}">
      <div><label class="label">Nombre</label><input class="input" name="name" value="${attr(profile.name)}" /></div>
      <div><label class="label">URL inicial</label><input class="input" name="url" value="${attr(profile.url || "")}" /></div>
      <div><label class="label">Grupo / tag</label><input class="input" name="group_tag" value="${attr(profile.group_tag || "")}" /></div>
      <div><label class="label">Notas</label><textarea class="textarea mono" name="notes" placeholder="# Login\n- usuario: x">${esc(profile.notes || "")}</textarea></div>
      <button class="btn btn-primary" type="submit">guardar notas</button>
    </form>
  `;
}

function renderLogsTab(profile) {
  const logs = state.events.filter((e) => e.profile_id === profile.id).slice(0, 40);
  return `<div class="section stack-sm mono small-note">${logs.length ? logs.map((e) => `<div>[${new Date(e.ts).toLocaleTimeString()}] ${esc(e.kind)} ${esc(e.payload)}</div>`).join("") : "sin actividad"}</div>`;
}

function renderMacrosTab(profile) {
  const macros = profile.macros || [];
  return `
    <div class="section stack">
      <div class="between"><span class="small-note">${macros.length} macros</span><button class="btn btn-primary" data-action="add-macro" data-id="${profile.id}">nueva</button></div>
      <button class="btn btn-ghost" data-action="warmup" data-id="${profile.id}">warmup / navegacion humanizada</button>
      ${macros.length ? macros.map((m) => `<div class="metric between"><div><strong>${esc(m.name)}</strong><div class="small-note">${m.steps.length} pasos</div></div><button class="btn btn-ghost" data-action="run-macro" data-id="${profile.id}" data-macro="${m.id}">ejecutar</button></div>`).join("") : `<div class="small-note">Sin macros. Puedes crear un JSON o generar un warmup.</div>`}
    </div>
  `;
}

function renderNewProfileModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <form id="newProfileForm" class="modal-card" data-modal-card>
        <div class="modal-head between"><div><div class="title">Nuevo perfil</div><div class="subtitle">Sesion aislada con fingerprint propio</div></div><button class="icon-btn" type="button" data-action="close-modal">x</button></div>
        <div class="modal-body stack">
          <div class="grid-2"><div><label class="label">Nombre *</label><input class="input" name="name" required autofocus /></div><div><label class="label">Grupo / tag</label><input class="input" name="group_tag" /></div></div>
          <div><label class="label">URL inicial</label><input class="input" name="url" placeholder="shein.com.mx" /></div>
          <div><label class="label">Plantilla de fingerprint</label><select class="select" name="template_id"><option value="win_firefox_mx">Windows / Firefox 135 (MX)</option>${templates.filter((t) => t.id !== "win_firefox_mx").map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join("")}</select></div>
          <div><label class="label">Proxy</label><select class="select" name="proxy_id"><option value="">Sin proxy</option>${state.proxies.map((p) => `<option value="${p.id}">${esc(p.label || `${p.host}:${p.port}`)} ${p.healthy ? "+" : "-"}</option>`).join("")}</select></div>
          <div><label class="label">Privacidad</label>${radioSegments("privacy", ["none", "standard", "hardened", "anonymous"], "standard", 4)}<div class="small-note" id="privacy-subtitle">tracker-block · strip-utm · no-clienthints · DoH</div></div>
          <div><label class="label">Motor</label>${radioSegments("engine", ["Firefox / Camoufox (indetectable)", "Chromium (compatibilidad)"], "Firefox / Camoufox (indetectable)", 2)}<div class="small-note" id="engine-subtitle">spoofing a nivel de motor estilo Dolphin, maxima indetectabilidad, recomendado para pagos</div></div>
          <div><label class="label">Modo</label>${radioSegments("mode", ["normal", "compatibilidad"], "normal", 2)}<div class="small-note" id="mode-subtitle">spoofs agresivos ON · maximo anti-fingerprint · captchas duros pueden fallar</div></div>
          <button class="btn btn-ghost" type="button" data-action="toggle-profile-advanced">${ui.profileAdvanced ? "ocultar" : "mostrar"} avanzado</button>
          ${ui.profileAdvanced ? renderProfileAdvancedFields() : ""}
        </div>
        <div class="modal-foot between"><button class="btn btn-ghost" type="button" data-action="close-modal">cancelar</button><button class="btn btn-primary" type="submit">crear perfil</button></div>
      </form>
    </div>
  `;
}

function renderProfileAdvancedFields() {
  return `
    <div class="metric stack">
      <div class="grid-3">
        <div><label class="label">Resolucion</label><select class="select" name="resolution">${resolutions.map((r) => `<option value="${r}" ${r === "1920x1080" ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        <div><label class="label">Timezone</label><select class="select" name="timezone">${timezones.map((t) => `<option value="${t}" ${t === "America/Monterrey" ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div><label class="label">Idioma</label><select class="select" name="locale">${locales.map((l) => `<option value="${l}" ${l === "es-MX" ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      </div>
      <div><label class="label">2FA / TOTP secret</label><input class="input mono" name="totp_secret" /></div>
      <div class="grid-3">
        <label class="metric"><input type="checkbox" name="headless" /> headless</label>
        <label class="metric"><input type="checkbox" name="har_enabled" /> grabar HAR</label>
        <label class="metric"><input type="checkbox" name="webrtc_block" checked /> bloquear WebRTC</label>
      </div>
    </div>
  `;
}

function renderWelcomeModal() {
  const step = ui.welcomeStep || 0;
  const slides = [
    ["Que es Gestor Web", "Es un gestor de perfiles web con identidades aisladas. Cada perfil tiene su propio fingerprint, cookies, almacenamiento y proxy. Sirve para gestionar varias cuentas online sin que se correlacionen entre si."],
    ["Privacidad por perfil", "Standard: tracker block + headers limpios + DoH. Hardened: strict referer + spoof extremo + auto-wipe. Anonymous: Tor + memoria pura."],
    ["Sobre los proxies", "Si quieres cambiar la IP por perfil, agrega proxies en la seccion Proxies (Ctrl+3). Soporta SOCKS5 y HTTP/HTTPS con autenticacion."],
    ["Cosas que debes saber", "DevTools puede estar bloqueado en produccion. Atajos: Ctrl+N nuevo perfil · Ctrl+K paleta · Ctrl+0 navegador · Ctrl+1-9 vistas."]
  ];
  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-head between"><div class="title">Bienvenido a Gestor Web</div><button class="icon-btn" data-action="close-welcome">x</button></div>
        <div class="modal-body stack"><h2>${esc(slides[step][0])}</h2><p class="muted" style="line-height:1.7">${esc(slides[step][1])}</p><div class="flex">${slides.map((_, i) => `<span class="dot" style="background:${i === step ? "var(--accent)" : "var(--bg-border)"}"></span>`).join("")}</div></div>
        <div class="modal-foot between"><button class="btn btn-ghost" data-action="welcome-prev" ${step === 0 ? "disabled" : ""}>atras</button><div class="flex"><button class="btn btn-ghost" data-action="close-welcome">cerrar</button>${step < slides.length - 1 ? `<button class="btn btn-primary" data-action="welcome-next">siguiente</button>` : `<button class="btn btn-primary" data-action="welcome-create">crear mi primer perfil</button>`}</div></div>
      </div>
    </div>
  `;
}

function renderProxiesView() {
  const selectedCount = ui.selectedProxyIds.size;
  const testedDead = state.proxies.filter((p) => !p.healthy && p.last_error && p.last_error !== "sin test").length;
  const allSelected = state.proxies.length > 0 && selectedCount === state.proxies.length;
  return `
    <section class="section stack">
      <div class="between">
        <div class="muted">${state.proxies.length} proxies en el pool${selectedCount ? ` · ${selectedCount} seleccionados` : ""}</div>
        <div class="flex" style="flex-wrap:wrap">
          <button class="btn btn-ghost" data-action="health-check" ${ui.proxyTesting ? "disabled" : ""}>${ui.proxyTesting ? "testeando..." : "test real"}</button>
          <button class="btn btn-ghost btn-danger" data-action="remove-dead-proxies" ${testedDead ? "" : "disabled"}>borrar caidos</button>
          <button class="btn btn-ghost btn-danger" data-action="remove-selected-proxies" ${selectedCount ? "" : "disabled"}>borrar seleccionados</button>
          <button class="btn btn-ghost btn-danger" data-action="remove-all-proxies" ${state.proxies.length ? "" : "disabled"}>borrar todos</button>
          <button class="btn btn-ghost" data-action="toggle-proxy-bulk">bulk import</button>
          <button class="btn btn-primary" data-action="toggle-proxy-add">+ anadir proxy</button>
        </div>
      </div>
      ${ui.proxyBulk ? renderProxyBulk() : ""}
      ${ui.proxyAdding ? renderProxyAdd() : ""}
      <div class="table-head proxy-grid"><div><input type="checkbox" data-action="toggle-all-proxies" ${allSelected ? "checked" : ""} /></div><div>Endpoint</div><div>Esquema</div><div>Latencia</div><div>Estado</div><div>En uso</div><div></div></div>
      <div class="stack-sm">${state.proxies.length ? state.proxies.map(renderProxyRow).join("") : `<div class="empty"><div>No hay proxies. Anade uno.</div></div>`}</div>
    </section>
  `;
}

function renderProxyBulk() {
  return `<form id="proxyBulkForm" class="metric stack"><div class="grid-2"><select class="select" name="scheme"><option>http</option><option>https</option><option>socks5</option><option>socks4</option></select></div><textarea class="textarea mono" name="bulk" placeholder="Pega JSON, CSV o texto. Formatos validos:\nhost:port\nhost:port:user:pass\nuser:pass@host:port\nscheme://user:pass@host:port\n0a4f...__cr.us;state.illinois:pass@gw.dataimpulse.com:10022\n\nCSV: host,port,username,password,scheme,label\nJSON: [{\"host\":\"1.2.3.4\",\"port\":8080,\"username\":\"u\",\"password\":\"p\"}]"></textarea><div class="between"><span class="small-note">Solo se agregan proxies validos. Duplicados e invalidos se omiten.</span><div class="flex"><button class="btn btn-ghost" type="button" data-action="toggle-proxy-bulk">cancelar</button><button class="btn btn-primary" type="submit">importar</button></div></div></form>`;
}

function renderProxyAdd() {
  return `<form id="proxyAddForm" class="metric stack"><div class="grid-3"><div><label class="label">esquema</label><select class="select" name="scheme"><option>http</option><option>https</option><option>socks5</option><option>socks4</option></select></div><div><label class="label">host</label><input class="input" name="host" required placeholder="1.2.3.4" /></div><div><label class="label">puerto</label><input class="input" name="port" required placeholder="8080" /></div></div><div class="grid-3"><div><label class="label">user</label><input class="input" name="username" /></div><div><label class="label">pass</label><input class="input" name="password" type="password" /></div><div><label class="label">label</label><input class="input" name="label" /></div></div><div class="between"><button class="btn btn-ghost" type="button" data-action="toggle-proxy-add">x</button><button class="btn btn-primary" type="submit">guardar</button></div></form>`;
}

function renderProxyRow(p) {
  if (ui.testingProxyIds.has(p.id)) {
    return `<div class="row-grid proxy-grid"><input type="checkbox" data-action="toggle-proxy-selected" data-id="${p.id}" ${ui.selectedProxyIds.has(p.id) ? "checked" : ""} /><div class="mono">${p.label ? `<span class="dim">${esc(p.label)}</span> ` : ""}${esc(p.host)}:${esc(p.port)}</div><div class="muted">${esc(p.scheme)}</div><div class="mono muted">...</div><div><span class="pill testing"><span class="dot testing-dot"></span>testeando</span></div><div class="muted">${p.in_use ? "asignado" : "libre"}</div><button class="icon-btn" data-action="remove-proxy-row" data-id="${p.id}">x</button></div>`;
  }
  return `<div class="row-grid proxy-grid"><input type="checkbox" data-action="toggle-proxy-selected" data-id="${p.id}" ${ui.selectedProxyIds.has(p.id) ? "checked" : ""} /><div class="mono">${p.label ? `<span class="dim">${esc(p.label)}</span> ` : ""}${esc(p.host)}:${esc(p.port)}</div><div class="muted">${esc(p.scheme)}</div><div class="mono muted">${p.latency_ms != null ? `${p.latency_ms}ms` : "-"}</div><div><span class="pill ${p.healthy ? "live" : "dim"}"><span class="dot"></span>${p.healthy ? "ok" : p.last_error === "sin test" ? "sin test" : "caido"}</span></div><div class="muted">${p.in_use ? "asignado" : "libre"}</div><button class="icon-btn" data-action="remove-proxy-row" data-id="${p.id}">x</button></div>`;
}

function renderSchedulesView() {
  const byProfile = Object.fromEntries(state.profiles.map((p) => [p.id, p]));
  return `
    <section class="section stack">
      <div class="between"><div class="muted">${state.schedules.length} tareas</div><button class="btn btn-primary" data-action="toggle-schedule-add">+ nueva tarea</button></div>
      ${ui.scheduleAdding ? renderScheduleAdd() : ""}
      <div class="stack-sm">${state.schedules.length ? state.schedules.map((s) => `<div class="row-grid schedule-grid"><div>${esc(byProfile[s.profile_id]?.name || "(borrado)")}</div><div class="muted">cada ${s.every_minutes}min</div><div class="muted">${esc(s.action)}${s.duration_minutes ? ` · ${s.duration_minutes}min` : ""}</div><div class="mono dim">${s.next_run_at ? new Date(s.next_run_at).toLocaleTimeString() : "-"}</div><button class="pill ${s.enabled ? "live" : "dim"}" data-action="toggle-schedule" data-id="${s.id}">${s.enabled ? "on" : "off"}</button><button class="icon-btn" data-action="remove-schedule" data-id="${s.id}">x</button></div>`).join("") : `<div class="empty"><div>No hay tareas.</div></div>`}</div>
    </section>
  `;
}

function renderScheduleAdd() {
  return `<form id="scheduleForm" class="metric stack"><div class="grid-4"><div><label class="label">Perfil</label><select class="select" name="profile_id" required><option value="">elegir...</option>${state.profiles.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div><div><label class="label">Cada (min)</label><input class="input" type="number" name="every" value="60" /></div><div><label class="label">Accion</label><select class="select" name="action"><option value="open">abrir</option><option value="open_close">abrir y cerrar</option><option value="wipe">limpiar cookies</option><option value="rotate_proxy">rotar proxy</option></select></div><div><label class="label">Duracion</label><input class="input" type="number" name="duration" value="5" /></div></div><div class="between"><button class="btn btn-ghost" type="button" data-action="toggle-schedule-add">x</button><button class="btn btn-primary" type="submit">guardar</button></div></form>`;
}

function renderStatsView() {
  const opens = state.events.filter((e) => e.kind === "opened").length;
  const closes = state.events.filter((e) => e.kind === "closed").length;
  const groups = new Set(state.profiles.map((p) => p.group_tag).filter(Boolean)).size;
  const healthy = state.proxies.filter((p) => p.healthy).length;
  const latencies = state.proxies.filter((p) => p.latency_ms != null).map((p) => p.latency_ms);
  const mean = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const days = lastSevenDays();
  return `<section class="section stack"><div class="stat-grid">${statCard("Perfiles", state.profiles.length, `${state.liveIds.length} en vivo`)}${statCard("Grupos", groups, "distintos")}${statCard("Proxies OK", `${healthy}/${state.proxies.length}`, `${mean}ms media`)}${statCard("Aperturas", opens, `${closes} cierres`)}</div><div class="metric"><h3>Actividad ultimos 7 dias</h3><div class="bars">${days.map((d) => `<div class="bar-col"><div class="bar" style="height:${d.pct}%"></div><div>${d.label}</div><div>${d.n}</div></div>`).join("")}</div></div><div class="metric"><h3>Top 5 mas usados</h3>${topProfilesHtml()}</div></section>`;
}

function renderHistoryView() {
  return `<section class="section stack"><div class="muted">Ultimos ${state.events.length} eventos</div>${state.events.length ? state.events.map((e) => `<div class="metric schedule-grid"><div class="mono dim">${new Date(e.ts).toLocaleString()}</div><div class="accent">${esc(e.kind)}</div><div>${esc(profileById(e.profile_id)?.name || "-")}</div><div class="mono dim">${esc(e.payload || "")}</div><div></div><div></div></div>`).join("") : `<div class="empty"><div>sin eventos</div></div>`}</section>`;
}

function renderMonitorView() {
  const lives = state.profiles.filter((p) => state.liveIds.includes(p.id));
  if (!lives.length) return `<div class="empty"><div><div class="empty-title">Sin perfiles activos</div><div>Abre uno o varios perfiles y vuelve aqui</div></div></div>`;
  return `<section class="section"><div class="grid-3">${lives.map((p) => `<div class="metric stack-sm"><div class="between"><strong>${esc(p.name)}</strong><span class="pill live">en vivo</span></div><div class="small-note mono">${esc(p.url || "about:blank")}</div><div class="progress"><span style="width:${p.warmup || 0}%"></span></div><button class="btn btn-primary" data-action="focus-profile" data-id="${p.id}">enfocar</button></div>`).join("")}</div></section>`;
}

function renderNetworkView() {
  if (!state.liveIds.length) return `<div class="empty"><div><div class="empty-title">Sin perfiles activos</div><div>Abre un perfil para capturar trafico</div></div></div>`;
  return `<section class="section stack"><form id="repeaterForm" class="metric stack"><div class="grid-3"><select class="select" name="method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select><input class="input" name="url" placeholder="https://api.ejemplo.com" /><button class="btn btn-primary" type="submit">enviar</button></div><textarea class="textarea mono" name="headers" placeholder="Headers (key: value)"></textarea><textarea class="textarea mono" name="body" placeholder="Body"></textarea></form><div class="metric"><div class="label">Response</div><pre class="mono small-note">${esc(ui.repeaterOutput || "...")}</pre></div><div class="stack-sm">${state.netEntries.map((n) => `<div class="metric between"><span class="mono">${esc(n.method)} ${esc(n.url)}</span><span class="pill ${n.status < 400 ? "live" : "danger"}">${n.status}</span></div>`).join("")}</div></section>`;
}

function renderBrowseView() {
  const active = state.browserTabs.find((t) => t.id === state.activeTabId) || null;
  return `
    <div class="browser">
      <div class="browser-tabs">${state.browserTabs.map((t) => `<div class="browser-tab-wrap ${t.id === state.activeTabId ? "active" : ""}"><button class="browser-tab" data-action="activate-browser-tab" data-id="${t.id}">${esc(t.title || t.url)}</button><button class="tab-close" data-action="close-browser-tab" data-id="${t.id}">${ICONS.close}</button></div>`).join("")}<button class="btn btn-primary" data-action="browser-new-tab">+ nueva pestana</button></div>
      <div class="browser-toolbar">
        <button class="btn btn-ghost" data-action="browser-back">atras</button><button class="btn btn-ghost" data-action="browser-reload">recargar</button>
        <select id="browserProfile" class="select" style="max-width:220px"><option value="">elige perfil...</option>${state.profiles.map((p) => `<option value="${p.id}" ${ui.browserProfileId === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
        <input id="browserUrl" class="input mono" placeholder="abre una pestana" value="${attr(ui.browserUrl || active?.url || "")}" />
        <button class="btn btn-primary" data-action="browser-go">ir</button>
        <span class="pill accent">TOR</span>
      </div>
      <div class="browser-stage">${active ? renderBrowserActive(active) : renderBrowserEmpty()}</div>
    </div>
  `;
}

function renderBrowserEmpty() {
  return `<div style="max-width:680px;width:100%;text-align:center"><h2>Navegador embebido</h2><p class="muted">Abre una pestana eligiendo perfil</p><button class="btn btn-primary" data-action="browser-new-tab">+ nueva pestana (Ctrl+T)</button><div class="label" style="margin-top:28px">Sitios utiles</div><div class="quick-grid">${quickLinks.map(([label, url, tag]) => `<button class="quick-link" data-action="quick-open" data-url="${attr(url)}"><span class="pill accent">${tag}</span><div style="margin-top:8px">${esc(label)}</div></button>`).join("")}</div></div>`;
}

function renderBrowserActive(tab) {
  const profile = profileById(tab.profileId);
  const native = window.api || null;
  if (native) {
    const userAgent = profile?.fingerprint?.userAgent || firefoxUserAgent();
    return `<div class="webview-shell"><webview class="webview-frame" data-tab-id="${tab.id}" src="${attr(tab.url)}" partition="persist:gw-${attr(tab.profileId)}" useragent="${attr(userAgent)}" allowpopups></webview></div>`;
  }
  return `<div class="panel-card" style="width:min(900px,100%);padding:28px;text-align:center"><div class="pill live">sesion aislada</div><h2>${esc(tab.title || tab.url)}</h2><p class="muted mono">${esc(tab.url)}</p><p class="small-note">Abre con Electron para usar webview real y particiones persistentes por perfil.</p><div class="flex right" style="justify-content:center;margin-top:18px"><button class="btn btn-primary" data-action="open-external" data-url="${attr(tab.url)}">abrir externo</button><button class="btn btn-ghost" data-action="open-detection" data-id="${profile?.id || ""}" data-kind="creepjs">test deteccion</button></div><div class="small-note" style="margin-top:18px">Perfil: ${esc(profile?.name || "sin perfil")}</div>`;
}

function renderSettingsView() {
  const native = window.api || null;
  return `<section class="section stack"><div class="metric stack"><h3>Ajustes</h3><div class="grid-3"><div><label class="label">Tema</label><input class="input" value="midnight" readonly /></div><div><label class="label">Electron</label><span class="pill ${native ? "live" : "warn"}">${native ? "nativo" : "browser"}</span></div><div><label class="label">Tor</label><span class="pill ${state.settings.torReady ? "live" : "warn"}">${state.settings.torReady ? "detectado" : "no detectado"}</span></div></div><div class="flex"><button class="btn btn-ghost" data-action="toggle-chromium">marcar Chromium</button><button class="btn btn-ghost" data-action="toggle-tor">detectar Tor</button><button class="btn btn-ghost" data-action="open-data-dir">abrir datos</button><button class="btn btn-primary" data-action="export-vault">exportar vault</button><button class="btn btn-ghost" data-action="import-vault">importar vault</button><button class="btn btn-ghost btn-danger" data-action="reset-data">reset data</button></div><div class="small-note mono">Token vault: ${esc(state.settings.vaultToken)}</div></div><div class="metric small-note">Modo Electron: persistencia en disco, webview real por perfil, particiones aisladas, cookies reales, proxy por sesion, headers privacy, repeater HTTP y TOTP nativo.</div></section>`;
}

function renderCommandPalette() {
  const commands = [
    ...navItems.map(([id, , label]) => ({ group: "Navegacion", label, run: `view:${id}`, hint: id })),
    { group: "Accion", label: "Crear nuevo perfil", run: "new-profile", hint: "Ctrl+N" },
    ...state.profiles.map((p) => ({ group: "Perfil", label: `Abrir ${p.name}`, run: `open:${p.id}`, hint: state.liveIds.includes(p.id) ? "en vivo" : "inactivo" }))
  ].filter((c) => c.label.toLowerCase().includes(ui.commandQuery.toLowerCase()));
  return `<div class="modal-backdrop"><div class="palette"><input id="commandInput" class="input" style="border:0;border-radius:0;padding:18px" placeholder="buscar comando o perfil..." value="${attr(ui.commandQuery)}" />${commands.slice(0, 12).map((c) => `<button class="palette-row" data-action="run-command" data-run="${attr(c.run)}"><span class="dim">${esc(c.group)}</span><span>${esc(c.label)}</span><span class="mono dim">${esc(c.hint)}</span></button>`).join("")}</div></div>`;
}

function renderCookieEditor(profileId) {
  const profile = profileById(profileId);
  const allCookies = profile?.cookies || [];
  const q = (ui.cookieSearch || "").toLowerCase();
  const cookies = q ? allCookies.filter((c) => `${c.domain || ""}${c.name || ""}${c.value || ""}`.toLowerCase().includes(q)) : allCookies;
  return `<div class="modal-backdrop"><div class="modal-card wide" style="max-width:900px"><div class="modal-head between"><div><div class="title">Editor de Cookies</div><div class="subtitle">${cookies.length}${q !== "" ? ` de ${allCookies.length}` : ""} cookies · ${esc(profile?.name || "")}</div></div><button class="icon-btn" data-action="close-cookies">x</button></div><div class="modal-body stack"><div class="flex" style="gap:8px;flex-wrap:wrap;margin-bottom:12px"><input class="input" placeholder="buscar cookies..." value="${attr(ui.cookieSearch || "")}" data-action="set-cookie-search" style="flex:1;min-width:200px"/><button class="btn btn-ghost" data-action="import-cookies" data-id="${profileId}">importar JSON</button><button class="btn btn-ghost" data-action="save-cookies" data-id="${profileId}">guardar</button><button class="btn btn-ghost btn-danger" data-action="clear-cookies" data-id="${profileId}">limpiar todo</button></div>${cookies.length ? `<div style="max-height:400px;overflow:auto;border:1px solid var(--bg-border);border-radius:8px"><table style="width:100%;border-collapse:collapse" class="mono small-note"><thead><tr style="position:sticky;top:0;background:var(--bg-panel)"><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Dominio</th><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Nombre</th><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border)">Valor</th><th style="text-align:left;padding:8px;border-bottom:1px solid var(--bg-border);width:100px">Expira</th><th style="width:40px"></th></tr></thead><tbody>${cookies.map((c) => `<tr style="border-bottom:1px solid var(--bg-border)"><td style="padding:6px 8px">${esc(c.domain)}</td><td style="padding:6px 8px">${esc(c.name)}</td><td style="padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.value)}</td><td style="padding:6px 8px;color:var(--muted)">${esc(c.expires || "session")}</td><td><button class="icon-btn" data-action="delete-cookie" data-id="${profileId}" data-domain="${attr(c.domain)}" data-name="${attr(c.name)}">${ICONS.trash}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><div>sin cookies</div></div>`}</div></div></div>`;
}
