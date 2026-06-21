const { ipcMain } = require("electron");
const { getHwid, readJson, writeJson, stateFile } = require("./utils");
const { createDefaultState, migrateState, prepareStateForSave } = require("./state-schema");
const { checkLicense } = require("./license");

const LICENSE_CHANNELS = [
  "license:hwid",
  "license:status",
  "license:claimByKey",
  "license:install"
];

function loadAppState() {
  return migrateState(readJson(stateFile(), null) || createDefaultState());
}

function saveAppState(rawState) {
  const state = prepareStateForSave(rawState || {});
  writeJson(stateFile(), state);
  return state;
}

function publicLicenseStatus(status, text) {
  return {
    active: !!status.active,
    reason: status.reason || (status.active ? "ok" : "licencia no activa"),
    id: status.id || null,
    plan: status.plan || null,
    tier: status.tier || "standard",
    hwid: status.hwid || getHwid(),
    issuedAt: status.issuedAt || null,
    expiresAt: status.expiresAt || null,
    permanent: !!status.permanent,
    features: Array.isArray(status.features) ? status.features : [],
    checkedAt: status.checkedAt || Date.now(),
    serverTime: status.serverTime || null,
    revoked: !!status.revoked,
    text: status.active ? (status.text || String(text || "").trim()) : undefined,
    fingerprint: status.fingerprint || null
  };
}

function persistLicense(text, status) {
  const state = loadAppState();
  state.license = {
    ...publicLicenseStatus(status, text),
    text: String(text || "").trim()
  };
  saveAppState(state);
  return state.license;
}

async function claimLicense(text) {
  const hwid = getHwid();
  const cleanText = String(text || "").trim();
  const status = await checkLicense(cleanText, hwid);

  if (status.active) {
    const saved = persistLicense(cleanText, status);
    return { ...saved, hwid };
  }

  return publicLicenseStatus({ ...status, hwid }, cleanText);
}

async function currentLicenseStatus() {
  const hwid = getHwid();
  const state = loadAppState();
  const text = String(state.license?.text || "").trim();

  if (!text) {
    return publicLicenseStatus({ active: false, reason: "sin licencia", hwid }, "");
  }

  const status = await checkLicense(text, hwid);
  const saved = persistLicense(text, status);
  return { ...saved, hwid };
}

function registerLicenseIpc() {
  for (const channel of LICENSE_CHANNELS) {
    try { ipcMain.removeHandler(channel); } catch {}
  }

  ipcMain.handle("license:hwid", () => getHwid());
  ipcMain.handle("license:status", () => currentLicenseStatus());
  ipcMain.handle("license:claimByKey", (_event, text) => claimLicense(text));
  ipcMain.handle("license:install", (_event, text) => claimLicense(text));
}

module.exports = { registerLicenseIpc, currentLicenseStatus };
