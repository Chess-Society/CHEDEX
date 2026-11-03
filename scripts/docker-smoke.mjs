import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const name = `chedex-audit-${randomUUID()}`, volume = `${name}-data`, image = 'chedex-audit-check';
const docker = (...args) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker failed');
  return result.stdout.trim();
};
const start = () => {
  docker('run', '-d', '--name', name, '-p', '127.0.0.1::3000', '-v', `${volume}:/app/data`, image);
  return `http://${docker('port', name, '3000/tcp')}`;
};
const ready = async origin => {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(`${origin}/readyz`, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await setTimeout(500);
  }
  throw new Error(`Container readiness failed: ${docker('logs', name)}`);
};

try {
  docker('build', '-t', image, '.');
  docker('volume', 'create', volume);
  let origin = start();
  await ready(origin);
  assert.equal(docker('exec', name, 'id', '-u'), '1000');
  const marker = 'AUDIT_DOCKER_PERSISTENCE';
  docker('exec', name, 'node', '--input-type=module', '-e', `
    import { DatabaseSync } from 'node:sqlite';
    const db = new DatabaseSync('/app/data/chedex-v2.db');
    const row = db.prepare('SELECT content FROM chedex_v2_catalog WHERE id=1').get();
    const services = JSON.parse(row.content); services[0].title = '${marker}';
    db.prepare('UPDATE chedex_v2_catalog SET content=?,revision=revision+1 WHERE id=1').run(JSON.stringify(services));
    db.close();
  `);
  docker('restart', name);
  origin = `http://${docker('port', name, '3000/tcp')}`;
  await ready(origin);
  assert.ok((await (await fetch(`${origin}/api/services`)).json()).services.some(service => service.title === marker));
  docker('rm', '-f', name);
  origin = start(); await ready(origin);
  assert.ok((await (await fetch(`${origin}/api/services`)).json()).services.some(service => service.title === marker));
  console.log('Docker: usuario sin privilegios, escritura SQLite, reinicio y volumen persistente correctos.');
} finally {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
  spawnSync('docker', ['volume', 'rm', volume], { stdio: 'ignore' });
}
