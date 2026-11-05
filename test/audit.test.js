// Pruebas de regresión de los hallazgos de auditoría.
// Solo SQLite en memoria y un servidor hijo aislado; no lee archivos .env.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { createServer, connect } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApi } from '../server/api.js';
import { initializeStore } from '../server/store.js';
import { clientProject } from '../server/workspace-api.js';

async function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const db = async (sql, args = []) => sqlite.prepare(sql).all(...args);
  await initializeStore(db);
  const now = 1900000000000;
  const cookies = {};
  for (const user of ['andresli', 'alice']) {
    const token = randomBytes(32).toString('base64url');
    cookies[user] = `__Host-chedex_admin=${token}`;
    await db('INSERT INTO chedex_v2_users VALUES (?,?,?,?)', [user, user, '{}', now]);
    await db('INSERT INTO chedex_v2_sessions VALUES (?,?,?,?)', [createHash('sha256').update(token).digest('hex'), user, user, now + 100000]);
  }
  const origin = 'https://chedex.app';
  const api = createApi({ env: { APP_URL: origin }, getDatabase: () => db, clock: () => now });
  const call = (user, path, body, method = body ? 'POST' : 'GET') => api(new Request(origin + path, {
    method, headers: { cookie: cookies[user], origin, 'Content-Type': 'application/json', 'X-Chedex-Request': '1' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  const body = { firstName: 'Persona', lastName: 'Prueba', title: 'Proyecto de prueba', summary: 'Datos ficticios de auditoría', need: 'Apoyo puntual' };
  return { db, call, body, now };
}

test('AUD-01: una petición malformada devuelve 400 y el servidor sigue disponible', { timeout: 10000 }, async t => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server/local.js', import.meta.url))], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  let response = '';
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', () => reject(new Error('El servidor terminó antes de arrancar')));
    child.stdout.once('data', resolve);
  });
  await new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => socket.end('GET //[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));
    socket.on('error', reject);
    socket.on('data', chunk => { response += chunk; });
    socket.on('close', resolve);
    socket.resume();
  });
  assert.match(response, /^HTTP\/1\.1 400 /);
  assert.equal(child.exitCode, null);
  assert.doesNotMatch(stderr, /ERR_INVALID_URL/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/healthz`)).status, 200);
  for (const path of ['/button-effects.js', '/site-animations.js', '/vendor/animejs.js', '/vendor/animejs.LICENSE.txt']) {
    const asset = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(asset.status, 200, path);
    assert.match(asset.headers.get('Content-Type'), path.endsWith('.js') ? /javascript/ : /text\/plain/);
  }
});

test('AUD-03: hacer interna una tarea retira también sus títulos del historial compartido', async t => {
  const { call, body } = await fixture(t);
  let p = (await (await call('alice', '/api/projects', body)).json()).project;
  const task = { title: 'TITULO_COMPARTIDO_ANTERIOR', details: '', assignee: '', due: '', status: 'En marcha', internal: false };
  const edit = async task => {
    const response = await call('andresli', `/api/admin/projects/${p.id}`, { revision: p.revision, action: 'task', task }, 'PUT');
    assert.equal(response.status, 200);
    p = (await response.json()).project;
  };
  await edit(task);
  await edit({ ...p.tasks[0], title: 'TITULO_INTERNO_NUEVO', internal: true });
  const visible = (await (await call('alice', `/api/projects/${p.id}`)).json()).project;
  assert.equal(visible.tasks.length, 0);
  assert.ok(!visible.history.some(event => event.text.includes(task.title)));
  assert.ok(!JSON.stringify(visible).includes('TITULO_INTERNO_NUEVO'));
});

test('AUD-03: eventos antiguos sin identificador de tarea no vuelven a exponer títulos retirados', () => {
  const project = { tasks: [], updates: [], history: [{ text: 'Tarea: TITULO_ANTIGUO. Estado: En marcha.', internal: false }, { text: 'Proyecto creado.', internal: false }] };
  assert.deepEqual(clientProject(project).history, [project.history[1]]);
  assert.equal(project.history.length, 2); // The administrator retains the original history.
});

test('AUD-04: la paginación permite recuperar todos los proyectos sin filtrarlos a otros usuarios', async t => {
  const { db, call, now } = await fixture(t);
  const content = JSON.stringify({ title: 'Proyecto', summary: '', need: 'Apoyo puntual', stage: 'Por hablar', archived: false, tasks: [], updates: [], history: [] });
  for (let n = 0; n < 501; n++) {
    const owner = `owner${Math.floor(n / 100)}`;
    if (n % 100 === 0) await db('INSERT INTO chedex_v2_users VALUES (?,?,?,?)', [owner, owner, '{}', now]);
    await db('INSERT INTO chedex_v2_projects VALUES (?,?,1,?,?)', [`project${n}`, owner, content, now + n]);
  }
  let offset = 0;
  const projects = [];
  do {
    const data = await (await call('andresli', `/api/admin/projects?offset=${offset}`)).json();
    assert.ok(data.projects.length <= 100);
    projects.push(...data.projects);
    offset = data.nextOffset;
  } while (offset !== null);
  assert.equal(new Set(projects.map(p => p.id)).size, 501);
  assert.ok(projects.some(p => p.id === 'project0'));
  assert.deepEqual((await (await call('alice', '/api/projects?offset=100')).json()).projects, []);
  assert.equal((await call('andresli', '/api/admin/projects?offset=-1')).status, 400);
  assert.equal((await call('andresli', '/api/admin/projects/project0')).status, 200);
});

test('AUD-05: dos solicitudes simultáneas respetan el máximo de cien proyectos', async t => {
  const { db, call, body, now } = await fixture(t);
  const content = JSON.stringify({ ...body, stage: 'Por hablar', archived: false, tasks: [], updates: [], history: [] });
  for (let n = 0; n < 99; n++) await db('INSERT INTO chedex_v2_projects VALUES (?,?,1,?,?)', [`project${n}`, 'alice', content, now]);
  const results = await Promise.all([call('alice', '/api/projects', body), call('alice', '/api/projects', body)]);
  assert.deepEqual(results.map(response => response.status).sort(), [201, 400]);
  assert.equal((await db('SELECT COUNT(*) AS count FROM chedex_v2_projects WHERE owner_id=?', ['alice']))[0].count, 100);
});

test('AUD-04: personas y reseñas también son paginables con orden estable', async t => {
  const { db, call, now } = await fixture(t);
  for (let n = 0; n < 102; n++) {
    await db('INSERT INTO chedex_v2_users VALUES (?,?,?,?)', [`user${n}`, `User${n}`, '{}', now]);
    await db('INSERT INTO chedex_v2_reviews VALUES (?,?,?,5,?,?,?)', [`review${n}`, `project${n}`, `user${n}`, 'Opinión de prueba', 'pending', now]);
  }
  for (const [path, key, expected] of [['users', 'users', 104], ['reviews', 'reviews', 102]]) {
    const first = await (await call('andresli', `/api/admin/${path}`)).json();
    const second = await (await call('andresli', `/api/admin/${path}?offset=${first.nextOffset}`)).json();
    assert.equal(first[key].length, 100);
    assert.equal(new Set([...first[key], ...second[key]].map(row => row.id)).size, expected);
    assert.equal(second.nextOffset, null);
  }
});

test('AUD-06: el segundo editor del perfil recibe un conflicto y no borra el primer cambio', async t => {
  const { call } = await fixture(t);
  const first = (await (await call('alice', '/api/account')).json()).profile;
  const second = (await (await call('alice', '/api/account')).json()).profile;
  const blank = { revision: 0, bio: '', goals: '', email: '', links: [] };
  assert.equal((await call('alice', '/api/account/profile', { ...blank, ...first, bio: 'BIO_NUEVA' }, 'PUT')).status, 200);
  assert.equal((await call('alice', '/api/account/profile', { ...blank, ...second, goals: 'OBJETIVO_NUEVO' }, 'PUT')).status, 409);
  const saved = (await (await call('alice', '/api/account')).json()).profile;
  assert.equal(saved.bio, 'BIO_NUEVA');
  assert.equal(saved.goals, '');
  assert.equal(saved.revision, 1);
  assert.equal((await call('alice', '/api/account/profile', { ...saved, goals: 'OBJETIVO_NUEVO' }, 'PUT')).status, 200);
});
