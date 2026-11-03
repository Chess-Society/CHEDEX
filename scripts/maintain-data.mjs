// Explicit local SQLite maintenance. Never reads .env or connects to Turso.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { cleanupExpired } from '../server/store.js';
import { clientProject } from '../server/workspace-api.js';

function checkIntegrity(db) {
  if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('La comprobación de integridad ha fallado.');
}

function backupDatabase(db, destination) {
  if (!destination) throw new Error('Indica un archivo nuevo para la copia.');
  const path = resolve(destination);
  // Reserve an empty private file exclusively; VACUUM INTO accepts an empty file.
  closeSync(openSync(path, 'wx', 0o600));
  db.prepare('VACUUM INTO ?').run(path);
  const copy = new DatabaseSync(path, { readOnly: true });
  try { checkIntegrity(copy); } finally { copy.close(); }
}

export async function maintainData({ database, action, user, output, confirm, backup }) {
  if (!database || !existsSync(database)) throw new Error('Indica una base SQLite existente con --database.');
  if (!['cleanup', 'backup', 'verify', 'export-user', 'delete-user'].includes(action)) throw new Error('Operación no válida.');
  if (['export-user', 'delete-user'].includes(action) && !/^[a-z0-9_-]{2,30}$/.test(user || '')) throw new Error('Indica el ID exacto de Lichess con --user.');
  const db = new DatabaseSync(resolve(database), { readOnly: ['export-user', 'verify'].includes(action) });
  db.exec('PRAGMA busy_timeout=5000');
  try {
    if (action === 'verify') { checkIntegrity(db); return; }
    if (action === 'backup') { backupDatabase(db, output); return; }
    if (action === 'cleanup') {
      await cleanupExpired(async (sql, args) => db.prepare(sql).all(...args));
      return;
    }
    if (action === 'export-user') {
      if (!output) throw new Error('Indica un archivo nuevo con --output.');
      // Consistent snapshot; authentication tokens and internal team notes are excluded.
      db.exec('BEGIN');
      const account = db.prepare('SELECT lichess_id AS id,username,profile,created_at AS createdAt FROM chedex_v2_users WHERE lichess_id=?').get(user);
      if (!account) throw new Error('Usuario no encontrado.');
      const projects = db.prepare('SELECT id,revision,updated_at,content FROM chedex_v2_projects WHERE owner_id=? ORDER BY id').all(user)
        .map(row => clientProject({ id: row.id, revision: row.revision, updatedAt: row.updated_at, ...JSON.parse(row.content) }));
      const reviews = db.prepare('SELECT project_id AS projectId,rating,text,status,created_at AS createdAt FROM chedex_v2_reviews WHERE owner_id=? ORDER BY id').all(user);
      const payload = { exportedAt: new Date().toISOString(), account: { ...account, profile: JSON.parse(account.profile) }, projects, reviews };
      db.exec('COMMIT');
      writeFileSync(resolve(output), JSON.stringify(payload, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      return;
    }
    if (confirm !== user || !backup) throw new Error('La eliminación requiere --confirm con el ID exacto y --backup con una copia nueva.');
    if (!db.prepare('SELECT 1 FROM chedex_v2_users WHERE lichess_id=?').get(user)) throw new Error('Usuario no encontrado.');
    backupDatabase(db, backup);
    // This command is an offline operation: stop the application before running it.
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM chedex_v2_reviews WHERE owner_id=? OR project_id IN (SELECT id FROM chedex_v2_projects WHERE owner_id=?)').run(user, user);
      db.prepare('DELETE FROM chedex_v2_projects WHERE owner_id=?').run(user);
      db.prepare('DELETE FROM chedex_v2_sessions WHERE lichess_id=?').run(user);
      db.prepare('DELETE FROM chedex_v2_limits WHERE key GLOB ?').run(`workspace:${user}:*`);
      db.prepare('DELETE FROM chedex_v2_users WHERE lichess_id=?').run(user);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } finally { db.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries(['database', 'user', 'output', 'confirm', 'backup'].map(key => [key, { type: 'string' }])) });
    if (positionals.length !== 1) throw new Error('Indica una operación: cleanup, backup, verify, export-user o delete-user.');
    await maintainData({ ...values, action: positionals[0] });
    console.log('Operación completada.');
  } catch {
    console.error('No se ha completado la operación. Comprueba sus argumentos, permisos y el procedimiento en docs/mantenimiento-datos.md. No se sobrescriben archivos existentes.');
    process.exitCode = 1;
  }
}
