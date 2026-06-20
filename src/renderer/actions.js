import { uid, shortId, clone } from "./helpers.js";
import { state, ui, update, rerender, render, save, liveSet, native, root, setState, normalize, defaults } from "./state.js";
import { profileById, proxyById, filteredProfiles, logEvent, normalizeUrl, safeHost, pLabel, activeWebview, updateBrowserTab, bindInput } from "./utils.js";
import { templates, ICONS } from "./icons.js";
import { makeFingerprint, forceFirefoxFingerprint, presetValues } from "./fingerprint.js";
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
      "Firefox / Camoufox (indetectable)": "spoofing a nivel de motor estilo Dolphin, maxima indetectabilidad, recomendado para pagos",
      "Chromium (compatibilidad)": "motor clasico con spoof por JS en ventana Electron"
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
    "new-profile": () => { ui.newProfile = true; ui.profileAdvanced = false; rerender(); },
    "close-modal": () => { ui.newProfile = false; rerender(); },
    "toggle-profile-advanced": () => { ui.profileAdvanced = !ui.profileAdvanced; rerender(); },
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
  const nativeStatus = native?.license?.claimByKey ? await native.license.claimByKey(text) : { active: true };
  if (!nativeStatus.active) return alert("Licencia invalida para este HWID.");
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
  update((s) => {
    s.profiles.unshift(profile);
    s.selectedId = profile.id;
    logEvent("created", profile.id, profile.url || "sin URL");
  });
  ui.newProfile = false;
}

async function openProfile(id, options = {}) {
  const profile = profileById(id);
  if (!profile) return;
  if (profile.gw_engine) forceFirefoxFingerprint(profile);
  const proxy = profile.proxy_id ? proxyById(profile.proxy_id) : null;

  if (options.openWindow && native?.profiles?.openWindow) {
    const result = await native.profiles.openWindow(profile, proxy, profile.url || null);
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
      const startUrl = p.url || (p.tor_mode ? "https://check.torproject.org/" : "https://duckduckgo.com/");
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
  ids.forEach((id) => ui.selectedProxyIds.delete(id));
  update((s) => {
    s.proxies = s.proxies.filter((p) => !ids.has(p.id));
    s.profiles.forEach((p) => { if (ids.has(p.proxy_id)) p.proxy_id = null; });
    logEvent(eventKind, null, payload);
  });
}

async function healthCheck() {
  if (native?.proxies?.checkAll) {
    ui.proxyTesting = true;
    rerender();
    try {
      const checked = await native.proxies.checkAll(state.proxies);
      update((s) => {
        s.proxies = checked;
        logEvent("health_check", null, `${s.proxies.length} proxies`);
      });
    } finally {
      ui.proxyTesting = false;
    }
    return;
  }
  alert("El test real de proxies requiere ejecutar la app en Electron.");
}

function removeProxy(id) {
  ui.selectedProxyIds.delete(id);
  update((s) => {
    s.proxies = s.proxies.filter((p) => p.id !== id);
    s.profiles.forEach((p) => { if (p.proxy_id === id) p.proxy_id = null; });
    logEvent("proxy_removed", null, id);
  });
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
  ui.browserUrl = profile?.url || "https://duckduckgo.com/";
  await browserGo();
}

async function browserGo() {
  const prevProfileId = state.browserTabs.find((t) => t.id === state.activeTabId)?.profileId;
  const profileId = ui.browserProfileId || state.selectedId;
  if (!profileId) return alert("elige perfil...");
  let url = normalizeUrl(ui.browserUrl || profileById(profileId)?.url || "https://duckduckgo.com/");
  if (url.includes(" ") || !url.includes(".")) url = `https://duckduckgo.com/?q=${encodeURIComponent(ui.browserUrl)}`;
  const profile = profileById(profileId);
  if (profile?.gw_engine) forceFirefoxFingerprint(profile);
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
  const data = new FormData(event.currentTarget);
  const method = data.get("method");
  const url = data.get("url") || "https://example.com";
  const headers = Object.fromEntries(String(data.get("headers") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const index = line.indexOf(":");
    return index === -1 ? [line, ""] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  const response = native?.repeater?.send
    ? await native.repeater.send({ method, url, headers, body: data.get("body") || "" })
    : { status: Math.random() > 0.15 ? 200 : 403, headers: {}, body: "simulated", ms: 0 };
  ui.repeaterOutput = JSON.stringify(response, null, 2);
  update((s) => {
    s.netEntries.unshift({ id: uid("net"), method, url, status: response.status, ts: Date.now() });
    s.netEntries = s.netEntries.slice(0, 50);
  });
}

async function detectTor() {
  const result = native?.tor?.detect ? await native.tor.detect() : { healthy: true, latency_ms: 0 };
  update((s) => {
    s.settings.torReady = !!result.healthy;
    logEvent(result.healthy ? "tor_detected" : "tor_missing", null, result.healthy ? `127.0.0.1:9050 ${result.latency_ms || 0}ms` : (result.last_error || "no detectado"));
  });
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
  if (create) ui.newProfile = true;
  rerender();
}

function runCommand(run) {
  ui.command = false;
  ui.commandQuery = "";
  if (run === "new-profile") { ui.newProfile = true; rerender(); return; }
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
    if (event.key === "Escape") {
      if (ui.newProfile || ui.command || ui.cookieProfileId) {
        ui.newProfile = false;
        ui.command = false;
        ui.cookieProfileId = null;
        rerender();
      } else {
        update((s) => { s.filters = { search: "", group: "", proxyState: "all" }; });
      }
    }
    if (event.ctrlKey && key === "n") { event.preventDefault(); ui.newProfile = true; rerender(); }
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
