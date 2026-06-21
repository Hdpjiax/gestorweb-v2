const params = new URLSearchParams(location.search);
const profileName = params.get("profileName") || "Perfil";
const partition = params.get("partition") || "";
const userAgent = params.get("userAgent") || "";
const engineMode = params.get("engineMode") || "chromium";
const startUrl = params.get("startUrl") || "";

const stage = document.getElementById("browserStage");
const blankSurface = document.getElementById("blankSurface");
const errorSurface = document.getElementById("errorSurface");
const errorText = document.getElementById("errorText");
const addressInput = document.getElementById("addressInput");
const tabTitle = document.getElementById("tabTitle");
const backButton = document.getElementById("backButton");
const forwardButton = document.getElementById("forwardButton");
const reloadButton = document.getElementById("reloadButton");
const securityIcon = document.getElementById("securityIcon");
const routeBadge = document.getElementById("routeBadge");
const engineLabel = document.getElementById("engineLabel");

let webview = null;
let currentUrl = "";
const themedCursorCss = `html,body,body * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='32' viewBox='0 0 28 32'%3E%3Cpath d='M3 2v24l6-6 5 10 6-3-5-9h9z' fill='%238b5cf6' stroke='%23060a12' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M5 5v15l4-4h9z' fill='%2367e8f9' opacity='.78'/%3E%3C/svg%3E") 3 2, auto !important; }`;

document.title = `${profileName} — Gestor Browser`;
engineLabel.textContent = engineMode === "camoufox" ? "Camoufox identity" : "Chromium identity";
routeBadge.textContent = profileName;

function searchUrl(query) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}

function normalizeAddress(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(?:\/.*)?$/i.test(text)) return `http://${text}`;
  if (/^[^\s]+\.[^\s]{2,}(?:\/.*)?$/i.test(text)) return `https://${text}`;
  return searchUrl(text);
}

function titleFor(url) {
  if (!url || url === "about:blank") return "New Tab";
  try { return new URL(url).hostname.replace(/^www\./, "") || "New Tab"; }
  catch { return "New Tab"; }
}

function setSecurity(url) {
  const secure = /^https:\/\//i.test(url);
  securityIcon.className = `security-icon ${secure ? "secure" : url ? "insecure" : ""}`;
  securityIcon.innerHTML = secure
    ? '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>';
}

function updateNavigation() {
  if (!webview) {
    backButton.disabled = true;
    forwardButton.disabled = true;
    return;
  }
  try { backButton.disabled = !webview.canGoBack(); } catch { backButton.disabled = true; }
  try { forwardButton.disabled = !webview.canGoForward(); } catch { forwardButton.disabled = true; }
}

function showBlank() {
  currentUrl = "";
  addressInput.value = "";
  tabTitle.textContent = "New Tab";
  blankSurface.hidden = false;
  errorSurface.hidden = true;
  setSecurity("");
  updateNavigation();
}

function bindWebview(view) {
  view.addEventListener("dom-ready", () => {
    syncWebviewBounds();
    view.insertCSS(themedCursorCss).catch(() => {});
  });
  view.addEventListener("did-start-loading", () => {
    reloadButton.classList.add("loading");
    errorSurface.hidden = true;
  });
  view.addEventListener("did-stop-loading", () => {
    reloadButton.classList.remove("loading");
    updateNavigation();
  });
  const navigated = (event) => {
    currentUrl = event.url || view.getURL();
    addressInput.value = currentUrl === "about:blank" ? "" : currentUrl;
    tabTitle.textContent = titleFor(currentUrl);
    setSecurity(currentUrl);
    updateNavigation();
  };
  view.addEventListener("did-navigate", navigated);
  view.addEventListener("did-navigate-in-page", navigated);
  view.addEventListener("page-title-updated", (event) => {
    tabTitle.textContent = event.title || titleFor(currentUrl);
  });
  view.addEventListener("did-fail-load", (event) => {
    if (event.errorCode === -3) return;
    reloadButton.classList.remove("loading");
    errorText.textContent = `${event.errorDescription || "Error de navegación"} (${event.errorCode})`;
    errorSurface.hidden = false;
  });
  view.addEventListener("new-window", (event) => {
    if (event.url) navigate(event.url);
  });
}

function syncWebviewBounds() {
  if (!webview) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  webview.style.width = `${width}px`;
  webview.style.height = `${height}px`;
}

const stageResizeObserver = new ResizeObserver(syncWebviewBounds);
stageResizeObserver.observe(stage);
window.addEventListener("resize", syncWebviewBounds);

function ensureWebview(url) {
  if (webview) return webview;
  webview = document.createElement("webview");
  webview.setAttribute("partition", partition);
  webview.setAttribute("allowpopups", "true");
  if (userAgent) webview.setAttribute("useragent", userAgent);
  bindWebview(webview);
  stage.appendChild(webview);
  syncWebviewBounds();
  webview.src = url;
  requestAnimationFrame(syncWebviewBounds);
  return webview;
}

function navigate(rawValue) {
  const url = normalizeAddress(rawValue);
  if (!url) return showBlank();
  currentUrl = url;
  blankSurface.hidden = true;
  errorSurface.hidden = true;
  addressInput.value = url;
  tabTitle.textContent = titleFor(url);
  setSecurity(url);
  const view = ensureWebview(url);
  if (view.getURL && view.getURL() && view.getURL() !== url) view.loadURL(url);
}

document.getElementById("addressForm").addEventListener("submit", (event) => {
  event.preventDefault();
  navigate(addressInput.value);
});

addressInput.addEventListener("focus", () => addressInput.select());
backButton.addEventListener("click", () => { if (webview?.canGoBack()) webview.goBack(); });
forwardButton.addEventListener("click", () => { if (webview?.canGoForward()) webview.goForward(); });
reloadButton.addEventListener("click", () => {
  if (!webview) return;
  try { webview.reload(); } catch {}
});
document.getElementById("retryButton").addEventListener("click", () => navigate(currentUrl || addressInput.value));

document.querySelectorAll("[data-window]").forEach((button) => {
  button.addEventListener("click", () => window.profileBrowser?.windowAction(button.dataset.window));
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey && key === "l") { event.preventDefault(); addressInput.focus(); addressInput.select(); }
  if ((event.ctrlKey && key === "r") || event.key === "F5") { event.preventDefault(); webview?.reload(); }
  if (event.altKey && event.key === "ArrowLeft" && webview?.canGoBack()) { event.preventDefault(); webview.goBack(); }
  if (event.altKey && event.key === "ArrowRight" && webview?.canGoForward()) { event.preventDefault(); webview.goForward(); }
  if (event.ctrlKey && key === "w") { event.preventDefault(); window.profileBrowser?.windowAction("close"); }
});

if (startUrl) navigate(startUrl);
else showBlank();
