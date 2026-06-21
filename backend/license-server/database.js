const fs = require("fs");
const path = require("path");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

class JsonLicenseStore {
  constructor(file) { this.file = file; }
  async init() {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL es obligatorio en produccion");
    if (!fs.existsSync(this.file)) writeJson(this.file, { version: 2, licenses: [] });
  }
  load() { return readJson(this.file, { version: 2, licenses: [] }); }
  async list() { return this.load().licenses; }
  async create(record) {
    const db = this.load();
    db.licenses.unshift(record);
    writeJson(this.file, db);
    return record;
  }
  async findById(id) { return this.load().licenses.find((item) => item.id === id) || null; }
  async revoke(id, reason, now) {
    const db = this.load();
    const item = db.licenses.find((license) => license.id === id);
    if (!item) return null;
    item.revoked = true;
    item.revoke_reason = reason;
    item.revoked_at = new Date(now).toISOString();
    writeJson(this.file, db);
    return item;
  }
  async touch(id, hwid, platform, now) {
    const db = this.load();
    const item = db.licenses.find((license) => license.id === id);
    if (!item) return;
    item.last_check_at = new Date(now).toISOString();
    item.last_hwid = hwid;
    item.last_platform = platform;
    writeJson(this.file, db);
  }
}

class PostgresLicenseStore {
  constructor(connectionString) {
    const { Pool } = require("pg");
    this.pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      idleTimeoutMillis: 30000
    });
  }
  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        hwid TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'any',
        app TEXT NOT NULL,
        plan TEXT NOT NULL,
        tier TEXT NOT NULL,
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        issued_at BIGINT NOT NULL,
        expires_at BIGINT,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        revoke_reason TEXT,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        license_hash TEXT NOT NULL UNIQUE,
        license_text TEXT NOT NULL,
        last_check_at TIMESTAMPTZ,
        last_hwid TEXT,
        last_platform TEXT
      );
      CREATE INDEX IF NOT EXISTS licenses_hwid_idx ON licenses(hwid);
      CREATE INDEX IF NOT EXISTS licenses_expires_idx ON licenses(expires_at);
    `);
  }
  normalize(row) {
    if (!row) return null;
    return {
      ...row,
      issued_at: Number(row.issued_at),
      expires_at: row.expires_at == null ? null : Number(row.expires_at),
      features: Array.isArray(row.features) ? row.features : []
    };
  }
  async list() {
    const { rows } = await this.pool.query("SELECT * FROM licenses ORDER BY created_at DESC LIMIT 5000");
    return rows.map((row) => this.normalize(row));
  }
  async create(record) {
    const { rows } = await this.pool.query(`
      INSERT INTO licenses (id, hwid, platform, app, plan, tier, features, issued_at, expires_at, revoked, revoke_reason, created_at, license_hash, license_text)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [record.id, record.hwid, record.platform, record.app, record.plan, record.tier, JSON.stringify(record.features), record.issued_at, record.expires_at, record.revoked, record.revoke_reason, record.created_at, record.license_hash, record.license_text]);
    return this.normalize(rows[0]);
  }
  async findById(id) {
    const { rows } = await this.pool.query("SELECT * FROM licenses WHERE id = $1 LIMIT 1", [id]);
    return this.normalize(rows[0]);
  }
  async revoke(id, reason, now) {
    const { rows } = await this.pool.query(`
      UPDATE licenses SET revoked = TRUE, revoke_reason = $2, revoked_at = $3 WHERE id = $1 RETURNING *
    `, [id, reason, new Date(now)]);
    return this.normalize(rows[0]);
  }
  async touch(id, hwid, platform, now) {
    await this.pool.query("UPDATE licenses SET last_check_at = $2, last_hwid = $3, last_platform = $4 WHERE id = $1", [id, new Date(now), hwid, platform]);
  }
}

function createLicenseStore(options = {}) {
  const connectionString = String(process.env.DATABASE_URL || "").trim();
  if (connectionString) return new PostgresLicenseStore(connectionString);
  return new JsonLicenseStore(path.resolve(options.dbFile || "licenses-db.json"));
}

module.exports = { createLicenseStore, JsonLicenseStore, PostgresLicenseStore };
