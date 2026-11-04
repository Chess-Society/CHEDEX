const OFFLINE_CACHE = 'chedex-offline-v1';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.add(OFFLINE_PAGE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('chedex-offline-') && key !== OFFLINE_CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || /^\/(api|auth)(\/|$)/.test(url.pathname)) return;
  // Never cache documents, API responses, accounts, projects or OAuth traffic.
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await (await caches.open(OFFLINE_CACHE)).match(OFFLINE_PAGE);
    return cached || new Response('Chedex necesita conexión. Vuelve a intentarlo cuando tengas Internet.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }));
});
