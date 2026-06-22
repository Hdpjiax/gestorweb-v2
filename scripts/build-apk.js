const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");
const isWindows = process.platform === "win32";
const gradlew = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

if (!fs.existsSync(androidDir) || !fs.existsSync(gradlew)) {
  console.error([
    "No existe un proyecto Android funcional todavia.",
    "",
    "El programa actual es Electron y no se puede convertir directamente a APK.",
    "Para generar un APK unico se debe crear el port Android en /android y reemplazar las funciones Electron IPC por implementaciones Android.",
    "",
    "Pendiente tecnico:",
    "1. Crear proyecto Android/Capacitor o Android nativo en /android.",
    "2. Implementar deviceInstallId como HWID Android.",
    "3. Implementar validacion de licencia GW-LIC-V1 contra Supabase.",
    "4. Adaptar WebView/perfiles/cookies/proxies a Android.",
    "5. Firmar release APK/AAB.",
    "",
    "Cuando /android exista, este comando ejecutara gradlew assembleRelease y dejara el APK unico en /dist."
  ].join("\n"));
  process.exit(1);
}

const result = spawnSync(gradlew, ["assembleRelease"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: isWindows
});

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
