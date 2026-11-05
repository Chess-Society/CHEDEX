import { randomUUID } from 'node:crypto';

import { productionStages } from '../public/team-data.js';
export async function teamRole(db, user) {
  if (user === 'andresli') return 'owner';
  const member=(await db('SELECT role,specialty FROM chedex_v2_team WHERE lichess_id=?', [user]))[0];
  return member?.role==='collaborator'&&member.specialty==='designer'?'designer':member?.role||'';
}
// Only this explicitly prepared production space is shared with collaborators.
export function productionProject(project, owner = false) {
  return { id: project.id, title: project.title, revision: project.revision, archived: project.archived,
    ...(owner ? { teamMembers: project.teamMembers || [] } : {}),
    production: project.production || { brief: '', format: 'Por concretar', duration: '', platform: '', due: '', materials: [], tasks: [], deliveries: [], comments: [] } };
}

export function createTeamApi({ readBody, json, clock, load, save, fail, text, choice, id, page }) {
  const date = value => {
    value = text(value || '', 10, false);
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) fail(400, 'Revisa la fecha.');
    return value;
  };
  const link = value => {
    let url; try { url = new URL(text(value, 1000)); } catch { fail(400, 'Revisa el enlace.'); }
    if (url.protocol !== 'https:' || url.username || url.password) fail(400, 'Usa enlaces https:// sin credenciales.');
    return url.href;
  };
  return async ({ request, db, session }) => {
    const path = new URL(request.url).pathname, user = session.lichess_id;
    if (!path.startsWith('/api/team') && !path.startsWith('/api/admin/team')) return null;
    const role = await teamRole(db, user), owner = role === 'owner';
    if (!role || (path.startsWith('/api/admin/') && !owner)) fail(403, 'No tienes acceso al equipo.');
    if (path === '/api/admin/team' && request.method === 'GET') {
      return json({ members: await db("SELECT t.lichess_id AS id,CASE WHEN t.role='collaborator' AND t.specialty='designer' THEN 'designer' ELSE t.role END AS role,t.revision,u.username FROM chedex_v2_team t LEFT JOIN chedex_v2_users u ON u.lichess_id=t.lichess_id ORDER BY t.lichess_id") });
    }
    const member = path.match(/^\/api\/admin\/team\/members\/([a-zA-Z0-9_-]{2,30})$/);
    if (member && request.method === 'PUT') {
      const target = member[1].toLowerCase(), body = await readBody(request);
      if (target === 'andresli') fail(400, 'El propietario conserva siempre su acceso.');
      const nextRole = choice(body.role, ['editor', 'designer', 'collaborator', 'disabled']);
      if (!Number.isSafeInteger(body.revision) || body.revision < 0) fail(400, 'Revisión no válida.');
      if (!body.revision && (await db('SELECT COUNT(*) AS n FROM chedex_v2_team'))[0].n >= 30) fail(400, 'Máximo de 30 miembros.');
      const storedRole=nextRole==='designer'?'collaborator':nextRole, specialty=nextRole==='designer'?'designer':'';
      const saved = body.revision === 0
        ? await db('INSERT OR IGNORE INTO chedex_v2_team (lichess_id,role,revision,specialty) VALUES (?,?,1,?) RETURNING revision', [target,storedRole,specialty])
        : await db('UPDATE chedex_v2_team SET role=?,specialty=?,revision=revision+1 WHERE lichess_id=? AND revision=? RETURNING revision', [storedRole,specialty,target,body.revision]);
      if (!saved.length) fail(409, 'El equipo ha cambiado. Recarga antes de guardar.');
      return json({ ok: true });
    }
    if (role === 'disabled') fail(403, 'Tu acceso al equipo está desactivado.');
    if (path === '/api/team/projects' && request.method === 'GET') {
      return page(db, `SELECT p.*,u.username FROM chedex_v2_projects p LEFT JOIN chedex_v2_users u ON u.lichess_id=p.owner_id${owner ? '' : " WHERE EXISTS (SELECT 1 FROM json_each(p.content,'$.teamMembers') WHERE value=?)"} ORDER BY p.updated_at DESC,p.id`, owner ? [] : [user], 'projects', row => productionProject({ id: row.id, title: JSON.parse(row.content).title, revision: row.revision, ...JSON.parse(row.content) }, owner));
    }
    const match = path.match(/^\/api\/team\/projects\/([a-zA-Z0-9_-]{1,60})$/);
    if (!match) return json({ error: 'Ruta no encontrada.' },404);
    const project = await load(db, id(match[1]), user, true);
    if (!owner && !(project.teamMembers || []).includes(user)) fail(404, 'Proyecto no encontrado.');
    if (request.method === 'GET') return json({ project: productionProject(project,owner) });
    if (request.method !== 'PUT') return json({ error: 'Método no permitido.' },405);
    if (project.archived) fail(400, 'El proyecto está archivado.');
    const body = await readBody(request);
    const production = productionProject(project).production;
    if (body.action === 'delegate' && owner) {
      const assignee=id(body.assignee).toLowerCase();
      if (!['editor','designer','collaborator'].includes(await teamRole(db,assignee))) fail(400, 'Elige una persona activa del equipo.');
      if (production.tasks.length>=100) fail(400, 'Máximo de 100 tareas.');
      const members=[...new Set([...(project.teamMembers||[]),assignee])];
      if (members.length>30) fail(400, 'Máximo de 30 personas asignadas.');
      project.teamMembers=members;
      production.tasks.push({id:randomUUID(),title:text(body.title,150),details:text(body.details||'',2000,false),assignee,due:date(body.due),status:'Asignado'});
    } else if (body.action === 'settings' && owner) {
      if (!Array.isArray(body.teamMembers) || body.teamMembers.length > 30) fail(400, 'Revisa las personas asignadas.');
      const members = [...new Set(body.teamMembers.map(value => id(value).toLowerCase()))];
      for (const member of members) if (!['editor','designer','collaborator'].includes(await teamRole(db,member))) fail(400, 'Asigna únicamente miembros activos del equipo.');
      if (!Array.isArray(body.materials) || body.materials.length > 20) fail(400, 'Máximo de 20 materiales.');
      project.teamMembers = members;
      Object.assign(production, { brief: text(body.brief,4000,false), format: choice(body.format,['Por concretar','Vertical','Horizontal','Cuadrado','Ambos','Libre']), duration: text(body.duration,100,false), platform: text(body.platform,100,false), due: date(body.due), materials: body.materials.map(item => ({ title: text(item.title,100), url: link(item.url) })) });
    } else if (body.action === 'task' && owner) {
      const task = body.task;
      if (!task || typeof task !== 'object') fail(400, 'Revisa la tarea.');
      const assignee = id(task.assignee).toLowerCase();
      if (!(project.teamMembers || []).includes(assignee) || !['editor','designer','collaborator'].includes(await teamRole(db,assignee))) fail(400, 'El responsable debe estar asignado al proyecto y activo.');
      const existing = production.tasks.find(item => item.id === task.id);
      if (task.id && !existing) fail(404, 'Tarea no encontrada.');
      if (!existing && production.tasks.length >= 100) fail(400, 'Máximo de 100 tareas.');
      const value = { id: existing?.id || randomUUID(), title: text(task.title,150), details: text(task.details || '',2000,false), assignee, due: date(task.due), status: existing?.status || 'Asignado' };
      if (existing) Object.assign(existing,value); else production.tasks.push(value);
    } else if (body.action === 'status') {
      const task = production.tasks.find(item => item.id === body.taskId);
      if (!task) fail(404, 'Tarea no encontrada.');
      if (!owner && task.assignee !== user) fail(403, 'Solo puedes actualizar tus tareas.');
      if (!owner && ['Aprobado','Entregado'].includes(task.status)) fail(403, 'La tarea ya tiene aprobación final.');
      task.status = choice(body.status,owner ? productionStages : [...productionStages.slice(0,3),task.status]);
    } else if (body.action === 'delivery' && (owner || ['editor','designer'].includes(role))) {
      if (production.deliveries.length >= 100) fail(400, 'Máximo de 100 entregas.');
      const task=body.taskId?production.tasks.find(item=>item.id===body.taskId):null;
      if (body.taskId && (!task || (!owner && (task.assignee!==user || ['Aprobado','Entregado'].includes(task.status))))) fail(403, 'La entrega debe corresponder a una tarea tuya pendiente.');
      if(task)task.status='Para revisar';
      production.deliveries.push({ taskId: body.taskId || '', kind: choice(body.kind || (role==='designer'?'Diseño':'Vídeo'),['Vídeo','Diseño','Otro']), id: randomUUID(), title: text(body.title,150), url: link(body.url), notes: text(body.notes || '',2000,false), status: 'Para revisar', author: user, createdAt: clock() });
    } else if (body.action === 'review' && owner) {
      const delivery = production.deliveries.find(item => item.id === body.deliveryId);
      if (!delivery) fail(404, 'Entrega no encontrada.');
      delivery.status = choice(body.status,['Cambios solicitados','Aprobado','Entregado']);
      if(delivery.taskId && production.deliveries.filter(item=>item.taskId===delivery.taskId).at(-1)?.id===delivery.id){const task=production.tasks.find(item=>item.id===delivery.taskId);if(task)task.status=delivery.status;}
    } else if (body.action === 'comment') {
      if (production.comments.length >= 300) fail(400, 'Máximo de 300 comentarios.');
      if (body.deliveryId && !production.deliveries.some(item => item.id === body.deliveryId)) fail(400, 'Versión no válida.');
      production.comments.push({ id: randomUUID(), text: text(body.text,2000), deliveryId: body.deliveryId || '', author: user, createdAt: clock() });
    } else fail(403, 'No tienes permiso para realizar esta acción.');
    project.production = production;
    return json({ project: productionProject(await save(db,project,body.revision),owner) });
  };
}
