import './button-effects.js';
import { initTeam } from './team-workspace.js';
import { icon } from './icons.js';
import { initAdminWorkspace } from './admin-workspace.js';
import { serviceProfiles, serviceNeeds } from './services-data.js';
import { enhanceSelects } from './selects.js';

const status = document.querySelector('#admin-status');
const panel = document.querySelector('#admin-panel');
const login = document.querySelector('#admin-login');
const catalog = document.querySelector('#admin-catalog');
const save = document.querySelector('#admin-save');
let workspace, team;
let services = [], revision = 0, dirty = false, busy = false;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function changed() { dirty = true; save.disabled = busy; message('Hay cambios sin guardar.'); }
async function request(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', 'X-Chedex-Request': '1', ...options.headers } });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) { login.hidden = false; panel.hidden = true; }
    throw new Error(data.error || 'No se ha podido completar la operación.');
  }
  return data;
}
const field = (label, key, value, max, wide = false) => `<label${wide ? ' class="wide"' : ''}>${label}<input data-field="${key}" value="${escape(value)}" maxlength="${max}" required></label>`;
const select = (label, key, value, choices) => `<label>${label}<select data-field="${key}">${choices.map(([id, text]) => `<option value="${escape(id)}"${value === id ? ' selected' : ''}>${escape(text)}</option>`).join('')}</select></label>`;
function render() {
  catalog.innerHTML = services.map((service, index) => `<article class="admin-editor" data-index="${index}"><div class="admin-editor-heading"><div><p class="eyebrow">${service.published ? 'Visible en la web' : 'Oculto en la web'}</p><h2>${escape(service.title)}</h2></div><div class="admin-editor-controls"><button data-action="up" aria-label="Subir servicio ${index + 1}"${index === 0 ? ' disabled' : ''}>${icon('up')}</button><button data-action="down" aria-label="Bajar servicio ${index + 1}"${index === services.length - 1 ? ' disabled' : ''}>${icon('down')}</button><button data-action="remove"${services.length === 1 ? ' disabled' : ''}>Quitar</button></div></div>
    <details class="dashboard-service-fields" name="service-editor"><summary>Editar contenido y condiciones</summary><div class="admin-fields">${field('Título', 'title', service.title, 85)}${field('Etiqueta de la ilustración', 'label', service.label, 65)}
    <label class="wide">Descripción<textarea data-field="description" maxlength="500" required>${escape(service.description)}</textarea></label>
    <label class="wide">Qué incluye (una característica por línea, hasta seis)<textarea data-field="features" required>${escape(service.features.join('\n'))}</textarea></label>
    ${field('Texto del botón', 'button', service.button, 55)}${select('Ilustración', 'graphic', service.graphic, [['school', 'Colegios y centros'], ['career', 'Ideas y colaboraciones'], ['content', 'Apoyo y comunicación'], ['support', 'Acompañamiento']])}
    ${select('Perfil de la consulta', 'profile', service.profile, serviceProfiles.map(value => [value, value]))}${select('Motivo de contacto', 'need', service.need, serviceNeeds.map(value => [value, value]))}</div>
    <div class="admin-checks"><label><input type="checkbox" data-field="published"${service.published ? ' checked' : ''}>Visible en la web</label><label><input type="checkbox" data-field="featured"${service.featured ? ' checked' : ''}>Destacar tarjeta</label></div>
    <div class="admin-price"><label>Precio o condiciones económicas (opcional)<input type="text" data-field="priceText" value="${escape(service.priceText)}" maxlength="60" placeholder="Vacío: no se mostrará ningún precio"></label><div class="admin-checks"><label><input type="checkbox" data-field="showPrice"${service.showPrice ? ' checked' : ''}>Mostrar el precio en la web</label></div></div>
  </details></article>`).join('');
  enhanceSelects(catalog);
}
async function load() {
  busy = true; panel.inert = true;
  try {
  const session = await request('/api/account');
  if (!session.isAdmin && !['editor','designer','collaborator'].includes(session.teamRole)) throw new Error('Tu cuenta no tiene acceso al equipo.');
  document.querySelector('#admin-user').textContent = session.username;
  if (!session.isAdmin) { location.replace('/cuenta'); return; }
  document.querySelectorAll('[data-create-project]').forEach(button=>button.hidden=true);
  const data = await request('/api/admin/services');
  services = data.services; revision = data.revision; dirty = false;
  panel.hidden = false; login.hidden = true; save.disabled = true;
  render(); message('');
  // Production records are retained, but the owner workflow is now intake and timeline only.
  if (!workspace) { workspace = initAdminWorkspace(document.querySelector('#workspace-root')); await workspace.load(); }
  } finally { busy = false; panel.inert = false; }
}
catalog.addEventListener('input', event => {
  const input = event.target.closest('[data-field]');
  if (!input) return;
  const service = services[Number(input.closest('[data-index]').dataset.index)];
  service[input.dataset.field] = input.type === 'checkbox' ? input.checked : input.dataset.field === 'features' ? input.value.split('\n').map(value => value.trim()).filter(Boolean) : input.value;
  changed();
});
catalog.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || busy) return;
  const index = Number(button.closest('[data-index]').dataset.index);
  if (button.dataset.action === 'remove') {
    if (services.length === 1 || !confirm('¿Quitar este servicio? Se aplicará al guardar los cambios.')) return;
    services.splice(index, 1);
  } else {
    const target = index + (button.dataset.action === 'up' ? -1 : 1);
    if (target < 0 || target >= services.length) return;
    [services[index], services[target]] = [services[target], services[index]];
  }
  render(); changed();
});
document.querySelector('#admin-add').addEventListener('click', () => {
  if (busy) return;
  if (services.length >= 12) { message('Puedes publicar hasta 12 servicios.', true); return; }
  services.push({ id: crypto.randomUUID(), title: 'Nuevo servicio', label: 'A tu medida', description: '', features: ['Acompañamiento personalizado'], button: 'Hablemos', graphic: 'content', profile: 'Otra consulta', need: 'Orientación inicial', featured: false, published: false, priceText: '', showPrice: false });
  render(); changed(); catalog.lastElementChild.querySelector('details').open=true; catalog.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
save.addEventListener('click', async () => {
  if (busy || !dirty) return;
  for (const input of catalog.querySelectorAll('input,textarea,select')) if (!input.checkValidity()) { input.closest('details').open=true; input.reportValidity(); return; }
  busy = true; save.disabled = true; catalog.inert = true;
  message('Guardando catálogo…');
  try {
    const data = await request('/api/admin/services', { method: 'PUT', body: JSON.stringify({ revision, services }) });
    revision = data.revision; services = data.services; dirty = false;
    render(); message('Cambios guardados. Ya están disponibles en el catálogo de esta instalación.');
  } catch (error) { message(error.message, true); }
  finally { busy = false; catalog.inert = false; save.disabled = !dirty; }
});
document.querySelector('#admin-reload').addEventListener('click', () => {
  if (busy || (dirty && !confirm('¿Descartar los cambios sin guardar y recargar el catálogo?'))) return;
  load().catch(error => message(error.message, true));
});
document.querySelector('#admin-logout').addEventListener('click', async () => {
  if (busy || ((dirty || workspace?.hasUnsaved() || team?.hasUnsaved()) && !confirm('Tienes cambios sin guardar. ¿Quieres cerrar sesión?'))) return;
  try { await request('/api/logout', { method: 'POST' }); dirty = false; location.assign('/admin'); }
  catch (error) { message(error.message, true); }
});
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
load().catch(error => { login.hidden = false; message(error.message, true); });

const views={team:['Equipo','Cada persona, su trabajo.','Asigna proyectos, prepara los encargos y revisa las entregas del equipo.'],overview:['Resumen','Todo en su sitio.','Una vista clara de los proyectos, las personas y el siguiente paso.'],projects:['Consultas','Cada consulta, su recorrido.','Confirma la recepción y actualiza las fases. El trabajo se atiende por correo.'],people:['Usuarios','Usuarios y equipo.','Distingue las cuentas registradas de las personas que trabajan contigo.'],reviews:['Reseñas','Escuchar también es avanzar.','Revisa las opiniones de experiencias confirmadas antes de publicarlas.'],services:['Servicios','Tú decides qué ofrecer.','Edita el catálogo que aparece en la web. Los cambios se aplican al guardar.']};
function showAdminView(view){
 if(!views[view])return;
 document.querySelectorAll('[data-admin-pane]').forEach(pane=>{pane.hidden=pane.dataset.adminPane!==view;});
 document.querySelectorAll('.dashboard-navigation [data-admin-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.adminView===view)));
 document.querySelector('#admin-section-label').textContent=views[view][0];document.querySelector('#panel-title').textContent=views[view][1];document.querySelector('#admin-section-description').textContent=views[view][2];
 document.querySelector('#workspace-status').hidden=view==='services';
 document.querySelector('.dashboard-main').scrollIntoView({block:'start',behavior:'instant'});
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-admin-view]');if(button)showAdminView(button.dataset.adminView);});
document.addEventListener('admin:navigate',event=>showAdminView(event.detail));
document.querySelectorAll('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon);});

document.addEventListener('team:open',async event=>{showAdminView('team');try{await team?.openProject(event.detail);}catch(error){message(error.message,true);}});

document.addEventListener('team:assign-person',async event=>{showAdminView('team');try{await team?.assignPerson(event.detail);}catch(error){message(error.message,true);}});
