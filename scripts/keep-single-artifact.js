const fs = require("fs");
const path = require("path");

const mode = process.argv[2] || "exe";
const distDir = path.resolve(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  console.error(`No existe dist: ${distDir}`);
  process.exit(1);
}

const keepExt = mode === "apk" ? ".apk" : ".exe";
const files = fs.readdirSync(distDir).map((name) => path.join(distDir, name));
const keep = files
  .filter((file) => path.extname(file).toLowerCase() === keepExt)
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

if (!keep.length) {
  console.error(`No se encontro ningun artefacto ${keepExt} en ${distDir}`);
  process.exit(1);
}

const selected = keep[0];
for (const file of files) {
  if (file === selected) continue;
  const stat = fs.statSync(file);
  if (stat.isDirectory()) {
    fs.rmSync(file, { recursive: true, force: true });
  } else {
    fs.rmSync(file, { force: true });
  }
}

console.log(`Artefacto unico listo: ${path.relative(path.resolve(__dirname, ".."), selected)}`);
