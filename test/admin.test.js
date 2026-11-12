import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createApi } from '../server/api.js';
import { remoteDatabase } from '../server/store.js';
import { defaultServices } from '../public/services-data.js';

const ORIGIN = 'https://chedex.app';
function fixture(t, account = { id: 'andresli', username: 'AndresLi' }) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const db = async (sql, args = []) => sqlite.prepare(sql).all(...args);
  let time = 1900000000000;
  let expectedChallenge;
  const api = createApi({
    env: { APP_URL: ORIGIN, LICHESS_CLIENT_ID: 'chedex.app' }, getDatabase: () => db, clock: () => time,
    fetcher: async (url, options) => {
      assert.equal(options.redirect, 'manual', 'Cloudflare supports manual redirects, not error mode');
      if (url === 'https://lichess.org/api/token') {
        const body = options.body;
        assert.equal(body.get('redirect_uri'), `${ORIGIN}/auth/callback`);
        assert.equal(createHash('sha256').update(body.get('code_verifier')).digest('base64url'), expectedChallenge);
        return Response.json({ access_token: 'synthetic_test_token' });
      }
      assert.equal(url, 'https://lichess.org/api/account');
      assert.equal(options.headers.Authorization, 'Bearer synthetic_test_token');
      return Response.json(account);
    },
  });
  const call = (path, options = {}) => api(new Request(`${ORIGIN}${path}`, options));
  async function begin() {
    const response = await call('/auth/lichess');
    assert.equal(response.status, 303);
    const url = new URL(response.headers.get('location'));
    assert.equal(url.origin, 'https://lichess.org');
    assert.equal(url.searchParams.get('scope'), '');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    expectedChallenge = url.searchParams.get('code_challenge');
    const state = url.searchParams.get('state');
    const cookie = response.headers.getSetCookie()[0].split(';')[0];
    return { state, cookie, response };
  }
  async function login() {
    const started = await begin();
    const response = await call(`/auth/callback?state=${started.state}&code=synthetic_code`, { headers: { cookie: started.cookie } });
    return { ...started, response, sessionCookie: response.headers.getSetCookie().find(value => value.startsWith('__Host-chedex_admin='))?.split(';')[0] };
  }
  return { call, begin, login, db, advance: ms => { time += ms; } };
}
const writeHeaders = cookie => ({ cookie, Origin: ORIGIN, 'X-Chedex-Request': '1', 'Content-Type': 'application/json' });

test('anonymous visitors cannot read or change the admin catalogue', async t => {
  const { call } = fixture(t);
  assert.equal((await call('/api/admin/services')).status, 401);
  assert.equal((await call('/api/admin/services', { method: 'PUT', headers: writeHeaders(''), body: '{}' })).status, 401);
});

test('Lichess login uses PKCE, a browser-bound state and secure cookies', async t => {
  const { login, db } = fixture(t);
  const result = await login();
  assert.ok(result.sessionCookie);
  const cookie = result.response.headers.getSetCookie().find(value => value.startsWith('__Host-chedex_admin='));
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(flag));
  const rawToken = result.sessionCookie.split('=')[1];
  const session = (await db('SELECT * FROM chedex_v2_sessions'))[0];
  assert.notEqual(session.token, rawToken);
  assert.equal(session.token, createHash('sha256').update(rawToken).digest('hex'));
  assert.equal(session.lichess_id, 'andresli');
});

test('a username cannot impersonate the authorised Lichess identity', async t => {
  const { login, db } = fixture(t, { id: 'anotheraccount', username: 'AndresLi' });
  const result = await login();
  assert.equal(result.response.headers.get('location'), '/admin');
  assert.equal(result.sessionCookie, undefined);
  assert.equal((await db('SELECT * FROM chedex_v2_sessions')).length, 0);
});

test('OAuth state must match the browser and cannot be reused', async t => {
  const { call, begin, db } = fixture(t);
  const { state, cookie } = await begin();
  const path = `/auth/callback?state=${state}&code=synthetic_code`;
  await call(path);
  assert.equal((await db('SELECT * FROM chedex_v2_sessions')).length, 0);
  const first = await call(path, { headers: { cookie } });
  assert.ok(first.headers.getSetCookie().some(value => value.startsWith('__Host-chedex_admin=')));
  const reused = await call(path, { headers: { cookie } });
  assert.ok(!reused.headers.getSetCookie().some(value => value.startsWith('__Host-chedex_admin=')));
  assert.equal((await db('SELECT * FROM chedex_v2_sessions')).length, 1);
});

test('expired OAuth states do not issue sessions', async t => {
  const { begin, call, advance, db } = fixture(t);
  const { state, cookie } = await begin();
  advance(600001);
  await call(`/auth/callback?state=${state}&code=synthetic_code`, { headers: { cookie } });
  assert.equal((await db('SELECT * FROM chedex_v2_sessions')).length, 0);
});

test('admin writes reject cross-origin and missing custom headers', async t => {
  const { login, call } = fixture(t);
  const { sessionCookie } = await login();
  for (const headers of [
    { ...writeHeaders(sessionCookie), Origin: 'https://other.example' },
    { cookie: sessionCookie, Origin: ORIGIN, 'Content-Type': 'application/json' },
  ]) {
    const response = await call('/api/admin/services', { method: 'PUT', headers, body: JSON.stringify({ revision: 1, services: defaultServices }) });
    assert.equal(response.status, 403);
  }
});

test('saved services persist, private drafts and hidden prices stay out of the public API', async t => {
  const { login, call, db } = fixture(t);
  const { sessionCookie } = await login();
  const services = structuredClone(defaultServices);
  services[0].title = 'Mi servicio actualizado';
  services[0].priceText = 'Texto económico privado';
  services[0].showPrice = false;
  services[1].published = false;
  const response = await call('/api/admin/services', { method: 'PUT', headers: writeHeaders(sessionCookie), body: JSON.stringify({ revision: 1, services }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revision, 2);
  const publicData = await (await call('/api/services')).json();
  assert.equal(publicData.services.length, defaultServices.length - 1);
  assert.equal(publicData.services[0].title, 'Mi servicio actualizado');
  assert.equal(publicData.services[0].priceText, undefined);
  assert.equal(JSON.stringify(publicData).includes('Texto económico privado'), false);
  // A fresh application instance reads the same saved catalogue.
  const freshApi = createApi({ env: { APP_URL: ORIGIN }, getDatabase: () => db });
  const persisted = await (await freshApi(new Request(`${ORIGIN}/api/services`))).json();
  assert.equal(persisted.services[0].title, 'Mi servicio actualizado');
});

test('parallel edits cannot silently overwrite a newer catalogue', async t => {
  const { login, call } = fixture(t);
  const { sessionCookie } = await login();
  const save = () => call('/api/admin/services', { method: 'PUT', headers: writeHeaders(sessionCookie), body: JSON.stringify({ revision: 1, services: defaultServices }) });
  assert.equal((await save()).status, 200);
  assert.equal((await save()).status, 409);
});

test('catalogue validation rejects malformed fields, duplicate IDs and empty visible prices', async t => {
  const { login, call } = fixture(t);
  const { sessionCookie } = await login();
  for (const mutate of [
    services => { services[0].title = ''; },
    services => { services[1].id = services[0].id; },
    services => { services[0].showPrice = true; services[0].priceText = ''; },
    services => { services[0].featured = 'yes'; },
    services => { services[0].graphic = '<script>'; },
  ]) {
    const services = structuredClone(defaultServices); mutate(services);
    const response = await call('/api/admin/services', { method: 'PUT', headers: writeHeaders(sessionCookie), body: JSON.stringify({ revision: 1, services }) });
    assert.equal(response.status, 400);
  }
});

test('oversized bodies are rejected', async t => {
  const { login, call } = fixture(t);
  const { sessionCookie } = await login();
  const response = await call('/api/admin/services', { method: 'PUT', headers: writeHeaders(sessionCookie), body: JSON.stringify({ value: 'x'.repeat(66000) }) });
  assert.equal(response.status, 413);
});

test('logout and session expiry revoke API access', async t => {
  const { login, call, advance } = fixture(t);
  const { sessionCookie } = await login();
  assert.equal((await call('/api/admin/session', { headers: { cookie: sessionCookie } })).status, 200);
  assert.equal((await call('/api/admin/logout', { method: 'POST', headers: writeHeaders(sessionCookie) })).status, 200);
  assert.equal((await call('/api/admin/services', { headers: { cookie: sessionCookie } })).status, 401);
  const next = await login();
  advance(28800001);
  assert.equal((await call('/api/admin/services', { headers: { cookie: next.sessionCookie } })).status, 401);
});

test('OAuth attempt limits apply before more states are created', async t => {
  const { call } = fixture(t);
  for (let i = 0; i < 20; i++) assert.equal((await call('/auth/lichess')).status, 303);
  assert.equal((await call('/auth/lichess')).status, 429);
});

test('Turso HTTP adapter binds parameters, closes the stream and decodes values', async () => {
  const db = remoteDatabase({ TURSO_DATABASE_URL: 'libsql://example.turso.io', TURSO_AUTH_TOKEN: 'synthetic_test_secret' }, async (url, options) => {
    assert.equal(url.href, 'https://example.turso.io/v2/pipeline');
    assert.equal(options.redirect, 'manual');
    const body = JSON.parse(options.body);
    assert.deepEqual(body.requests[0].stmt.args, [{ type: 'text', value: 'hello' }, { type: 'integer', value: '2' }]);
    assert.equal(body.requests.at(-1).type, 'close');
    return Response.json({ results: [{ type: 'ok', response: { result: { cols: [{ name: 'content' }, { name: 'revision' }], rows: [[{ type: 'text', value: 'saved' }, { type: 'integer', value: '3' }]] } } }] });
  });
  assert.deepEqual(await db('SELECT ?,?', ['hello', 2]), [{ content: 'saved', revision: 3 }]);
});
