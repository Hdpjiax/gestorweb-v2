# Gestor Web Android 1.5.0

Cliente Android nativo. No ejecuta Electron dentro del APK; usa Android WebView y valida licencias `GW-LIC-V1` contra Supabase DB-only.

Cada instalacion genera un `ANDROID-UUID` guardado en almacenamiento cifrado. Ese valor se usa como HWID para emitir licencias desde el panel admin de Windows.

## Requisitos

- Android Studio o Android SDK 35.
- JDK 17.
- Gradle instalado si no tienes `gradle-wrapper.jar`.
- Clave publica de licencias en `android/app/src/main/assets/license-public-key.pem`.

## Configurar clave publica

Copia el contenido real de:

```txt
backend/license-server/public_key.pem
```

y reemplaza el placeholder en:

```txt
android/app/src/main/assets/license-public-key.pem
```

Nunca copies `private_key.pem` ni `SUPABASE_SERVICE_ROLE_KEY` dentro del APK.

## Compilar APK unico desde la raiz del repo

```powershell
npm run dist:apk
```

Salida:

```txt
dist/Gestor-Web.apk
```

El script ejecuta `assembleRelease`. Si existe wrapper completo usa `gradlew`; si no, usa `gradle` instalado en el sistema.

## Generar licencia Android

1. Instala el APK.
2. Abre la app y copia el ID `ANDROID-...`.
3. En el panel admin de Windows genera una licencia para ese HWID.
4. Pega la licencia `GW-LIC-V1` en Android.

## Limitaciones Android actuales

- Usa WebView/Chromium del sistema.
- No puede ejecutar Electron, Firefox ni Camoufox dentro del APK.
- Soporta perfiles simples: nombre, URL, proxy y user-agent.
- La validacion online se repite cada 60 segundos mientras hay navegador abierto.
