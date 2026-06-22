# Builds de entrega

## Windows: unico setup.exe

Requisitos:

- Windows
- Node.js 18+
- `npm install` ejecutado
- `build/icon.ico` existente
- clave publica disponible en `backend/license-server/public_key.pem`, `src/main/license-public-key.pem` o `GW_LICENSE_PUBLIC_KEY_FILE`

Comando:

```bash
npm run dist:setup
```

Salida esperada:

```txt
dist/Gestor-Web-Setup-1.5.0.exe
```

Antes de compilar, el script copia automaticamente la clave publica a:

```txt
src/main/license-public-key.pem
```

Si esa clave no existe, el build falla. Esto evita que el setup instalado marque como invalidas las licencias firmadas aunque esten registradas en Supabase.

## Android: unico APK

Ya existe un proyecto Android nativo en `/android`.

El script tambien prepara automaticamente la clave publica en:

```txt
android/app/src/main/assets/license-public-key.pem
```

Comando desde la raiz del repo:

```bash
npm run dist:apk
```

Salida esperada:

```txt
dist/Gestor-Web.apk
```

El script ejecuta `assembleRelease`. Si existe wrapper completo usa `gradlew`; si no, intenta usar `gradle` instalado en el sistema.

## Licencias Android

1. Instala `dist/Gestor-Web.apk`.
2. Abre la app y copia el ID `ANDROID-...`.
3. Desde el panel admin de Windows genera una licencia para ese HWID.
4. Pega la licencia `GW-LIC-V1` en Android.

## No hacer

No meter en el setup ni en el APK:

- `private_key.pem`
- `SUPABASE_SERVICE_ROLE_KEY`
- credenciales admin

El cliente solo debe llevar:

- clave publica de licencia
- Supabase anon/publishable key incluida dentro del payload de cada licencia
- logica de validacion publica
