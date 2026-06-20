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

function freeHealthyProxy(exceptProfileId = null) {
  const used = usedProxyIds(exceptProfileId);
  return state.proxies.find((proxy) => proxy.healthy && !used.has(proxy.id)) || null;
}

function validateProxyForProfile(profileId, proxyId) {
  const profile = profileById(profileId);
  if (!profile) return { ok: false, error: "Perfil no encontrado." };
  if (!proxyId) return { ok: false, error: "Selecciona un proxy libre." };

  const proxy = proxyById(proxyId);
  if (!proxy) return { ok: false, error: "Proxy no encontrado." };
  if (!proxy.healthy) return { ok: false, error: "Ese proxy no tiene test real OK. Ejecuta test real antes de asignarlo." };

  const usedBy = state.profiles.find((item) => item.id !== profileId && item.proxy_id === proxyId);
  if (usedBy) return { ok: false, error: `Ese proxy ya esta asignado a ${usedBy.name || "otro perfil"}.` };

  return { ok: true, profile, proxy };
}

function assignProxyById(profileId, proxyId) {
  const result = validateProxyForProfile(profileId, proxyId);
  if (!result.ok) {
    alert(result.error);
    return;
  }

  update(() => {
    const profile = profileById(profileId);
    if (!profile) return;
    profile.proxy_id = proxyId;
    logEvent("rotate_proxy", profileId, `${result.proxy.host}:${result.proxy.port}`);
  });
}

function autoAssignProxy(profileId) {
  const proxy = freeHealthyProxy(profileId);
  if (!proxy) {
    alert("No hay proxies libres con test real OK. Ve a Proxies y ejecuta test real; los que fallen por certificado no se asignan.");
    return;
  }
  assignProxyById(profileId, proxy.id);
}

function selectedProxyId() {
  return document.getElementById("proxyAssignSelect")?.value || "";
}

function guardProxyClick(event) {
  const target = event.target?.closest?.("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action !== "assign-proxy" && action !== "assign-selected-proxy") return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const profileId = target.dataset.id;
  if (action === "assign-proxy") autoAssignProxy(profileId);
  if (action === "assign-selected-proxy") assignProxyById(profileId, selectedProxyId());
}

function guardNewProfileSubmit(event) {
  const form = event.target;
  if (form?.id !== "newProfileForm") return;

  const proxyId = String(new FormData(form).get("proxy_id") || "");
  if (!proxyId) return;

  const result = validateProxyForProfile(null, proxyId);
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
