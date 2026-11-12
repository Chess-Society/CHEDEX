import test from 'node:test';
import assert from 'node:assert/strict';
import { consultasListHtml } from '../public/dash-projects.js';
import { callsPaneHtml } from '../public/dash-today.js';

const DAY = 86400000, now = new Date(2026, 10, 12, 15, 0).getTime();
const base = { id: 'p', ownerId: 'ana', username: 'Ana', title: 'Mi club', need: 'Consultoría estratégica', stage: 'Por hablar', progressPhase: 'Valoración', requestStatus: 'Aceptada', archived: false, createdAt: now - 4 * DAY, updatedAt: now, lastMessageBy: null, lastMessageAt: null };

test('la lista de consultas muestra persona, modalidad, fase y selección', () => {
  const html = consultasListHtml([base, { ...base, id: 'q', title: 'Otro', need: 'Apoyo puntual' }], 'p', now);
  assert.ok(html.includes('Ana · Consultoría estratégica · Fase 1'));
  assert.ok(html.includes('Ana · Apoyo puntual · Fase 2'));
  assert.ok(html.includes('data-project="p" aria-pressed="true"'));
  assert.ok(html.includes('data-project="q" aria-pressed="false"'));
  assert.ok(html.includes('>Valoración<'));
});

test('marca las consultas sin responder con su antigüedad y las archivadas como tales', () => {
  const html = consultasListHtml([{ ...base, lastMessageBy: 'ana', lastMessageAt: now - 2 * DAY }, { ...base, id: 'old', archived: true }, { ...base, id: 'new', requestStatus: 'Pendiente de revisión', createdAt: now }], null, now);
  assert.ok(html.includes('Sin responder · hace 2 días'));
  assert.ok(html.includes('Sin responder · hoy'));
  assert.ok(html.includes('>Archivada<'));
  assert.equal((html.match(/Sin responder/g) || []).length, 2);
});

test('escapa el contenido editable y muestra un estado vacío', () => {
  const html = consultasListHtml([{ ...base, title: '<img onerror=1>', username: '<b>x</b>', need: undefined }], null, now);
  assert.doesNotMatch(html, /<img onerror|<b>x/);
  assert.ok(html.includes('Sin modalidad'));
  assert.ok(consultasListHtml([], null, now).includes('Todavía no hay consultas'));
});

test('la sección Llamadas anuncia «Próximamente» y lista las llamadas por concretar', () => {
  const html = callsPaneHtml({ projects: [{ ...base, progressPhase: 'Llamada de 15 min' }], slots: [], now });
  assert.ok(html.includes('Próximamente'));
  assert.ok(html.includes('Mi club'));
  assert.ok(callsPaneHtml({ projects: [], slots: [], now }).includes('Próximamente'));
});

import { nextAction, nextActionHtml } from '../public/dash-projects.js';
const full = { ...base, id: 'f', applicant: { firstName: 'Ana', email: 'ana@example.com' }, title: 'Mi club' };

test('nextAction guía cada fase con su botón rápido y sin inventar correos', () => {
  const by = phase => nextAction({ ...full, progressPhase: phase });
  assert.equal(by('Por confirmar').quick.phase, 'Recibida');
  assert.equal(by('Recibida').quick.phase, 'Llamada de 15 min');
  assert.ok(by('Recibida').mail.startsWith('mailto:ana%40example.com?subject='));
  assert.ok(decodeURIComponent(by('Recibida').mail).includes('Hola Ana'));
  assert.equal(by('Llamada de 15 min').mail, '');
  assert.equal(by('Valoración').quick.phase, 'Propuesta acordada');
  assert.equal(by('En marcha').quick.phase, 'Completado');
  assert.equal(by('Completado').phase2, true, 'consultoría completada propone la fase 2');
  assert.equal(nextAction({ ...full, progressPhase: 'Completado', need: 'Apoyo puntual' }).phase2, false);
  assert.equal(by('No seguimos').quick, null);
  assert.equal(nextAction({ ...full, archived: true }).title, 'Consulta archivada');
});

test('sin correo de contacto no hay enlace de correo y el HTML escapa los textos', () => {
  const noMail = { ...full, applicant: { firstName: '<b>Ana</b>' }, progressPhase: 'Recibida', title: '<img onerror=1>' };
  assert.equal(nextAction(noMail).mail, '');
  const html = nextActionHtml(noMail);
  assert.doesNotMatch(html, /<b>Ana|<img onerror/);
  assert.ok(html.includes('data-quick-phase="Llamada de 15 min"'));
  assert.equal(nextActionHtml({ ...full, progressPhase: 'Completado' }).includes('data-propose-phase2="f"'), true);
});

import { clientSummary } from '../public/dash-projects.js';
test('clientSummary resume las consultas de una persona', () => {
  const mk = (id, extra) => ({ ...base, id, ownerId: 'ana', ...extra });
  const info = clientSummary({ id: 'ana' }, [mk('a', { updatedAt: now - 2 * DAY }), mk('b', { updatedAt: now, progressPhase: 'En marcha' }), mk('c', { archived: true, updatedAt: now - 9 * DAY }), { ...base, id: 'x', ownerId: 'luis' }]);
  assert.equal(info.total, 3);
  assert.equal(info.active, 2);
  assert.equal(info.lastPhase, 'En marcha');
  assert.equal(info.lastAt, now);
  const none = clientSummary({ id: 'nadie' }, []);
  assert.deepEqual([none.total, none.active, none.lastAt, none.lastPhase], [0, 0, null, null]);
  assert.equal(clientSummary({ id: 'ana' }, [mk('w', { requestStatus: 'Pendiente de revisión' })]).waiting, 1);
});

import { shareHtml, hostOf } from '../public/dash-share.js';
test('shareHtml lista solo lo compartido, escapa el contenido y ofrece los tres formularios', () => {
  const project = { id: 'p', tasks: [{ id: 't1', title: 'Enviar horarios', due: '2026-12-01', status: 'Por hablar', internal: false }, { id: 't2', title: 'NOTA_SECRETA', status: 'Por hablar', internal: true }, { id: 't3', title: '<b>x</b>', status: 'Completado', internal: false }],
    documents: [{ id: 'd1', title: 'Propuesta', url: 'https://www.example.com/a?x=1', note: 'v1', createdAt: now }],
    updates: [{ text: 'Hola', createdAt: now, internal: false }, { text: 'SOLO_EQUIPO', createdAt: now, internal: true }] };
  const html = shareHtml(project);
  assert.doesNotMatch(html, /NOTA_SECRETA|SOLO_EQUIPO|<b>x/);
  assert.ok(html.includes('data-step-toggle="t1">Marcar hecho'));
  assert.ok(html.includes('data-step-toggle="t3">Reabrir'));
  assert.ok(html.includes('rel="noopener noreferrer"') && html.includes('example.com'));
  assert.ok(html.includes('data-remove-document="d1"'));
  for (const id of ['share-step', 'share-document', 'share-update']) assert.ok(html.includes(`id="${id}"`), id);
  assert.equal(hostOf('https://www.example.com/a'), 'example.com');
  assert.equal(hostOf('no es url'), '');
});
test('shareHtml muestra estados vacíos', () => {
  const html = shareHtml({ id: 'p' });
  for (const text of ['Aún no hay pasos.', 'Aún no hay documentos.', 'Aún no hay novedades.']) assert.ok(html.includes(text), text);
});
