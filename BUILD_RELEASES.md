# Builds de entrega

## Windows: unico setup.exe

Requisitos:

- Windows
- Node.js 18+
- `npm install` ejecutado
- `build/icon.ico` existente
- `src/main/license-public-key.pem` incluido para licencias firmadas en produccion

Comando:

```bash
npm run dist:setup
```

Salida esperada:

```txt
dist/Gestor-Web-Setup-1.5.0.exe
```

El script ejecuta Electron Builder y despues limpia `dist` para dejar solo el `.exe` mas reciente.

## Android: unico APK

Ya existe un proyecto Android nativo en `/android`.

Antes de compilar, reemplaza el placeholder de clave publica en:

```txt
android/app/src/main/assets/license-public-key.pem
```

con el contenido real de:

```txt
backend/license-server/public_key.pem
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
