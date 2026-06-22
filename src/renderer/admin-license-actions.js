import { ui, native, rerender, update, root, state } from "./state.js";

function formText(data, name) {
  return String(data.get(name) || "").trim();
}

function applyAdminLoginResult(result) {
  ui.adminAuthenticated = !!result?.ok;
  ui.adminServerUrl = result?.supabaseUrl || result?.serverUrl || result?.config?.supabaseUrl || ui.adminServerUrl;
  ui.adminLicenses = result?.licenses || [];
  ui.adminGeneratedKey = "";
  ui.adminConfig = result?.config || ui.adminConfig;
  ui.adminError = "";
}

async function handleLicenseActivation(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const text = document.getElementById("licenseText")?.value?.trim() || "";
  if (!text) return alert("Pega una licencia GW-LIC-V1 para activar esta copia.");
  if (!native?.license?.claimByKey) return alert("Activacion real solo disponible en Electron.");

  const nativeStatus = await native.license.claimByKey(text);
  if (!nativeStatus?.active) {
    return alert(`Licencia invalida para este HWID (${nativeStatus?.hwid || "desconocido"}).\n${nativeStatus?.reason || "Verifica que la licencia fue generada para este dispositivo."}`);
  }

  ui.welcome = true;
  ui.adminResumeTried = false;
  update((state) => {
    state.license = {
      ...nativeStatus,
      active: true,
      text,
      activatedAt: Date.now()
    };
  });
}

async function handleAdminLogin(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const data = new FormData(event.target);
  ui.adminError = "";
  try {
    const result = await native?.admin?.login?.({
      supabaseUrl: formText(data, "supabaseUrl"),
      anonKey: formText(data, "anonKey"),
      serviceRoleKey: formText(data, "serviceRoleKey"),
      privateKeyPem: String(data.get("privateKeyPem") || "").trim(),
      remember: true
    });
    applyAdminLoginResult(result);
  } catch (error) {
    ui.adminAuthenticated = false;
    ui.adminError = error?.message || "no se pudo iniciar sesion admin";
  }
  rerender();
}

async function refreshAdminConfigInfo() {
  if (!native?.admin?.config) return;
  try {
    const config = await native.admin.config();
    ui.adminConfig = config;
    if (config?.supabaseUrl && !ui.adminServerUrl) ui.adminServerUrl = config.supabaseUrl;
  } catch {}
}

async function refreshAdminLicenses() {
  try {
    const result = await native?.admin?.list?.();
    ui.adminLicenses = result?.licenses || [];
    ui.adminServerUrl = result?.supabaseUrl || ui.adminServerUrl;
    ui.adminConfig = result?.config || ui.adminConfig;
    ui.adminError = "";
  } catch (error) {
    ui.adminError = error?.message || "no se pudieron cargar las licencias";
  }
  rerender();
}

async function revokeAdminLicense(id) {
  const license = ui.adminLicenses.find((item) => item.id === id);
  if (!license) {
    ui.adminError = `No se encontro la licencia ${id} en la tabla local.`;
    rerender();
    return;
  }

  if (!confirm(`Revocar acceso de ${id}?\n\nHWID: ${license.hwid}\n\nEl equipo quedara bloqueado en su siguiente validacion online.`)) return;
  const reason = prompt("Motivo de revocacion:", "revocada por administrador") || "revocada por administrador";

  ui.adminError = "revocando licencia...";
  rerender();

  try {
    const result = await native?.admin?.revoke?.(id, reason);
    if (!result?.ok) throw new Error(result?.reason || "Supabase no confirmo la revocacion");

    const revokedRow = result.license || { id, revoked: true, revoke_reason: reason, revoked_at: new Date().toISOString() };
    ui.adminLicenses = ui.adminLicenses.map((item) => item.id === id ? { ...item, ...revokedRow, revoked: true } : item);
    ui.adminError = `Licencia ${id} revocada correctamente.`;

    const current = result.currentStatus;
    if (current?.id && state.license?.id === current.id && !current.active) {
      update((next) => {
        next.license = { ...next.license, ...current, active: false };
        next.liveIds = [];
        next.browserTabs = [];
        next.activeTabId = null;
        next.view = "all";
      });
      return;
    }

    await refreshAdminLicenses();
  } catch (error) {
    ui.adminError = error?.message || "no se pudo revocar";
    rerender();
  }
}

async function resumeAdminSession({ force = false } = {}) {
  if (!native?.admin?.resume || ui.adminAuthenticated || ui.adminResumeBusy) return;
  if (!force && ui.adminResumeTried) return;
  if (!state.license?.active) return;
  const isAdmin = state.license?.tier === "admin" || (Array.isArray(state.license?.features) && state.license.features.includes("admin"));
  if (!isAdmin) return;

  ui.adminResumeTried = true;
  ui.adminResumeBusy = true;
  rerender();
  try {
    const result = await native.admin.resume();
    if (result?.ok) applyAdminLoginResult(result);
    else {
      ui.adminConfig = result?.config || ui.adminConfig;
      if (force) ui.adminError = result?.reason || "no hay configuracion admin guardada";
    }
  } catch (error) {
    if (force) ui.adminError = error?.message || "no se pudo usar la configuracion guardada";
  } finally {
    ui.adminResumeBusy = false;
    rerender();
  }
}

async function forgetAdminConfig() {
  if (!confirm("Borrar la configuracion admin guardada en este equipo?")) return;
  await native?.admin?.forgetConfig?.().catch(() => {});
  ui.adminConfig = null;
  ui.adminAuthenticated = false;
  ui.adminLicenses = [];
  ui.adminGeneratedKey = "";
  ui.adminResumeTried = false;
  ui.adminError = "configuracion admin borrada";
  rerender();
}

export function initAdminLicenseActions() {
  refreshAdminConfigInfo().then(() => rerender());

  const observer = new MutationObserver(() => {
    if (document.getElementById("adminLoginForm")) resumeAdminSession();
  });
  observer.observe(root, { childList: true, subtree: true });

  document.addEventListener("submit", (event) => {
    if (event.target?.id === "licenseForm") {
      handleLicenseActivation(event);
      return;
    }
    if (event.target?.id === "adminLoginForm") {
      handleAdminLogin(event);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    if (target.dataset.action === "admin-resume") {
      event.preventDefault();
      event.stopImmediatePropagation();
      ui.adminResumeTried = false;
      resumeAdminSession({ force: true });
      return;
    }

    if (target.dataset.action === "admin-forget-config") {
      event.preventDefault();
      event.stopImmediatePropagation();
      forgetAdminConfig();
      return;
    }

    if (target.dataset.action === "refresh-admin-licenses") {
      event.preventDefault();
      event.stopImmediatePropagation();
      refreshAdminLicenses();
      return;
    }

    if (target.dataset.action === "revoke-admin-license") {
      event.preventDefault();
      event.stopImmediatePropagation();
      revokeAdminLicense(target.dataset.id);
    }
  }, true);
}
