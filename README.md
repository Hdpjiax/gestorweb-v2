# Gestor Web Rebuild

Replica limpia creada desde los restos recuperados de `GESTOR-WEB`.

## Estado actual

El proyecto ya esta preparado para ejecutarse como aplicacion Electron.

## Requisitos

- Node.js instalado.
- npm instalado.

## Como abrir en desarrollo

```bash
npm install
npm start
```

## Validar sintaxis del proyecto

```bash
npm run check
```

Este comando revisa todos los archivos `.js` del repositorio, incluyendo `main.js`, `preload.js`, `app.js`, `src/main/**`, `src/renderer/**` y `scripts/**`.

## Ejecutar pruebas

```bash
npm test
```

Ejecuta pruebas unitarias ligeras para validadores de seguridad, helpers del renderer y parser de proxies.

## QA completo

```bash
npm run qa
```

Ejecuta validacion de sintaxis y pruebas unitarias. Despues de este comando, usa `QA_SMOKE_TEST.md` para validar manualmente el flujo Electron.

## Generar instalador Windows

```bash
npm run dist
```

El instalador se genera en la carpeta `dist/`.

## Que incluye

- Activacion simulada por HWID/licencia.
- Onboarding inicial.
- Dashboard oscuro similar a Gestor Web v1.3.0.
- Perfiles con fingerprint, privacidad, auth, notas, logs y macros.
- CRUD local de proxies, bulk import y health check.
- Navegador embebido con pestanas y enlaces de auditoria.
- Monitor en vivo, network repeater, historial y estadisticas.
- Export/import de vault JSON con todos los datos locales.

## Seguridad defensiva implementada

- Escape seguro de HTML en el renderer.
- `contextIsolation` activo y `nodeIntegration` desactivado.
- Sandbox activo en la ventana principal.
- Validacion de URLs externas y navegacion HTTP/HTTPS.
- Validacion defensiva de payloads IPC para estado, perfiles, cookies, TOTP, repeater y vault.
- Limites basicos de tamano para estado, vault, cookies y cuerpo del repeater.
- API de preload congelada y sin listener IPC generico.

## QA implementado

- Runner ligero en `scripts/run-tests.js`.
- Pruebas de seguridad en `tests/main/security.test.js`.
- Pruebas de helpers en `tests/renderer/helpers.test.js`.
- Pruebas de parser de proxies en `tests/renderer/proxy-parser.test.js`.
- Checklist manual en `QA_SMOKE_TEST.md`.

## Pendiente tecnico

- Separar componentes grandes de `src/renderer/views.js`.
- Agregar pruebas para normalizacion de estado, flujos de IPC y persistencia.
- Ampliar validacion defensiva de payloads IPC con esquemas versionados.
- Revisar compatibilidad de sandbox/webview en build final de Windows.
- Migrar persistencia a SQLite o a archivos versionados por esquema.
- Sustituir la activacion simulada por verificacion real basada en firma.
