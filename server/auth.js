import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { defaults } from './domain.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const matches = (a,b) => typeof a==='string' && typeof b==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function isAdministrator(user, ids = process.env.LICHESS_ADMIN_IDS || 'andresli') {
  return !user.demo && typeof user.lichessId==='string' && ids.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(user.lichessId.toLowerCase());
}
export function lichessAuth({db,origin,clientId,fetcher=fetch}) {
  const redirectUri=`${origin}/auth/callback`;
  return {
    async begin() {
      const state=random(), verifier=random();
      await db('DELETE FROM oauth WHERE expires<?',[Date.now()]);
      await db('INSERT INTO oauth VALUES(?,?,?)',[hash(state),verifier,Date.now()+600000]);
      const url=new URL('https://lichess.org/oauth');
      url.search=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:redirectUri,state,code_challenge:hashChallenge(verifier),code_challenge_method:'S256',scope:''}).toString();
      return {state,url:url.href};
    },
    async complete(query,browserState) {
      const state=query.get('state');
      if(!state || !matches(state,browserState))throw new Error('OAUTH_STATE');
      const saved=(await db('DELETE FROM oauth WHERE state=? AND expires>? RETURNING verifier',[hash(state),Date.now()]))[0];
      if(!saved || !query.get('code') || query.has('error'))throw new Error('OAUTH_EXPIRED_OR_DENIED');
      const tokenResponse=await fetcher('https://lichess.org/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:query.get('code'),code_verifier:saved.verifier,client_id:clientId,redirect_uri:redirectUri}),signal:AbortSignal.timeout(15000)});
      if(!tokenResponse.ok)throw new Error('OAUTH_TOKEN');
      const token=await tokenResponse.json();
      if(typeof token.access_token!=='string' || !token.access_token)throw new Error('OAUTH_TOKEN');
      const response=await fetcher('https://lichess.org/api/account',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('OAUTH_ACCOUNT');
      const account=await response.json();
      if(typeof account.id!=='string' || !/^[a-z0-9_-]{2,40}$/i.test(account.id))throw new Error('OAUTH_ACCOUNT');
      const accountId=account.id.toLowerCase();
      const profile=defaults(typeof account.username==='string'?account.username.slice(0,70):accountId);
      profile.lichess=`https://lichess.org/@/${encodeURIComponent(accountId)}`;
      // El ID procede de la respuesta autenticada de Lichess, nunca del alias editable.
      // INSERT OR IGNORE permite dos retornos simultáneos sin sobrescribir el historial.
      await db('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?,?)',[randomUUID(),accountId,random().slice(0,16),JSON.stringify(profile),0,new Date().toISOString()]);
      return (await db('SELECT * FROM users WHERE lichess_id=?',[accountId]))[0];
    }
  };
}
export const hashChallenge = verifier => createHash('sha256').update(verifier).digest('base64url');
