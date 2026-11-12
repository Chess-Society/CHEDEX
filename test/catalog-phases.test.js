import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { defaultServices, phaseOf, migrateCatalog, servicePhases } from '../public/services-data.js';
import { validateServices } from '../server/api.js';
import { initializeStore } from '../server/store.js';

const legacy = () => structuredClone(defaultServices)
  .filter(service => ['apoyo-puntual', 'representacion', 'acompanamiento', 'desarrollo-proyectos'].includes(service.id))
  .map(({ phase, ...service }) => service);

test('phaseOf separa la consultoría de los paquetes de La Chulapa', () => {
  assert.deepEqual(servicePhases, ['consultoria', 'marca-personal']);
  for (const id of ['apoyo-puntual', 'representacion', 'acompanamiento']) assert.equal(phaseOf({ id }), 'marca-personal');
  assert.equal(phaseOf({ id: 'desarrollo-proyectos' }), 'consultoria');
  assert.equal(phaseOf({ id: 'otro-servicio' }), 'consultoria');
  assert.equal(phaseOf({ id: 'apoyo-puntual', phase: 'consultoria' }), 'consultoria');
});

test('los servicios por defecto cubren las dos fases y precios de consultoría aprobados', () => {
  const phase1 = defaultServices.filter(service => service.phase === 'consultoria');
  assert.deepEqual(phase1.map(service => service.id), ['consultoria-puntual', 'consultoria-estrategica', 'desarrollo-proyectos', 'acompanamiento-estrategico']);
  assert.equal(defaultServices.filter(service => service.phase === 'marca-personal').length, 3);
  assert.deepEqual(phase1.map(service => service.priceText.split(' · ')[0]), ['50 €', 'Desde 180 €', 'Desde 350 €', '120 €']);
  assert.ok(phase1.every(service => service.showPrice));
  assert.equal(defaultServices.filter(service => service.featured).map(service => service.id).join(), 'acompanamiento');
});

test('migrateCatalog normaliza un catálogo antiguo una sola vez y respeta las ediciones', () => {
  const old = legacy();
  old.find(service => service.id === 'apoyo-puntual').title = 'Título editado';
  old.find(service => service.id === 'representacion').published = false;
  const first = migrateCatalog(old);
  assert.equal(first.changed, true);
  assert.equal(first.services.length, 7);
  assert.equal(first.services.find(service => service.id === 'apoyo-puntual').title, 'Título editado');
  assert.equal(first.services.find(service => service.id === 'representacion').published, false);
  assert.ok(first.services.every(service => servicePhases.includes(service.phase)));
  const second = migrateCatalog(first.services);
  assert.equal(second.changed, false);
  assert.equal(second.services.length, 7);
});

test('una edición posterior que quita un servicio nuevo no lo vuelve a añadir', () => {
  const migrated = migrateCatalog(legacy()).services.filter(service => service.id !== 'consultoria-puntual');
  const again = migrateCatalog(migrated);
  assert.equal(again.changed, false);
  assert.equal(again.services.length, 6);
});

test('validateServices exige una fase válida y normaliza la ausente', () => {
  const [first] = structuredClone(defaultServices);
  assert.throws(() => validateServices([{ ...first, phase: 'otra' }]), /fase/i);
  const { phase, ...withoutPhase } = first;
  assert.equal(validateServices([{ ...withoutPhase, id: 'apoyo-puntual' }])[0].phase, 'marca-personal');
});

test('initializeStore migra un catálogo guardado sin fase y sube la revisión una vez', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const db = async (sql, args = []) => sqlite.prepare(sql).all(...args);
  await initializeStore(db);
  await db('UPDATE chedex_v2_catalog SET content=?,revision=5 WHERE id=1', [JSON.stringify(legacy())]);
  await initializeStore(db);
  let row = (await db('SELECT revision,content FROM chedex_v2_catalog WHERE id=1'))[0];
  assert.equal(row.revision, 6);
  assert.equal(JSON.parse(row.content).length, 7);
  await initializeStore(db);
  row = (await db('SELECT revision FROM chedex_v2_catalog WHERE id=1'))[0];
  assert.equal(row.revision, 6);
  sqlite.close();
});
