export const pwaAssets = new Map([
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json; charset=utf-8']],
  ['/sw.js', ['sw.js', 'text/javascript; charset=utf-8']],
  ['/pwa.js', ['pwa.js', 'text/javascript; charset=utf-8']],
  ['/pwa.css', ['pwa.css', 'text/css; charset=utf-8']],
  ['/offline.html', ['offline.html', 'text/html; charset=utf-8']],
  ['/app-icon-192.png', ['app-icon-192.png', 'image/png']],
  ['/app-icon-512.png', ['app-icon-512.png', 'image/png']],
]);

export function pwaHeaders(pathname) {
  return {
    ...(['/sw.js', '/manifest.webmanifest', '/offline.html'].includes(pathname) ? { 'Cache-Control': 'no-cache' } : {}),
    ...(pathname === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}),
  };
}
