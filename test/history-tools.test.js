import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterHistory,historyOptions,tournamentDraft } from '../public/history-tools.js';

test('busca sin distinguir acentos y filtra temporada, modalidad y puntuación',()=>{
  const entries=[
    {id:'a',kind:'tournaments',data:{name:'Abierto de Peñíscola',date:'2026-05-01',mode:'Rápidas',points:3,rounds:5}},
    {id:'b',kind:'tournaments',data:{name:'Liga',date:'2025-01-01',mode:'Blitz',points:null,rounds:null}},
    {id:'c',kind:'achievements',data:{name:'Premio',date:'2026-06-01'}}
  ];
  assert.deepEqual(filterHistory(entries,{search:'PENISCOLA'}).map(e=>e.id),['a']);
  assert.deepEqual(filterHistory(entries,{year:'2026',mode:'Rápidas',scored:true}).map(e=>e.id),['a']);
  assert.deepEqual(filterHistory(entries,{sort:'oldest'}).map(e=>e.id),['b','a','c']);
  assert.deepEqual(filterHistory(entries,{kind:'achievements'}).map(e=>e.id),['c']);
  assert.deepEqual(entries.map(e=>e.id),['a','b','c']);
});

test('valida filtros y no interpreta instrucciones SQL como criterios estructurales',()=>{
  for(const query of ['offset=-1','offset=NaN','offset=10001','year=abc','mode=Bullet','sort=DROP','kind=users'])assert.throws(()=>historyOptions(new URLSearchParams(query)));
  assert.equal(historyOptions(new URLSearchParams('search=%27%20OR%201%3D1')).search,"' OR 1=1");
});

test('duplicar conserva contexto y descarta resultados, Elo, fuente y notas',()=>{
  const draft=tournamentDraft({name:'Liga',date:'2025-01-01',mode:'Blitz',city:'Madrid',organizer:'Club',timeControl:'3+2',points:7,rounds:9,position:1,participants:20,elo:1800,source:'https://example.org',notes:'Resultado anterior'},'2026-11-02');
  assert.deepEqual(draft,{name:'Liga',date:'2026-11-02',mode:'Blitz',city:'Madrid',organizer:'Club',timeControl:'3+2'});
  assert.equal(tournamentDraft(null,'2026-11-02','Blitz').mode,'Blitz');
});
