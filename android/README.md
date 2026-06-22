# Gestor Web Android 1.5.0

Cliente Android nativo con la misma licencia Windows/Android y una interfaz organizada en paneles XML: Panel, Perfiles, Fingerprint, Privacidad, Red/Historial y Ajustes.

## Incluido

- crear, editar, eliminar, importar y exportar perfiles JSON;
- proxy por perfil mediante `ProxyController` cuando el proveedor WebView lo soporta;
- historial por perfil y monitor básico de solicitudes GET/recursos;
- almacenamiento, cookies y caché aislados por perfil cuando el WebView instalado expone `MULTI_PROFILE`;
- presets `none`, `standard`, `hardened` y `anonymous`;
- niveles de fingerprint `off`, `balanced` y `strong`;
- bloqueo local de aproximadamente 80 dominios de tracking, limpieza de parámetros, Force HTTPS, WebRTC mitigado, no-cache, auto-wipe y anti-leak;
- inyección en document-start mediante AndroidX WebKit cuando la versión instalada lo permite;
- splash, icono adaptativo, barra de progreso, transiciones y deep link `gestorweb://profile/ID`.

La exportación excluye contraseñas de proxy y licencias.

## Límites reales de Android

Android WebView siempre usa el Chromium provisto por Android. No puede cargar los binarios Electron, Firefox o Camoufox del escritorio. Tampoco permite a una aplicación configurar DoH global sin cambiar el DNS privado del sistema, ejecutar headless real ni producir un HAR completo con cuerpos POST/respuestas. Tor requiere Orbot u otro servicio externo. La mitigación de fingerprint reduce superficies, pero no garantiza invisibilidad o indetectabilidad.

## Compilar

Requisitos: Android SDK 35 y JDK 17.

```powershell
cd android
.\gradlew.bat assembleRelease
```

El APK queda en `app/build/outputs/apk/release/`. La configuración actual usa firma debug para generar un APK instalable de pruebas; antes de distribución comercial configura un keystore privado de release.
