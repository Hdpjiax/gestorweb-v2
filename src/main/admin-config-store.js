const { safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const { dataDir, readJson, writeJson } = require("./utils");

function configFile() {
  return path.join(dataDir(), "admin-license-config.json");
}

function normalizeUrl(value) {
  const url = new URL(String(value || "").trim());
  if (url.protocol !== "https:") throw new Error("Supabase debe usar HTTPS");
  return url.toString().replace(/\/+$/, "");
}

function requireText(value, label, min = 1) {
  const text = String(value || "").trim();
  if (text.length < min) throw new Error(`${label} invalido`);
  return text;
}

function normalizeConfig(config = {}) {
  const supabaseUrl = normalizeUrl(config.supabaseUrl || config.url);
  const anonKey = requireText(config.anonKey, "anon key", 20);
  const serviceRoleKey = requireText(config.serviceRoleKey, "service role key", 20);
  const privateKeyPem = requireText(config.privateKeyPem, "clave privada", 100);
  if (!privateKeyPem.includes("BEGIN") || !privateKeyPem.includes("PRIVATE KEY")) {
    throw new Error("clave privada PEM invalida");
  }
  return { supabaseUrl, anonKey, serviceRoleKey, privateKeyPem };
}

function isEncryptionReady() {
  return !!safeStorage?.isEncryptionAvailable?.();
}

function saveConfig(config) {
  if (!isEncryptionReady()) throw new Error("almacenamiento cifrado no disponible");
  const clean = normalizeConfig(config);
  const encrypted = safeStorage.encryptString(JSON.stringify({ v: 1, ...clean })).toString("base64");
  writeJson(configFile(), { v: 1, encrypted: true, data: encrypted, updatedAt: new Date().toISOString() });
  return clean;
}

function loadConfig() {
  const stored = readJson(configFile(), null);
  if (!stored?.encrypted || !stored?.data || !isEncryptionReady()) return null;
  try {
    const text = safeStorage.decryptString(Buffer.from(String(stored.data), "base64"));
    return normalizeConfig(JSON.parse(text));
  } catch {
    return null;
  }
}

function info(config = loadConfig()) {
  return {
    ok: true,
    configured: !!config,
    supabaseUrl: config?.supabaseUrl || "",
    hasAnonKey: !!config?.anonKey,
    hasServiceRoleKey: !!config?.serviceRoleKey,
    hasPrivateKeyPem: !!config?.privateKeyPem,
    encrypted: isEncryptionReady()
  };
}

function forgetConfig() {
  try { fs.rmSync(configFile(), { force: true }); } catch {}
  return { ok: true };
}

module.exports = { normalizeConfig, saveConfig, loadConfig, info, forgetConfig, normalizeUrl };
