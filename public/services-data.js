export const defaultServices = [
  {
    id: 'apoyo-puntual', label: 'Para una necesidad concreta', title: 'Apoyo puntual',
    description: 'Ayuda con una necesidad u objetivo específico. Nos cuentas tu situación y vemos qué podemos aportar.',
    features: ['Escuchar lo que necesitas', 'Un alcance concreto', 'Un primer paso útil'],
    button: 'Cuéntanos qué necesitas', profile: 'Otra consulta', need: 'Apoyo puntual', graphic: 'content',
    featured: true, published: true, priceText: '', showPrice: false,
  },
  {
    id: 'representacion', label: 'Para jugadores y profesores', title: 'Representación',
    description: 'Búsqueda y negociación de oportunidades para jugadores y profesores, dentro del alcance que acordemos contigo.',
    features: ['Conocer tus objetivos', 'Explorar oportunidades', 'Hablar contigo cada paso'],
    button: 'Hablemos de tu trayectoria', profile: 'Otra consulta', need: 'Representación', graphic: 'career',
    featured: false, published: true, priceText: '', showPrice: false,
  },
  {
    id: 'acompanamiento', label: 'Para avanzar juntos', title: 'Acompañamiento',
    description: 'Apoyo continuado durante un proyecto o etapa profesional. Acordamos contigo el ritmo y la forma de acompañarte.',
    features: ['Objetivos compartidos', 'Seguimiento cercano', 'Adaptación durante el camino'],
    button: 'Hablar de mi proyecto', profile: 'Otra consulta', need: 'Acompañamiento', graphic: 'support',
    featured: false, published: true, priceText: '', showPrice: false,
  },
];

export const serviceProfiles = ['Jugador/a', 'Profesor/a', 'Empresa u organización', 'Otra consulta'];
export const serviceNeeds = ['Orientación inicial', 'Apoyo puntual', 'Representación', 'Acompañamiento', 'Colaboración de marca'];

export function publicServices(services) {
  return services.filter(service => service.published).map(({ published, showPrice, priceText, ...service }) => ({
    ...service, ...(showPrice && priceText ? { priceText } : {}),
  }));
}
