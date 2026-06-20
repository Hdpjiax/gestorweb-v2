import { state, ui, load, render, setState, normalize, save, setRenderFn, setBindFn, native, defaults } from "./state.js";
import { renderShell } from "./views/index.js";
import { bind, initKeyboard, startScheduler } from "./actions.js";
import { clone } from "./helpers.js";

setRenderFn(renderShell);
setBindFn(bind);
initKeyboard();
startScheduler();

async function syncDeviceId() {
  const key = ["gestor-web-rebuild", "hwid"].join(":");
  const api = native && native.license;
  if (!api || !api.hwid || localStorage.getItem(key)) return;
  localStorage.setItem(key, await api.hwid());
}

async function bootstrap() {
  try {
    setState(normalize(await load()));
    await syncDeviceId();
  } catch (error) {
    console.error(error);
    setState(normalize(clone(defaults)));
  }
  ui.welcome = !!state.license && !state.onboardingSeen;
  render();
}

bootstrap();
