import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { renderServices } from '../public/service-cards.js';
import { defaultServices } from '../public/services-data.js';
import { legalIdentity } from '../server/legal-config.js';

test('la ayuda por correo está en el HTML público y fuera del panel de acceso oculto',()=>{
  assert.equal(legalIdentity.email,'chedexapp@proton.me');
  const landing=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const account=readFileSync(new URL('../public/account.html',import.meta.url),'utf8');
  for(const html of [landing,account]){
    assert.match(html,/<aside class="support-notice"[\s\S]*?href="mailto:chedexapp@proton\.me">chedexapp@proton\.me<\/a>/);
    assert.match(html,/copia la dirección/);
  }
  assert.ok(account.indexOf('class="support-notice"')<account.indexOf('id="account-login"'));
  assert.doesNotMatch(account,/También puedes contactar sin registrarte/);
  const dialog=account.slice(account.indexOf('<dialog id="request-dialog"'));
  assert.match(dialog,/href="mailto:chedexapp@proton\.me"/);
});

test('los contactos de la portada y las tarjetas conservan navegación normal si falla el script',()=>{
  const landing=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const contacts=[...landing.matchAll(/<([a-z]+)\b([^>]*\bdata-contact=[^>]*)>/g)];
  assert.ok(contacts.length>=1);
  assert.match(landing,/<a class="header-contact" href="\/cuenta\?solicitud=1">Cuéntanos tu idea/);
  for(const [,tag,attributes] of contacts){assert.equal(tag,'a');assert.match(attributes,/href="\/cuenta"/);}
  const container={innerHTML:''};renderServices(container,defaultServices);
  assert.match(container.innerHTML,/<a href="\/servicios"[^>]*aria-label="Ver detalles de/);
  assert.doesNotMatch(container.innerHTML,/<ul>|data-contact=/);
  assert.doesNotMatch(container.innerHTML,/<button[^>]*data-contact=/);
});

test('las fuentes y páginas generadas utilizan el correo nuevo sin referencias al anterior',()=>{
  const previous=['escuelatopchess','gmail.com'].join('@');
  for(const root of ['public','server','scripts','docs','test']){
    for(const file of readdirSync(new URL(`../${root}/`,import.meta.url),{recursive:true})){
      if(!/\.(?:m?js|html|md)$/.test(file))continue;
      const content=readFileSync(new URL(`../${root}/${file.replaceAll('\\','/')}`,import.meta.url),'utf8');
      assert.ok(!content.includes(previous),`Revisar contacto en ${root}/${file}`);
    }
  }
  assert.ok(!readFileSync(new URL('../README.md',import.meta.url),'utf8').includes(previous));
});

test('los precios separan el importe de las condiciones y escapan el contenido editable',()=>{
  const container={innerHTML:''};
  renderServices(container,[{...defaultServices[0],priceText:'90 € · IVA incluido · Pago único'}]);
  assert.match(container.innerHTML,/<span class="service-price">90 €<small>IVA incluido · Pago único<\/small><\/span>/);
  renderServices(container,[{...defaultServices[0],priceText:'<script> · <img onerror="x">'}]);
  assert.doesNotMatch(container.innerHTML,/<script>|<img onerror=/);
  assert.ok(container.innerHTML.includes('&lt;script&gt;'));
  assert.ok(container.innerHTML.includes('&lt;img onerror=&quot;x&quot;&gt;'));
});
