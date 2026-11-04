import { createTeamApi, teamRole } from './team-api.js';
import { randomUUID } from 'node:crypto';
import { stages, needs, progressPhases, progressPhase } from '../public/project-data.js';
import { admission, requestStates, appointmentFor, createAppointmentApi } from './appointments.js';

class Problem extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, text) => { throw new Problem(status, text); };
const text = (value, max, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, 'Revisa los campos y su longitud.');
  return value.trim();
};
const choice = (value, options) => options.includes(value) ? value : fail(400, 'Opción no válida.');
const bool = value => typeof value === 'boolean' ? value : fail(400, 'Opción no válida.');
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(value) ? value : fail(400, 'Identificador no válido.');
const parse = row => { const content = JSON.parse(row.content); return { id: row.id, ownerId: row.owner_id, username: row.username, revision: row.revision, updatedAt: row.updated_at, ...content, requestStatus: admission(content) }; };
export function clientProject(project) {
  const privateTasks = new Set(project.tasks.filter(task => task.internal).map(task => task.id));
  return { id: project.id, revision: project.revision, title: project.title, summary: project.summary, need: project.need,
    progressPhase: progressPhase(project), progressNote: project.progressNote || '', intakeMode: project.intakeMode || '', stage: project.stage, requestStatus: admission(project), applicant: project.applicant || null, decisionReason: project.decisionReason || '', archived: project.archived, reviewEligible: project.reviewEligible, createdAt: project.createdAt, updatedAt: project.updatedAt,
    tasks: project.tasks.filter(task => !task.internal), updates: project.updates.filter(update => !update.internal),
    // Old task events have no reliable task identity. Keep them for the team,
    // but do not re-publish potentially withdrawn titles to the owner.
    history: project.history.filter(entry => !entry.internal && !privateTasks.has(entry.taskId) && (entry.taskId || !entry.text.startsWith('Tarea: '))) };
}

export function createWorkspaceApi({ authenticate, readBody, writeAllowed, json, clock }) {
  const limit = async (db, user) => {
    const now = clock(), key = `workspace:${user}:${Math.floor(now / 600000)}`;
    const row = (await db('INSERT INTO chedex_v2_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count', [key, now + 600000]))[0];
    if (row.count > 80) fail(429, 'Has realizado muchos cambios. Espera unos minutos.');
  };
  const save = async (db, project, revision) => {
    if (!Number.isSafeInteger(revision) || revision < 1) fail(400, 'Revisión no válida.');
    const { id: projectId, ownerId, username, updatedAt, revision: oldRevision, ...content } = project;
    const saved = (await db("UPDATE chedex_v2_projects SET content=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND (?=1 OR NOT EXISTS (SELECT 1 FROM chedex_v2_appointments a JOIN chedex_v2_slots s ON s.id=a.slot_id WHERE a.project_id=? AND a.status='booked' AND s.ends>?)) RETURNING revision,updated_at", [JSON.stringify(content), clock(), projectId, revision, Number(!project.archived && admission(project)==='Aceptada'), projectId, clock()]))[0];
    if (!saved) fail(409, 'El proyecto ha cambiado o tiene una cita reservada. Recarga y, si vas a archivarlo o cambiar la decisión, cancela primero la cita.');
    return { ...project, revision: saved.revision, updatedAt: saved.updated_at };
  };
  const load = async (db, projectId, user, admin) => {
    const row = (await db(`SELECT p.*,u.username FROM chedex_v2_projects p LEFT JOIN chedex_v2_users u ON u.lichess_id=p.owner_id WHERE p.id=?${admin ? '' : ' AND p.owner_id=?'}`, admin ? [projectId] : [projectId, user]))[0];
    if (!row) fail(404, 'Proyecto no encontrado.');
    return parse(row);
  };
  const create = async (db, body, owner, actor) => {
    if (!(await db('SELECT lichess_id FROM chedex_v2_users WHERE lichess_id=?', [owner]))[0]) fail(400, 'El usuario debe entrar primero con Lichess.');
    const applicant = { firstName: text(body.firstName, 80), lastName: text(body.lastName || '', 120, false) };
    const intake = body.intakeMode === 'email-template';
    const email = intake ? text(body.email,150) : '';
    if (intake && (!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email) || body.emailSent !== true)) fail(400, 'Indica un correo válido y confirma que has enviado el mensaje.');
    if (intake) { applicant.email=email; applicant.availability=text(body.availability,500); }
    const project = { ...(intake ? {intakeMode:'email-template',progressPhase:'Por confirmar',progressNote:''} : {}), title: text(body.title, 100), summary: text(body.summary, 2000), need: choice(body.need, needs), applicant, requestStatus: requestStates[0], decisionReason: '', stage: 'Por hablar', archived: false, reviewEligible: false,
      createdAt: clock(), tasks: [], updates: [], history: [{ id: randomUUID(), text: intake ? 'La persona indica haber enviado su consulta por correo. Recepción pendiente de confirmar.' : 'Solicitud enviada. Pendiente de revisión por el equipo.', ...(intake?{phase:'Por confirmar'}:{}), author: actor, createdAt: clock(), internal: false }] };
    const projectId = randomUUID();
    const inserted = await db('INSERT INTO chedex_v2_projects (id,owner_id,revision,content,updated_at) SELECT ?,?,1,?,? WHERE (SELECT COUNT(*) FROM chedex_v2_projects WHERE owner_id=?)<100 RETURNING id', [projectId, owner, JSON.stringify(project), clock(), owner]);
    if (!inserted.length) fail(400, 'Este usuario ha alcanzado el límite de proyectos. Contacta con el equipo.');
    return load(db, projectId, owner, true);
  };
  const appointments = createAppointmentApi({ readBody, json, clock, load });
  return async request => {
    const url = new URL(request.url), path = url.pathname;
    const page = async (db, sql, args, key, map = row => row) => {
      const rawOffset = url.searchParams.get('offset') || '0';
      if (!/^\d{1,9}$/.test(rawOffset)) fail(400, 'Página no válida.');
      const offset = Number(rawOffset), size = 100;
      const rows = await db(`${sql} LIMIT ? OFFSET ?`, [...args, size + 1, offset]);
      return json({ [key]: rows.slice(0, size).map(map), nextOffset: rows.length > size ? offset + size : null });
    };
    if (path === '/api/reviews' && request.method === 'GET') {
      const { db } = await authenticate(request, { optional: true });
      return json({ reviews: await db('SELECT r.id,r.rating,r.text,r.created_at AS createdAt,u.username FROM chedex_v2_reviews r JOIN chedex_v2_users u ON u.lichess_id=r.owner_id WHERE r.status=? ORDER BY r.created_at DESC LIMIT 100', ['approved']) });
    }
    const relevant = path.startsWith('/api/team') || path.startsWith('/api/admin/team') || path === '/api/account' || path === '/api/account/profile' || path === '/api/logout' || /^\/api\/(admin\/)?projects(?:\/[^/]+(?:\/(?:comments|review|slots|appointment))?)?$/.test(path) || /^\/api\/admin\/slots(?:\/[^/]+)?$/.test(path) || path === '/api/admin/users' || /^\/api\/admin\/reviews(?:\/[^/]+)?$/.test(path);
    if (!relevant) return null;
    const isAdminRoute = path.startsWith('/api/admin/');
    const { db, session, token } = await authenticate(request);
    const isAdmin = session.lichess_id === 'andresli';
    if (isAdminRoute && !isAdmin) fail(403, 'Solo AndresLi puede administrar Chedex.');
    const user = session.lichess_id;
    if (!['GET', 'HEAD'].includes(request.method)) { writeAllowed(request); await limit(db, user); }
    const teamResponse = await createTeamApi({ readBody, json, clock, load, save, fail, text, choice, id, page })({ request, db, session });
    if (teamResponse) return teamResponse;
    const appointmentResponse = await appointments({ request, db, user, admin: isAdminRoute });
    if (appointmentResponse) return appointmentResponse;
    if (path === '/api/account' && request.method === 'GET') {
      const row = (await db('SELECT profile FROM chedex_v2_users WHERE lichess_id=?', [user]))[0];
      return json({ id: user, username: session.username, isAdmin, teamRole: await teamRole(db,user), profile: row ? JSON.parse(row.profile) : {} });
    }
    if (path === '/api/account/profile' && request.method === 'PUT') {
      const body = await readBody(request);
      if (!Number.isSafeInteger(body.revision) || body.revision < 0) fail(400, 'Revisión de perfil no válida. Recarga la página.');
      const profile = { revision: body.revision + 1, firstName: text(body.firstName || '', 80, false), lastName: text(body.lastName || '', 120, false), bio: text(body.bio, 1000, false), goals: text(body.goals, 1000, false), email: text(body.email || '', 150, false), links: [] };
      if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) fail(400, 'Revisa el correo.');
      if (!Array.isArray(body.links) || body.links.length > 5) fail(400, 'Puedes guardar hasta cinco enlaces.');
      profile.links = body.links.map(link => {
        const value = text(link, 300);
        let url; try { url = new URL(value); } catch { fail(400, 'Revisa los enlaces. Deben empezar por https://.'); }
        if (url.protocol !== 'https:' || url.username || url.password) fail(400, 'Usa enlaces públicos con https://.');
        return url.href;
      });
      const saved = await db("UPDATE chedex_v2_users SET profile=? WHERE lichess_id=? AND COALESCE(json_extract(profile,'$.revision'),0)=? RETURNING lichess_id", [JSON.stringify(profile), user, body.revision]);
      if (!saved.length) fail(409, 'El perfil ha cambiado en otra ventana. Recarga la página antes de guardar.');
      return json({ profile });
    }
    if (path === '/api/admin/users' && request.method === 'GET') return page(db, "SELECT u.lichess_id AS id,u.username,u.profile,u.created_at AS createdAt,CASE WHEN u.lichess_id='andresli' THEN 'owner' WHEN t.role='collaborator' AND t.specialty='designer' THEN 'designer' ELSE COALESCE(t.role,'user') END AS role,COALESCE(t.revision,0) AS roleRevision,(SELECT COUNT(*) FROM chedex_v2_projects p WHERE p.owner_id=u.lichess_id) AS projectCount,(SELECT COUNT(*) FROM chedex_v2_projects p WHERE COALESCE(json_extract(p.content,'$.archived'),0)=0 AND EXISTS (SELECT 1 FROM json_each(p.content,'$.teamMembers') WHERE value=u.lichess_id)) AS assignedCount FROM chedex_v2_users u LEFT JOIN chedex_v2_team t ON t.lichess_id=u.lichess_id ORDER BY u.username,u.lichess_id", [], 'users', row => ({ ...row, profile: JSON.parse(row.profile) }));
    if (path === '/api/projects' || path === '/api/admin/projects') {
      if (request.method === 'GET') {
        return page(db, `SELECT p.id,p.owner_id AS ownerId,u.username,p.updated_at AS updatedAt,json_extract(p.content,'$.title') AS title,json_extract(p.content,'$.need') AS need,json_extract(p.content,'$.stage') AS stage,json_extract(p.content,'$.progressPhase') AS progressPhase,json_extract(p.content,'$.intakeMode') AS intakeMode,json_extract(p.content,'$.requestStatus') AS requestStatus,json_extract(p.content,'$.archived') AS archived FROM chedex_v2_projects p LEFT JOIN chedex_v2_users u ON u.lichess_id=p.owner_id${isAdminRoute ? '' : ' WHERE p.owner_id=?'} ORDER BY p.updated_at DESC,p.id`, isAdminRoute ? [] : [user], 'projects', ({ ownerId, username, archived, ...project }) => ({ ...project, requestStatus: admission(project), archived: Boolean(archived), ...(isAdminRoute ? { ownerId, username } : {}) }));
      }
      if (request.method === 'POST') {
        const body = await readBody(request);
        const project = await create(db, body, isAdminRoute ? id(body.ownerId).toLowerCase() : user, session.username);
        return json({ project: isAdminRoute ? project : clientProject(project) }, 201);
      }
    }
    const match = path.match(/^\/api\/(admin\/)?projects\/([^/]+)(?:\/(comments|review))?$/);
    if (match) {
      const project = await load(db, id(match[2]), user, isAdminRoute);
      if (request.method === 'DELETE' && !match[3]) {
        const body = await readBody(request);
        if (!project.archived) fail(400, 'Archiva el proyecto antes de eliminarlo.');
        if (text(body.confirmTitle,100) !== project.title) fail(400, 'Escribe el nombre exacto del proyecto para confirmar.');
        if (!Number.isSafeInteger(body.revision) || body.revision < 1) fail(400, 'Revisión no válida.');
        const removed=await db("DELETE FROM chedex_v2_projects WHERE id=? AND revision=? AND json_extract(content,'$.archived')=1 AND json_extract(content,'$.title')=? AND NOT EXISTS (SELECT 1 FROM chedex_v2_appointments a JOIN chedex_v2_slots s ON s.id=a.slot_id WHERE a.project_id=chedex_v2_projects.id AND a.status='booked' AND s.ends>?) RETURNING id",[project.id,body.revision,body.confirmTitle.trim(),clock()]);
        if (!removed.length) fail(409, 'El proyecto ha cambiado o tiene una cita activa. Recarga antes de continuar.');
        return json({ ok: true, deletedId: project.id });
      }
      if (request.method === 'GET' && !match[3]) {
        const review = (await db('SELECT rating,text,status FROM chedex_v2_reviews WHERE project_id=? AND owner_id=?', [project.id, project.ownerId]))[0] || null;
        return json({ project: isAdminRoute ? { ...project, requestStatus: admission(project) } : clientProject(project), appointment: await appointmentFor(db, project.id), review });
      }
      if (request.method === 'POST' && match[3] === 'comments' && !isAdminRoute) {
        if (project.intakeMode==='email-template') fail(400,'Las comunicaciones de esta consulta se gestionan por correo.');
        if (project.archived) fail(400, 'El proyecto está archivado. Contacta con el equipo para reabrirlo.');
        const body = await readBody(request);
        if (project.updates.length >= 300) fail(400, 'Se ha alcanzado el límite de mensajes de este proyecto. Contacta con el equipo.');
        project.updates.push({ id: randomUUID(), text: text(body.text, 2000), author: session.username, createdAt: clock(), internal: false });
        return json({ project: clientProject(await save(db, project, body.revision)) });
      }
      if (request.method === 'PUT' && match[3] === 'review' && !isAdminRoute) {
        if (!project.reviewEligible || project.stage !== 'Completado') fail(403, 'El equipo debe confirmar la experiencia antes de que puedas valorarla.');
        const body = await readBody(request);
        if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || body.consent !== true) fail(400, 'Elige una valoración y confirma que quieres publicarla con tu nombre de Lichess.');
        const content = text(body.text, 1500);
        await db('INSERT INTO chedex_v2_reviews (id,project_id,owner_id,rating,text,status,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET rating=excluded.rating,text=excluded.text,status=excluded.status,created_at=excluded.created_at', [randomUUID(), project.id, user, body.rating, content, 'pending', clock()]);
        return json({ review: { rating: body.rating, text: content, status: 'pending' } });
      }
      let projectBody;
      if (request.method === 'PUT' && !match[3]) {
        const body = await readBody(request);
        if (body.action !== 'archive') {
          if (!isAdminRoute) fail(403, 'Solo puedes archivar o restaurar tus proyectos.');
        } else {
          project.archived = bool(body.archived);
          if (project.history.length >= 1000) fail(400, 'Se ha alcanzado el límite de actividad del proyecto.');
          project.history.push({ id: randomUUID(), text: project.archived ? 'Proyecto archivado. Se conserva el historial y puede restaurarse.' : 'Proyecto restaurado.', author: session.username, createdAt: clock(), internal: false });
          const saved = await save(db, project, body.revision);
          return json({ project: isAdminRoute ? saved : clientProject(saved) });
        }
        // The remaining administrator actions share the original parsed body.
        projectBody = body;
      }
      if (request.method === 'PUT' && isAdminRoute && !match[3]) {
        const body = projectBody || await readBody(request); let eventText, internal = true, taskEventId;
        if (body.action === 'progress') {
          const phase=choice(body.progressPhase,progressPhases);
          const previous=progressPhase(project);
          const oldIndex=progressPhases.indexOf(previous), nextIndex=progressPhases.indexOf(phase);
          if (previous === 'No seguimos' && !['No seguimos','Por confirmar','Recibida'].includes(phase)) fail(400,'Para retomar la propuesta, confirma primero la recepción y vuelve a pasar por la llamada inicial.');
          if (previous !== 'No seguimos' && nextIndex>oldIndex+1 && nextIndex<progressPhases.indexOf('No seguimos')) fail(400,'Avanza una fase cada vez, empezando por confirmar la recepción y la llamada de 15 minutos.');
          project.progressPhase=phase;
          project.progressNote=text(body.note||'',1000,false);
          project.requestStatus=phase==='No seguimos'?'Denegada':['Por confirmar','Recibida'].includes(phase)?'Pendiente de revisión':['Llamada de 15 min','Valoración'].includes(phase)?'En evaluación':'Aceptada';
          project.stage=({'Propuesta acordada':'Acordado','En marcha':'En marcha','Completado':'Completado'})[phase]||'Por hablar';
          project.decisionReason=phase==='No seguimos'?project.progressNote:'';
          eventText=`Fase: ${phase}.`;internal=false;
        } else if (body.action === 'decision') {
          const state = choice(body.requestStatus, requestStates);
          const active = (await db("SELECT 1 FROM chedex_v2_appointments a JOIN chedex_v2_slots s ON s.id=a.slot_id WHERE a.project_id=? AND a.status='booked' AND s.ends>?", [project.id, clock()])).length;
          if (active && state !== 'Aceptada') fail(409, 'Cancela primero la cita antes de cambiar la decisión.');
          project.requestStatus = state;
          project.decisionReason = state === 'Denegada' ? text(body.reason || '', 2000, false) : '';
          eventText = `Solicitud: ${state}.${project.decisionReason ? ` Motivo: ${project.decisionReason}` : ''}`; internal = false;
        } else if (body.action === 'details') {
          const stage = choice(body.stage, stages);
          project.title = text(body.title, 100); project.summary = text(body.summary, 2000); project.need = choice(body.need, needs);
          project.stage = stage; project.archived = bool(body.archived);
          project.reviewEligible = bool(body.reviewEligible) && stage === 'Completado';
          eventText = `El equipo ha actualizado el proyecto. Estado: ${stage}.`; internal = false;
        } else if (body.action === 'task') {
          const task = body.task;
          if (!task || typeof task !== 'object') fail(400, 'Tarea no válida.');
          const taskId = task.id ? id(task.id) : randomUUID();
          let due = text(task.due, 10, false);
          if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due)) || new Date(due).toISOString().slice(0,10) !== due)) fail(400, 'Fecha no válida.');
          const value = { id: taskId, title: text(task.title, 150), details: text(task.details, 2000, false), assignee: text(task.assignee, 100, false), due, status: choice(task.status, stages), internal: bool(task.internal) };
          const index = project.tasks.findIndex(item => item.id === taskId);
          if (task.id && index < 0) fail(404, 'Tarea no encontrada.');
          if (index < 0 && project.tasks.length >= 100) fail(400, 'Máximo de 100 tareas por proyecto.');
          if (index >= 0) {
            const previous = project.tasks[index];
            // Link pre-audit events conservatively by their former title. Duplicate
            // titles may hide additional old events, but never expose private data.
            for (const entry of project.history) {
              if (!entry.taskId && entry.text.startsWith(`Tarea: ${previous.title}. Estado: `)) entry.taskId = taskId;
              if (entry.taskId === taskId && value.internal) entry.internal = true;
            }
          }
          if (index < 0) project.tasks.push(value); else project.tasks[index] = value;
          taskEventId = taskId;
          eventText = `Tarea: ${value.title}. Estado: ${value.status}.`; internal = value.internal;
        } else if (body.action === 'update') {
          if (project.updates.length >= 300) fail(400, 'Máximo de 300 mensajes por proyecto.');
          internal = bool(body.internal);
          project.updates.push({ id: randomUUID(), text: text(body.text, 2000), author: session.username, createdAt: clock(), internal });
          eventText = internal ? 'Nota interna añadida.' : 'El equipo ha compartido una actualización.';
        } else fail(400, 'Acción no válida.');
        if (project.history.length >= 1000) fail(400, 'Se ha alcanzado el límite de actividad del proyecto. Crea una nueva etapa de seguimiento.');
        project.history.push({ id: randomUUID(), text: eventText, author: session.username, createdAt: clock(), internal, ...(taskEventId ? { taskId: taskEventId } : {}), ...(body.action==='progress'?{phase:project.progressPhase,note:project.progressNote}:{}) });
        return json({ project: await save(db, project, body.revision) });
      }
    }
    if (path === '/api/admin/reviews' && request.method === 'GET') return page(db, 'SELECT r.*,u.username FROM chedex_v2_reviews r JOIN chedex_v2_users u ON u.lichess_id=r.owner_id ORDER BY r.created_at DESC,r.id', [], 'reviews');
    const reviewMatch = path.match(/^\/api\/admin\/reviews\/([^/]+)$/);
    if (reviewMatch && request.method === 'PUT') {
      const body = await readBody(request);
      const status = choice(body.status, ['approved', 'hidden']);
      const revision = text(body.expectedText, 1500);
      if (!Number.isInteger(body.expectedRating) || body.expectedRating < 1 || body.expectedRating > 5 || !Number.isSafeInteger(body.expectedCreatedAt)) fail(400, 'Reseña no válida.');
      const row = (await db('UPDATE chedex_v2_reviews SET status=? WHERE id=? AND text=? AND rating=? AND created_at=? RETURNING id', [status, id(reviewMatch[1]), revision, body.expectedRating, body.expectedCreatedAt]))[0];
      if (!row) fail(409, 'La reseña ha cambiado. Recarga las opiniones.');
      return json({ ok: true });
    }
    return json({ error: 'Ruta no encontrada.' }, 404);
  };
}
