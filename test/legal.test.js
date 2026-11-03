import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';
import { documentRoutes } from '../public/routes.js';

test('legal pages have standalone canonical routes and their HTML assets cannot be requested directly',async()=>{
  for(const path of ['/aviso-legal','/privacidad','/cookies','/terminos']){
    const response=await worker.fetch(new Request('https://chedex.app'+path),{ASSETS:{fetch:request=>{assert.equal(new URL(request.url).pathname,'/'+documentRoutes[path]);return new Response('Legal');}}});
    assert.equal(response.status,200);
    const canonical=await worker.fetch(new Request('https://chedex.app'+path+'/'),{});assert.equal(canonical.headers.get('location'),'https://chedex.app'+path);
    assert.equal((await worker.fetch(new Request('https://chedex.app/'+documentRoutes[path]),{})).status,404);
  }
});
test('legal footer and privacy information are available on public and private entry points',()=>{
  for(const file of ['index.html','projects.html','account.html','admin.html','reviews.html',...['/aviso-legal','/privacidad','/cookies','/terminos'].map(path=>documentRoutes[path])]){
    const html=readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
    for(const path of ['/aviso-legal','/privacidad','/cookies','/terminos'])assert.ok(html.includes(`href="${path}"`),file+path);
    assert.ok(html.includes('data-cookie-settings'),file);
    assert.ok(html.includes('/cookie-ui.js'),file);
    assert.doesNotMatch(html,/href="#/);
  }
});
test('fonts are self-hosted and their assets and licence are reachable without weakening private-page CSP',async()=>{
  const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');assert.doesNotMatch(css,/fonts\.(googleapis|gstatic)\.com/);assert.match(css,/\/fonts\/dm-sans-latin\.woff2/);
  for(const path of ['/fonts/dm-sans-latin.woff2','/fonts/dm-sans-latin-ext.woff2','/fonts/OFL.txt','/legal.css','/cookie-ui.js','/legal.js']){
    assert.equal((await worker.fetch(new Request('https://chedex.app'+path),{ASSETS:{fetch:()=>new Response('asset')}})).status,200,path);
  }
  const account=await worker.fetch(new Request('https://chedex.app/cuenta'),{ASSETS:{fetch:()=>new Response('Private')}});
  assert.ok(account.headers.get('content-security-policy').includes("font-src 'self'"));assert.ok(!account.headers.get('content-security-policy').includes('google'));
});
