# Servidor de licencias Gestor Web

Backend online, autohospedable y sin dependencias externas de npm. Usa Node.js puro, claves RSA y un archivo JSON como base de datos inicial.

## 1. Generar claves

```bash
cd backend/license-server
npm run keys
```

Esto crea:

- `private_key.pem`: clave privada del servidor. No se comparte ni se mete en la app.
- `public_key.pem`: clave publica que usa la app para verificar firmas.
- `.env`: archivo privado con `LICENSE_ADMIN_TOKEN`. Esta ignorado por git.

## 2. Configurar servidor

`npm run keys` ya crea un `.env` funcional para pruebas locales. Para produccion ajusta:

```env
PORT=8787
LICENSE_ADMIN_TOKEN=CAMBIA_ESTE_TOKEN
PUBLIC_LICENSE_SERVER_URL=http://TU-SERVIDOR:8787
DB_FILE=./licenses-db.json
PRIVATE_KEY_FILE=./private_key.pem
PUBLIC_KEY_FILE=./public_key.pem
```

`PUBLIC_LICENSE_SERVER_URL` debe ser la URL que la app del cliente pueda alcanzar. En pruebas locales puede ser `http://127.0.0.1:8787`.

## 3. Iniciar servidor

```bash
npm start
```

Prueba:

```bash
curl http://127.0.0.1:8787/health
```

## 4. Crear licencia

Planes soportados:

- `1d`
- `7d`
- `15d`
- `30d`
- `lifetime`

Forma rapida con script:

```bash
npm run issue -- GW-ABCD-1234-5678 30d standard
```

Tambien puedes usar HTTP:

```bash
curl -X POST http://127.0.0.1:8787/admin/licenses \
  -H "content-type: application/json" \
  -H "x-admin-token: TU_TOKEN_ADMIN" \
  -d '{
    "hwid":"GW-ABCD-1234-5678",
    "plan":"30d",
    "tier":"standard",
    "features":["standard"]
  }'
```

El campo `licenseText` devuelto es lo que se entrega al cliente. El formato es:

```txt
GW-LIC-V1
PAYLOAD_BASE64URL
FIRMA_RSA_SHA256_BASE64URL
```

El payload incluye:

- `id`
- `hwid`
- `plan`
- `type`
- `issued_at`
- `expires_at`
- `features`
- `license_server`
- `sig_alg`

## 5. Revocar licencia

Forma rapida con script:

```bash
npm run revoke -- GW-20260621-ABCDEF123456 "pago vencido"
```

Tambien puedes usar HTTP:

```bash
curl -X POST http://127.0.0.1:8787/admin/revoke \
  -H "content-type: application/json" \
  -H "x-admin-token: TU_TOKEN_ADMIN" \
  -d '{
    "id":"GW-20260621-ABCDEF123456",
    "reason":"pago vencido"
  }'
```

La app consulta `/v1/verify`. Si la licencia fue revocada, deja de estar activa aunque la firma sea valida.

## 6. Listar licencias

```bash
curl http://127.0.0.1:8787/admin/licenses \
  -H "x-admin-token: TU_TOKEN_ADMIN"
```

## 7. Configurar la app Electron

La app necesita la clave publica y la URL del servidor.

En desarrollo Windows:

```bash
set GW_LICENSE_PUBLIC_KEY_FILE=C:\ruta\public_key.pem
set GW_LICENSE_SERVER_URL=http://127.0.0.1:8787
npm start
```

En Linux/macOS:

```bash
export GW_LICENSE_PUBLIC_KEY_FILE=/ruta/public_key.pem
export GW_LICENSE_SERVER_URL=http://127.0.0.1:8787
npm start
```

Para produccion, la app debe compilarse con la clave publica configurada. Nunca metas `private_key.pem` en la app.

## 8. Android

Para Android no se debe depender de IMEI, MAC o serial. El equivalente recomendado para este sistema es generar un `deviceInstallId` tipo UUID al primer arranque, guardarlo en almacenamiento interno/seguro de la app y usarlo como `hwid` para pedir la licencia.
