const crypto = require("crypto");

const CURRENT_STATE_VERSION = 2;

function token(size = 24) {
  return crypto.randomBytes(Math.ceil(size * 0.8)).toString("base64url").slice(0, size).toUpperCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function object(value) {
  return isPlainObject(value) ? value : {};
}

function createDefaultState() {
  return {
    schema_version: CURRENT_STATE_VERSION,
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
    settings: { theme: "midnight", chromiumReady: false, torReady: false, vaultToken: token(24) },
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

function normalizeFilters(filters) {
  const source = object(filters);
  return {
    search: String(source.search || ""),
    group: String(source.group || ""),
    proxyState: ["all", "with", "without"].includes(source.proxyState) ? source.proxyState : "all"
  };
}

function normalizeSettings(settings, defaults) {
  const source = object(settings);
  return {
    ...defaults.settings,
    ...source,
    theme: String(source.theme || defaults.settings.theme),
    chromiumReady: !!source.chromiumReady,
    torReady: !!source.torReady,
    vaultToken: String(source.vaultToken || defaults.settings.vaultToken)
  };
}

function normalizeProfile(profile) {
  if (!isPlainObject(profile)) return null;
  const id = String(profile.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return null;
  return {
    ...profile,
    id,
    name: String(profile.name || "Perfil"),
    url: String(profile.url || ""),
    group_tag: String(profile.group_tag || ""),
    notes: String(profile.notes || ""),
    cookies: array(profile.cookies),
    macros: array(profile.macros),
    logs: array(profile.logs)
  };
}

function normalizeProxy(proxy) {
  if (!isPlainObject(proxy)) return null;
  const id = String(proxy.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return null;
  return {
    ...proxy,
    id,
    scheme: String(proxy.scheme || "http").toLowerCase(),
    host: String(proxy.host || ""),
    port: Number(proxy.port || 0),
    username: proxy.username ? String(proxy.username) : null,
    password: proxy.password ? String(proxy.password) : null,
    healthy: !!proxy.healthy,
    in_use: false
  };
}

function migrateState(raw) {
  const defaults = createDefaultState();
  const source = isPlainObject(raw) ? raw : {};
  const profiles = array(source.profiles).map(normalizeProfile).filter(Boolean);
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const proxies = array(source.proxies).map(normalizeProxy).filter(Boolean);
  const selectedId = source.selectedId && profileIds.has(String(source.selectedId)) ? String(source.selectedId) : profiles[0]?.id || null;
  const activeTabId = array(source.browserTabs).some((tab) => tab?.id === source.activeTabId) ? source.activeTabId : null;

  const next = {
    ...defaults,
    ...source,
    schema_version: CURRENT_STATE_VERSION,
    license: source.license || null,
    onboardingSeen: !!source.onboardingSeen,
    view: typeof source.view === "string" ? source.view : defaults.view,
    selectedId,
    filters: normalizeFilters(source.filters),
    profiles,
    proxies,
    schedules: array(source.schedules),
    events: array(source.events).slice(-1000),
    liveIds: [],
    browserTabs: array(source.browserTabs),
    activeTabId,
    netEntries: array(source.netEntries).slice(-500),
    settings: normalizeSettings(source.settings, defaults),
    meta: {
      ...defaults.meta,
      ...object(source.meta),
      updatedAt: new Date().toISOString()
    }
  };

  next.proxies = next.proxies.map((proxy) => ({
    ...proxy,
    in_use: next.profiles.some((profile) => profile.proxy_id === proxy.id)
  }));

  return next;
}

function prepareStateForSave(raw) {
  const next = migrateState(raw);
  next.meta.updatedAt = new Date().toISOString();
  return next;
}

module.exports = {
  CURRENT_STATE_VERSION,
  clone,
  createDefaultState,
  migrateState,
  prepareStateForSave
};
