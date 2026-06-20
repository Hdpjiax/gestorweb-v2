const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const tempRoot = path.join(os.tmpdir(), "gestorweb-v2-tests");

async function importEsmFromRepo(relativePath) {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const sourcePath = path.join(repoRoot, relativePath);
  const targetPath = path.join(tempRoot, `${relativePath.replace(/[\\/]/g, "__")}.mjs`);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, fs.readFileSync(sourcePath, "utf8"), "utf8");

  return import(`${pathToFileURL(targetPath).href}?t=${Date.now()}-${Math.random()}`);
}

module.exports = { importEsmFromRepo };
