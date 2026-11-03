import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let count = 0;
for (const root of ['public', 'server', 'worker', 'scripts', 'test']) {
  for (const file of readdirSync(new URL(`../${root}/`, import.meta.url), { recursive: true })) {
    if (!/\.(?:m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(`../${root}/${file.replaceAll('\\', '/')}`, import.meta.url))], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
    count++;
  }
}
console.log(`Sintaxis correcta: ${count} módulos.`);
