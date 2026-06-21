import { state, ui, update, save, native } from "./state.js";
import { uid } from "./helpers.js";
import { profileById, proxyById, safeHost, activeWebview } from "./utils.js";

const HOME = "https://duckduckgo.com/";
const SEARCH = "https://duckduckgo.com/?q=";
let installed = false;
let observer = null;

export function installBrowserNativeFix() {
  if (installed) return;
  installed = true;
  injectStyles();
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeys, true);
  observer = new MutationObserver(decorateBrowser);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  requestAnimationFrame(decorateBrowser);
}

function decorateBrowser() {
  const isBrowser = state.view === "browse";
  document.body.classList.toggle("native-browser-mode", isBrowser);
  if (!isBrowser) return;
  const browser = document.querySelector(".browser");
  if (!browser) return;
  if (!browser.querySelector(".browser-brandbar")) {
    const brand = document.createElement("div");
    brand.className = "browser-brandbar";
    brand.innerHTML = `<div class="browser-brand-left"><span class="brand-dot"></span><strong>Gestor Web</strong><small>v1.3.0</small><small class="mono">${state.license?.shortId || "70EEB97046D"}</small></div><div class="browser-brand-right"><small>IP</small><b>midnight</b><b class="save-pill"><i></i> modo ahorro activo</b></div>`;
    browser.prepend(brand);
  }
  const toolbar = browser.querySelector(".browser-toolbar");
  if (toolbar && !toolbar.querySelector("[data-native-browser='forward']")) {
    const go = toolbar.querySelector("[data-action='browser-go']");
    const extra = document.createElement("div");
    extra.className = "browser-extra-tools";
    extra.innerHTML = `<button class="browser-tool" data-native-browser="forward" title="Adelante">›</button><button class="browser-tool" data-native-browser="devtools" title="DevTools (Ctrl+Shift+I)">&lt;/&gt;</button><button class="browser-tool" data-native-browser="pin" title="Pinnear tab">♙</button><button class="browser-tool" data-native-browser="mute" title="Silenciar tab">◔</button><button class="browser-tool" data-native-browser="reload-all" title="Recargar todas las tabs">↻</button><button class="browser-profile-chip" data-native-browser="picker" title="Cambiar perfil">${activeProfileName()}</button>`;
    if (go) go.insertAdjacentElement("afterend", extra);
    else toolbar.appendChild(extra);
  }
  const url = document.getElementById("browserUrl");
  if (url) url.placeholder = "abre una pestaña";
}

function activeProfileName() {
  const tab = state.browserTabs.find((item) => item.id === state.activeTabId);
  return profileById(tab?.profileId)?.name || profileById(ui.browserProfileId)?.name || "asd";
}

function toBrowserUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(text)) return `http://${text}`;
  if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
  return `${SEARCH}${encodeURIComponent(text)}`;
}

function currentProfileId() {
  const active = state.browserTabs.find((item) => item.id === state.activeTabId);
  return active?.profileId || ui.browserProfileId || state.selectedId || state.profiles[0]?.id || "";
}

async function prepareProfile(profileId) {
  const profile = profileById(profileId);
  if (!profile) return;
  if (native?.browse?.prepareSession) {
    await native.browse.prepareSession(profile, profile.proxy_id ? proxyById(profile.proxy_id) : null);
  }
}

async function openNewBrowserTab(profileId = currentProfileId(), rawUrl = "") {
  const profile = profileById(profileId);
  const url = toBrowserUrl(rawUrl || profile?.url || "");
  if (profile) await prepareProfile(profile.id);
  update((s) => {
    s.browserTabs ||= [];
    const tab = { id: uid("tab"), profileId: profile?.id || "", url, title: safeHost(url) };
    s.browserTabs.push(tab);
    s.activeTabId = tab.id;
    s.view = "browse";
    if (profile?.id && !s.liveIds.includes(profile.id)) s.liveIds.push(profile.id);
    ui.browserProfileId = profile?.id || "";
    ui.browserUrl = url;
  });
}

async function navigateActiveTab(rawUrl) {
  const active = state.browserTabs.find((item) => item.id === state.activeTabId);
  const profileId = active?.profileId || currentProfileId();
  const profile = profileById(profileId);
  const url = toBrowserUrl(rawUrl || ui.browserUrl || HOME);
  if (profile) await prepareProfile(profile.id);
  if (!active) return openNewBrowserTab(profile?.id || "", url);
  update((s) => {
    const tab = s.browserTabs.find((item) => item.id === active.id);
    if (!tab) return;
    tab.profileId = profile?.id || tab.profileId || "";
    tab.url = url;
    tab.title = safeHost(url);
    ui.browserProfileId = tab.profileId;
    ui.browserUrl = url;
  });
}

function showPicker() {
  closePicker();
  const active = state.browserTabs.find((item) => item.id === state.activeTabId);
  const overlay = document.createElement("div");
  overlay.className = "browser-profile-picker";
  overlay.innerHTML = `<div class="browser-picker-card"><label><span>⌕</span><input id="browserPickerSearch" placeholder="elige perfil..." autofocus></label><div class="browser-picker-list"></div></div>`;
  document.body.appendChild(overlay);
  const render = () => {
    const query = overlay.querySelector("input").value.trim().toLowerCase();
    const rows = [];
    if (active?.profileId) rows.push({ id: active.profileId, title: "Mismo perfil", sub: profileById(active.profileId)?.name || "perfil activo" });
    for (const p of state.profiles || []) {
      if (query && ![p.name, p.url, p.group_tag].filter(Boolean).join(" ").toLowerCase().includes(query)) continue;
      rows.push({ id: p.id, title: p.name, sub: p.url || p.group_tag || "perfil aislado" });
    }
    if (!rows.length) rows.push({ id: "", title: "asd", sub: "pestaña sin perfil" });
    overlay.querySelector(".browser-picker-list").innerHTML = rows.map((row) => `<button data-picker-profile="${row.id}"><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.sub)}</small></button>`).join("");
  };
  overlay.addEventListener("input", render);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePicker();
    const row = event.target.closest("[data-picker-profile]");
    if (row) {
      const profileId = row.dataset.pickerProfile || "";
      closePicker();
      openNewBrowserTab(profileId, HOME);
    }
  });
  render();
  setTimeout(() => overlay.querySelector("input")?.focus(), 30);
}

function closePicker() {
  document.querySelector(".browser-profile-picker")?.remove();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function handleClick(event) {
  const nativeButton = event.target.closest?.("[data-native-browser]");
  if (nativeButton && state.view === "browse") {
    event.preventDefault();
    event.stopPropagation();
    const action = nativeButton.dataset.nativeBrowser;
    const webview = activeWebview();
    if (action === "picker") return showPicker();
    if (action === "forward") return webview?.goForward?.();
    if (action === "devtools") return webview?.openDevTools?.();
    if (action === "pin") return;
    if (action === "mute") return webview?.setAudioMuted?.(!webview?.isAudioMuted?.());
    if (action === "reload-all") return document.querySelectorAll("webview[data-tab-id]").forEach((item) => item.reload?.());
  }
  const action = event.target.closest?.("[data-action]")?.dataset.action;
  if (state.view !== "browse") return;
  if (action === "browser-new-tab") {
    event.preventDefault();
    event.stopPropagation();
    return showPicker();
  }
  if (action === "quick-open") {
    event.preventDefault();
    event.stopPropagation();
    return openNewBrowserTab(currentProfileId(), event.target.closest("[data-action]").dataset.url || HOME);
  }
  if (action === "browser-go") {
    event.preventDefault();
    event.stopPropagation();
    return navigateActiveTab(document.getElementById("browserUrl")?.value || ui.browserUrl || HOME);
  }
}

function handleKeys(event) {
  if (event.ctrlKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    showPicker();
  }
  if (event.key === "Escape") closePicker();
}

function injectStyles() {
  if (document.getElementById("browser-native-fix-styles")) return;
  const style = document.createElement("style");
  style.id = "browser-native-fix-styles";
  style.textContent = `
body.native-browser-mode .topbar{display:none!important}body.native-browser-mode .content{padding:0!important;overflow:hidden;background:#05080d}.browser{height:100vh;background:#05080d;color:#e6edf7}.browser-brandbar{height:31px;padding:0 10px 0 14px;border-bottom:1px solid #1b2230;background:#0d131d;display:flex;align-items:center;justify-content:space-between;color:#728096;font-size:12px}.browser-brand-left,.browser-brand-right{display:flex;align-items:center;gap:10px}.browser-brand-left strong{color:#fff}.brand-dot{width:7px;height:7px;border-radius:50%;background:#8057ff;box-shadow:0 0 16px #8057ff}.browser-brand-right b{background:#121a27;color:#b8c5d8;border-radius:999px;padding:3px 10px}.browser-brand-right .save-pill{background:rgba(31,185,91,.15);color:#26e075}.browser-brand-right i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#20d66b;margin-right:6px}.browser-tabs{height:38px;padding:0 9px 0 16px;background:#0b111a;border-bottom:1px solid #1a2230;align-items:end}.browser-tab-wrap{height:31px;border-radius:9px 9px 0 0;background:#0d1420;border:1px solid transparent;border-bottom:0}.browser-tab-wrap.active{background:#111927;border-color:#1d2a3b}.browser-tab{height:30px;min-width:138px;max-width:235px;background:transparent!important;color:#8b98ad!important;border:0!important;border-radius:9px 9px 0 0!important;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.browser-tab-wrap.active .browser-tab{color:#fff!important}.tab-close{height:30px;color:#65748a}.browser-tabs>.btn{height:30px;border:0;background:transparent;color:#9ca8b9;font-size:0;padding:0 11px}.browser-tabs>.btn::before{content:'+';font-size:22px}.browser-toolbar{height:43px;padding:5px 8px;background:#0e151f;border-bottom:1px solid #1a2230;display:grid;grid-template-columns:34px 34px 180px minmax(200px,1fr) 34px auto auto;gap:5px}.browser-toolbar .btn,.browser-tool{height:30px;border:0!important;background:transparent!important;color:#758398!important;border-radius:6px;padding:0 9px}.browser-toolbar .btn:hover,.browser-tool:hover,.browser-profile-chip:hover{background:#151f2e!important;color:#d7e0ef!important}.browser-toolbar .btn[data-action=browser-back]{font-size:0}.browser-toolbar .btn[data-action=browser-back]::before{content:'‹';font-size:24px}.browser-toolbar .btn[data-action=browser-reload]{font-size:0}.browser-toolbar .btn[data-action=browser-reload]::before{content:'↻';font-size:20px}.browser-toolbar .btn[data-action=browser-go]{font-size:0}.browser-toolbar .btn[data-action=browser-go]::before{content:'⌕';font-size:18px}.browser-toolbar .pill{border:0;background:#111b28;color:#7f8ca3}.browser-toolbar #browserProfile{height:30px;background:#101823;border:1px solid #202b3b;color:#a9b7ca;border-radius:5px}.browser-toolbar #browserUrl{height:30px;background:#101823;border:1px solid #202b3b;color:#e9f0fa;border-radius:5px;font:600 13px JetBrains Mono,Consolas,monospace}.browser-toolbar #browserUrl:focus{border-color:#8b5cf6;box-shadow:0 0 0 1px rgba(139,92,246,.35)}.browser-extra-tools{display:flex;align-items:center;gap:5px}.browser-profile-chip{height:30px;border:0;border-radius:6px;background:#111b28;color:#a9b7ca;font-weight:700;padding:0 12px}.browser-stage{padding:0;background:#020402;place-items:stretch}.webview-shell{border:0;border-radius:0;background:#fff}.webview-frame{border:0}.browser-stage>.panel-card{align-self:center;justify-self:center}.browser-stage h2{color:#eef5ff}.quick-grid{width:450px;grid-template-columns:1fr 1fr;gap:7px;margin:18px auto 0}.quick-link{height:28px;border:0;border-radius:4px;background:#111a27;color:#6d7d95;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font:700 12px JetBrains Mono,Consolas,monospace}.quick-link .pill{order:2;background:transparent;color:#3f4c60}.browser-profile-picker{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding-top:90px;background:rgba(0,0,0,.58);backdrop-filter:blur(7px)}.browser-picker-card{width:480px;border:1px solid #243043;border-radius:12px;background:#111925;box-shadow:0 28px 90px rgba(0,0,0,.62);overflow:hidden}.browser-picker-card label{height:48px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid #243043;color:#8291a7}.browser-picker-card input{width:100%;border:0;outline:0;background:transparent;color:#f2f6ff}.browser-picker-list{max-height:310px;overflow:auto}.browser-picker-list button{width:100%;min-height:41px;border:0;border-bottom:1px solid rgba(255,255,255,.035);background:#141d2b;color:#e6eefb;display:flex;align-items:center;justify-content:space-between;gap:15px;padding:10px 17px;text-align:left;cursor:pointer}.browser-picker-list button:hover{background:#1a2535}.browser-picker-list small{color:#7e8ca1;font:600 12px JetBrains Mono,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
  document.head.appendChild(style);
}
