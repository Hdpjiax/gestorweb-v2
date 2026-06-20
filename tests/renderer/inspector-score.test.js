const assert = require("assert/strict");
const { importEsmFromRepo } = require("../_utils/import-esm");

module.exports = async function inspectorScoreTests() {
  const { calculateInspectorScore } = await importEsmFromRepo("src/renderer/views/inspector-score.js");

  assert.equal(calculateInspectorScore([]), 0);
  assert.equal(calculateInspectorScore([{ status: "ok" }]), 100);
  assert.equal(calculateInspectorScore([{ status: "warn" }]), 50);
  assert.equal(calculateInspectorScore([{ status: "fail" }]), 0);
  assert.equal(calculateInspectorScore([{ status: "ok" }, { status: "warn" }, { status: "fail" }]), 50);
};
