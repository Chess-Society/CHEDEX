import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readJson,sessionCookies } from '../server/security.js';

const request=(chunks,headers={})=>Object.assign(Readable.from(chunks),{headers:{'content-type':'application/json',...headers}});

test('cookies HTTPS ligadas al host sin aceptar nombres antiguos',()=>{
  const https=sessionCookies('https://chedex.app');
  assert.equal(https.name('chedex'),'__Host-chedex');
  assert.equal(https.serialize('chedex','test',60),'__Host-chedex=test; HttpOnly; SameSite=Lax; Path=/; Max-Age=60; Secure');
  assert.equal(https.name('chedex_oauth'),'__Host-chedex_oauth');
  assert.doesNotMatch(https.serialize('chedex','test',0),/Domain=/i);
  assert.equal(sessionCookies('http://localhost:3000').name('chedex'),'chedex');
});

test('JSON conserva UTF-8 dividido entre fragmentos y rechaza bytes incorrectos',async()=>{
  const bytes=Buffer.from('{"name":"Peón ♟"}');
  assert.deepEqual(await readJson(request([...bytes].map(byte=>Buffer.from([byte])))),{name:'Peón ♟'});
  await assert.rejects(readJson(request([Buffer.from([123,34,120,34,58,34,255,34,125])])),/Datos no válidos/);
});

test('JSON limita bytes declarados y recibidos y exige objetos y tipo correcto',async()=>{
  await assert.rejects(readJson(request([] ,{'content-length':'500001'})),{status:413});
  await assert.rejects(readJson(request([Buffer.alloc(250000),Buffer.alloc(250001)])),{status:413});
  for(const json of ['null','[]','42','{"broken"'])await assert.rejects(readJson(request([json])),/Datos no válidos/);
  await assert.rejects(readJson(request(['{}'],{'content-type':'application/jsonp'})),/Se requiere JSON/);
});
