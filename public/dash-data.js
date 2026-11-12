import { serviceNeeds } from './services-data.js';
import { progressPhase } from './project-data.js';

// Pure aggregations for the admin «Hoy» view. No DOM, no network; `now` is injected.
export const PHASE2_PREFIX = 'Siguiente fase:';
export const FUNNEL_PHASES = ['Recibida', 'Llamada de 15 min', 'Valoración', 'Propuesta acordada', 'En marcha', 'Completado'];
const DAY = 86400000;
const BRAND_NEEDS = ['Apoyo puntual', 'Representación', 'Acompañamiento'];
const OTHER_NEEDS = ['Orientación inicial', 'Colaboración de marca'];

export function phaseOfNeed(need) {
  if (!serviceNeeds.includes(need) || OTHER_NEEDS.includes(need)) return 'otra';
  return BRAND_NEEDS.includes(need) ? 'marca-personal' : 'consultoria';
}

const createdOf = project => project.createdAt ?? project.updatedAt ?? 0;
const sameName = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const awaitingMessage = project => sameName(project.lastMessageBy, project.username);

export const needsReply = project => !project.archived && (project.requestStatus === 'Pendiente de revisión' || awaitingMessage(project));

export function replyQueue(projects, now) {
  return projects.filter(needsReply)
    .map(project => ({ ...project, ageDays: Math.max(0, Math.floor((now - (awaitingMessage(project) ? project.lastMessageAt : createdOf(project))) / DAY)) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

const dayStart = (time, offsetDays = 0) => { const date = new Date(time); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offsetDays); return date.getTime(); };

export function periodRange(period, now) {
  const days = { today: 1, '7d': 7, '30d': 30 }[period] ?? 1;
  const start = dayStart(now, -(days - 1));
  return { start, end: now, previousStart: dayStart(start, -days), previousEnd: start };
}

const inside = (time, from, to) => time >= from && time <= to;

export function newRequests(projects, period, now) {
  const range = periodRange(period, now);
  return {
    current: projects.filter(project => inside(createdOf(project), range.start, range.end)).length,
    previous: projects.filter(project => createdOf(project) >= range.previousStart && createdOf(project) < range.previousEnd).length,
  };
}

export function funnel(projects, period, now) {
  const range = periodRange(period, now);
  const counts = Object.fromEntries(FUNNEL_PHASES.map(phase => [phase, 0]));
  const aside = { confirm: 0, declined: 0 };
  for (const project of projects) {
    if (project.archived || !inside(createdOf(project), range.start, range.end)) continue;
    const phase = progressPhase(project);
    if (phase === 'Por confirmar') aside.confirm += 1;
    else if (phase === 'No seguimos') aside.declined += 1;
    else if (phase in counts) counts[phase] += 1;
  }
  return { rows: FUNNEL_PHASES.map(phase => ({ phase, count: counts[phase] })), aside };
}

export function phase2Candidates(projects, proposed = new Set()) {
  return projects.filter(project => phaseOfNeed(project.need) === 'consultoria' && !project.archived && project.stage === 'Completado' && !proposed.has(project.id)
    && !projects.some(other => other.ownerId === project.ownerId && !other.archived && phaseOfNeed(other.need) === 'marca-personal' && createdOf(other) >= createdOf(project)));
}

export const phase2Proposed = project => (project?.updates || []).some(update => !update.internal && typeof update.text === 'string' && update.text.startsWith(PHASE2_PREFIX));
