import { progressPhases, progressPhase } from './project-data.js';
import { teamRoles, workingRoles } from './team-data.js';
import { feedback, formProgress, confirmArchivedDeletion } from './interaction-ui.js';
import { icon } from './icons.js';
import { api, allPages, send, esc, needs, stages, select, area, field, projectList, board, updates, history, badge, date, timeline } from './workspace-ui.js';
import { enhanceSelects } from './selects.js';
import { decisionCard, appointmentCard, availabilityCard } from './appointments-ui.js';
import { renderToday, phase2Message } from './dash-today.js';
import { replyQueue, phase2Candidates, phase2Proposed, phaseOfNeed } from './dash-data.js';

export function initAdminWorkspace(root) {
  let peopleFilter='all', members=[];
  let todayPeriod='7d', phaseFilter='all', projects=[], users=[], reviews=[], slots=[], appointment=null, current=null, busy=false, dirty=false, dirtyForm=null, dragId=null, reviewFilter='pending', projectTab='settings';
  const status=root.querySelector('#workspace-status'), list=root.querySelector('#admin-projects-list'), detail=root.querySelector('#admin-project-detail');
  const dialog=root.querySelector('#task-dialog'), createDialog=root.querySelector('#new-admin-project');
  const message=feedback(status);
  const canLeave=()=>!dirty||confirm('Tienes cambios de proyecto sin guardar. ¿Quieres descartarlos?');
  async function run(action, form=null) {
    if(busy)return;busy=true;root.setAttribute('aria-busy','true');
    root.querySelectorAll('[data-work-area]').forEach(area=>area.inert=true);
    dialog.querySelector('form').inert=true;createDialog.querySelector('form').inert=true;
    const finish=formProgress(form);message(form?'Procesando los cambios…':'Cargando…',false,true);
    try {await action();finish();} catch(error){finish(error.message);message(error.message,true);const errorBox=dialog.querySelector('[role="alert"]');if(dialog.open&&errorBox)errorBox.textContent=error.message;if(createDialog.open)createDialog.querySelector('[role=alert]').textContent=error.message;} finally{busy=false;root.removeAttribute('aria-busy');root.querySelectorAll('[data-work-area]').forEach(area=>area.inert=false);dialog.querySelector('form').inert=false;createDialog.querySelector('form').inert=false;}
  }
  const runForm=(form,action)=>run(action,form);
  async function refresh(id=current?.id) {
    const data=await Promise.all([allPages('/api/admin/projects','projects'),allPages('/api/admin/users','users'),allPages('/api/admin/reviews','reviews'),api('/api/admin/slots'),api('/api/admin/team')]);
    projects=data[0];users=data[1];reviews=data[2];slots=data[3].slots;members=data[4].members;
    if(id&&projects.some(p=>p.id===id)){const data=await api(`/api/admin/projects/${id}`);current=data.project;appointment=data.appointment;}else{current=null;appointment=null;}
    await loadProposed();renderAvailability();renderList();renderDetail();renderPeople();renderReviews();renderCreate();dirty=false;dirtyForm=null;
    renderCounts();
  }
  function renderCounts(){
    const set=(name,value)=>{const node=root.closest('#admin-panel').querySelector(`[data-nav-count=${name}]`);if(node)node.textContent=String(value);};
    set('projects',projects.filter(p=>!p.archived).length);
    set('reviews',reviews.filter(r=>r.status==='pending').length);
    set('today',replyQueue(projects,Date.now()).length);
    renderDashboard();
  }
  function renderList(){const archived=root.querySelector('#show-archived').checked,q=root.querySelector('#admin-project-search').value.trim().toLocaleLowerCase('es');const visible=projects.filter(p=>(archived||!p.archived)&&(phaseFilter==='all'||phaseOfNeed(p.need)===phaseFilter)&&`${p.title} ${p.username||''} ${p.stage} ${p.requestStatus}`.toLocaleLowerCase('es').includes(q));list.innerHTML=visible.length?projectList(visible,current?.id):'<p class="work-empty">'+(q?'No hay proyectos que coincidan con tu búsqueda.':'Todavía no hay proyectos. Puedes crear uno o esperar una nueva solicitud.')+'</p>';}
  function renderCreate(){
    root.querySelector('#admin-create-project').innerHTML=`<label>Usuario de Lichess<select name="ownerId" required><option value="">Selecciona una persona</option>${users.map(user=>`<option value="${esc(user.id)}">${esc(user.username)}</option>`).join('')}</select></label><div class="work-fields">${field('Nombre de la persona','firstName','',80)}${field('Apellidos (si es posible)','lastName','',120,false)}</div>${field('Nombre del proyecto','title','',100)}${select('Modalidad','need',needs,needs[0])}${area('Objetivo y alcance compartido','summary')}<p class="work-help">La persona debe haber entrado antes en Chedex con Lichess. El proyecto será visible para ella desde su creación.</p><button class="button">Crear proyecto ${icon('external')}</button>`;enhanceSelects(root.querySelector('#admin-create-project'));
  }
  const proposedCache=new Map();
  async function loadProposed(){
    for(const project of phase2Candidates(projects,new Set())){
      const cached=proposedCache.get(project.id);if(cached&&cached.updatedAt===project.updatedAt)continue;
      try{const data=await api(`/api/admin/projects/${project.id}`);proposedCache.set(project.id,{updatedAt:project.updatedAt,proposed:phase2Proposed(data.project)});}catch{proposedCache.set(project.id,{updatedAt:project.updatedAt,proposed:false});}
    }
  }
  function renderDashboard(){
    renderToday(root.querySelector('#today-root'),{projects,slots,pendingReviews:reviews.filter(r=>r.status==='pending').length,period:todayPeriod,proposed:new Set([...proposedCache].filter(([,value])=>value.proposed).map(([id])=>id))});
  }
  function showProjectTab(tab){projectTab=tab;detail.querySelectorAll('[data-project-pane]').forEach(pane=>{pane.hidden=pane.dataset.projectPane!==tab;});detail.querySelectorAll('[data-project-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectTab===tab)));}
  function renderDetail(){
    detail.closest('.work-layout').classList.toggle('has-selection',Boolean(current));
    if(!current){detail.innerHTML='<div class="dashboard-project-empty">'+icon('folder')+'<h3>Elige un proyecto para empezar.</h3><p>Aquí podrás confirmar la recepción y actualizar su línea de tiempo.</p></div>';return;}
    detail.innerHTML=`<div class="project-detail-actions"><button class="button secondary" data-close-project>${icon('back')}Volver a consultas</button><button class="button secondary" data-archive-admin>${current.archived?'Restaurar':'Archivar'}</button>${current.archived?'<button class="button danger" data-delete-admin>Eliminar definitivamente</button>':''}</div><header class="dashboard-project-heading"><div><p class="eyebrow">${esc(current.username||current.ownerId)} / ${esc(current.need)}</p><h2>${esc(current.title)}</h2><p>${esc(current.summary)}</p><small>Actualizado: ${date(current.updatedAt)}</small></div>${badge(progressPhase(current))}</header>${current.applicant?.email?`<p class="work-help">Contacto: <a href="mailto:${esc(current.applicant.email)}">${esc(current.applicant.email)}</a></p><p class="work-help">Disponibilidad para la llamada: ${esc(current.applicant.availability||'Por concretar')}</p>`:''}<p class="work-help">La consulta y la llamada de 15 minutos se atienden por correo. Aquí solo actualizas lo que la persona ve en su línea de tiempo. Confirmar recepción requiere comprobar primero el buzón.</p><form id="progress-form">${select('Fase del seguimiento','progressPhase',progressPhases,progressPhase(current))}${area('Aclaración visible para la persona (opcional)','note',current.progressNote||'',1000,false)}<button class="button">Actualizar línea de tiempo ${icon('check')}</button></form>${timeline(current)}`;
    if(appointment?.status==='booked') detail.insertAdjacentHTML('beforeend','<details class="dashboard-settings-card"><summary>Cita del sistema anterior</summary>'+appointmentCard(current,appointment,true)+'</details>');
    enhanceSelects(detail);
  }
  function renderAvailability(){root.querySelector('#admin-availability').innerHTML='';}
  function renderPeople(){
    const directory=[...users,...members.filter(member=>!users.some(user=>user.id===member.id)).map(member=>({...member,username:member.id,profile:{},roleRevision:member.revision,projectCount:0,assignedCount:0,prepared:true}))];
    root.querySelector('#people-directory-summary').textContent=`${users.length} cuentas registradas · Accesos preparados antes del primer inicio: ${directory.filter(user=>user.prepared).length}`;
    const q=root.querySelector('#admin-people-search').value.trim().toLocaleLowerCase('es');
    const inTeam=user=>user.role==='owner'||workingRoles.includes(user.role);
    const groups={all:directory,team:directory.filter(inTeam),clients:directory.filter(user=>!inTeam(user)&&user.projectCount>0),visitors:directory.filter(user=>!inTeam(user)&&!user.projectCount)};
    root.querySelector('#people-filters').innerHTML=[['all','Todas'],['team','Equipo'],['clients','Con solicitudes'],['visitors','Sin solicitudes']].map(([key,label])=>`<button data-people-filter="${key}" aria-pressed="${peopleFilter===key}">${label} <span>${groups[key].length}</span></button>`).join('');
    const visible=groups[peopleFilter].filter(user=>`${user.id} ${user.username} ${user.profile.firstName||''} ${user.profile.lastName||''}`.toLocaleLowerCase('es').includes(q));
    root.querySelector('#admin-people').innerHTML=visible.map(user=>`<article class="people-row"><div class="people-identity"><span class="people-avatar">${esc(user.username.slice(0,1).toUpperCase())}</span><div><h3>${esc(user.username)}</h3><small>${user.prepared?'Acceso preparado · aún no ha entrado':'Cuenta de Lichess registrada en Chedex'}</small></div>${badge(user.role==='owner'?'Propietario':teamRoles[user.role]&&user.role!=='disabled'?teamRoles[user.role]:'Usuario')}</div><div class="people-summary"><span>${user.projectCount||0} solicitudes/proyectos propios</span><span>${user.assignedCount||0} proyectos asignados</span></div>${user.role==='owner'?'<p class="work-help">Gestiona accesos, asignaciones y aprobaciones finales.</p>':`<form data-role-user="${esc(user.id)}" data-role-revision="${user.roleRevision||0}"><label>Acceso al equipo<select name="role"><option value="disabled"${!workingRoles.includes(user.role)?' selected':''}>Usuario · sin acceso al equipo</option>${Object.entries(teamRoles).filter(([role])=>role!=='disabled').map(([role,label])=>`<option value="${role}"${user.role===role?' selected':''}>${esc(label)}</option>`).join('')}</select></label><button class="button secondary">Guardar rol</button></form><p class="people-permission">${workingRoles.includes(user.role)?'Ve únicamente los proyectos asignados. No administra usuarios ni servicios.':'Puede utilizar su espacio personal. Registrarse no concede acceso al equipo.'}</p>`}${user.profile.bio||user.profile.goals||user.profile.email||(user.profile.links||[]).length?`<details class="people-profile"><summary>Ver perfil compartido</summary><p>${esc(user.profile.bio||'')}</p><p>${esc(user.profile.goals||'')}</p><p>${esc(user.profile.email||'')}</p><div class="work-person-links">${(user.profile.links||[]).map(link=>`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(link)}</a>`).join('')}</div></details>`:''}</article>`).join('')||'<p class="work-empty">No hay cuentas que coincidan con este filtro.</p>';
    enhanceSelects(root.querySelector('[data-admin-pane=people]'));
  }
  function renderReviews(){root.querySelectorAll('[data-review-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reviewFilter===reviewFilter)));root.querySelector('#admin-reviews').innerHTML=reviews.filter(review=>reviewFilter==='all'||review.status==='pending').map(review=>`<article class="work-review"><div class="review-stars">${icon('star').repeat(review.rating)}</div><p>${esc(review.text)}</p><strong>${esc(review.username)}</strong>${badge(review.status==='approved'?'Publicada':review.status==='hidden'?'No publicada':'Pendiente de revisión')}<small>${date(review.created_at)}</small><div class="work-row"><button class="button secondary" data-review="${esc(review.id)}" data-review-status="approved"${review.status==='approved'?' disabled':''}>Publicar</button><button class="work-text-button" data-review="${esc(review.id)}" data-review-status="hidden"${review.status==='hidden'?' disabled':''}>No publicar</button></div></article>`).join('')||'<p class="work-empty">No hay reseñas que revisar. Se habilitan para cada proyecto tras confirmar la experiencia.</p>';}
  function openTask(task){
    dialog.querySelector('form').innerHTML=`<input type="hidden" name="id" value="${esc(task?.id||'')}"><h2>${task?'Editar tarea':'Nueva tarea'}</h2><p class="admin-status error" role="alert"></p>${field('Título','title',task?.title||'',150)}${area('Descripción','details',task?.details||'',2000,false)}<div class="work-fields">${field('Responsable (opcional)','assignee',task?.assignee||'',100,false)}<label>Fecha orientativa (opcional)<input type="date" name="due" value="${esc(task?.due||'')}"></label></div>${select('Estado','status',stages,task?.status||stages[0])}${select('Visibilidad','visibility',['Interna del equipo','Compartida con el usuario'],task&&!task.internal?'Compartida con el usuario':'Interna del equipo')}<p class="work-help">Al compartir una tarea, el usuario verá su título, descripción, responsable y fecha. Al hacerla interna, se retiran también sus eventos del historial compartido; lo que ya haya visto no puede deshacerse.</p><div class="work-row"><button class="button">Guardar tarea</button><button class="work-text-button" type="button" data-cancel-task>Cancelar</button></div>`;
    enhanceSelects(dialog);dialog.showModal();
  }
  async function mutate(body){const result=await send(`/api/admin/projects/${current.id}`,{revision:current.revision,...body},'PUT');current=result.project;projects=projects.map(p=>p.id===current.id?current:p);renderList();renderDetail();renderCounts();dirty=false;dirtyForm=null;message(body.action==='update'?(body.internal?'Nota interna guardada. Solo la ve el equipo.':'Mensaje enviado al usuario. Ya está en su conversación.'):'Cambios guardados.');}
  root.addEventListener('input',event=>{if(event.target.closest('form')){dirty=true;dirtyForm=event.target.closest('form');}});
  root.addEventListener('change',event=>{if(event.target.closest('#admin-update')&&event.target.name==='visibility'){const button=event.target.closest('form').querySelector('button');button.textContent=event.target.value==='Nota interna del equipo'?'Guardar nota interna':'Enviar mensaje';}});
  root.addEventListener('click',async event=>{
    const personFilter=event.target.closest('[data-people-filter]');if(personFilter&&canLeave()){peopleFilter=personFilter.dataset.peopleFilter;dirty=false;dirtyForm=null;renderPeople();}
    const assignment=event.target.closest('[data-assign-person]');if(assignment&&canLeave())document.dispatchEvent(new CustomEvent('team:assign-person',{detail:assignment.dataset.assignPerson}));
    if(event.target.closest('[data-delete-admin]')&&canLeave()&&await confirmArchivedDeletion(current.title))run(async()=>{await send(`/api/admin/projects/${current.id}`,{revision:current.revision,confirmTitle:current.title},'DELETE');current=null;await refresh(null);document.dispatchEvent(new CustomEvent('projects:changed'));message('Proyecto eliminado definitivamente.');});
    if(event.target.closest('[data-close-project]')&&canLeave()){current=null;dirty=false;dirtyForm=null;renderList();renderDetail();list.scrollIntoView({block:'start'});}
    if(event.target.closest('[data-archive-admin]')&&canLeave()&&confirm(current.archived?'¿Restaurar el proyecto?':'¿Archivar el proyecto? Se conserva el historial y puede restaurarse.'))run(async()=>{const archived=!current.archived;await send(`/api/admin/projects/${current.id}`,{action:'archive',archived,revision:current.revision},'PUT');current=null;await refresh(null);message(archived?'Proyecto archivado. Activa Mostrar archivados para restaurarlo.':'Proyecto restaurado.');});
    const tab=event.target.closest('[data-project-tab]');if(tab)showProjectTab(tab.dataset.projectTab);const reviewTab=event.target.closest('[data-review-filter]');if(reviewTab){reviewFilter=reviewTab.dataset.reviewFilter;renderReviews();}
    if(event.target.closest('[data-production]')&&canLeave())document.dispatchEvent(new CustomEvent('team:open',{detail:current.id}));
    const phaseButton=event.target.closest('[data-phase-filter]');if(phaseButton){phaseFilter=phaseButton.dataset.phaseFilter;root.querySelectorAll('[data-phase-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===phaseButton)));renderList();return;}
    const period=event.target.closest('[data-period]');if(period){todayPeriod=period.dataset.period;renderDashboard();return;}
    const propose=event.target.closest('[data-propose-phase2]');if(propose){const id=propose.dataset.proposePhase2,saved=projects.find(item=>item.id===id);if(saved&&confirm(`¿Enviar a ${saved.username||'esta persona'} la propuesta de la fase 2? Se publica como mensaje compartido en su consulta.`))run(async()=>{const data=await api(`/api/admin/projects/${id}`);await send(`/api/admin/projects/${id}`,{revision:data.project.revision,action:'update',internal:false,text:phase2Message},'PUT');proposedCache.delete(id);await refresh();message('Propuesta de la fase 2 enviada. La persona la verá en su espacio.');});return;}
    const project=event.target.closest('[data-project]');if(project&&canLeave())run(async()=>{projectTab='settings';document.dispatchEvent(new CustomEvent('admin:navigate',{detail:'projects'}));const data=await api(`/api/admin/projects/${project.dataset.project}`);current=data.project;appointment=data.appointment;renderList();renderDetail();renderCounts();dirty=false;dirtyForm=null;message('Solicitud cargada.');detail.scrollIntoView({block:'start',behavior:'instant'});});
    const slot=event.target.closest('[data-toggle-slot]');if(slot&&canLeave())run(async()=>{const value=slots.find(item=>item.id===slot.dataset.toggleSlot);await send(`/api/admin/slots/${value.id}`,{enabled:!value.enabled,revision:value.revision},'PUT');await refresh();message('Disponibilidad actualizada.');});
    if(event.target.closest('[data-add-task]')&&canLeave()){if(dirty){renderDetail();dirty=false;dirtyForm=null;}openTask();}
    const task=event.target.closest('[data-edit-task]');if(task&&canLeave()){if(dirty){renderDetail();dirty=false;dirtyForm=null;}openTask(current.tasks.find(item=>item.id===task.dataset.editTask));}
    if(event.target.closest('[data-cancel-task]')){dialog.close();dirty=false;dirtyForm=null;}
    const review=event.target.closest('[data-review]');if(review){const saved=reviews.find(r=>r.id===review.dataset.review);run(async()=>{await send(`/api/admin/reviews/${saved.id}`,{status:review.dataset.reviewStatus,expectedText:saved.text,expectedRating:saved.rating,expectedCreatedAt:saved.created_at},'PUT');reviews=await allPages('/api/admin/reviews','reviews');renderReviews();renderCounts();message('Visibilidad de la reseña actualizada.');});}
  });
  root.addEventListener('submit',event=>{
    if(!event.target.closest('[data-work-area]')&&!['task-form','admin-create-project'].includes(event.target.getAttribute('id')))return;
    event.preventDefault();if(dirty&&dirtyForm&&dirtyForm!==event.target&&!canLeave())return;const values=Object.fromEntries(new FormData(event.target));
    if(event.target.dataset.roleUser||event.target.id==='add-team-person')runForm(event.target,async()=>{const target=event.target.dataset.roleUser||values.username.trim().toLowerCase();if(!/^[a-z0-9_-]{2,30}$/.test(target))throw new Error('Revisa el usuario de Lichess.');await send(`/api/admin/team/members/${target}`,{role:values.role,revision:Number(event.target.dataset.roleRevision||0)},'PUT');await refresh();document.dispatchEvent(new CustomEvent('team:roles-changed'));message('Rol actualizado. Los permisos ya están aplicados.');});
    if(event.target.id==='add-slot')runForm(event.target,async()=>{const starts=new Date(values.starts).getTime();await send('/api/admin/slots',{starts,ends:starts+Number(values.duration)*60000});await refresh();message('Horario habilitado para las solicitudes aceptadas.');});
    if(event.target.id==='progress-form')runForm(event.target,()=>mutate({...values,action:'progress'}));
    if(event.target.id==='request-decision')runForm(event.target,()=>mutate({...values,action:'decision'}));
    if(event.target.id==='meeting-link')runForm(event.target,async()=>{await send(`/api/admin/projects/${current.id}/appointment`,{action:'link',meetingUrl:values.meetingUrl,id:appointment.id,revision:appointment.revision},'PUT');await refresh();projectTab='settings';showProjectTab(projectTab);message('Enlace compartido en Chedex. Puedes preparar la invitación por correo.');});
    if(event.target.id==='cancel-appointment'&&confirm('¿Cancelar la cita y liberar el horario? La persona verá la cancelación en su espacio.'))runForm(event.target,async()=>{await send(`/api/admin/projects/${current.id}/appointment`,{action:'cancel',id:appointment.id,revision:appointment.revision},'PUT');await refresh();message('Cita cancelada.');});
    if(event.target.getAttribute('id')==='admin-create-project')runForm(event.target,async()=>{const result=await send('/api/admin/projects',values);await refresh(result.project.id);createDialog.close();document.dispatchEvent(new CustomEvent('admin:navigate',{detail:'projects'}));message('Proyecto creado y disponible para su usuario.');});
    if(event.target.getAttribute('id')==='project-settings')runForm(event.target,()=>mutate({...values,action:'details',archived:values.archived==='on',reviewEligible:values.reviewEligible==='on'}));
    if(event.target.getAttribute('id')==='admin-update')runForm(event.target,()=>mutate({action:'update',text:values.text,internal:values.visibility==='Nota interna del equipo'}));
    if(event.target.getAttribute('id')==='task-form')runForm(event.target,async()=>{await mutate({action:'task',task:{...values,internal:values.visibility==='Interna del equipo'}});dialog.close();});
  });
  detail.addEventListener('dragstart',event=>{const task=event.target.closest('[data-task]');if(task&&!dirty){dragId=task.dataset.task;event.dataTransfer.setData('text/plain',dragId);}else event.preventDefault();});
  detail.addEventListener('dragover',event=>{if(dragId&&event.target.closest('[data-stage]'))event.preventDefault();});
  detail.addEventListener('dragend',()=>{dragId=null;});
  detail.addEventListener('drop',event=>{event.preventDefault();const column=event.target.closest('[data-stage]'),task=current?.tasks.find(t=>t.id===dragId);dragId=null;if(column&&task&&task.status!==column.dataset.stage)run(()=>mutate({action:'task',task:{...task,status:column.dataset.stage}}));});
  document.querySelector('#workspace-refresh').addEventListener('click',()=>{if(canLeave())run(async()=>{await refresh();message('Consultas, personas y reseñas actualizadas.');});});
  dialog.addEventListener('close',()=>{if(dirtyForm===dialog.querySelector('form')){dirty=false;dirtyForm=null;}});
  root.querySelector('#show-archived').addEventListener('change',renderList);
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-create-project]')){if(dirty&&dirtyForm!==createDialog.querySelector('form')){if(!canLeave())return;renderDetail();dirty=false;dirtyForm=null;}createDialog.querySelector('[role=alert]').textContent='';createDialog.showModal();}
    if(event.target.closest('[data-close-create]'))createDialog.close();
    const view=event.target.closest('[data-admin-view]');if(view?.dataset.adminView==='projects'){root.querySelector('#admin-project-search').value=view.dataset.dashboardFilter==='waiting'?'Pendiente de revisión':'';renderList();}
  });
  root.querySelector('#admin-project-search').addEventListener('input',renderList);
  root.querySelector('#admin-people-search').addEventListener('input',renderPeople);
  return { load:()=>run(async()=>{await refresh();message('');}), hasUnsaved:()=>dirty };
}
