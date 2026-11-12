import { esc } from './workspace-ui.js';
import { hostOf } from './dash-share.js';

const shortDate = value => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(value));
const dueDate = value => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
const block = (title, count, body, extra = '') => `<section class="dash-block${extra}" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3>${count === null ? '' : `<span class="dash-count">${count}</span>`}</header>${body}</section>`;

export function stepsOf(project) {
  const all = (project.tasks || []).filter(task => !task.internal);
  const pending = all.filter(task => task.status !== 'Completado').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  return { pending, done: all.filter(task => task.status === 'Completado') };
}

// What the person sees in their space: what to do now, documents and news from Chedex.
export function dashboardHtml(project, { viewer = '' } = {}) {
  const { pending, done } = stepsOf(project);
  const stepItems = pending.map(task => `<li class="dash-step"><span class="dash-box" aria-hidden="true"></span><span><strong>${esc(task.title)}</strong>${task.details ? `<small>${esc(task.details)}</small>` : ''}${task.due ? `<small class="dash-due">Para el ${esc(dueDate(task.due))}</small>` : ''}</span></li>`).join('');
  const steps = block('Lo que toca ahora', pending.length, pending.length
    ? `<ul class="dash-list">${stepItems}</ul>${done.length ? `<p class="dash-note">${done.length} ${done.length === 1 ? 'paso completado' : 'pasos completados'}.</p>` : ''}`
    : `<p class="dash-empty">${done.length ? 'Has completado todos los pasos. Cuando haya uno nuevo lo verás aquí.' : 'Por ahora no tienes nada pendiente. Cuando haya un siguiente paso, lo verás aquí.'}</p>`);

  const docs = [...(project.documents || [])].sort((a, b) => b.createdAt - a.createdAt);
  const docItems = docs.map(doc => `<li class="dash-doc"><a href="${esc(doc.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(doc.title)}</strong><small>${esc(hostOf(doc.url))}${doc.note ? ` · ${esc(doc.note)}` : ''} · ${esc(shortDate(doc.createdAt))}</small></a><span class="dash-open" aria-hidden="true">Abrir ↗</span></li>`).join('');
  const documents = block('Documentos', docs.length, docs.length
    ? `<ul class="dash-list">${docItems}</ul><p class="dash-note">Se abren en una pestaña nueva, en el servicio donde los hemos compartido.</p>`
    : '<p class="dash-empty">Aquí aparecerán los documentos que te compartamos: propuestas, hojas de ruta y materiales.</p>');

  const updates = [...(project.updates || [])].filter(update => !update.internal && (!viewer || String(update.author || '').toLowerCase() !== viewer.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const note = project.progressNote ? `<li class="dash-news dash-news--note"><strong>Último aviso</strong><span>${esc(project.progressNote)}</span></li>` : '';
  const newsItems = updates.map(update => `<li class="dash-news"><strong>${esc(shortDate(update.createdAt))}</strong><span>${esc(update.text)}</span></li>`).join('');
  const news = block('Novedades de Chedex', updates.length + (note ? 1 : 0), note || updates.length
    ? `<ul class="dash-list">${note}${newsItems}</ul>`
    : '<p class="dash-empty">Cuando tengamos novedades sobre tu consulta las verás aquí.</p>', ' dash-block--wide');

  return `<div class="dash-grid">${steps}${documents}${news}</div>`;
}
