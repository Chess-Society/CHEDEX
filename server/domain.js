export class InputError extends Error {}
export function text(value, max = 120, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new InputError('Revisa los campos obligatorios y su longitud.');
  return value.trim();
}
export function url(value = '') {
  const s = text(value, 500);
  if (!s) return '';
  try { const u = new URL(s); if (u.protocol === 'https:') return u.href; } catch {}
  throw new InputError('Los enlaces deben empezar por https://.');
}
function number(value, max, required = false) {
  if (value === '' || value === null || value === undefined) { if (required) throw new InputError('Falta un valor numérico.'); return null; }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new InputError('Revisa los valores numéricos.');
  return n;
}
function integer(value, max) { const n = number(value, max); if (n !== null && !Number.isInteger(n)) throw new InputError('Introduce un número entero.'); return n; }
export const defaults = (name = '') => ({ name, bio: '', country: '', city: '', club: '', school: '', started: '', title: '', fideStandard: '', fideRapid: '', fideBlitz: '', fideUrl: '', lichess: '', chesscom: '', contact: '', social: '', avatar: '', role: 'player', theme: 'midnight', public: false, adultConfirmed: false, visibility: { information: true, tournaments: true, achievements: true, statistics: true, contact: false } });
export function profileInput(input, previous) {
  const p = { ...previous };
  for (const [k, max] of Object.entries({name:70,bio:400,country:60,city:80,club:100,school:100,title:12,contact:150})) if (k in input) p[k] = text(input[k], max, k === 'name');
  for (const k of ['fideUrl','lichess','chesscom','social']) if (k in input) p[k] = url(input[k]);
  if ('avatar' in input) { if (input.avatar !== '' && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.avatar)) throw new InputError('Usa una imagen PNG, JPG o WebP.'); p.avatar = text(input.avatar, 400000); }
  for (const k of ['fideStandard','fideRapid','fideBlitz']) if (k in input) p[k] = integer(input[k], 4000) ?? '';
  if ('started' in input) { p.started = integer(input.started, new Date().getFullYear()) ?? ''; if (p.started !== '' && p.started < 1800) throw new InputError('Revisa el año de inicio.'); }
  if ('role' in input) { if (!['player','coach','club','organizer'].includes(input.role)) throw new InputError('Tipo de perfil no válido.'); p.role = input.role; }
  if ('theme' in input) { if (!['midnight','violet','forest'].includes(input.theme)) throw new InputError('Diseño no válido.'); p.theme = input.theme; }
  if ('adultConfirmed' in input && input.adultConfirmed === true) p.adultConfirmed = true;
  if ('public' in input) { if (typeof input.public !== 'boolean') throw new InputError('Privacidad no válida.'); p.public = input.public; }
  if ('visibility' in input) {
    if (!input.visibility || typeof input.visibility !== 'object' || Array.isArray(input.visibility)) throw new InputError('Visibilidad no válida.');
    p.visibility = { ...previous.visibility };
    for (const k of Object.keys(p.visibility)) if (k in input.visibility) { if (typeof input.visibility[k] !== 'boolean') throw new InputError('Visibilidad no válida.'); p.visibility[k] = input.visibility[k]; }
  }
  if (!p.adultConfirmed && p.public) throw new InputError('La publicación requiere confirmar la mayoría de edad. Los perfiles de menores están pendientes de un procedimiento de autorización.');
  return p;
}
export function entryInput(kind, v) {
  if (!['tournaments','achievements'].includes(kind)) throw new InputError('Tipo de registro no válido.');
  const date = text(v.date, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new InputError('Introduce una fecha válida.');
  const data = { name: text(v.name, 140, true), date, source: url(v.source || ''), notes: text(v.notes || '', 800) };
  if (kind === 'achievements') data.category = text(v.category || 'Reconocimiento', 60);
  else {
    Object.assign(data, { city: text(v.city || '',80), organizer: text(v.organizer || '',100), mode: text(v.mode || 'Rápidas',30), timeControl: text(v.timeControl || '',50), rounds: integer(v.rounds, 100), points: number(v.points,100), position: integer(v.position,100000), participants: integer(v.participants,100000), elo: integer(v.elo,4000) });
    if (!['Clásicas','Rápidas','Blitz','Otras'].includes(data.mode)) throw new InputError('Modalidad no válida.');
    if (data.points !== null && data.rounds === null) throw new InputError('Indica las rondas para registrar puntos.');
    if (data.points !== null && data.points > data.rounds) throw new InputError('Los puntos no pueden superar las rondas.');
    if (data.position !== null && (data.position < 1 || (data.participants !== null && data.position > data.participants))) throw new InputError('Revisa la clasificación.');
  }
  data.status = data.source ? 'Con fuente' : 'Declarado';
  return data;
}
export function statistics(entries) {
  const tournaments = entries.filter(e => e.kind === 'tournaments').map(e=>e.data);
  const scored = tournaments.filter(e=>e.points !== null && e.rounds > 0);
  const rounds = scored.reduce((a,e)=>a+e.rounds,0), points = scored.reduce((a,e)=>a+e.points,0);
  return { tournaments: tournaments.length, achievements: entries.filter(e=>e.kind === 'achievements').length, games: null, percentage: rounds ? Math.round(points/rounds*1000)/10 : null, rounds, points,
    years: Object.fromEntries([...new Set(tournaments.map(t=>t.date.slice(0,4)))].sort().map(y=>[y,tournaments.filter(t=>t.date.startsWith(y)).length])),
    modes: Object.fromEntries([...new Set(tournaments.map(t=>t.mode))].map(m=>[m,tournaments.filter(t=>t.mode===m).length])),
    elo: tournaments.filter(t=>t.elo!==null).sort((a,b)=>a.date.localeCompare(b.date)).map(t=>({date:t.date,elo:t.elo,mode:t.mode})) };
}
export function publicView(user, entries) {
  const p = user.profile;
  if (!p.public || !p.adultConfirmed || user.demo) return null;
  const visible = entries.filter(e=>p.visibility[e.kind]);
  const profile = { name:p.name, avatar:p.avatar, theme:p.theme, role:p.role, visibility:p.visibility };
  if (p.visibility.information) for (const k of ['bio','country','city','club','school','started','title','fideStandard','fideRapid','fideBlitz','fideUrl','lichess','chesscom','social']) profile[k]=p[k];
  if (p.visibility.contact) profile.contact=p.contact;
  return { id:user.id, publicId:user.publicId, profile, entries:visible, stats:p.visibility.statistics ? statistics(visible) : null };
}
