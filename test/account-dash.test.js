import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHtml, stepsOf } from '../public/account-dash.js';

const now = new Date(2026, 10, 12, 12, 0).getTime();
const project = {
  progressNote: 'Os escribo mañana con horarios.',
  tasks: [
    { id: 'a', title: 'Revisar la propuesta', details: 'Dime qué cambiarías', due: '2026-12-05', status: 'Por hablar', internal: false },
    { id: 'b', title: 'Enviar horarios', due: '2026-11-20', status: 'Por hablar', internal: false },
    { id: 'c', title: 'Paso hecho', status: 'Completado', internal: false },
    { id: 'd', title: 'NOTA_INTERNA', status: 'Por hablar', internal: true },
  ],
  documents: [{ id: 'd1', title: 'Hoja de ruta', url: 'https://drive.example.com/x', note: 'v1', createdAt: now - 86400000 }, { id: 'd2', title: 'Propuesta', url: 'https://www.example.org/p', createdAt: now }],
  updates: [{ text: 'Ya está la propuesta', createdAt: now, internal: false }, { text: 'SOLO_EQUIPO', createdAt: now, internal: true }],
};

test('stepsOf separa pendientes (por fecha) y hechos, sin pasos internos', () => {
  const { pending, done } = stepsOf(project);
  assert.deepEqual(pending.map(task => task.id), ['b', 'a']);
  assert.deepEqual(done.map(task => task.id), ['c']);
});

test('el panel muestra pasos, documentos con su dominio y novedades, sin contenido interno', () => {
  const html = dashboardHtml(project);
  assert.doesNotMatch(html, /NOTA_INTERNA|SOLO_EQUIPO/);
  assert.ok(html.includes('Revisar la propuesta') && html.includes('Para el'));
  assert.ok(html.includes('1 paso completado'));
  assert.ok(html.includes('drive.example.com') && html.includes('example.org'));
  assert.ok(html.indexOf('Propuesta') < html.indexOf('Hoja de ruta'), 'documentos recientes primero');
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes('Último aviso') && html.includes('Os escribo mañana'));
  assert.ok(html.includes('Ya está la propuesta'));
});

test('estados vacíos claros y escape del contenido', () => {
  const empty = dashboardHtml({});
  for (const text of ['Por ahora no tienes nada pendiente', 'Aquí aparecerán los documentos', 'Cuando tengamos novedades']) assert.ok(empty.includes(text), text);
  assert.ok(dashboardHtml({ tasks: [{ id: 'z', title: 'x', status: 'Completado', internal: false }] }).includes('Has completado todos los pasos'));
  const hostile = dashboardHtml({ tasks: [{ id: 'h', title: '<img onerror=1>', details: '<b>x</b>', status: 'Por hablar', internal: false }], documents: [{ id: 'q', title: '<script>', url: 'https://a.example.com/"onmouseover="x', createdAt: now }], updates: [{ text: '<i>y</i>', createdAt: now, internal: false }], progressNote: '<u>n</u>' });
  assert.doesNotMatch(hostile, /<img onerror|<b>x|<script>|<i>y|<u>n/);
});

test('las novedades de Chedex no incluyen los mensajes que escribió la propia persona', () => {
  const mine = { updates: [{ text: 'MI_MENSAJE', author: 'Luis', createdAt: now, internal: false }, { text: 'Respuesta de Chedex', author: 'AndresLi', createdAt: now, internal: false }] };
  const html = dashboardHtml(mine, { viewer: 'luis' });
  assert.doesNotMatch(html, /MI_MENSAJE/);
  assert.ok(html.includes('Respuesta de Chedex'));
  assert.ok(dashboardHtml(mine).includes('MI_MENSAJE'), 'sin identificar a la persona no se filtra');
});
