export const stages = ['Por hablar', 'Acordado', 'En marcha', 'Pendiente de respuesta', 'Completado'];
export const requestStates = ['Pendiente de revisión', 'En evaluación', 'Aceptada', 'Denegada'];
export const needs = ['Orientación inicial', 'Apoyo puntual', 'Representación', 'Acompañamiento', 'Desarrollo de proyectos', 'Colaboración de marca'];

// The public follow-up describes decisions, never internal production tasks.
export const progressPhases = ['Por confirmar', 'Recibida', 'Llamada de 15 min', 'Valoración', 'Propuesta acordada', 'En marcha', 'Completado', 'No seguimos'];
export function progressPhase(project) {
  if (progressPhases.includes(project.progressPhase)) return project.progressPhase;
  if (project.requestStatus === 'Denegada') return 'No seguimos';
  if (project.requestStatus === 'En evaluación') return 'Valoración';
  if (project.requestStatus !== 'Aceptada') return 'Recibida';
  return ({'Por hablar':'Llamada de 15 min','Acordado':'Propuesta acordada','En marcha':'En marcha','Pendiente de respuesta':'En marcha','Completado':'Completado'})[project.stage] || 'Recibida';
}
export const contactEmail = 'chedexapp@proton.me';
export function requestEmail(values, username) {
  const questions = {
    'Apoyo puntual':'La ayuda concreta que necesito y el resultado que espero:',
    'Representación':'Dónde necesito que Chedex me represente y para qué:',
    'Acompañamiento':'Mi proyecto, mis objetivos a medio plazo y dónde necesito apoyo:',
    'Desarrollo de proyectos':'La iniciativa de ajedrez que quiero poner en marcha, su punto de partida y la ayuda que necesito:',
    'Colaboración de marca':'La marca o entidad, la colaboración que propongo y su objetivo:',
    'Orientación inicial':'Mi situación y la orientación que estoy buscando:'
  };
  return {
    to:contactEmail,
    subject:`[Chedex · ${values.need}] ${values.title}`.replace(/[\r\n]+/g,' '),
    body:`Hola, equipo de Chedex:\n\nSoy ${values.firstName} ${values.lastName || ''} (Lichess: ${username}).\nMi correo de contacto es ${values.email}.\n\nModalidad: ${values.need}\nIdea: ${values.title}\n\n${questions[values.need] || questions['Orientación inicial']}\n${values.summary}\n\nDisponibilidad para una primera llamada de 15 minutos (indicando zona horaria):\n${values.availability}\n\nMe gustaría empezar con esa llamada para explicar lo que busco y ver si encaja.\n\nGracias.`
  };
}
