import { ui, rerender } from "./state.js";
import { installRendererUrlGuard } from "./url-guard.js";
import { installUxPolish } from "./ux-polish.js";
import { installBrowserNativeFix } from "./browser-native-fix.js";
import "./browser-soft-fonts.js";

const DEFAULT_SEARCH_HOME = "https://duckduckgo.com/";

function installBrowserProfileGuard() {
  document.addEventListener("change", (event) => {
    if (event.target?.id !== "browserProfile") return;
    ui.browserProfileId = event.target.value;
    ui.browserIp = null;
    ui.browserIpProfileId = null;
    ui.browserIpStatus = ui.browserProfileId ? "pendiente" : "sin perfil";
    if (ui.browserProfileId && !ui.browserUrl) ui.browserUrl = DEFAULT_SEARCH_HOME;
    rerender();
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if ((action === "browser-new-tab" || action === "browser-go" || action === "quick-open") && !ui.browserProfileId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert("Primero selecciona un perfil para abrir el navegador.");
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey && event.key.toLowerCase() === "t")) return;
    if (!ui.browserProfileId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert("Primero selecciona un perfil para abrir el navegador.");
    }
  }, true);
}

installRendererUrlGuard();
installUxPolish();
installBrowserNativeFix();
installBrowserProfileGuard();
