import { attr, esc } from "../helpers.js";
import { firefoxUserAgent, profileById } from "../utils.js";

export function renderBrowserActive(tab) {
  const profile = profileById(tab.profileId);
  const native = window.api || null;

  if (native) {
    const userAgent = profile?.fingerprint?.userAgent || firefoxUserAgent();
    return `
      <div class="webview-shell">
        <webview class="webview-frame" data-tab-id="${tab.id}" src="${attr(tab.url || "about:blank")}" partition="persist:gw-${attr(tab.profileId)}" useragent="${attr(userAgent)}" allowpopups></webview>
      </div>
    `;
  }

  return `
    <div class="panel-card" style="width:min(900px,100%);padding:28px;text-align:center">
      <div class="pill live">sesion aislada</div>
      <h2>${esc(tab.title || tab.url)}</h2>
      <p class="muted mono">${esc(tab.url)}</p>
      <p class="small-note">Abre con Electron para usar webview real y particiones persistentes por perfil.</p>
      <div class="flex right" style="justify-content:center;margin-top:18px">
        <button class="btn btn-primary" data-action="open-external" data-url="${attr(tab.url)}">abrir externo</button>
        <button class="btn btn-ghost" data-action="open-detection" data-id="${profile?.id || ""}" data-kind="creepjs">test deteccion</button>
      </div>
      <div class="small-note" style="margin-top:18px">Perfil: ${esc(profile?.name || "sin perfil")}</div>
    </div>
  `;
}
