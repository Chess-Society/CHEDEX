import test from 'node:test';
import assert from 'node:assert/strict';
import { todayHtml, phase2Message } from '../public/dash-today.js';
import { PHASE2_PREFIX } from '../public/dash-data.js';

const DAY = 86400000, now = new Date(2026, 10, 12, 15, 0).getTime();
const base = { projects: [], slots: [], pendingReviews: 0, period: '7d', proposed: new Set(), now };

test('con datos vacíos muestra estados vacíos útiles y ningún error', () => {
  const html = todayHtml(base);
  for (const text of ['Estás al día.', 'Sin llamadas pendientes.', 'Nadie por ahora.', 'Sin solicitudes en este periodo ni en el anterior.']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('escapa el contenido editable y enlaza cada fila con su consulta', () => {
  const project = { id: 'x"1', ownerId: 'ana', username: '<b>Ana</b>', title: '<img onerror=1>', need: 'Consultoría puntual', stage: 'Completado', progressPhase: 'Completado', requestStatus: 'Pendiente de revisión', archived: false, createdAt: now - 3 * DAY, updatedAt: now };
  const html = todayHtml({ ...base, projects: [project] });
  assert.doesNotMatch(html, /<img onerror|<b>Ana/);
  assert.ok(html.includes('data-project="x&quot;1"'));
  assert.ok(html.includes('hace 3 días'));
});

test('lista llamadas reservadas y candidatos a fase 2, y marca el periodo activo', () => {
  const project = { id: 'p1', ownerId: 'ana', username: 'Ana', title: 'Mi club', need: 'Consultoría estratégica', stage: 'Completado', progressPhase: 'Completado', requestStatus: 'Aceptada', archived: false, createdAt: now - 5 * DAY, updatedAt: now };
  const slots = [
    { id: 's', starts: now + DAY, ends: now + DAY + 900000, enabled: 1, projectId: 'p1' },
    { id: 'libre', starts: now + 2 * DAY, ends: now + 2 * DAY + 900000, enabled: 1, projectId: null },
  ];
  const html = todayHtml({ ...base, projects: [project], slots, period: '30d' });
  assert.ok(html.includes('data-propose-phase2="p1"'));
  assert.equal((html.match(/Ana · Mi club/g) || []).length, 1, 'solo la llamada reservada, no el horario libre');
  assert.ok(html.includes('data-period="30d" aria-pressed="true"'));
  assert.equal(todayHtml({ ...base, projects: [project], proposed: new Set(['p1']) }).includes('data-propose-phase2'), false);
});

test('el mensaje de propuesta empieza por el prefijo que detecta la lista', () => {
  assert.ok(phase2Message.startsWith(PHASE2_PREFIX));
});

test('las barras del embudo no usan estilos en línea (la política de seguridad los bloquea)', () => {
  const html = todayHtml(base);
  assert.doesNotMatch(html, /style=/);
  assert.match(html, /data-width="0"/);
});

test('las consultas en «Llamada de 15 min» aparecen como llamada por concretar, sin duplicar las reservadas', () => {
  const mk = (id, extra) => ({ id, ownerId: id, username: id, title: 'T-' + id, need: 'Consultoría puntual', stage: 'Por hablar', requestStatus: 'Aceptada', progressPhase: 'Llamada de 15 min', archived: false, createdAt: now - DAY, updatedAt: now, ...extra });
  const slots = [{ id: 's', starts: now + DAY, ends: now + DAY + 900000, enabled: 1, projectId: 'reservada' }];
  const html = todayHtml({ ...base, projects: [mk('reservada'), mk('porconcretar'), mk('archivada', { archived: true }), mk('otra', { progressPhase: 'En marcha' })], slots });
  assert.equal((html.match(/Por concretar/g) || []).length, 1);
  assert.ok(html.includes('T-porconcretar'));
  assert.equal(html.includes('T-archivada'), false);
  assert.equal(html.includes('T-otra'), false);
});
