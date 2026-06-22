const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");
const isWindows = process.platform === "win32";
const gradlew = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");
const wrapperJar = path.join(androidDir, "gradle", "wrapper", "gradle-wrapper.jar");
const task = process.argv[2] === "debug" ? "assembleDebug" : "assembleRelease";

if (!fs.existsSync(androidDir)) {
  console.error("No existe la carpeta android.");
  process.exit(1);
}

const hasWrapper = fs.existsSync(gradlew) && fs.existsSync(wrapperJar);

function runGradle() {
  if (hasWrapper && isWindows) {
    // Ejecutar desde cwd evita problemas con rutas como C:\Users\Antonio Garcia\...
    // Usamos CALL porque gradlew.bat es un archivo batch.
    return spawnSync("cmd.exe", ["/d", "/c", "call", "gradlew.bat", task], {
      cwd: androidDir,
      stdio: "inherit",
      shell: false
    });
  }

  if (hasWrapper) {
    return spawnSync(gradlew, [task], {
      cwd: androidDir,
      stdio: "inherit",
      shell: false
    });
  }

  console.warn("No se encontro gradle-wrapper.jar. Usando Gradle instalado en el sistema.");
  return spawnSync("gradle", [task], {
    cwd: androidDir,
    stdio: "inherit",
    shell: isWindows
  });
}

const result = runGradle();
if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);

const apkCandidates = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file);
    else if (name.toLowerCase().endsWith(".apk")) apkCandidates.push(file);
  }
}
walk(androidDir);

apkCandidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
if (!apkCandidates.length) {
  console.error("Gradle termino, pero no se encontro APK.");
  process.exit(1);
}

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const target = path.join(root, "dist", "Gestor-Web.apk");
fs.copyFileSync(apkCandidates[0], target);
console.log(`APK unico listo: ${path.relative(root, target)}`);
