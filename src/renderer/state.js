import { clone, shortId, esc, attr } from "./helpers.js";

const STORAGE_KEY = "gestor-web-rebuild:v2";
export const root = document.getElementById("app");
export const native = window.api || null;

export const ui = {
  newProfile: false,
  profileAdvanced: false,
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
  repeaterOutput: ""
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
  settings: { theme: "midnight", chromiumReady: false, torReady: false, vaultToken: shortId(24) },
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
  next.settings ||= clone(defaults.settings);
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

export async function load() {
  if (native?.app?.loadState) {
    const stored = await native.app.loadState();
    if (stored) return clearBrowserRuntime({ ...clone(defaults), ...stored });
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
  if (_renderFn) root.innerHTML = state.license?.active ? _renderFn() : renderLicense();
  if (_bindFn) _bindFn();
  window.scrollTo(0, sy);
}

export function rerender() {
  const sy = window.scrollY;
  render();
  window.scrollTo(0, sy);
}

export function render() {
  if (_renderFn) root.innerHTML = state.license?.active ? _renderFn() : renderLicense();
  if (_bindFn) _bindFn();
}

function renderLicense() {
  const hwid = localStorage.getItem("gestor-web-rebuild:hwid") || `GW-${shortId(4)}-${shortId(4)}-${shortId(4)}`;
  localStorage.setItem("gestor-web-rebuild:hwid", hwid);
  return `
    <div class="screen">
      <form id="licenseForm" class="license-card">
        <div class="card-head">
          <h1 class="title">Activacion</h1>
          <div class="subtitle">Esta copia necesita una licencia para arrancar</div>
        </div>
        <div class="card-body stack">
          <div>
            <label class="label">1. Tu HWID</label>
            <div class="between">
              <input class="input mono" value="${attr(hwid)}" readonly />
              <button class="btn btn-primary" type="button" data-action="copy-hwid" data-hwid="${attr(hwid)}">copiar HWID</button>
            </div>
            <div class="small-note">ID corto: ${esc(hwid.replaceAll("-", "").slice(-12))}</div>
            <div class="small-note">Envia tu HWID al vendedor. El emitira un .gw firmado.</div>
          </div>
          <div>
            <label class="label">2. Activar licencia</label>
            <textarea id="licenseText" class="textarea mono" placeholder="GW-XXXX-XXXX-XXXX o contenido del .gw (GW-LIC-V1...)"></textarea>
          </div>
          <div class="between">
            <button class="btn btn-ghost" type="button" data-action="import-license">importar archivo .gw</button>
            <button class="btn btn-primary" type="submit">activar</button>
          </div>
        </div>
        <div class="card-foot between">
          <span>Estado: sin licencia</span>
          <span>HWID generado de CPU + placa + UUID + disco + MAC</span>
        </div>
      </form>
    </div>
  `;
}
