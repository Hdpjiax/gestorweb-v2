import { state, update } from "./state.js";
import { logEvent, profileById, proxyById } from "./utils.js";

function usedProxyIds(exceptProfileId = null) {
  return new Set(
    state.profiles
      .filter((profile) => profile.id !== exceptProfileId)
      .map((profile) => profile.proxy_id)
      .filter(Boolean)
  );
}

function isUsableProxy(proxy) {
  const scheme = String(proxy?.scheme || "http").toLowerCase();
  const port = Number(proxy?.port);
  return ["http", "https", "socks4", "socks5"].includes(scheme)
    && typeof proxy?.host === "string"
    && !!proxy.host.trim()
    && Number.isInteger(port)
    && port >= 1
    && port <= 65535;
}

function freeProxy(exceptProfileId = null) {
  const used = usedProxyIds(exceptProfileId);
  const available = state.proxies.filter((proxy) => isUsableProxy(proxy) && !used.has(proxy.id));
  return available.find((proxy) => proxy.healthy)
    || available.find((proxy) => proxy.last_error === "sin test" || !proxy.last_error)
    || available[0]
    || null;
}

function validateFreeProxy(proxyId, exceptProfileId = null) {
  if (!proxyId) return { ok: false, error: "Selecciona un proxy libre." };
  const proxy = proxyById(proxyId);
  if (!proxy) return { ok: false, error: "Proxy no encontrado." };
  if (!isUsableProxy(proxy)) return { ok: false, error: "El proxy tiene un protocolo, host o puerto invalido." };
  const usedBy = state.profiles.find((item) => item.id !== exceptProfileId && item.proxy_id === proxyId);
  if (usedBy) return { ok: false, error: `Ese proxy ya esta asignado a ${usedBy.name || "otro perfil"}.` };
  return { ok: true, proxy };
}

function validateProxyForProfile(profileId, proxyId) {
  const profile = profileById(profileId);
  if (!profile) return { ok: false, error: "Perfil no encontrado." };
  if (!proxyId) return { ok: true, profile, proxy: null };
  const result = validateFreeProxy(proxyId, profileId);
  return result.ok ? { ...result, profile } : result;
}

function profileIsOpen(profileId) {
  return state.liveIds.includes(profileId)
    || state.browserTabs.some((tab) => tab.profileId === profileId);
}

function reloadProfileWebviews(profileId) {
  const tabIds = new Set(state.browserTabs.filter((tab) => tab.profileId === profileId).map((tab) => tab.id));
  document.querySelectorAll("webview[data-tab-id]").forEach((webview) => {
    if (tabIds.has(webview.dataset.tabId)) webview.reload?.();
  });
}

async function applyProxy(profileId, proxyId) {
  const result = validateProxyForProfile(profileId, proxyId);
  if (!result.ok) return alert(result.error);
  const previousProxyId = result.profile.proxy_id || null;
  const previousProxy = previousProxyId ? proxyById(previousProxyId) : null;

  update(() => {
    const profile = profileById(profileId);
    if (!profile) return;
    profile.proxy_id = proxyId || null;
    const payload = result.proxy ? `${result.proxy.scheme}://${result.proxy.host}:${result.proxy.port}` : "conexion directa";
    logEvent("rotate_proxy", profileId, payload);
  });

  if (!profileIsOpen(profileId) || !window.api?.proxies?.updateSession) return;
  try {
    const profile = profileById(profileId);
    await window.api.proxies.updateSession(profile, result.proxy);
    reloadProfileWebviews(profileId);
  } catch (error) {
    update(() => {
      const profile = profileById(profileId);
      if (profile) profile.proxy_id = previousProxyId;
    });
    try {
      const profile = profileById(profileId);
      if (profile) await window.api.proxies.updateSession(profile, previousProxy);
      reloadProfileWebviews(profileId);
    } catch {}
    alert(`No se pudo aplicar el proxy: ${error?.message || "error de conexion"}`);
  }
}

function autoAssignProxy(profileId) {
  const proxy = freeProxy(profileId);
  if (!proxy) return alert("No hay proxies libres. Agrega uno en la seccion Proxies.");
  return applyProxy(profileId, proxy.id);
}

function selectedProxyId() {
  return document.getElementById("proxyAssignSelect")?.value || "";
}

function guardProxyClick(event) {
  const target = event.target?.closest?.("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (!["assign-proxy", "assign-selected-proxy", "remove-proxy"].includes(action)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const profileId = target.dataset.id;
  if (action === "assign-proxy") autoAssignProxy(profileId);
  if (action === "assign-selected-proxy") applyProxy(profileId, selectedProxyId());
  if (action === "remove-proxy") applyProxy(profileId, null);
}

function guardNewProfileSubmit(event) {
  const form = event.target;
  if (form?.id !== "newProfileForm") return;
  const proxyId = String(new FormData(form).get("proxy_id") || "");
  if (!proxyId) return;
  const result = validateFreeProxy(proxyId);
  if (result.ok) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  alert(result.error);
}

export function installProxyAssignmentGuard() {
  document.addEventListener("click", guardProxyClick, true);
  document.addEventListener("submit", guardNewProfileSubmit, true);
}
