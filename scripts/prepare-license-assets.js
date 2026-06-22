const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mode = process.argv[2] || "all";

const candidates = [
  process.env.GW_LICENSE_PUBLIC_KEY_FILE,
  path.join(root, "backend", "license-server", "public_key.pem"),
  path.join(root, "src", "main", "license-public-key.pem")
].filter(Boolean);

function readPublicKey() {
  for (const candidate of candidates) {
    const file = path.resolve(candidate);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8").trim();
    if (!text) continue;
    if (!text.includes("BEGIN PUBLIC KEY") || !text.includes("END PUBLIC KEY")) continue;
    if (text.includes("REPLACE_WITH") || text.includes("placeholder")) continue;
    return `${text}\n`;
  }
  return "";
}

function writeIfNeeded(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === content) return;
  fs.writeFileSync(target, content, "utf8");
  console.log(`Clave publica preparada: ${path.relative(root, target)}`);
}

const publicKey = readPublicKey();
if (!publicKey) {
  console.error([
    "No se encontro una clave publica valida para empaquetar.",
    "",
    "Solucion:",
    "1. Ejecuta: cd backend/license-server && npm run keys",
    "   o configura GW_LICENSE_PUBLIC_KEY_FILE apuntando a public_key.pem.",
    "2. Vuelve a ejecutar el build.",
    "",
    "La app instalada necesita src/main/license-public-key.pem dentro del paquete.",
    "Sin ese archivo las licencias firmadas se veran como invalidas aunque esten registradas en Supabase."
  ].join("\n"));
  process.exit(1);
}

if (mode === "all" || mode === "windows" || mode === "setup") {
  writeIfNeeded(path.join(root, "src", "main", "license-public-key.pem"), publicKey);
}

if (mode === "all" || mode === "android" || mode === "apk") {
  writeIfNeeded(path.join(root, "android", "app", "src", "main", "assets", "license-public-key.pem"), publicKey);
}

console.log("Assets de licencia listos.");
