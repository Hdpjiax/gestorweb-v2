import { state, ui, load, render, setState, normalize, save, setRenderFn, setBindFn, native, defaults } from "./state.js";
import { renderShell } from "./views.js";
import { bind, initKeyboard, startScheduler } from "./actions.js";
import { clone } from "./helpers.js";

setRenderFn(renderShell);
setBindFn(bind);
initKeyboard();
startScheduler();

async function bootstrap() {
  try {
    setState(normalize(await load()));
    if (native?.license?.hwid && !localStorage.getItem("gestor-web-rebuild:hwid")) {
      localStorage.setItem("gestor-web-rebuild:hwid", await native.license.hwid());
    }
  } catch (error) {
    console.error(error);
    setState(normalize(clone(defaults)));
  }
  ui.welcome = !!state.license && !state.onboardingSeen;
  render();
}

bootstrap();
