const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "index.html",
  "styles.css",
  "main.js",
  "preload.js",
  "src/renderer/app.js",
  "src/renderer/browser-redesign-start.js",
  "src/main/ipc.js",
  "src/main/state-schema.js",
  "QA_SMOKE_TEST.md",
  "DATA_STORAGE.md",
  "UI_UX_GUIDE.md",
  "RELEASE_CHECKLIST.md",
  "CHANGELOG.md"
];

let failed = false;

function report(ok, message) {
  if (ok) {
    console.log(`ok   ${message}`);
    return;
  }
  failed = true;
  console.error(`fail ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const pkg = JSON.parse(read("package.json"));
const buildFiles = pkg.build && Array.isArray(pkg.build.files) ? pkg.build.files : [];

report(/^\d+\.\d+\.\d+$/.test(pkg.version), `package version ${pkg.version}`);
report(pkg.main === "main.js", "Electron entrypoint is main.js");
report(!buildFiles.includes("app.js"), "legacy root app.js is not packaged");

for (const file of requiredFiles) report(exists(file), `${file} exists`);

const indexHtml = read("index.html");
const mainJs = read("main.js");
const stateSchema = read("src/main/state-schema.js");

report(indexHtml.includes("src/renderer/app.js"), "index loads renderer app module");
report(indexHtml.includes("src/renderer/browser-redesign-start.js"), "index loads browser bootstrap module");
report(mainJs.includes("contextIsolation: true"), "contextIsolation is enabled");
report(mainJs.includes("nodeIntegration: false"), "nodeIntegration is disabled");
report(mainJs.includes("sandbox: true"), "main window sandbox is enabled");
report(stateSchema.includes("CURRENT_STATE_VERSION = 2"), "state schema version is current");

if (failed) process.exit(1);
console.log("\nRelease check passed.");
