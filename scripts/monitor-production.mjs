import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

// Public availability checks only: no sessions, provider credentials or user data.
async function check() {
  const responses = await Promise.all(['/', '/readyz', '/api/admin/services'].map(path =>
    fetch(`https://chedex.app${path}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })));
  assert.equal(responses[0].status, 200, 'Public website unavailable');
  assert.equal(responses[1].status, 200, 'Database readiness failed');
  assert.equal(responses[2].status, 401, 'Administrative access protection changed');
  assert.equal(responses[0].headers.get('x-content-type-options'), 'nosniff', 'Missing security header');
  assert.match(responses[0].headers.get('strict-transport-security') || '', /max-age=31536000/);
  await Promise.all(responses.map(response => response.arrayBuffer()));
}

let passed = false;
for (let attempt = 0; attempt < 3; attempt++) {
  try { await check(); passed = true; break; }
  catch { if (attempt < 2) await setTimeout(5000); }
}
console.log(passed ? 'Chedex: disponibilidad, base de datos y protección administrativa correctas.' : 'Chedex: fallo persistente de disponibilidad o de los controles publicados.');
if (!passed) process.exitCode = 1;
