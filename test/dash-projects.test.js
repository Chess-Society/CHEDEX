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
