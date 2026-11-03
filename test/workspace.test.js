import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { createApi } from '../server/api.js';
import { initializeStore } from '../server/store.js';

const origin='https://chedex.app';
async function fixture(t) {
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  const db=async(sql,args=[])=>sqlite.prepare(sql).all(...args);await initializeStore(db);
  const now=1900000000000;
  const api=createApi({env:{APP_URL:origin},getDatabase:()=>db,clock:()=>now});
  const cookies={};
  for(const [id,name] of [['andresli','AndresLi'],['alice','Alice'],['bob','Bob']]){
    const token=randomBytes(32).toString('base64url');cookies[id]=`__Host-chedex_admin=${token}`;
    await db('INSERT INTO chedex_v2_users VALUES (?,?,?,?)',[id,name,'{}',now]);
    await db('INSERT INTO chedex_v2_sessions VALUES (?,?,?,?)',[createHash('sha256').update(token).digest('hex'),id,name,now+100000]);
  }
  const call=async(user,path,body,method=body?'POST':'GET',extra={})=>api(new Request(origin+path,{method,headers:{cookie:cookies[user]||'',origin,'Content-Type':'application/json','X-Chedex-Request':'1',...extra},...(body?{body:JSON.stringify(body)}:{})}));
  const create=async(user='alice')=>{
    const r=await call(user,'/api/projects',{title:'Objetivo de Alice',summary:'Conocer posibles centros para dar clases.',need:'Apoyo puntual',ownerId:'bob'});assert.equal(r.status,201);return (await r.json()).project;
  };
  const edit=async(project,body)=>{
    const response=await call('andresli',`/api/admin/projects/${project.id}`,{revision:project.revision,...body},'PUT');assert.equal(response.status,200,await response.clone().text());return (await response.json()).project;
  };
  const task=(internal=true)=>({title:internal?'NOTA_SECRETA':'Preparar presentación',details:internal?'DETALLE_PRIVADO':'Revisar la propuesta juntos.',assignee:'Equipo',due:'2026-12-01',status:'En marcha',internal});
  return {db,call,create,edit,task,api};
}

test('requests belong to the authenticated user and other accounts cannot enumerate or access them',async t=>{
  const {call,create}=await fixture(t);const project=await create();
  assert.equal((await call(null,'/api/projects')).status,401);
  assert.equal((await call('bob',`/api/projects/${project.id}`)).status,404);
  assert.deepEqual((await (await call('bob','/api/projects')).json()).projects,[]);
  assert.equal((await call('bob',`/api/projects/${project.id}/comments`,{revision:1,text:'No access'})).status,404);
  assert.equal((await (await call('alice','/api/projects')).json()).projects[0].id,project.id);
});
test('non-admin accounts cannot change services, people, boards or review moderation',async t=>{
  const {call,create}=await fixture(t);const project=await create();
  for(const path of ['/api/admin/projects','/api/admin/users','/api/admin/reviews','/api/admin/services'])assert.equal((await call('alice',path)).status,403);
  assert.equal((await call('alice',`/api/admin/projects/${project.id}`,{action:'details'},'PUT')).status,403);
});
test('internal tasks, notes and history never reach client detail or lists',async t=>{
  const {call,create,edit,task}=await fixture(t);let p=await create();
  p=await edit(p,{action:'task',task:task()});p=await edit(p,{action:'update',internal:true,text:'NOTA_PRIVADA'});p=await edit(p,{action:'task',task:task(false)});
  for(const path of ['/api/projects',`/api/projects/${p.id}`]){
    const body=await (await call('alice',path)).text();if(path!== '/api/projects') assert.ok(body.includes('Preparar presentación'));assert.ok(!/NOTA_SECRETA|DETALLE_PRIVADO|NOTA_PRIVADA/.test(body));
  }
  const admin=await (await call('andresli',`/api/admin/projects/${p.id}`)).text();assert.ok(admin.includes('NOTA_PRIVADA'));
});
test('client comments are shared and concurrent project updates are rejected',async t=>{
  const {call,create,edit}=await fixture(t);const p=await create();
  const response=await call('alice',`/api/projects/${p.id}/comments`,{revision:p.revision,text:'Disponible el martes',internal:true});assert.equal(response.status,200);
  const data=(await response.json()).project;assert.equal(data.updates[0].internal,false);
  const stale=await call('andresli',`/api/admin/projects/${p.id}`,{revision:p.revision,action:'update',text:'Stale',internal:false},'PUT');assert.equal(stale.status,409);
  const latest=(await (await call('andresli',`/api/admin/projects/${p.id}`)).json()).project;assert.ok(latest.updates.some(u=>u.text==='Disponible el martes'));
});
test('review needs confirmed completed service, consent, ownership and moderation; edits return to pending',async t=>{
  const {call,create,edit}=await fixture(t);let p=await create();const reviewPath=`/api/projects/${p.id}/review`;
  const review={rating:4,text:'Una comunicación muy cercana.',consent:true};assert.equal((await call('alice',reviewPath,review,'PUT')).status,403);
  p=await edit(p,{action:'details',title:p.title,summary:p.summary,need:p.need,stage:'Completado',archived:false,reviewEligible:true});
  assert.equal((await call('alice',reviewPath,{...review,consent:false},'PUT')).status,400);
  assert.equal((await call('bob',reviewPath,review,'PUT')).status,404);
  assert.equal((await call('alice',reviewPath,review,'PUT')).status,200);
  assert.equal((await (await call(null,'/api/reviews')).json()).reviews.length,0);
  const r=(await (await call('andresli','/api/admin/reviews')).json()).reviews[0];
  assert.equal((await call('andresli',`/api/admin/reviews/${r.id}`,{status:'approved',expectedText:r.text,expectedRating:r.rating,expectedCreatedAt:r.created_at},'PUT')).status,200);
  const publicReview=(await (await call(null,'/api/reviews')).json()).reviews[0];assert.equal(publicReview.username,'Alice');assert.equal(publicReview.owner_id,undefined);assert.equal(publicReview.project_id,undefined);
  await call('alice',reviewPath,{...review,text:'Una opinión actualizada.'},'PUT');assert.equal((await (await call(null,'/api/reviews')).json()).reviews.length,0);
  assert.equal((await call('andresli',`/api/admin/reviews/${r.id}`,{status:'approved',expectedText:r.text,expectedRating:r.rating,expectedCreatedAt:r.created_at},'PUT')).status,409);
});
test('project mutations require CSRF protection and validate task visibility, dates and status',async t=>{
  const {call,create,task}=await fixture(t);const p=await create();
  const body={revision:p.revision,action:'task',task:task(false)};
  assert.equal((await call('andresli',`/api/admin/projects/${p.id}`,body,'PUT',{origin:'https://evil.example'})).status,403);
  assert.equal((await call('alice',`/api/projects/${p.id}/comments`,{revision:1,text:'Test'},'POST',{'X-Chedex-Request':''})).status,403);
  for(const changes of [{status:'fake'},{internal:'false'},{due:'2026-02-30'},{id:'missing'}]){
    const response=await call('andresli',`/api/admin/projects/${p.id}`,{...body,task:{...body.task,...changes}},'PUT');assert.ok([400,404].includes(response.status),await response.text());
  }
});
test('profile is private, links are HTTPS and invalid inputs do not persist',async t=>{
  const {call}=await fixture(t);
  const profile={revision:0,bio:'Profesora',goals:'Encontrar un colegio',email:'alice@example.com',links:['https://example.com/perfil']};
  assert.equal((await call('alice','/api/account/profile',profile,'PUT')).status,200);
  const alice=(await (await call('alice','/api/account')).json());assert.equal(alice.profile.email,profile.email);assert.equal(alice.isAdmin,false);
  assert.ok(!(await (await call('bob','/api/account')).text()).includes('alice@example.com'));
  for(const link of ['javascript:alert(1)','http://example.com','https://user:pass@example.com'])assert.equal((await call('alice','/api/account/profile',{...profile,links:[link]},'PUT')).status,400);
});
test('archive keeps history and prevents client comments; data persists across API instances',async t=>{
  const {call,create,edit,db}=await fixture(t);let p=await create();
  p=await edit(p,{action:'details',title:p.title,summary:p.summary,need:p.need,stage:'Acordado',archived:true,reviewEligible:false});
  assert.equal((await call('alice',`/api/projects/${p.id}/comments`,{text:'New',revision:p.revision})).status,400);
  const fresh=createApi({env:{APP_URL:origin},getDatabase:()=>db});
  assert.equal((await fresh(new Request(origin+'/api/reviews'))).status,200);
  assert.equal((await db('SELECT COUNT(*) AS n FROM chedex_v2_projects'))[0].n,1);
});
test('legitimate non-admin Lichess account can sign in without receiving administration access',async t=>{
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());const db=async(sql,args=[])=>sqlite.prepare(sql).all(...args);
  const api=createApi({env:{APP_URL:origin},getDatabase:()=>db,fetcher:async url=>Response.json(url.endsWith('/api/token')?{access_token:'test'}:{id:'alice',username:'Alice'})});
  const begin=await api(new Request(origin+'/auth/lichess?next=cuenta'));const state=new URL(begin.headers.get('location')).searchParams.get('state');
  const cookie=begin.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const response=await api(new Request(`${origin}/auth/callback?state=${state}&code=test`,{headers:{cookie}}));
  assert.equal(response.headers.get('location'),'/cuenta');const session=response.headers.getSetCookie().find(c=>c.startsWith('__Host-chedex_admin='));assert.ok(session);
  const account=await api(new Request(origin+'/api/account',{headers:{cookie:session.split(';')[0]}}));assert.equal((await account.json()).isAdmin,false);
  assert.equal((await api(new Request(origin+'/api/admin/session',{headers:{cookie:session.split(';')[0]}}))).status,403);
});

test('administrator can assign a project only to a registered account and project writes are rate limited',async t=>{
  const {call}=await fixture(t);
  const values={title:'Proyecto asignado',summary:'Objetivo acordado',need:'Acompañamiento',ownerId:'alice'};
  assert.equal((await call('andresli','/api/admin/projects',{...values,ownerId:'missing'})).status,400);
  assert.equal((await call('andresli','/api/admin/projects',values)).status,201);
  assert.equal((await (await call('alice','/api/projects')).json()).projects.length,1);
  const profile={bio:'',goals:'',email:'',links:[]};let response;
  for(let i=0;i<81;i++)response=await call('alice','/api/account/profile',profile,'PUT');
  assert.equal(response.status,429);
});
