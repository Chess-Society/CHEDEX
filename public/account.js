import { icon } from './icons.js';
import { api, allPages, send, esc, date, needs, select, area, field, badge, updates, history } from './workspace-ui.js';
import { enhanceSelects, syncSelects } from './selects.js';

const login=document.querySelector('#account-login'), panel=document.querySelector('#account-panel'), status=document.querySelector('#account-status');
const list=document.querySelector('#my-projects'), detail=document.querySelector('#my-project-detail'), index=document.querySelector('#account-project-index');
const dialog=document.querySelector('#request-dialog'), requestForm=document.querySelector('#new-request-form');
let session, projects=[], current=null, review=null, busy=false, filter='active', detailTab='overview';
const dirtyForms=new Set();
const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon);});enhanceSelects(root);}
function allowDetailChange(){return ![...dirtyForms].some(form=>detail.contains(form))||confirm('Tienes un mensaje o una opinión sin enviar. ¿Quieres descartarlos?');}
function clearDetailDrafts(){for(const form of dirtyForms)if(detail.contains(form))dirtyForms.delete(form);}
async function run(action){
  if(busy)return;busy=true;panel.inert=true;requestForm.inert=true;
  try{await action();}catch(error){message(error.message,true);if(dialog.open)document.querySelector('#request-status').textContent=error.message;if(error.status===401){dialog.close();panel.hidden=true;login.hidden=false;}}
  finally{busy=false;panel.inert=false;requestForm.inert=false;}
}
function switchView(view){
  document.querySelectorAll('[data-pane]').forEach(pane=>{pane.hidden=pane.dataset.pane!==view;});
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
}
function showIndex(){clearDetailDrafts();current=null;detail.hidden=true;index.hidden=false;detail.innerHTML='';renderIndex();}
function renderIndex(){
  const active=projects.filter(project=>!project.archived);
  document.querySelector('#account-project-count').textContent=String(active.length);
  document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
  document.querySelector('.account-filters').hidden=!projects.length;
  document.querySelector('#account-project-tools').hidden=false;
  const visible=projects.filter(project=>filter==='archived'?project.archived:!project.archived);
  if(!projects.length){list.classList.add('is-empty');list.innerHTML=`<div class="account-empty"><div class="account-empty-art" aria-hidden="true"><div class="empty-grid"></div><span class="empty-mini-card">${icon('message')}<i></i><i></i></span><span class="empty-main-card">${icon('folder')}<i></i><i></i></span><span class="empty-check">${icon('check')}</span></div><p class="eyebrow">Empecemos por tu idea</p><h3>Tu primer proyecto empieza<br>con una conversación.</h3><p>Cuéntanos qué te gustaría conseguir. Te escucharemos y acordaremos contigo el siguiente paso.</p><button class="button" data-new-request>Cuéntanos tu idea ${icon('external')}</button><ol class="account-first-steps"><li><span>01</span>Nos cuentas tu situación</li><li><span>02</span>Hablamos de cómo ayudarte</li><li><span>03</span>Seguimos avanzando aquí</li></ol></div>`;return;}
  list.classList.remove('is-empty');
  list.innerHTML=visible.length?visible.map(project=>`<article class="account-project-card"><div class="account-card-top"><span class="account-card-icon">${icon('folder')}</span>${badge(project.archived?'Archivado':project.stage)}</div><p class="eyebrow">${esc(project.need)}</p><h3>${esc(project.title)}</h3><p class="account-card-note">${project.stage==='Pendiente de respuesta'?'Consulta la conversación para ver qué está pendiente.':project.stage==='Completado'?'Puedes repasar los avances y la conversación.':'Los pasos acordados y las novedades, siempre a mano.'}</p><small>Última actividad · ${date(project.updatedAt)}</small><button class="account-card-link" data-project="${esc(project.id)}">Ver proyecto ${icon('external')}</button></article>`).join(''):'<div class="account-small-empty">'+icon('folder')+'<h3>No hay proyectos '+(filter==='archived'?'archivados':'en seguimiento')+'.</h3><p>'+(filter==='archived'?'Los proyectos que archivéis seguirán disponibles aquí.':'Puedes consultar los archivados o contarnos una nueva idea.')+'</p></div>';
}
async function loadProjects(id=current?.id){
  projects=await allPages('/api/projects','projects');renderIndex();
  if(id){const data=await api(`/api/projects/${id}`);clearDetailDrafts();current=data.project;review=data.review;renderDetail();}
  else{current=null;detail.hidden=true;index.hidden=false;}
}
function taskCards(tasks){return tasks.map(task=>`<article class="account-shared-task"><span class="account-task-symbol${task.status==='Completado'?' completed':''}">${icon(task.status==='Completado'?'check':'folder')}</span><div><h4>${esc(task.title)}</h4>${task.details?`<p>${esc(task.details)}</p>`:''}<div class="account-task-meta">${badge(task.status)}${task.assignee?`<span>${esc(task.assignee)}</span>`:''}${task.due?`<span>Fecha orientativa: ${esc(task.due.split('-').reverse().join('/'))}</span>`:''}</div></div></article>`).join('');}
function renderDetail(){
  if(!current)return;
  index.hidden=true;detail.hidden=false;
  const pending=current.tasks.filter(task=>task.status!=='Completado');
  const eligible=current.reviewEligible&&current.stage==='Completado';
  if(!eligible&&detailTab==='review')detailTab='overview';
  const latest=current.updates.at(-1);
  detail.innerHTML=`<div class="account-detail-toolbar"><button class="account-back" data-back>${icon('back')}Todos mis proyectos</button><button class="account-refresh" data-refresh-project>${icon('refresh')}Actualizar proyecto</button></div><header class="account-project-heading"><div><p class="eyebrow">${esc(current.need)}</p><h3>${esc(current.title)}</h3><p>${esc(current.summary)}</p></div>${badge(current.archived?'Archivado':current.stage)}</header><div class="account-detail-tabs" role="group" aria-label="Apartados del proyecto"><button data-project-tab="overview" aria-pressed="${detailTab==='overview'}">Resumen</button><button data-project-tab="tasks" aria-pressed="${detailTab==='tasks'}">Pasos acordados <span>${current.tasks.length}</span></button><button data-project-tab="messages" aria-pressed="${detailTab==='messages'}">Conversación <span>${current.updates.length}</span></button>${eligible?`<button data-project-tab="review" aria-pressed="${detailTab==='review'}">Tu opinión</button>`:''}</div>
  <section data-detail-pane="overview"${detailTab!=='overview'?' hidden':''}><div class="account-overview-grid"><div class="account-next-card"><span class="account-card-icon">${icon('folder')}</span><p class="eyebrow">El siguiente paso</p><h4>${pending.length?esc(pending[0].title):current.stage==='Completado'?'Un camino que ya podemos repasar.':'Vamos a concretarlo contigo.'}</h4><p>${pending.length?esc(pending[0].details||'Puedes consultar este paso en el apartado Pasos acordados.'):'El estado y los pasos compartidos los actualiza el equipo. Si tienes una duda, escríbenos en la conversación.'}</p><button class="account-card-link" data-project-tab="${pending.length?'tasks':'messages'}">${pending.length?'Ver los pasos':'Abrir conversación'} ${icon('external')}</button></div><div class="account-latest-card"><span class="account-card-icon">${icon('message')}</span><p class="eyebrow">Lo último que hemos hablado</p>${latest?`<p class="account-latest-text">${esc(latest.text)}</p><small>${esc(latest.author)} · ${date(latest.createdAt)}</small>`:'<h4>Aquí nos ponemos al día.</h4><p>Las actualizaciones del equipo y tus mensajes aparecerán en la conversación.</p>'}<button class="account-card-link" data-project-tab="messages">Ir a la conversación ${icon('external')}</button></div></div><div class="account-history-card">${history(current)}</div></section>
  <section data-detail-pane="tasks"${detailTab!=='tasks'?' hidden':''}><p class="work-help">Estos son los pasos que hemos compartido contigo. Las fechas son orientativas y cualquier cambio lo hablaremos juntos.</p><div class="account-task-list">${current.tasks.length?taskCards(current.tasks):'<div class="account-small-empty">'+icon('folder')+'<h4>Aún estamos concretando los primeros pasos.</h4><p>Cuando acordemos las tareas, podrás seguirlas desde aquí.</p></div>'}</div></section>
  <section data-detail-pane="messages"${detailTab!=='messages'?' hidden':''}><div class="account-conversation"><h4>Hablemos de tu proyecto.</h4><p class="work-help">Puedes preguntar, compartir una novedad o responder al equipo. Los mensajes se consultan aquí; no enviamos avisos automáticos por correo.</p>${updates(current)}${current.archived?'<p class="work-help">Este proyecto está archivado. Para retomarlo, escribe a escuelatopchess@gmail.com.</p>':`<form id="comment-form">${area('Tu mensaje','text','',2000)}<button class="button">Enviar al equipo ${icon('external')}</button></form>`}</div></section>
  ${eligible?`<section data-detail-pane="review"${detailTab!=='review'?' hidden':''}><div class="account-conversation"><h4>¿Cómo ha sido tu experiencia?</h4><p class="work-help">Tu experiencia está confirmada por el equipo. La opinión se revisará antes de publicarse con tu nombre de Lichess. No incluyas datos privados.</p>${review?`<p class="account-review-state">${badge(review.status==='approved'?'Publicada':review.status==='hidden'?'No publicada':'Pendiente de revisión')} Al editarla volverá a revisión.</p>`:''}<form id="review-form">${select('Valoración','rating',['5','4','3','2','1'],String(review?.rating||5))}${area('Tu opinión','text',review?.text||'',1500)}<label class="work-check"><input name="consent" type="checkbox" required>Quiero publicar esta opinión con mi nombre de Lichess.</label><button class="button">Enviar opinión ${icon('external')}</button></form></div></section>`:''}`;
  hydrate(detail);
}
function showDetailTab(tab){detailTab=tab;detail.querySelectorAll('[data-detail-pane]').forEach(pane=>{pane.hidden=pane.dataset.detailPane!==tab;});detail.querySelectorAll('.account-detail-tabs [data-project-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectTab===tab)));}
requestForm.innerHTML=`${field('Ponle un nombre a tu idea','title','',100)}${select('¿En qué podemos apoyarte?','need',needs,needs[0])}${area('¿Qué te gustaría conseguir?','summary')}<p class="legal-form-note">Los datos se utilizan para gestionar tu solicitud y el seguimiento privado. <a href="/privacidad">Información de privacidad y derechos</a>.</p><p class="work-help">Con unas líneas es suficiente. Revisaremos tu solicitud y hablaremos contigo para acordar cómo podemos ayudarte.</p><div class="account-form-footer"><button class="button">Enviar solicitud ${icon('external')}</button><button type="button" class="account-back" data-close-request>Seguir más tarde</button></div>`;
function openRequest(){document.querySelector('#request-status').textContent='';dialog.showModal();}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-new-request]'))openRequest();
  if(event.target.closest('[data-close-request]'))dialog.close();
  const view=event.target.closest('[data-view]');if(view){if(view.dataset.view==='projects'&&current){if(!allowDetailChange())return;showIndex();}switchView(view.dataset.view);document.querySelector('.account-content').scrollIntoView({block:'start',behavior:'instant'});}
  const filterButton=event.target.closest('[data-filter]');if(filterButton){filter=filterButton.dataset.filter;renderIndex();}
});
for(const root of [panel,dialog])root.addEventListener('input',event=>{const form=event.target.closest('form');if(form)dirtyForms.add(form);});
list.addEventListener('click',async event=>{const button=event.target.closest('[data-project]');if(!button||!allowDetailChange())return;await run(async()=>{detailTab='overview';await loadProjects(button.dataset.project);message('');});if(current){detail.scrollIntoView({block:'start',behavior:'instant'});detail.querySelector('.account-back').focus({preventScroll:true});}});
detail.addEventListener('click',event=>{if(event.target.closest('[data-refresh-project]')&&allowDetailChange())run(async()=>{await loadProjects();message('Seguimiento actualizado.');});if(event.target.closest('[data-back]')&&allowDetailChange())showIndex();const tab=event.target.closest('[data-project-tab]');if(tab)showDetailTab(tab.dataset.projectTab);});
document.querySelector('#account-refresh').addEventListener('click',()=>{if(allowDetailChange())run(async()=>{await loadProjects();message('Seguimiento actualizado.');});});
document.querySelector('#account-logout').addEventListener('click',()=>{if(dirtyForms.size&&!confirm('Tienes cambios sin enviar. ¿Quieres cerrar sesión?'))return;run(async()=>{await api('/api/logout',{method:'POST'});dirtyForms.clear();location.assign('/cuenta');});});
requestForm.addEventListener('submit',event=>{event.preventDefault();if(!allowDetailChange())return;const values=Object.fromEntries(new FormData(requestForm));run(async()=>{const data=await send('/api/projects',values);requestForm.reset();syncSelects(requestForm);dirtyForms.delete(requestForm);dialog.close();filter='active';detailTab='overview';switchView('projects');await loadProjects(data.project.id);message('Solicitud recibida. El equipo la revisará y hablará contigo antes de acordar el servicio.');});});
document.querySelector('#profile-form').addEventListener('submit',event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.target));body.links=body.links.split('\n').map(value=>value.trim()).filter(Boolean);run(async()=>{const saved=await send('/api/account/profile',{...body,revision:session.profile.revision||0},'PUT');session.profile=saved.profile;dirtyForms.delete(event.target);message('Perfil guardado. Solo lo podéis ver tú y el equipo.');});});
detail.addEventListener('submit',event=>{
  event.preventDefault();if([...dirtyForms].some(form=>detail.contains(form)&&form!==event.target)&&!confirm('Hay cambios en otro apartado del proyecto. ¿Quieres descartarlos y enviar este formulario?'))return;
  const body=Object.fromEntries(new FormData(event.target));
  if(event.target.id==='comment-form')run(async()=>{await send(`/api/projects/${current.id}/comments`,{...body,revision:current.revision});await loadProjects();message('Mensaje enviado al equipo.');});
  if(event.target.id==='review-form')run(async()=>{await send(`/api/projects/${current.id}/review`,{...body,rating:Number(body.rating),consent:body.consent==='on'},'PUT');await loadProjects();message('Opinión enviada. Se revisará antes de publicarla.');});
});
window.addEventListener('beforeunload',event=>{if(dirtyForms.size){event.preventDefault();event.returnValue='';}});
async function start(){
  try{session=await api('/api/account');}catch(error){login.hidden=false;message(error.status===401?'':error.message,error.status!==401);return;}
  login.hidden=true;panel.hidden=false;document.querySelector('#account-user').textContent=session.username;document.querySelector('.account-avatar').textContent=session.username.slice(0,1).toUpperCase();document.querySelector('#account-admin').hidden=!session.isAdmin;
  const profile=session.profile;
  document.querySelector('#profile-form').innerHTML=`<div class="account-profile-fields">${area('Sobre ti o tu proyecto','bio',profile.bio||'',1000,false)}${area('¿Qué te gustaría conseguir?','goals',profile.goals||'',1000,false)}</div><label>Correo de contacto (opcional)<input name="email" type="email" value="${esc(profile.email||'')}" maxlength="150" autocomplete="email" placeholder="nombre@ejemplo.com"></label>${area('Tus enlaces públicos (uno por línea, hasta cinco)','links',(profile.links||[]).join('\n'),1600,false)}<div class="account-form-footer"><button class="button">Guardar perfil ${icon('check')}</button><p class="work-help">Puedes cambiarlo siempre que lo necesites.</p></div>`;
  await loadProjects();message('');
}
hydrate();run(start);
