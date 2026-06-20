# Notas de recuperacion

Ruta original analizada:

`C:\Users\Antonio Garcia\Desktop\opencode-web-agent\GESTOR-WEB`

Fuentes disponibles:

- 45 capturas `photo_*.jpg`.
- Instalacion compilada `Gestor Web-1.3.0-Setup`.
- Archivo Electron `resources/app.asar`, extraido en `app-asar-extracted`.

Hallazgos tecnicos:

- App original: Electron + React.
- Nombre: `gestor-web`.
- Version: `1.3.0`.
- Descripcion: gestor de perfiles web aislados con proxy y fingerprint por sesion.
- Dependencias recuperadas: `electron-updater`, `react`, `react-dom`, `lucide-react`, `playwright`, `playwright-camoufox`, `proxy-chain`, `socks-proxy-agent`, `undici`, `zustand`.

APIs usadas por el renderer original:

- `license`: `hwid`, `status`, `install`, `claimByKey`, `ipcheck`, `runUpdate`.
- `profiles`: `list`, `create`, `update`, `open`, `close`, `bulkOpen`, `bulkClose`, `remove`, `clone`, `wipe`, `rotateProxy`, `detection`, `screenshot`, `tile`, `focus`, `live`, `consoleLines`.
- `proxies`: `list`, `add`, `bulkImport`, `check`, `checkAll`, `pickFree`, `remove`.
- `cookies`: `get`, `set`, `clear`.
- `macros`: `list`, `add`, `remove`, `run`, `buildWarmup`, `runWarmup`, `recordStart`, `recordStop`, `isRecording`.
- `schedules`: `list`, `add`, `toggle`, `remove`.
- `tor`: `status`, `start`, `stop`, `install`, `detect`, `pickExe`, `isInstalled`.
- `chromium`: `install`.
- `repeater`: `send`.
- `vault`: `exportFile`, `importFile`.
- `events`, `net`, `preview`, `updater`, `security`, `api`, `app`.

Pantallas reconstruidas:

- Activacion.
- Onboarding.
- Navegador embebido.
- Perfiles todos/en vivo.
- Inspector Fingerprint/Privacy/Auth/Notas/Logs/Macros.
- Pool de proxies.
- Tareas programadas.
- Historial.
- Estadisticas.
- Monitor en vivo.
- Network repeater decoder.
- Ajustes.
