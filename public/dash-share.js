import { esc, field, area } from './workspace-ui.js';

const day = value => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(value));
const dueDay = value => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
export const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

const steps = project => (project.tasks || []).filter(task => !task.internal);
const news = project => (project.updates || []).filter(update => !update.internal).slice(-5).reverse();

// «Compartir con la persona»: everything here is visible to the owner of the consulta, nothing internal.
export function shareHtml(project) {
  const pending = steps(project);
  const stepRows = pending.map(task => {
    const done = task.status === 'Completado';
    return `<li class="share-item${done ? ' is-done' : ''}"><span><strong>${esc(task.title)}</strong>${task.due ? `<small>Para el ${esc(dueDay(task.due))}</small>` : ''}</span><button type="button" class="work-text-button" data-step-toggle="${esc(task.id)}">${done ? 'Reabrir' : 'Marcar hecho'}</button></li>`;
  }).join('');
  const docs = project.documents || [];
  const docRows = docs.map(doc => `<li class="share-item"><span><a href="${esc(doc.url)}" target="_blank" rel="noopener noreferrer">${esc(doc.title)}</a><small>${esc(hostOf(doc.url))}${doc.note ? ` · ${esc(doc.note)}` : ''}</small></span><button type="button" class="work-text-button" data-remove-document="${esc(doc.id)}">Retirar</button></li>`).join('');
  const newsRows = news(project).map(update => `<li class="share-item"><span><strong>${esc(day(update.createdAt))}</strong><small>${esc(update.text)}</small></span></li>`).join('');
  return `<section class="share-panel" aria-labelledby="share-title"><p class="eyebrow">Compartir con la persona</p><h3 id="share-title">Lo que ve en su espacio</h3><p class="work-help">Todo lo que añadas aquí lo ve la persona en su panel. Los documentos son enlaces; no se guardan archivos en Chedex.</p><div class="share-grid">
<div class="share-block"><h4>Pasos</h4><ul class="share-list">${stepRows || '<li class="share-empty">Aún no hay pasos.</li>'}</ul><form id="share-step">${field('Siguiente paso para la persona', 'title', '', 150)}<label>Fecha orientativa (opcional)<input type="date" name="due"></label><button class="button secondary">Añadir paso</button></form></div>
<div class="share-block"><h4>Documentos</h4><ul class="share-list">${docRows || '<li class="share-empty">Aún no hay documentos.</li>'}</ul><form id="share-document">${field('Título del documento', 'title', '', 120)}${field('Enlace (https://…)', 'url', '', 500)}${field('Nota (opcional)', 'note', '', 300, false)}<button class="button secondary">Compartir documento</button></form></div>
<div class="share-block"><h4>Novedades</h4><ul class="share-list">${newsRows || '<li class="share-empty">Aún no hay novedades.</li>'}</ul><form id="share-update">${area('Novedad para la persona', 'text', '', 2000)}<button class="button secondary">Publicar novedad</button></form></div>
</div></section>`;
}
