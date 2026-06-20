# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ipc.spec.js >> proxies:check con proxy localhost inalcanzable devuelve ok:false
- Location: tests\ipc\ipc.spec.js:150:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: undefined
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Activacion" [level=1] [ref=e6]
    - generic [ref=e7]: Esta copia necesita una licencia para arrancar
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]: 1. Tu HWID
      - generic [ref=e11]:
        - textbox [ref=e12]: GW-9488-BD24-6108
        - button "copiar HWID" [ref=e13] [cursor=pointer]
      - generic [ref=e14]: "ID corto: 9488BD246108"
      - generic [ref=e15]: Envia tu HWID al vendedor. El emitira un .gw firmado.
    - generic [ref=e16]:
      - generic [ref=e17]: 2. Activar licencia
      - textbox "GW-XXXX-XXXX-XXXX o contenido del .gw (GW-LIC-V1...)" [ref=e18]
    - generic [ref=e19]:
      - button "importar archivo .gw" [ref=e20] [cursor=pointer]
      - button "activar" [ref=e21] [cursor=pointer]
  - generic [ref=e22]:
    - generic [ref=e23]: "Estado: sin licencia"
    - generic [ref=e24]: HWID generado de CPU + placa + UUID + disco + MAC
```

# Test source

```ts
  52  |       return handler(fakeEvent, ...a);
  53  |     },
  54  |     { ch: channel, a: args }
  55  |   );
  56  | }
  57  | 
  58  | // ─── Tests ────────────────────────────────────────────────────────────────────
  59  | 
  60  | // ── Healthcheck ──────────────────────────────────────────────────────────────
  61  | test('app:healthcheck devuelve ok:true con versiones de Electron y Chrome', async () => {
  62  |   const result = await ipc('app:healthcheck');
  63  |   expect(result.ok).toBe(true);
  64  |   expect(typeof result.electron).toBe('string');
  65  |   expect(typeof result.chrome).toBe('string');
  66  | });
  67  | 
  68  | // ── Estado ───────────────────────────────────────────────────────────────────
  69  | test('state:load devuelve estado con schema_version', async () => {
  70  |   const state = await ipc('state:load');
  71  |   expect(typeof state.schema_version).toBe('number');
  72  |   expect(state.schema_version).toBeGreaterThan(0);
  73  | });
  74  | 
  75  | test('state:save persiste y state:load lo recupera', async () => {
  76  |   const before = await ipc('state:load');
  77  |   const modified = { ...before, _ipc_test_marker: 'gw-test-42' };
  78  |   const saveResult = await ipc('state:save', modified);
  79  |   expect(saveResult.ok).toBe(true);
  80  |   const after = await ipc('state:load');
  81  |   expect(after._ipc_test_marker).toBe('gw-test-42');
  82  | });
  83  | 
  84  | test('state:save rechaza payload mayor a MAX_STATE_BYTES', async () => {
  85  |   const huge = { _junk: 'x'.repeat(6 * 1024 * 1024) };
  86  |   await expect(ipc('state:save', huge)).rejects.toThrow();
  87  | });
  88  | 
  89  | // ── Seguridad ─────────────────────────────────────────────────────────────────
  90  | test('security:status reporta contextIsolation:true y nodeIntegration:false', async () => {
  91  |   const s = await ipc('security:status');
  92  |   expect(s.contextIsolation).toBe(true);
  93  |   expect(s.nodeIntegration).toBe(false);
  94  |   expect(s.mainSandboxed).toBe(true);
  95  | });
  96  | 
  97  | // ── Licencia ─────────────────────────────────────────────────────────────────
  98  | test('license:hwid devuelve string con formato GW-XXXX-XXXX-XXXX', async () => {
  99  |   const hwid = await ipc('license:hwid');
  100 |   expect(typeof hwid).toBe('string');
  101 |   expect(hwid).toMatch(/^GW-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  102 | });
  103 | 
  104 | test('license:status devuelve hwid y active:false en vault limpio', async () => {
  105 |   const status = await ipc('license:status');
  106 |   expect(status.hwid).toMatch(/^GW-/);
  107 |   expect(status.active).toBe(false);
  108 | });
  109 | 
  110 | test('license:claimByKey rechaza clave con formato incorrecto', async () => {
  111 |   const result = await ipc('license:claimByKey', 'CLAVE-INVALIDA-123');
  112 |   expect(result.active).toBe(false);
  113 |   expect(typeof result.reason).toBe('string');
  114 | });
  115 | 
  116 | test('license:claimByKey rechaza clave GW-LIC-V1 sin GW_LICENSE_SECRET configurado', async () => {
  117 |   const fakeKey = 'GW-LIC-V1:' + Buffer.from('{"tier":"pro"}').toString('base64') + '.aabbccdd';
  118 |   const result = await ipc('license:claimByKey', fakeKey);
  119 |   expect(result.active).toBe(false);
  120 |   expect(result.reason).toMatch(/GW_LICENSE_SECRET/i);
  121 | });
  122 | 
  123 | test('license:install con clave válida GW-XXXX activa la licencia en el vault', async () => {
  124 |   const hwid = await ipc('license:hwid');
  125 |   const tail = hwid.replace(/-/g, '').toUpperCase().slice(-12);
  126 |   const validKey = `GW-${tail.slice(0,4)}-${tail.slice(4,8)}-${tail.slice(8,12)}`;
  127 | 
  128 |   const result = await ipc('license:install', validKey);
  129 |   expect(result.active).toBe(true);
  130 |   expect(result.tier).toBe('standard');
  131 | 
  132 |   const status = await ipc('license:status');
  133 |   expect(status.active).toBe(true);
  134 | });
  135 | 
  136 | // ── TOTP ──────────────────────────────────────────────────────────────────────
  137 | test('totp:code devuelve código de 6 dígitos y secondsLeft válido', async () => {
  138 |   const secret = 'JBSWY3DPEHPK3PXP';
  139 |   const result = await ipc('totp:code', secret);
  140 |   expect(result.code).toMatch(/^\d{6}$/);
  141 |   expect(result.secondsLeft).toBeGreaterThan(0);
  142 |   expect(result.secondsLeft).toBeLessThanOrEqual(30);
  143 | });
  144 | 
  145 | test('totp:code rechaza secreto base32 inválido', async () => {
  146 |   await expect(ipc('totp:code', '!!!INVALIDO!!!')).rejects.toThrow();
  147 | });
  148 | 
  149 | // ── Proxies ───────────────────────────────────────────────────────────────────
  150 | test('proxies:check con proxy localhost inalcanzable devuelve ok:false', async () => {
  151 |   const result = await ipc('proxies:check', { host: '127.0.0.1', port: 19999, scheme: 'http' });
> 152 |   expect(result.ok).toBe(false);
      |                     ^ Error: expect(received).toBe(expected) // Object.is equality
  153 |   expect(typeof result.ms).toBe('number');
  154 | });
  155 | 
  156 | test('proxies:checkAll con array vacío devuelve array vacío', async () => {
  157 |   const result = await ipc('proxies:checkAll', []);
  158 |   expect(Array.isArray(result)).toBe(true);
  159 |   expect(result.length).toBe(0);
  160 | });
  161 | 
  162 | test('proxies:checkAll trunca a 500 proxies máximo', async () => {
  163 |   const many = Array.from({ length: 600 }, (_, i) => ({ host: '127.0.0.1', port: 20000 + i, scheme: 'http' }));
  164 |   const result = await ipc('proxies:checkAll', many);
  165 |   expect(result.length).toBeLessThanOrEqual(500);
  166 | });
  167 | 
  168 | // ── Repeater ──────────────────────────────────────────────────────────────────
  169 | test('repeater:send a URL real devuelve status HTTP y ms', async () => {
  170 |   const result = await ipc('repeater:send', { method: 'GET', url: 'https://httpbin.org/status/200' });
  171 |   expect(result.status).toBe(200);
  172 |   expect(typeof result.ms).toBe('number');
  173 |   expect(result.ms).toBeGreaterThan(0);
  174 | }, { timeout: 15_000 });
  175 | 
  176 | test('repeater:send con URL bloqueada (tracker) devuelve status 0 o error', async () => {
  177 |   const result = await ipc('repeater:send', { method: 'GET', url: 'https://www.google-analytics.com/' });
  178 |   expect(result.status).not.toBe(200);
  179 | });
  180 | 
  181 | test('repeater:send con URL inválida devuelve status 0 sin lanzar excepción', async () => {
  182 |   const result = await ipc('repeater:send', { method: 'GET', url: 'no-es-una-url' });
  183 |   expect(result.status).toBe(0);
  184 |   expect(typeof result.body).toBe('string');
  185 | });
  186 | 
  187 | // ── Cookies ───────────────────────────────────────────────────────────────────
  188 | test('cookies:get en perfil nuevo devuelve array vacío', async () => {
  189 |   const cookies = await ipc('cookies:get', 9999);
  190 |   expect(Array.isArray(cookies)).toBe(true);
  191 | });
  192 | 
  193 | test('cookies:set guarda cookie y cookies:get la recupera', async () => {
  194 |   const pid = 8001;
  195 |   const cookie = {
  196 |     url: 'https://test.gestor.local',
  197 |     domain: 'test.gestor.local',
  198 |     name: 'gw_test_cookie',
  199 |     value: 'hello_ipc',
  200 |     path: '/'
  201 |   };
  202 |   await ipc('cookies:set', pid, [cookie]);
  203 |   const result = await ipc('cookies:get', pid);
  204 |   const found = result.find(c => c.name === 'gw_test_cookie');
  205 |   expect(found).toBeDefined();
  206 |   expect(found.value).toBe('hello_ipc');
  207 | });
  208 | 
  209 | test('cookies:clear vacía las cookies del perfil', async () => {
  210 |   const pid = 8001;
  211 |   const result = await ipc('cookies:clear', pid);
  212 |   expect(Array.isArray(result)).toBe(true);
  213 |   expect(result.length).toBe(0);
  214 | });
  215 | 
  216 | // ── browse:freshenMemory ──────────────────────────────────────────────────────
  217 | test('browse:freshenMemory devuelve ok:true para perfil válido', async () => {
  218 |   const result = await ipc('browse:freshenMemory', 9999);
  219 |   expect(result.ok).toBe(true);
  220 | });
  221 | 
  222 | // ── profiles:isWindowOpen ─────────────────────────────────────────────────────
  223 | test('profiles:isWindowOpen devuelve open:false para perfil sin ventana', async () => {
  224 |   const result = await ipc('profiles:isWindowOpen', 9999);
  225 |   expect(result.open).toBe(false);
  226 | });
  227 | 
  228 | // ── Validación de seguridad ───────────────────────────────────────────────────
  229 | test('app:openExternal rechaza URL con protocolo no permitido', async () => {
  230 |   const result = await ipc('app:openExternal', 'javascript:alert(1)');
  231 |   expect(result.ok).toBe(false);
  232 |   expect(result.error).toBe('invalid_url');
  233 | });
  234 | 
  235 | test('app:openExternal acepta URL https válida', async () => {
  236 |   const result = await ipc('app:openExternal', 'https://example.com');
  237 |   expect(result.ok).toBe(true);
  238 | });
  239 | 
```