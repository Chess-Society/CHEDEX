// Shared feedback for private screens. Keep message content out of notifications.
export function feedback(status) {
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const toast=document.createElement('div');toast.className='interaction-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;document.body.append(toast);
  let timer;
  return (text,error=false,pending=false)=>{
    status.textContent=text;status.classList.toggle('error',error);
    status.dataset.state=pending?'pending':error?'error':'success';
    clearTimeout(timer);toast.textContent=text;toast.hidden=!text;toast.dataset.state=status.dataset.state;
    if(text&&!pending)timer=setTimeout(()=>{toast.hidden=true;},error?12000:6500);
  };
}
export function formProgress(form) {
  if(!form)return ()=>{};
  const sending=['new-request-form','comment-form','admin-update','review-form'].includes(form.id);
  const label=sending?'Enviando…':'Guardando…';
  const button=form.querySelector('button:not([type="button"])');
  const old=button?.innerHTML;
  let note=form.querySelector('[data-form-feedback]');
  if(!note){note=document.createElement('p');note.dataset.formFeedback='';note.className='form-feedback';note.setAttribute('role','status');form.append(note);}
  note.textContent=label;note.dataset.state='pending';form.setAttribute('aria-busy','true');
  if(button){button.textContent=label;button.classList.add('is-pending');}
  return (error='')=>{form.removeAttribute('aria-busy');if(button){button.innerHTML=old;button.classList.remove('is-pending');}note.textContent=error||'Listo. Cambios guardados.';note.dataset.state=error?'error':'success';};
}

export function confirmArchivedDeletion(title) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='project-delete-dialog';
    dialog.setAttribute('aria-labelledby','delete-project-title');
    dialog.innerHTML='<h2 id="delete-project-title">Eliminar definitivamente</h2><p>Se eliminarán este proyecto, sus mensajes, tareas, entregas, citas y la reseña vinculada. Esta acción no se puede deshacer desde Chedex.</p><strong data-delete-name></strong><form><label>Escribe el nombre exacto del proyecto<input name="confirmation" autocomplete="off" required></label><div class="work-row"><button class="button danger" disabled>Eliminar definitivamente</button><button class="button secondary" type="button" data-delete-cancel>Cancelar</button></div></form>';
    dialog.querySelector('[data-delete-name]').textContent=title;
    const form=dialog.querySelector('form'),input=form.elements.confirmation,button=form.querySelector('button');
    let confirmed=false;const previous=document.activeElement;
    input.addEventListener('input',()=>{button.disabled=input.value.trim()!==title;});
    form.addEventListener('submit',event=>{event.preventDefault();if(input.value.trim()===title){confirmed=true;dialog.close();}});
    dialog.querySelector('[data-delete-cancel]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();resolve(confirmed);},{once:true});
    document.body.append(dialog);dialog.showModal();input.focus();
  });
}
