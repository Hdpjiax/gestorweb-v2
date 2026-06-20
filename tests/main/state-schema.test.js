const assert = require("assert/strict");
const {
  CURRENT_STATE_VERSION,
  createDefaultState,
  migrateState,
  prepareStateForSave
} = require("../../src/main/state-schema");

module.exports = async function stateSchemaTests() {
  const defaults = createDefaultState();
  assert.equal(defaults.schema_version, CURRENT_STATE_VERSION);
  assert.equal(defaults.view, "all");
  assert.match(defaults.settings.vaultToken, /^[A-Z0-9_-]{20,24}$/);

  const migrated = migrateState({
    profiles: [
      { id: "prof_ok", name: "Principal", url: "https://example.com", proxy_id: "proxy_1" },
      { id: "../bad", name: "Debe limpiarse" },
      null
    ],
    proxies: [
      { id: "proxy_1", scheme: "HTTP", host: "example.com", port: "8080", healthy: 1 },
      { id: "", host: "bad", port: 99999 }
    ],
    selectedId: "missing",
    filters: { search: 123, group: "ventas", proxyState: "bad" },
    liveIds: ["prof_ok"],
    events: Array.from({ length: 1100 }, (_, index) => ({ id: index })),
    netEntries: Array.from({ length: 600 }, (_, index) => ({ id: index })),
    settings: { theme: "midnight", vaultToken: "TOKEN" }
  });

  assert.equal(migrated.schema_version, CURRENT_STATE_VERSION);
  assert.equal(migrated.profiles.length, 2);
  assert.equal(migrated.profiles[1].id, "bad");
  assert.equal(migrated.proxies.length, 1);
  assert.equal(migrated.proxies[0].in_use, true);
  assert.equal(migrated.selectedId, "prof_ok");
  assert.equal(migrated.filters.search, "123");
  assert.equal(migrated.filters.group, "ventas");
  assert.equal(migrated.filters.proxyState, "all");
  assert.deepEqual(migrated.liveIds, []);
  assert.equal(migrated.events.length, 1000);
  assert.equal(migrated.netEntries.length, 500);
  assert.equal(migrated.settings.vaultToken, "TOKEN");

  const saved = prepareStateForSave({ profiles: [{ id: "prof_1", name: "P1" }], liveIds: ["prof_1"] });
  assert.equal(saved.schema_version, CURRENT_STATE_VERSION);
  assert.deepEqual(saved.liveIds, []);
  assert.equal(saved.selectedId, "prof_1");
};
