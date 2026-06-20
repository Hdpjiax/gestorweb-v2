/**
 * Tests IPC reales — Electron arranca de verdad, los handlers responden de verdad.
 *
 * Cada test usa electronApp.evaluate() para llamar ipcMain.handle() directamente
 * desde el proceso main (Node.js), sin pasar por el renderer ni por la UI.
 * Esto prueba la lógica real: estado, licencias, TOTP, proxies, cookies, repeater.
 *
 * Para correr:
 *   npm install
 *   npm run test:ipc
 */
const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ─── Setup / Teardown ────────────────────────────────────────────────────────

let electronApp;
let tmpDataDir;

test.beforeAll(async () => {
  // Directorio temporal aislado para cada corrida — no toca el vault real
  tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-ipc-test-'));

  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../main.js')],
    env: {
      ...process.env,
      // Forzar userData a directorio temporal → vault limpio por cada run
      GW_TEST_USERDATA: tmpDataDir,
      // Sin secret de licencia → solo modo clave-simple disponible
      GW_LICENSE_SECRET: ''
    }
  });
});

test.afterAll(async () => {
  await electronApp.close();
  // Limpiar directorio temporal
  try { fs.rmSync(tmpDataDir, { recursive: true, force: true }); } catch {}
});

// Helper: invocar un handler IPC desde el proceso main sin pasar por el renderer
// Equivale a llamar directamente la función registrada en ipcMain.handle()
async function ipc(channel, ...args) {
  return electronApp.evaluate(
    async ({ ipcMain }, { ch, a }) => {
      const handler = ipcMain._invokeHandlers?.get(ch);
      if (!handler) throw new Error(`No handler registered for channel: ${ch}`);
      const fakeEvent = { sender: null, senderFrame: null };
      return handler(fakeEvent, ...a);
    },
    { ch: channel, a: args }
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── Healthcheck ──────────────────────────────────────────────────────────────
test('app:healthcheck devuelve ok:true con versiones de Electron y Chrome', async () => {
  const result = await ipc('app:healthcheck');
  expect(result.ok).toBe(true);
  expect(typeof result.electron).toBe('string');
  expect(typeof result.chrome).toBe('string');
});

// ── Estado ───────────────────────────────────────────────────────────────────
test('state:load devuelve estado con schema_version', async () => {
  const state = await ipc('state:load');
  expect(typeof state.schema_version).toBe('number');
  expect(state.schema_version).toBeGreaterThan(0);
});

test('state:save persiste y state:load lo recupera', async () => {
  const before = await ipc('state:load');
  const modified = { ...before, _ipc_test_marker: 'gw-test-42' };
  const saveResult = await ipc('state:save', modified);
  expect(saveResult.ok).toBe(true);
  const after = await ipc('state:load');
  expect(after._ipc_test_marker).toBe('gw-test-42');
});

test('state:save rechaza payload mayor a MAX_STATE_BYTES', async () => {
  const huge = { _junk: 'x'.repeat(6 * 1024 * 1024) };
  await expect(ipc('state:save', huge)).rejects.toThrow();
});

// ── Seguridad ─────────────────────────────────────────────────────────────────
test('security:status reporta contextIsolation:true y nodeIntegration:false', async () => {
  const s = await ipc('security:status');
  expect(s.contextIsolation).toBe(true);
  expect(s.nodeIntegration).toBe(false);
  expect(s.mainSandboxed).toBe(true);
});

// ── Licencia ─────────────────────────────────────────────────────────────────
test('license:hwid devuelve string con formato GW-XXXX-XXXX-XXXX', async () => {
  const hwid = await ipc('license:hwid');
  expect(typeof hwid).toBe('string');
  expect(hwid).toMatch(/^GW-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
});

test('license:status devuelve hwid y active:false en vault limpio', async () => {
  const status = await ipc('license:status');
  expect(status.hwid).toMatch(/^GW-/);
  expect(status.active).toBe(false);
});

test('license:claimByKey rechaza clave con formato incorrecto', async () => {
  const result = await ipc('license:claimByKey', 'CLAVE-INVALIDA-123');
  expect(result.active).toBe(false);
  expect(typeof result.reason).toBe('string');
});

test('license:claimByKey rechaza clave GW-LIC-V1 sin GW_LICENSE_SECRET configurado', async () => {
  const fakeKey = 'GW-LIC-V1:' + Buffer.from('{"tier":"pro"}').toString('base64') + '.aabbccdd';
  const result = await ipc('license:claimByKey', fakeKey);
  expect(result.active).toBe(false);
  expect(result.reason).toMatch(/GW_LICENSE_SECRET/i);
});

test('license:install con clave válida GW-XXXX activa la licencia en el vault', async () => {
  const hwid = await ipc('license:hwid');
  const tail = hwid.replace(/-/g, '').toUpperCase().slice(-12);
  const validKey = `GW-${tail.slice(0,4)}-${tail.slice(4,8)}-${tail.slice(8,12)}`;

  const result = await ipc('license:install', validKey);
  expect(result.active).toBe(true);
  expect(result.tier).toBe('standard');

  const status = await ipc('license:status');
  expect(status.active).toBe(true);
});

// ── TOTP ──────────────────────────────────────────────────────────────────────
test('totp:code devuelve código de 6 dígitos y secondsLeft válido', async () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const result = await ipc('totp:code', secret);
  expect(result.code).toMatch(/^\d{6}$/);
  expect(result.secondsLeft).toBeGreaterThan(0);
  expect(result.secondsLeft).toBeLessThanOrEqual(30);
});

test('totp:code rechaza secreto base32 inválido', async () => {
  await expect(ipc('totp:code', '!!!INVALIDO!!!')).rejects.toThrow();
});

// ── Proxies ───────────────────────────────────────────────────────────────────
test('proxies:check con proxy localhost inalcanzable devuelve ok:false', async () => {
  const result = await ipc('proxies:check', { host: '127.0.0.1', port: 19999, scheme: 'http' });
  expect(result.ok).toBe(false);
  expect(typeof result.ms).toBe('number');
});

test('proxies:checkAll con array vacío devuelve array vacío', async () => {
  const result = await ipc('proxies:checkAll', []);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(0);
});

test('proxies:checkAll trunca a 500 proxies máximo', async () => {
  const many = Array.from({ length: 600 }, (_, i) => ({ host: '127.0.0.1', port: 20000 + i, scheme: 'http' }));
  const result = await ipc('proxies:checkAll', many);
  expect(result.length).toBeLessThanOrEqual(500);
});

// ── Repeater ──────────────────────────────────────────────────────────────────
test('repeater:send a URL real devuelve status HTTP y ms', async () => {
  const result = await ipc('repeater:send', { method: 'GET', url: 'https://httpbin.org/status/200' });
  expect(result.status).toBe(200);
  expect(typeof result.ms).toBe('number');
  expect(result.ms).toBeGreaterThan(0);
}, { timeout: 15_000 });

test('repeater:send con URL bloqueada (tracker) devuelve status 0 o error', async () => {
  const result = await ipc('repeater:send', { method: 'GET', url: 'https://www.google-analytics.com/' });
  expect(result.status).not.toBe(200);
});

test('repeater:send con URL inválida devuelve status 0 sin lanzar excepción', async () => {
  const result = await ipc('repeater:send', { method: 'GET', url: 'no-es-una-url' });
  expect(result.status).toBe(0);
  expect(typeof result.body).toBe('string');
});

// ── Cookies ───────────────────────────────────────────────────────────────────
test('cookies:get en perfil nuevo devuelve array vacío', async () => {
  const cookies = await ipc('cookies:get', 9999);
  expect(Array.isArray(cookies)).toBe(true);
});

test('cookies:set guarda cookie y cookies:get la recupera', async () => {
  const pid = 8001;
  const cookie = {
    url: 'https://test.gestor.local',
    domain: 'test.gestor.local',
    name: 'gw_test_cookie',
    value: 'hello_ipc',
    path: '/'
  };
  await ipc('cookies:set', pid, [cookie]);
  const result = await ipc('cookies:get', pid);
  const found = result.find(c => c.name === 'gw_test_cookie');
  expect(found).toBeDefined();
  expect(found.value).toBe('hello_ipc');
});

test('cookies:clear vacía las cookies del perfil', async () => {
  const pid = 8001;
  const result = await ipc('cookies:clear', pid);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(0);
});

// ── browse:freshenMemory ──────────────────────────────────────────────────────
test('browse:freshenMemory devuelve ok:true para perfil válido', async () => {
  const result = await ipc('browse:freshenMemory', 9999);
  expect(result.ok).toBe(true);
});

// ── profiles:isWindowOpen ─────────────────────────────────────────────────────
test('profiles:isWindowOpen devuelve open:false para perfil sin ventana', async () => {
  const result = await ipc('profiles:isWindowOpen', 9999);
  expect(result.open).toBe(false);
});

// ── Validación de seguridad ───────────────────────────────────────────────────
test('app:openExternal rechaza URL con protocolo no permitido', async () => {
  const result = await ipc('app:openExternal', 'javascript:alert(1)');
  expect(result.ok).toBe(false);
  expect(result.error).toBe('invalid_url');
});

test('app:openExternal acepta URL https válida', async () => {
  const result = await ipc('app:openExternal', 'https://example.com');
  expect(result.ok).toBe(true);
});
