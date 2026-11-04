import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createApi } from '../server/api.js';
import { initializeStore } from '../server/store.js';
import { decisionCard, appointmentCard } from '../public/appointments-ui.js';
import worker from '../worker/index.js';

async function fixture(t) {
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  const db=async(sql,args=[])=>sqlite.prepare(sql).all(...args);await initializeStore(db);
  let now=Date.UTC(2026,10,3,12);
  const api=createApi({env:{APP_URL:'https://chedex.app'},getDatabase:()=>db,clock:()=>now}),cookies={};
  for(const user of ['andresli','alice','bob']){
    const token=randomBytes(32).toString('base64url');cookies[user]=`__Host-chedex_admin=${token}`;
    await db('INSERT INTO chedex_v2_users VALUES (?,?,?,?)',[user,user,'{}',now]);
    await db('INSERT INTO chedex_v2_sessions VALUES (?,?,?,?)',[createHash('sha256').update(token).digest('hex'),user,user,now+365*86400000]);
  }
  const call=(user,path,body,method=body?'POST':'GET',headers={})=>api(new Request('https://chedex.app'+path,{method,headers:{cookie:cookies[user]||'',origin:'https://chedex.app','Content-Type':'application/json','X-Chedex-Request':'1',...headers},...(body?{body:JSON.stringify(body)}:{})}));
  const request={firstName:'Ana',lastName:'Pérez López',title:'Clases de ajedrez',summary:'Llevar clases a mi colegio.',need:'Apoyo puntual'};
  const expect=async(response,status=200)=>{assert.equal(response.status,status,await response.clone().text());return response.json();};
  const create=async(user='alice',extra={})=>(await expect(await call(user,'/api/projects',{...request,...extra}),201)).project;
  const decide=async(p,state='Aceptada',reason='')=>(await expect(await call('andresli',`/api/admin/projects/${p.id}`,{action:'decision',revision:p.revision,requestStatus:state,reason},'PUT'))).project;
  const slot=async(offset=86400000)=>(await expect(await call('andresli','/api/admin/slots',{starts:now+offset,ends:now+offset+1800000}),201)).slot;
  const book=(p,s,user='alice',extra={})=>call(user,`/api/projects/${p.id}/appointment`,{slotId:s.id,email:`${user}@example.com`,revision:p.revision,...extra});
  return {db,call,expect,create,decide,slot,book,request,advance:amount=>now+=amount};
}

test('solicitud con nombre, apellidos opcionales y revisión separada del proyecto; decisiones privadas',async t=>{
  const f=await fixture(t);
  assert.equal((await f.call('alice','/api/projects',{...f.request,firstName:''})).status,400);
  let p=await f.create('alice',{lastName:''});assert.equal(p.requestStatus,'Pendiente de revisión');assert.equal(p.applicant.lastName,'');
  p=await f.decide(p,'En evaluación');p=await f.decide(p,'Denegada','No podemos asumir este alcance.');
  const detail=await f.expect(await f.call('alice',`/api/projects/${p.id}`));
  assert.equal(detail.project.decisionReason,'No podemos asumir este alcance.');assert.equal(detail.project.stage,'Por hablar');
  assert.equal((await f.call('bob',`/api/projects/${p.id}`)).status,404);
  assert.equal((await f.call('alice',`/api/admin/projects/${p.id}`,{action:'decision',revision:p.revision,requestStatus:'Aceptada'},'PUT')).status,403);
  assert.equal((await f.call('alice',`/api/projects/${p.id}/slots`)).status,403);
  p=await f.decide(p);assert.equal(p.decisionReason,'');
});

test('agenda solo administrable por el equipo; valida fechas, solapamientos, duración y origen',async t=>{
  const f=await fixture(t),s=await f.slot();
  assert.equal((await f.call('alice','/api/admin/slots')).status,403);
  assert.equal((await f.call(null,'/api/admin/slots')).status,401);
  for(const values of [{starts:s.starts+60000,ends:s.ends+60000},{starts:s.starts,ends:s.ends}])assert.equal((await f.call('andresli','/api/admin/slots',values)).status,409);
  for(const values of [{starts:1,ends:1800001},{starts:s.ends,ends:s.ends+1000},{starts:s.starts+181*86400000,ends:s.ends+181*86400000}])assert.equal((await f.call('andresli','/api/admin/slots',values)).status,400);
  assert.equal((await f.call('andresli','/api/admin/slots',{starts:s.ends,ends:s.ends+1800000},'POST',{origin:'https://evil.example'})).status,403);
  assert.equal((await f.call('andresli','/api/admin/slots',{starts:s.ends,ends:s.ends+1800000})).status,201);
});

test('solo una solicitud aceptada puede ver horarios y reservar; no expone datos de otras reservas',async t=>{
  const f=await fixture(t);let p=await f.create();const s=await f.slot();
  assert.equal((await f.book(p,s)).status,409);
  p=await f.decide(p);
  assert.equal((await f.call('bob',`/api/projects/${p.id}/slots`)).status,404);
  assert.equal((await f.book(p,s,'bob')).status,404);
  assert.equal((await f.book(p,s,'alice',{email:'x\r\nBcc:evil@example.com'})).status,400);
  const result=await f.expect(await f.book(p,s),201);assert.equal(result.appointment.status,'booked');
  const q=await f.decide(await f.create('bob',{firstName:'Otra',lastName:'Persona'}));
  const available=await f.expect(await f.call('bob',`/api/projects/${q.id}/slots`));assert.deepEqual(available.slots,[]);
  const text=JSON.stringify(await f.expect(await f.call('bob',`/api/projects/${q.id}`)));assert.doesNotMatch(text,/alice@example|Pérez/);
});

test('reservas simultáneas no duplican hueco ni cita por proyecto',async t=>{
  const f=await fixture(t),p=await f.decide(await f.create()),q=await f.decide(await f.create('bob')),s=await f.slot(),s2=await f.slot(2*86400000);
  const responses=await Promise.all([f.book(p,s),f.book(q,s,'bob')]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
  const winner=responses[0].status===201?p:q,user=responses[0].status===201?'alice':'bob';
  assert.equal((await f.book(winner,s2,user)).status,409);
  assert.equal((await f.db("SELECT COUNT(*) AS n FROM chedex_v2_appointments WHERE status='booked'"))[0].n,1);
});

test('reserva, decisión y archivo se excluyen atómicamente; revisión obsoleta no reserva',async t=>{
  const f=await fixture(t),p=await f.decide(await f.create()),s=await f.slot();
  assert.equal((await f.book(p,s,'alice',{revision:1})).status,409);
  const responses=await Promise.all([f.book(p,s),f.call('andresli',`/api/admin/projects/${p.id}`,{action:'decision',revision:p.revision,requestStatus:'Denegada',reason:''},'PUT')]);
  assert.ok(responses.some(r=>r.status===409));
  const data=await f.expect(await f.call('alice',`/api/projects/${p.id}`));
  assert.ok(data.project.requestStatus==='Aceptada'||data.appointment===null);
  if(data.appointment){
    assert.equal((await f.call('andresli',`/api/admin/projects/${p.id}`,{action:'details',revision:p.revision,title:p.title,summary:p.summary,need:p.need,stage:p.stage,archived:true,reviewEligible:false},'PUT')).status,409);
  }
});

test('enlace externo solo por administrador; cancelación libera hueco y permite nueva reserva',async t=>{
  const f=await fixture(t),p=await f.decide(await f.create()),s=await f.slot();
  let a=(await f.expect(await f.book(p,s),201)).appointment;
  const path=`/api/admin/projects/${p.id}/appointment`;
  for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@example.com'])assert.equal((await f.call('andresli',path,{id:a.id,revision:a.revision,action:'link',meetingUrl:url},'PUT')).status,400);
  assert.equal((await f.call('alice',`/api/projects/${p.id}/appointment`,{id:a.id,revision:a.revision,action:'link',meetingUrl:'https://example.com/meet'},'PUT')).status,400);
  assert.equal((await f.call('andresli',`/api/admin/slots/${s.id}`,{enabled:false,revision:s.revision},'PUT')).status,409);
  a=(await f.expect(await f.call('andresli',path,{id:a.id,revision:a.revision,action:'link',meetingUrl:'https://example.com/meet'},'PUT'))).appointment;
  assert.equal((await f.expect(await f.call('alice',`/api/projects/${p.id}`))).appointment.meetingUrl,'https://example.com/meet');
  assert.equal((await f.call('alice',`/api/projects/${p.id}/appointment`,{id:a.id,revision:1,action:'cancel'},'PUT')).status,409);
  await f.expect(await f.call('alice',`/api/projects/${p.id}/appointment`,{id:a.id,revision:a.revision,action:'cancel'},'PUT'));
  assert.equal((await f.book(p,s)).status,201);
  assert.equal((await f.db('SELECT COUNT(*) AS n FROM chedex_v2_appointments'))[0].n,2);
});

test('horarios ocultos o pasados no pueden reservarse y una cita iniciada no se cancela',async t=>{
  const f=await fixture(t),p=await f.decide(await f.create()),s=await f.slot();
  const hidden=(await f.expect(await f.call('andresli',`/api/admin/slots/${s.id}`,{enabled:false,revision:s.revision},'PUT'))).slot;
  assert.equal((await f.book(p,s)).status,409);
  await f.expect(await f.call('andresli',`/api/admin/slots/${s.id}`,{enabled:true,revision:hidden.revision},'PUT'));
  const a=(await f.expect(await f.book(p,s),201)).appointment;f.advance(86400001);
  assert.equal((await f.call('alice',`/api/projects/${p.id}/appointment`,{id:a.id,revision:a.revision,action:'cancel'},'PUT')).status,409);
});

test('la landing mantiene la solicitud privada y un correo alternativo de ayuda; componentes seguros y módulo servido por Worker',async()=>{
  const landing=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(landing,/<a href="\/cuenta"[^>]*data-contact=/);
  assert.match(landing,/href="mailto:chedexapp@proton\.me"/);
  for(const file of ['index.html','app.js'])assert.doesNotMatch(readFileSync(new URL('../public/'+file,import.meta.url),'utf8'),/contact-form/);
  assert.match(decisionCard({requestStatus:'Denegada',decisionReason:'<script>x</script>',applicant:{firstName:'<img>',lastName:''}}),/&lt;script&gt;/);
  assert.doesNotMatch(decisionCard({requestStatus:'Denegada',decisionReason:'<script>x</script>'}),/<script>/);
  assert.match(appointmentCard({requestStatus:'Aceptada'},null),/Todavía no hay/);
  assert.equal((await worker.fetch(new Request('https://chedex.app/appointments-ui.js'),{ASSETS:{fetch:()=>new Response('asset')}})).status,200);
});

test('archivar desde usuario o administración exige cancelar primero una cita activa',async t=>{
 const f=await fixture(t);let p=await f.decide(await f.create());const slot=await f.slot();await f.expect(await f.book(p,slot),201);
 p=(await f.expect(await f.call('alice',`/api/projects/${p.id}`))).project;
 for(const [user,prefix] of [['alice',''],['andresli','admin/']])assert.equal((await f.call(user,`/api/${prefix}projects/${p.id}`,{action:'archive',archived:true,revision:p.revision},'PUT')).status,409);
 assert.equal((await f.expect(await f.call('alice',`/api/projects/${p.id}`))).project.archived,false);
});
