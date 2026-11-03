import { icon } from './icons.js';
import { stages, needs } from './project-data.js';
export { stages, needs };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export const date = value => new Intl.DateTimeFormat('es-ES', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));
export const options = (values, selected) => values.map(value => `<option${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join('');
export async function api(path, options = {}) {
  const response = await fetch(path, { cache:'no-store', ...options, headers:{ 'Content-Type':'application/json', 'X-Chedex-Request':'1', ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'No se ha podido completar la operación.'); error.status = response.status; throw error; }
  return data;
}
export const send = (path, body, method = 'POST') => api(path, { method, body:JSON.stringify(body) });
export async function allPages(path, key) {
  const rows = new Map();
  let offset = 0;
  do {
    const data = await api(`${path}?offset=${offset}`);
    data[key].forEach(row => rows.set(row.id, row));
    if (data.nextOffset !== null && (!Number.isSafeInteger(data.nextOffset) || data.nextOffset <= offset)) throw new Error('No se ha podido completar el listado. Actualiza la página.');
    offset = data.nextOffset;
  } while (offset !== null);
  return [...rows.values()];
}
export const field = (label, name, value = '', max = 100, required = true) => `<label>${label}<input name="${name}" value="${esc(value)}" maxlength="${max}"${required ? ' required' : ''}></label>`;
export const area = (label, name, value = '', max = 2000, required = true) => `<label>${label}<textarea name="${name}" maxlength="${max}"${required ? ' required' : ''}>${esc(value)}</textarea></label>`;
export const select = (label, name, values, selected) => `<label>${label}<select name="${name}">${options(values, selected)}</select></label>`;
export const badge = (value, internal = false) => `<span class="work-badge${internal ? ' internal' : ''}">${esc(value)}</span>`;
export function projectList(projects, selected) {
  if (!projects.length) return '<p class="work-empty">Todavía no hay solicitudes. Aquí aparecerán los proyectos y sus próximos pasos.</p>';
  return projects.map(project => `<button class="project-list-item${selected === project.id ? ' selected' : ''}" data-project="${esc(project.id)}" aria-pressed="${selected === project.id}"><span>${esc(project.title)}</span><small>${esc(project.username || project.need)} · ${esc(project.stage)}${project.archived ? ' · Archivado' : ''}</small></button>`).join('');
}
export function board(project, admin = false) {
  return `<div class="work-board" role="region" tabindex="0" aria-label="Tareas del proyecto">${stages.map(stage => `<section class="work-column" data-stage="${esc(stage)}" aria-label="${esc(stage)}"><h3>${esc(stage)} <span>${project.tasks.filter(task=>task.status === stage).length}</span></h3>${project.tasks.filter(task=>task.status === stage).map(task=>`<article class="work-task" ${admin ? `draggable="true" data-task="${esc(task.id)}"` : ''}>${badge(task.internal ? 'Interna' : 'Compartida', task.internal)}<h4>${esc(task.title)}</h4>${task.details ? `<p>${esc(task.details)}</p>` : ''}${task.assignee ? `<small>Responsable: ${esc(task.assignee)}</small>` : ''}${task.due ? `<small>Fecha orientativa: ${esc(task.due.split('-').reverse().join('/'))}</small>` : ''}${admin ? `<button class="work-text-button" data-edit-task="${esc(task.id)}">Editar tarea</button>` : ''}</article>`).join('') || '<p class="column-empty">Sin tareas</p>'}</section>`).join('')}</div>`;
}
export function updates(project, admin = false) {
  return `<div class="work-feed">${[...project.updates].reverse().map(update=>`<article class="work-update">${admin ? badge(update.internal ? 'Nota interna' : 'Mensaje compartido',update.internal) : ''}<p>${esc(update.text)}</p><small>${esc(update.author)} · ${date(update.createdAt)}</small></article>`).join('') || '<p class="work-empty">Cuando haya novedades, aparecerán aquí.</p>'}</div>`;
}
export function history(project, admin = false) {
  return `<details class="work-history"><summary>Historial de avances (${project.history.length})</summary>${[...project.history].reverse().map(entry=>`<p>${admin && entry.internal ? badge('Interno',true) : ''}${esc(entry.text)}<small>${esc(entry.author)} · ${date(entry.createdAt)}</small></p>`).join('')}</details>`;
}
export function reviewCards(reviews) {
  return reviews.map(review=>`<article class="work-review"><div class="review-stars" aria-label="${review.rating} de 5 estrellas">${icon('star').repeat(review.rating)}${icon('star-outline').repeat(5-review.rating)}</div><p>${esc(review.text)}</p><strong>${esc(review.username)}</strong>${badge('Experiencia verificada')}<small>${date(review.createdAt || review.created_at)}</small></article>`).join('') || '<p class="work-empty">Todavía no hay reseñas publicadas. Las opiniones aparecerán cuando haya experiencias verificadas que compartir.</p>';
}
