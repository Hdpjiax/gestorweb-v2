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
const net = require('net');
const crypto = require('crypto');
const { createLicenseText } = require('../../src/main/license');

// ─── Setup / Teardown ────────────────────────────────────────────────────────

let electronApp;
let tmpDataDir;
let testPrivateKey;
let testPublicKey;

test.beforeAll(async () => {
  // Directorio temporal fresco por cada run — vault completamente limpio
  tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-ipc-test-'));
  const pair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  testPrivateKey = pair.privateKey;
  testPublicKey = pair.publicKey;

  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../main.js')],
    env: {
      ...process.env,
      // main.js llama app.setPath('userData', ...) con este valor
      // ANTES de app.whenReady(), así todo el vault queda aislado
      GW_TEST_USERDATA: tmpDataDir,
      GW_LICENSE_SECRET: '',
      GW_LICENSE_PUBLIC_KEY: testPublicKey,
      GW_LICENSE_SERVER_URL: ''
    }
  });
  const mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
  try { fs.rmSync(tmpDataDir, { recursive: true, force: true }); } catch {}
});

// Helper: invocar un handler IPC desde el proceso main sin pasar por el renderer
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

async function startMockHttpProxy(marker, expectedAuthorization) {
  const requests = [];
  const server = net.createServer((socket) => {
    let raw = '';
    socket.on('data', (chunk) => {
      raw += chunk.toString('latin1');
      if (!raw.includes('\r\n\r\n')) return;
      requests.push(raw);
      const authorization = (raw.match(/Proxy-Authorization:\s*([^\r\n]+)/i) || [])[1] || '';
      if (authorization !== expectedAuthorization) {
        socket.end('HTTP/1.1 407 Proxy Authentication Required\r\nConnection: close\r\n\r\n');
        return;
      }
      const body = JSON.stringify({ marker });
      socket.end(`HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    port: server.address().port,
    requests,
    close: () => new Promise((resolve) => server.close(resolve))
  };
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
  // Vault es el tmpDataDir fresco — nunca tuvo licencia
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
  expect(result.reason).toMatch(/firma|formato/i);
});

test('license:install con clave válida GW-XXXX activa la licencia en el vault', async () => {
  const hwid = await ipc('license:hwid');
  const validKey = createLicenseText({
    id: 'GW-IPC-VALID', hwid, platform: 'windows', app: 'gestor-web',
    plan: '1d', tier: 'standard', issued_at: Date.now(),
    expires_at: Date.now() + 86400000, features: ['standard'],
    online_required: false, sig_alg: 'RSA-SHA256'
  }, testPrivateKey);

  const result = await ipc('license:install', validKey);
  expect(result.active).toBe(true);
  expect(result.tier).toBe('standard');

  // Verificar que se persistió en vault
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
// checkProxy devuelve { healthy, latency_ms, last_error, ...proxy } — NO { ok, ms }
test('proxies:check con proxy localhost inalcanzable devuelve healthy:false', async () => {
  const result = await ipc('proxies:check', { host: '127.0.0.1', port: 19999, scheme: 'http' });
  expect(result.healthy).toBe(false);
  expect(result.latency_ms).toBeNull();
  expect(typeof result.last_error).toBe('string');
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

test('dos perfiles usan proxies autenticados distintos sin mezclar sesiones', async () => {
  const authA = `Basic ${Buffer.from('perfil-a:clave-a').toString('base64')}`;
  const authB = `Basic ${Buffer.from('perfil-b:clave-b').toString('base64')}`;
  const proxyA = await startMockHttpProxy('salida-a', authA);
  const proxyB = await startMockHttpProxy('salida-b', authB);
  try {
    const preparedA = await ipc('browse:prepareSession',
      { id: 'integration-a', name: 'A', url: '', fingerprint: {} },
      { scheme: 'http', host: '127.0.0.1', port: proxyA.port, username: 'perfil-a', password: 'clave-a' }
    );
    const preparedB = await ipc('browse:prepareSession',
      { id: 'integration-b', name: 'B', url: '', fingerprint: {} },
      { scheme: 'http', host: '127.0.0.1', port: proxyB.port, username: 'perfil-b', password: 'clave-b' }
    );
    expect(preparedA.localPort).not.toBe(preparedB.localPort);

    const bodies = await electronApp.evaluate(async ({ session }) => {
      const fetchFrom = async (id) => {
        const response = await session.fromPartition(`persist:gw-${id}`).fetch('http://proxy-route.invalid/prueba');
        return response.text();
      };
      return Promise.all([fetchFrom('integration-a'), fetchFrom('integration-b')]);
    });

    expect(JSON.parse(bodies[0]).marker).toBe('salida-a');
    expect(JSON.parse(bodies[1]).marker).toBe('salida-b');
    expect(proxyA.requests.some((request) => request.includes(authA))).toBe(true);
    expect(proxyB.requests.some((request) => request.includes(authB))).toBe(true);
  } finally {
    await Promise.all([proxyA.close(), proxyB.close()]);
  }
});

// ── Repeater ──────────────────────────────────────────────────────────────────
test('repeater:send a URL real devuelve status 200 y ms > 0', async () => {
  const result = await ipc('repeater:send', { method: 'GET', url: 'https://example.com' });
  expect(result.status).toBe(200);
  expect(typeof result.ms).toBe('number');
  expect(result.ms).toBeGreaterThan(0);
}, { timeout: 15_000 });

test('repeater:send devuelve objeto con status, headers, body y ms', async () => {
  const result = await ipc('repeater:send', { method: 'GET', url: 'https://example.com' });
  expect(typeof result.status).toBe('number');
  expect(typeof result.headers).toBe('object');
  expect(typeof result.body).toBe('string');
  expect(typeof result.ms).toBe('number');
}, { timeout: 15_000 });

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

test('perfil sin URL abre el navegador controlado en una pestaña realmente vacía', async () => {
  const profile = {
    id: 'shell-blank',
    name: 'Perfil sin URL',
    url: '',
    gw_engine: true,
    fingerprint: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
      locale: 'es-MX',
      resolution: { width: 1280, height: 800 }
    }
  };
  const windowPromise = electronApp.waitForEvent('window');
  const opened = await ipc('profiles:openWindow', profile, null, '');
  const profileWindow = await windowPromise;

  expect(opened.ok).toBe(true);
  expect(opened.mode).toBe('camoufox');
  await profileWindow.waitForLoadState('domcontentloaded');
  expect(profileWindow.url()).toContain('profile-browser.html');
  await expect(profileWindow.locator('#tabTitle')).toHaveText('New Tab');
  await expect(profileWindow.locator('#addressInput')).toHaveValue('');
  await expect(profileWindow.locator('#blankSurface')).toBeVisible();
  await expect(profileWindow.locator('webview')).toHaveCount(0);
  await expect(profileWindow.locator('#cursorFollower')).toHaveCount(0);
  const preview = await ipc('profiles:capturePreview', profile.id);
  expect(preview.ok).toBe(true);
  expect(preview.dataUrl).toMatch(/^data:image\/png;base64,/);

  expect((await ipc('profiles:isWindowOpen', profile.id)).open).toBe(true);
  await ipc('profiles:closeWindow', profile.id);
});

test('perfil con URL abre la URL y conserva la identidad Chromium seleccionada', async () => {
  const server = require('http').createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><title>Perfil listo</title><h1 id="ready">listo</h1>');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/inicio`;
  const profile = {
    id: 'shell-url',
    name: 'Perfil Chromium',
    url,
    gw_engine: false,
    fingerprint: {
      userAgent: 'Gestor-Chromium-Template/126',
      vendor: 'Google Inc.',
      browser: 'Chrome 126',
      locale: 'es-MX',
      resolution: { width: 1280, height: 800 }
    }
  };
  try {
    const mainWindow = electronApp.windows()[0];
    const capturedEvent = mainWindow.evaluate((expectedUrl) => new Promise((resolve) => {
      const off = window.api.on('network:event', (entry) => {
        if (entry.url === expectedUrl && entry.phase === 'completed') {
          off();
          resolve({ profileId: entry.profileId, method: entry.method, status: entry.status });
        }
      });
    }), url);
    const windowPromise = electronApp.waitForEvent('window');
    const opened = await ipc('profiles:openWindow', profile, null, '');
    const profileWindow = await windowPromise;

    expect(opened.ok).toBe(true);
    expect(opened.mode).toBe('chromium');
    await profileWindow.waitForLoadState('domcontentloaded');
    await expect(profileWindow.locator('#engineLabel')).toHaveText('Chromium identity');
    await expect(profileWindow.locator('webview')).toHaveCount(1);
    await expect.poll(() => profileWindow.locator('webview').evaluate((element) => {
      const height = element.getBoundingClientRect().height;
      const stageHeight = element.parentElement.getBoundingClientRect().height;
      return height === stageHeight && stageHeight > 600;
    })).toBe(true);

    await expect.poll(() => electronApp.evaluate(async ({ webContents }, expectedUrl) => {
      const guest = webContents.getAllWebContents().find((item) => item.getURL() === expectedUrl);
      if (!guest) return null;
      return guest.executeJavaScript('({ userAgent: navigator.userAgent, vendor: navigator.vendor, title: document.title })');
    }, url)).toEqual({ userAgent: profile.fingerprint.userAgent, vendor: 'Google Inc.', title: 'Perfil listo' });

    await expect.poll(() => electronApp.evaluate(async ({ webContents }, expectedUrl) => {
      const guest = webContents.getAllWebContents().find((item) => item.getURL() === expectedUrl);
      if (!guest) return null;
      return guest.executeJavaScript('getComputedStyle(document.body).cursor');
    }, url)).toContain('data:image/svg+xml');

    expect(await capturedEvent).toEqual({ profileId: profile.id, method: 'GET', status: 200 });
  } finally {
    await ipc('profiles:closeWindow', profile.id);
    await new Promise((resolve) => server.close(resolve));
  }
});

// ── Validación de seguridad ───────────────────────────────────────────────────
test('plantilla Android aplica viewport, touch, UA y client hints moviles reales', async () => {
  const server = require('http').createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Mobile ready</title>');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/mobile`;
  const profile = {
    id: 'shell-android-mobile', name: 'Pixel 8', url, gw_engine: false,
    fingerprint: {
      templateId: 'android_chrome', os: 'Android', browser: 'Chrome Mobile',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv8l', vendor: 'Google Inc.', mobile: true, touchPoints: 5,
      deviceScaleFactor: 2.625, model: 'Pixel 8', architecture: 'arm',
      locale: 'es-MX', timezone: 'America/Mexico_City', resolution: { width: 412, height: 915 }
    }
  };
  try {
    const windowPromise = electronApp.waitForEvent('window');
    const opened = await ipc('profiles:openWindow', profile, null, '');
    const profileWindow = await windowPromise;
    expect(opened.ok).toBe(true);
    await profileWindow.waitForLoadState('domcontentloaded');
    await expect(profileWindow.locator('#engineLabel')).toContainText('Android');
    await expect.poll(() => electronApp.evaluate(async ({ webContents }, expectedUrl) => {
      const guest = webContents.getAllWebContents().find((item) => item.getURL() === expectedUrl);
      if (!guest) return null;
      return guest.executeJavaScript(`(async () => ({
        mobileUa: /Android 14; Pixel 8/.test(navigator.userAgent), platform: navigator.platform,
        touch: navigator.maxTouchPoints, screen: [screen.width, screen.height],
        viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
        uaMobile: navigator.userAgentData?.mobile,
        model: navigator.userAgentData ? (await navigator.userAgentData.getHighEntropyValues(['model'])).model : ''
      }))()`);
    }, url)).toEqual({ mobileUa: true, platform: 'Linux armv8l', touch: 5, screen: [412, 915], viewport: [412, 915], dpr: 2.625, uaMobile: true, model: 'Pixel 8' });
  } finally {
    await ipc('profiles:closeWindow', profile.id);
    await new Promise((resolve) => server.close(resolve));
  }
});

test('plantilla iPhone aplica viewport, touch y UA de identidad movil', async () => {
  const server = require('http').createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><meta name="viewport" content="width=device-width"><title>iPhone ready</title>');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}/iphone`;
  const profile = {
    id: 'shell-iphone-mobile', name: 'iPhone', url, gw_engine: false,
    fingerprint: {
      templateId: 'iphone_safari', os: 'iOS', browser: 'Mobile Safari',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      platform: 'iPhone', vendor: 'Apple Computer, Inc.', mobile: true, touchPoints: 5,
      deviceScaleFactor: 3, model: 'iPhone', architecture: 'arm',
      locale: 'es-MX', timezone: 'America/Mexico_City', resolution: { width: 390, height: 844 }
    }
  };
  try {
    const hwid = await ipc('license:hwid');
    const license = createLicenseText({
      id: 'GW-IPC-IPHONE', hwid, platform: 'windows', app: 'gestor-web',
      plan: '1d', tier: 'standard', issued_at: Date.now(), expires_at: Date.now() + 86400000,
      features: ['standard'], online_required: false, sig_alg: 'RSA-SHA256'
    }, testPrivateKey);
    await ipc('license:install', license);
    await ipc('profiles:openWindow', profile, null, '');
    await expect.poll(() => electronApp.windows().some((page) => page.url().includes('profile-browser.html') && page.url().includes(profile.id))).toBe(true);
    const profileWindow = electronApp.windows().find((page) => page.url().includes('profile-browser.html') && page.url().includes(profile.id));
    await profileWindow.waitForLoadState('domcontentloaded');
    await expect(profileWindow.locator('#engineLabel')).toContainText('iOS');
    await expect(profileWindow.locator('webview')).toHaveCount(1);
    await expect.poll(() => electronApp.evaluate(async ({ webContents }, expectedUrl) => {
      const guest = webContents.getAllWebContents().find((item) => item.getType() === 'webview');
      if (!guest) return null;
      const identity = await guest.executeJavaScript(`({
        iphoneUa: /iPhone OS 17_4/.test(navigator.userAgent), platform: navigator.platform,
        vendor: navigator.vendor, touch: navigator.maxTouchPoints,
        screen: [screen.width, screen.height], viewport: [innerWidth, innerHeight], dpr: devicePixelRatio
      })`);
      return { currentUrl: guest.getURL(), expectedUrl, identity };
    }, url)).toEqual({ currentUrl: url, expectedUrl: url, identity: { iphoneUa: true, platform: 'iPhone', vendor: 'Apple Computer, Inc.', touch: 5, screen: [390, 844], viewport: [390, 844], dpr: 3 } });
  } finally {
    await ipc('profiles:closeWindow', profile.id);
    await new Promise((resolve) => server.close(resolve));
  }
});

test('app:openExternal rechaza URL con protocolo no permitido', async () => {
  const result = await ipc('app:openExternal', 'javascript:alert(1)');
  expect(result.ok).toBe(false);
  expect(result.error).toBe('invalid_url');
});

test('app:openExternal acepta URL https válida', async () => {
  const result = await ipc('app:openExternal', 'https://example.com');
  expect(result.ok).toBe(true);
});
