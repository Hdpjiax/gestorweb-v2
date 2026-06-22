import { attr, esc } from "../helpers.js";
import { state, ui } from "../state.js";

function isAdminLicense() {
  const features = Array.isArray(state.license?.features) ? state.license.features : [];
  return !!state.license?.active && (state.license.tier === "admin" || features.includes("admin"));
}

function statusLabel(license) {
  if (license.revoked) return ["revocada", "danger"];
  if (license.suspended) return ["suspendida", "warn"];
  if (license.expires_at && Date.now() > Number(license.expires_at)) return ["expirada", "warn"];
  return ["activa", "live"];
}

function adminLocked() {
  return `<section class="section admin-login-shell"><div class="metric stack"><div><div class="label">Acceso restringido</div><h2>Administracion de licencias</h2><p class="muted">Esta seccion requiere una licencia admin activa.</p></div></div></section>`;
}

function savedConfigBox() {
  const config = ui.adminConfig;
  if (!config?.configured) return "";
  return `<div class="callout stack-sm"><strong>Configuracion admin guardada</strong><span class="muted">${esc(config.supabaseUrl || "Supabase")}</span><span class="small-note">Credenciales cifradas localmente.</span><div class="flex"><button class="btn btn-primary" type="button" data-action="admin-resume">usar configuracion guardada</button><button class="btn btn-ghost btn-danger" type="button" data-action="admin-forget-config">borrar guardado</button></div></div>`;
}

function adminLogin() {
  return `<section class="section admin-login-shell"><form id="adminLoginForm" class="metric admin-login-card stack"><div><div class="label">Panel privado</div><h2>Conectar administrador Supabase</h2><p class="muted">La configuracion se guarda cifrada en este equipo.</p></div>${ui.adminResumeBusy ? `<div class="pill accent">conectando...</div>` : savedConfigBox()}<div class="grid-2"><label class="stack-sm"><span class="label">Supabase URL</span><input class="input mono" name="supabaseUrl" value="${attr(ui.adminServerUrl || ui.adminConfig?.supabaseUrl || "https://TU_PROJECT_REF.supabase.co")}" required /></label><label class="stack-sm"><span class="label">Anon / publishable key</span><input class="input mono" name="anonKey" autocomplete="off" required /></label></div><label class="stack-sm"><span class="label">Service role key</span><input class="input mono" type="password" name="serviceRoleKey" autocomplete="off" required /></label><label class="stack-sm"><span class="label">Clave privada PEM</span><textarea class="textarea mono" name="privateKeyPem" rows="8" placeholder="-----BEGIN PRIVATE KEY-----" required></textarea></label>${ui.adminError ? `<div class="pill danger">${esc(ui.adminError)}</div>` : ""}<button class="btn btn-primary" type="submit">entrar y guardar</button></form></section>`;
}

function filterLicenses(licenses) {
  const filters = ui.adminFilters || { search: "", status: "all", plan: "all" };
  const q = String(filters.search || "").trim().toLowerCase();
  return licenses.filter((license) => {
    const status = statusLabel(license)[0];
    const haystack = `${license.id} ${license.hwid} ${license.plan} ${license.last_ip || ""} ${license.last_mismatched_hwid || ""}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (filters.status && filters.status !== "all" && filters.status !== status) return false;
    if (filters.plan && filters.plan !== "all" && filters.plan !== license.plan) return false;
    return true;
  });
}

function options(values, selected, allLabel) {
  const unique = [...new Set(values.filter(Boolean))].sort();
  return [`<option value="all">${esc(allLabel)}</option>`, ...unique.map((value) => `<option value="${attr(value)}" ${selected === value ? "selected" : ""}>${esc(value)}</option>`)].join("");
}

function securityLine(license) {
  return `fallos: ${Number(license.validation_failures || 0)} · HWID distintos: ${Number(license.mismatched_hwid_count || 0)} · IP: ${license.last_ip || "sin IP"}`;
}

function licenseRow(license) {
  const [status, klass] = statusLabel(license);
  return `<div class="admin-license-row"><div><strong class="mono">${esc(license.id)}</strong><small>${esc(license.hwid)}</small><small>${esc(securityLine(license))}</small></div><span>${esc(license.plan)}</span><span class="mono">${license.expires_at ? esc(new Date(Number(license.expires_at)).toLocaleString()) : "permanente"}</span><span class="pill ${klass}">${status}</span><span class="mono">${license.last_check_at ? esc(new Date(license.last_check_at).toLocaleString()) : "sin validación"}</span><div class="flex right"><button class="btn btn-ghost" type="button" data-action="copy-admin-license" data-id="${attr(license.id)}">copiar</button><button class="btn btn-ghost" type="button" data-action="show-admin-history" data-id="${attr(license.id)}">historial</button><button class="btn btn-ghost" type="button" data-action="duplicate-admin-license" data-id="${attr(license.id)}">duplicar</button>${!license.revoked ? `<button class="btn btn-ghost" type="button" data-action="renew-admin-license" data-id="${attr(license.id)}">renovar</button>` : ""}${status === "activa" ? `<button class="btn btn-ghost" type="button" data-action="suspend-admin-license" data-id="${attr(license.id)}">suspender</button>` : ""}${status === "suspendida" ? `<button class="btn btn-ghost" type="button" data-action="reactivate-admin-license" data-id="${attr(license.id)}">reactivar</button>` : ""}${!license.revoked ? `<button class="btn btn-ghost btn-danger" type="button" data-action="revoke-admin-license" data-id="${attr(license.id)}">revocar</button>` : ""}</div></div>`;
}

function historyPanel() {
  if (!ui.adminHistoryLicenseId) return "";
  const events = ui.adminHistoryEvents || [];
  return `<div class="metric stack admin-history-panel"><div class="between"><div><strong>Auditoría / historial</strong><div class="small-note mono">${esc(ui.adminHistoryLicenseId)}</div></div><button class="btn btn-ghost" type="button" data-action="close-admin-history">cerrar</button></div><div class="admin-history-list">${events.map((event) => `<div class="admin-history-item"><span class="pill accent">${esc(event.action || "evento")}</span><div><strong>${esc(event.detail || "sin detalle")}</strong><small>${event.created_at ? esc(new Date(event.created_at).toLocaleString()) : "ahora"}</small><small>${event.actor_license_id ? `Admin: ${esc(event.actor_license_id)}` : ""}</small></div></div>`).join("") || `<div class="network-empty">Sin eventos registrados para esta licencia.</div>`}</div></div>`;
}

export function renderAdminLicensesView() {
  if (!isAdminLicense()) return adminLocked();
  if (!ui.adminAuthenticated) return adminLogin();
  const licenses = ui.adminLicenses || [];
  const filtered = filterLicenses(licenses);
  const filters = ui.adminFilters || { search: "", status: "all", plan: "all" };
  const active = licenses.filter((item) => statusLabel(item)[0] === "activa").length;
  const revoked = licenses.filter((item) => statusLabel(item)[0] === "revocada").length;
  const suspended = licenses.filter((item) => statusLabel(item)[0] === "suspendida").length;
  const failures = licenses.reduce((sum, item) => sum + Number(item.validation_failures || 0), 0);
  const mismatches = licenses.reduce((sum, item) => sum + Number(item.mismatched_hwid_count || 0), 0);
  return `<section class="section admin-license-shell stack"><div class="between"><div><div class="label">Panel privado</div><h2>Licencias por días</h2><div class="small-note mono">${esc(ui.adminServerUrl || "Supabase")}</div></div><div class="flex"><button class="btn btn-ghost" type="button" data-action="refresh-admin-licenses">actualizar</button><button class="btn btn-ghost" type="button" data-action="logout-admin">salir</button></div></div><div class="grid-4"><div class="metric"><div class="label">Activas</div><strong class="ok">${active}</strong></div><div class="metric"><div class="label">Suspendidas</div><strong class="warn">${suspended}</strong></div><div class="metric"><div class="label">Revocadas</div><strong class="fail">${revoked}</strong></div><div class="metric"><div class="label">Alertas</div><strong class="warn">${failures + mismatches}</strong><div class="small-note">fallos + HWID distintos</div></div></div><form id="adminCreateLicenseForm" class="metric stack"><div class="between"><strong>Generar nueva licencia</strong><span class="small-note">Solo licencias por tiempo</span></div><div class="admin-license-form days-only"><input class="input mono" name="hwid" placeholder="HWID Windows o Android" required /><select class="select" name="plan"><option>1d</option><option>7d</option><option>15d</option><option selected>30d</option><option value="lifetime">permanente</option></select><button class="btn btn-primary" type="submit">generar licencia</button></div></form>${ui.adminGeneratedKey ? `<div class="metric stack-sm"><div class="between"><strong>Licencia generada</strong><button class="btn btn-primary" type="button" data-action="copy-generated-license">copiar</button></div><pre class="mono admin-generated-key">${esc(ui.adminGeneratedKey)}</pre></div>` : ""}${ui.adminError ? `<div class="pill danger">${esc(ui.adminError)}</div>` : ""}<div class="metric admin-filter-bar days-only"><input class="input mono" data-admin-filter="search" value="${attr(filters.search || "")}" placeholder="Buscar por licencia, HWID o IP..." /><select class="select" data-admin-filter="status"><option value="all">todos los estados</option><option value="activa" ${filters.status === "activa" ? "selected" : ""}>activas</option><option value="suspendida" ${filters.status === "suspendida" ? "selected" : ""}>suspendidas</option><option value="revocada" ${filters.status === "revocada" ? "selected" : ""}>revocadas</option><option value="expirada" ${filters.status === "expirada" ? "selected" : ""}>expiradas</option></select><select class="select" data-admin-filter="plan">${options(licenses.map((item) => item.plan), filters.plan, "todos los planes")}</select><button class="btn btn-ghost" type="button" data-action="reset-admin-filters">limpiar filtros</button></div><div class="small-note">Mostrando ${filtered.length} de ${licenses.length} licencias.</div>${historyPanel()}<div class="admin-license-table"><div class="admin-license-head days-only"><span>Licencia / equipo / seguridad</span><span>Plan</span><span>Vencimiento</span><span>Estado</span><span>Última validación</span><span></span></div>${filtered.map(licenseRow).join("") || `<div class="network-empty">No hay licencias con esos filtros.</div>`}</div></section>`;
}
