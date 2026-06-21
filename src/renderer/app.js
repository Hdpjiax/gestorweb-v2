import { load, setState, normalize, defaults, setRenderFn, setBindFn, render, native, state, ui } from "./state.js";
import { clone } from "./helpers.js";
import { bind, startScheduler, initKeyboard, closeProfile } from "./actions.js";
import { renderShell, renderNetworkEntryList } from "./views/index.js";

let previewRefreshBusy = false;
let globalIpBusy = false;
let previewTimer = null;
let ipTimer = null;

function mergeNetworkEvent(event) {
  if (!event?.id) return;
  const existing = state.netEntries.find((item) => item.id === event.id);
  if (existing) Object.assign(existing, event);
  else state.netEntries.unshift(event);
  state.netEntries = state.netEntries.slice(0, 500);
  if (state.view === "network") {
    const list = document.getElementById("networkEntries");
    if (list) list.innerHTML = renderNetworkEntryList();
  }
}

async function refreshLivePreviews() {
  if (previewRefreshBusy || !native?.profiles?.capturePreview || !state.liveIds.length) return;
  previewRefreshBusy = true;
  try {
    const economy = (state.settings.resourceMode || "economy") === "economy";
    const previewIds = economy
      ? [state.liveIds.find((id) => id === state.selectedId) || state.liveIds[0]].filter(Boolean)
      : state.liveIds;
    await Promise.all(previewIds.map(async (profileId) => {
      const result = await native.profiles.capturePreview(profileId).catch(() => null);
      if (!result?.ok || !result.dataUrl) return;
      ui.profilePreviews[profileId] = result.dataUrl;
      document.querySelectorAll(`[data-profile-preview="${CSS.escape(profileId)}"]`).forEach((image) => {
        if (image.src !== result.dataUrl) image.src = result.dataUrl;
      });
    }));
  } finally {
    previewRefreshBusy = false;
  }
}

function activeRouteContext() {
  const activeTab = state.browserTabs.find((tab) => tab.id === state.activeTabId);
  const profileId = activeTab?.profileId || state.liveIds.find((id) => id === state.selectedId) || state.liveIds[0] || null;
  const profile = state.profiles.find((item) => item.id === profileId) || null;
  const proxy = profile?.proxy_id ? state.proxies.find((item) => item.id === profile.proxy_id) : null;
  const route = profile?.tor_mode ? "TOR" : proxy ? `${proxy.scheme || "proxy"}://${proxy.host}:${proxy.port}` : "directo";
  return { profileId, route };
}

async function refreshGlobalIp() {
  if (globalIpBusy) return;
  globalIpBusy = true;
  try {
    const context = activeRouteContext();
    const result = context.profileId && native?.browse?.ipcheck
      ? await native.browse.ipcheck(context.profileId).catch(() => null)
      : await native?.license?.ipcheck?.().catch(() => null);
    ui.globalIp = result?.ip || "sin conexion";
    ui.globalIpRoute = context.route;
    const element = document.getElementById("globalIpValue");
    if (element) {
      element.textContent = ui.globalIp;
      element.parentElement.title = `Ruta: ${context.route}`;
    }
  } finally {
    globalIpBusy = false;
  }
}

function schedulePreviewRefresh() {
  clearTimeout(previewTimer);
  const economy = (state.settings.resourceMode || "economy") === "economy";
  previewTimer = setTimeout(async () => {
    await refreshLivePreviews();
    schedulePreviewRefresh();
  }, economy ? 4000 : 900);
}

function scheduleIpRefresh(delay = 150) {
  clearTimeout(ipTimer);
  ipTimer = setTimeout(async () => {
    await refreshGlobalIp();
    const economy = (state.settings.resourceMode || "economy") === "economy";
    scheduleIpRefresh(economy ? 30000 : 10000);
  }, delay);
}

async function init() {
  const stored = await load();
  setState(normalize({ ...clone(defaults), ...stored }));
  setRenderFn(renderShell);
  setBindFn(bind);
  const economy = (state.settings.resourceMode || "economy") === "economy";
  document.body.classList.toggle("resource-economy", economy);
  await native?.app?.setResourceMode?.(economy ? "economy" : "normal").catch(() => {});
  render();
  startScheduler();
  initKeyboard();

  // Escucha el evento push de main cuando una ventana de perfil se cierra
  // (usuario cierra la ventana externa con la X, alt+f4, etc.).
  // Ejecuta exactamente la misma limpieza que el botón "cerrar perfil".
  if (native?.on) {
    native.on("profiles:windowClosed", ({ id }) => {
      delete ui.profilePreviews[id];
      closeProfile(id).catch(() => {});
    });
    native.on("network:event", mergeNetworkEvent);
    native.on("license:invalidated", (status) => {
      update((next) => {
        next.license = { ...next.license, ...status, active: false };
        next.liveIds = [];
        next.browserTabs = [];
        next.activeTabId = null;
        next.view = "all";
      });
    });
  }
  schedulePreviewRefresh();
  scheduleIpRefresh();
}

init();
