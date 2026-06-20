const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const ignoredDirs = new Set([".git", "node_modules", "dist", "out", "release"]);
const targets = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      targets.push(path.join(dir, entry.name));
    }
  }
}

walk(root);
targets.sort();

let failed = false;
for (const file of targets) {
  const relative = path.relative(root, file);
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "pipe", encoding: "utf8" });
  if (result.status === 0) {
    console.log(`ok   ${relative}`);
    continue;
  }

  failed = true;
  console.error(`fail ${relative}`);
  if (result.stdout) console.error(result.stdout.trim());
  if (result.stderr) console.error(result.stderr.trim());
}

if (failed) {
  process.exit(1);
}

console.log(`\nChecked ${targets.length} JavaScript files.`);
