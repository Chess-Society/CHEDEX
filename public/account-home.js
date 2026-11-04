import { progressPhase } from './project-data.js';
export function homeProject(projects) {
  const priority = p => !p.archived && !['Completado','No seguimos'].includes(progressPhase(p)) ? 0 : 1;
  return [...projects].sort((a,b)=>priority(a)-priority(b)||b.updatedAt-a.updatedAt)[0] || null;
}
export function accountStep(project) {
  if (!project) return {kind:'welcome', title:'Primero, cuéntanos qué buscas.', text:'Prepara tu consulta y envíala por correo. Empezaremos con una llamada de 15 minutos para conocerte. Tener una cuenta no te compromete a enviar una propuesta.',label:'Preparar mi consulta',action:'request'};
  const phase=progressPhase(project);
  const states={
    'Por confirmar':['waiting','Recepción por confirmar.','Has indicado que has enviado el correo. Chedex todavía no ha confirmado su recepción.'],
    'Recibida':['waiting','Tenemos tu consulta.','El primer contacto será una llamada corta de 15 minutos. Concretaremos el horario por correo.'],
    'Llamada de 15 min':['meeting','Primero nos conocemos.','Una llamada de 15 minutos para entender qué buscas. La fecha y el enlace se acuerdan por correo.'],
    'Valoración':['waiting','Estamos valorando cómo ayudarte.','Después de conocernos, valoramos si podemos ayudarte y con qué alcance.'],
    'Propuesta acordada':['working','Ya tenemos un punto de partida.','Hemos acordado el alcance y los siguientes pasos por correo.'],
    'En marcha':['working','Tu proyecto está en marcha.','Aquí verás sus cambios de fase. El trabajo y las comunicaciones se gestionan por correo.'],
    'Completado':['completed','Hemos completado este recorrido.','Puedes consultar las fases y las fechas de tu proyecto.'],
    'No seguimos':['declined','Esta propuesta no continúa.',project.decisionReason || 'Por ahora no avanzamos con esta propuesta. Cualquier aclaración la tratamos por correo.']
  };
  const [kind,title,text]=states[phase];
  return {kind:project.archived?'closed':kind,title:project.archived?'Seguimiento archivado.':title,text,label:'Ver línea de tiempo',tab:'overview'};
}
