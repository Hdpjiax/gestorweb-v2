import { ui } from "../state.js";
import { renderOriginalView } from "./original-view.js";

function parseWithDom(html) {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const appShell = doc.querySelector(".app-shell");
  return [...doc.body.children]
    .filter((node) => node !== appShell)
    .map((node) => node.outerHTML)
    .join("");
}

function parseWithMarkers(html) {
  const closeShell = "</div>";
  const marker = "app-shell";
  if (!html.includes(marker)) return "";
  const firstOverlay = ["modal-backdrop", "palette"].map((needle) => html.indexOf(needle)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return firstOverlay >= 0 ? html.slice(Math.max(0, html.lastIndexOf("<", firstOverlay))) : "";
}

export function renderLegacyOverlays() {
  if (!ui.newProfile && !ui.welcome && !ui.command && !ui.cookieProfileId) return "";
  const html = renderOriginalView();
  return parseWithDom(html) || parseWithMarkers(html);
}
