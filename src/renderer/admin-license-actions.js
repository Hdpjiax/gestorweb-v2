import { ui, native, rerender, update, root, state } from "./state.js";
import { appDialog } from "./app-dialog.js";

const HISTORY_KEY = "gestor-web-rebuild:admin-license-history";
const VALID_PLANS = new Set(["1d", "7d", "15d", "30d", "lifetime"]);

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

function readLocalHistory() {
  try {
    const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function addLocalHistory(licenseId, action, detail, metadata = {}) {
  const row = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    license_id: licenseId,
    action,
    detail,
    metadata,
    created_at: new Date().toISOString()
  };
  const rows = [row, ...readLocalHistory()].slice(0, 500);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows));
  if (ui.adminHistoryLicenseId === licenseId) ui.adminHistoryEvents = rows.filter((item) => item.license_id === licenseId);
}

function licenseById(id) {
  return (ui.adminLicenses || []).find((item) => item.id === id) || null;
}

function normalizePlanInput(value, fallback = "30d") {
  const plan = String(value || fallback || "30d").trim();
  if (!VALID_PLANS.has(plan)) throw new Error("Plan inválido. Usa 1d, 7d, 15d, 30d o lifetime.");
  return plan;
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

async function createAdminLicense(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(event.target);
  const payload = {
    hwid: formText(data, "hwid"),
    plan: formText(data, "plan") || "30d",
    tier: formText(data, "tier") || "standard",
    features: formText(data, "features").split(",").map((item) => item.trim()).filter(Boolean)
  };
  try {
    const result = await native?.admin?.create?.(payload);
    ui.adminGeneratedKey = result?.licenseText || "";
    ui.adminError = result?.license?.id ? `Licencia ${result.license.id} generada correctamente.` : "Licencia generada correctamente.";
    if (result?.license?.id) addLocalHistory(result.license.id, "creada", `Licencia ${payload.plan} creada`, { plan: payload.plan, tier: payload.tier });
    await refreshAdminLicenses();
  } catch (error) {
    ui.adminError = error?.message || "no se pudo generar la licencia";
    rerender();
  }
}

async function revokeAdminLicense(id) {
  const license = licenseById(id);
  if (!license) {
    ui.adminError = `No se encontro la licencia ${id} en la tabla local.`;
    rerender();
    return;
  }

  const reason = await appDialog({
    title: "Revocar acceso",
    message: "Esta licencia dejará de validar en Windows y Android cuando el equipo haga su siguiente verificación online.",
    detail: `${id}\nHWID: ${license.hwid}`,
    confirmText: "Revocar acceso",
    cancelText: "Cancelar",
    tone: "danger",
    input: {
      label: "Motivo de revocación",
      value: "revocada por administrador",
      placeholder: "Escribe el motivo",
      multiline: true,
      rows: 3
    }
  });
  if (reason === null) return;

  ui.adminError = "revocando licencia...";
  rerender();

  try {
    const result = await native?.admin?.revoke?.(id, reason || "revocada por administrador");
    if (!result?.ok) throw new Error(result?.reason || "Supabase no confirmo la revocacion");

    const revokedRow = result.license || { id, revoked: true, revoke_reason: reason, revoked_at: new Date().toISOString() };
    ui.adminLicenses = ui.adminLicenses.map((item) => item.id === id ? { ...item, ...revokedRow, revoked: true } : item);
    addLocalHistory(id, "revocada", reason || "revocada por administrador");
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

async function duplicateAdminLicense(id) {
  const source = licenseById(id);
  if (!source) return;
  const plan = await appDialog({
    title: "Duplicar licencia",
    message: "Se generará una nueva key para el mismo HWID, tier y features.",
    detail: `${source.id}\nHWID: ${source.hwid}`,
    confirmText: "Duplicar",
    cancelText: "Cancelar",
    input: { label: "Plan de la nueva licencia", value: source.plan || "30d", placeholder: "1d, 7d, 15d, 30d o lifetime" }
  });
  if (plan === null) return;
  try {
    const nextPlan = normalizePlanInput(plan, source.plan || "30d");
    const result = await native?.admin?.create?.({ hwid: source.hwid, plan: nextPlan, tier: source.tier, features: source.features || [] });
    ui.adminGeneratedKey = result?.licenseText || "";
    if (result?.license?.id) {
      addLocalHistory(result.license.id, "duplicada", `Duplicada desde ${source.id}`, { source_id: source.id });
      addLocalHistory(source.id, "duplicada", `Duplicada hacia ${result.license.id}`, { target_id: result.license.id });
    }
    ui.adminError = result?.license?.id ? `Licencia duplicada: ${result.license.id}` : "Licencia duplicada.";
    await refreshAdminLicenses();
  } catch (error) {
    ui.adminError = error?.message || "no se pudo duplicar";
    rerender();
  }
}

async function renewAdminLicense(id) {
  const source = licenseById(id);
  if (!source) return;
  const plan = await appDialog({
    title: "Renovar licencia",
    message: "Se generará una nueva key para el mismo HWID y se revocará la licencia anterior para evitar doble uso.",
    detail: `${source.id}\nHWID: ${source.hwid}`,
    confirmText: "Renovar",
    cancelText: "Cancelar",
    tone: "danger",
    input: { label: "Nuevo plan", value: "30d", placeholder: "1d, 7d, 15d, 30d o lifetime" }
  });
  if (plan === null) return;
  try {
    const nextPlan = normalizePlanInput(plan, "30d");
    const result = await native?.admin?.create?.({ hwid: source.hwid, plan: nextPlan, tier: source.tier, features: source.features || [] });
    if (!result?.license?.id) throw new Error("se generó la renovación, pero no se obtuvo ID de licencia");
    ui.adminGeneratedKey = result.licenseText || "";
    await native?.admin?.revoke?.(source.id, `renovada con nueva licencia ${result.license.id}`);
    addLocalHistory(source.id, "renovada", `Reemplazada por ${result.license.id}`, { replacement_id: result.license.id, plan: nextPlan });
    addLocalHistory(result.license.id, "renovación", `Renovación de ${source.id}`, { source_id: source.id, plan: nextPlan });
    ui.adminError = `Licencia renovada. Nueva key: ${result.license.id}`;
    await refreshAdminLicenses();
  } catch (error) {
    ui.adminError = error?.message || "no se pudo renovar";
    rerender();
  }
}

async function showAdminHistory(id) {
  let events = [];
  try {
    const result = await native?.admin?.history?.(id);
    events = result?.events || [];
  } catch {}
  if (!events.length) events = readLocalHistory().filter((item) => item.license_id === id);
  ui.adminHistoryLicenseId = id;
  ui.adminHistoryEvents = events;
  rerender();
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
  const confirmed = await appDialog({
    title: "Borrar configuración guardada",
    message: "Se eliminarán del equipo las credenciales admin cifradas. La próxima vez tendrás que pegarlas de nuevo.",
    confirmText: "Borrar guardado",
    cancelText: "Cancelar",
    tone: "danger"
  });
  if (!confirmed) return;

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
      return;
    }
    if (event.target?.id === "adminCreateLicenseForm") {
      createAdminLicense(event);
    }
  }, true);

  document.addEventListener("input", (event) => {
    const key = event.target?.dataset?.adminFilter;
    if (!key) return;
    ui.adminFilters ||= { search: "", status: "all", plan: "all", tier: "all" };
    ui.adminFilters[key] = event.target.value;
    rerender();
  }, true);

  document.addEventListener("change", (event) => {
    const key = event.target?.dataset?.adminFilter;
    if (!key) return;
    ui.adminFilters ||= { search: "", status: "all", plan: "all", tier: "all" };
    ui.adminFilters[key] = event.target.value;
    rerender();
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

    if (target.dataset.action === "reset-admin-filters") {
      event.preventDefault();
      event.stopImmediatePropagation();
      ui.adminFilters = { search: "", status: "all", plan: "all", tier: "all" };
      rerender();
      return;
    }

    if (target.dataset.action === "show-admin-history") {
      event.preventDefault();
      event.stopImmediatePropagation();
      showAdminHistory(target.dataset.id);
      return;
    }

    if (target.dataset.action === "close-admin-history") {
      event.preventDefault();
      event.stopImmediatePropagation();
      ui.adminHistoryLicenseId = null;
      ui.adminHistoryEvents = [];
      rerender();
      return;
    }

    if (target.dataset.action === "duplicate-admin-license") {
      event.preventDefault();
      event.stopImmediatePropagation();
      duplicateAdminLicense(target.dataset.id);
      return;
    }

    if (target.dataset.action === "renew-admin-license") {
      event.preventDefault();
      event.stopImmediatePropagation();
      renewAdminLicense(target.dataset.id);
      return;
    }

    if (target.dataset.action === "revoke-admin-license") {
      event.preventDefault();
      event.stopImmediatePropagation();
      revokeAdminLicense(target.dataset.id);
    }
  }, true);
}
