import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { canonicalPagePath, documentRoutes } from '../public/routes.js';
import { createApi } from './api.js';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Readable } from 'node:stream';
import { cleanupExpired, initializeStore } from './store.js';
import { reportIncident, securityHeaders } from './security.js';
import { pwaAssets, pwaHeaders } from './pwa-assets.js';

const assets = new Map([
  ...pwaAssets,
  ...Object.entries(documentRoutes).map(([path,file])=>[path,[file,'text/html; charset=utf-8']]),
  ['/legal.css', ['legal.css','text/css; charset=utf-8']],
  ['/services.css', ['services.css','text/css; charset=utf-8']],
  ['/la-chulapa.jpg', ['la-chulapa.jpg','image/jpeg']],
  ['/cookie-ui.js', ['cookie-ui.js','text/javascript; charset=utf-8']],
  ['/legal.js', ['legal.js','text/javascript; charset=utf-8']],
  ['/fonts/dm-sans-latin.woff2', ['fonts/dm-sans-latin.woff2','font/woff2']],
  ['/fonts/dm-sans-latin-ext.woff2', ['fonts/dm-sans-latin-ext.woff2','font/woff2']],
  ['/fonts/OFL.txt', ['fonts/OFL.txt','text/plain; charset=utf-8']],
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/cuenta', ['account.html', 'text/html; charset=utf-8']],
  ['/opiniones', ['reviews.html', 'text/html; charset=utf-8']],
  ['/escacsify-logo.png', ['escacsify-logo.png', 'image/png']],
  ['/admin-dashboard.css', ['admin-dashboard.css', 'text/css; charset=utf-8']],
  ['/account.css', ['account.css', 'text/css; charset=utf-8']],
  ['/check.svg', ['check.svg', 'image/svg+xml']],
  ['/icons.js', ['icons.js', 'text/javascript; charset=utf-8']],
  ['/workspace.css', ['workspace.css', 'text/css; charset=utf-8']],
  ['/workspace-ui.js', ['workspace-ui.js', 'text/javascript; charset=utf-8']],
  ['/appointments-ui.js', ['appointments-ui.js', 'text/javascript; charset=utf-8']],
  ['/project-data.js', ['project-data.js', 'text/javascript; charset=utf-8']],
  ['/team-workspace.js', ['team-workspace.js', 'text/javascript; charset=utf-8']],
  ['/team-data.js', ['team-data.js', 'text/javascript; charset=utf-8']],
  ['/admin-workspace.js', ['admin-workspace.js', 'text/javascript; charset=utf-8']],
  ['/interaction-ui.js', ['interaction-ui.js','text/javascript; charset=utf-8']],
  ['/account-home.js', ['account-home.js','text/javascript; charset=utf-8']],
  ['/account.js', ['account.js', 'text/javascript; charset=utf-8']],
  ['/reviews.js', ['reviews.js', 'text/javascript; charset=utf-8']],
  ['/portal-nav.js', ['portal-nav.js', 'text/javascript; charset=utf-8']],
  ['/proyectos', ['projects.html', 'text/html; charset=utf-8']],
  ['/chessdare-logo.png', ['chessdare-logo.png', 'image/png']],
  ['/rexher-cup-logo.png', ['rexher-cup-logo.png', 'image/png']],
  ['/projects.css', ['projects.css', 'text/css; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/routes.js', ['routes.js', 'text/javascript; charset=utf-8']],
  ['/services-data.js', ['services-data.js', 'text/javascript; charset=utf-8']],
  ['/service-cards.js', ['service-cards.js', 'text/javascript; charset=utf-8']],
  ['/selects.js', ['selects.js', 'text/javascript; charset=utf-8']],
  ['/chess-scene.js', ['chess-scene.js', 'text/javascript; charset=utf-8']],
  ['/chess-scene.css', ['chess-scene.css', 'text/css; charset=utf-8']],
  ['/admin', ['admin.html', 'text/html; charset=utf-8']],
  ['/admin.js', ['admin.js', 'text/javascript; charset=utf-8']],
  ['/admin.css', ['admin.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/chedex-icon.svg', ['favicon.svg', 'image/svg+xml']],
]);
const port = Number(process.env.PORT || 3000);
const appUrl = new URL((process.env.NODE_ENV === 'production' && process.env.APP_URL) || `http://127.0.0.1:${port}`);
if (!['http:', 'https:'].includes(appUrl.protocol) || appUrl.username || appUrl.password || appUrl.pathname !== '/' || appUrl.search || appUrl.hash) throw new Error('APP_URL debe ser un origen HTTP o HTTPS.');
if (process.env.NODE_ENV === 'production' && appUrl.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(appUrl.hostname)) throw new Error('El acceso público requiere APP_URL con HTTPS.');
const getDatabase = () => {
  if (!localDb) {
    mkdirSync('data', { recursive: true, mode: 0o700 });
    localDb = new DatabaseSync('data/chedex-v2.db');
    localDb.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  }
  return async (sql, args = []) => localDb.prepare(sql).all(...args);
};
// Development never connects to the production database, even if .env has its credentials.
let localDb;
let readyStore;
const readyDatabase = () => readyStore ||= initializeStore(getDatabase()).catch(error => { readyStore = undefined; throw error; });
const api = createApi({
  env: { APP_URL: appUrl.origin, LICHESS_CLIENT_ID: process.env.LICHESS_CLIENT_ID || 'chedex.app' },
  getDatabase,
});

setInterval(async () => {
  try { await cleanupExpired(await readyDatabase()); }
  catch (error) { reportIncident(error, 'cleanup'); }
}, 3600000).unref();

createServer(async (request, response) => {
  try {
    let url;
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new Error('INVALID_TARGET');
      url = new URL(request.url, appUrl.origin);
      if (url.origin !== appUrl.origin) throw new Error('INVALID_TARGET');
    } catch {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders() });
      response.end('Solicitud no válida'); return;
    }
    const pathname = url.pathname;
    for (const [name, value] of Object.entries(securityHeaders({ secure: appUrl.protocol === 'https:', privatePage: ['/admin', '/cuenta'].includes(pathname) }))) response.setHeader(name, value);
    if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
      try {
        const headers = new Headers(request.headers);
        // Direct Node clients cannot provide trusted Cloudflare identity headers.
        headers.set('cf-connecting-ip', request.socket.remoteAddress || 'local');
        const webRequest = new Request(url, {
          method: request.method, headers,
          ...(!['GET', 'HEAD'].includes(request.method) ? { body: Readable.toWeb(request), duplex: 'half' } : {}),
        });
        const result = await api(webRequest);
        result.headers.forEach((value, name) => { if (name !== 'set-cookie') response.setHeader(name, value); });
        const cookies = result.headers.getSetCookie();
        if (cookies.length) response.setHeader('Set-Cookie', cookies);
        response.writeHead(result.status);
        response.end(Buffer.from(await result.arrayBuffer()));
      } catch (error) {
        const incident = reportIncident(error, 'http-api');
        response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'No disponible temporalmente.', incident }));
      }
      return;
    }
    if (pathname === '/admin/' || pathname === '/cuenta/') {
      response.writeHead(308, { Location: pathname.slice(0,-1) }); response.end(); return;
    }
    const pagePath = canonicalPagePath(pathname);
    if (pagePath !== null && pathname !== pagePath) {
      response.writeHead(308, { Location: pagePath });
      response.end();
      return;
    }
    if (pathname === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (pathname === '/readyz') {
      await (await readyDatabase())('SELECT revision FROM chedex_v2_catalog WHERE id=1');
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ready' })); return;
    }
    const assetPath = Object.hasOwn(documentRoutes,pagePath) ? pagePath : pagePath === null ? pathname : '/';
    if (!assets.has(assetPath)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('No encontrado');
      return;
    }
    try {
      const [file, contentType] = assets.get(assetPath);
      const content = await readFile(new URL(`../public/${file}`, import.meta.url));
    for (const [name, value] of Object.entries(pwaHeaders(pathname))) response.setHeader(name, value);
      response.writeHead(200, { 'Content-Type': contentType });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      reportIncident(error, 'assets');
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('No disponible temporalmente');
    }
  } catch (error) {
    const incident = reportIncident(error, 'http');
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: 'No disponible temporalmente.', incident }));
  }
}).listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`Chedex disponible en http://127.0.0.1:${port}`);
});
