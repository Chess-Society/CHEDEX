import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import worker from '../worker/index.js';
import { pwaAssets } from '../server/pwa-assets.js';

test('PWA: manifest estable, inicio privado, iconos PNG reales y acceso en todas las páginas', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url)));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/cuenta');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.prefer_related_applications, false);
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    assert.ok(icon);
    const png = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  for (const file of readdirSync(new URL('../public/', import.meta.url)).filter(name => name.endsWith('.html'))) {
    const html = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.equal((html.match(/rel="manifest"/g) || []).length, 1, file);
    if (file !== 'offline.html') assert.ok(html.includes('src="/pwa.js"'), file);
  }
  const generator = readFileSync(new URL('../scripts/render-legal.mjs', import.meta.url), 'utf8');
  assert.ok(generator.includes('href="/manifest.webmanifest"'));
});

test('PWA: Worker sirve recursos con tipos correctos y no retiene versiones antiguas del service worker', async () => {
  for (const [path, [, type]] of pwaAssets) {
    const response = await worker.fetch(new Request(`https://chedex.app${path}`), { ASSETS: { fetch: () => new Response('asset') } });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('Content-Type'), type);
    if (path === '/sw.js') {
      assert.equal(response.headers.get('Cache-Control'), 'no-cache');
      assert.equal(response.headers.get('Service-Worker-Allowed'), '/');
    }
  }
  const response = await worker.fetch(new Request('https://chedex.app/cuenta'), { ASSETS: { fetch: () => new Response('account') } });
  assert.match(response.headers.get('Content-Security-Policy'), /worker-src 'self'; manifest-src 'self'/);
  assert.doesNotMatch(response.headers.get('Content-Security-Policy'), /unsafe-inline/);
});

function serviceWorker() {
  const handlers = {}, added = [], deleted = [], opened = [];
  const cache = { add: async path => added.push(path), match: async () => new Response('OFFLINE_SAFE_PAGE') };
  let online = true;
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin: 'https://chedex.app' }, addEventListener: (name, handler) => { handlers[name] = handler; }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open: async name => { opened.push(name); return cache; }, keys: async () => ['chedex-offline-v0', 'other-app-cache', 'chedex-offline-v1'], delete: async name => deleted.push(name) },
    URL, Response, fetch: async () => { if (!online) throw new TypeError('offline'); return new Response('PRIVATE_NETWORK_RESPONSE'); },
  });
  return { handlers, added, deleted, opened, offline: () => { online = false; } };
}

test('PWA: solo se guarda el aviso offline y solo se retiran cachés propias obsoletas', async () => {
  const sw = serviceWorker();
  let work;
  sw.handlers.install({ waitUntil: promise => { work = promise; } }); await work;
  assert.deepEqual(sw.added, ['/offline.html']);
  sw.handlers.activate({ waitUntil: promise => { work = promise; } }); await work;
  assert.deepEqual(sw.deleted, ['chedex-offline-v0']);
});

test('PWA: API, OAuth, escrituras y otros orígenes no pasan por el fallback', () => {
  const sw = serviceWorker();
  for (const [url, method, mode] of [
    ['https://chedex.app/api/account', 'GET', 'navigate'],
    ['https://chedex.app/auth/callback?code=private', 'GET', 'navigate'],
    ['https://chedex.app/api/projects', 'POST', 'cors'],
    ['https://lichess.org/oauth', 'GET', 'navigate'],
    ['https://chedex.app/account.js', 'GET', 'same-origin'],
  ]) {
    sw.handlers.fetch({ request: { url, method, mode }, respondWith: () => assert.fail('Solicitud interceptada indebidamente') });
  }
  assert.deepEqual(sw.opened, []);
});

test('PWA: la cuenta se consulta en red; sin conexión solo se devuelve el aviso genérico', async () => {
  const sw = serviceWorker();
  let response;
  const event = { request: { url: 'https://chedex.app/cuenta', method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } };
  sw.handlers.fetch(event);
  assert.equal(await (await response).text(), 'PRIVATE_NETWORK_RESPONSE');
  assert.deepEqual(sw.opened, []);
  sw.offline(); sw.handlers.fetch(event);
  assert.equal(await (await response).text(), 'OFFLINE_SAFE_PAGE');
  assert.deepEqual(sw.added, []);
});
