import { progressPhase } from './project-data.js';
import { phaseOfNeed } from './dash-data.js';
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

// What comes after the current phase, so the person always knows the next step.
const afterPhase = {
  'Por confirmar': 'Chedex confirmará que ha recibido tu correo y te propondrá una llamada de 15 minutos.',
  'Recibida': 'Acordaremos por correo el horario de una llamada de 15 minutos.',
  'Llamada de 15 min': 'Valoraremos contigo cómo ayudarte y con qué alcance.',
  'Valoración': 'Si encaja, acordaremos el alcance y los siguientes pasos por correo.',
  'Propuesta acordada': 'Empezaremos a trabajar en lo acordado.',
  'En marcha': 'Al completar el trabajo cerraremos el recorrido y valoraremos si quieres dar el siguiente paso.',
};
export function nextStep(project) {
  if (!project || project.archived) return '';
  return afterPhase[progressPhase(project)] || '';
}

// A finished consultancy invites the second phase, unless the person already asked for it.
export function phase2Offer(projects) {
  const active = projects.filter(project => !project.archived);
  const done = active.filter(project => phaseOfNeed(project.need) === 'consultoria' && progressPhase(project) === 'Completado');
  if (!done.length || active.some(project => phaseOfNeed(project.need) === 'marca-personal')) return null;
  return done[0];
}

// Six visible steps of a consulta; «Por confirmar» has not started and «No seguimos» is closed.
export const journey = ['Recibida', 'Llamada de 15 min', 'Valoración', 'Propuesta acordada', 'En marcha', 'Completado'];
export function progressSteps(project) {
  const phase = progressPhase(project);
  const at = journey.indexOf(phase);
  return journey.map((label, index) => ({ label, state: at < 0 ? 'todo' : index < at || phase === 'Completado' ? 'done' : index === at ? 'current' : 'todo' }));
}
