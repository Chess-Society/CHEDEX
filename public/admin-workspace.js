import { icon } from './icons.js';
import { api, allPages, send, esc, needs, stages, select, area, field, projectList, board, updates, history, badge, date } from './workspace-ui.js';
import { enhanceSelects } from './selects.js';

export function initAdminWorkspace(root) {
  let projects=[], users=[], reviews=[], current=null, busy=false, dirty=false, dirtyForm=null, dragId=null, reviewFilter='pending', projectTab='board';
  const status=root.querySelector('#workspace-status'), list=root.querySelector('#admin-projects-list'), detail=root.querySelector('#admin-project-detail');
  const dialog=root.querySelector('#task-dialog'), createDialog=root.querySelector('#new-admin-project');
  const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
  const canLeave=()=>!dirty||confirm('Tienes cambios de proyecto sin guardar. ¿Quieres descartarlos?');
  async function run(action) {
    if(busy)return;busy=true;
    root.querySelectorAll('[data-work-area]').forEach(area=>area.inert=true);
    dialog.querySelector('form').inert=true;createDialog.querySelector('form').inert=true;
    try {await action();} catch(error){message(error.message,true);const errorBox=dialog.querySelector('[role="alert"]');if(dialog.open&&errorBox)errorBox.textContent=error.message;if(createDialog.open)createDialog.querySelector('[role=alert]').textContent=error.message;} finally{busy=false;root.querySelectorAll('[data-work-area]').forEach(area=>area.inert=false);dialog.querySelector('form').inert=false;createDialog.querySelector('form').inert=false;}
  }
  async function refresh(id=current?.id) {
    const data=await Promise.all([allPages('/api/admin/projects','projects'),allPages('/api/admin/users','users'),allPages('/api/admin/reviews','reviews')]);
    projects=data[0];users=data[1];reviews=data[2];
    if(id&&projects.some(p=>p.id===id))current=(await api(`/api/admin/projects/${id}`)).project;
    else if(projects.length)current=(await api(`/api/admin/projects/${projects[0].id}`)).project;else current=null;
    renderList();renderDetail();renderPeople();renderReviews();renderCreate();dirty=false;dirtyForm=null;
    renderCounts();
  }
  function renderCounts(){
    root.querySelector('#work-total').textContent=String(projects.filter(p=>!p.archived).length);
    root.querySelector('#work-waiting').textContent=String(projects.filter(p=>!p.archived&&p.stage==='Por hablar').length);
    root.querySelector('#work-review-count').textContent=String(reviews.filter(r=>r.status==='pending').length);
    root.closest('#admin-panel').querySelector('[data-nav-count=projects]').textContent=String(projects.filter(p=>!p.archived).length);root.closest('#admin-panel').querySelector('[data-nav-count=reviews]').textContent=String(reviews.filter(r=>r.status==='pending').length);renderDashboard();
  }
  function renderList(){const archived=root.querySelector('#show-archived').checked,q=root.querySelector('#admin-project-search').value.trim().toLocaleLowerCase('es');const visible=projects.filter(p=>(archived||!p.archived)&&`${p.title} ${p.username||''} ${p.stage}`.toLocaleLowerCase('es').includes(q));list.innerHTML=visible.length?projectList(visible,current?.id):'<p class="work-empty">'+(q?'No hay proyectos que coincidan con tu búsqueda.':'Todavía no hay proyectos. Puedes crear uno o esperar una nueva solicitud.')+'</p>';}
  function renderCreate(){
    root.querySelector('#admin-create-project').innerHTML=`<label>Usuario de Lichess<select name="ownerId" required><option value="">Selecciona una persona</option>${users.map(user=>`<option value="${esc(user.id)}">${esc(user.username)}</option>`).join('')}</select></label>${field('Nombre del proyecto','title','',100)}${select('Modalidad','need',needs,needs[0])}${area('Objetivo y alcance compartido','summary')}<p class="work-help">La persona debe haber entrado antes en Chedex con Lichess. El proyecto será visible para ella desde su creación.</p><button class="button">Crear proyecto ${icon('external')}</button>`;enhanceSelects(root.querySelector('#admin-create-project'));
  }
  function renderDashboard(){
    const recent=[...projects].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,5);
    root.querySelector('#dashboard-recent').innerHTML=recent.length?recent.map(project=>`<button class="dashboard-recent-project" data-project="${esc(project.id)}"><span class="dashboard-recent-icon">${icon('folder')}</span><span><strong>${esc(project.title)}</strong><small>${esc(project.username||project.ownerId)} · ${date(project.updatedAt)}</small></span>${badge(project.archived?'Archivado':project.stage)}${icon('external')}</button>`).join(''):`<div class="dashboard-empty"><span class="dashboard-empty-symbol">${icon('folder')}</span><h3>Todo preparado para el próximo proyecto.</h3><p>Las solicitudes y los proyectos que crees aparecerán aquí, con sus avances y su persona de contacto.</p><button class="dashboard-text-button" data-create-project>Crear el primer proyecto ${icon('plus')}</button></div>`;
    const waiting=projects.filter(p=>!p.archived&&p.stage==='Por hablar').length,pending=reviews.filter(r=>r.status==='pending').length;
    root.querySelector('#dashboard-attention').innerHTML=`<p>${waiting?`Tienes <strong>${waiting} ${waiting===1?'proyecto pendiente':'proyectos pendientes'} de una primera conversación</strong>.`:'No hay proyectos pendientes de una primera conversación.'}</p><p>${pending?`Hay <strong>${pending} ${pending===1?'opinión':'opiniones'}</strong> esperando revisión.`:'Las nuevas opiniones aparecerán aquí cuando haya experiencias que revisar.'}</p>`;
  }
  function showProjectTab(tab){projectTab=tab;detail.querySelectorAll('[data-project-pane]').forEach(pane=>{pane.hidden=pane.dataset.projectPane!==tab;});detail.querySelectorAll('[data-project-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectTab===tab)));}
  function renderDetail(){
    if(!current){detail.innerHTML='<div class="dashboard-project-empty">'+icon('folder')+'<h3>Elige un proyecto para empezar.</h3><p>Aquí tendrás el tablero, la conversación y los ajustes de cada proyecto.</p></div>';return;}
    const owner=users.find(u=>u.id===current.ownerId);
    detail.innerHTML=`<header class="dashboard-project-heading"><div><p class="eyebrow">${esc(current.username||current.ownerId)} / ${esc(current.need)}</p><h2>${esc(current.title)}</h2><small>Última actividad: ${date(current.updatedAt)}</small></div>${badge(current.archived?'Archivado':current.stage)}</header><div class="dashboard-project-tabs" role="group" aria-label="Apartados del proyecto"><button data-project-tab="board">${icon('dashboard')}Tablero</button><button data-project-tab="messages">${icon('message')}Conversación</button><button data-project-tab="settings">${icon('services')}Ajustes</button></div>
    <section data-project-pane="board"><div class="work-section-heading"><div><h3>Pasos y tareas</h3><p class="work-help">Arrastra entre columnas o edita el estado. Las tareas internas solo las ve el equipo.</p></div><button class="button secondary" data-add-task>${icon('plus')}Añadir tarea</button></div>${board(current,true)}</section>
    <section data-project-pane="messages"><section class="work-discussion"><h3>Mensajes y notas del proyecto</h3>${updates(current,true)}<form id="admin-update">${area('Nueva actualización','text')}${select('Visibilidad','visibility',['Nota interna del equipo','Compartir con el usuario'],'Nota interna del equipo')}<button class="button">Guardar actualización ${icon('external')}</button></form></section>${history(current,true)}</section>
    <section data-project-pane="settings"><div class="dashboard-settings-card"><h3>Lo que acordamos con esta persona.</h3><p class="work-help">El nombre, el alcance y el estado son visibles para el usuario.</p><form id="project-settings">${field('Nombre compartido','title',current.title,100)}${area('Objetivo y alcance compartido','summary',current.summary)}<div class="work-fields">${select('Modalidad','need',needs,current.need)}${select('Estado del proyecto','stage',stages,current.stage)}</div><label class="work-check"><input type="checkbox" name="archived"${current.archived?' checked':''}>Archivar proyecto (se conserva el seguimiento)</label><label class="work-check"><input type="checkbox" name="reviewEligible"${current.reviewEligible?' checked':''}>Confirmo que ha utilizado el servicio y puede dejar una reseña al completar el proyecto</label><button class="button">Guardar ajustes ${icon('check')}</button></form>${owner?.profile.email?`<p class="work-help">Correo de contacto: ${esc(owner.profile.email)}</p>`:''}</div></section>`;
    enhanceSelects(detail);showProjectTab(projectTab);
  }
  function renderPeople(){const q=root.querySelector('#admin-people-search').value.trim().toLocaleLowerCase('es');root.querySelector('#admin-people').innerHTML=users.filter(user=>user.username.toLocaleLowerCase('es').includes(q)).map(user=>`<article class="work-person"><h3>${esc(user.username)}</h3>${user.id==='andresli'?badge('Administración'):badge('Usuario')}<p>${esc(user.profile.bio||'Sin presentación todavía.')}</p>${user.profile.goals?`<p><strong>Objetivos:</strong> ${esc(user.profile.goals)}</p>`:''}${user.profile.email?`<p>Contacto: ${esc(user.profile.email)}</p>`:''}<div class="work-person-links">${(user.profile.links||[]).map(link=>`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(link)} ${icon('external')}</a>`).join('')}</div></article>`).join('')||'<p class="work-empty">Aún no hay personas registradas.</p>';}
  function renderReviews(){root.querySelectorAll('[data-review-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reviewFilter===reviewFilter)));root.querySelector('#admin-reviews').innerHTML=reviews.filter(review=>reviewFilter==='all'||review.status==='pending').map(review=>`<article class="work-review"><div class="review-stars">${icon('star').repeat(review.rating)}</div><p>${esc(review.text)}</p><strong>${esc(review.username)}</strong>${badge(review.status==='approved'?'Publicada':review.status==='hidden'?'No publicada':'Pendiente de revisión')}<small>${date(review.created_at)}</small><div class="work-row"><button class="button secondary" data-review="${esc(review.id)}" data-review-status="approved"${review.status==='approved'?' disabled':''}>Publicar</button><button class="work-text-button" data-review="${esc(review.id)}" data-review-status="hidden"${review.status==='hidden'?' disabled':''}>No publicar</button></div></article>`).join('')||'<p class="work-empty">No hay reseñas que revisar. Se habilitan para cada proyecto tras confirmar la experiencia.</p>';}
  function openTask(task){
    dialog.querySelector('form').innerHTML=`<input type="hidden" name="id" value="${esc(task?.id||'')}"><h2>${task?'Editar tarea':'Nueva tarea'}</h2><p class="admin-status error" role="alert"></p>${field('Título','title',task?.title||'',150)}${area('Descripción','details',task?.details||'',2000,false)}<div class="work-fields">${field('Responsable (opcional)','assignee',task?.assignee||'',100,false)}<label>Fecha orientativa (opcional)<input type="date" name="due" value="${esc(task?.due||'')}"></label></div>${select('Estado','status',stages,task?.status||stages[0])}${select('Visibilidad','visibility',['Interna del equipo','Compartida con el usuario'],task&&!task.internal?'Compartida con el usuario':'Interna del equipo')}<p class="work-help">Al compartir una tarea, el usuario verá su título, descripción, responsable y fecha. Al hacerla interna, se retiran también sus eventos del historial compartido; lo que ya haya visto no puede deshacerse.</p><div class="work-row"><button class="button">Guardar tarea</button><button class="work-text-button" type="button" data-cancel-task>Cancelar</button></div>`;
    enhanceSelects(dialog);dialog.showModal();
  }
  async function mutate(body){const result=await send(`/api/admin/projects/${current.id}`,{revision:current.revision,...body},'PUT');current=result.project;projects=projects.map(p=>p.id===current.id?current:p);renderList();renderDetail();renderCounts();dirty=false;dirtyForm=null;message('Cambios guardados. La información compartida ya está disponible para el usuario.');}
  root.addEventListener('input',event=>{if(event.target.closest('form')){dirty=true;dirtyForm=event.target.closest('form');}});
  root.addEventListener('click',event=>{
    const tab=event.target.closest('[data-project-tab]');if(tab)showProjectTab(tab.dataset.projectTab);const reviewTab=event.target.closest('[data-review-filter]');if(reviewTab){reviewFilter=reviewTab.dataset.reviewFilter;renderReviews();}
    const project=event.target.closest('[data-project]');if(project&&canLeave())run(async()=>{projectTab='board';document.dispatchEvent(new CustomEvent('admin:navigate',{detail:'projects'}));current=(await api(`/api/admin/projects/${project.dataset.project}`)).project;renderList();renderDetail();renderCounts();dirty=false;dirtyForm=null;message('Proyecto cargado.');});
    if(event.target.closest('[data-add-task]')&&canLeave()){if(dirty){renderDetail();dirty=false;dirtyForm=null;}openTask();}
    const task=event.target.closest('[data-edit-task]');if(task&&canLeave()){if(dirty){renderDetail();dirty=false;dirtyForm=null;}openTask(current.tasks.find(item=>item.id===task.dataset.editTask));}
    if(event.target.closest('[data-cancel-task]')){dialog.close();dirty=false;dirtyForm=null;}
    const review=event.target.closest('[data-review]');if(review){const saved=reviews.find(r=>r.id===review.dataset.review);run(async()=>{await send(`/api/admin/reviews/${saved.id}`,{status:review.dataset.reviewStatus,expectedText:saved.text,expectedRating:saved.rating,expectedCreatedAt:saved.created_at},'PUT');reviews=await allPages('/api/admin/reviews','reviews');renderReviews();renderCounts();message('Visibilidad de la reseña actualizada.');});}
  });
  root.addEventListener('submit',event=>{
    if(!event.target.closest('[data-work-area]')&&!['task-form','admin-create-project'].includes(event.target.getAttribute('id')))return;
    event.preventDefault();if(dirty&&dirtyForm&&dirtyForm!==event.target&&!canLeave())return;const values=Object.fromEntries(new FormData(event.target));
    if(event.target.getAttribute('id')==='admin-create-project')run(async()=>{const result=await send('/api/admin/projects',values);await refresh(result.project.id);createDialog.close();document.dispatchEvent(new CustomEvent('admin:navigate',{detail:'projects'}));message('Proyecto creado y disponible para su usuario.');});
    if(event.target.getAttribute('id')==='project-settings')run(()=>mutate({...values,action:'details',archived:values.archived==='on',reviewEligible:values.reviewEligible==='on'}));
    if(event.target.getAttribute('id')==='admin-update')run(()=>mutate({action:'update',text:values.text,internal:values.visibility==='Nota interna del equipo'}));
    if(event.target.getAttribute('id')==='task-form')run(async()=>{await mutate({action:'task',task:{...values,internal:values.visibility==='Interna del equipo'}});dialog.close();});
  });
  detail.addEventListener('dragstart',event=>{const task=event.target.closest('[data-task]');if(task&&!dirty){dragId=task.dataset.task;event.dataTransfer.setData('text/plain',dragId);}else event.preventDefault();});
  detail.addEventListener('dragover',event=>{if(dragId&&event.target.closest('[data-stage]'))event.preventDefault();});
  detail.addEventListener('dragend',()=>{dragId=null;});
  detail.addEventListener('drop',event=>{event.preventDefault();const column=event.target.closest('[data-stage]'),task=current?.tasks.find(t=>t.id===dragId);dragId=null;if(column&&task&&task.status!==column.dataset.stage)run(()=>mutate({action:'task',task:{...task,status:column.dataset.stage}}));});
  document.querySelector('#workspace-refresh').addEventListener('click',()=>{if(canLeave())run(async()=>{await refresh();message('Tableros, personas y reseñas actualizados.');});});
  dialog.addEventListener('close',()=>{if(dirtyForm===dialog.querySelector('form')){dirty=false;dirtyForm=null;}});
  root.querySelector('#show-archived').addEventListener('change',renderList);
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-create-project]')){if(dirty&&dirtyForm!==createDialog.querySelector('form')){if(!canLeave())return;renderDetail();dirty=false;dirtyForm=null;}createDialog.querySelector('[role=alert]').textContent='';createDialog.showModal();}
    if(event.target.closest('[data-close-create]'))createDialog.close();
    const view=event.target.closest('[data-admin-view]');if(view?.dataset.adminView==='projects'){root.querySelector('#admin-project-search').value=view.dataset.dashboardFilter==='waiting'?'Por hablar':'';renderList();}
  });
  root.querySelector('#admin-project-search').addEventListener('input',renderList);
  root.querySelector('#admin-people-search').addEventListener('input',renderPeople);
  return { load:()=>run(async()=>{await refresh();message('');}), hasUnsaved:()=>dirty };
}
