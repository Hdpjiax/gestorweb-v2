import { uid, shortId, clone } from "./helpers.js";
import { state, ui, update, rerender, render, save, liveSet, native, root, setState, normalize, defaults } from "./state.js";
import { profileById, proxyById, filteredProfiles, logEvent, normalizeUrl, safeHost, pLabel, activeWebview, updateBrowserTab, bindInput } from "./utils.js";
import { templates, ICONS } from "./icons.js";
import { makeFingerprint, presetValues } from "./fingerprint.js";
import { normalizeProxy, parseProxyBulk, proxyKey } from "./proxy-parser.js";

export function bind() {
  root.onclick = handleClick;
  const licenseForm = document.getElementById("licenseForm");
  if (licenseForm) licenseForm.onsubmit = activateLicense;
  const profileForm = document.getElementById("newProfileForm");
  if (profileForm) profileForm.onsubmit = createProfile;
  const proxyAdd = document.getElementById("proxyAddForm");
  if (proxyAdd) proxyAdd.onsubmit = addProxy;
  const proxyBulk = document.getElementById("proxyBulkForm");
  if (proxyBulk) proxyBulk.onsubmit = bulkImportProxies;
  const schedule = document.getElementById("scheduleForm");
  if (schedule) schedule.onsubmit = addSchedule;
  const notes = document.getElementById("notesForm");
  if (notes) notes.onsubmit = saveNotes;
  const totp = document.getElementById("totpForm");
  if (totp) totp.onsubmit = saveTotp;
  const repeater = document.getElementById("repeaterForm");
  if (repeater) repeater.onsubmit = sendRepeater;
  const adminLogin = document.getElementById("adminLoginForm");
  if (adminLogin) adminLogin.onsubmit = loginAdmin;
  const adminCreate = document.getElementById("adminCreateLicenseForm");
  if (adminCreate) adminCreate.onsubmit = createAdminLicense;
  bindInput("searchInput", (el) => update((s) => { s.filters.search = el.value; }));
  bindInput("proxyFilter", (el) => update((s) => { s.filters.proxyState = el.value; }));
  bindInput("groupFilter", (el) => update((s) => { s.filters.group = el.value; }));
  bindInput("browserProfile", (el) => { ui.browserProfileId = el.value; });
  bindInput("browserUrl", (el) => { ui.browserUrl = el.value; });
  const commandInput = document.getElementById("commandInput");
  if (commandInput) {
    commandInput.focus();
    commandInput.oninput = () => { ui.commandQuery = commandInput.value; rerender(); };
  }
  if (ui.newProfile) {
    const nameInput = document.querySelector("#newProfileForm input[name=name]");
    if (nameInput) nameInput.focus();
  }
  bindWebviews();
  bindModalSubtitles();
}

function bindModalSubtitles() {
  const modal = document.getElementById("newProfileForm");
  if (!modal) return;
  const subtitleMap = {
    privacy: {
      none: "sin capas extra",
      standard: "tracker-block · strip-utm · no-clienthints · DoH",
      hardened: "tracker-block · strip-utm · no-clienthints · no-referrer · DoH · spoof-extremo · auto-wipe",
      anonymous: "tracker-block · strip-utm · no-clienthints · no-referrer · DoH · spoof-extremo · memoria · auto-wipe · TOR en 127.0.0.1:9050"
    },
    engine: {
      "Firefox / Camoufox (indetectable)": "identidad Firefox / Camoufox aplicada a la sesion aislada del perfil",
      "Chromium (compatibilidad)": "identidad Chromium aplicada a la sesion aislada del perfil"
    },
    mode: {
      normal: "spoofs agresivos ON · maximo anti-fingerprint · captchas duros pueden fallar",
      compatibilidad: "reduce agresividad de spoofs para mejorar compatibilidad"
    }
  };
  const getSubtitle = (name) => {
    const checked = modal.querySelector(`input[name="${name}"]:checked`);
    if (!checked) return "";
    const val = checked.value;
    return subtitleMap[name]?.[val] || "";
  };
  const updatePrivacySubtitle = () => {
    const el = document.getElementById("privacy-subtitle");
    if (el) el.textContent = getSubtitle("privacy");
  };
  const updateEngineSubtitle = () => {
    const el = document.getElementById("engine-subtitle");
    if (el) el.textContent = getSubtitle("engine");
  };
  const updateModeSubtitle = () => {
    const el = document.getElementById("mode-subtitle");
    if (el) el.textContent = getSubtitle("mode");
  };
  modal.addEventListener("change", (e) => {
    if (e.target.name === "privacy") updatePrivacySubtitle();
    if (e.target.name === "engine") updateEngineSubtitle();
    if (e.target.name === "mode") updateModeSubtitle();
    if (e.target.name === "template_id") {
      ui.profileTemplateId = e.target.value;
      const template = templates.find((item) => item.id === e.target.value);
      if (!template) return;
      const resolution = modal.querySelector('[name="resolution"]');
      const timezone = modal.querySelector('[name="timezone"]');
      const locale = modal.querySelector('[name="locale"]');
      if (resolution) {
        const option = [...resolution.options].find((item) => item.value.startsWith(`${template.width}x${template.height}`));
        if (option) resolution.value = option.value;
      }
      if (timezone) timezone.value = template.timezone;
      if (locale) locale.value = template.locale;
      const engineValue = template.browser.includes("Firefox") ? "Firefox / Camoufox (indetectable)" : "Chromium (compatibilidad)";
      const engine = [...modal.querySelectorAll('input[name="engine"]')].find((item) => item.value === engineValue);
      if (engine) engine.checked = true;
      updateEngineSubtitle();
    }
  });
}

function bindWebviews() {
  document.querySelectorAll("webview[data-tab-id]").forEach((webview) => {
    const tabId = webview.dataset.tabId;
    webview.addEventListener("did-navigate", (event) => updateBrowserTab(tabId, { url: event.url }));
    webview.addEventListener("did-navigate-in-page", (event) => updateBrowserTab(tabId, { url: event.url }));
    webview.addEventListener("page-title-updated", (event) => updateBrowserTab(tabId, { title: event.title }));
    webview.addEventListener("did-fail-load", (event) => {
      if (event.errorCode === -3) return;
      state.netEntries.unshift({ id: uid("net"), method: "WEBVIEW", url: event.validatedURL || webview.src, status: event.errorCode, ts: Date.now() });
      state.netEntries = state.netEntries.slice(0, 50);
      save();
    });
  });
}

function openNewProfileModal() {
  ui.newProfile = true;
  ui.profileAdvanced = false;
  ui.profileTemplateId = "win_firefox_mx";
  rerender();
}

function closeNewProfileModal() {
  ui.newProfile = false;
  ui.profileAdvanced = false;
  ui.profileTemplateId = "win_firefox_mx";
  rerender();
}

function toggleProfileAdvanced() {
  ui.profileAdvanced = !ui.profileAdvanced;
  const fields = document.getElementById("profileAdvancedFields");
  const button = document.querySelector('[data-action="toggle-profile-advanced"]');
  if (fields) fields.hidden = !ui.profileAdvanced;
  if (button) button.textContent = `${ui.profileAdvanced ? "ocultar" : "mostrar"} avanzado`;
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "close-modal" && target.classList.contains("modal-backdrop") && event.target.closest("[data-modal-card]")) return;
  const id = target.dataset.id;
  if (action !== "select-profile") event.stopPropagation();

  const actions = {
    "copy-hwid": () => navigator.clipboard?.writeText(target.dataset.hwid),
    "import-license": () => alert("Importador .gw pendiente. Pega la licencia en el textarea para activar esta replica."),
    "set-view": () => update((s) => { s.view = target.dataset.view; }),
    "new-profile": () => openNewProfileModal(),
    "close-modal": () => closeNewProfileModal(),
    "toggle-profile-advanced": () => toggleProfileAdvanced(),
    "select-profile": () => update((s) => { s.selectedId = id; }),
    "open-profile": () => openProfile(id, { openWindow: true, focusBrowser: true, createTab: true }),
    "close-profile": () => closeProfile(id),
    "focus-profile": () => focusProfile(id),
    "clone-profile": () => cloneProfile(id),
    "wipe-profile": () => wipeProfile(id),
    "delete-profile": () => deleteProfile(id),
    "open-profile-path": () => openProfilePath(id),
    "toggle-profile-flag": () => toggleProfileFlag(id, target.dataset.key),
    "apply-preset": () => applyPreset(id, target.dataset.preset),
    "assign-proxy": () => assignProxy(id),
    "remove-proxy": () => update((s) => { profileById(id).proxy_id = null; logEvent("rotate_proxy", id, "proxy removido"); }),
    "set-inspector-tab": () => { ui.inspectorTab = target.dataset.tab; rerender(); },
    "refresh-fingerprint": () => update((s) => { profileById(id).fingerprint.noiseSeed = Math.floor(Math.random() * 1e9); }),
    "open-detection": () => openDetection(id, target.dataset.kind),
    "open-cookies": () => openCookies(id),
    "close-cookies": () => { ui.cookieProfileId = null; ui.cookieSearch = ""; rerender(); },
    "add-cookie": () => addCookie(id),
    "clear-cookies": () => clearCookies(id),
    "delete-cookie": () => deleteCookie(id, { domain: target.dataset.domain, name: target.dataset.name }),
    "save-cookies": () => saveCookies(id),
    "import-cookies": () => {
      const text = prompt("Pega las cookies en formato JSON array:");
      if (text) importCookies(id, text);
    },
    "set-cookie-search": () => { ui.cookieSearch = target.value; rerender(); },
    "copy-totp": () => copyTotp(id),
    "add-macro": () => addMacro(id),
    "warmup": () => warmup(id),
    "run-macro": () => runMacro(id, target.dataset.macro),
    "toggle-proxy-add": () => { ui.proxyAdding = !ui.proxyAdding; rerender(); },
    "toggle-proxy-bulk": () => { ui.proxyBulk = !ui.proxyBulk; rerender(); },
    "health-check": () => healthCheck(),
    "toggle-proxy-selected": () => toggleProxySelected(id),
    "toggle-all-proxies": () => toggleAllProxies(),
    "remove-selected-proxies": () => removeSelectedProxies(),
    "remove-all-proxies": () => removeAllProxies(),
    "remove-dead-proxies": () => removeDeadProxies(),
    "remove-proxy-row": () => removeProxy(id),
    "toggle-schedule-add": () => { ui.scheduleAdding = !ui.scheduleAdding; rerender(); },
    "toggle-schedule": () => update((s) => { const item = s.schedules.find((x) => x.id === id); if (item) item.enabled = !item.enabled; }),
    "remove-schedule": () => update((s) => { s.schedules = s.schedules.filter((x) => x.id !== id); }),
    "welcome-prev": () => { ui.welcomeStep = Math.max(0, (ui.welcomeStep || 0) - 1); rerender(); },
    "welcome-next": () => { ui.welcomeStep = Math.min(3, (ui.welcomeStep || 0) + 1); rerender(); },
    "close-welcome": () => closeWelcome(false),
    "welcome-create": () => closeWelcome(true),
    "open-command": () => { ui.command = true; ui.commandQuery = ""; rerender(); },
    "run-command": () => runCommand(target.dataset.run),
    "browser-new-tab": () => browserNewTab(),
    "close-browser-tab": () => { const tabId = target.dataset.id; update((s) => { s.browserTabs = s.browserTabs.filter((t) => t.id !== tabId); if (s.activeTabId === tabId) s.activeTabId = s.browserTabs[0]?.id || null; }); },
    "browser-go": () => browserGo(),
    "quick-open": () => { ui.browserUrl = target.dataset.url; browserGo(); },
    "activate-browser-tab": () => update((s) => { s.activeTabId = target.dataset.id; }),
    "open-external": () => native?.app?.openExternal ? native.app.openExternal(target.dataset.url) : window.open(target.dataset.url, "_blank", "noopener"),
    "browser-back": () => activeWebview()?.goBack(),
    "browser-reload": () => activeWebview()?.reload(),
    "toggle-chromium": () => update((s) => { s.settings.chromiumReady = true; logEvent("chromium_installed", null, "simulado"); }),
    "toggle-tor": () => detectTor(),
    "toggle-resource-mode": () => toggleResourceMode(),
    "refresh-admin-licenses": () => refreshAdminLicenses(),
    "logout-admin": () => logoutAdmin(),
    "copy-admin-license": () => copyAdminLicense(id),
    "copy-generated-license": () => navigator.clipboard?.writeText(ui.adminGeneratedKey || ""),
    "revoke-admin-license": () => revokeAdminLicense(id),
    "load-network-entry": () => loadNetworkEntry(id),
    "clear-network-log": () => {
      ui.networkSelectedId = null;
      ui.repeaterDraft = null;
      ui.repeaterOutput = "";
      update((s) => { s.netEntries = []; });
    },
    "open-data-dir": () => native?.app?.openDataDir?.(),
    "export-vault": () => exportVault(),
    "import-vault": () => importVault(),
    "reset-data": () => resetData()
  };
  actions[action]?.();
}

async function activateLicense(event) {
  event.preventDefault();
  const text = document.getElementById("licenseText").value.trim();
  if (!text) return alert("Pega una key o contenido .gw para activar esta replica.");
  if (!native?.license?.claimByKey) return alert("Activacion real solo disponible en Electron.");
  const nativeStatus = await native.license.claimByKey(text);
  if (!nativeStatus.active) {
    return alert(`Licencia invalida para este HWID (${nativeStatus.hwid || "desconocido"}).\nVerifica que la key fue generada para este dispositivo.`);
  }
  ui.welcome = true;
  update((s) => {
    s.license = { active: true, text, shortId: shortId(12), hwid: nativeStatus.hwid || null, activatedAt: Date.now() };
  });
}

function createProfile(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = String(data.get("name") || "").trim();
  if (!name) return;
  const privacy = data.get("privacy") || "standard";
  const preset = presetValues(privacy);
  const template = templates.find((t) => t.id === data.get("template_id")) || templates[0];
  const resolution = String(data.get("resolution") || `${template.width}x${template.height}`).replace(/\s.+$/, "");
  const [width, height] = resolution.split("x").map((n) => parseInt(n, 10));
  const profile = {
    id: uid("prof"),
    name,
    url: normalizeUrl(String(data.get("url") || "").trim()),
    group_tag: String(data.get("group_tag") || "").trim() || null,
    proxy_id: data.get("proxy_id") || null,
    template_id: template.id,
    privacy_preset: privacy,
    gw_engine: data.get("engine") !== "Chromium (compatibilidad)",
    compat_mode: data.get("mode") === "compatibilidad",
    headless: data.get("headless") === "on",
    har_enabled: data.get("har_enabled") === "on",
    webrtc_block: data.get("webrtc_block") === "on" || !ui.profileAdvanced,
    totp_secret: String(data.get("totp_secret") || "").trim() || null,
    notes: "",
    cookies: [],
    macros: [],
    warmup: 0,
    open_count: 0,
    created_at: Date.now(),
    fingerprint: makeFingerprint(template, {
      width: width || template.width,
      height: height || template.height,
      timezone: data.get("timezone") || template.timezone,
      locale: data.get("locale") || template.locale
    }),
    ...preset
  };
  // Cerrar y reiniciar el modal ANTES de renderizar el nuevo estado.
  // `update` reconstruye el DOM; hacerlo despues dejaba el formulario viejo visible.
  ui.newProfile = false;
  ui.profileAdvanced = false;
  ui.profileTemplateId = "win_firefox_mx";
  update((s) => {
    s.profiles.unshift(profile);
    s.selectedId = profile.id;
    logEvent("created", profile.id, profile.url || "sin URL");
  });
}

async function openProfile(id, options = {}) {
  const profile = profileById(id);
  if (!profile) return;
  let proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;

  if (proxy && native?.proxies?.check) {
    const checked = await native.proxies.check(proxy).catch((error) => ({ ...proxy, healthy: false, https_tunnel: false, last_error: error?.message || "test HTTPS fallido" }));
    update((s) => {
      const index = s.proxies.findIndex((item) => item.id === proxy.id);
      if (index >= 0) s.proxies[index] = { ...s.proxies[index], ...checked, id: proxy.id };
    });
    if (!checked.healthy || !checked.https_tunnel) {
      alert(`El proxy ${proxy.host}:${proxy.port} responde, pero no puede crear un tunel HTTPS.\n\n${checked.last_error || "CONNECT rechazado"}\n\nSelecciona otro proxy para evitar ERR_TUNNEL_CONNECTION_FAILED.`);
      return;
    }
    proxy = { ...proxy, ...checked };
  }

  if (options.openWindow && native?.profiles?.openWindow) {
    let result;
    try {
      result = await native.profiles.openWindow(profile, proxy, profile.url || null);
    } catch (error) {
      alert(`No se pudo abrir el perfil: ${error?.message || "error de red"}`);
      return;
    }
    if (result?.ok) {
      update((s) => {
        if (!s.liveIds.includes(id)) s.liveIds.push(id);
        const p = profileById(id);
        if (p) {
          p.open_count = (p.open_count || 0) + 1;
          p.warmup = Math.max(p.warmup || 0, Math.floor(20 + Math.random() * 35));
          p._windowMode = result.mode || "electron";
        }
        logEvent("opened", id, `ventana externa (${result.mode || "window"})`);
      });
      return;
    }
  }

  if (native?.browse?.prepareSession && profile) await native.browse.prepareSession(profile, proxy);
  update((s) => {
    if (!s.liveIds.includes(id)) s.liveIds.push(id);
    const p = profileById(id);
    if (p) {
      p.open_count = (p.open_count || 0) + 1;
      p.warmup = Math.max(p.warmup || 0, Math.floor(20 + Math.random() * 35));
    }
    if (options.createTab && p) {
      const startUrl = p.url || "";
      let tab = s.browserTabs.find((item) => item.profileId === id && item.url === startUrl);
      if (!tab) {
        tab = { id: uid("tab"), profileId: id, url: startUrl, title: safeHost(startUrl) };
        s.browserTabs.push(tab);
      }
      s.activeTabId = tab.id;
      ui.browserProfileId = id;
      ui.browserUrl = startUrl;
    }
    if (options.focusBrowser) s.view = "browse";
    logEvent("opened", id, pLabel(id));
  });
}

async function focusProfile(id) {
  if (native?.profiles?.focusWindow) await native.profiles.focusWindow(id);
}

async function closeProfile(id) {
  if (native?.profiles?.closeWindow) await native.profiles.closeWindow(id);
  const profile = profileById(id);
  if (native?.cookies?.clear && (profile?.in_memory || profile?.auto_wipe_close)) await native.cookies.clear(id);
  update((s) => {
    s.liveIds = s.liveIds.filter((x) => x !== id);
    s.browserTabs = s.browserTabs.filter((t) => t.profileId !== id);
    if (s.activeTabId && !s.browserTabs.find((t) => t.id === s.activeTabId)) s.activeTabId = s.browserTabs[0]?.id || null;
    const p = profileById(id);
    if (p?._windowMode) delete p._windowMode;
    if (p?.in_memory || p?.auto_wipe_close) p.cookies = [];
    if (p?.auto_wipe_close) logEvent("auto_wiped_on_close", id);
    logEvent("closed", id, pLabel(id));
  });
}

function cloneProfile(id) {
  const source = profileById(id);
  if (!source) return;
  update((s) => {
    const copy = clone(source);
    copy.id = uid("prof");
    copy.name = `${source.name} copia`;
    copy.created_at = Date.now();
    copy.open_count = 0;
    copy.warmup = 0;
    copy.fingerprint.canvas = `gw-${shortId(10).toLowerCase()}`;
    copy.fingerprint.audio = `gw-${shortId(10).toLowerCase()}`;
    copy.fingerprint.noiseSeed = Math.floor(Math.random() * 1e9);
    s.profiles.unshift(copy);
    s.selectedId = copy.id;
    logEvent("created", copy.id, "clonado");
  });
}

async function wipeProfile(id) {
  if (!confirm("Borrar cookies/cache?")) return;
  if (native?.cookies?.clear) await native.cookies.clear(id);
  update(() => {
    const p = profileById(id);
    if (p) p.cookies = [];
    logEvent("wiped", id, "cookies/cache");
  });
}

async function deleteProfile(id) {
  const name = profileById(id)?.name || "este perfil";
  if (!confirm(`Eliminar "${name}"? Esta accion no se puede deshacer.`)) return;
  if (native?.profiles?.closeWindow) await native.profiles.closeWindow(id);
  update((s) => {
    s.profiles = s.profiles.filter((p) => p.id !== id);
    s.liveIds = s.liveIds.filter((x) => x !== id);
    s.browserTabs = s.browserTabs.filter((t) => t.profileId !== id);
    if (s.selectedId === id) s.selectedId = s.profiles[0]?.id || null;
    logEvent("deleted", id, name);
  });
}

function openProfilePath(id) {
  if (native?.profiles?.openPath) {
    native.profiles.openPath(id);
  } else if (native?.app?.openExternal) {
    native.app.openExternal(`file://${profileById(id)?.fingerprint?.profileDir || ""}`);
  }
  logEvent("opened", id, "profile path");
}

function toggleProfileFlag(id, key) {
  update(() => {
    const p = profileById(id);
    if (p) p[key] = !p[key];
  });
}

function applyPreset(id, preset) {
  update(() => {
    const p = profileById(id);
    if (p) Object.assign(p, presetValues(preset), { privacy_preset: preset });
    logEvent("preset", id, preset);
  });
}

function assignProxy(id) {
  update((s) => {
    const p = profileById(id);
    if (!p) return;
    const used = new Set(s.profiles.map((x) => x.proxy_id).filter(Boolean));
    const free = s.proxies.find((x) => x.healthy && !used.has(x.id)) || s.proxies.find((x) => !used.has(x.id));
    if (!free) return alert("No hay proxies libres");
    p.proxy_id = free.id;
    logEvent("rotate_proxy", id, `${free.host}:${free.port}`);
  });
}

function addProxy(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const parsed = normalizeProxy({
    scheme: data.get("scheme"),
    host: String(data.get("host") || "").trim(),
    port: data.get("port"),
    username: String(data.get("username") || "").trim() || null,
    password: String(data.get("password") || "").trim() || null,
    label: String(data.get("label") || "").trim() || null
  });
  if (!parsed) return alert("Proxy invalido. Usa host:port o completa host/puerto correctamente.");
  ui.proxyAdding = false;
  update((s) => {
    s.proxies.unshift({ id: uid("proxy"), healthy: false, latency_ms: null, last_error: "sin test", ...parsed });
    logEvent("proxy_added", null, parsed.host);
  });
}

function bulkImportProxies(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const scheme = data.get("scheme") || "http";
  const parsed = parseProxyBulk(String(data.get("bulk") || ""), scheme);
  let added = 0;
  let duplicates = 0;
  ui.proxyBulk = false;
  ui.selectedProxyIds.clear();
  update((s) => {
    const existing = new Set(s.proxies.map(proxyKey));
    for (const item of parsed.proxies) {
      const key = proxyKey(item);
      if (existing.has(key)) {
        duplicates++;
        continue;
      }
      existing.add(key);
      s.proxies.unshift({ id: uid("proxy"), healthy: false, latency_ms: null, last_error: "sin test", ...item });
      added++;
    }
    logEvent("proxy_bulk_import", null, `${added} agregados desde ${parsed.format}`);
  });
  alert(`${added} agregados. ${parsed.invalid + duplicates} omitidos (${parsed.invalid} invalidos, ${duplicates} duplicados). Formato detectado: ${parsed.format}`);
}

function toggleProxySelected(id) {
  if (!id) return;
  if (ui.selectedProxyIds.has(id)) ui.selectedProxyIds.delete(id);
  else ui.selectedProxyIds.add(id);
  rerender();
}

function toggleAllProxies() {
  if (ui.selectedProxyIds.size === state.proxies.length) ui.selectedProxyIds.clear();
  else ui.selectedProxyIds = new Set(state.proxies.map((p) => p.id));
  rerender();
}

function removeSelectedProxies() {
  const ids = new Set(ui.selectedProxyIds);
  if (!ids.size) return;
  if (!confirm(`Eliminar ${ids.size} proxies seleccionados?`)) return;
  removeProxySet(ids, "proxy_bulk_removed", `${ids.size} seleccionados`);
}

function removeAllProxies() {
  if (!state.proxies.length) return;
  if (!confirm(`Eliminar TODOS los ${state.proxies.length} proxies? Esta accion no se puede deshacer.`)) return;
  removeProxySet(new Set(state.proxies.map((p) => p.id)), "proxy_all_removed", `${state.proxies.length} proxies`);
}

function removeDeadProxies() {
  const ids = new Set(state.proxies.filter((p) => !p.healthy && p.last_error && p.last_error !== "sin test").map((p) => p.id));
  if (!ids.size) return alert("No hay proxies caidos con test real. Ejecuta 'test real' primero.");
  if (!confirm(`Eliminar ${ids.size} proxies caidos?`)) return;
  removeProxySet(ids, "proxy_dead_removed", `${ids.size} caidos`);
}

function removeProxySet(ids, eventKind, payload) {
  const affectedProfileIds = state.profiles.filter((profile) => ids.has(profile.proxy_id)).map((profile) => profile.id);
  ids.forEach((id) => ui.selectedProxyIds.delete(id));
  update((s) => {
    s.proxies = s.proxies.filter((p) => !ids.has(p.id));
    s.profiles.forEach((p) => { if (ids.has(p.proxy_id)) p.proxy_id = null; });
    logEvent(eventKind, null, payload);
  });
  syncProfilesWithoutProxy(affectedProfileIds);
}

async function loginAdmin(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  ui.adminError = "";
  try {
    const result = await native?.admin?.login?.(data.get("serverUrl"), data.get("credential"));
    ui.adminAuthenticated = !!result?.ok;
    ui.adminServerUrl = result?.serverUrl || String(data.get("serverUrl") || "");
    ui.adminLicenses = result?.licenses || [];
  } catch (error) {
    ui.adminAuthenticated = false;
    ui.adminError = error?.message || "no se pudo iniciar sesion admin";
  }
  rerender();
}

async function refreshAdminLicenses() {
  try {
    const result = await native?.admin?.list?.();
    ui.adminLicenses = result?.licenses || [];
    ui.adminError = "";
  } catch (error) {
    ui.adminError = error?.message || "no se pudieron cargar las licencias";
  }
  rerender();
}

async function createAdminLicense(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const payload = {
    hwid: String(data.get("hwid") || "").trim(),
    platform: data.get("platform"),
    plan: data.get("plan"),
    tier: data.get("tier"),
    features: String(data.get("features") || "standard").split(",").map((item) => item.trim()).filter(Boolean)
  };
  try {
    const result = await native?.admin?.create?.(payload);
    ui.adminGeneratedKey = result?.licenseText || "";
    ui.adminError = "";
    await refreshAdminLicenses();
  } catch (error) {
    ui.adminError = error?.message || "no se pudo generar la licencia";
    rerender();
  }
}

function copyAdminLicense(id) {
  const license = ui.adminLicenses.find((item) => item.id === id);
  if (license?.licenseText) navigator.clipboard?.writeText(license.licenseText);
}

async function revokeAdminLicense(id) {
  if (!confirm(`Revocar ${id}? El equipo quedara bloqueado en su siguiente validacion.`)) return;
  const reason = prompt("Motivo de revocacion:", "revocada por administrador") || "revocada por administrador";
  try {
    await native?.admin?.revoke?.(id, reason);
    await refreshAdminLicenses();
  } catch (error) {
    ui.adminError = error?.message || "no se pudo revocar";
    rerender();
  }
}

async function logoutAdmin() {
  await native?.admin?.logout?.().catch(() => {});
  ui.adminAuthenticated = false;
  ui.adminLicenses = [];
  ui.adminGeneratedKey = "";
  update((s) => { s.view = "settings"; });
}

function syncProfilesWithoutProxy(profileIds) {
  if (!native?.proxies?.updateSession) return;
  for (const profileId of profileIds) {
    const profile = profileById(profileId);
    if (!profile || !state.liveIds.includes(profileId)) continue;
    native.proxies.updateSession(profile, null).catch(() => {});
  }
}

async function healthCheck() {
  if (!native?.proxies?.check) return alert("El test real de proxies requiere ejecutar la app en Electron.");
  const proxies = state.proxies.map((proxy) => clone(proxy));
  if (!proxies.length) return alert("No hay proxies para testear.");

  ui.proxyTesting = true;
  ui.testingProxyIds = new Set(proxies.map((proxy) => proxy.id));
  rerender();

  let next = 0;
  const concurrency = Math.min(5, proxies.length);
  const runNext = async () => {
    while (next < proxies.length) {
      const proxy = proxies[next++];
      let checked;
      try {
        checked = await native.proxies.check(proxy);
      } catch (error) {
        checked = { ...proxy, healthy: false, latency_ms: null, last_error: error?.message || "test fallido" };
      }
      update((s) => {
        const index = s.proxies.findIndex((item) => item.id === proxy.id);
        if (index >= 0) s.proxies[index] = { ...s.proxies[index], ...checked, id: proxy.id };
        ui.testingProxyIds.delete(proxy.id);
      });
    }
  };

  try {
    await Promise.all(Array.from({ length: concurrency }, runNext));
  } finally {
    ui.proxyTesting = false;
    ui.testingProxyIds.clear();
    update(() => {
      logEvent("health_check", null, `${proxies.length} proxies`);
    });
  }
}

function removeProxy(id) {
  const affectedProfileIds = state.profiles.filter((profile) => profile.proxy_id === id).map((profile) => profile.id);
  ui.selectedProxyIds.delete(id);
  update((s) => {
    s.proxies = s.proxies.filter((p) => p.id !== id);
    s.profiles.forEach((p) => { if (p.proxy_id === id) p.proxy_id = null; });
    logEvent("proxy_removed", null, id);
  });
  syncProfilesWithoutProxy(affectedProfileIds);
}

function addSchedule(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  update((s) => {
    s.schedules.unshift({
      id: uid("task"),
      profile_id: data.get("profile_id"),
      every_minutes: parseInt(data.get("every"), 10) || 60,
      action: data.get("action"),
      duration_minutes: parseInt(data.get("duration"), 10) || null,
      enabled: true,
      next_run_at: Date.now() + (parseInt(data.get("every"), 10) || 60) * 60 * 1000
    });
    logEvent("schedule_added", data.get("profile_id"), data.get("action"));
  });
  ui.scheduleAdding = false;
}

function saveNotes(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const id = event.currentTarget.dataset.id;
  update(() => {
    const p = profileById(id);
    if (!p) return;
    p.name = String(data.get("name") || p.name);
    p.url = normalizeUrl(String(data.get("url") || ""));
    p.group_tag = String(data.get("group_tag") || "").trim() || null;
    p.notes = String(data.get("notes") || "");
    logEvent("updated", id, "notas");
  });
}

function saveTotp(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.id;
  const secret = String(new FormData(event.currentTarget).get("totp") || "").trim().replace(/\s+/g, "").toUpperCase();
  if (secret && !/^[A-Z2-7]+=*$/.test(secret)) return alert("TOTP secret invalido. Debe ser base32.");
  update(() => {
    const p = profileById(id);
    if (p) p.totp_secret = secret || null;
  });
}

async function copyTotp(id) {
  const secret = profileById(id)?.totp_secret;
  if (!secret) return;
  if (!native?.totp?.code) return alert("TOTP real disponible al abrir con Electron.");
  const result = await native.totp.code(secret);
  await navigator.clipboard?.writeText(result.code);
  alert(`Codigo ${result.code} copiado. Expira en ${result.secondsLeft}s.`);
}

async function openCookies(id) {
  ui.cookieSearch = "";
  if (native?.cookies?.get) {
    const cookies = await native.cookies.get(id);
    const profile = profileById(id);
    if (profile) profile.cookies = cookies;
    save();
  }
  ui.cookieProfileId = id;
  rerender();
}

async function addCookie(id) {
  const cookie = { domain: new URL(profileById(id)?.url || "https://example.com").hostname, name: `gw_${shortId(4).toLowerCase()}`, value: shortId(16), expires: "session" };
  if (native?.cookies?.set) await native.cookies.set(id, [cookie]);
  update(() => {
    const p = profileById(id);
    if (!p) return;
    p.cookies ||= [];
    p.cookies.push(cookie);
    logEvent("cookies_imported", id, "demo");
  });
}

async function clearCookies(id) {
  if (native?.cookies?.clear) await native.cookies.clear(id);
  update(() => {
    const p = profileById(id);
    if (p) p.cookies = [];
    logEvent("cookies_cleared", id);
  });
}

async function deleteCookie(profileId, cookie) {
  if (native?.cookies?.delete) {
    const updated = await native.cookies.delete(profileId, cookie);
    update(() => {
      const p = profileById(profileId);
      if (p) p.cookies = updated;
    });
  } else {
    update(() => {
      const p = profileById(profileId);
      if (p) p.cookies = (p.cookies || []).filter((c) => !(c.domain === cookie.domain && c.name === cookie.name));
    });
  }
}

async function saveCookies(profileId) {
  const p = profileById(profileId);
  if (!p?.cookies) return;
  if (native?.cookies?.set) {
    const updated = await native.cookies.set(profileId, p.cookies);
    p.cookies = updated;
  }
  save();
  logEvent("cookies_saved", profileId, `${p.cookies.length} cookies`);
}

async function importCookies(profileId, text) {
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return;
    const cleaned = arr.map((c) => ({ domain: c.domain || "", name: c.name || `gw_${shortId(4)}`, value: String(c.value || ""), path: c.path || "/", expires: c.expires || "session", secure: c.secure !== false }));
    if (native?.cookies?.set) {
      const updated = await native.cookies.set(profileId, cleaned);
      update(() => { const p = profileById(profileId); if (p) p.cookies = updated; });
    } else {
      update(() => { const p = profileById(profileId); if (p) p.cookies = cleaned; });
    }
    logEvent("cookies_imported", profileId, `${cleaned.length} cookies`);
  } catch {}
}

function addMacro(id) {
  const name = prompt("Nombre de macro", "warmup basico");
  if (!name) return;
  update(() => {
    const p = profileById(id);
    if (!p) return;
    p.macros ||= [];
    p.macros.push({ id: uid("macro"), name, steps: [{ kind: "goto", url: p.url || "https://duckduckgo.com" }, { kind: "wait", ms: 1200 }, { kind: "scroll", y: 650 }] });
    logEvent("macro_added", id, name);
  });
}

function warmup(id) {
  update(() => {
    const p = profileById(id);
    if (!p) return;
    p.warmup = Math.min(100, (p.warmup || 0) + Math.floor(25 + Math.random() * 35));
    logEvent("macro_run", id, "warmup");
  });
}

function runMacro(id, macroId) {
  update(() => {
    const p = profileById(id);
    const macro = p?.macros?.find((m) => m.id === macroId);
    logEvent("macro_run", id, macro?.name || macroId);
  });
}

async function openDetection(id, kind) {
  const urls = {
    creepjs: "https://abrahamjuliot.github.io/creepjs/",
    sannysoft: "https://bot.sannysoft.com/",
    pixelscan: "https://pixelscan.net/fingerprint-check"
  };
  const profile = profileById(id);
  if (profile && !state.liveIds.includes(id)) await openProfile(id);
  ui.browserProfileId = id;
  ui.browserUrl = urls[kind] || urls.creepjs;
  await browserGo();
}

async function browserNewTab() {
  const profileId = ui.browserProfileId || state.selectedId || state.profiles[0]?.id;
  if (!profileId) return alert("Crea un perfil primero (Ctrl+N)");
  ui.browserProfileId = profileId;
  const profile = profileById(profileId);
  ui.browserUrl = profile?.url || "";
  await browserGo();
}

async function browserGo() {
  const prevProfileId = state.browserTabs.find((t) => t.id === state.activeTabId)?.profileId;
  const profileId = ui.browserProfileId || state.selectedId;
  if (!profileId) return alert("elige perfil...");
  const rawUrl = String(ui.browserUrl || profileById(profileId)?.url || "").trim();
  let url = rawUrl ? normalizeUrl(rawUrl) : "";
  if (rawUrl && (rawUrl.includes(" ") || !rawUrl.includes("."))) url = `https://duckduckgo.com/?q=${encodeURIComponent(rawUrl)}`;
  const profile = profileById(profileId);
  if (profile) {
    if (native?.browse?.prepareSession) {
      if (prevProfileId && prevProfileId !== profileId) {
        if (native?.cookies?.clear) await native.cookies.clear(prevProfileId);
        await native.browse.freshenMemory?.(prevProfileId);
      }
      await native.browse.prepareSession(profile, profile.proxy_id ? proxyById(profile.proxy_id) : null);
    }
  }
  update((s) => {
    if (!s.liveIds.includes(profileId)) s.liveIds.push(profileId);
    if (prevProfileId && prevProfileId !== profileId) {
      s.browserTabs = s.browserTabs.filter((t) => t.profileId !== profileId);
    }
    const tab = { id: uid("tab"), profileId, url, title: safeHost(url) };
    s.browserTabs.push(tab);
    s.activeTabId = tab.id;
    s.view = "browse";
    logEvent("opened", profileId, url);
  });
}

async function sendRepeater(event) {
  event.preventDefault();
  if (!native?.repeater?.send) {
    ui.repeaterOutput = JSON.stringify({ error: "Repeater real solo disponible en Electron. Abre la app con 'npm start'." }, null, 2);
    rerender();
    return;
  }
  const data = new FormData(event.currentTarget);
  const method = data.get("method");
  const profileId = String(data.get("profileId") || "");
  const url = data.get("url") || "https://example.com";
  const headers = Object.fromEntries(
    String(data.get("headers") || "").split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf(":");
        return index === -1 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
  const body = data.get("body") || "";
  ui.repeaterDraft = { profileId, method, url: String(url), headers: String(data.get("headers") || ""), body: String(body) };
  const response = await native.repeater.send({ profileId, method, url, headers, body });
  ui.repeaterOutput = JSON.stringify(response, null, 2);
  update((s) => {
    s.netEntries.unshift({ id: uid("net"), profileId, profileName: profileById(profileId)?.name || "Repeater", method, url, requestHeaders: headers, body, status: response.status, phase: "repeater", ts: Date.now(), completedAt: Date.now() });
    s.netEntries = s.netEntries.slice(0, 500);
  });
}

function loadNetworkEntry(id) {
  const entry = state.netEntries.find((item) => item.id === id);
  if (!entry) return;
  ui.networkSelectedId = id;
  ui.repeaterDraft = {
    profileId: entry.profileId || "",
    method: entry.method || "GET",
    url: entry.url || "",
    headers: Object.entries(entry.requestHeaders || {}).map(([name, value]) => `${name}: ${value}`).join("\n"),
    body: entry.body || ""
  };
  rerender();
}

async function detectTor() {
  const result = native?.tor?.detect ? await native.tor.detect() : { healthy: false, last_error: "Electron no disponible" };
  update((s) => {
    s.settings.torReady = !!result.healthy;
    logEvent(result.healthy ? "tor_detected" : "tor_missing", null, result.healthy ? `127.0.0.1:9050 ${result.latency_ms || 0}ms` : (result.last_error || "no detectado"));
  });
}

async function toggleResourceMode() {
  const nextMode = (state.settings.resourceMode || "economy") === "economy" ? "normal" : "economy";
  document.body.classList.toggle("resource-economy", nextMode === "economy");
  await native?.app?.setResourceMode?.(nextMode).catch(() => {});
  update((s) => { s.settings.resourceMode = nextMode; });
}

async function exportVault() {
  if (native?.vault?.exportFile) {
    const result = await native.vault.exportFile(state);
    if (!result.canceled) alert(`Vault exportado: ${result.filePath}`);
    return;
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gestor-web-vault.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importVault() {
  if (native?.vault?.importFile) {
    const result = await native.vault.importFile();
    if (!result.canceled && result.state) {
      setState(normalize({ ...clone(defaults), ...result.state }));
      save();
      render();
    }
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      setState(normalize({ ...clone(defaults), ...JSON.parse(await file.text()) }));
      save();
      render();
    } catch (error) {
      alert(`JSON invalido: ${error.message}`);
    }
  };
  input.click();
}

function resetData() {
  if (!confirm("Resetear datos de esta replica?")) return;
  localStorage.removeItem("gestor-web-rebuild:v1");
  setState(normalize(clone(defaults)));
  ui.welcome = false;
  render();
}

function closeWelcome(create) {
  update((s) => { s.onboardingSeen = true; });
  ui.welcome = false;
  if (create) return openNewProfileModal();
  rerender();
}

function runCommand(run) {
  ui.command = false;
  ui.commandQuery = "";
  if (run === "new-profile") { openNewProfileModal(); return; }
  if (run.startsWith("view:")) update((s) => { s.view = run.slice(5); });
  if (run.startsWith("open:")) openProfile(run.slice(5));
}

export function startScheduler() {
  let started = false;
  if (started) return;
  started = true;
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const task of state.schedules) {
      if (!task.enabled || !task.next_run_at || task.next_run_at > now) continue;
      const profile = profileById(task.profile_id);
      if (!profile) continue;
      if (task.action === "open" || task.action === "open_close") {
        if (!state.liveIds.includes(profile.id)) state.liveIds.push(profile.id);
        profile.open_count = (profile.open_count || 0) + 1;
        logEvent("opened", profile.id, `tarea ${task.id}`);
      }
      if (task.action === "wipe") {
        profile.cookies = [];
        native?.cookies?.clear?.(profile.id).catch(() => {});
        logEvent("wiped", profile.id, `tarea ${task.id}`);
      }
      if (task.action === "rotate_proxy") {
        const used = new Set(state.profiles.map((item) => item.proxy_id).filter(Boolean));
        const free = state.proxies.find((proxy) => proxy.healthy && !used.has(proxy.id));
        if (free) profile.proxy_id = free.id;
        logEvent("rotate_proxy", profile.id, `tarea ${task.id}`);
      }
      if (task.action === "open_close" && task.duration_minutes) {
        setTimeout(() => closeProfile(profile.id), task.duration_minutes * 60 * 1000);
      }
      task.next_run_at = now + task.every_minutes * 60 * 1000;
      changed = true;
    }
    if (changed) {
      setState(normalize(state));
      save();
      render();
    }
  }, 30000);
}

export function initKeyboard() {
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.ctrlKey && event.shiftKey && key === "a") {
      event.preventDefault();
      update((s) => { s.view = "admin"; });
      return;
    }
    if (event.key === "Escape") {
      if (ui.newProfile || ui.command || ui.cookieProfileId) {
        ui.newProfile = false;
        ui.profileAdvanced = false;
        ui.profileTemplateId = "win_firefox_mx";
        ui.command = false;
        ui.cookieProfileId = null;
        rerender();
      } else {
        update((s) => { s.filters = { search: "", group: "", proxyState: "all" }; });
      }
    }
    if (event.ctrlKey && key === "n") { event.preventDefault(); openNewProfileModal(); }
    if (event.ctrlKey && key === "k") { event.preventDefault(); ui.command = true; ui.commandQuery = ""; rerender(); }
    if (event.ctrlKey && key === "t") { event.preventDefault(); browserNewTab(); }
    if (event.ctrlKey && /^[0-9]$/.test(key)) {
      event.preventDefault();
      const map = { "0": "browse", "1": "all", "2": "live", "3": "proxies", "4": "schedules", "5": "history", "6": "stats", "7": "settings", "8": "monitor", "9": "network" };
      update((s) => { s.view = map[key] || s.view; });
    }
  });
}

export {
  openProfile,
  closeProfile,
  browserNewTab,
  browserGo,
  openDetection
};
