import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { lichessAuth, hashChallenge, isAdministrator } from '../server/auth.js';

function fixture(fetcher) {
  const connection=new DatabaseSync(':memory:');
  connection.exec('CREATE TABLE oauth(state TEXT PRIMARY KEY,verifier TEXT,expires INTEGER); CREATE TABLE users(id TEXT PRIMARY KEY,lichess_id TEXT UNIQUE,public_id TEXT,profile TEXT,demo INTEGER,created_at TEXT);');
  const db=async(sql,args=[])=>connection.prepare(sql).all(...args);
  return {connection,auth:lichessAuth({db,origin:'https://chedex.example',clientId:'chedex-tests',fetcher})};
}
test('OAuth PKCE autentica la identidad real y conserva el perfil en siguientes accesos',async()=>{
  let calls=0,verifier;
  const {auth,connection}=fixture(async(url,options)=>{
    calls++;
    if(url.endsWith('/api/token')){assert.equal(options.body.get('redirect_uri'),'https://chedex.example/auth/callback');assert.equal(options.body.get('client_id'),'chedex-tests');verifier=options.body.get('code_verifier');return Response.json({access_token:'secret-test-token'});}
    assert.equal(url,'https://lichess.org/api/account');assert.equal(options.headers.Authorization,'Bearer secret-test-token');
    return Response.json({id:'andresli',username:'AndresLi'});
  });
  try{
    const start=await auth.begin(),url=new URL(start.url);assert.equal(url.origin,'https://lichess.org');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('scope'),'');
    const q=new URLSearchParams({state:start.state,code:'first-code'}),first=await auth.complete(q,start.state);
    assert.equal(hashChallenge(verifier),url.searchParams.get('code_challenge'));assert.equal(first.lichess_id,'andresli');
    connection.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({name:'Mi nombre editado'}),first.id);
    const second=await auth.begin(),again=await auth.complete(new URLSearchParams({state:second.state,code:'next-code'}),second.state);
    assert.equal(first.id,again.id);assert.equal(first.public_id,again.public_id);assert.equal(JSON.parse(again.profile).name,'Mi nombre editado');assert.equal(calls,4);
    assert.equal(connection.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
    assert.doesNotMatch(JSON.stringify(connection.prepare('SELECT * FROM users').all()),/secret-test-token/);
    await assert.rejects(auth.complete(q,start.state));assert.equal(calls,4);
  }finally{connection.close();}
});
test('OAuth bloquea estado ajeno, caducado, denegado y respuestas fallidas',async()=>{
  let calls=0;const {auth,connection}=fixture(async()=>{calls++;return new Response('',{status:401});});
  try{
    const s=await auth.begin(),q=new URLSearchParams({state:s.state,code:'code'});
    await assert.rejects(auth.complete(q,'otra-cookie'));assert.equal(calls,0);
    connection.prepare('UPDATE oauth SET expires=0').run();await assert.rejects(auth.complete(q,s.state));assert.equal(calls,0);
    const denied=await auth.begin();await assert.rejects(auth.complete(new URLSearchParams({state:denied.state,error:'access_denied'}),denied.state));assert.equal(calls,0);
    const bad=await auth.begin();await assert.rejects(auth.complete(new URLSearchParams({state:bad.state,code:'bad'}),bad.state));assert.equal(calls,1);
    assert.equal(connection.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);
  }finally{connection.close();}
});
test('administración solo por identidad Lichess autenticada, nunca por alias o demo',()=>{
  assert.equal(isAdministrator({lichessId:'andresli',demo:false},'AndresLi'),true);
  assert.equal(isAdministrator({lichessId:'otro',profile:{name:'AndresLi',isAdmin:true}},'andresli'),false);
  assert.equal(isAdministrator({lichessId:'andresli',demo:true},'andresli'),false);
  assert.equal(isAdministrator({profile:{name:'AndresLi'}},'andresli'),false);
});
