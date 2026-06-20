# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ipc.spec.js >> license:status devuelve hwid y active:false en vault limpio
- Location: tests\ipc\ipc.spec.js:98:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - button "Crear nuevo perfil (Ctrl+N)" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
    - button "Navegador embebido (Ctrl+0)" [ref=e7] [cursor=pointer]:
      - img [ref=e8]
    - button "Todos los perfiles (Ctrl+1)" [ref=e11] [cursor=pointer]:
      - img [ref=e12]
    - button "Perfiles en vivo (Ctrl+2)" [ref=e17] [cursor=pointer]:
      - img [ref=e18]
    - button "Monitor en vivo (Ctrl+8)" [ref=e21] [cursor=pointer]:
      - img [ref=e22]
    - button "Network / Repeater (Ctrl+9)" [ref=e24] [cursor=pointer]:
      - img [ref=e25]
    - button "Pool de proxies (Ctrl+3)" [ref=e27] [cursor=pointer]:
      - img [ref=e28]
    - button "Tareas programadas (Ctrl+4)" [ref=e30] [cursor=pointer]:
      - img [ref=e31]
    - button "Historial (Ctrl+5)" [ref=e34] [cursor=pointer]:
      - img [ref=e35]
    - button "Estadisticas (Ctrl+6)" [ref=e39] [cursor=pointer]:
      - img [ref=e40]
    - button "Ajustes (Ctrl+7)" [ref=e41] [cursor=pointer]:
      - img [ref=e42]
    - generic [ref=e45]:
      - generic "0 proxies libres" [ref=e46]:
        - generic [ref=e47]: "0"
        - generic [ref=e48]: libres
      - generic "0% perfiles en reposo" [ref=e49]:
        - generic [ref=e50]: "-0%"
        - generic [ref=e51]: ahorro
      - button "Paleta (Ctrl+K)" [ref=e52] [cursor=pointer]:
        - img [ref=e53]
  - generic [ref=e56]:
    - banner [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]:
          - text: perfiles /
          - strong [ref=e60]: todos
        - generic [ref=e61]: 0 total
      - generic [ref=e62]:
        - textbox "buscar (/ Ctrl+K)" [ref=e63]:
          - /placeholder: buscar  (/ Ctrl+K)
        - combobox [ref=e64]:
          - option "Cualquier proxy" [selected]
          - option "Con proxy"
          - option "Sin proxy"
        - generic [ref=e65]: IP
        - generic [ref=e66]: midnight
        - generic [ref=e67]: modo ahorro activo
        - button "+ nuevo perfil" [ref=e69] [cursor=pointer]
    - main [ref=e70]:
      - generic [ref=e72]:
        - generic [ref=e73]: Sin perfiles todavia
        - generic [ref=e74]: Pulsa + nuevo perfil o Ctrl+N
  - complementary [ref=e75]:
    - generic [ref=e76]:
      - generic [ref=e77]: Inspector
      - generic [ref=e78]: Selecciona un perfil para ver y editar.
```

# Test source

```ts
  1   | /**
  2   |  * Tests IPC reales — Electron arranca de verdad, los handlers responden de verdad.
  3   |  *
  4   |  * Cada test usa electronApp.evaluate() para llamar ipcMain.handle() directamente
  5   |  * desde el proceso main (Node.js), sin pasar por el renderer ni por la UI.
  6   |  * Esto prueba la lógica real: estado, licencias, TOTP, proxies, cookies, repeater.
  7   |  *
  8   |  * Para correr:
  9   |  *   npm install
  10  |  *   npm run test:ipc
  11  |  */
  12  | const { test, expect, _electron: electron } = require('@playwright/test');
  13  | const path = require('path');
  14  | const os = require('os');
  15  | const fs = require('fs');
  16  | 
  17  | // ─── Setup / Teardown ────────────────────────────────────────────────────────
  18  | 
  19  | let electronApp;
  20  | let tmpDataDir;
  21  | 
  22  | test.beforeAll(async () => {
  23  |   tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-ipc-test-'));
  24  |   electronApp = await electron.launch({
  25  |     args: [path.join(__dirname, '../../main.js')],
  26  |     env: {
  27  |       ...process.env,
  28  |       GW_TEST_USERDATA: tmpDataDir,
  29  |       GW_LICENSE_SECRET: ''
  30  |     }
  31  |   });
  32  | });
  33  | 
  34  | test.afterAll(async () => {
  35  |   await electronApp.close();
  36  |   try { fs.rmSync(tmpDataDir, { recursive: true, force: true }); } catch {}
  37  | });
  38  | 
  39  | // Helper: invocar un handler IPC desde el proceso main sin pasar por el renderer
  40  | async function ipc(channel, ...args) {
  41  |   return electronApp.evaluate(
  42  |     async ({ ipcMain }, { ch, a }) => {
  43  |       const handler = ipcMain._invokeHandlers?.get(ch);
  44  |       if (!handler) throw new Error(`No handler registered for channel: ${ch}`);
  45  |       const fakeEvent = { sender: null, senderFrame: null };
  46  |       return handler(fakeEvent, ...a);
  47  |     },
  48  |     { ch: channel, a: args }
  49  |   );
  50  | }
  51  | 
  52  | // ─── Tests ────────────────────────────────────────────────────────────────────
  53  | 
  54  | // ── Healthcheck ──────────────────────────────────────────────────────────────
  55  | test('app:healthcheck devuelve ok:true con versiones de Electron y Chrome', async () => {
  56  |   const result = await ipc('app:healthcheck');
  57  |   expect(result.ok).toBe(true);
  58  |   expect(typeof result.electron).toBe('string');
  59  |   expect(typeof result.chrome).toBe('string');
  60  | });
  61  | 
  62  | // ── Estado ───────────────────────────────────────────────────────────────────
  63  | test('state:load devuelve estado con schema_version', async () => {
  64  |   const state = await ipc('state:load');
  65  |   expect(typeof state.schema_version).toBe('number');
  66  |   expect(state.schema_version).toBeGreaterThan(0);
  67  | });
  68  | 
  69  | test('state:save persiste y state:load lo recupera', async () => {
  70  |   const before = await ipc('state:load');
  71  |   const modified = { ...before, _ipc_test_marker: 'gw-test-42' };
  72  |   const saveResult = await ipc('state:save', modified);
  73  |   expect(saveResult.ok).toBe(true);
  74  |   const after = await ipc('state:load');
  75  |   expect(after._ipc_test_marker).toBe('gw-test-42');
  76  | });
  77  | 
  78  | test('state:save rechaza payload mayor a MAX_STATE_BYTES', async () => {
  79  |   const huge = { _junk: 'x'.repeat(6 * 1024 * 1024) };
  80  |   await expect(ipc('state:save', huge)).rejects.toThrow();
  81  | });
  82  | 
  83  | // ── Seguridad ─────────────────────────────────────────────────────────────────
  84  | test('security:status reporta contextIsolation:true y nodeIntegration:false', async () => {
  85  |   const s = await ipc('security:status');
  86  |   expect(s.contextIsolation).toBe(true);
  87  |   expect(s.nodeIntegration).toBe(false);
  88  |   expect(s.mainSandboxed).toBe(true);
  89  | });
  90  | 
  91  | // ── Licencia ─────────────────────────────────────────────────────────────────
  92  | test('license:hwid devuelve string con formato GW-XXXX-XXXX-XXXX', async () => {
  93  |   const hwid = await ipc('license:hwid');
  94  |   expect(typeof hwid).toBe('string');
  95  |   expect(hwid).toMatch(/^GW-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  96  | });
  97  | 
  98  | test('license:status devuelve hwid y active:false en vault limpio', async () => {
  99  |   const status = await ipc('license:status');
  100 |   expect(status.hwid).toMatch(/^GW-/);
> 101 |   expect(status.active).toBe(false);
      |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  102 | });
  103 | 
  104 | test('license:claimByKey rechaza clave con formato incorrecto', async () => {
  105 |   const result = await ipc('license:claimByKey', 'CLAVE-INVALIDA-123');
  106 |   expect(result.active).toBe(false);
  107 |   expect(typeof result.reason).toBe('string');
  108 | });
  109 | 
  110 | test('license:claimByKey rechaza clave GW-LIC-V1 sin GW_LICENSE_SECRET configurado', async () => {
  111 |   const fakeKey = 'GW-LIC-V1:' + Buffer.from('{"tier":"pro"}').toString('base64') + '.aabbccdd';
  112 |   const result = await ipc('license:claimByKey', fakeKey);
  113 |   expect(result.active).toBe(false);
  114 |   expect(result.reason).toMatch(/GW_LICENSE_SECRET/i);
  115 | });
  116 | 
  117 | test('license:install con clave válida GW-XXXX activa la licencia en el vault', async () => {
  118 |   const hwid = await ipc('license:hwid');
  119 |   const tail = hwid.replace(/-/g, '').toUpperCase().slice(-12);
  120 |   const validKey = `GW-${tail.slice(0,4)}-${tail.slice(4,8)}-${tail.slice(8,12)}`;
  121 |   const result = await ipc('license:install', validKey);
  122 |   expect(result.active).toBe(true);
  123 |   expect(result.tier).toBe('standard');
  124 |   const status = await ipc('license:status');
  125 |   expect(status.active).toBe(true);
  126 | });
  127 | 
  128 | // ── TOTP ──────────────────────────────────────────────────────────────────────
  129 | test('totp:code devuelve código de 6 dígitos y secondsLeft válido', async () => {
  130 |   const secret = 'JBSWY3DPEHPK3PXP';
  131 |   const result = await ipc('totp:code', secret);
  132 |   expect(result.code).toMatch(/^\d{6}$/);
  133 |   expect(result.secondsLeft).toBeGreaterThan(0);
  134 |   expect(result.secondsLeft).toBeLessThanOrEqual(30);
  135 | });
  136 | 
  137 | test('totp:code rechaza secreto base32 inválido', async () => {
  138 |   await expect(ipc('totp:code', '!!!INVALIDO!!!')).rejects.toThrow();
  139 | });
  140 | 
  141 | // ── Proxies ───────────────────────────────────────────────────────────────────
  142 | // checkProxy devuelve { healthy, latency_ms, last_error, ...proxy } — NO { ok, ms }
  143 | test('proxies:check con proxy localhost inalcanzable devuelve healthy:false', async () => {
  144 |   const result = await ipc('proxies:check', { host: '127.0.0.1', port: 19999, scheme: 'http' });
  145 |   expect(result.healthy).toBe(false);
  146 |   // latency_ms es null cuando falla
  147 |   expect(result.latency_ms).toBeNull();
  148 |   expect(typeof result.last_error).toBe('string');
  149 | });
  150 | 
  151 | test('proxies:checkAll con array vacío devuelve array vacío', async () => {
  152 |   const result = await ipc('proxies:checkAll', []);
  153 |   expect(Array.isArray(result)).toBe(true);
  154 |   expect(result.length).toBe(0);
  155 | });
  156 | 
  157 | test('proxies:checkAll trunca a 500 proxies máximo', async () => {
  158 |   const many = Array.from({ length: 600 }, (_, i) => ({ host: '127.0.0.1', port: 20000 + i, scheme: 'http' }));
  159 |   const result = await ipc('proxies:checkAll', many);
  160 |   expect(result.length).toBeLessThanOrEqual(500);
  161 | });
  162 | 
  163 | // ── Repeater ──────────────────────────────────────────────────────────────────
  164 | // example.com es de IANA — siempre disponible, siempre 200, sin dependencias externas
  165 | test('repeater:send a URL real devuelve status 200 y ms > 0', async () => {
  166 |   const result = await ipc('repeater:send', { method: 'GET', url: 'https://example.com' });
  167 |   expect(result.status).toBe(200);
  168 |   expect(typeof result.ms).toBe('number');
  169 |   expect(result.ms).toBeGreaterThan(0);
  170 | }, { timeout: 15_000 });
  171 | 
  172 | // El repeater usa la sesión global de Electron (no una sesión de perfil).
  173 | // El bloqueo de trackers solo aplica a sesiones de perfil, no al repeater.
  174 | // Este test verifica la forma de la respuesta, no el bloqueo.
  175 | test('repeater:send devuelve objeto con status, headers, body y ms', async () => {
  176 |   const result = await ipc('repeater:send', { method: 'GET', url: 'https://example.com' });
  177 |   expect(typeof result.status).toBe('number');
  178 |   expect(typeof result.headers).toBe('object');
  179 |   expect(typeof result.body).toBe('string');
  180 |   expect(typeof result.ms).toBe('number');
  181 | }, { timeout: 15_000 });
  182 | 
  183 | test('repeater:send con URL inválida devuelve status 0 sin lanzar excepción', async () => {
  184 |   const result = await ipc('repeater:send', { method: 'GET', url: 'no-es-una-url' });
  185 |   expect(result.status).toBe(0);
  186 |   expect(typeof result.body).toBe('string');
  187 | });
  188 | 
  189 | // ── Cookies ───────────────────────────────────────────────────────────────────
  190 | test('cookies:get en perfil nuevo devuelve array vacío', async () => {
  191 |   const cookies = await ipc('cookies:get', 9999);
  192 |   expect(Array.isArray(cookies)).toBe(true);
  193 | });
  194 | 
  195 | test('cookies:set guarda cookie y cookies:get la recupera', async () => {
  196 |   const pid = 8001;
  197 |   const cookie = {
  198 |     url: 'https://test.gestor.local',
  199 |     domain: 'test.gestor.local',
  200 |     name: 'gw_test_cookie',
  201 |     value: 'hello_ipc',
```