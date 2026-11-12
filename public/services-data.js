export const defaultServices = [
  {
    id: 'consultoria-puntual', phase: 'consultoria', label: 'Para una duda concreta', title: 'Consultoría puntual',
    description: 'Una conversación para entender tu situación y darte un diagnóstico claro. Recibes recomendaciones y un resumen de los próximos pasos.',
    features: ['Diagnóstico en conversación', 'Recomendaciones prácticas', 'Resumen de próximos pasos'],
    button: 'Consultar consultoría puntual', profile: 'Otra consulta', need: 'Consultoría puntual', graphic: 'support',
    featured: false, published: true, priceText: '50 € · IVA incluido · Pago único', showPrice: true,
  },
  {
    id: 'consultoria-estrategica', phase: 'consultoria', label: 'Para mejorar tu proyecto o negocio', title: 'Consultoría estratégica',
    description: 'Analizamos tu proyecto o negocio de ajedrez: servicios, precios, captación de clientes y oportunidades. Recibes un documento con propuestas de mejora.',
    features: ['Análisis del proyecto o negocio', 'Servicios, precios y captación', 'Documento con propuestas de mejora'],
    button: 'Consultar consultoría estratégica', profile: 'Otra consulta', need: 'Consultoría estratégica', graphic: 'career',
    featured: false, published: true, priceText: 'Desde 180 € · IVA incluido · Según alcance', showPrice: true,
  },
  {
    id: 'desarrollo-proyectos', phase: 'consultoria', label: 'Para poner en marcha tu idea', title: 'Desarrollo de proyectos',
    description: 'Asesoramiento para poner en marcha una iniciativa de ajedrez: objetivos, modelo de actividad, captación y plan de acción. Para clubes, escuelas, profesores, emprendedores y organizadores. Presupuesto según alcance, duración y colaboradores.',
    features: ['Evaluación inicial', 'Objetivos y modelo de actividad', 'Estrategia de captación', 'Propuestas para colegios, empresas o instituciones', 'Plan de acción'],
    button: 'Consultar desarrollo de proyectos', profile: 'Otra consulta', need: 'Desarrollo de proyectos', graphic: 'school',
    featured: false, published: true, priceText: 'Desde 350 € · IVA incluido · Según alcance', showPrice: true,
  },
  {
    id: 'acompanamiento-estrategico', phase: 'consultoria', label: 'Para avanzar con seguimiento', title: 'Acompañamiento estratégico',
    description: 'Reuniones periódicas para revisar avances y ajustar la estrategia mientras pones en marcha tu proyecto, sin ejecutar cada tarea por ti.',
    features: ['Reuniones periódicas', 'Revisión de avances', 'Ajustes de estrategia'],
    button: 'Consultar acompañamiento estratégico', profile: 'Otra consulta', need: 'Acompañamiento estratégico', graphic: 'travel',
    featured: false, published: true, priceText: '120 € · IVA incluido · Por mes', showPrice: true,
  },
  {
    id: 'apoyo-puntual', phase: 'marca-personal', label: 'Para una necesidad concreta', title: 'Apoyo puntual',
    description: '30 minutos de asesoramiento y edición de un vídeo corto por La Chulapa para resolver una necesidad concreta. Incluye 2 revisiones.',
    features: ['30 minutos de asesoramiento', '1 vídeo corto', '2 revisiones incluidas'],
    button: 'Consultar apoyo puntual', profile: 'Otra consulta', need: 'Apoyo puntual', graphic: 'content',
    featured: false, published: true, priceText: '90 € · IVA incluido · Pago único', showPrice: true,
  },
  {
    id: 'representacion', phase: 'marca-personal', label: 'Para torneos y eventos', title: 'Representación y eventos',
    description: 'Una hora de asesoramiento, edición de 3 vídeos cortos y apoyo de TopChess en la difusión en redes sociales para tu torneo o evento. Incluye 2 revisiones.',
    features: ['1 hora de asesoramiento', '3 vídeos cortos', '2 revisiones incluidas', 'Apoyo de TopChess en redes sociales'],
    button: 'Consultar representación y eventos', profile: 'Otra consulta', need: 'Representación', graphic: 'career',
    featured: false, published: true, priceText: '150 € · IVA incluido · Por evento', showPrice: true,
  },
  {
    id: 'acompanamiento', phase: 'marca-personal', label: 'Para avanzar juntos', title: 'Acompañamiento',
    description: '2 sesiones de 45 minutos, edición de 5 vídeos cortos al mes y apoyo de TopChess en redes sociales. Incluye 2 revisiones y seguimiento, sin permanencia.',
    features: ['2 sesiones de 45 minutos', '5 vídeos cortos al mes', '2 revisiones incluidas', 'Apoyo de TopChess en redes sociales', 'Sin permanencia'],
    button: 'Consultar acompañamiento', profile: 'Otra consulta', need: 'Acompañamiento', graphic: 'support',
    featured: true, published: true, priceText: '250 € · IVA incluido · Por mes', showPrice: true,
  },
];

export const serviceProfiles = ['Jugador/a', 'Profesor/a', 'Empresa u organización', 'Otra consulta'];
export const serviceNeeds = ['Orientación inicial', 'Consultoría puntual', 'Consultoría estratégica', 'Acompañamiento estratégico', 'Apoyo puntual', 'Representación', 'Acompañamiento', 'Desarrollo de proyectos', 'Colaboración de marca'];

export const servicePhases = ['consultoria', 'marca-personal'];
const brandPackages = ['apoyo-puntual', 'representacion', 'acompanamiento'];
export const phaseOf = service => servicePhases.includes(service.phase) ? service.phase : brandPackages.includes(service.id) ? 'marca-personal' : 'consultoria';

// Catalogues saved before phases existed gain the field and the missing consultancy services, once.
export function migrateCatalog(services) {
  if (services.every(service => servicePhases.includes(service.phase))) return { services, changed: false };
  const normalized = services.map(service => ({ ...service, phase: phaseOf(service) }));
  const known = new Set(normalized.map(service => service.id));
  const missing = defaultServices.filter(service => !known.has(service.id)).map(service => structuredClone(service));
  const isFirst = service => service.phase === 'consultoria';
  return { services: [...missing.filter(isFirst), ...normalized, ...missing.filter(service => !isFirst(service))], changed: true };
}

export function publicServices(services) {
  return services.filter(service => service.published).map(({ published, showPrice, priceText, ...service }) => ({
    ...service, ...(showPrice && priceText ? { priceText } : {}),
  }));
}
