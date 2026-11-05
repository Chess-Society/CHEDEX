import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { createApi } from '../server/api.js';
import { initializeStore } from '../server/store.js';

async function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  const db = async (sql,args=[])=>sqlite.prepare(sql).all(...args);
  await initializeStore(db);
  const origin='https://chedex.app',cookies={},now=1900000000000;
  for(const user of ['andresli','lachulapa_es','alice','bob']) {
    const token=randomBytes(32).toString('base64url');cookies[user]=`__Host-chedex_admin=${token}`;
    await db('INSERT INTO chedex_v2_users VALUES (?,?,?,?)',[user,user,JSON.stringify({email:'PRIVATE_EMAIL',bio:'PRIVATE_BIO'}),now]);
    await db('INSERT INTO chedex_v2_sessions VALUES (?,?,?,?)',[createHash('sha256').update(token).digest('hex'),user,user,now+100000]);
  }
  const api=createApi({env:{APP_URL:origin},getDatabase:()=>db,clock:()=>now});
  const call=async(user,path,body,method=body?'PUT':'GET',headers={})=>api(new Request(origin+path,{method,headers:{cookie:cookies[user]||'',origin,'Content-Type':'application/json','X-Chedex-Request':'1',...headers},...(body?{body:JSON.stringify(body)}:{})}));
  const response=await call('alice','/api/projects',{title:'Vídeo de presentación',summary:'PRIVATE_SUMMARY',need:'Apoyo puntual',firstName:'PRIVATE_NAME'},'POST');
  const project=(await response.json()).project;
  const settings={action:'settings',teamMembers:['lachulapa_es'],brief:'Preparar un vídeo de 30 segundos.',format:'Vertical',duration:'30 segundos',platform:'Instagram',due:'2026-12-01',materials:[{title:'Guion',url:'https://example.com/guion'}]};
  const edit=async(project,body,user='andresli')=>{
    const response=await call(user,`/api/team/projects/${project.id}`,{revision:project.revision,...body});
    assert.equal(response.status,200,await response.clone().text());return (await response.json()).project;
  };
  return {db,call,project,settings,edit};
}

test('team seed is persistent and privileges are bound to authenticated Lichess identity',async t=>{
  const {db,call}=await fixture(t);
  assert.equal((await (await call('lachulapa_es','/api/account')).json()).teamRole,'editor');
  assert.equal((await call(null,'/api/team/projects')).status,401);
  for(const path of ['/api/admin/team','/api/admin/projects','/api/admin/users','/api/admin/reviews','/api/admin/services']) assert.equal((await call('lachulapa_es',path)).status,403);
  assert.equal((await call('alice','/api/team/projects')).status,403);
  assert.equal((await call('andresli','/api/admin/team/members/andresli',{role:'disabled',revision:0})).status,400);
  await db("UPDATE chedex_v2_team SET role='disabled' WHERE lichess_id='lachulapa_es'");await initializeStore(db);
  assert.equal((await call('lachulapa_es','/api/team/projects')).status,403);
});

test('assigned production projection excludes profiles, client details, private notes and other projects',async t=>{
  const {call,project,settings,edit}=await fixture(t);
  assert.equal((await call('lachulapa_es',`/api/team/projects/${project.id}`)).status,404);
  assert.deepEqual((await (await call('lachulapa_es','/api/team/projects')).json()).projects,[]);
  const response=await call('andresli',`/api/admin/projects/${project.id}`,{revision:project.revision,action:'update',text:'PRIVATE_NOTE',internal:true});
  let p=(await response.json()).project;p=await edit(p,settings);
  for(const path of ['/api/team/projects',`/api/team/projects/${p.id}`]) {
    const body=await (await call('lachulapa_es',path)).text();assert.ok(body.includes('30 segundos'));assert.ok(!/PRIVATE_|ownerId|applicant|teamMembers/.test(body));
  }
  assert.equal((await call('lachulapa_es',`/api/projects/${p.id}`)).status,404);
  const client=await (await call('alice',`/api/projects/${p.id}`)).text();assert.ok(!/production|teamMembers|guion/.test(client));
  assert.equal((await call('lachulapa_es','/api/team/projects?offset=-1')).status,400);
  await edit(p,{...settings,teamMembers:[]});assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`)).status,404);
});

test('production workflow enforces task ownership, final approvals, versions and concurrency',async t=>{
  const {call,project,settings,edit}=await fixture(t);let p=await edit(project,settings);
  p=await edit(p,{action:'task',task:{title:'Primer montaje',details:'Recortar pausas',assignee:'lachulapa_es',due:'2026-12-01'}});
  const taskId=p.production.tasks[0].id;
  p=await edit(p,{action:'status',taskId,status:'En edición'},'lachulapa_es');
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,action:'status',taskId,status:'Aprobado'})).status,400);
  p=await edit(p,{action:'delivery',title:'Versión 1',url:'https://example.com/video-v1',notes:'Primer montaje'},'lachulapa_es');
  const deliveryId=p.production.deliveries[0].id;
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,action:'review',deliveryId,status:'Aprobado'})).status,403);
  p=await edit(p,{action:'review',deliveryId,status:'Cambios solicitados'});
  p=await edit(p,{action:'comment',text:'00:42: recortar la pausa',deliveryId});
  p=await edit(p,{action:'delivery',title:'Versión 2',url:'https://example.com/video-v2'},'lachulapa_es');
  assert.equal(p.production.deliveries.length,2);assert.equal(p.production.comments[0].deliveryId,deliveryId);
  p=await edit(p,{action:'review',deliveryId:p.production.deliveries[1].id,status:'Aprobado'});
  const stale=p.revision;p=await edit(p,{action:'status',taskId,status:'Aprobado'});
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,action:'status',taskId,status:'En edición'})).status,403);
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:stale,action:'comment',text:'Obsoleto'})).status,409);
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,...settings})).status,403);
});

test('roles can be prepared, changed and revoked immediately without allowing privilege escalation',async t=>{
  const {call,project,settings,edit}=await fixture(t);
  assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'collaborator',revision:0})).status,200);
  assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'editor',revision:0})).status,409);
  assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'owner',revision:1})).status,400);
  let p=await edit(project,{...settings,teamMembers:['lachulapa_es','bob']});
  p=await edit(p,{action:'task',task:{title:'Revisar guion',assignee:'bob',due:''}});
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,action:'status',taskId:p.production.tasks[0].id,status:'En edición'})).status,403);
  assert.equal((await call('bob',`/api/team/projects/${p.id}`,{revision:p.revision,action:'delivery',title:'Intento',url:'https://example.com/video'})).status,403);
  p=await edit(p,{action:'comment',text:'Guion revisado'},'bob');
  assert.equal((await call('bob','/api/admin/team/members/bob',{role:'editor',revision:1})).status,403);
  assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'disabled',revision:1})).status,200);
  assert.equal((await call('bob',`/api/team/projects/${p.id}`)).status,403);
  assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'editor',revision:1})).status,409);
});

test('production validates links, members, dates, CSRF and archives',async t=>{
  const {call,project,settings,edit}=await fixture(t);let p=await edit(project,settings);
  for(const changes of [{teamMembers:['alice']},{due:'2026-02-30'},{materials:[{title:'Mal',url:'javascript:alert(1)'}]},{materials:[{title:'Mal',url:'https://user:pass@example.com'}]}]) {
    assert.equal((await call('andresli',`/api/team/projects/${p.id}`,{revision:p.revision,...settings,...changes})).status,400);
  }
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,action:'delivery',title:'Mal',url:'http://example.com'})).status,400);
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision,action:'comment',text:'CSRF'},'PUT',{origin:'https://evil.example'})).status,403);
  assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'editor',revision:0},'PUT',{'X-Chedex-Request':''})).status,403);
  const response=await call('andresli',`/api/admin/projects/${p.id}`,{revision:p.revision,action:'details',title:p.title,summary:'Archivado',need:'Apoyo puntual',stage:'Acordado',archived:true,reviewEligible:false});assert.equal(response.status,200);
  assert.equal((await call('lachulapa_es',`/api/team/projects/${p.id}`,{revision:p.revision+1,action:'comment',text:'Nuevo'})).status,400);
});

test('team sessions support normal logout and editor OAuth lands in the team panel',async t=>{
  const {call}=await fixture(t);
  assert.equal((await call('lachulapa_es','/api/logout',{},'POST')).status,200);
  assert.equal((await call('lachulapa_es','/api/team/projects')).status,401);
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());const db=async(sql,args=[])=>sqlite.prepare(sql).all(...args);
  const origin='https://chedex.app';
  const api=createApi({env:{APP_URL:origin},getDatabase:()=>db,fetcher:async url=>Response.json(url.endsWith('/api/token')?{access_token:'test'}:{id:'lachulapa_es',username:'lachulapa_es'})});
  const begin=await api(new Request(origin+'/auth/lichess'));
  const state=new URL(begin.headers.get('location')).searchParams.get('state');
  const cookie=begin.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const response=await api(new Request(`${origin}/auth/callback?state=${state}&code=test`,{headers:{cookie}}));
  assert.equal(response.headers.get('location'),'/admin');
});

test('designer roles migrate safely, delegate in one action and deliver only within assigned work',async t=>{
 const {db,call,project,edit}=await fixture(t);
 assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'designer',revision:0})).status,200);
 assert.equal((await (await call('bob','/api/account')).json()).teamRole,'designer');
 let p=await edit(project,{action:'delegate',assignee:'bob',title:'Diseñar portada',details:'Una portada para el vídeo',due:'2026-12-01'});
 assert.deepEqual(p.teamMembers,['bob']);assert.equal(p.production.tasks.length,1);
 const taskId=p.production.tasks[0].id;
 assert.equal((await call('bob','/api/admin/users')).status,403);
 assert.equal((await call('bob','/api/admin/team')).status,403);
 const directory=(await (await call('andresli','/api/admin/users')).json()).users;
 assert.equal(directory.find(u=>u.id==='bob').role,'designer');assert.equal(directory.find(u=>u.id==='bob').assignedCount,1);assert.equal(directory.find(u=>u.id==='alice').role,'user');
 assert.equal((await call('bob',`/api/team/projects/${p.id}`,{action:'delegate',assignee:'lachulapa_es',title:'No',revision:p.revision})).status,403);
 p=await edit(p,{action:'delivery',title:'Portada v1',url:'https://example.com/portada',kind:'Diseño',taskId},'bob');
 assert.equal(p.production.deliveries[0].kind,'Diseño');assert.equal(p.production.tasks[0].status,'Para revisar');
 p=await edit(p,{action:'review',deliveryId:p.production.deliveries[0].id,status:'Cambios solicitados'});assert.equal(p.production.tasks[0].status,'Cambios solicitados');
 p=await edit(p,{action:'delivery',title:'Portada v2',url:'https://example.com/portada2',taskId},'bob');
 p=await edit(p,{action:'review',deliveryId:p.production.deliveries[0].id,status:'Aprobado'});assert.equal(p.production.tasks[0].status,'Para revisar');
 p=await edit(p,{action:'review',deliveryId:p.production.deliveries[1].id,status:'Aprobado'});assert.equal(p.production.tasks[0].status,'Aprobado');
 assert.equal((await call('bob',`/api/team/projects/${p.id}`,{action:'delivery',title:'No',url:'https://example.com/no',taskId,revision:p.revision})).status,403);
 assert.equal((await call('andresli','/api/admin/team/members/bob',{role:'disabled',revision:1})).status,200);
 await initializeStore(db);assert.equal((await call('bob','/api/team/projects')).status,403);
});

test('an older team schema gains designer support without rewriting roles or revisions',async t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 sqlite.exec("CREATE TABLE chedex_v2_team (lichess_id TEXT PRIMARY KEY,role TEXT NOT NULL CHECK(role IN ('editor','collaborator','disabled')),revision INTEGER NOT NULL DEFAULT 1); INSERT INTO chedex_v2_team VALUES ('existing','disabled',7)");
 const db=async(sql,args=[])=>sqlite.prepare(sql).all(...args);
 await initializeStore(db);await initializeStore(db);
 const row=(await db("SELECT * FROM chedex_v2_team WHERE lichess_id='existing'"))[0];assert.equal(row.role,'disabled');assert.equal(row.revision,7);assert.equal(row.specialty,'');
});
