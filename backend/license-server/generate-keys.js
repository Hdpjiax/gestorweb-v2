const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const privateKeyPath = path.join(__dirname, "private_key.pem");
const publicKeyPath = path.join(__dirname, "public_key.pem");
const envPath = path.join(__dirname, ".env.example");

if (fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath)) {
  console.error("Ya existen private_key.pem o public_key.pem. Borralos manualmente si quieres regenerarlos.");
  process.exit(1);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

const adminToken = `gw_admin_${crypto.randomBytes(32).toString("base64url")}`;

fs.writeFileSync(privateKeyPath, privateKey, { encoding: "utf8", mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey, { encoding: "utf8", mode: 0o644 });
fs.writeFileSync(envPath, [
  "PORT=8787",
  `LICENSE_ADMIN_TOKEN=${adminToken}`,
  "PUBLIC_LICENSE_SERVER_URL=http://127.0.0.1:8787",
  "DB_FILE=./licenses-db.json",
  "PRIVATE_KEY_FILE=./private_key.pem",
  "PUBLIC_KEY_FILE=./public_key.pem",
  "",
  "# Para la app Electron:",
  "# GW_LICENSE_SERVER_URL=http://127.0.0.1:8787",
  "# GW_LICENSE_PUBLIC_KEY_FILE=/ruta/absoluta/public_key.pem",
  ""
].join("\n"));

console.log("Keys generadas:");
console.log(`- ${privateKeyPath}  NO compartir`);
console.log(`- ${publicKeyPath}   copiar a la app / build`);
console.log(`- ${envPath}         contiene token admin de ejemplo`);
