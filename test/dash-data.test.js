import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseOfNeed, needsReply, replyQueue, funnel, newRequests, phase2Candidates, phase2Proposed, periodRange, PHASE2_PREFIX, FUNNEL_PHASES } from '../public/dash-data.js';

const DAY = 86400000;
const now = new Date(2026, 10, 12, 15, 30).getTime();
const base = { id: 'p', ownerId: 'ana', username: 'Ana', need: 'Consultoría puntual', stage: 'Por hablar', progressPhase: 'Recibida', requestStatus: 'Aceptada', archived: false, createdAt: now - 2 * DAY, updatedAt: now - DAY, lastMessageBy: null, lastMessageAt: null };
const make = (id, extra = {}) => ({ ...base, id, ...extra });

test('phaseOfNeed clasifica las modalidades por fase', () => {
  for (const need of ['Consultoría puntual', 'Consultoría estratégica', 'Acompañamiento estratégico', 'Desarrollo de proyectos']) assert.equal(phaseOfNeed(need), 'consultoria', need);
  for (const need of ['Apoyo puntual', 'Representación', 'Acompañamiento']) assert.equal(phaseOfNeed(need), 'marca-personal', need);
  for (const need of ['Orientación inicial', 'Colaboración de marca', undefined]) assert.equal(phaseOfNeed(need), 'otra', String(need));
});

test('needsReply: solicitud pendiente o último mensaje del propietario, nunca archivadas', () => {
  assert.equal(needsReply(make('a', { requestStatus: 'Pendiente de revisión' })), true);
  assert.equal(needsReply(make('b', { lastMessageBy: 'ANA', lastMessageAt: now - DAY })), true, 'sin distinguir mayúsculas');
  assert.equal(needsReply(make('c', { lastMessageBy: 'AndresLi', lastMessageAt: now - DAY })), false);
  assert.equal(needsReply(make('d')), false, 'sin mensajes no cuenta');
  assert.equal(needsReply(make('e', { requestStatus: 'Pendiente de revisión', archived: true })), false);
});

test('replyQueue ordena de más antigua a más reciente y calcula la antigüedad', () => {
  const queue = replyQueue([
    make('nueva', { requestStatus: 'Pendiente de revisión', createdAt: now - DAY }),
    make('vieja', { lastMessageBy: 'Ana', lastMessageAt: now - 5 * DAY }),
    make('ok'),
  ], now);
  assert.deepEqual(queue.map(item => item.id), ['vieja', 'nueva']);
  assert.deepEqual(queue.map(item => item.ageDays), [5, 1]);
  assert.deepEqual(replyQueue([], now), []);
});

test('periodRange usa días locales y un periodo anterior de la misma longitud', () => {
  const today = periodRange('today', now);
  assert.equal(new Date(today.start).getHours(), 0);
  assert.equal(today.end, now);
  assert.equal(today.previousEnd, today.start);
  const week = periodRange('7d', now);
  assert.equal(Math.round((today.start - week.start) / DAY), 6);
  assert.equal(Math.round((week.start - week.previousStart) / DAY), 7);
  assert.equal(Math.round((periodRange('30d', now).start - periodRange('30d', now).previousStart) / DAY), 30);
});

test('newRequests compara con el periodo anterior', () => {
  const projects = [make('a', { createdAt: now - DAY }), make('b', { createdAt: now - 2 * DAY }), make('c', { createdAt: now - 10 * DAY }), make('d', { createdAt: now - 20 * DAY })];
  assert.deepEqual(newRequests(projects, '7d', now), { current: 2, previous: 1 });
  assert.deepEqual(newRequests([], '30d', now), { current: 0, previous: 0 });
});

test('funnel cuenta consultas activas del periodo por fase y separa «por confirmar» y «no seguimos»', () => {
  const projects = [
    make('a', { progressPhase: 'Recibida' }), make('b', { progressPhase: 'Recibida' }), make('c', { progressPhase: 'En marcha' }),
    make('d', { progressPhase: 'Por confirmar' }), make('e', { progressPhase: 'No seguimos' }),
    make('f', { progressPhase: 'Completado', archived: true }), make('g', { progressPhase: 'Recibida', createdAt: now - 40 * DAY }),
  ];
  const result = funnel(projects, '7d', now);
  assert.deepEqual(result.rows.map(row => row.phase), FUNNEL_PHASES);
  assert.equal(result.rows.find(row => row.phase === 'Recibida').count, 2);
  assert.equal(result.rows.find(row => row.phase === 'En marcha').count, 1);
  assert.deepEqual(result.aside, { confirm: 1, declined: 1 });
  assert.equal(funnel([], 'today', now).rows.every(row => row.count === 0), true);
});

test('funnel deduce la fase cuando el listado no la trae', () => {
  const result = funnel([make('a', { progressPhase: null, requestStatus: 'En evaluación' })], '7d', now);
  assert.equal(result.rows.find(row => row.phase === 'Valoración').count, 1);
});

test('phase2Candidates: fase 1 completada, activa, sin fase 2 posterior ni propuesta', () => {
  const done = make('f1', { stage: 'Completado', progressPhase: 'Completado' });
  const projects = [
    done,
    make('otra-persona', { ownerId: 'luis', username: 'Luis', stage: 'Completado' }),
    make('no-completada', { stage: 'En marcha' }),
    make('archivada', { stage: 'Completado', archived: true }),
    make('fase2-propia', { ownerId: 'luis', username: 'Luis', need: 'Apoyo puntual', createdAt: now }),
    make('de-fase2', { ownerId: 'marta', username: 'Marta', need: 'Acompañamiento', stage: 'Completado' }),
  ];
  assert.deepEqual(phase2Candidates(projects, new Set()).map(item => item.id), ['f1']);
  assert.deepEqual(phase2Candidates(projects, new Set(['f1'])).map(item => item.id), []);
  assert.deepEqual(phase2Candidates([], new Set()), []);
});

test('phase2Proposed detecta el mensaje compartido «Siguiente fase:»', () => {
  assert.equal(phase2Proposed({ updates: [{ text: `${PHASE2_PREFIX} hablamos`, internal: false }] }), true);
  assert.equal(phase2Proposed({ updates: [{ text: `${PHASE2_PREFIX} nota`, internal: true }] }), false);
  assert.equal(phase2Proposed({ updates: [] }), false);
  assert.equal(phase2Proposed({}), false);
});
