const path = require("path");

const tests = [
  ["main/security", "../tests/main/security.test.js"],
  ["main/state-schema", "../tests/main/state-schema.test.js"],
  ["renderer/helpers", "../tests/renderer/helpers.test.js"],
  ["renderer/proxy-parser", "../tests/renderer/proxy-parser.test.js"],
  ["renderer/ux-polish", "../tests/renderer/ux-polish.test.js"],
  ["renderer/inspector-score", "../tests/renderer/inspector-score.test.js"],
  ["renderer/inspector-tabs", "../tests/renderer/inspector-tabs.test.js"],
  ["renderer/info-views", "../tests/renderer/info-views.test.js"],
  ["renderer/views-facade", "../tests/renderer/views-facade.test.js"],
  ["renderer/shell-routing", "../tests/renderer/shell-routing.test.js"],
  ["renderer/monitor-view", "../tests/renderer/monitor-view.test.js"],
  ["renderer/schedules-view", "../tests/renderer/schedules-view.test.js"],
  ["renderer/browse-view", "../tests/renderer/browse-view.test.js"],
  ["renderer/browser-corrections", "../tests/renderer/browser-corrections.test.js"],
  ["renderer/browser-shell-size", "../tests/renderer/browser-shell-size.test.js"],
  ["renderer/topbar-always", "../tests/renderer/topbar-always.test.js"]
];

async function run() {
  const started = Date.now();
  let passed = 0;
  let failed = 0;

  for (const [name, relativePath] of tests) {
    const file = path.join(__dirname, relativePath);
    try {
      const test = require(file);
      await test();
      passed++;
      console.log(`ok   ${name}`);
    } catch (error) {
      failed++;
      console.error(`fail ${name}`);
      console.error(error && error.stack ? error.stack : error);
    }
  }

  const elapsed = Date.now() - started;
  console.log(`\n${passed} passed, ${failed} failed in ${elapsed}ms.`);

  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
