// Read-only remote export. Run with Node's --env-file=.dev.vars; never print env values.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

try {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('CONFIG');
  const base = new URL(process.env.TURSO_DATABASE_URL.replace(/^libsql:/, 'https:'));
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('URL');
  const response = await fetch(new URL('/dump', base), {
    headers: { Authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN}` },
    signal: AbortSignal.timeout(60000), redirect: 'manual',
  });
  if (!response.ok) throw new Error('EXPORT');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 64 * 1024 * 1024) { await reader.cancel(); throw new Error('SIZE'); }
    chunks.push(value);
  }
  const dump = Buffer.concat(chunks);
  // Only restore inside a private, in-memory SQLite connection. No remote writes.
  const sql = dump.toString('utf8');
  if (/^\s*(ATTACH|DETACH|VACUUM|SELECT\s+load_extension)\b/im.test(sql)) throw new Error('UNSAFE_DUMP');
  const db = new DatabaseSync(':memory:');
  let tables, rows = 0;
  try {
    db.exec(sql);
    if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('INTEGRITY');
    tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const { name } of tables) rows += db.prepare(`SELECT COUNT(*) AS n FROM "${name.replaceAll('"', '""')}"`).get().n;
    for (const name of ['chedex_v2_users', 'chedex_v2_projects', 'chedex_v2_catalog']) {
      if (!tables.some(table => table.name === name)) throw new Error('SCHEMA');
    }
  } finally { db.close(); }
  const dir = resolve('backups', `production-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const principal = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
    const acl = spawnSync('icacls', [dir, '/inheritance:r', '/grant:r', `${principal}:(OI)(CI)F`], { encoding: 'utf8' });
    if (acl.status !== 0) throw new Error('ACL');
  }
  const key = randomBytes(32), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
  const envelope = Buffer.from(JSON.stringify({ version: 1, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') }));
  const file = resolve(dir, 'database.sql.enc'), keyFile = resolve(dir, 'restore.key');
  writeFileSync(keyFile, key, { flag: 'wx', mode: 0o600 });
  writeFileSync(file, envelope, { flag: 'wx', mode: 0o600 });
  const stored = JSON.parse(readFileSync(file, 'utf8'));
  const decipher = createDecipheriv('aes-256-gcm', readFileSync(keyFile), Buffer.from(stored.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(stored.tag, 'base64'));
  const restored = Buffer.concat([decipher.update(Buffer.from(stored.data, 'base64')), decipher.final()]);
  if (!restored.equals(dump)) throw new Error('VERIFY');
  console.log(JSON.stringify({ backup: relative(process.cwd(), file), encrypted: true, bytes: size, tables: tables.length, rows, sha256: createHash('sha256').update(dump).digest('hex'), restoreVerified: true }));
} catch {
  console.error('REMOTE_BACKUP_FAILED: no se han modificado datos remotos ni mostrado secretos.');
  process.exitCode = 1;
}
