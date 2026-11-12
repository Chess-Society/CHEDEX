import { esc } from './workspace-ui.js';
import { icon } from './icons.js';
import { replyQueue, funnel, newRequests, phase2Candidates, PHASE2_PREFIX } from './dash-data.js';
import { progressPhase } from './project-data.js';

export const periods = [['today', 'Hoy'], ['7d', '7 días'], ['30d', '30 días']];
export const phase2Message = `${PHASE2_PREFIX} ya has completado esta consultoría. Cuando quieras, podemos dar el siguiente paso con tu marca personal junto a La Chulapa. Puedes ver los paquetes en https://chedex.app/servicios y contarnos qué te interesa.`;

const when = value => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const age = days => days === 0 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`;
const empty = (title, text) => `<div class="today-empty"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
const card = (title, count, body, extra = '') => `<section class="today-card${extra}" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2>${count === null ? '' : `<span class="today-count">${count}</span>`}</header>${body}</section>`;

function queueCard(projects, now) {
  const queue = replyQueue(projects, now);
  const items = queue.slice(0, 8).map(project => `<li><button type="button" class="today-row" data-project="${esc(project.id)}"><span><strong>${esc(project.title)}</strong><small>${esc(project.username || project.ownerId)} · ${esc(project.requestStatus === 'Pendiente de revisión' ? 'Solicitud sin revisar' : 'Mensaje sin responder')}</small></span><span class="today-age">${age(project.ageDays)}</span></button></li>`).join('');
  const more = queue.length > 8 ? `<button type="button" class="today-more" data-admin-view="projects">Ver las ${queue.length} en Consultas</button>` : '';
  return card('Necesitan tu respuesta', queue.length, queue.length ? `<ul class="today-list">${items}</ul>${more}` : empty('Estás al día.', 'No hay solicitudes por revisar ni mensajes esperando respuesta.'), ' today-card--priority');
}

function callsCard(projects, slots, now) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const byId = new Map(projects.map(project => [project.id, project]));
  const booked = slots.filter(slot => slot.projectId && slot.ends >= start.getTime() && slot.enabled !== 0).sort((a, b) => a.starts - b.starts);
  const bookedIds = new Set(booked.map(slot => slot.projectId));
  // The 15-minute call is arranged by email, so consultas in that phase are listed even without a booked slot.
  const pending = projects.filter(project => !project.archived && !bookedIds.has(project.id) && progressPhase(project) === 'Llamada de 15 min');
  const row = (id, title, detail, aside) => `<li><button type="button" class="today-row" data-project="${esc(id)}"><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span><span class="today-age">${aside}</span></button></li>`;
  const label = project => project ? `${project.username || project.ownerId} · ${project.title}` : 'Consulta';
  const items = [
    ...booked.map(slot => row(slot.projectId, when(slot.starts), label(byId.get(slot.projectId)), icon('external'))),
    ...pending.map(project => row(project.id, project.username || project.ownerId, project.title, 'Por concretar')),
  ].slice(0, 8);
  const total = booked.length + pending.length;
  return card('Llamadas', total, total ? `<ul class="today-list">${items.join('')}</ul>` : empty('Sin llamadas pendientes.', 'Cuando una consulta pase a «Llamada de 15 min» o alguien reserve un horario, aparecerá aquí.'));
}

function funnelCard(projects, period, now) {
  const result = funnel(projects, period, now), requests = newRequests(projects, period, now);
  const max = Math.max(1, ...result.rows.map(row => row.count));
  const delta = requests.current - requests.previous;
  const trend = requests.previous === 0 && requests.current === 0
    ? 'Sin solicitudes en este periodo ni en el anterior.'
    : `${requests.current} solicitudes nuevas · ${delta === 0 ? 'igual' : `${delta > 0 ? '+' : ''}${delta}`} frente al periodo anterior (${requests.previous})`;
  const rows = result.rows.map(row => `<li><span>${esc(row.phase)}</span><span class="today-bar" aria-hidden="true"><i data-width="${Math.round(row.count / max * 100)}"></i></span><strong>${row.count}</strong></li>`).join('');
  const aside = result.aside.confirm || result.aside.declined ? `<p class="today-note">Aparte: ${result.aside.confirm} por confirmar · ${result.aside.declined} sin seguimiento.</p>` : '';
  return card('Embudo de consultas', null, `<p class="today-trend">${esc(trend)}</p><ol class="today-funnel">${rows}</ol>${aside}<p class="today-note">Muestra las consultas activas creadas en el periodo y su fase actual.</p>`, ' today-card--wide');
}

function phase2Card(projects, proposed) {
  const list = phase2Candidates(projects, proposed);
  const items = list.slice(0, 6).map(project => `<li class="today-row today-row--action"><button type="button" class="today-row-main" data-project="${esc(project.id)}"><strong>${esc(project.username || project.ownerId)}</strong><small>${esc(project.need)} · ${esc(project.title)}</small></button><button type="button" class="button secondary" data-propose-phase2="${esc(project.id)}">Proponer fase 2</button></li>`).join('');
  return card('Listos para la fase 2', list.length, list.length
    ? `<ul class="today-list">${items}</ul><p class="today-note">Proponer envía un mensaje compartido en su conversación. No se contrata nada por ello.</p>`
    : empty('Nadie por ahora.', 'Aquí aparecerán las personas que terminen una consultoría y puedan dar el salto a su marca personal con La Chulapa.'));
}

export function todayHtml({ projects, slots, pendingReviews, period, proposed, now }) {
  const pills = periods.map(([id, label]) => `<button type="button" data-period="${id}" aria-pressed="${id === period}">${label}</button>`).join('');
  const reviews = pendingReviews ? `<button type="button" class="today-alert" data-admin-view="reviews"><strong>${pendingReviews}</strong> ${pendingReviews === 1 ? 'opinión espera' : 'opiniones esperan'} tu revisión</button>` : '';
  return `<div class="today-bar-top"><div class="today-periods" role="group" aria-label="Periodo del embudo">${pills}</div>${reviews}</div><div class="today-grid">${queueCard(projects, now)}${callsCard(projects, slots, now)}${funnelCard(projects, period, now)}${phase2Card(projects, proposed)}</div>`;
}

// The page policy forbids inline style attributes, so bar widths are applied through the CSS object model.
export function renderToday(container, state) {
  container.innerHTML = todayHtml({ ...state, now: state.now ?? Date.now() });
  container.querySelectorAll('[data-width]').forEach(bar => { bar.style.width = `${bar.dataset.width}%`; });
}
