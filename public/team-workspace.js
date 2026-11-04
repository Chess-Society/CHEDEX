import { feedback, formProgress } from './interaction-ui.js';
import { api, allPages, send, esc, field, area, select, badge, date } from './workspace-ui.js';
import { productionStages, teamRoles } from './team-data.js';
import { enhanceSelects } from './selects.js';
import { icon } from './icons.js';

export async function initTeam(root, session) {
  const owner = session.isAdmin;
  let members = [], projects = [], current = null, busy = false, dirty = false, view = 'work', projectTab='brief', taskFilter='pending', assigningMember='', deliveryTask='';
  const status = document.querySelector('#admin-status');
  const message=feedback(status);
  const canLeave = () => !dirty || confirm('Hay cambios de producción sin guardar. ¿Quieres descartarlos?');
  const personOptions = selected => members.filter(member=>current?.teamMembers.includes(member.id)&&member.role!=='disabled').map(member=>`<option value="${esc(member.id)}"${selected===member.id?' selected':''}>${esc(member.username||member.id)}</option>`).join('');
  const shortDate = value => value ? esc(value.split('-').reverse().join('/')) : 'Sin fecha';
  async function refresh(selected=current?.id) {
    const data = await Promise.all([allPages('/api/team/projects','projects'),owner?api('/api/admin/team'):Promise.resolve({members:[]})]);
    projects=data[0];members=data[1].members;current=projects.find(project=>project.id===selected)||null;
    dirty=false;render();
  }
  async function run(action,form=null) {
    if(busy)return;busy=true;root.inert=true;const finish=formProgress(form);message(form?'Guardando el encargo…':'Actualizando…',false,true);
    try { await action();finish();message(form?.dataset.teamAction==='delegate'?'Encargo delegado. La persona ya puede verlo en su panel.':form?.dataset.teamAction==='delivery'?'Versión enviada para revisión.':form?.dataset.teamAction==='comment'?'Comentario añadido.':form?.dataset.teamAction==='status'?'Estado actualizado.':form?'Cambios guardados.':'Panel actualizado.'); }
    catch(error){finish(error.message);message(error.message,true);}
    finally {busy=false;root.inert=false;}
  }
  const taskCard = (project,task) => `<article class="work-task team-task">${badge(task.status)}<h4>${esc(task.title)}</h4><p>${esc(task.details)}</p><small>${esc(task.assignee)} · ${shortDate(task.due)}</small><form data-team-action="status" data-project-id="${esc(project.id)}"${project.archived||(!owner&&(task.assignee!==session.id||['Aprobado','Entregado'].includes(task.status)))?' inert':''}><input type="hidden" name="taskId" value="${esc(task.id)}">${select('Estado','status',owner?productionStages:[...new Set([...productionStages.slice(0,3),task.status])],task.status)}<button class="button secondary"${!owner&&(task.assignee!==session.id||['Aprobado','Entregado'].includes(task.status))?' disabled':''}>Actualizar estado</button></form>${!owner&&['editor','designer'].includes(session.teamRole)&&task.assignee===session.id&&!project.archived?`<button class="button" data-deliver-task="${esc(task.id)}" data-deliver-project="${esc(project.id)}">Entregar una versión ${icon('external')}</button>`:''}${owner?`<details><summary>Editar encargo</summary>${taskForm(task)}</details>`:''}</article>`;
  function taskForm(task) {return `<form data-team-action="task"><input type="hidden" name="id" value="${esc(task?.id||'')}">${field('Título','title',task?.title||'',150)}${area('Instrucciones','details',task?.details||'',2000,false)}<div class="work-fields"><label>Responsable<select name="assignee" required><option value="">Selecciona una persona</option>${personOptions(task?.assignee)}</select></label><label>Fecha de entrega<input type="date" name="due" value="${esc(task?.due||'')}"></label></div><button class="button">Guardar tarea</button></form>`;}
  function deliveryCard(project,delivery) {return `<article class="work-update">${badge(delivery.status)}${badge(delivery.kind||'Vídeo')}<h4>${esc(delivery.title)}</h4><p><a class="inline-link" href="${esc(delivery.url)}" target="_blank" rel="noopener noreferrer">Abrir versión ${icon('external')}</a></p><p>${esc(delivery.notes)}</p><small>${esc(delivery.author)} · ${date(delivery.createdAt)}${delivery.taskId?` · ${esc(project.production.tasks.find(task=>task.id===delivery.taskId)?.title||'Encargo')}`:''}</small>${owner?`<form data-team-action="review" data-project-id="${esc(project.id)}"><input type="hidden" name="deliveryId" value="${esc(delivery.id)}">${select('Revisión','status',['Cambios solicitados','Aprobado','Entregado'],delivery.status)}<button class="button secondary">Guardar revisión</button></form>`:''}</article>`;}
  function projectContent() {
    if(!current)return `<p class="work-empty">${projects.length?'Selecciona un proyecto para ver su encargo, materiales y entregas.':'Todavía no hay proyectos asignados. Aquí aparecerán los encargos y sus materiales.'}</p>`;
    const p=current.production;
    return `<header class="dashboard-project-heading"><div><p class="eyebrow">Espacio de producción · ${current.archived?'Archivado':'En equipo'}</p><h2>${esc(current.title)}</h2></div></header>${current.archived?'<p class="work-help">Este proyecto está archivado. Puedes consultar su contenido.</p>':''}
    <div class="production-tabs" role="group" aria-label="Apartados de producción">${[['brief','Encargo'],['tasks',owner?'Tareas':'Mis tareas'],['deliveries','Entregas'],['comments','Comentarios']].map(([key,label])=>`<button data-production-tab="${key}" aria-pressed="${projectTab===key}">${label}</button>`).join('')}</div><section data-production-pane="brief">${owner?delegateForm()+settings():`<section class="dashboard-settings-card"><h3>El encargo</h3><p class="team-copy">${esc(p.brief||'El equipo está preparando las instrucciones.')}</p><div class="team-specs">${badge(p.format)}${p.duration?`<span>${esc(p.duration)}</span>`:''}<span>${esc(p.platform||'Destino por concretar')}</span><span>Entrega: ${shortDate(p.due)}</span></div></section>`}
    <section class="dashboard-settings-card"><h3>Materiales</h3>${p.materials.length?`<div class="work-person-links">${p.materials.map(item=>`<a class="inline-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)} ${icon('external')}</a>`).join('')}</div>`:'<p class="work-empty">Aún no hay materiales compartidos.</p>'}</section>
    </section><section data-production-pane="tasks" class="dashboard-settings-card"><h3>Tareas de producción</h3><div class="team-cards">${p.tasks.filter(task=>owner||task.assignee===session.id).map(task=>taskCard(current,task)).join('')||'<p class="work-empty">Aún no hay tareas.</p>'}</div>${owner&&!current.archived?`<details><summary>Añadir tarea</summary>${taskForm()}</details>`:''}</section>
    <section data-production-pane="deliveries" class="dashboard-settings-card"><h3>Entregas y versiones</h3><p class="work-help">Cada entrega conserva su enlace y revisión. La aprobación final la realiza el propietario.</p><div class="work-feed">${[...p.deliveries].reverse().map(delivery=>deliveryCard(current,delivery)).join('')||'<p class="work-empty">La primera versión aparecerá aquí.</p>'}</div>${(owner||['editor','designer'].includes(session.teamRole))&&!current.archived?`<details${deliveryTask?' open':''}><summary>Añadir una versión</summary><form data-team-action="delivery"><label>Encargo al que corresponde<select name="taskId"><option value="">Entrega general del proyecto</option>${p.tasks.filter(task=>owner||task.assignee===session.id).map(task=>`<option value="${esc(task.id)}"${deliveryTask===task.id?' selected':''}>${esc(task.title)}</option>`).join('')}</select></label>${select('Tipo de entrega','kind',['Vídeo','Diseño','Otro'],session.teamRole==='designer'?'Diseño':'Vídeo')}${field('Nombre de la versión','title','',150)}${field('Enlace de previsualización (https://)','url','',1000)}${area('Notas de la entrega','notes','',2000,false)}<button class="button">Enviar para revisión</button></form></details>`:''}</section>
    <section data-production-pane="comments" class="dashboard-settings-card"><h3>Comentarios de producción</h3><p class="work-help">Solo los ve el equipo asignado. Puedes indicar la pieza o el minuto del vídeo, por ejemplo: «00:42: recortar esta pausa».</p><div class="work-feed">${[...p.comments].reverse().map(comment=>`<article class="work-update"><p class="team-copy">${esc(comment.text)}</p><small>${esc(comment.author)} · ${date(comment.createdAt)}${comment.deliveryId?` · ${esc(p.deliveries.find(d=>d.id===comment.deliveryId)?.title||'Versión')}`:''}</small></article>`).join('')||'<p class="work-empty">Sin comentarios todavía.</p>'}</div>${!current.archived?`<form data-team-action="comment"><label>Versión<select name="deliveryId"><option value="">Comentario general</option>${p.deliveries.map(delivery=>`<option value="${esc(delivery.id)}">${esc(delivery.title)}</option>`).join('')}</select></label>${area('Comentario','text')}<button class="button">Añadir comentario</button></form>`:''}</section>`;
  }
  function settings() {
    const p=current.production;
    return `<details class="dashboard-settings-card"><summary>Equipo, materiales y ajustes del proyecto</summary><p class="work-help">Solo se comparte este espacio de producción. Las notas y los datos privados del cliente quedan en tu panel.</p><form data-team-action="settings"><fieldset><legend>Personas asignadas</legend>${members.filter(member=>member.role!=='disabled').map(member=>`<label class="work-check"><input type="checkbox" name="teamMembers" value="${esc(member.id)}"${current.teamMembers.includes(member.id)?' checked':''}>${esc(member.username||member.id)} · ${esc(teamRoles[member.role])}</label>`).join('')||'<p>Añade primero una persona al equipo.</p>'}</fieldset>${area('Objetivo e instrucciones para producción','brief',p.brief,4000,false)}<div class="work-fields">${select('Formato','format',['Por concretar','Vertical','Horizontal','Cuadrado','Ambos','Libre'],p.format)}${field('Duración aproximada','duration',p.duration,100,false)}${field('Plataforma de destino','platform',p.platform,100,false)}<label>Fecha de entrega<input type="date" name="due" value="${esc(p.due)}"></label></div><label>Materiales (uno por línea: nombre | enlace https://)<textarea name="materials" maxlength="24000" placeholder="Guion | https://…">${esc(p.materials.map(item=>`${item.title} | ${item.url}`).join('\n'))}</textarea></label><button class="button">Guardar encargo</button></form></details>`;
  }
  function delegateForm(){return `<section class="dashboard-settings-card"><p class="eyebrow">Delegar en un paso</p><h3>¿Quién se encarga?</h3><form data-team-action="delegate"><label>Responsable<select name="assignee" required><option value="">Elige una persona del equipo</option>${members.filter(member=>member.role!=='disabled').map(member=>`<option value="${esc(member.id)}"${assigningMember===member.id?' selected':''}>${esc(member.username||member.id)} · ${esc(teamRoles[member.role])}</option>`).join('')}</select></label>${field('Qué tiene que preparar','title','',150)}${area('Instrucciones y entrega esperada','details','',2000,false)}<label>Fecha de entrega<input type="date" name="due"></label><p class="work-help">Al delegar, tendrá acceso al espacio de producción de este proyecto y recibirá esta tarea. Los perfiles y las notas del cliente permanecen en administración.</p><button class="button">Delegar encargo ${icon('external')}</button></form></section>`;}
  function render() {
    let content;
    if(!owner&&view==='work') {
      const tasks=projects.filter(project=>!project.archived).flatMap(project=>project.production.tasks.filter(task=>task.assignee===session.id&&(taskFilter==='all'||!['Aprobado','Entregado'].includes(task.status))).map(task=>({project,task}))).sort((a,b)=>(a.task.due||'9999').localeCompare(b.task.due||'9999'));
      content=`<div class="dashboard-settings-card"><p class="eyebrow">${esc(teamRoles[session.teamRole]||'Equipo Chedex')}</p><h2>Tu mesa de trabajo.</h2><p>Tus encargos, las fechas y las revisiones, en un mismo sitio.</p><div class="production-metrics"><div><strong>${tasks.length}</strong><span>Encargos en esta vista</span></div><div><strong>${projects.filter(p=>!p.archived).flatMap(p=>p.production.deliveries).filter(d=>d.author===session.id&&d.status==='Para revisar').length}</strong><span>Versiones para revisar</span></div><div><strong>${projects.filter(p=>!p.archived).flatMap(p=>p.production.deliveries).filter(d=>d.author===session.id&&d.status==='Cambios solicitados').length}</strong><span>Versiones con cambios</span></div></div><div class="production-tabs"><button data-task-filter="pending" aria-pressed="${taskFilter==='pending'}">Pendientes</button><button data-task-filter="all" aria-pressed="${taskFilter==='all'}">Todos</button></div></div><div class="team-cards">${tasks.map(({project,task})=>`<div><button class="dashboard-text-button" data-open-production="${esc(project.id)}">${esc(project.title)} ${icon('external')}</button>${taskCard(project,task)}</div>`).join('')||'<p class="work-empty">Todavía no tienes tareas asignadas.</p>'}</div>`;
    } else if(!owner&&view==='deliveries') {
      content=projects.map(project=>`<section class="dashboard-settings-card"><button class="dashboard-text-button" data-open-production="${esc(project.id)}">${esc(project.title)} ${icon('external')}</button>${[...project.production.deliveries].reverse().map(delivery=>deliveryCard(project,delivery)).join('')||'<p class="work-empty">Sin versiones todavía. Abre el proyecto para añadir una.</p>'}</section>`).join('')||'<p class="work-empty">Todavía no hay proyectos asignados.</p>';
    } else content=`${owner?'<p class="work-help">Gestiona las personas y sus roles desde <button class="dashboard-text-button" data-admin-view="people">Usuarios y equipo</button>. Aquí organizas y delegas el trabajo.</p>':''}<label class="team-project-picker">${owner?(assigningMember?'Elige un proyecto para delegar en '+esc(assigningMember):'Proyecto para organizar y delegar'):'Mis proyectos'}<select id="team-project"><option value="">Selecciona un proyecto</option>${projects.map(project=>`<option value="${esc(project.id)}"${current?.id===project.id?' selected':''}>${esc(project.title)}${project.archived?' · Archivado':''}</option>`).join('')}</select></label>${projectContent()}`;
    root.innerHTML=content;enhanceSelects(root);
    root.querySelectorAll('[data-production-pane]').forEach(pane=>pane.hidden=pane.dataset.productionPane!==projectTab);
    if(!owner){document.querySelectorAll('[data-team-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.teamView===view)));document.querySelector('#admin-section-label').textContent=view==='work'?'Mi trabajo':view==='projects'?'Mis proyectos':'Entregas';}
    if((owner||view==='projects')&&current?.archived)root.querySelectorAll('form:not([data-member])').forEach(form=>form.inert=true);
  }
  root.addEventListener('input',event=>{if(event.target.id!=='team-project')dirty=true;});
  root.addEventListener('change',event=>{
    if(event.target.id!=='team-project'){dirty=true;return;}
    if(!canLeave()){event.target.value=current?.id||'';return;}
    current=projects.find(project=>project.id===event.target.value)||null;dirty=false;render();
  });
  root.addEventListener('click',event=>{
    const filter=event.target.closest('[data-task-filter]');if(filter&&canLeave()){taskFilter=filter.dataset.taskFilter;dirty=false;render();}
    const tab=event.target.closest('[data-production-tab]');if(tab&&canLeave()){projectTab=tab.dataset.productionTab;dirty=false;render();}
    const deliver=event.target.closest('[data-deliver-task]');if(deliver&&canLeave()){current=projects.find(p=>p.id===deliver.dataset.deliverProject);deliveryTask=deliver.dataset.deliverTask;view='projects';projectTab='deliveries';dirty=false;render();return;}
    const button=event.target.closest('[data-open-production]');if(!button||!canLeave())return;
    current=projects.find(project=>project.id===button.dataset.openProduction);view='projects';projectTab='brief';deliveryTask='';dirty=false;render();
  });
  root.addEventListener('submit',event=>{
    const form=event.target.closest('form');if(!form)return;event.preventDefault();
    const values=Object.fromEntries(new FormData(form));
    run(async()=>{
        const action=form.dataset.teamAction,project=projects.find(project=>project.id===(form.dataset.projectId||current?.id));
        let body={...values,action,revision:project.revision};
        if(action==='settings') {
          body.teamMembers=new FormData(form).getAll('teamMembers');
          body.materials=values.materials.split('\n').filter(line=>line.trim()).map(line=>{const split=line.indexOf('|');if(split<1)throw new Error('Escribe cada material como nombre | enlace.');return {title:line.slice(0,split).trim(),url:line.slice(split+1).trim()};});
        }
        if(action==='task')body={action,revision:project.revision,task:values};
        const data=await send(`/api/team/projects/${project.id}`,body,'PUT');
        projects=projects.map(item=>item.id===data.project.id?data.project:item);if(current?.id===data.project.id)current=data.project;
        dirty=false;deliveryTask='';if(action==='delegate'){projectTab='tasks';assigningMember='';}render();
    },form);
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-admin-view]')&&dirty&&!root.hidden){if(!canLeave()){event.preventDefault();event.stopImmediatePropagation();}else{dirty=false;render();}}
  },true);
  if(owner) document.addEventListener('click',event=>{if(event.target.closest('[data-admin-view=team]')||(!root.hidden&&event.target.closest('#workspace-refresh'))){if(canLeave())run(()=>refresh());}});
  if(!owner){
    document.querySelector('.dashboard-navigation').innerHTML=[['work','Mi trabajo'],['projects','Mis proyectos'],['deliveries','Entregas']].map(([key,label])=>`<button data-team-view="${key}" aria-pressed="${key===view}">${icon(key==='work'?'dashboard':key==='projects'?'folder':'check')}${label}</button>`).join('');
    document.querySelector('.dashboard-navigation').addEventListener('click',event=>{const button=event.target.closest('[data-team-view]');if(!button||!canLeave())return;view=button.dataset.teamView;dirty=false;render();document.querySelectorAll('[data-team-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));document.querySelector('#admin-section-label').textContent=button.textContent;});
    document.querySelector('#workspace-refresh').addEventListener('click',()=>{if(canLeave())run(()=>refresh());});
  }
  document.addEventListener('team:roles-changed',()=>{if(!dirty)refresh().catch(error=>message(error.message,true));});
  document.addEventListener('projects:changed',()=>{if(!dirty)refresh().catch(error=>message(error.message,true));});
  await refresh();
  return { hasUnsaved:()=>dirty, openProject:async id=>{if(!canLeave())return;view='projects';projectTab='brief';await refresh(id);},assignPerson:async id=>{if(!canLeave())return;assigningMember=id;view='projects';projectTab='brief';await refresh(null);} };
}
