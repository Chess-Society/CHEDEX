import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { initializeStore, cleanupExpired } from '../server/store.js';
import { maintainData } from '../scripts/maintain-data.mjs';

test('AUD-07: la limpieza elimina solo registros caducados, incluso sin un nuevo inicio de sesión', async t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const query = async (sql, args = []) => db.prepare(sql).all(...args);
  await initializeStore(query);
  for (const [key, expires] of [['expired', 100], ['valid', 101]]) {
    await query('INSERT INTO chedex_v2_oauth VALUES (?,?,?)', [key, 'verifier', expires]);
    await query('INSERT INTO chedex_v2_sessions VALUES (?,?,?,?)', [key, 'alice', 'Alice', expires]);
    await query('INSERT INTO chedex_v2_limits VALUES (?,1,?)', [key, expires]);
  }
  await cleanupExpired(query, 100);
  for (const table of ['oauth', 'sessions', 'limits']) assert.equal((await query(`SELECT COUNT(*) AS n FROM chedex_v2_${table}`))[0].n, 1);
});

test('AUD-07: exportación privada, copia restaurable y supresión transaccional sin alterar otras cuentas ni tablas antiguas', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'chedex-maintenance-'));
  t.after(() => {
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.ok(basename(dir).startsWith('chedex-maintenance-'));
    rmSync(dir, { recursive: true, force: true });
  });
  const database = join(dir, 'source.db'), output = join(dir, 'export.json'), backup = join(dir, 'backup.db');
  const db = new DatabaseSync(database);
  await initializeStore(async (sql, args = []) => db.prepare(sql).all(...args));
  db.exec("CREATE TABLE previous_app (value TEXT); INSERT INTO previous_app VALUES ('KEEP')");
  for (const owner of ['alice', 'bob']) {
    db.prepare('INSERT INTO chedex_v2_users VALUES (?,?,?,?)').run(owner, owner, '{}', 1);
    db.prepare('INSERT INTO chedex_v2_sessions VALUES (?,?,?,?)').run(`TOKEN_${owner}`, owner, owner, 9999);
    db.prepare('INSERT INTO chedex_v2_limits VALUES (?,1,?)').run(`workspace:${owner}:0`, 9999);
    const content = { title: owner, summary: '', tasks: [], history: [], updates: [{ internal: true, text: 'PRIVATE_NOTE' }, { internal: false, text: 'SHARED_MESSAGE' }] };
    db.prepare('INSERT INTO chedex_v2_projects VALUES (?,?,1,?,1)').run(owner, owner, JSON.stringify(content));
    db.prepare('INSERT INTO chedex_v2_reviews VALUES (?,?,?,5,?,?,1)').run(owner, owner, owner, 'Review', 'approved');
  }
  db.close();
  await maintainData({ database, action: 'export-user', user: 'alice', output });
  const exported = readFileSync(output, 'utf8');
  assert.match(exported, /SHARED_MESSAGE/);
  assert.doesNotMatch(exported, /PRIVATE_NOTE|TOKEN_|bob/);
  await assert.rejects(maintainData({ database, action: 'export-user', user: 'alice', output }));
  await assert.rejects(maintainData({ database, action: 'delete-user', user: 'alice', confirm: 'bob', backup }));
  await maintainData({ database, action: 'delete-user', user: 'alice', confirm: 'alice', backup });
  const remaining = new DatabaseSync(database, { readOnly: true });
  try {
    for (const table of ['users', 'sessions', 'projects', 'reviews', 'limits']) assert.equal(remaining.prepare(`SELECT COUNT(*) AS n FROM chedex_v2_${table}`).get().n, 1);
    assert.equal(remaining.prepare('SELECT value FROM previous_app').get().value, 'KEEP');
  } finally { remaining.close(); }
  // Restoring to an isolated SQLite connection preserves pre-deletion records.
  const restored = new DatabaseSync(backup, { readOnly: true });
  try {
    assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM chedex_v2_users').get().n, 2);
    assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM chedex_v2_projects').get().n, 2);
  } finally { restored.close(); }
  await maintainData({ database: backup, action: 'verify' });
});
