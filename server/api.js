import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { publicServices, serviceNeeds, serviceProfiles } from '../public/services-data.js';
import { initializeStore, cleanupExpired } from './store.js';
import { reportIncident } from './security.js';
import { createWorkspaceApi } from './workspace-api.js';

const ADMIN_ID = 'andresli';
const hash = value => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('base64url');
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export function validateServices(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) throw new HttpError(400, 'Debe haber entre 1 y 12 servicios.');
  const text = (input, max, name, optional = false) => {
    if (typeof input !== 'string' || input.trim().length > max || (!optional && !input.trim())) throw new HttpError(400, `Revisa el campo ${name}.`);
    return input.trim();
  };
  const ids = new Set();
  return value.map(service => {
    if (!service || typeof service !== 'object' || Array.isArray(service)) throw new HttpError(400, 'Servicio no válido.');
    const id = text(service.id, 50, 'identificador');
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id)) throw new HttpError(400, 'Identificador duplicado o no válido.');
    ids.add(id);
    if (!Array.isArray(service.features) || service.features.length < 1 || service.features.length > 6) throw new HttpError(400, 'Incluye entre 1 y 6 características.');
    if (!serviceProfiles.includes(service.profile) || !serviceNeeds.includes(service.need) || !['school', 'travel', 'career', 'content', 'support'].includes(service.graphic)) throw new HttpError(400, 'Revisa el perfil, el motivo o la ilustración.');
    if (['published', 'featured', 'showPrice'].some(key => typeof service[key] !== 'boolean')) throw new HttpError(400, 'Revisa las opciones de publicación.');
    const priceText = text(service.priceText, 60, 'precio', true);
    if (service.showPrice && !priceText) throw new HttpError(400, 'Escribe un precio antes de mostrarlo.');
    return {
      id, title: text(service.title, 85, 'título'), label: text(service.label, 65, 'etiqueta'),
      description: text(service.description, 500, 'descripción'), button: text(service.button, 55, 'botón'),
      features: service.features.map(item => text(item, 100, 'características')),
      profile: service.profile, need: service.need, graphic: service.graphic,
      featured: service.featured, published: service.published, priceText, showPrice: service.showPrice,
    };
  });
}

export function createApi({ env, getDatabase, fetcher = fetch, clock = Date.now }) {
  let storePromise;
  const store = () => storePromise ||= Promise.resolve().then(() => {
    if (!getDatabase) throw new Error('DATABASE_UNCONFIGURED');
    return getDatabase();
  }).then(initializeStore).catch(error => { storePromise = undefined; throw error; });
  const origin = env.APP_URL;
  const secure = new URL(origin).protocol === 'https:';
  const sessionName = secure ? '__Host-chedex_admin' : 'chedex_admin_local';
  const stateName = secure ? '__Host-chedex_oauth' : 'chedex_oauth_local';
  const noticeName = secure ? '__Host-chedex_notice' : 'chedex_notice_local';
  const destinationName = secure ? '__Host-chedex_destination' : 'chedex_destination_local';
  const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  const readCookie = (request, name) => (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  const redirect = (location, cookies = []) => {
    const headers = new Headers({ Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    cookies.forEach(value => headers.append('Set-Cookie', value));
    return new Response(null, { status: 303, headers });
  };
  const writeAllowed = request => {
    if (request.headers.get('origin') !== origin || request.headers.get('x-chedex-request') !== '1') throw new HttpError(403, 'Solicitud no autorizada. Recarga la página y vuelve a intentarlo.');
  };
  const authenticate = async (request, { optional = false } = {}) => {
    if (optional) return { db: await store() };
    const token = readCookie(request, sessionName);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(401, 'Inicia sesión con Lichess para continuar.');
    const db = await store();
    const session = (await db('SELECT lichess_id,username FROM chedex_v2_sessions WHERE token=? AND expires>?', [hash(token), clock()]))[0];
    if (!session) throw new HttpError(401, 'La sesión ha caducado. Vuelve a entrar con Lichess.');
    return { db, session, token };
  };
  const admin = async request => {
    const result = await authenticate(request);
    if (result.session.lichess_id !== ADMIN_ID) throw new HttpError(403, 'Solo AndresLi puede administrar Chedex.');
    return result;
  };
  const readBody = async request => {
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Envía los datos como JSON.');
    if (Number(request.headers.get('content-length') || 0) > 65536) throw new HttpError(413, 'El catálogo es demasiado grande.');
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, 'Faltan los datos.');
    const chunks = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) { await reader.cancel(); throw new HttpError(413, 'El catálogo es demasiado grande.'); }
      chunks.push(value);
    }
    const body = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    try {
      const data = JSON.parse(new TextDecoder().decode(body));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID_BODY');
      return data;
    } catch { throw new HttpError(400, 'Los datos no son válidos.'); }
  };

  const workspace = createWorkspaceApi({ authenticate, readBody, writeAllowed, json, clock });
  return async request => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith('/api/') && !path.startsWith('/auth/')) return null;
    try {
      if (path === '/api/services' && request.method === 'GET') {
        const db = await store();
        const row = (await db('SELECT content FROM chedex_v2_catalog WHERE id=1'))[0];
        return json({ services: publicServices(JSON.parse(row.content)) });
      }
      if (path === '/auth/lichess' && request.method === 'GET') {
        const db = await store();
        const now = clock();
        await cleanupExpired(db, now);
        const rateKey = hash(`${request.headers.get('cf-connecting-ip') || 'local'}:${Math.floor(now / 600000)}`);
        const count = (await db('INSERT INTO chedex_v2_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count', [rateKey, now + 600000]))[0].count;
        if (count > 20) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
        const state = random(), verifier = random();
        await db('INSERT INTO chedex_v2_oauth (state,verifier,expires) VALUES (?,?,?)', [hash(state), verifier, now + 600000]);
        const login = new URL('https://lichess.org/oauth');
        login.search = new URLSearchParams({ response_type: 'code', client_id: env.LICHESS_CLIENT_ID || 'chedex.app', redirect_uri: `${origin}/auth/callback`, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', scope: '' });
        return redirect(login.href, [cookie(stateName, state, 600), cookie(destinationName, url.searchParams.get('next') === 'cuenta' ? 'cuenta' : 'admin', 600)]);
      }
      if (path === '/auth/callback' && request.method === 'GET') {
        const state = url.searchParams.get('state'), browserState = readCookie(request, stateName);
        if (!state || !browserState || !/^[A-Za-z0-9_-]{43}$/.test(state) || state.length !== browserState.length || !timingSafeEqual(Buffer.from(state), Buffer.from(browserState))) throw new HttpError(400, 'No se ha podido validar el acceso. Vuelve a intentarlo.');
        const db = await store();
        const saved = (await db('DELETE FROM chedex_v2_oauth WHERE state=? AND expires>? RETURNING verifier', [hash(state), clock()]))[0];
        if (!saved || !url.searchParams.get('code') || url.searchParams.has('error')) throw new HttpError(400, 'El acceso ha caducado o se ha cancelado.');
        const tokenResponse = await fetcher('https://lichess.org/api/token', {
          method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'), code_verifier: saved.verifier, client_id: env.LICHESS_CLIENT_ID || 'chedex.app', redirect_uri: `${origin}/auth/callback` }),
        });
        if (!tokenResponse.ok) throw new HttpError(502, 'Lichess no ha podido completar el acceso.');
        const token = await tokenResponse.json();
        if (typeof token.access_token !== 'string' || !token.access_token) throw new HttpError(502, 'Respuesta de Lichess no válida.');
        const accountResponse = await fetcher('https://lichess.org/api/account', { headers: { Authorization: `Bearer ${token.access_token}` }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
        if (!accountResponse.ok) throw new HttpError(502, 'No se ha podido verificar la cuenta de Lichess.');
        const account = await accountResponse.json();
        if (typeof account.id !== 'string' || !/^[a-z0-9_-]{2,30}$/.test(account.id) || typeof account.username !== 'string' || account.username.toLowerCase() !== account.id) throw new HttpError(403, 'No se ha podido validar la identidad de Lichess.');
        await db('INSERT INTO chedex_v2_users (lichess_id,username,profile,created_at) VALUES (?,?,?,?) ON CONFLICT(lichess_id) DO UPDATE SET username=excluded.username', [account.id, account.username, '{}', clock()]);
        const sessionToken = random();
        await db('INSERT INTO chedex_v2_sessions (token,lichess_id,username,expires) VALUES (?,?,?,?)', [hash(sessionToken), account.id, account.username, clock() + 28800000]);
        return redirect(account.id === ADMIN_ID && readCookie(request, destinationName) !== 'cuenta' ? '/admin' : '/cuenta', [cookie(sessionName, sessionToken, 28800), cookie(stateName, '', 0), cookie(noticeName, '', 0), cookie(destinationName, '', 0)]);
      }
      if (path === '/api/admin/session' && request.method === 'GET') {
        try {
          const { session } = await admin(request);
          return json({ username: session.username });
        } catch (error) {
          if (error.status !== 401) throw error;
          const notice = readCookie(request, noticeName);
          return json({ error: notice === 'denied' ? 'Solo AndresLi puede administrar Chedex. Si cancelaste el acceso, puedes intentarlo de nuevo.' : notice === 'unavailable' ? 'El acceso no se ha podido completar. Vuelve a intentarlo en unos minutos.' : error.message }, 401);
        }
      }
      if (['/api/admin/logout', '/api/logout'].includes(path) && request.method === 'POST') {
        writeAllowed(request);
        const { db, token } = await (path === '/api/admin/logout' ? admin(request) : authenticate(request));
        await db('DELETE FROM chedex_v2_sessions WHERE token=?', [hash(token)]);
        const response = json({ ok: true });
        response.headers.append('Set-Cookie', cookie(sessionName, '', 0));
        response.headers.append('Set-Cookie', cookie(noticeName, '', 0));
        return response;
      }
      if (path === '/api/admin/services' && ['GET', 'PUT'].includes(request.method)) {
        const { db } = await admin(request);
        if (request.method === 'GET') {
          const row = (await db('SELECT revision,content FROM chedex_v2_catalog WHERE id=1'))[0];
          return json({ revision: row.revision, services: JSON.parse(row.content) });
        }
        writeAllowed(request);
        const body = await readBody(request);
        if (!Number.isSafeInteger(body?.revision) || body.revision < 1) throw new HttpError(400, 'Revisión de catálogo no válida.');
        const services = validateServices(body.services);
        const saved = (await db('UPDATE chedex_v2_catalog SET content=?,revision=revision+1 WHERE id=1 AND revision=? RETURNING revision', [JSON.stringify(services), body.revision]))[0];
        if (!saved) throw new HttpError(409, 'El catálogo ha cambiado en otra ventana. Recárgalo antes de guardar.');
        return json({ revision: saved.revision, services });
      }
      const result = await workspace(request);
      return result || json({ error: 'Ruta no encontrada.' }, 404);
    } catch (error) {
      const incident = !error.status || error.status >= 500 ? reportIncident(error, 'api') : undefined;
      if (path === '/auth/callback') return redirect(readCookie(request, destinationName) === 'cuenta' ? '/cuenta' : '/admin', [cookie(stateName, '', 0), cookie(destinationName, '', 0), cookie(noticeName, !error.status || error.status >= 500 ? 'unavailable' : 'denied', 120)]);
      return json({ error: error.status ? error.message : 'No disponible temporalmente. Vuelve a intentarlo.', ...(incident ? { incident } : {}) }, error.status || 503);
    }
  };
}
