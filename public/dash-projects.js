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

// ---- Ficha de consulta: qué toca hacer ahora con esta consulta.
const contactMail = (project, subject, body) => project.applicant?.email
  ? `mailto:${encodeURIComponent(project.applicant.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  : '';
const greeting = project => `Hola${project.applicant?.firstName ? ` ${project.applicant.firstName}` : ''},\n\n`;

export function nextAction(project) {
  if (project.archived) return { title: 'Consulta archivada', text: 'Se conserva su historial. Puedes restaurarla desde la gestión de la consulta.', quick: null, mail: '' };
  const title = project.title || 'tu consulta';
  const phase = progressPhase(project);
  const plan = {
    'Por confirmar': { title: 'Confirma la recepción', text: 'La persona indica haber enviado su consulta por correo. Comprueba el buzón y confirma la recepción.', quick: { phase: 'Recibida', label: 'Confirmar recepción' } },
    'Recibida': { title: 'Propón horario para la llamada', text: 'Escribe a la persona con dos o tres horarios para la llamada de 15 minutos.', quick: { phase: 'Llamada de 15 min', label: 'Pasar a «Llamada de 15 min»' }, mail: [`Llamada de 15 minutos · ${title}`, `${greeting(project)}Gracias por escribir a Chedex. Nos gustaría conocerte en una llamada de 15 minutos. ¿Cuál de estos horarios te va mejor?\n\n- \n- \n- \n\nUn saludo.`] },
    'Llamada de 15 min': { title: 'Haz la llamada y valora', text: 'Tras la llamada, valora si puedes ayudar y con qué alcance.', quick: { phase: 'Valoración', label: 'Pasar a «Valoración»' } },
    'Valoración': { title: 'Decide y acuerda el alcance', text: 'Si encaja, envía tu propuesta por correo con alcance, plazos y condiciones.', quick: { phase: 'Propuesta acordada', label: 'Marcar propuesta acordada' }, mail: [`Propuesta · ${title}`, `${greeting(project)}Gracias por la conversación. Te comparto lo que podemos hacer juntos:\n\n- Alcance: \n- Plazos: \n- Condiciones: \n\nUn saludo.`] },
    'Propuesta acordada': { title: 'Empieza el trabajo', text: 'Cuando arranquéis, actualiza la fase para que la persona lo vea.', quick: { phase: 'En marcha', label: 'Pasar a «En marcha»' } },
    'En marcha': { title: 'Mantén el seguimiento', text: 'Actualiza la aclaración visible cuando haya novedades. Al terminar, marca la consulta como completada.', quick: { phase: 'Completado', label: 'Marcar como completada' } },
    'Completado': phaseOfNeed(project.need) === 'consultoria'
      ? { title: 'Propón la fase 2', text: 'Es una consultoría completada: puedes proponer ahora la marca personal con La Chulapa.', quick: null, phase2: true }
      : { title: 'Recorrido completado', text: 'No hay más pasos pendientes en esta consulta.', quick: null },
    'No seguimos': { title: 'Consulta cerrada', text: project.decisionReason || 'La propuesta no continúa. Cualquier aclaración se trata por correo.', quick: null },
  }[phase];
  const [subject, body] = plan.mail || [];
  return { title: plan.title, text: plan.text, quick: plan.quick, mail: subject ? contactMail(project, subject, body) : '', phase2: Boolean(plan.phase2) };
}

export function nextActionHtml(project, { proposed = false } = {}) {
  const action = nextAction(project);
  const buttons = [
    action.quick ? `<button type="button" class="button" data-quick-phase="${esc(action.quick.phase)}">${esc(action.quick.label)}</button>` : '',
    action.mail ? `<a class="button secondary" href="${esc(action.mail)}">Escribir a ${esc(project.applicant?.firstName || 'la persona')}</a>` : '',
    action.phase2 && !proposed ? `<button type="button" class="button secondary" data-propose-phase2="${esc(project.id)}">Proponer fase 2</button>` : '',
    action.phase2 && proposed ? '<span class="today-note">Propuesta de la fase 2 enviada.</span>' : '',
  ].join('');
  return `<section class="next-action" aria-label="Siguiente paso"><p class="eyebrow">Siguiente paso</p><h3>${esc(action.title)}</h3><p>${esc(action.text)}</p>${buttons ? `<div class="next-action-buttons">${buttons}</div>` : ''}</section>`;
}

// What the owner needs to know about a client at a glance, from the consultas already loaded.
export function clientSummary(user, projects) {
  const mine = projects.filter(project => project.ownerId === user.id).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const active = mine.filter(project => !project.archived);
  const latest = active[0] || mine[0] || null;
  return {
    total: mine.length,
    active: active.length,
    waiting: active.filter(needsReply).length,
    lastAt: latest ? latest.updatedAt : null,
    lastPhase: latest ? (latest.archived ? 'Archivada' : progressPhase(latest)) : null,
    lastTitle: latest ? latest.title : null,
  };
}
