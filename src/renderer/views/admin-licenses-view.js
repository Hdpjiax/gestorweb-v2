import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";

function isAdminLicense() {
  const features = Array.isArray(state.license?.features) ? state.license.features : [];
  return !!state.license?.active && (state.license.tier === "admin" || features.includes("admin"));
}

function statusLabel(license) {
  if (license.status === "revoked" || license.revoked) return ["revocada", "danger"];
  if (license.status === "expired" || license.expires_at && Date.now() > Number(license.expires_at)) return ["expirada", "warn"];
  return ["activa", "live"];
}

function adminLocked() {
  return `
    <section class="section admin-login-shell">
      <div class="metric stack">
        <div>
          <div class="label">Acceso restringido</div>
          <h2>Administracion de licencias</h2>
          <p class="muted">Esta seccion solo aparece para una licencia activa de tipo admin.</p>
        </div>
        <div class="callout">Activa una licencia <strong>lifetime admin</strong> en esta copia para poder emitir, listar y revocar licencias desde el programa.</div>
      </div>
    </section>
  `;
}

function savedConfigBox() {
  const config = ui.adminConfig;
  if (!config?.configured) return "";
  return `
    <div class="callout stack-sm">
      <strong>Configuracion admin guardada</strong>
      <span class="muted">${esc(config.supabaseUrl || "Supabase")}</span>
      <span class="small-note">Se usa cifrado local del sistema operativo. No se muestra la service key ni la clave privada.</span>
      <div class="flex">
        <button class="btn btn-primary" type="button" data-action="admin-resume">usar configuracion guardada</button>
        <button class="btn btn-ghost btn-danger" type="button" data-action="admin-forget-config">borrar guardado</button>
      </div>
    </div>
  `;
}

function adminLogin() {
  return `
    <section class="section admin-login-shell">
      <form id="adminLoginForm" class="metric admin-login-card stack">
        <div>
          <div class="label">Panel privado</div>
          <h2>Conectar administrador Supabase</h2>
          <p class="muted">La configuracion se guarda cifrada en este equipo para no volver a escribirla en cada inicio.</p>
        </div>
        ${ui.adminResumeBusy ? `<div class="pill accent">conectando con configuracion guardada...</div>` : savedConfigBox()}
        <div class="grid-2">
          <label class="stack-sm"><span class="label">Supabase URL</span><input class="input mono" name="supabaseUrl" value="${attr(ui.adminServerUrl || ui.adminConfig?.supabaseUrl || "https://TU_PROJECT_REF.supabase.co")}" required /></label>
          <label class="stack-sm"><span class="label">Anon / publishable key</span><input class="input mono" name="anonKey" autocomplete="off" required /></label>
        </div>
        <label class="stack-sm"><span class="label">Service role key solo admin</span><input class="input mono" type="password" name="serviceRoleKey" autocomplete="off" required /></label>
        <label class="stack-sm"><span class="label">Clave privada PEM</span><textarea class="textarea mono" name="privateKeyPem" rows="8" placeholder="-----BEGIN PRIVATE KEY-----" required></textarea></label>
        ${ui.adminError ? `<div class="pill danger">${esc(ui.adminError)}</div>` : ""}
        <button class="btn btn-primary" type="submit">entrar y guardar configuracion cifrada</button>
      </form>
    </section>
  `;
}

function filterLicenses(licenses) {
  const filters = ui.adminFilters || { search: "", status: "all", plan: "all", tier: "all" };
  const q = String(filters.search || "").trim().toLowerCase();
  return licenses.filter((license) => {
    const status = statusLabel(license)[0];
    const haystack = `${license.id} ${license.hwid} ${license.plan} ${license.tier} ${(license.features || []).join(" ")}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (filters.status && filters.status !== "all" && filters.status !== status) return false;
    if (filters.plan && filters.plan !== "all" && filters.plan !== license.plan) return false;
    if (filters.tier && filters.tier !== "all" && filters.tier !== license.tier) return false;
    return true;
  });
}

function options(values, selected, allLabel) {
  const unique = [...new Set(values.filter(Boolean))].sort();
  return [`<option value="all">${esc(allLabel)}</option>`, ...unique.map((value) => `<option value="${attr(value)}" ${selected === value ? "selected" : ""}>${esc(value)}</option>`)].join("");
}

function licenseRow(license) {
  const [status, klass] = statusLabel(license);
  const features = Array.isArray(license.features) ? license.features.join(", ") : String(license.features || "");
  return `
    <div class="admin-license-row">
      <div><strong class="mono">${esc(license.id)}</strong><small>${esc(license.hwid)}</small></div>
      <span class="pill accent" title="${attr(features || "standard")}">${esc(license.tier || "standard")}</span>
      <span>${esc(license.plan)}</span>
      <span class="mono">${license.expires_at ? esc(new Date(Number(license.expires_at)).toLocaleString()) : "permanente"}</span>
      <span class="pill ${klass}">${status}</span>
      <div class="flex right">
        <button class="btn btn-ghost" type="button" data-action="copy-admin-license" data-id="${attr(license.id)}">copiar</button>
        <button class="btn btn-ghost" type="button" data-action="show-admin-history" data-id="${attr(license.id)}">historial</button>
        <button class="btn btn-ghost" type="button" data-action="duplicate-admin-license" data-id="${attr(license.id)}">duplicar</button>
        ${status === "activa" ? `<button class="btn btn-ghost" type="button" data-action="renew-admin-license" data-id="${attr(license.id)}">renovar</button><button class="btn btn-ghost btn-danger" type="button" data-action="revoke-admin-license" data-id="${attr(license.id)}">revocar</button>` : ""}
      </div>
    </div>
  `;
}

function historyPanel() {
  if (!ui.adminHistoryLicenseId) return "";
  const events = ui.adminHistoryEvents || [];
  return `
    <div class="metric stack admin-history-panel">
      <div class="between">
        <div><strong>Historial</strong><div class="small-note mono">${esc(ui.adminHistoryLicenseId)}</div></div>
        <button class="btn btn-ghost" type="button" data-action="close-admin-history">cerrar</button>
      </div>
      <div class="admin-history-list">
        ${events.map((event) => `
          <div class="admin-history-item">
            <span class="pill accent">${esc(event.action || "evento")}</span>
            <div><strong>${esc(event.detail || "sin detalle")}</strong><small>${event.created_at ? esc(new Date(event.created_at).toLocaleString()) : "ahora"}</small></div>
          </div>
        `).join("") || `<div class="network-empty">Sin eventos registrados para esta licencia.</div>`}
      </div>
    </div>
  `;
}

export function renderAdminLicensesView() {
  if (!isAdminLicense()) return adminLocked();
  if (!ui.adminAuthenticated) return adminLogin();
  const licenses = ui.adminLicenses || [];
  const filtered = filterLicenses(licenses);
  const filters = ui.adminFilters || { search: "", status: "all", plan: "all", tier: "all" };
  const active = licenses.filter((item) => statusLabel(item)[0] === "activa").length;
  const expired = licenses.filter((item) => statusLabel(item)[0] === "expirada").length;
  const revoked = licenses.filter((item) => statusLabel(item)[0] === "revocada").length;
  return `
    <section class="section admin-license-shell stack">
      <div class="between">
        <div><div class="label">Panel privado</div><h2>Licencias Windows y Android</h2><div class="small-note mono">${esc(ui.adminServerUrl || "Supabase")}</div></div>
        <div class="flex"><button class="btn btn-ghost" type="button" data-action="refresh-admin-licenses">actualizar</button><button class="btn btn-ghost" type="button" data-action="logout-admin">salir</button></div>
      </div>
      <div class="grid-4">
        <div class="metric"><div class="label">Total</div><strong>${licenses.length}</strong></div>
        <div class="metric"><div class="label">Activas</div><strong class="ok">${active}</strong></div>
        <div class="metric"><div class="label">Expiradas</div><strong class="warn">${expired}</strong></div>
        <div class="metric"><div class="label">Revocadas</div><strong class="fail">${revoked}</strong></div>
      </div>
      <form id="adminCreateLicenseForm" class="metric stack">
        <div class="between"><strong>Generar nueva licencia</strong><span class="small-note">Firmada, registrada en Supabase y revocable</span></div>
        <div class="admin-license-form">
          <input class="input mono" name="hwid" placeholder="HWID Windows o Device Install ID Android" required />
          <select class="select" name="plan"><option>1d</option><option>7d</option><option>15d</option><option selected>30d</option><option value="lifetime">permanente</option></select>
          <select class="select" name="tier"><option>standard</option><option>pro</option><option>enterprise</option><option>admin</option></select>
          <input class="input" name="features" value="standard" placeholder="features: standard, admin" />
          <button class="btn btn-primary" type="submit">generar licencia</button>
        </div>
      </form>
      ${ui.adminGeneratedKey ? `<div class="metric stack-sm"><div class="between"><strong>Licencia generada</strong><button class="btn btn-primary" type="button" data-action="copy-generated-license">copiar</button></div><pre class="mono admin-generated-key">${esc(ui.adminGeneratedKey)}</pre></div>` : ""}
      ${ui.adminError ? `<div class="pill danger">${esc(ui.adminError)}</div>` : ""}
      <div class="metric admin-filter-bar">
        <input class="input mono" data-admin-filter="search" value="${attr(filters.search || "")}" placeholder="Buscar por licencia, HWID, plan, tier..." />
        <select class="select" data-admin-filter="status"><option value="all">todos los estados</option><option value="activa" ${filters.status === "activa" ? "selected" : ""}>activas</option><option value="revocada" ${filters.status === "revocada" ? "selected" : ""}>revocadas</option><option value="expirada" ${filters.status === "expirada" ? "selected" : ""}>expiradas</option></select>
        <select class="select" data-admin-filter="plan">${options(licenses.map((item) => item.plan), filters.plan, "todos los planes")}</select>
        <select class="select" data-admin-filter="tier">${options(licenses.map((item) => item.tier), filters.tier, "todos los tiers")}</select>
        <button class="btn btn-ghost" type="button" data-action="reset-admin-filters">limpiar filtros</button>
      </div>
      <div class="small-note">Mostrando ${filtered.length} de ${licenses.length} licencias.</div>
      ${historyPanel()}
      <div class="admin-license-table">
        <div class="admin-license-head"><span>Licencia / equipo</span><span>Tier</span><span>Plan</span><span>Vencimiento</span><span>Estado</span><span></span></div>
        ${filtered.map(licenseRow).join("") || `<div class="network-empty">No hay licencias con esos filtros.</div>`}
      </div>
    </section>
  `;
}
