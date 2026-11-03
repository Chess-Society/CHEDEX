import { defaultServices } from '../public/services-data.js';

export async function cleanupExpired(db, now = Date.now()) {
  for (const table of ['oauth', 'sessions', 'limits']) {
    await db(`DELETE FROM chedex_v2_${table} WHERE expires<=?`, [now]);
  }
}

export async function initializeStore(db) {
  for (const sql of [
    'CREATE TABLE IF NOT EXISTS chedex_v2_catalog (id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL, content TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS chedex_v2_oauth (state TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS chedex_v2_sessions (token TEXT PRIMARY KEY, lichess_id TEXT NOT NULL, username TEXT NOT NULL, expires INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS chedex_v2_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)',
    "CREATE TABLE IF NOT EXISTS chedex_v2_users (lichess_id TEXT PRIMARY KEY, username TEXT NOT NULL, profile TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL)",
    'CREATE TABLE IF NOT EXISTS chedex_v2_projects (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, revision INTEGER NOT NULL, content TEXT NOT NULL, updated_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS chedex_v2_projects_owner ON chedex_v2_projects(owner_id,updated_at)',
    "CREATE TABLE IF NOT EXISTS chedex_v2_reviews (id TEXT PRIMARY KEY, project_id TEXT UNIQUE NOT NULL, owner_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), text TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','hidden')), created_at INTEGER NOT NULL)",
  ]) await db(sql);
  await db('INSERT OR IGNORE INTO chedex_v2_catalog (id,revision,content) VALUES (1,1,?)', [JSON.stringify(defaultServices)]);
  return db;
}

// The existing libSQL database is reached over HTTPS without a new dependency.
export function remoteDatabase(env, fetcher = fetch) {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('DATABASE_UNCONFIGURED');
  const base = new URL(env.TURSO_DATABASE_URL.replace(/^libsql:/, 'https:'));
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('DATABASE_URL');
  const endpoint = new URL('/v2/pipeline', base);
  return async (sql, args = []) => {
    const response = await fetcher(endpoint, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.TURSO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [
        { type: 'execute', stmt: { sql, args: args.map(value => typeof value === 'number' ? { type: 'integer', value: String(value) } : { type: 'text', value: String(value) }), want_rows: true } },
        { type: 'close' },
      ] }),
    });
    if (!response.ok) throw new Error('DATABASE_UNAVAILABLE');
    const payload = await response.json();
    const entry = payload.results?.[0];
    if (entry?.type !== 'ok' || !entry.response?.result) throw new Error('DATABASE_QUERY');
    const { cols, rows } = entry.response.result;
    return rows.map(row => Object.fromEntries(cols.map((column, index) => {
      const cell = row[index];
      return [column.name, cell.type === 'null' ? null : cell.type === 'integer' || cell.type === 'float' ? Number(cell.value) : cell.value];
    })));
  };
}
