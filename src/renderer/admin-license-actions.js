import { ui, native, rerender, update, root, state } from "./state.js";
import { appDialog } from "./app-dialog.js";
import { toast, offlineMessage } from "./app-ui.js";

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
  ui.adminOffline = false;
}

function setAdminLoading(label = "procesando") {
  ui.adminLoading = true;
  ui.adminBusyLabel = label;
  rerender();
}

function clearAdminLoading() {
  ui.adminLoading = false;
  ui.adminBusyLabel = "";
}

function setAdminError(error, fallback = "No se pudo completar la operación") {
  const message = offlineMessage(error || fallback);
  const raw = String(error?.message || error || "").toLowerCase();
  ui.adminError = message;
  ui.adminOffline = raw.includes("fetch") || raw.includes("network") || raw.includes("aborted") || raw.includes("timeout") || raw.includes("failed");
  toast(message, ui.adminOffline ? "warning" : "error", { title: ui.adminOffline ? "Sin conexión" : "Operación fallida" });
}

function clearAdminError() {
  ui.adminError = "";
  ui.adminOffline = false;
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
  if (!text) {
    await appDialog({ title: "Licencia requerida", message: "Pega una licencia GW-LIC-V1 para activar esta copia.", confirmText: "Entendido" });
    return;
  }
  if (!native?.license?.claimByKey) {
    await appDialog({ title: "Activación no disponible", message: "La activación real solo está disponible dentro de la app de escritorio.", confirmText: "Entendido" });
    return;
  }

  try {
    const nativeStatus = await native.license.claimByKey(text);
    if (!nativeStatus?.active) {
      await appDialog({
        title: "Licencia inválida",
        message: nativeStatus?.reason || "Verifica que la licencia fue generada para este dispositivo.",
        detail: `HWID: ${nativeStatus?.hwid || "desconocido"}`,
        tone: "danger",
        confirmText: "Revisar"
      });
      return;
    }

    ui.welcome = true;
    ui.adminResumeTried = false;
    toast("Licencia activada correctamente.", "success");
    update((state) => {
      state.license = { ...nativeStatus, active: true, text, activatedAt: Date.now() };
    });
  } catch (error) {
    toast(offlineMessage(error), "error", { title: "No se pudo activar" });
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const data = new FormData(event.target);
  setAdminLoading("conectando con Supabase");
  try {
    const result = await native?.admin?.login?.({
      supabaseUrl: formText(data, "supabaseUrl"),
      anonKey: formText(data, "anonKey"),
      serviceRoleKey: formText(data, "serviceRoleKey"),
      privateKeyPem: String(data.get("privateKeyPem") || "").trim(),
      remember: true
    });
    applyAdminLoginResult(result);
    toast("Panel admin conectado y configuración guardada.", "success");
  } catch (error) {
    ui.adminAuthenticated = false;
    setAdminError(error, "no se pudo iniciar sesión admin");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function refreshAdminConfigInfo() {
  if (!native?.admin?.config) return;
  try {
    const config = await native.admin.config();
    ui.adminConfig = config;
    if (config?.supabaseUrl && !ui.adminServerUrl) ui.adminServerUrl = config.supabaseUrl;
  } catch {}
}

async function refreshAdminLicenses({ silent = false } = {}) {
  if (!silent) setAdminLoading("cargando licencias");
  try {
    const result = await native?.admin?.list?.();
    ui.adminLicenses = result?.licenses || [];
    ui.adminServerUrl = result?.supabaseUrl || ui.adminServerUrl;
    ui.adminConfig = result?.config || ui.adminConfig;
    clearAdminError();
    if (!silent) toast("Licencias sincronizadas.", "success");
  } catch (error) {
    setAdminError(error, "no se pudieron cargar las licencias");
  } finally {
    if (!silent) {
      clearAdminLoading();
      rerender();
    }
  }
}

async function createAdminLicense(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const data = new FormData(event.target);
  const payload = { hwid: formText(data, "hwid"), plan: formText(data, "plan") || "30d" };
  setAdminLoading("generando licencia");
  try {
    const result = await native?.admin?.create?.(payload);
    ui.adminGeneratedKey = result?.licenseText || "";
    const id = result?.license?.id;
    ui.adminError = "";
    ui.adminOffline = false;
    if (id) addLocalHistory(id, "creada", `Licencia ${payload.plan} creada`, { plan: payload.plan });
    toast(id ? `Licencia ${id} generada.` : "Licencia generada correctamente.", "success");
    await refreshAdminLicenses({ silent: true });
  } catch (error) {
    setAdminError(error, "no se pudo generar la licencia");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function revokeAdminLicense(id) {
  const license = licenseById(id);
  if (!license) {
    setAdminError(`No se encontró la licencia ${id} en la tabla local.`);
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
    input: { label: "Motivo de revocación", value: "revocada por administrador", placeholder: "Escribe el motivo", multiline: true, rows: 3 }
  });
  if (reason === null) return;

  setAdminLoading("revocando licencia");
  try {
    const result = await native?.admin?.revoke?.(id, reason || "revocada por administrador");
    if (!result?.ok) throw new Error(result?.reason || "Supabase no confirmó la revocación");
    const revokedRow = result.license || { id, revoked: true, revoke_reason: reason, revoked_at: new Date().toISOString() };
    ui.adminLicenses = ui.adminLicenses.map((item) => item.id === id ? { ...item, ...revokedRow, revoked: true } : item);
    addLocalHistory(id, "revocada", reason || "revocada por administrador");
    toast(`Licencia ${id} revocada correctamente.`, "success");
    const current = result.currentStatus;
    if (current?.id && state.license?.id === current.id && !current.active) {
      update((next) => { next.license = { ...next.license, ...current, active: false }; next.liveIds = []; next.browserTabs = []; next.activeTabId = null; next.view = "all"; });
      return;
    }
    await refreshAdminLicenses({ silent: true });
  } catch (error) {
    setAdminError(error, "no se pudo revocar");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function suspendAdminLicense(id) {
  const license = licenseById(id);
  if (!license) return;
  const reason = await appDialog({
    title: "Suspender licencia",
    message: "La licencia quedará bloqueada temporalmente, pero podrá reactivarse después.",
    detail: `${id}\nHWID: ${license.hwid}`,
    confirmText: "Suspender",
    cancelText: "Cancelar",
    tone: "danger",
    input: { label: "Motivo de suspensión", value: "suspendida por revisión", placeholder: "Escribe el motivo", multiline: true, rows: 3 }
  });
  if (reason === null) return;
  setAdminLoading("suspendiendo licencia");
  try {
    const result = await native?.admin?.suspend?.(id, reason || "suspendida por revisión");
    if (!result?.ok) throw new Error(result?.reason || "no se confirmó la suspensión");
    addLocalHistory(id, "suspendida", reason || "suspendida por revisión");
    toast(`Licencia ${id} suspendida.`, "warning");
    await refreshAdminLicenses({ silent: true });
  } catch (error) {
    setAdminError(error, "no se pudo suspender");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function reactivateAdminLicense(id) {
  const confirmed = await appDialog({
    title: "Reactivar licencia",
    message: "La licencia volverá a validar si no está vencida.",
    detail: id,
    confirmText: "Reactivar",
    cancelText: "Cancelar"
  });
  if (!confirmed) return;
  setAdminLoading("reactivando licencia");
  try {
    const result = await native?.admin?.reactivate?.(id, "reactivada por administrador");
    if (!result?.ok) throw new Error(result?.reason || "no se confirmó la reactivación");
    addLocalHistory(id, "reactivada", "reactivada por administrador");
    toast(`Licencia ${id} reactivada.`, "success");
    await refreshAdminLicenses({ silent: true });
  } catch (error) {
    setAdminError(error, "no se pudo reactivar");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function duplicateAdminLicense(id) {
  const source = licenseById(id);
  if (!source) return;
  const plan = await appDialog({
    title: "Duplicar licencia",
    message: "Se generará una nueva key para el mismo HWID.",
    detail: `${source.id}\nHWID: ${source.hwid}`,
    confirmText: "Duplicar",
    cancelText: "Cancelar",
    input: { label: "Plan de la nueva licencia", value: source.plan || "30d", placeholder: "1d, 7d, 15d, 30d o lifetime" }
  });
  if (plan === null) return;
  setAdminLoading("duplicando licencia");
  try {
    const nextPlan = normalizePlanInput(plan, source.plan || "30d");
    const result = await native?.admin?.create?.({ hwid: source.hwid, plan: nextPlan });
    ui.adminGeneratedKey = result?.licenseText || "";
    if (result?.license?.id) {
      addLocalHistory(result.license.id, "duplicada", `Duplicada desde ${source.id}`, { source_id: source.id });
      addLocalHistory(source.id, "duplicada", `Duplicada hacia ${result.license.id}`, { target_id: result.license.id });
    }
    toast(result?.license?.id ? `Licencia duplicada: ${result.license.id}` : "Licencia duplicada.", "success");
    await refreshAdminLicenses({ silent: true });
  } catch (error) {
    setAdminError(error, "no se pudo duplicar");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function renewAdminLicense(id) {
  const source = licenseById(id);
  if (!source) return;
  const plan = await appDialog({
    title: "Renovar licencia",
    message: "Se generará una nueva key para el mismo HWID y se revocará la anterior.",
    detail: `${source.id}\nHWID: ${source.hwid}`,
    confirmText: "Renovar",
    cancelText: "Cancelar",
    tone: "danger",
    input: { label: "Nuevo plan", value: "30d", placeholder: "1d, 7d, 15d, 30d o lifetime" }
  });
  if (plan === null) return;
  setAdminLoading("renovando licencia");
  try {
    const nextPlan = normalizePlanInput(plan, "30d");
    const result = await native?.admin?.create?.({ hwid: source.hwid, plan: nextPlan });
    if (!result?.license?.id) throw new Error("se generó la renovación, pero no se obtuvo ID de licencia");
    ui.adminGeneratedKey = result.licenseText || "";
    await native?.admin?.revoke?.(source.id, `renovada con nueva licencia ${result.license.id}`);
    addLocalHistory(source.id, "renovada", `Reemplazada por ${result.license.id}`, { replacement_id: result.license.id, plan: nextPlan });
    addLocalHistory(result.license.id, "renovación", `Renovación de ${source.id}`, { source_id: source.id, plan: nextPlan });
    toast(`Licencia renovada. Nueva key: ${result.license.id}`, "success");
    await refreshAdminLicenses({ silent: true });
  } catch (error) {
    setAdminError(error, "no se pudo renovar");
  } finally {
    clearAdminLoading();
    rerender();
  }
}

async function showAdminHistory(id) {
  setAdminLoading("cargando historial");
  let events = [];
  try {
    const result = await native?.admin?.history?.(id);
    events = result?.events || [];
    clearAdminError();
  } catch (error) {
    events = readLocalHistory().filter((item) => item.license_id === id);
    toast("Mostrando historial local porque no se pudo consultar Supabase.", "warning");
  } finally {
    ui.adminHistoryLicenseId = id;
    ui.adminHistoryEvents = events.length ? events : readLocalHistory().filter((item) => item.license_id === id);
    clearAdminLoading();
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
  setAdminLoading("reconectando panel");
  try {
    const result = await native.admin.resume();
    if (result?.ok) {
      applyAdminLoginResult(result);
      if (force) toast("Configuración guardada restaurada.", "success");
    } else {
      ui.adminConfig = result?.config || ui.adminConfig;
      if (force) setAdminError(result?.reason || "no hay configuración admin guardada");
    }
  } catch (error) {
    if (force) setAdminError(error, "no se pudo usar la configuración guardada");
  } finally {
    ui.adminResumeBusy = false;
    clearAdminLoading();
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
  clearAdminError();
  toast("Configuración admin borrada de este equipo.", "success");
  rerender();
}

async function logoutAdminSession() {
  const confirmed = await appDialog({
    title: "Cerrar sesión admin",
    message: "Saldrás del panel de licencias. La configuración guardada seguirá disponible si decides conservarla.",
    confirmText: "Cerrar sesión",
    cancelText: "Cancelar"
  });
  if (!confirmed) return;
  await native?.admin?.logout?.().catch(() => {});
  ui.adminAuthenticated = false;
  ui.adminLicenses = [];
  ui.adminGeneratedKey = "";
  ui.adminHistoryLicenseId = null;
  ui.adminHistoryEvents = [];
  clearAdminError();
  toast("Sesión admin cerrada.", "success");
  update((s) => { s.view = "settings"; });
}

function copyAdminLicense(id) {
  const license = licenseById(id);
  if (!license?.licenseText) {
    toast("No hay key guardada para copiar en esta fila.", "warning");
    return;
  }
  navigator.clipboard?.writeText(license.licenseText);
  toast("Licencia copiada al portapapeles.", "success");
}

function copyGeneratedLicense() {
  if (!ui.adminGeneratedKey) return;
  navigator.clipboard?.writeText(ui.adminGeneratedKey);
  toast("Nueva licencia copiada al portapapeles.", "success");
}

export function initAdminLicenseActions() {
  refreshAdminConfigInfo().then(() => rerender());
  const observer = new MutationObserver(() => { if (document.getElementById("adminLoginForm")) resumeAdminSession(); });
  observer.observe(root, { childList: true, subtree: true });

  document.addEventListener("submit", (event) => {
    if (event.target?.id === "licenseForm") { handleLicenseActivation(event); return; }
    if (event.target?.id === "adminLoginForm") { handleAdminLogin(event); return; }
    if (event.target?.id === "adminCreateLicenseForm") createAdminLicense(event);
  }, true);

  document.addEventListener("input", (event) => {
    const key = event.target?.dataset?.adminFilter;
    if (!key) return;
    ui.adminFilters ||= { search: "", status: "all", plan: "all" };
    ui.adminFilters[key] = event.target.value;
    rerender();
  }, true);

  document.addEventListener("change", (event) => {
    const key = event.target?.dataset?.adminFilter;
    if (!key) return;
    ui.adminFilters ||= { search: "", status: "all", plan: "all" };
    ui.adminFilters[key] = event.target.value;
    rerender();
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const handled = ["admin-resume", "admin-forget-config", "refresh-admin-licenses", "reset-admin-filters", "show-admin-history", "close-admin-history", "duplicate-admin-license", "renew-admin-license", "suspend-admin-license", "reactivate-admin-license", "revoke-admin-license", "logout-admin", "copy-admin-license", "copy-generated-license"].includes(action);
    if (handled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (action === "admin-resume") { ui.adminResumeTried = false; resumeAdminSession({ force: true }); return; }
    if (action === "admin-forget-config") { forgetAdminConfig(); return; }
    if (action === "refresh-admin-licenses") { refreshAdminLicenses(); return; }
    if (action === "reset-admin-filters") { ui.adminFilters = { search: "", status: "all", plan: "all" }; rerender(); return; }
    if (action === "show-admin-history") { showAdminHistory(target.dataset.id); return; }
    if (action === "close-admin-history") { ui.adminHistoryLicenseId = null; ui.adminHistoryEvents = []; rerender(); return; }
    if (action === "duplicate-admin-license") { duplicateAdminLicense(target.dataset.id); return; }
    if (action === "renew-admin-license") { renewAdminLicense(target.dataset.id); return; }
    if (action === "suspend-admin-license") { suspendAdminLicense(target.dataset.id); return; }
    if (action === "reactivate-admin-license") { reactivateAdminLicense(target.dataset.id); return; }
    if (action === "revoke-admin-license") { revokeAdminLicense(target.dataset.id); return; }
    if (action === "logout-admin") { logoutAdminSession(); return; }
    if (action === "copy-admin-license") { copyAdminLicense(target.dataset.id); return; }
    if (action === "copy-generated-license") copyGeneratedLicense();
  }, true);
}
