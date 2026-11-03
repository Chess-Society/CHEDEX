import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { reportIncident } from '../server/security.js';
import { loadServices } from '../public/service-cards.js';
import { allPages } from '../public/workspace-ui.js';

test('AUD-08: el diagnóstico correlaciona incidentes sin registrar el mensaje sensible', t => {
  const logs = [];
  t.mock.method(console, 'error', value => logs.push(JSON.parse(value)));
  const incident = reportIncident(new Error('secret-token-and-personal-data'), 'api');
  assert.equal(logs[0].incident, incident);
  assert.equal(logs[0].code, 'UNEXPECTED');
  assert.doesNotMatch(JSON.stringify(logs), /secret-token|personal-data/);
});

test('AUD-09: páginas, errores y API tienen cabeceras; las vistas privadas mantienen CSP estricta', async t => {
  t.mock.method(console, 'error', () => {});
  const env = { ASSETS: { fetch: () => new Response('asset') } };
  for (const path of ['/', '/privacidad', '/proyectos', '/admin', '/cuenta', '/missing', '/api/services']) {
    const response = await worker.fetch(new Request(`https://chedex.app${path}`), env);
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
    const csp = response.headers.get('Content-Security-Policy');
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /script-src 'self';/);
    if (['/admin', '/cuenta'].includes(path)) assert.doesNotMatch(csp, /unsafe-inline/);
  }
});

test('AUD-10: catálogo caído no publica servicios predeterminados', async t => {
  t.mock.method(console, 'error', () => {});
  const unavailable = await worker.fetch(new Request('https://chedex.app/api/services'), {});
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).services, undefined);
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  let renders = 0;
  const container = { textContent: '', set innerHTML(_value) { renders++; } };
  await loadServices(container);
  assert.match(container.textContent, /No se han podido cargar/);
  assert.equal(renders, 0);
});

test('AUD-07: la tarea programada limpia caducados mediante el adaptador remoto sin registrar credenciales', async t => {
  const statements = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    statements.push(JSON.parse(options.body).requests[0].stmt);
    return Response.json({ results: [{ type: 'ok', response: { result: { cols: [], rows: [] } } }] });
  });
  await worker.scheduled({}, { TURSO_DATABASE_URL: 'libsql://example.invalid', TURSO_AUTH_TOKEN: 'not-a-real-token' });
  const cleanup = statements.filter(stmt => stmt.sql.startsWith('DELETE FROM'));
  assert.equal(cleanup.length, 3);
  for (const stmt of cleanup) {
    assert.match(stmt.sql, /^DELETE FROM chedex_v2_(oauth|sessions|limits) WHERE expires<=\?$/);
    assert.equal(stmt.args[0].type, 'integer');
  }
});

test('AUD-04: el cliente recorre páginas y deduplica registros; rechaza cursores que no avanzan', async t => {
  let calls = [];
  t.mock.method(globalThis, 'fetch', async path => {
    calls.push(path);
    return Response.json(path.endsWith('offset=0') ? { projects: [{ id: 'a' }], nextOffset: 100 } : { projects: [{ id: 'a' }, { id: 'b' }], nextOffset: null });
  });
  assert.deepEqual((await allPages('/api/projects', 'projects')).map(row => row.id), ['a', 'b']);
  assert.deepEqual(calls, ['/api/projects?offset=0', '/api/projects?offset=100']);
  globalThis.fetch = async () => Response.json({ projects: [], nextOffset: 0 });
  await assert.rejects(allPages('/api/projects', 'projects'));
});
