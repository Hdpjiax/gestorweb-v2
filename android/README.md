# Gestor Web Android 1.5.0

Cliente Android nativo conectado al mismo backend de licencias que Windows. Cada instalación genera un `ANDROID-UUID` guardado cifrado; las keys se emiten desde el panel admin seleccionando plataforma `android` o `any`.

## Compilar

Requisitos: Android Studio/SDK 35 y JDK 17. Configura la URL HTTPS publica del backend:

```powershell
cd android
./gradlew assembleRelease -PLICENSE_SERVER_URL=https://licencias.tudominio.com
```

El APK queda en `app/build/outputs/apk/release/`. Antes de distribuir, configura firma de release en `app/build.gradle` o desde Android Studio.

Android usa WebView/Chromium. El proxy se aplica al perfil activo mediante AndroidX WebKit; Android no puede ejecutar los binarios de escritorio Electron, Firefox o Camoufox dentro de un APK.
