import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';
import { sectionRoutes, documentRoutes } from '../public/routes.js';

test('section URLs serve the page without redirecting to the homepage', async () => {
  for (const path of Object.keys(sectionRoutes)) {
    let assetRequest;
    const response = await worker.fetch(new Request(`https://chedex.app${path}`), {
      ASSETS: { fetch: request => {
        assetRequest = request;
        return new Response('Chedex', { headers: { 'Content-Type': 'text/html' } });
      } },
    });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('location'), null, path);
    assert.equal(new URL(assetRequest.url).pathname, '/index.html', path);
    assert.equal(await response.text(), 'Chedex', path);
  }
});

test('page aliases redirect to canonical paths', async () => {
  for (const [path, expected] of [['/index.html', '/'], ['/apoyo/', '/apoyo'], ['/equipo//', '/equipo']]) {
    const response = await worker.fetch(new Request(`https://chedex.app${path}`), {});
    assert.equal(response.status, 308, path);
    assert.equal(response.headers.get('location'), `https://chedex.app${expected}`);
  }
});

test('unknown and old application routes stay unavailable', async () => {
  for (const path of ['/desconocido', '/api/config', '/auth/login', '/app/tarjeta']) {
    const response = await worker.fetch(new Request(`https://chedex.app${path}`), {});
    assert.equal(response.status, 404, path);
  }
});

test('navigation module is served as a static asset', async () => {
  const response = await worker.fetch(new Request('https://chedex.app/routes.js'), {
    ASSETS: { fetch: request => {
      assert.equal(new URL(request.url).pathname, '/routes.js');
      return new Response('module');
    } },
  });
  assert.equal(await response.text(), 'module');
});

test('admin serves its own uncached shell and does not expose the HTML file directly', async () => {
  const response = await worker.fetch(new Request('https://chedex.app/admin'), {
    ASSETS: { fetch: request => {
      assert.equal(new URL(request.url).pathname, '/admin.html');
      return new Response('<h1>Administración</h1>', { headers: { 'Content-Type': 'text/html' } });
    } },
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Administración/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.equal((await worker.fetch(new Request('https://chedex.app/admin.html'), {})).status, 404);
});

test('page links use supported clean URLs and every route has a target', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /href="#/);
  for (const [, path] of html.matchAll(/href="(\/[^"\s]*)"/g)) {
    if (!/\.[a-z]+$/.test(path)) assert.ok(path === '/admin' || (path === '/cuenta' || Object.hasOwn(documentRoutes,path)) || Object.hasOwn(sectionRoutes, path), path);
  }
  for (const section of Object.values(sectionRoutes)) assert.ok(html.includes(`id="${section}"`), section);
});

 test('projects has its own page, separate from the landing', async () => {
  const response = await worker.fetch(new Request('https://chedex.app/proyectos'), {
    ASSETS: { fetch: request => {
      assert.equal(new URL(request.url).pathname, '/projects.html');
      return new Response('Projects');
    } },
  });
  assert.equal(response.status, 200);
  const landing = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const projects = readFileSync(new URL('../public/projects.html', import.meta.url), 'utf8');
  assert.match(landing, /href="\/proyectos"/);
  assert.doesNotMatch(landing, /Rexher Cup|ChessDare|Escacsify/);
  for (const url of ['https://rexhercup.com/', 'https://chessdare.com/', 'https://escacsify.com/']) assert.ok(projects.includes(url));
});

test('account shell is private, canonical and cannot be fetched through its asset filename', async () => {
  const response = await worker.fetch(new Request('https://chedex.app/cuenta'), {
    ASSETS: { fetch: request => {
      assert.equal(new URL(request.url).pathname, '/account.html');
      return new Response('Mi espacio');
    } },
  });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  const canonical = await worker.fetch(new Request('https://chedex.app/cuenta/'), {});
  assert.equal(canonical.headers.get('Location'), 'https://chedex.app/cuenta');
  assert.equal((await worker.fetch(new Request('https://chedex.app/account.html'), {})).status, 404);
});

test('public opinions have a standalone page and workspace modules are served', async () => {
  const response = await worker.fetch(new Request('https://chedex.app/opiniones'), { ASSETS: { fetch: request => {
    assert.equal(new URL(request.url).pathname, '/reviews.html'); return new Response('Opiniones');
  } } });
  assert.equal(response.status, 200);
  for (const path of ['/workspace.css','/workspace-ui.js','/admin-workspace.js','/account.js','/project-data.js','/portal-nav.js','/reviews.js']) {
    const asset = await worker.fetch(new Request(`https://chedex.app${path}`), { ASSETS: { fetch: () => new Response('asset') } });
    assert.equal(asset.status, 200, path);
  }
});
