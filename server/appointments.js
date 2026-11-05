import { randomUUID } from 'node:crypto';
import { requestStates } from '../public/project-data.js';

export { requestStates };
export const admission = project => project.requestStatus || (project.stage === 'Por hablar' ? requestStates[0] : 'Aceptada');
const problem = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const key = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(value) ? value : problem(400, 'Identificador no válido.');
const revision = value => Number.isSafeInteger(value) && value > 0 ? value : problem(400, 'Revisión no válida. Recarga la página.');
const selection = `SELECT a.id,a.slot_id AS slotId,a.project_id AS projectId,a.email,a.meeting_url AS meetingUrl,a.status,a.revision,a.created_at AS createdAt,s.starts,s.ends FROM chedex_v2_appointments a JOIN chedex_v2_slots s ON s.id=a.slot_id`;
export async function appointmentFor(db, projectId) {
  return (await db(`${selection} WHERE a.project_id=? ORDER BY CASE a.status WHEN 'booked' THEN 0 ELSE 1 END,a.created_at DESC,a.id LIMIT 1`, [projectId]))[0] || null;
}

export function createAppointmentApi({ readBody, json, clock, load }) {
  return async ({ request, db, user, admin }) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/admin/slots') {
      if (request.method === 'GET') return json({ slots: await db(`SELECT s.*,a.project_id AS projectId FROM chedex_v2_slots s LEFT JOIN chedex_v2_appointments a ON a.slot_id=s.id AND a.status='booked' WHERE s.ends>? ORDER BY s.starts LIMIT 500`, [clock()]) });
      if (request.method === 'POST') {
        const body = await readBody(request), { starts, ends } = body, now = clock();
        if (!Number.isSafeInteger(starts) || !Number.isSafeInteger(ends) || starts <= now || starts > now + 180 * 86400000 || ends - starts < 15 * 60000 || ends - starts > 120 * 60000 || starts % 60000 || ends % 60000) problem(400, 'Elige una fecha futura, hasta seis meses, y una duración de 15 a 120 minutos.');
        // A single write checks overlap and inserts, including concurrent requests.
        const rows = await db('INSERT INTO chedex_v2_slots (id,starts,ends) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM chedex_v2_slots WHERE starts<? AND ends>?) AND (SELECT COUNT(*) FROM chedex_v2_slots WHERE ends>?)<500 RETURNING *', [randomUUID(), starts, ends, ends, starts, now]);
        if (!rows.length) problem(409, 'Este horario coincide con otro hueco o la agenda está completa.');
        return json({ slot: rows[0] }, 201);
      }
    }
    const slotMatch = path.match(/^\/api\/admin\/slots\/([^/]+)$/);
    if (slotMatch && request.method === 'PUT') {
      const body = await readBody(request);
      if (typeof body.enabled !== 'boolean') problem(400, 'Disponibilidad no válida.');
      const rows = await db("UPDATE chedex_v2_slots SET enabled=?,revision=revision+1 WHERE id=? AND revision=? AND ends>? AND NOT EXISTS (SELECT 1 FROM chedex_v2_appointments WHERE slot_id=chedex_v2_slots.id AND status='booked') RETURNING *", [Number(body.enabled), key(slotMatch[1]), revision(body.revision), clock()]);
      if (!rows.length) problem(409, 'El hueco ha cambiado o ya está reservado. Recarga la agenda.');
      return json({ slot: rows[0] });
    }
    const match = path.match(/^\/api\/(admin\/)?projects\/([^/]+)\/(slots|appointment)$/);
    if (!match) return null;
    const project = await load(db, key(match[2]), user, admin);
    if (match[3] === 'slots' && request.method === 'GET') {
      if (project.archived || admission(project) !== 'Aceptada') problem(403, 'El calendario se abrirá cuando el equipo acepte tu solicitud.');
      return json({ slots: await db("SELECT s.id,s.starts,s.ends FROM chedex_v2_slots s WHERE s.enabled=1 AND s.starts>? AND NOT EXISTS (SELECT 1 FROM chedex_v2_appointments a WHERE a.slot_id=s.id AND a.status='booked') ORDER BY s.starts LIMIT 500", [clock()]) });
    }
    if (match[3] === 'appointment' && request.method === 'POST' && !admin) {
      const body = await readBody(request);
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      if (email.length > 150 || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email)) problem(400, 'Indica un correo válido para la invitación.');
      const rows = await db(`INSERT INTO chedex_v2_appointments (id,slot_id,project_id,owner_id,email,status,created_at)
        SELECT ?,s.id,p.id,p.owner_id,?,'booked',? FROM chedex_v2_slots s JOIN chedex_v2_projects p ON p.id=?
        WHERE s.id=? AND s.enabled=1 AND s.starts>? AND p.owner_id=? AND p.revision=? AND json_extract(p.content,'$.archived')=0
        AND COALESCE(json_extract(p.content,'$.requestStatus'),CASE json_extract(p.content,'$.stage') WHEN 'Por hablar' THEN 'Pendiente de revisión' ELSE 'Aceptada' END)='Aceptada'
        AND NOT EXISTS (SELECT 1 FROM chedex_v2_appointments WHERE status='booked' AND (slot_id=s.id OR project_id=p.id)) RETURNING id`,
        [randomUUID(), email, clock(), project.id, key(body.slotId), clock(), user, revision(body.revision)]);
      if (!rows.length) problem(409, 'El hueco o la solicitud han cambiado, o ya tienes una cita. Actualiza antes de reservar.');
      return json({ appointment: await appointmentFor(db, project.id) }, 201);
    }
    if (match[3] === 'appointment' && request.method === 'PUT') {
      const body = await readBody(request), appointmentId = key(body.id), expected = revision(body.revision);
      if (body.action === 'cancel') {
        const rows = await db("UPDATE chedex_v2_appointments SET status='cancelled',revision=revision+1 WHERE id=? AND project_id=? AND revision=? AND status='booked' AND EXISTS (SELECT 1 FROM chedex_v2_slots s WHERE s.id=slot_id AND s.starts>?) RETURNING id", [appointmentId, project.id, expected, clock()]);
        if (!rows.length) problem(409, 'La cita ha cambiado o ya ha empezado. Actualiza la página.');
      } else if (body.action === 'link' && admin) {
        let url;
        try { url = new URL(body.meetingUrl); } catch { problem(400, 'Indica un enlace de videollamada válido con https://.'); }
        if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 1500) problem(400, 'Usa un enlace de videollamada con https://, sin credenciales.');
        const rows = await db("UPDATE chedex_v2_appointments SET meeting_url=?,revision=revision+1 WHERE id=? AND project_id=? AND revision=? AND status='booked' RETURNING id", [url.href, appointmentId, project.id, expected]);
        if (!rows.length) problem(409, 'La cita ha cambiado. Actualiza la página.');
      } else problem(400, 'Acción no válida.');
      return json({ appointment: await appointmentFor(db, project.id) });
    }
    return null;
  };
}
