import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, profileInput, entryInput, publicView, statistics } from '../server/domain.js';
test('perfil privado por defecto y publicación solo tras confirmar mayoría de edad',()=>{
  const p=defaults('Ana');assert.equal(p.public,false);assert.equal(p.visibility.contact,false);
  assert.throws(()=>profileInput({public:true},p));assert.equal(profileInput({public:true,adultConfirmed:true},p).public,true);
});
test('el propietario no puede declarar una verificación',()=>{
  const entry=entryInput('achievements',{name:'Mi título',date:'2026-01-01',status:'Verificado',source:'https://example.org/results'});
  assert.equal(entry.status,'Con fuente');assert.equal(entryInput('achievements',{name:'Mi título',date:'2026-01-01',status:'Verificado'}).status,'Declarado');
});
test('validación de fechas, puntos, enlaces y enteros',()=>{
  for(const v of [{date:'2026-02-30'},{date:'2026-01-01',points:5,rounds:4},{date:'2026-01-01',points:4},{date:'2026-01-01',source:'javascript:alert(1)'},{date:'2026-01-01',rounds:2.5}])assert.throws(()=>entryInput('tournaments',{name:'Torneo',...v}));
  assert.throws(()=>profileInput({avatar:'data:image/svg+xml;base64,abcd'},defaults('Ana')));
});
test('proyección pública omite datos y estadísticas de secciones ocultas',()=>{
  const p=defaults('Ana');Object.assign(p,{public:true,adultConfirmed:true,contact:'privado@example.org',club:'Club privado'});p.visibility.information=false;p.visibility.tournaments=false;
  const u={id:'abc',publicId:'xyz',profile:p,demo:false},entries=[{kind:'tournaments',data:{points:5,rounds:7,date:'2026-01-01'}}];
  const visible=publicView(u,entries);assert.equal(visible.profile.contact,undefined);assert.equal(visible.profile.club,undefined);assert.equal(visible.entries.length,0);assert.equal(visible.stats.tournaments,0);p.public=false;assert.equal(publicView(u,entries),null);
});
test('estadísticas solo de torneos puntuados, sin inventar partidas',()=>{
  const result=statistics([{kind:'tournaments',data:{date:'2026-01-01',mode:'Blitz',rounds:5,points:3,elo:1500}},{kind:'tournaments',data:{date:'2026-02-01',mode:'Blitz',rounds:9,points:null,elo:null}}]);
  assert.equal(result.percentage,60);assert.equal(result.tournaments,2);assert.equal(result.rounds,5);assert.equal(result.games,null);
});
