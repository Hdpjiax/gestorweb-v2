# Gestor Web Rebuild

Replica limpia creada desde los restos recuperados de `GESTOR-WEB`.

## Como abrir

Abre `index.html` directamente en el navegador. No requiere `npm install` ni binarios.

## Que incluye

- Activacion simulada por HWID/licencia.
- Onboarding inicial.
- Dashboard oscuro similar a Gestor Web v1.3.0.
- Perfiles con fingerprint, privacidad, auth, notas, logs y macros.
- CRUD local de proxies, bulk import y health check simulado.
- Navegador embebido simulado con pestanas y links de auditoria.
- Monitor en vivo, network repeater simulado, historial y estadisticas.
- Export/import de vault JSON con todos los datos locales.

## Pendiente para convertirlo en app real

- Envolver en Electron.
- Implementar backend con `contextBridge` y APIs `window.api.*`.
- Conectar Playwright/Camoufox para perfiles reales.
- Persistir en SQLite o archivos de usuario.
- Implementar proxy-chain, cookies reales, HAR, TOTP real y scheduler.
- Sustituir la activacion simulada por firma/verificacion real.
