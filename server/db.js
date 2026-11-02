export async function openDatabase({localFactory}={}) {
  const remote = process.env.TURSO_DATABASE_URL;
  let execute, transaction;
  if (remote) {
    if (!process.env.TURSO_AUTH_TOKEN) throw new Error('Falta TURSO_AUTH_TOKEN.');
    const { createClient } = await import('@libsql/client/web');
    const client = createClient({url:remote,authToken:process.env.TURSO_AUTH_TOKEN});
    execute = async (sql,args=[]) => (await client.execute({sql,args})).rows;
    transaction = statements => client.batch(statements.map(([sql,args=[]])=>({sql,args})), 'write');
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('Configura Turso antes de iniciar producción.');
    if(!localFactory)throw new Error('Configura Turso para este alojamiento.');
    ({execute,transaction}=localFactory());
  }
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, lichess_id TEXT UNIQUE NOT NULL, public_id TEXT UNIQUE NOT NULL, profile TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS oauth (state TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, data TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS entries_user ON entries(user_id)`,
    `CREATE TABLE IF NOT EXISTS entry_trash (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, data TEXT NOT NULL, expires INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS trash_expiry ON entry_trash(expires)`,
    `CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires)`,
    `CREATE TABLE IF NOT EXISTS favorites (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id,target_id))`
  ]) await execute(sql);
  execute.transaction = transaction;
  return execute;
}
