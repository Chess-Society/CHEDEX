export const defaultServices = [
  {
    id: 'apoyo-puntual', label: 'Para una necesidad concreta', title: 'Apoyo puntual',
    description: '30 minutos de asesoramiento y edición de un vídeo corto por La Chulapa para resolver una necesidad concreta. Incluye 2 revisiones.',
    features: ['30 minutos de asesoramiento', '1 vídeo corto', '2 revisiones incluidas'],
    button: 'Consultar apoyo puntual', profile: 'Otra consulta', need: 'Apoyo puntual', graphic: 'content',
    featured: false, published: true, priceText: '90 € · IVA incluido · Pago único', showPrice: true,
  },
  {
    id: 'representacion', label: 'Para torneos y eventos', title: 'Representación y eventos',
    description: 'Una hora de asesoramiento, edición de 3 vídeos cortos y apoyo de TopChess en la difusión en redes sociales para tu torneo o evento. Incluye 2 revisiones.',
    features: ['1 hora de asesoramiento', '3 vídeos cortos', '2 revisiones incluidas', 'Apoyo de TopChess en redes sociales'],
    button: 'Consultar representación y eventos', profile: 'Otra consulta', need: 'Representación', graphic: 'career',
    featured: false, published: true, priceText: '150 € · IVA incluido · Por evento', showPrice: true,
  },
  {
    id: 'acompanamiento', label: 'Para avanzar juntos', title: 'Acompañamiento',
    description: '2 sesiones de 45 minutos, edición de 5 vídeos cortos al mes y apoyo de TopChess en redes sociales. Incluye 2 revisiones y seguimiento, sin permanencia.',
    features: ['2 sesiones de 45 minutos', '5 vídeos cortos al mes', '2 revisiones incluidas', 'Apoyo de TopChess en redes sociales', 'Sin permanencia'],
    button: 'Consultar acompañamiento', profile: 'Otra consulta', need: 'Acompañamiento', graphic: 'support',
    featured: true, published: true, priceText: '250 € · IVA incluido · Por mes', showPrice: true,
  },
  {
    id: 'desarrollo-proyectos', label: 'Consultoría de proyectos', title: 'Desarrollo de proyectos',
    description: 'Asesoramiento para poner en marcha una iniciativa de ajedrez: objetivos, modelo de actividad, captación y plan de acción. Para clubes, escuelas, profesores, emprendedores y organizadores. Presupuesto según alcance, duración y colaboradores.',
    features: ['Evaluación inicial', 'Objetivos y modelo de actividad', 'Estrategia de captación', 'Propuestas para colegios, empresas o instituciones', 'Plan de acción'],
    button: 'Consultar desarrollo de proyectos', profile: 'Otra consulta', need: 'Desarrollo de proyectos', graphic: 'school',
    featured: false, published: true, priceText: 'Presupuesto personalizado', showPrice: true,
  },
];

export const serviceProfiles = ['Jugador/a', 'Profesor/a', 'Empresa u organización', 'Otra consulta'];
export const serviceNeeds = ['Orientación inicial', 'Apoyo puntual', 'Representación', 'Acompañamiento', 'Desarrollo de proyectos', 'Colaboración de marca'];

export function publicServices(services) {
  return services.filter(service => service.published).map(({ published, showPrice, priceText, ...service }) => ({
    ...service, ...(showPrice && priceText ? { priceText } : {}),
  }));
}
