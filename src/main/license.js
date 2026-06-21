const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const LICENSE_PREFIX = "GW-LIC-V1";
const DEFAULT_APP_ID = "gestor-web";
const SUPPORTED_SIG_ALGS = new Set(["RSA-SHA256"]);

function normalizePem(text) {
  return String(text || "").replace(/\\n/g, "\n").trim();
}

function configuredPublicKey() {
  const inline = normalizePem(process.env.GW_LICENSE_PUBLIC_KEY || "");
  if (inline) return inline;

  const envFile = process.env.GW_LICENSE_PUBLIC_KEY_FILE;
  if (envFile && fs.existsSync(envFile)) return fs.readFileSync(envFile, "utf8");

  const localFile = path.join(__dirname, "license-public-key.pem");
  if (fs.existsSync(localFile)) return fs.readFileSync(localFile, "utf8");

  const devServerFile = path.resolve(__dirname, "..", "..", "backend", "license-server", "public_key.pem");
  if (fs.existsSync(devServerFile)) return fs.readFileSync(devServerFile, "utf8");

  return "";
}

function b64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function b64urlDecode(segment) {
  const text = String(segment || "").trim();
  if (!text) throw new Error("segmento vacio");
  return Buffer.from(text, "base64url");
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function parseLicenseText(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("licencia vacia");

  let body = raw;
  if (body.startsWith(`${LICENSE_PREFIX}:`)) body = body.slice(`${LICENSE_PREFIX}:`.length).trim();
  else if (body.startsWith(`${LICENSE_PREFIX}.`)) body = body.slice(`${LICENSE_PREFIX}.`.length).trim();
  else if (body.startsWith(LICENSE_PREFIX)) body = body.slice(LICENSE_PREFIX.length).trim();
  else throw new Error(`prefijo invalido: esperado ${LICENSE_PREFIX}`);

  const compact = body.replace(/\r/g, "\n").split(/\n+/).map((part) => part.trim()).filter(Boolean);
  let payloadSegment = "";
  let signatureSegment = "";

  if (compact.length >= 2) {
    [payloadSegment, signatureSegment] = compact;
  } else {
    const dotParts = body.split(".").map((part) => part.trim()).filter(Boolean);
    if (dotParts.length >= 2) [payloadSegment, signatureSegment] = dotParts;
  }

  if (!payloadSegment || !signatureSegment) throw new Error("formato invalido: faltan payload o firma");

  const payloadJson = b64urlDecode(payloadSegment).toString("utf8");
  const payload = JSON.parse(payloadJson);
  const signature = b64urlDecode(signatureSegment);

  return {
    raw,
    payloadSegment,
    signatureSegment,
    payloadJson,
    payload,
    signature,
    fingerprint: sha256(raw)
  };
}

function createLicenseText(payload, privateKeyPem) {
  const normalizedPayload = {
    v: 1,
    app: DEFAULT_APP_ID,
    sig_alg: "RSA-SHA256",
    ...payload
  };
  const payloadJson = JSON.stringify(normalizedPayload);
  const payloadSegment = b64urlEncode(payloadJson);
  const signature = crypto.sign("RSA-SHA256", Buffer.from(payloadSegment, "utf8"), privateKeyPem);
  const signatureSegment = signature.toString("base64url");
  return `${LICENSE_PREFIX}\n${payloadSegment}\n${signatureSegment}`;
}

function getExpiresAt(payload) {
  const value = payload.expires_at ?? payload.expiresAt ?? null;
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getIssuedAt(payload) {
  const value = payload.issued_at ?? payload.issuedAt ?? null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getLicenseId(payload) {
  return String(payload.id || payload.license_id || payload.lic || "").trim();
}

function getLicenseServerUrl(payload) {
  return String(
    process.env.GW_LICENSE_SERVER_URL ||
    payload.license_server ||
    payload.issuer_url ||
    payload.issuer ||
    ""
  ).trim().replace(/\/+$/, "");
}

function getSupabaseConfig(payload) {
  const db = payload.license_db && typeof payload.license_db === "object" ? payload.license_db : {};
  const url = String(
    process.env.GW_LICENSE_SUPABASE_URL ||
    db.supabase_url ||
    db.url ||
    payload.supabase_url ||
    ""
  ).trim().replace(/\/+$/, "");
  const anonKey = String(
    process.env.GW_LICENSE_SUPABASE_ANON_KEY ||
    db.supabase_anon_key ||
    db.anon_key ||
    payload.supabase_anon_key ||
    ""
  ).trim();
  const provider = String(db.provider || payload.license_provider || "").toLowerCase();
  return {
    enabled: provider === "supabase" || (!!url && !!anonKey),
    url,
    anonKey
  };
}

function verifySignedLicense(text, hwid, options = {}) {
  const parsed = parseLicenseText(text);
  const payload = parsed.payload;
  const publicKey = normalizePem(options.publicKey || configuredPublicKey());

  if (!publicKey) {
    return { active: false, reason: "clave publica de licencia no configurada", parsed };
  }

  const sigAlg = String(payload.sig_alg || "RSA-SHA256").toUpperCase();
  if (!SUPPORTED_SIG_ALGS.has(sigAlg)) {
    return { active: false, reason: `algoritmo de firma no soportado: ${sigAlg}`, parsed };
  }

  const validSignature = crypto.verify(
    "RSA-SHA256",
    Buffer.from(parsed.payloadSegment, "utf8"),
    publicKey,
    parsed.signature
  );

  if (!validSignature) {
    return { active: false, reason: "firma criptografica invalida", parsed };
  }

  if (payload.app && payload.app !== DEFAULT_APP_ID) {
    return { active: false, reason: `licencia emitida para otra app (${payload.app})`, parsed };
  }

  if (payload.hwid && String(payload.hwid) !== String(hwid)) {
    return { active: false, reason: `licencia emitida para otro HWID (${payload.hwid})`, parsed };
  }

  const expiresAt = getExpiresAt(payload);
  if (expiresAt && Date.now() > expiresAt) {
    return {
      active: false,
      reason: "licencia expirada",
      id: getLicenseId(payload),
      plan: payload.plan || payload.type || null,
      tier: payload.tier || "standard",
      issuedAt: getIssuedAt(payload),
      expiresAt,
      features: Array.isArray(payload.features) ? payload.features : [],
      parsed
    };
  }

  return {
    active: true,
    reason: "ok",
    id: getLicenseId(payload),
    plan: payload.plan || payload.type || null,
    tier: payload.tier || "standard",
    issuedAt: getIssuedAt(payload),
    expiresAt,
    permanent: !expiresAt,
    features: Array.isArray(payload.features) ? payload.features : [],
    serverUrl: getLicenseServerUrl(payload),
    supabase: getSupabaseConfig(payload),
    onlineRequired: payload.online_required !== false,
    parsed
  };
}

async function postJson(url, body, timeoutMs = 8000, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      return { ok: false, status: response.status, error: json?.error || json?.message || text || `HTTP ${response.status}` };
    }
    return { ok: true, status: response.status, data: json || {} };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === "AbortError" ? "timeout al validar licencia" : (error?.message || "fallo de red") };
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyWithLicenseServer(text, hwid, localStatus, serverUrl) {
  const response = await postJson(`${serverUrl}/v1/verify`, {
    app: DEFAULT_APP_ID,
    hwid,
    licenseText: text
  });

  if (!response.ok) {
    return { active: false, reason: response.error || "no se pudo validar online" };
  }

  if (!response.data?.active) {
    return {
      active: false,
      reason: response.data?.reason || "licencia no activa",
      revoked: !!response.data?.revoked,
      expiresAt: response.data?.expiresAt ?? localStatus?.expiresAt ?? null
    };
  }

  return {
    active: true,
    reason: "ok_online",
    checkedAt: Date.now(),
    expiresAt: response.data?.expiresAt ?? localStatus?.expiresAt ?? null,
    serverTime: response.data?.serverTime || null
  };
}

async function verifyWithSupabase(text, hwid, localStatus, config) {
  if (!config.url || !config.anonKey) {
    return { active: false, reason: "Supabase URL o anon key no configurados" };
  }

  const payload = localStatus?.parsed?.payload || parseLicenseText(text).payload;
  const id = getLicenseId(payload);
  if (!id) return { active: false, reason: "licencia sin ID" };

  const response = await postJson(
    `${config.url}/rest/v1/rpc/verify_license_public`,
    {
      p_id: id,
      p_hwid: String(hwid || ""),
      p_license_hash: sha256(String(text || "").trim())
    },
    8000,
    {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`
    }
  );

  if (!response.ok) {
    return { active: false, reason: response.error || "no se pudo validar en Supabase" };
  }

  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!data?.active) {
    return {
      active: false,
      reason: data?.reason || "licencia no activa",
      revoked: !!data?.revoked,
      expiresAt: data?.expires_at ?? data?.expiresAt ?? localStatus?.expiresAt ?? null,
      serverTime: data?.server_time || null
    };
  }

  return {
    active: true,
    reason: "ok_supabase",
    checkedAt: Date.now(),
    expiresAt: data?.expires_at ?? data?.expiresAt ?? localStatus?.expiresAt ?? null,
    serverTime: data?.server_time || null,
    revoked: false
  };
}

async function verifyOnline(text, hwid, localStatus) {
  const payload = localStatus?.parsed?.payload || parseLicenseText(text).payload;
  const onlineRequired = payload.online_required !== false;
  const supabase = getSupabaseConfig(payload);
  const serverUrl = getLicenseServerUrl(payload);

  let response;
  if (supabase.enabled) {
    response = await verifyWithSupabase(text, hwid, localStatus, supabase);
  } else if (serverUrl) {
    response = await verifyWithLicenseServer(text, hwid, localStatus, serverUrl);
  } else if (!onlineRequired) {
    return { active: true, reason: "ok_offline" };
  } else {
    return { active: false, reason: "validador online no configurado" };
  }

  if (!response.active && !onlineRequired && response.reason) {
    return { active: true, reason: "ok_offline_grace", warning: response.reason };
  }
  return response;
}

async function checkLicense(text, hwid, options = {}) {
  let local;
  try {
    local = verifySignedLicense(text, hwid, options);
  } catch (error) {
    return { active: false, reason: error?.message || "licencia invalida", hwid };
  }

  if (!local.active) {
    return {
      ...local,
      hwid,
      parsed: undefined
    };
  }

  const online = await verifyOnline(text, hwid, local);
  if (!online.active) {
    return {
      ...local,
      ...online,
      active: false,
      hwid,
      parsed: undefined
    };
  }

  return {
    ...local,
    ...online,
    active: true,
    hwid,
    text: String(text || "").trim(),
    fingerprint: local.parsed?.fingerprint || null,
    parsed: undefined
  };
}

module.exports = {
  LICENSE_PREFIX,
  DEFAULT_APP_ID,
  createLicenseText,
  parseLicenseText,
  verifySignedLicense,
  verifyOnline,
  checkLicense
};
