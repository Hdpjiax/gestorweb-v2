const fs = require("fs");
const os = require("os");
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

function javaMajor(versionOutput) {
  const text = String(versionOutput || "");
  const match = text.match(/version\s+"([^"]+)"/i) || text.match(/openjdk\s+version\s+"([^"]+)"/i);
  if (!match) return 0;
  const version = match[1];
  if (version.startsWith("1.")) return Number(version.split(".")[1]) || 0;
  return Number(version.split(/[.+-]/)[0]) || 0;
}

function assertJava17() {
  const result = spawnSync("java", ["-version"], { encoding: "utf8", shell: isWindows });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const major = javaMajor(output);
  if (major >= 17) return;

  console.error([
    "Java invalido para compilar Android.",
    "",
    `Version detectada: ${major ? `Java ${major}` : "no detectada"}`,
    "Android Gradle Plugin 8.x requiere Java 17 o superior.",
    "",
    "Solucion rapida en PowerShell si tienes Android Studio:",
    "$env:JAVA_HOME=\"C:\\Program Files\\Android\\Android Studio\\jbr\"",
    "$env:Path=\"$env:JAVA_HOME\\bin;$env:Path\"",
    "java -version",
    "npm run dist:apk",
    "",
    "Tambien puedes instalar Temurin/JDK 17 y apuntar JAVA_HOME a esa carpeta."
  ].join("\n"));
  process.exit(1);
}

function sdkCandidates() {
  return [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk") : "",
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk"),
    path.join(os.homedir(), "Library", "Android", "sdk"),
    "/Users/Shared/Android/sdk",
    "/opt/android-sdk",
    "/usr/local/share/android-sdk"
  ].filter(Boolean);
}

function isValidSdk(dir) {
  if (!dir || !fs.existsSync(dir)) return false;
  return fs.existsSync(path.join(dir, "platforms")) || fs.existsSync(path.join(dir, "cmdline-tools"));
}

function configureAndroidSdk() {
  const localProperties = path.join(androidDir, "local.properties");
  if (fs.existsSync(localProperties)) return;

  const sdk = sdkCandidates().find(isValidSdk);
  if (!sdk) {
    console.error([
      "Android SDK no encontrado.",
      "",
      "Solucion rapida en PowerShell si tienes Android Studio instalado:",
      "$env:ANDROID_HOME=\"$env:LOCALAPPDATA\\Android\\Sdk\"",
      "$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME",
      "",
      "Luego verifica que exista:",
      "Test-Path \"$env:ANDROID_HOME\"",
      "",
      "Y vuelve a ejecutar:",
      "npm run dist:apk",
      "",
      "Alternativa manual: crea android/local.properties con esta linea:",
      "sdk.dir=C:/Users/Antonio Garcia/AppData/Local/Android/Sdk"
    ].join("\n"));
    process.exit(1);
  }

  const normalized = sdk.replace(/\\/g, "/");
  fs.writeFileSync(localProperties, `sdk.dir=${normalized}\n`, "utf8");
  console.log(`Android SDK configurado: ${path.relative(root, localProperties)} -> ${normalized}`);
}

assertJava17();
configureAndroidSdk();

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
