import { clone, shortId, esc, attr } from "./helpers.js";

const STORAGE_KEY = "gestor-web-rebuild:v2";
const HWID_STORAGE_KEY = "gestor-web-rebuild:hwid";
export const root = document.getElementById("app");
export const native = window.api || null;

export const ui = {
  newProfile: false,
  profileAdvanced: false,
  profileTemplateId: "win_firefox_mx",
  welcome: false,
  proxyAdding: false,
  proxyBulk: false,
  proxyTesting: false,
  testingProxyIds: new Set(),
  selectedProxyIds: new Set(),
  scheduleAdding: false,
  command: false,
  commandQuery: "",
  inspectorTab: "fp",
  cookieProfileId: null,
  cookieSearch: "",
  browserProfileId: "",
  browserUrl: "",
  browserIp: null,
  browserIpProfileId: null,
  browserIpStatus: "sin perfil",
  repeaterOutput: "",
  repeaterDraft: null,
  networkSelectedId: null,
  profilePreviews: {},
  globalIp: null,
  globalIpRoute: "directo",
  adminAuthenticated: false,
  adminLicenses: [],
  adminError: "",
  adminServerUrl: "",
  adminGeneratedKey: "",
  adminConfig: null,
  adminResumeTried: false,
  adminResumeBusy: false,
  adminFilters: { search: "", status: "all", plan: "all", tier: "all" },
  adminHistoryLicenseId: null,
  adminHistoryEvents: []
};

export const defaults = {
  schema_version: 2,
  license: null,
  onboardingSeen: false,
  view: "all",
  selectedId: null,
  filters: { search: "", group: "", proxyState: "all" },
  profiles: [],
  proxies: [],
  schedules: [],
  events: [],
  liveIds: [],
  browserTabs: [],
  activeTabId: null,
  netEntries: [],
  settings: { theme: "midnight", resourceMode: "economy", chromiumReady: false, torReady: false, vaultToken: shortId(24) },
  meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
};

export let state = normalize(clone(defaults));

export function setState(next) {
  state = next;
}

export function normalize(next) {
  next.schema_version ||= 2;
  next.filters ||= { search: "", group: "", proxyState: "all" };
  next.profiles ||= [];
  next.proxies ||= [];
  next.schedules ||= [];
  next.events ||= [];
  next.liveIds ||= [];
  next.browserTabs ||= [];
  next.netEntries ||= [];
  next.settings = { ...clone(defaults.settings), ...(next.settings || {}) };
  next.meta ||= clone(defaults.meta);
  next.meta.updatedAt = new Date().toISOString();
  if (next.profiles.length && !next.selectedId) next.selectedId = next.profiles[0].id;
  if (next.selectedId && !next.profiles.some((p) => p.id === next.selectedId)) next.selectedId = next.profiles[0]?.id || null;
  next.proxies = next.proxies.map((proxy) => ({ ...proxy, in_use: next.profiles.some((p) => p.proxy_id === proxy.id) }));
  return next;
}

export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  native?.app?.saveState?.(state).catch(() => {});
}

function clearBrowserRuntime(next) {
  return normalize({
    ...next,
    liveIds: [],
    browserTabs: [],
    activeTabId: null,
    view: next.view === "browse" ? "all" : next.view
  });
}

async function refreshHwid() {
  try {
    const hwid = await native?.license?.hwid?.();
    if (hwid) {
      localStorage.setItem(HWID_STORAGE_KEY, hwid);
      return hwid;
    }
  } catch {}

  const fallback = localStorage.getItem(HWID_STORAGE_KEY) || `GW-${shortId(4)}-${shortId(4)}-${shortId(4)}`;
  localStorage.setItem(HWID_STORAGE_KEY, fallback);
  return fallback;
}

async function refreshLicenseStatus(stored) {
  if (!native?.license?.status || !stored?.license?.text) return stored;
  try {
    const status = await native.license.status();
    if (!status) return stored;
    return {
      ...stored,
      license: {
        ...stored.license,
        ...status,
        text: status.text || stored.license.text,
        active: !!status.active
      }
    };
  } catch {
    return {
      ...stored,
      license: {
        ...stored.license,
        active: false,
        reason: "no se pudo validar licencia online"
      }
    };
  }
}

export async function load() {
  await refreshHwid();
  if (native?.app?.loadState) {
    const stored = await native.app.loadState();
    if (stored) return clearBrowserRuntime(await refreshLicenseStatus({ ...clone(defaults), ...stored }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("gestor-web-rebuild:v1");
    return raw ? clearBrowserRuntime({ ...clone(defaults), ...JSON.parse(raw) }) : clone(defaults);
  } catch {
    return clone(defaults);
  }
}

let _renderFn = null;
let _bindFn = null;

export function setRenderFn(fn) { _renderFn = fn; }
export function setBindFn(fn) { _bindFn = fn; }

export function liveSet() {
  return new Set(state.liveIds);
}

export function update(fn) {
  const sy = window.scrollY;
  fn(state);
  state = normalize(state);
  save();
  if (_renderFn) root.innerHTML = state.license?.active || state.view === "admin" ? _renderFn() : renderLicense();
  if (_bindFn) _bindFn();
  window.scrollTo(0, sy);
}

// rerender: reconstruye el DOM Y re-enlaza los handlers.
// IMPORTANTE: ambas operaciones deben ocurrir juntas para que
// elementos nuevos (modales, forms) tengan sus listeners activos.
export function rerender() {
  const sy = window.scrollY;
  render();
  window.scrollTo(0, sy);
}

export function render() {
  if (_renderFn) root.innerHTML = state.license?.active || state.view === "admin" ? _renderFn() : renderLicense();
  if (_bindFn) _bindFn();
}

function renderLicense() {
  const hwid = localStorage.getItem(HWID_STORAGE_KEY) || `GW-${shortId(4)}-${shortId(4)}-${shortId(4)}`;
  localStorage.setItem(HWID_STORAGE_KEY, hwid);
  const reason = state.license?.reason || "sin licencia";
  const statusText = state.license?.expiresAt
    ? `${reason} · vence: ${new Date(state.license.expiresAt).toLocaleString()}`
    : reason;

  const economy = (state.settings?.resourceMode || "economy") === "economy";
  return `
    <div class="application-frame">
      <header class="global-app-bar">
        <div class="global-brand"><span class="global-brand-dot"></span><strong>Gestor Web</strong><span>v1.5.0</span><span class="mono global-license-id">SIN-LICENCIA</span></div>
        <div class="global-status">
          <span class="global-ip"><small>IP</small><b id="globalIpValue">${esc(ui.globalIp || "detectando...")}</b></span>
          <span class="pill accent">midnight</span>
          <button class="resource-mode-toggle ${economy ? "economy" : "normal"}" type="button" data-action="toggle-resource-mode"><span class="dot"></span><span>modo ${economy ? "ahorro" : "normal"} activo</span></button>
        </div>
      </header>
      <div class="screen">
      <form id="licenseForm" class="license-card">
        <div class="card-head">
          <h1 class="title">Activacion</h1>
          <div class="subtitle">Esta copia necesita una licencia online para arrancar</div>
        </div>
        <div class="card-body stack">
          <div>
            <label class="label">1. Tu HWID</label>
            <div class="between">
              <input class="input mono" value="${attr(hwid)}" readonly />
              <button class="btn btn-primary" type="button" data-action="copy-hwid" data-hwid="${attr(hwid)}">copiar HWID</button>
            </div>
            <div class="small-note">ID corto: ${esc(hwid.replaceAll("-", "").slice(-12))}</div>
            <div class="small-note">Envia tu HWID al vendedor. El emitira una licencia GW-LIC-V1 firmada y revocable.</div>
          </div>
          <div>
            <label class="label">2. Activar licencia</label>
            <textarea id="licenseText" class="textarea mono" placeholder="GW-LIC-V1&#10;payload&#10;firma criptografica">${esc(state.license?.text || "")}</textarea>
          </div>
          <div class="between">
            <button class="btn btn-ghost" type="button" data-action="import-license">importar archivo .gw</button>
            <button class="btn btn-primary" type="submit">activar</button>
          </div>
        </div>
        <div class="card-foot between">
          <span>Estado: ${esc(statusText)}</span>
          <span>HWID generado desde el dispositivo local</span>
        </div>
      </form>
      </div>
    </div>
  `;
}
