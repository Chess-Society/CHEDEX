import { canonicalPagePath, documentRoutes } from '../public/routes.js';
import { createApi } from '../server/api.js';
import { remoteDatabase, initializeStore, cleanupExpired } from '../server/store.js';
import { reportIncident, securityHeaders } from '../server/security.js';
import { pwaAssets, pwaHeaders } from '../server/pwa-assets.js';

const apis = new WeakMap();

async function handleFetch(request, env) {
  const { pathname } = new URL(request.url);
  if (pwaAssets.has(pathname)) {
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    response.headers.set('Content-Type', pwaAssets.get(pathname)[1]);
    for (const [name, value] of Object.entries(pwaHeaders(pathname))) response.headers.set(name, value);
    return response;
  }
  if (pathname === '/chedex-icon.svg') return env.ASSETS.fetch(new Request(new URL('/favicon.svg', request.url), request));
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    if (!apis.has(env)) apis.set(env, createApi({
      env: { ...env, APP_URL: env.APP_URL || 'https://chedex.app' },
      getDatabase: env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN ? () => remoteDatabase(env) : undefined,
    }));
    return apis.get(env)(request);
  }
  if (['/admin', '/admin/', '/cuenta', '/cuenta/'].includes(pathname)) {
    if (pathname.endsWith('/')) return Response.redirect(new URL(pathname.slice(0,-1), request.url), 308);
    const asset = await env.ASSETS.fetch(new Request(new URL(pathname === '/cuenta' ? '/account.html' : '/admin.html', request.url), request));
    const response = new Response(asset.body, asset);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  const pagePath = canonicalPagePath(pathname);
  if (pagePath !== null) {
    if (pathname !== pagePath) {
      return Response.redirect(new URL(pagePath, request.url), 308);
    }
    return env.ASSETS.fetch(new Request(new URL(`/${documentRoutes[pagePath] || 'index.html'}`, request.url), request));
  }
  if (pathname === '/healthz') {
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (pathname === '/readyz') {
    await remoteDatabase(env)('SELECT revision FROM chedex_v2_catalog WHERE id=1');
    console.log(JSON.stringify({ event: 'chedex_readiness', status: 'ok' }));
    return Response.json({ status: 'ready' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (!['/pulse.css', '/site-animations.js', '/vendor/animejs.js', '/vendor/animejs.LICENSE.txt', '/button-effects.js', '/services.css', '/la-chulapa.jpg', '/legal.css', '/cookie-ui.js', '/legal.js', '/fonts/dm-sans-latin.woff2', '/fonts/dm-sans-latin-ext.woff2', '/fonts/OFL.txt', '/admin-dashboard.css', '/dash.css', '/dash-data.js', '/dash-today.js', '/dash-projects.js', '/account.css', '/check.svg', '/escacsify-logo.png', '/icons.js', '/workspace.css', '/workspace-ui.js', '/appointments-ui.js', '/project-data.js', '/team-workspace.js', '/team-data.js', '/admin-workspace.js', '/interaction-ui.js', '/account-home.js', '/account.js', '/reviews.js', '/portal-nav.js', '/chessdare-logo.png', '/rexher-cup-logo.png', '/projects.css', '/style.css', '/app.js', '/routes.js', '/services-data.js', '/service-cards.js', '/selects.js', '/chess-scene.js', '/chess-scene.css', '/admin.js', '/admin.css', '/favicon.svg'].includes(pathname)) {
    return new Response('No encontrado', { status: 404 });
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    let result;
    try { result = await handleFetch(request, env); }
    catch (error) {
      const incident = reportIncident(error, 'worker');
      result = Response.json({ error: 'No disponible temporalmente.', incident }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const response = new Response(result.body, result);
    const url = new URL(request.url);
    for (const [name, value] of Object.entries(securityHeaders({ secure: url.protocol === 'https:', privatePage: ['/admin', '/cuenta'].includes(url.pathname) }))) response.headers.set(name, value);
    return response;
  },
  async scheduled(_controller, env) {
    try {
      await cleanupExpired(await initializeStore(remoteDatabase(env)));
      console.log(JSON.stringify({ event: 'chedex_maintenance', status: 'ok' }));
    } catch (error) {
      reportIncident(error, 'cleanup');
      throw new Error('MAINTENANCE_FAILED');
    }
  },
};
