import { load, setState, normalize, defaults, setRenderFn, setBindFn, render, native, state, ui } from "./state.js";
import { clone } from "./helpers.js";
import { bind, startScheduler, initKeyboard, closeProfile } from "./actions.js";
import { renderShell, renderNetworkEntryList } from "./views/index.js";

let previewRefreshBusy = false;

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
    await Promise.all(state.liveIds.map(async (profileId) => {
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

async function init() {
  const stored = await load();
  setState(normalize({ ...clone(defaults), ...stored }));
  setRenderFn(renderShell);
  setBindFn(bind);
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
  }
  setInterval(refreshLivePreviews, 900);
  refreshLivePreviews();
}

init();
