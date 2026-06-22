const assert = require("assert/strict");
const { normalizeSupabaseUrl } = require("../../src/main/license-admin-ipc");

module.exports = async function licenseAdminTests() {
  assert.equal(normalizeSupabaseUrl("https://licenses.example.com/"), "https://licenses.example.com");
  assert.equal(normalizeSupabaseUrl("https://project-ref.supabase.co"), "https://project-ref.supabase.co");
  assert.throws(() => normalizeSupabaseUrl("http://licenses.example.com"), /HTTPS/);
};
