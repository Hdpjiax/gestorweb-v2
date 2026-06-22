# Gestor Web Android 1.5.0

Cliente Android nativo. No ejecuta Electron dentro del APK; usa Android WebView y valida licencias `GW-LIC-V1` contra Supabase DB-only.

Cada instalacion genera un `ANDROID-UUID` guardado en almacenamiento cifrado. Ese valor se usa como HWID para emitir licencias desde el panel admin de Windows.

## Requisitos

- Android Studio o Android SDK 35.
- JDK 17 o superior. El script intenta usar automaticamente el JDK de Android Studio.
- Clave publica de licencias en `android/app/src/main/assets/license-public-key.pem`.

## Compilar APK unico desde la raiz del repo

```powershell
npm run dist:apk
```

Salida:

```txt
dist/Gestor-Web.apk
```

El script prepara la clave publica, configura Android SDK si lo encuentra, limpia el proyecto y ejecuta `assembleRelease`.

## Generar licencia Android

1. Instala el APK.
2. Abre la app y copia el ID `ANDROID-...`.
3. En el panel admin de Windows genera una licencia para ese HWID.
4. Pega la licencia `GW-LIC-V1` en Android.

## Panel Android

La app incluye:

- Pantalla de activacion con HWID copiable.
- Dashboard oscuro tipo panel.
- Resumen de licencia activa.
- Conteo de perfiles y perfiles con proxy.
- Creacion de perfiles con nombre, URL, proxy, user-agent y modo.
- Tarjetas de perfil con acciones de abrir/eliminar.
- Navegador interno con barra superior y estado del perfil.

## Modos de perfil

Los modos son controles legitimos de WebView:

- `compatibilidad`: mayor compatibilidad con sitios web; permite cookies de terceros.
- `privado`: bloquea cookies de terceros, geolocalizacion y contenido mixto.
- `estricto`: desactiva cache, bloquea cookies y endurece contenido mixto.

## Limitaciones Android actuales

- Usa WebView/Chromium del sistema.
- No puede ejecutar Electron, Firefox ni Camoufox dentro del APK.
- No incluye credenciales admin, `private_key.pem` ni `SUPABASE_SERVICE_ROLE_KEY`.
- La validacion online se repite cada 60 segundos mientras hay navegador abierto.
