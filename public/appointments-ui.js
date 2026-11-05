import { esc, date, area, select, badge } from './workspace-ui.js';
import { requestStates } from './project-data.js';

export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dayKey = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const time = value => new Intl.DateTimeFormat('es-ES',{timeStyle:'short'}).format(new Date(value));

export function decisionCard(project, admin = false) {
  const state = project.requestStatus || 'Pendiente de revisión';
  return `<section class="request-card"><p class="eyebrow">${admin?'Solicitud recibida':'Tu solicitud'}</p><h3>${esc(state)}</h3><ol class="request-progress" aria-label="Seguimiento de la solicitud">${['Enviada','Pendiente de revisión','En evaluación',state==='Denegada'?'Denegada':'Aceptada'].map((step,index)=>`<li${index <= (requestStates.indexOf(state)+1) ? ' class="reached"' : ''}>${esc(step)}</li>`).join('')}</ol>${project.applicant?`<p>${esc([project.applicant.firstName,project.applicant.lastName].filter(Boolean).join(' '))} · Cuenta Lichess vinculada</p>`:''}${state==='Denegada'?`<p>${esc(project.decisionReason || 'El equipo ha revisado tu propuesta y en este momento no puede asumirla.')}</p>`:state==='Aceptada'?'<p>Tu idea encaja para una primera conversación. Puedes reservar una videollamada. La aceptación no implica todavía un acuerdo de colaboración.</p>':admin?'<p>Revisa el encargo y guarda tu decisión. La persona verá el estado en su espacio. Para responderle, utiliza Conversación.</p>':'<p>El equipo revisará tu idea y te responderá aquí. Puedes ampliar la información en la conversación privada.</p>'}${admin?`<form id="request-decision">${select('Decisión sobre la solicitud','requestStatus',requestStates,state)}${area('Motivo de la denegación (opcional, visible para la persona)','reason',project.decisionReason || '',2000,false)}<p class="work-help">Las notas internas se escriben en Conversación. Este motivo se mostrará al denegar la solicitud.</p><button class="button">Guardar decisión</button></form>`:''}</section>`;
}

export function appointmentCard(project, appointment, admin = false) {
  if (!appointment || appointment.status !== 'booked') return `<section class="request-card"><h3>Videollamada</h3><p>${appointment?'La cita anterior está cancelada. ':''}${project.requestStatus==='Aceptada'&&!project.archived?'Todavía no hay una cita reservada.':'El calendario se abrirá al aceptar la solicitud.'}</p></section>`;
  const future = appointment.starts > Date.now();
  return `<section class="request-card"><p class="eyebrow">Videollamada reservada</p><h3>${esc(date(appointment.starts))}</h3><p>Hasta las ${esc(time(appointment.ends))} · Zona horaria: ${esc(timeZone)}</p>${appointment.meetingUrl?`<a class="button" href="${esc(appointment.meetingUrl)}" target="_blank" rel="noopener noreferrer">Abrir videollamada</a>`:'<p>El equipo añadirá aquí el enlace externo. Puedes consultar esta página antes de la cita.</p>'}${admin?`<p>Correo para la invitación: ${esc(appointment.email)}</p><form id="meeting-link"><label>Enlace externo de videollamada<input type="url" name="meetingUrl" required maxlength="1500" value="${esc(appointment.meetingUrl)}" placeholder="https://…"></label><button class="button">Guardar enlace para la persona</button></form><p class="work-help">El enlace se comparte dentro de Chedex. La invitación por correo se envía manualmente desde tu aplicación de correo.</p>${appointment.meetingUrl?`<a class="button secondary" href="${esc(invitation(appointment,project))}">Preparar invitación por correo</a>`:''}`:'<p>El correo se utiliza para la invitación. Los mensajes del proyecto continúan dentro de Chedex.</p>'}${future?'<form id="cancel-appointment"><button class="work-text-button">Cancelar cita para elegir otro horario</button></form>':''}</section>`;
}
function invitation(appointment, project) {
  const body = `Hola,\n\nTu videollamada sobre «${project.title}» está reservada para el ${date(appointment.starts)} (${timeZone}).\n\nEnlace: ${appointment.meetingUrl}\n\nPuedes consultar tu cita y escribirnos en https://chedex.app/cuenta .`;
  return `mailto:${encodeURIComponent(appointment.email)}?subject=${encodeURIComponent('Videollamada · Chedex')}&body=${encodeURIComponent(body)}`;
}

export function bookingForm(slots) {
  if (!slots.length) return '<section class="request-card"><h3>Elegir videollamada</h3><p>Ahora mismo no hay horarios disponibles. Escríbenos en la conversación privada para que el equipo habilite nuevas fechas.</p></section>';
  return `<section class="request-card"><h3>Elige tu videollamada</h3><p>Solo aparecen los huecos habilitados por el equipo. Zona horaria: <strong>${esc(timeZone)}</strong>.</p><form id="book-appointment"><div data-booking-calendar></div><label>Correo para recibir la invitación<input type="email" name="email" required maxlength="150" autocomplete="email"></label><p class="legal-form-note">Se utilizará para enviarte la invitación. La conversación y el enlace también estarán en Chedex. <a href="/privacidad">Privacidad</a>.</p><button class="button">Confirmar día y hora</button></form></section>`;
}

export function mountCalendar(root, slots) {
  if (!root || !slots.length) return;
  const months = [...new Set(slots.map(slot=>dayKey(slot.starts).slice(0,7)))];
  let month = months[0], selectedDay = dayKey(slots[0].starts);
  function render() {
    const [year,m] = month.split('-').map(Number), offset=(new Date(year,m-1,1).getDay()+6)%7, days=new Date(year,m,0).getDate();
    const daySlots=slots.filter(slot=>dayKey(slot.starts)===selectedDay);
    root.innerHTML=`<label>Mes<select data-calendar-month>${months.map(value=>`<option value="${value}"${value===month?' selected':''}>${esc(new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(`${value}-01T12:00:00`)))}</option>`).join('')}</select></label><div class="booking-calendar" role="group" aria-label="Días disponibles">${['L','M','X','J','V','S','D'].map(day=>`<span aria-hidden="true">${day}</span>`).join('')}${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:days},(_,i)=>{const key=`${month}-${String(i+1).padStart(2,'0')}`,available=slots.some(slot=>dayKey(slot.starts)===key);return `<button type="button" data-calendar-day="${key}" aria-label="${key}" aria-pressed="${selectedDay===key}"${available?'':' disabled'}>${i+1}</button>`;}).join('')}</div><fieldset class="booking-times"><legend>Horas disponibles · ${esc(selectedDay)}</legend>${daySlots.map(slot=>`<label><input type="radio" name="slotId" value="${esc(slot.id)}" required>${esc(time(slot.starts))}–${esc(time(slot.ends))}</label>`).join('')}</fieldset>`;
  }
  root.addEventListener('change',event=>{if(event.target.matches('[data-calendar-month]')){month=event.target.value;selectedDay=dayKey(slots.find(slot=>dayKey(slot.starts).startsWith(month)).starts);render();}});
  root.addEventListener('click',event=>{const button=event.target.closest('[data-calendar-day]');if(button){selectedDay=button.dataset.calendarDay;render();}});
  render();
}

export function availabilityCard(slots) {
  return `<section class="request-card"><h3>Agenda de videollamadas</h3><p>Habilita cada hueco que quieras ofrecer. Las solicitudes aceptadas comparten esta agenda. Zona horaria de estos campos: <strong>${esc(timeZone)}</strong>.</p><form id="add-slot"><div class="work-fields"><label>Día y hora de inicio<input type="datetime-local" name="starts" required></label><label>Duración<select name="duration"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option></select></label></div><button class="button">Añadir horario disponible</button></form><div class="availability-list">${slots.length?slots.map(slot=>`<div><span>${esc(date(slot.starts))}–${esc(time(slot.ends))}</span>${slot.projectId?`${badge('Reservado')}<button type="button" class="work-text-button" data-project="${esc(slot.projectId)}">Ver solicitud</button>`:`<button type="button" class="work-text-button" data-toggle-slot="${esc(slot.id)}">${slot.enabled?'Ocultar horario':'Habilitar horario'}</button>`}</div>`).join(''):'<p>Aún no hay horarios. Añade los días y horas que puedes ofrecer.</p>'}</div></section>`;
}
