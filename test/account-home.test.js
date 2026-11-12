import test from 'node:test';
import assert from 'node:assert/strict';
import {accountStep,homeProject,nextStep,phase2Offer} from '../public/account-home.js';
import {requestEmail,progressPhase,needs} from '../public/project-data.js';
import {timeline} from '../public/workspace-ui.js';
const base={id:'demo',requestStatus:'Aceptada',stage:'Por hablar',updatedAt:1};
test('cuenta vacía comienza con formulario y llamada sin inventar un envío',()=>{assert.equal(homeProject([]),null);assert.equal(accountStep(null).action,'request');assert.match(accountStep(null).text,/15 minutos/);assert.match(accountStep(null).text,/no te compromete/);});
test('envío indicado por la persona no es recepción confirmada',()=>{const state=accountStep({...base,progressPhase:'Por confirmar'});assert.equal(state.kind,'waiting');assert.match(state.text,/todavía no ha confirmado/);});
test('el seguimiento ignora tareas y mensajes anteriores y usa solo la fase',()=>{const state=accountStep({...base,stage:'En marcha',tasks:[{title:'NO_MOSTRAR'}]});assert.equal(state.kind,'working');assert.doesNotMatch(JSON.stringify(state),/NO_MOSTRAR|conversación/);assert.equal(accountStep({...base,requestStatus:'Denegada',decisionReason:'Sin disponibilidad'}).text,'Sin disponibilidad');assert.equal(accountStep({...base,stage:'Completado'}).kind,'completed');});
test('inicio prioriza seguimientos activos sin alterar la lista',()=>{const rows=[{...base,id:'old',archived:true,updatedAt:10},{...base,id:'new'}];assert.equal(homeProject(rows).id,'new');assert.equal(rows[0].id,'old');});
test('plantillas incluyen modalidad, asunto seguro, contacto y disponibilidad para llamada',()=>{const values={firstName:'Alex',lastName:'Prueba',title:'Idea\r\nOtra línea',summary:'Objetivo concreto',email:'demo@example.com',availability:'Martes 17:00, Madrid'};const prompts=new Set();for(const need of needs){const mail=requestEmail({...values,need},'Demo');assert.equal(mail.to,'chedexapp@proton.me');assert.doesNotMatch(mail.subject,/[\r\n]/);assert.match(mail.body,/15 minutos/);assert.match(mail.body,/Objetivo concreto/);assert.match(mail.body,/Martes 17:00, Madrid/);assert.match(mail.subject,new RegExp(need));prompts.add(mail.body);}assert.equal(prompts.size,needs.length);});
test('línea de tiempo escapa contenido y no usa historial de tareas ni conversación',()=>{const html=timeline({...base,progressPhase:'No seguimos',progressNote:'<script>private</script>',decisionReason:'<img>',history:[{text:'Tarea privada'}]});assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('Tarea privada'));assert.ok(html.includes('No seguimos'));assert.equal(progressPhase({...base,stage:'Acordado'}),'Propuesta acordada');});

test('las modalidades de consultoría son motivos de solicitud con su propia pregunta',()=>{
  for(const need of ['Consultoría puntual','Consultoría estratégica','Acompañamiento estratégico']){
    assert.ok(needs.includes(need),need);
    const email=requestEmail({firstName:'Alex',lastName:'',email:'alex@example.com',need,title:'Mi idea',summary:'Detalle'},'alexli');
    assert.ok(email.subject.includes(need));
    assert.doesNotMatch(email.body,/Mi situación y la orientación que estoy buscando/);
  }
});

test('nextStep dice qué viene después y no hay nada tras un recorrido cerrado',()=>{
  assert.match(nextStep({...base,progressPhase:'Recibida'}),/llamada de 15 minutos/);
  assert.match(nextStep({...base,progressPhase:'En marcha'}),/siguiente paso/);
  assert.equal(nextStep({...base,progressPhase:'Completado'}),'');
  assert.equal(nextStep({...base,progressPhase:'Recibida',archived:true}),'');
  assert.equal(nextStep(null),'');
});

test('phase2Offer propone la fase 2 solo tras completar una consultoría y si no hay ya una consulta de marca personal',()=>{
  const done={...base,id:'a',need:'Consultoría estratégica',progressPhase:'Completado',stage:'Completado'};
  assert.equal(phase2Offer([done]).id,'a');
  assert.equal(phase2Offer([]),null);
  assert.equal(phase2Offer([{...done,progressPhase:'En marcha',stage:'En marcha'}]),null);
  assert.equal(phase2Offer([{...done,archived:true}]),null);
  assert.equal(phase2Offer([{...done,need:'Apoyo puntual'}]),null,'las modalidades de La Chulapa no generan la oferta');
  assert.equal(phase2Offer([done,{...base,id:'b',need:'Apoyo puntual'}]),null,'ya pidió la fase 2');
});
