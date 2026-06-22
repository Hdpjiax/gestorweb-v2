# Builds de entrega

## Windows: unico setup.exe

Requisitos:

- Windows
- Node.js 18+
- npm install ejecutado
- `build/icon.ico` existente
- `src/main/license-public-key.pem` incluido si se usaran licencias firmadas en produccion

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

El proyecto principal es Electron. Electron no genera APK directamente. Para un APK real se necesita un port Android dentro de `/android`.

El comando reservado es:

```bash
npm run dist:apk
```

Cuando exista un proyecto Android funcional con `android/gradlew`, el script ejecutara:

```bash
cd android
./gradlew assembleRelease
```

y copiara el APK final a:

```txt
dist/Gestor-Web.apk
```

## Pendiente para APK funcional completo

Crear `/android` con una de estas rutas:

### Ruta A: Android nativo

- Kotlin/Java.
- WebView o UI nativa.
- Implementar `deviceInstallId` como HWID Android.
- Implementar validacion `GW-LIC-V1` contra Supabase.
- Implementar almacenamiento seguro.
- Reemplazar funciones Electron IPC por codigo Android.

### Ruta B: Capacitor

- Reutilizar parte de la UI web.
- Crear plugins nativos para licencias, storage, WebView/perfiles, cookies y red.
- Generar APK release desde Android Studio/Gradle.

## No hacer

No meter en la APK:

- `private_key.pem`
- `SUPABASE_SERVICE_ROLE_KEY`
- credenciales admin

La APK solo debe llevar:

- clave publica de licencia
- Supabase anon/publishable key
- logica de validacion publica
