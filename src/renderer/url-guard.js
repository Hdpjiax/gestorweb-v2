const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const SEARCH_URL = "https://duckduckgo.com/?q=";

function hasExplicitScheme(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(String(value || "").trim()) || /^[a-z][a-z0-9+.-]*:/i.test(String(value || "").trim());
}

function parseUrl(value) {
  try {
    return new URL(String(value || "").trim());
  } catch {
    return null;
  }
}

function isSafeHttpNavigation(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (!hasExplicitScheme(text)) return true;
  const url = parseUrl(text);
  return !!url && HTTP_PROTOCOLS.has(url.protocol);
}

function isSafeExternalUrl(value) {
  const url = parseUrl(value);
  return !!url && EXTERNAL_PROTOCOLS.has(url.protocol);
}

function block(event, message) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  alert(message);
}

function guardClick(event) {
  const actionTarget = event.target.closest?.("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "browser-go") {
    const value = document.getElementById("browserUrl")?.value || "";
    if (!isSafeHttpNavigation(value)) block(event, "URL bloqueada. Solo se permite navegar a http:// o https://.");
    return;
  }

  if (action === "quick-open") {
    const value = actionTarget.dataset.url || "";
    if (!isSafeHttpNavigation(value)) block(event, "URL rapida bloqueada por seguridad.");
    return;
  }

  if (action === "open-external") {
    const value = actionTarget.dataset.url || "";
    if (!isSafeExternalUrl(value)) block(event, "Enlace externo bloqueado por seguridad.");
  }
}

function guardWebviews() {
  document.querySelectorAll("webview[src]").forEach((webview) => {
    const src = webview.getAttribute("src") || "";
    const url = parseUrl(src);
    if (src === "about:blank") return;
    if (!url || !HTTP_PROTOCOLS.has(url.protocol)) {
      webview.setAttribute("src", `${SEARCH_URL}${encodeURIComponent(src || "blocked")}`);
    }
  });
}

export function installRendererUrlGuard() {
  document.addEventListener("click", guardClick, true);
  const observer = new MutationObserver(guardWebviews);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  requestAnimationFrame(guardWebviews);
}
