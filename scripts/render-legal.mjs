import { readFile, writeFile } from 'node:fs/promises';
import { legalDocuments, legalRevision } from '../server/legal-content.js';
import { legalIdentity } from '../server/legal-config.js';

const base = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const revisionLabel = new Intl.DateTimeFormat('es-ES', { dateStyle:'long', timeZone:'UTC' }).format(new Date(`${legalRevision}T00:00:00Z`));
let header = base.slice(base.indexOf('<header class="site-header">'), base.indexOf('<main id="contenido"'));
header = header.replace(/<button class="header-contact"[\s\S]*?<\/button>/, '<a class="header-contact" href="/cuenta">Cuéntanos tu idea</a>').replace(/<button class="nav-mobile-contact"[\s\S]*?<\/button>/, '<a class="nav-mobile-contact" href="/cuenta">Cuéntanos tu idea</a>');
const footer = `<footer><div class="container"><div class="footer-main"><a class="logo" href="/" aria-label="Chedex, inicio"><span class="logo-badge" aria-hidden="true"><span class="brand-mark"></span></span><span class="wordmark">che<span class="wordmark-accent">dex</span></span></a><p>Cercanía para escucharte.<br>Claridad para avanzar.</p><span class="powered">Impulsado por <strong>TopChess</strong></span></div></div><div class="container legal-footer"><div><p class="eyebrow">Legal</p><p class="legal-footer-note">Las cosas claras, también aquí.</p></div><nav class="legal-links" aria-label="Información legal">${legalDocuments.map(doc=>`<a href="${doc.path}">${doc.title}</a>`).join('')}<button data-cookie-settings>Configurar cookies</button></nav></div></footer>`;

for (const doc of legalDocuments) {
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#0b0c0e"><meta name="description" content="${esc(doc.intro)}">
  <title>Chedex | ${esc(doc.title)}</title>
  <link rel="icon" href="/chedex-icon.svg" type="image/svg+xml"><link rel="canonical" href="https://chedex.app${doc.path}">
  <link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/legal.css">
  <script type="module" src="/portal-nav.js"></script><script type="module" src="/legal.js"></script><script type="module" src="/cookie-ui.js"></script>
  <link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/app-icon-192.png"><link rel="stylesheet" href="/pwa.css"><script src="/pwa.js" type="module"></script>
</head>
<body>
${header}
<main class="container legal-main">
  <header class="legal-intro">
    <p class="eyebrow">Chedex / Información legal</p>
    <h1>${esc(doc.title)}</h1><p>${esc(doc.intro)}</p>
    <div class="legal-update"><span>Última revisión: <time datetime="${legalRevision}">${revisionLabel}</time></span><button data-print-legal>Imprimir documento</button></div>
  </header>
  <nav class="legal-doc-tabs" aria-label="Documentos legales">${legalDocuments.map(other=>`<a href="${other.path}"${other.path===doc.path?' aria-current="page"':''}>${other.title}</a>`).join('')}</nav>
  <section class="legal-summary" aria-label="Aspectos principales"><p class="eyebrow">Aspectos principales</p><ul>${doc.summary.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>
  <div class="legal-layout">
    <aside class="legal-index" aria-label="Índice del documento"><p class="eyebrow">Contenido</p>
      ${doc.sections.map(([id,title],index)=>`<button data-legal-section="${id}"${index===0?' aria-current="location"':''}><span>${String(index+1).padStart(2,'0')}</span>${esc(title)}</button>`).join('')}
      <a class="legal-contact-link" href="mailto:${esc(legalIdentity.email)}">Consultas legales y privacidad<span>${esc(legalIdentity.email)}</span></a>
      <p class="legal-contact-note">Las propuestas se atienden desde <a href="/cuenta">tu espacio privado</a>.</p>
    </aside>
    <article class="legal-document" aria-label="${esc(doc.title)}">
      ${doc.sections.map(([id,title,content],index)=>`<section id="legal-${id}" aria-labelledby="heading-${id}"><h2 id="heading-${id}"><span class="legal-section-number">${String(index+1).padStart(2,'0')}.</span> ${esc(title)}</h2>${content}</section>`).join('\n')}
    </article>
  </div>
</main>
${footer}
</body></html>`;
  await writeFile(new URL(`../public/${doc.file}`, import.meta.url), html, 'utf8');
}
console.log('Cuatro páginas legales preparadas.');
