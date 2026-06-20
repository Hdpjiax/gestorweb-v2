import { state, ui, update, save, native } from "./state.js";
import { uid, esc, attr } from "./helpers.js";
import { normalizeUrl, profileById, proxyById } from "./utils.js";

const HOME = "https://duckduckgo.com/";
const SEARCH = "https://duckduckgo.com/?q=";
let mounted = false;
let busy = false;

export function installBrowserRedesign() {
  if (mounted) return;
  mounted = true;
  injectStyles();
  document.addEventListener("click", handleClick, true);
  document.addEventListener("submit", handleSubmit, true);
  document.addEventListener("keydown", handleKeys, true);
  new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true });
  requestAnimationFrame(sync);
}

function sync() {
  if (busy) return;
  busy = true;
  requestAnimationFrame(() => {
    const active = state.view === "browse";
    document.body.classList.toggle("gw-browser-mode", active);
    if (!active) { busy = false; return; }
    const content = document.querySelector(".content");
    if (!content) { busy = false; return; }
    const signature = JSON.stringify({
      active: state.activeTabId || null,
      picker: !!ui.browserProfilePicker,
      query: ui.browserProfileSearch || "",
      tabs: (state.browserTabs || []).map((t) => [t.id, t.title, t.url, t.profileId, !!t.loading])
    });
    const current = content.querySelector(".gw-browser-shell");
    if (!current || current.dataset.signature !== signature) {
      content.innerHTML = renderBrowser(signature);
      bindWebview();
    }
    busy = false;
  });
}

function allTabs() { state.browserTabs ||= []; return state.browserTabs; }
function activeTab() { return allTabs().find((t) => t.id === state.activeTabId) || allTabs()[0] || null; }
function profileFor(tab = activeTab()) { return tab?.profileId ? profileById(tab.profileId) : null; }
function safePartition(id) { return String(id || "default").replace(/[^a-zA-Z0-9_-]/g, ""); }

function toUrl(value) {
  const text = String(value || "").trim();
  if (!text) return HOME;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(text)) return `http://${text}`;
  if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(text)) return normalizeUrl(text);
  return `${SEARCH}${encodeURIComponent(text)}`;
}

function addressValue(tab) {
  if (!tab?.url || tab.url === HOME) return "";
  try {
    const url = new URL(tab.url);
    if (url.hostname.includes("duckduckgo.com") && url.searchParams.get("q")) return url.searchParams.get("q");
  } catch {}
  return tab.url;
}

function label(tab) {
  return String(tab?.title || tab?.url || "Nueva pestaña").replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 44);
}

function renderBrowser(signature) {
  const tabs = allTabs();
  const tab = activeTab();
  const profile = profileFor(tab);
  return `
    <section class="gw-browser-shell" data-signature="${attr(signature)}">
      <div class="gw-browser-top">
        <div class="gw-brand"><span></span><strong>Gestor Web</strong><small>v1.3.0</small><small class="mono">${esc(state.license?.shortId || "70EEB97046D")}</small></div>
        <div class="gw-status"><small>IP</small><b>midnight</b><b class="ok"><i></i> modo ahorro activo</b></div>
      </div>
      <div class="gw-tabs-line">
        <div class="gw-tabs">${tabs.map(renderTab).join("")}</div>
        <div class="gw-tabs-actions"><button title="Nueva pestaña (Ctrl+T)" data-gw="new-tab">+</button><button class="tor">⌁ TOR</button></div>
      </div>
      <form class="gw-toolbar" data-gw-form="address">
        <button type="button" data-gw="back" title="Atrás">‹</button>
        <button type="button" data-gw="forward" title="Adelante">›</button>
        <button type="button" data-gw="reload" title="Recargar">↻</button>
        <label class="gw-url"><span>▣</span><input id="gwAddressInput" name="address" autocomplete="off" spellcheck="false" placeholder="abre una pestaña" value="${attr(addressValue(tab))}"></label>
        <button type="submit" title="Buscar con DuckDuckGo">⌕</button>
        <button type="button" data-gw="devtools" title="DevTools (Ctrl+Shift+I)">&lt;/&gt;</button>
        <button type="button" data-gw="pin" title="Pinnear tab">♙</button>
        <button type="button" data-gw="mute" title="Silenciar tab">◔</button>
        <button type="button" data-gw="reload-all" title="Recargar todas las tabs">↻</button>
        <button type="button" class="profile" data-gw="choose-profile" title="Perfil activo">${esc(profile?.name || tab?.profileName || "asd")}</button>
      </form>
      <div class="gw-stage">${tab ? renderWebview(tab) : renderEmpty()}</div>
      ${ui.browserProfilePicker ? renderPicker() : ""}
    </section>`;
}

function renderTab(tab) {
  const active = tab.id === state.activeTabId;
  const p = tab.profileId ? profileById(tab.profileId) : null;
  return `<button class="gw-tab ${active ? "active" : ""}" data-gw="activate-tab" data-tab-id="${attr(tab.id)}" title="${attr(tab.url || "")}"><span>0</span><strong>${esc(label(tab))}</strong><small>${esc(p?.name || tab.profileName || "")}</small><i data-gw="close-tab" data-tab-id="${attr(tab.id)}">×</i></button>`;
}

function renderWebview(tab) {
  const p = tab.profileId ? profileById(tab.profileId) : null;
  const partition = tab.profileId ? `persist:gw-${safePartition(tab.profileId)}` : "persist:gw-browser-default";
  return `<webview class="gw-webview" data-gw-webview="${attr(tab.id)}" src="${attr(tab.url || HOME)}" partition="${attr(partition)}" allowpopups="true" useragent="${attr(p?.fingerprint?.userAgent || "")}"></webview>`;
}

function renderEmpty() {
  return `<div class="gw-empty"><div class="home">⌂</div><h1>Navegador embebido</h1><p>Abre una pestaña eligiendo perfil</p><button data-gw="new-tab" class="primary">+ nueva pestaña (Ctrl+T)</button><div class="quick-title">SITIOS UTILES</div><div class="quick-grid">${quick("https://check.torproject.org/", "check.torproject.org", "TOR")}${quick("https://creepjs.web.app/", "creepjs", "FP")}${quick("https://bot.sannysoft.com/", "bot.sannysoft", "FP")}${quick("https://browserleaks.com/", "browserleaks", "FP")}${quick("https://ipleak.net/", "ipleak.net", "IP")}${quick(HOME, "duckduckgo", "SEARCH")}</div></div>`;
}
function quick(url, text, tag) { return `<button data-gw="quick" data-url="${attr(url)}"><span>↗ ${esc(text)}</span><small>${esc(tag)}</small></button>`; }

function renderPicker() {
  const tab = activeTab();
  const active = profileFor(tab);
  const q = String(ui.browserProfileSearch || "").toLowerCase().trim();
  const profiles = (state.profiles || []).filter((p) => !q || [p.name, p.url, p.group_tag].filter(Boolean).join(" ").toLowerCase().includes(q));
  return `<div class="gw-picker-bg" data-gw="close-picker"><div class="gw-picker" data-picker-card><label><span>⌕</span><input id="gwProfileSearch" placeholder="elige perfil..." value="${attr(ui.browserProfileSearch || "")}"></label><div>${tab ? `<button data-gw="create-tab" data-profile-id="${attr(tab.profileId || "")}"><strong>Mismo perfil</strong><small>${esc(active?.name || tab.profileName || "asd")}</small></button>` : ""}${profiles.length ? profiles.map((p) => `<button data-gw="create-tab" data-profile-id="${attr(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.url || p.group_tag || "perfil aislado")}</small></button>`).join("") : `<button data-gw="create-tab" data-profile-id=""><strong>asd</strong><small>pestaña sin perfil</small></button>`}</div></div></div>`;
}

async function createTab(profileId = "", url = HOME) {
  const profile = profileId ? profileById(profileId) : null;
  const proxy = profile?.proxy_id ? proxyById(profile.proxy_id) : null;
  if (profile && native?.browse?.prepareSession) {
    try { await native.browse.prepareSession(profile, proxy); } catch (e) { console.warn(e); }
  }
  update((s) => {
    s.browserTabs ||= [];
    const tab = { id: uid("tab"), profileId: profile?.id || null, profileName: profile?.name || "asd", title: profile?.name ? `${profile.name} en DuckDuckGo` : "DuckDuckGo", url: url || profile?.url || HOME, createdAt: Date.now() };
    s.browserTabs.push(tab);
    s.activeTabId = tab.id;
    ui.browserProfilePicker = false;
    ui.browserProfileSearch = "";
  });
}

function patchTab(id, patch) {
  const tab = allTabs().find((t) => t.id === id);
  if (!tab) return;
  Object.assign(tab, patch);
  save();
  sync();
}

function currentWebview() {
  const tab = activeTab();
  return tab ? document.querySelector(`webview[data-gw-webview="${CSS.escape(tab.id)}"]`) : null;
}

function handleClick(event) {
  const el = event.target.closest?.("[data-gw]");
  if (!el || state.view !== "browse") return;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  const action = el.dataset.gw;
  const tab = activeTab();
  const webview = currentWebview();
  if (action === "new-tab") { ui.browserProfilePicker = true; ui.browserProfileSearch = ""; sync(); setTimeout(() => document.getElementById("gwProfileSearch")?.focus(), 40); return; }
  if (action === "close-picker") { if (!event.target.closest("[data-picker-card]")) { ui.browserProfilePicker = false; sync(); } return; }
  if (action === "create-tab") return createTab(el.dataset.profileId || "");
  if (action === "activate-tab") return update((s) => { s.activeTabId = el.dataset.tabId; });
  if (action === "close-tab") return update((s) => { s.browserTabs = (s.browserTabs || []).filter((t) => t.id !== el.dataset.tabId); if (s.activeTabId === el.dataset.tabId) s.activeTabId = s.browserTabs[0]?.id || null; });
  if (action === "choose-profile") { ui.browserProfilePicker = true; sync(); return; }
  if (action === "quick") return createTab(tab?.profileId || "", el.dataset.url || HOME);
  if (action === "back") { try { webview?.goBack(); } catch {} return; }
  if (action === "forward") { try { webview?.goForward(); } catch {} return; }
  if (action === "reload") { try { webview?.reload(); } catch {} return; }
  if (action === "reload-all") { document.querySelectorAll("webview[data-gw-webview]").forEach((w) => { try { w.reload(); } catch {} }); return; }
  if (action === "devtools") { try { webview?.openDevTools(); } catch {} return; }
  if (action === "mute") { try { webview?.setAudioMuted?.(!webview.isAudioMuted?.()); } catch {} return; }
  if (action === "pin" && tab) return patchTab(tab.id, { pinned: !tab.pinned });
}

function handleSubmit(event) {
  if (!event.target.matches?.("[data-gw-form='address']")) return;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  const tab = activeTab();
  const url = toUrl(event.target.elements.address?.value || "");
  if (!tab) return createTab("", url);
  update((s) => { const t = (s.browserTabs || []).find((x) => x.id === tab.id); if (t) { t.url = url; t.title = event.target.elements.address.value || "DuckDuckGo"; t.loading = true; } });
}

function handleKeys(event) {
  if (event.ctrlKey && event.key.toLowerCase() === "t") { event.preventDefault(); ui.browserProfilePicker = true; sync(); setTimeout(() => document.getElementById("gwProfileSearch")?.focus(), 40); }
  if (event.key === "Escape" && ui.browserProfilePicker) { ui.browserProfilePicker = false; sync(); }
  if (event.target?.id === "gwProfileSearch") setTimeout(() => { ui.browserProfileSearch = event.target.value; sync(); }, 0);
}

function bindWebview() {
  const tab = activeTab();
  if (!tab) return;
  const webview = currentWebview();
  if (!webview || webview.dataset.bound) return;
  webview.dataset.bound = "true";
  webview.addEventListener("did-start-loading", () => patchTab(tab.id, { loading: true }));
  webview.addEventListener("did-stop-loading", () => patchTab(tab.id, { loading: false }));
  webview.addEventListener("did-navigate", (e) => patchTab(tab.id, { url: e.url, loading: false }));
  webview.addEventListener("did-navigate-in-page", (e) => patchTab(tab.id, { url: e.url, loading: false }));
  webview.addEventListener("page-title-updated", (e) => patchTab(tab.id, { title: e.title || "DuckDuckGo" }));
  webview.addEventListener("did-fail-load", (e) => { if (e.errorCode !== -3) patchTab(tab.id, { loading: false, title: `Error ${e.errorCode}` }); });
}

function injectStyles() {
  if (document.getElementById("gw-browser-styles")) return;
  const style = document.createElement("style");
  style.id = "gw-browser-styles";
  style.textContent = `
body.gw-browser-mode .topbar{display:none!important}body.gw-browser-mode .content{padding:0!important;overflow:hidden;background:#05080d}.gw-browser-shell{height:100vh;display:grid;grid-template-rows:31px 38px 43px 1fr;background:#05080d;color:#e6edf7;overflow:hidden}.gw-browser-top{display:flex;justify-content:space-between;align-items:center;height:31px;padding:0 8px 0 14px;border-bottom:1px solid #1b2230;background:#0d131d;color:#728096;font-size:12px}.gw-brand,.gw-status{display:flex;align-items:center;gap:10px}.gw-brand strong{color:#fff}.gw-brand span:first-child{width:7px;height:7px;border-radius:50%;background:#8057ff;box-shadow:0 0 16px #8057ff}.gw-status b{border-radius:999px;padding:3px 10px;background:#121a27;color:#b8c5d8}.gw-status .ok{background:rgba(31,185,91,.15);color:#26e075}.gw-status i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#20d66b;margin-right:6px}.gw-tabs-line{height:38px;display:flex;align-items:end;justify-content:space-between;padding:0 9px 0 16px;border-bottom:1px solid #1a2230;background:#0b111a}.gw-tabs{display:flex;gap:4px;min-width:0;overflow:hidden}.gw-tab{position:relative;height:31px;min-width:138px;max-width:235px;padding:0 30px 0 13px;border:1px solid transparent;border-bottom:0;border-radius:9px 9px 0 0;background:#0d1420;color:#8b98ad;display:flex;align-items:center;gap:8px;cursor:pointer}.gw-tab.active{background:#111927;color:#fff;border-color:#1d2a3b}.gw-tab strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gw-tab small{margin-left:auto;color:#66758c;font-size:10px;text-transform:uppercase}.gw-tab i{position:absolute;right:8px;top:6px;opacity:0;font-style:normal}.gw-tab:hover i{opacity:1}.gw-tabs-actions{display:flex;gap:9px;align-items:center}.gw-tabs-actions button,.gw-toolbar button{border:0;background:transparent;color:#758398;cursor:pointer;border-radius:6px;height:30px}.gw-tabs-actions button:first-child{font-size:22px;color:#9ca8b9}.gw-tabs-actions .tor{font-weight:700;letter-spacing:.08em}.gw-toolbar{height:43px;display:grid;grid-template-columns:34px 34px 34px minmax(180px,1fr) 34px 45px 34px 34px 34px auto;gap:5px;align-items:center;padding:5px 8px;border-bottom:1px solid #1a2230;background:#0e151f}.gw-toolbar button:hover{background:#151f2e;color:#d7e0ef}.gw-url{height:30px;display:flex;align-items:center;border:1px solid #202b3b;border-radius:5px;background:#101823;min-width:0}.gw-url:focus-within{border-color:#8b5cf6;box-shadow:0 0 0 1px rgba(139,92,246,.35)}.gw-url span{width:27px;text-align:center;color:#27d978}.gw-url input{width:100%;height:100%;border:0;outline:0;background:transparent;color:#e9f0fa;font:600 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.gw-toolbar .profile{padding:0 12px;background:#111b28;color:#a9b7ca;font-weight:700}.gw-stage{min-height:0;background:#020402;overflow:hidden}.gw-webview{width:100%;height:100%;border:0;background:#fff}.gw-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:translateY(-18px);color:#8c99ad}.gw-empty .home{font-size:72px;color:#2f3b4e}.gw-empty h1{margin:0;color:#eef5ff;font-size:22px}.gw-empty p{margin:8px 0 18px;font-size:16px}.gw-empty .primary{border:0;border-radius:8px;padding:11px 18px;color:#fff;font-weight:800;background:linear-gradient(135deg,#7657ff,#8b5cf6);cursor:pointer}.quick-title{margin-top:58px;width:450px;color:#485568;font:700 11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em}.quick-grid{width:450px;display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.quick-grid button{height:28px;border:0;border-radius:4px;background:#111a27;color:#6d7d95;display:flex;align-items:center;justify-content:space-between;padding:0 12px;cursor:pointer;font:700 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.quick-grid small{color:#3f4c60}.gw-picker-bg{position:fixed;inset:0;z-index:1000;display:flex;justify-content:center;align-items:flex-start;padding-top:90px;background:rgba(0,0,0,.58);backdrop-filter:blur(7px)}.gw-picker{width:480px;border:1px solid #243043;border-radius:12px;background:#111925;box-shadow:0 28px 90px rgba(0,0,0,.62);overflow:hidden}.gw-picker label{height:48px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid #243043;color:#8291a7}.gw-picker input{width:100%;border:0;outline:0;background:transparent;color:#f2f6ff}.gw-picker div div{max-height:310px;overflow:auto}.gw-picker div button{width:100%;min-height:41px;border:0;border-bottom:1px solid rgba(255,255,255,.035);background:#141d2b;color:#e6eefb;display:flex;align-items:center;justify-content:space-between;gap:15px;padding:10px 17px;text-align:left;cursor:pointer}.gw-picker div button:hover{background:#1a2535}.gw-picker small{color:#7e8ca1;font:600 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
  document.head.appendChild(style);
}
