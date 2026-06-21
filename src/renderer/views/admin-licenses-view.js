import { attr, esc } from "../helpers.js";
import { ui } from "../state.js";

function statusLabel(license) {
  if (license.status === "revoked" || license.revoked) return ["revocada", "danger"];
  if (license.status === "expired" || license.expires_at && Date.now() > Number(license.expires_at)) return ["expirada", "warn"];
  return ["activa", "live"];
}

function adminLogin() {
  return `
    <section class="section admin-login-shell">
      <form id="adminLoginForm" class="metric admin-login-card stack">
        <div>
          <div class="label">Acceso restringido</div>
          <h2>Administracion de licencias</h2>
          <p class="muted">La credencial permanece solamente en memoria y nunca se guarda en el vault.</p>
        </div>
        <label class="stack-sm"><span class="label">Servidor de licencias</span><input class="input mono" name="serverUrl" value="${attr(ui.adminServerUrl || "https://licencias.tudominio.com")}" required /></label>
        <label class="stack-sm"><span class="label">Credencial unica de administrador</span><input class="input mono" type="password" name="credential" autocomplete="off" required /></label>
        ${ui.adminError ? `<div class="pill danger">${esc(ui.adminError)}</div>` : ""}
        <button class="btn btn-primary" type="submit">entrar al panel privado</button>
      </form>
    </section>
  `;
}

function licenseRow(license) {
  const [status, klass] = statusLabel(license);
  return `
    <div class="admin-license-row">
      <div><strong class="mono">${esc(license.id)}</strong><small>${esc(license.hwid)}</small></div>
      <span class="pill accent">${esc(license.platform || "any")}</span>
      <span>${esc(license.plan)}</span>
      <span class="mono">${license.expires_at ? esc(new Date(Number(license.expires_at)).toLocaleString()) : "permanente"}</span>
      <span class="pill ${klass}">${status}</span>
      <div class="flex right">
        <button class="btn btn-ghost" data-action="copy-admin-license" data-id="${attr(license.id)}">copiar key</button>
        ${status === "activa" ? `<button class="btn btn-ghost btn-danger" data-action="revoke-admin-license" data-id="${attr(license.id)}">revocar</button>` : ""}
      </div>
    </div>
  `;
}

export function renderAdminLicensesView() {
  if (!ui.adminAuthenticated) return adminLogin();
  const licenses = ui.adminLicenses || [];
  const active = licenses.filter((item) => statusLabel(item)[0] === "activa").length;
  const expired = licenses.filter((item) => statusLabel(item)[0] === "expirada").length;
  const revoked = licenses.filter((item) => statusLabel(item)[0] === "revocada").length;
  return `
    <section class="section admin-license-shell stack">
      <div class="between">
        <div><div class="label">Panel privado</div><h2>Licencias Windows y Android</h2><div class="small-note mono">${esc(ui.adminServerUrl)}</div></div>
        <div class="flex"><button class="btn btn-ghost" data-action="refresh-admin-licenses">actualizar</button><button class="btn btn-ghost" data-action="logout-admin">salir</button></div>
      </div>
      <div class="grid-4">
        <div class="metric"><div class="label">Total</div><strong>${licenses.length}</strong></div>
        <div class="metric"><div class="label">Activas</div><strong class="ok">${active}</strong></div>
        <div class="metric"><div class="label">Expiradas</div><strong class="warn">${expired}</strong></div>
        <div class="metric"><div class="label">Revocadas</div><strong class="fail">${revoked}</strong></div>
      </div>
      <form id="adminCreateLicenseForm" class="metric stack">
        <div class="between"><strong>Generar nueva key</strong><span class="small-note">Firmada, registrada y revocable</span></div>
        <div class="admin-license-form">
          <input class="input mono" name="hwid" placeholder="HWID Windows o Device Install ID Android" required />
          <select class="select" name="platform"><option value="windows">Windows</option><option value="android">Android</option><option value="any">Ambos</option></select>
          <select class="select" name="plan"><option>1d</option><option>7d</option><option>15d</option><option selected>30d</option><option value="lifetime">permanente</option></select>
          <select class="select" name="tier"><option>standard</option><option>pro</option><option>enterprise</option></select>
          <button class="btn btn-primary" type="submit">generar key</button>
        </div>
        <input class="input" name="features" value="standard" placeholder="features separadas por coma" />
      </form>
      ${ui.adminGeneratedKey ? `<div class="metric stack-sm"><div class="between"><strong>Key generada</strong><button class="btn btn-primary" data-action="copy-generated-license">copiar</button></div><pre class="mono admin-generated-key">${esc(ui.adminGeneratedKey)}</pre></div>` : ""}
      ${ui.adminError ? `<div class="pill danger">${esc(ui.adminError)}</div>` : ""}
      <div class="admin-license-table">
        <div class="admin-license-head"><span>Licencia / equipo</span><span>Plataforma</span><span>Plan</span><span>Vencimiento</span><span>Estado</span><span></span></div>
        ${licenses.map(licenseRow).join("") || `<div class="network-empty">No hay licencias registradas.</div>`}
      </div>
    </section>
  `;
}
