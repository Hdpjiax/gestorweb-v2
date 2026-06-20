import { load, setState, normalize, defaults, setRenderFn, setBindFn, render, native } from "./state.js";
import { clone } from "./helpers.js";
import { bind, startScheduler, initKeyboard, closeProfile } from "./actions.js";
import { renderShell } from "./views/index.js";

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
      closeProfile(id).catch(() => {});
    });
  }
}

init();
