const path = require("path");

const tests = [
  ["main/security", "../tests/main/security.test.js"],
  ["renderer/helpers", "../tests/renderer/helpers.test.js"],
  ["renderer/proxy-parser", "../tests/renderer/proxy-parser.test.js"]
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
