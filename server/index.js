import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { defaults, profileInput, entryInput, statistics, publicView, InputError } from './domain.js';
import QRCode from 'qrcode';
import { parseAppPath } from '../public/navigation.js';
import { lichessAuth, isAdministrator } from './auth.js';
import { createAppleWallet } from './apple-wallet.js';
import { sessionCookies, readJson as body } from './security.js';
import { filterHistory, historyOptions } from '../public/history-tools.js';

export async function createApplication(options={}) {
const port = Number(process.env.PORT || 3000);
const origin = new URL(process.env.APP_URL || `http://127.0.0.1:${port}`).origin;
const production = process.env.NODE_ENV === 'production';
if (production && !origin.startsWith('https://')) throw new Error('APP_URL debe usar HTTPS en producción.');
const demoEnabled = !production && process.env.ENABLE_DEMO === 'true' && ['localhost','127.0.0.1'].includes(new URL(origin).hostname);
const db = options.database || await openDatabase({localFactory:options.localFactory});
const auth=lichessAuth({db,origin,clientId:process.env.LICHESS_CLIENT_ID||'chedex'});
const apple=createAppleWallet(process.env,origin);
await apple.initialize();
const secret = () => randomBytes(32).toString('base64url');
const hash = s => createHash('sha256').update(s).digest('hex');
const {serialize:cookie,name:cookieName}=sessionCookies(origin);
const cookies = req => Object.fromEntries((req.headers.cookie||'').split(';').filter(s=>s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(0,i).trim(),s.slice(i+1)];}));
const userRow = r => r ? {id:r.id, publicId:r.public_id, demo:!!r.demo, profile:JSON.parse(r.profile),lichessId:r.lichess_id} : null;
const findUser = async id => userRow((await db('SELECT * FROM users WHERE id=?',[id]))[0]);
const entriesFor = async id => (await db('SELECT id,kind,data FROM entries WHERE user_id=?',[id])).map(r=>({...r,data:JSON.parse(r.data)})).sort((a,b)=>b.data.date.localeCompare(a.data.date));
async function sessionUser(req) {
  const token = cookies(req)[cookieName('chedex')];
  if (!token) return null;
  const r = (await db('SELECT user_id FROM sessions WHERE token=? AND expires>?',[hash(token),Date.now()]))[0];
  return r ? findUser(r.user_id) : null;
}
async function makeSession(res,user) {
  const token=secret();
  await db('INSERT INTO sessions VALUES(?,?,?)',[hash(token),user.id,Date.now()+30*86400000]);
  const prior=res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie',[...(prior?(Array.isArray(prior)?prior:[prior]):[]),cookie('chedex',token,30*86400)]);
}
function json(res,status,data) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function redirect(res,path) {res.writeHead(302,{Location:path});res.end();}
const limits = new Map();
function rateLimit(req,res) {
  const key=options.clientAddress?.(req)||req.socket.remoteAddress||'unknown', now=Date.now();
  if(limits.size>5000) for(const [k,v] of limits) if(v.reset<now) limits.delete(k);
  if(limits.size>=5000&&!limits.has(key))limits.delete(limits.keys().next().value);
  let v=limits.get(key); if(!v||v.reset<now){v={n:0,reset:now+60000};limits.set(key,v);}
  if(++v.n>180){res.setHeader('Retry-After','60');json(res,429,{error:'Demasiadas solicitudes. Espera un minuto.'});return true;}return false;
}
async function createDemo(res) {
  const id=randomUUID(), p=defaults('TopChess');
  Object.assign(p,{bio:'Cada partida cuenta una historia. Construyendo la mía, un movimiento a la vez.',club:'Club de Ajedrez Horizonte',country:'España',city:'Madrid',started:2016,fideStandard:1842,fideRapid:1910,fideBlitz:1785,adultConfirmed:true});
  await db('INSERT INTO users VALUES(?,?,?,?,?,?)',[id,`demo-${id}`,secret().slice(0,16),JSON.stringify(p),1,new Date().toISOString()]);
  for(const v of [
    {kind:'tournaments',name:'Abierto de otoño',date:'2026-10-18',mode:'Clásicas',city:'Madrid',rounds:7,points:5,position:12,participants:86,elo:1842},
    {kind:'tournaments',name:'Memorial del club',date:'2026-09-12',mode:'Rápidas',city:'Madrid',rounds:9,points:6,position:8,participants:64,elo:1910},
    {kind:'tournaments',name:'Torneo de primavera',date:'2026-04-25',mode:'Clásicas',city:'Toledo',rounds:7,points:4,position:21,participants:78,elo:1810},
    {kind:'achievements',name:'Primer podio en el club',date:'2026-09-12',category:'Podio',notes:'Tercer puesto en mi categoría.'}
  ]) await db('INSERT INTO entries VALUES(?,?,?,?)',[randomUUID(),id,v.kind,JSON.stringify(entryInput(v.kind,v))]);
  await makeSession(res,await findUser(id));
}
const assets = new Map([['/history-tools.js',['history-tools.js','text/javascript']],['/navigation.js',['navigation.js','text/javascript']],['/landing.js',['landing.js','text/javascript']],['/landing.css',['landing.css','text/css']],['/landing-qr.svg',['landing-qr.svg','image/svg+xml']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']],['/design.css',['design.css','text/css']],['/favicon.svg',['favicon.svg','image/svg+xml']]]);
function publicResponse(data,query){
  let filters;try{filters=historyOptions(query);}catch{throw new InputError('Filtros no válidos.');}
  const totals=Object.fromEntries(['tournaments','achievements'].map(kind=>[kind,data.entries.filter(e=>e.kind===kind).length]));
  const kinds=filters.kind?[filters.kind]:['tournaments','achievements'];
  const entries=kinds.flatMap(kind=>data.entries.filter(e=>e.kind===kind).slice(filters.offset,filters.offset+25));
  return {...data,entries,totals};
}
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Cache-Control','no-store');
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  try {
    const path=new URL(req.url,origin).pathname;
    if(path.startsWith('/api/') || path.startsWith('/auth/') || path==='/healthz') if(rateLimit(req,res))return;
    if(!['GET','HEAD'].includes(req.method)) {
      if(req.headers.origin!==origin || req.headers['x-chedex-request']!=='1') return json(res,403,{error:'Solicitud no autorizada.'});
    }
    if(path==='/healthz' && req.method==='GET'){await db('SELECT 1');return json(res,200,{status:'ok'});}
    if(path==='/api/config' && req.method==='GET')return json(res,200,{demoEnabled,wallet:{apple:apple.status().ready,appleReason:apple.status().reason,google:false}});
    if(path==='/auth/lichess' && req.method==='GET') {
      const login=await auth.begin();
      res.setHeader('Set-Cookie',cookie('chedex_oauth',login.state,600));
      return redirect(res,login.url);
    }
    if(path==='/auth/callback' && req.method==='GET') {
      res.setHeader('Set-Cookie',cookie('chedex_oauth','',0));
      try {
        const row=await auth.complete(new URL(req.url,origin).searchParams,cookies(req)[cookieName('chedex_oauth')]);
        const previous=cookies(req)[cookieName('chedex')];
        if(previous)await db('DELETE FROM sessions WHERE token=?',[hash(previous)]);
        await makeSession(res,userRow(row));
        return redirect(res,'/app');
      } catch { return redirect(res,'/?auth=error'); }
    }
    if(path==='/api/demo' && req.method==='POST') {if(!demoEnabled)return json(res,404,{error:'No disponible.'});await createDemo(res);return json(res,200,{ok:true});}
    if(path.startsWith('/api/public/') && req.method==='GET') {
      const user=userRow((await db('SELECT * FROM users WHERE public_id=?',[path.slice(12)]))[0]);
      const data=user&&publicView(user,await entriesFor(user.id));
      return data?json(res,200,publicResponse(data,new URL(req.url,origin).searchParams)):json(res,404,{error:'Este perfil no está disponible. Puede ser privado o haberse eliminado.'});
    }
    if(path.startsWith('/api/')) {
      const user=await sessionUser(req);
      if(!user)return json(res,401,{error:'Inicia sesión para continuar.'});
      if(path==='/api/me' && req.method==='GET'){await db('DELETE FROM entry_trash WHERE expires<?',[Date.now()]);const entries=await entriesFor(user.id);return json(res,200,{...user,isAdmin:isAdministrator(user),entries:new URL(req.url,origin).searchParams.get('compact')==='1'?entries.slice(0,3):entries,stats:statistics(entries),totalEntries:entries.length,historyYears:[...new Set(entries.map(e=>e.data.date.slice(0,4)))].sort().reverse(),undo:(await db('SELECT id,kind,data,expires FROM entry_trash WHERE user_id=? AND expires>?',[user.id,Date.now()])).map(r=>({id:r.id,kind:r.kind,name:JSON.parse(r.data).name,until:r.expires})),publicUrl:`${origin}/p/${user.publicId}`});}
      if(['/api/history','/api/statistics'].includes(path) && req.method==='GET') {
        let filters;try{filters=historyOptions(new URL(req.url,origin).searchParams);}catch{throw new InputError('Filtros no válidos.');}
        const entries=filterHistory(await entriesFor(user.id),filters);
        return path==='/api/statistics'?json(res,200,statistics(entries)):json(res,200,{items:entries.slice(filters.offset,filters.offset+25),total:entries.length,next:filters.offset+25<entries.length?filters.offset+25:null});
      }
      if(path==='/api/preview' && req.method==='GET') {
        const data=publicView({...user,demo:false,profile:{...user.profile,public:true,adultConfirmed:true}},await entriesFor(user.id));
        return json(res,200,publicResponse({...data,preview:true,isPublic:!!publicView(user,[])},new URL(req.url,origin).searchParams));
      }
      const restore=path.match(/^\/api\/entries\/(tournaments|achievements)\/([a-f0-9-]+)\/restore$/);
      if(restore && req.method==='POST') {
        const [,kind,id]=restore,now=Date.now();
        const saved=(await db('SELECT id FROM entry_trash WHERE id=? AND user_id=? AND kind=? AND expires>?',[id,user.id,kind,now]))[0];
        if(!saved)return json(res,409,{error:'El plazo para deshacer ha terminado o el registro no está disponible.'});
        await db.transaction([
          ['INSERT INTO entries SELECT id,user_id,kind,data FROM entry_trash WHERE id=? AND user_id=? AND expires>? AND NOT EXISTS (SELECT 1 FROM entries WHERE id=?)',[id,user.id,now,id]],
          ['DELETE FROM entry_trash WHERE id=? AND user_id=?',[id,user.id]]
        ]);
        return json(res,200,{ok:true});
      }
      if(path==='/api/admin' && req.method==='GET') {
        if(!isAdministrator(user))return json(res,403,{error:'Esta sección está reservada a la administración.'});
        const users=await db('SELECT COUNT(*) AS total FROM users WHERE demo=0');
        const records=await db('SELECT e.kind,COUNT(*) AS total FROM entries e JOIN users u ON u.id=e.user_id WHERE u.demo=0 GROUP BY e.kind');
        return json(res,200,{users:Number(users[0].total),records:Object.fromEntries(records.map(r=>[r.kind,Number(r.total)])),database:process.env.TURSO_DATABASE_URL?'Turso':'Local',apple:apple.status(),https:origin.startsWith('https://'),callback:origin+'/auth/callback'});
      }
      if(path==='/api/wallet/apple' && req.method==='GET') {
        if(!publicView(user,[]))return json(res,409,{error:'Activa tu perfil público antes de añadirlo a Apple Wallet.'});
        if(!apple.status().ready)return json(res,503,{error:'Apple Wallet está pendiente de configuración. No se ha emitido ningún pase.'});
        try {
          const buffer=apple.issue(user);
          res.writeHead(200,{'Content-Type':'application/vnd.apple.pkpass','Content-Disposition':'attachment; filename="chedex.pkpass"'});
          return res.end(buffer);
        } catch {return json(res,503,{error:'No se pudo firmar el pase de Apple. Inténtalo más tarde.'});}
      }
      if(path==='/api/profile' && req.method==='PUT') {
        const p=profileInput(await body(req),user.profile);
        if(user.demo && p.public)throw new InputError('La demo no permite publicar perfiles. Accede con Lichess para crear el tuyo.');
        await db('UPDATE users SET profile=? WHERE id=?',[JSON.stringify(p),user.id]);return json(res,200,{ok:true});
      }
      const entryMatch=path.match(/^\/api\/entries\/(tournaments|achievements)(?:\/([a-f0-9-]+))?$/);
      if(entryMatch) {
        const [,kind,id]=entryMatch;
        if(['PUT','DELETE'].includes(req.method) && (!id || !(await db('SELECT id FROM entries WHERE id=? AND user_id=? AND kind=?',[id,user.id,kind])).length))return json(res,404,{error:'Registro no encontrado.'});
        if(req.method==='POST' && !id){const count=(await db('SELECT COUNT(*) AS n FROM entries WHERE user_id=?',[user.id]))[0].n;if(count>=10000)throw new InputError('Has alcanzado el límite de registros.');const data=entryInput(kind,await body(req));await db('INSERT INTO entries VALUES(?,?,?,?)',[randomUUID(),user.id,kind,JSON.stringify(data)]);return json(res,201,{ok:true});}
        if(req.method==='PUT'){const data=entryInput(kind,await body(req));await db('UPDATE entries SET data=? WHERE id=? AND user_id=?',[JSON.stringify(data),id,user.id]);return json(res,200,{ok:true});}
        if(req.method==='DELETE'){
          const undoUntil=Date.now()+10000;
          await db.transaction([
            ['DELETE FROM entry_trash WHERE expires<?',[Date.now()]],
            ['INSERT OR IGNORE INTO entry_trash SELECT id,user_id,kind,data,? FROM entries WHERE id=? AND user_id=?',[undoUntil,id,user.id]],
            ['DELETE FROM entries WHERE id=? AND user_id=?',[id,user.id]]
          ]);
          return json(res,200,{ok:true,undoUntil});
        }
      }
      if(path==='/api/qr' && req.method==='GET') {
        if(!publicView(user,[]))return json(res,409,{error:'Activa tu perfil público para generar su QR.'});
        const svg=await QRCode.toString(`${origin}/p/${user.publicId}`,{type:'svg',margin:2,width:240,color:{dark:'#17233b',light:'#ffffff'}});
        res.writeHead(200,{'Content-Type':'image/svg+xml'});return res.end(svg);
      }
      if(path==='/api/rotate-link' && req.method==='POST'){await db('UPDATE users SET public_id=? WHERE id=?',[secret().slice(0,16),user.id]);return json(res,200,{ok:true});}
      if(path==='/api/export' && req.method==='GET')return json(res,200,{format:'chedex-1',exportedAt:new Date().toISOString(),profile:user.profile,entries:await entriesFor(user.id),favorites:(await db('SELECT target_id FROM favorites WHERE user_id=?',[user.id])).map(r=>r.target_id)});
      if(path==='/api/favorites' && req.method==='GET'){
        const rows=await db('SELECT u.* FROM users u JOIN favorites f ON f.target_id=u.id WHERE f.user_id=?',[user.id]);
        const profiles=[];for(const r of rows){const u=userRow(r),p=publicView(u,[]);profiles.push(p||{id:u.id,unavailable:true});}return json(res,200,profiles);
      }
      if(path.startsWith('/api/favorites/') && ['POST','DELETE'].includes(req.method)){
        const target=await findUser(path.slice(15));
        if(req.method==='POST'){if(!target || !publicView(target,[]))return json(res,404,{error:'Perfil no disponible.'});await db('INSERT OR IGNORE INTO favorites VALUES(?,?)',[user.id,target.id]);}
        else await db('DELETE FROM favorites WHERE user_id=? AND target_id=?',[user.id,path.slice(15)]);
        return json(res,200,{ok:true});
      }
      if(path==='/api/account' && req.method==='DELETE'){
        const v=await body(req);if(v.confirm!=='ELIMINAR')throw new InputError('Escribe ELIMINAR para confirmar.');
        await db.transaction([
          ['DELETE FROM sessions WHERE user_id=?',[user.id]],
          ['DELETE FROM entries WHERE user_id=?',[user.id]],
          ['DELETE FROM entry_trash WHERE user_id=?',[user.id]],
          ['DELETE FROM favorites WHERE user_id=? OR target_id=?',[user.id,user.id]],
          ['DELETE FROM users WHERE id=?',[user.id]]
        ]);res.setHeader('Set-Cookie',cookie('chedex','',0));return json(res,200,{ok:true});
      }
      if(path==='/api/logout' && req.method==='POST') {await db('DELETE FROM sessions WHERE token=?',[hash(cookies(req)[cookieName('chedex')]||'')]);res.setHeader('Set-Cookie',cookie('chedex','',0));return json(res,200,{ok:true});}
      return json(res,404,{error:'Recurso no encontrado.'});
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
    const asset=assets.get(path);
    if(!asset && path!=='/' && !parseAppPath(path) && !/^\/p\/[A-Za-z0-9_-]{16}$/.test(path))return json(res,404,{error:'Página no encontrada.'});
    const [file,type]=asset||['index.html','text/html'];
    const content=options.readAsset?await options.readAsset(file):await readFile(fileURLToPath(new URL(`../public/${file}`,import.meta.url)));
    res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`});res.end(req.method==='HEAD'?undefined:content);
  } catch(e) {if(e instanceof InputError)return json(res,e.status||400,{error:e.message,...(e.field?{field:e.field}:{})});console.error('Solicitud fallida:',e.name);if(!res.headersSent)json(res,500,{error:'No se pudo completar la operación. Inténtalo de nuevo.'});else res.end();}
});
// Los estados de acceso caducados no se conservan indefinidamente.
await db('DELETE FROM sessions WHERE expires<?',[Date.now()]);
await db('DELETE FROM oauth WHERE expires<?',[Date.now()]);
await db('DELETE FROM entry_trash WHERE expires<?',[Date.now()]);
await db('DELETE FROM users WHERE demo=1 AND created_at<?',[new Date(Date.now()-86400000).toISOString()]);
return server;
}
