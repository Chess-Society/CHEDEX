import { sectionRoutes } from './routes.js';
import { loadServices } from './service-cards.js';
import { enhanceSelects, syncSelects } from './selects.js';
import { initChessScene } from './chess-scene.js';

initChessScene(document.querySelector('.chess-scene'));
document.querySelector('[data-project-skip]')?.addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('contenido').focus();
});

const servicesContainer = document.querySelector('#services-catalog');
const servicesReady = servicesContainer ? loadServices(servicesContainer) : Promise.resolve();

const contactDialog = document.querySelector('#contact-dialog');
const form = document.querySelector('#contact-form');
const menu = document.querySelector('#main-nav');
const menuButton = document.querySelector('.menu-button');
enhanceSelects(form);

document.addEventListener('click', event => {
    const button = event.target.closest('[data-contact]');
    if (!button) return;
    closeMenu();
    form.elements.profile.value = button.dataset.contact || 'Jugador/a';
    form.elements.need.value = button.dataset.need || (button.dataset.contact === 'Empresa u organización' ? 'Colaboración de marca' : 'Orientación inicial');
    syncSelects(form);
    document.querySelector('#form-status').textContent = '';
    contactDialog.showModal();
});
document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.dialog).showModal());
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  menu.classList.toggle('open', open);
});
function closeMenu() {
  menu.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');
}
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const subject = `Solicitud de reunión · Chedex · ${data.get('need')}`;
  const body = `Hola, equipo de Chedex:\n\nMe gustaría concertar una primera reunión.\n\nNombre: ${data.get('name')}\nCorreo de respuesta: ${data.get('email')}\nMotivo: ${data.get('need')}\nFormato preferido: ${data.get('format')}\nDisponibilidad y zona horaria: ${data.get('availability')?.trim() || 'Por acordar'}\n\nQué me gustaría comentar:\n${data.get('message')?.trim() || 'Prefiero comentarlo en la reunión.'}\n\nQuedo pendiente de vuestra respuesta para acordar el día, la hora y el formato. Gracias.`;
  window.location.href = `mailto:escuelatopchess@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.querySelector('#form-status').textContent = 'Revisa y envía la solicitud desde tu aplicación de correo. La reunión quedará pendiente de acordar con TopChess. Si no se abre el correo, escribe a escuelatopchess@gmail.com.';
});

function showPageSection(pathname, behavior = 'instant', focus = false) {
  const section = document.getElementById(sectionRoutes[pathname]);
  if (!section) return;
  section.scrollIntoView({ behavior, block: 'start' });
  if (focus) {
    const heading = section.querySelector('h1, h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  menu.querySelectorAll('a').forEach(link => {
    if (sectionRoutes[new URL(link.href).pathname] === sectionRoutes[pathname]) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || !Object.hasOwn(sectionRoutes, url.pathname) || !document.getElementById(sectionRoutes[url.pathname])) return;
  event.preventDefault();
  closeMenu();
  if (link.hasAttribute('data-skip')) {
    const main = document.getElementById('contenido');
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: 'instant' });
    return;
  }
  if (location.pathname !== url.pathname || location.hash || location.search) history.pushState(null, '', url.pathname);
  showPageSection(url.pathname, matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', true);
});

history.scrollRestoration = 'manual';
window.addEventListener('popstate', () => {
  closeMenu();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  showPageSection(location.pathname, 'instant', true);
});

// Previously shared section links keep working, then become clean paths.
if (location.hash) {
  const legacySection = location.hash.slice(1);
  const path = Object.keys(sectionRoutes).find(path => sectionRoutes[path] === legacySection);
  history.replaceState(null, '', path || location.pathname);
}
Promise.all([document.fonts.ready, servicesReady]).then(() => showPageSection(location.pathname));
