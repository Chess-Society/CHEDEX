import { esc } from './workspace-ui.js';
import { progressPhase } from './project-data.js';
import { needsReply, replyQueue, phaseOfNeed } from './dash-data.js';

const phaseTag = { consultoria: 'Fase 1', 'marca-personal': 'Fase 2' };

// Rich list of consultas for the admin: who, what, where it stands and whether it waits for an answer.
export function consultasListHtml(projects, selectedId, now = Date.now()) {
  if (!projects.length) return '<p class="work-empty">Todavía no hay consultas. Aquí aparecerán las solicitudes y su recorrido.</p>';
  const waiting = new Map(replyQueue(projects, now).map(project => [project.id, project.ageDays]));
  return projects.map(project => {
    const selected = selectedId === project.id;
    const phase = project.archived ? 'Archivada' : progressPhase(project);
    const tag = phaseTag[phaseOfNeed(project.need)];
    const age = waiting.get(project.id);
    const alert = needsReply(project) ? `<span class="work-badge consulta-alert">Sin responder · ${age === 0 ? 'hoy' : age === 1 ? 'hace 1 día' : `hace ${age} días`}</span>` : '';
    return `<button type="button" class="project-list-item consulta-item${selected ? ' selected' : ''}" data-project="${esc(project.id)}" aria-pressed="${selected}"><span>${esc(project.title)}</span><small>${esc(project.username || project.ownerId || '')} · ${esc(project.need || 'Sin modalidad')}${tag ? ` · ${tag}` : ''}</small><span class="consulta-meta"><span class="work-badge">${esc(phase)}</span>${alert}</span></button>`;
  }).join('');
}
