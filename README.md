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

Ejecuta pruebas unitarias ligeras para validadores de seguridad, esquema de estado, helpers del renderer, parser de proxies y pulido UX.

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
- Proxies aislados por perfil (HTTP, HTTPS, SOCKS4 y SOCKS5), con autenticacion, bulk import y health check TLS.
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
- Pruebas de esquema de estado en `tests/main/state-schema.test.js`.
- Pruebas de helpers en `tests/renderer/helpers.test.js`.
- Pruebas del puente de proxies y protocolos en `tests/main/proxy-runtime.test.js`.
- Prueba Electron de dos perfiles con proxies autenticados distintos en `tests/ipc/ipc.spec.js`.
- Pruebas de parser de proxies en `tests/renderer/proxy-parser.test.js`.
- Pruebas de pulido UX en `tests/renderer/ux-polish.test.js`.
- Checklist manual en `QA_SMOKE_TEST.md`.

## UI / UX implementado

- Capa visual no invasiva en `src/renderer/ux-polish.js`.
- Foco visible para navegacion por teclado.
- Etiquetas accesibles automaticas para botones.
- Roles basicos para modales y paleta.
- Microinteracciones en botones, filas, tarjetas y modales.
- Respeto a `prefers-reduced-motion`.
- Guia de mantenimiento en `UI_UX_GUIDE.md`.

## Backend / persistencia implementado

- Esquema de estado versionado en `src/main/state-schema.js`.
- Migracion automatica a `schema_version: 2`.
- Escritura JSON recuperable con archivo temporal y `.bak`.
- Recuperacion automatica desde backup si `state.json` no se puede leer.
- Limpieza de `liveIds` al cargar/migrar para evitar sesiones fantasma.
- Historiales limitados para evitar crecimiento excesivo del archivo.
- Guia de datos en `DATA_STORAGE.md`.

## Pendiente tecnico

- Separar componentes grandes de `src/renderer/views.js`.
- Agregar pruebas para flujos de IPC y persistencia con Electron real.
- Ampliar validacion defensiva de payloads IPC con esquemas versionados por entidad.
- Revisar compatibilidad de sandbox/webview en build final de Windows.
- Evaluar migracion futura a SQLite si crece el volumen de datos.
- Sustituir la activacion simulada por verificacion real basada en firma.
