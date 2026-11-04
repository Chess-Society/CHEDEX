// Shared by browser navigation, the local server and the Cloudflare Worker.
export const sectionRoutes = Object.freeze({
  '/': 'inicio',
  '/apoyo': 'apoyo',
  '/equipo': 'equipo',
  '/colaboraciones': 'colaboraciones',
  '/contacto': 'contacto',
});
export const documentRoutes = Object.freeze({
  '/servicios': 'services.html',
  '/proyectos': 'projects.html',
  '/opiniones': 'reviews.html',
  '/aviso-legal': 'legal-notice.html',
  '/privacidad': 'privacy.html',
  '/cookies': 'cookies.html',
  '/terminos': 'terms.html',
});

export function canonicalPagePath(pathname) {
  if (pathname === '/index.html') return '/';
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (Object.hasOwn(documentRoutes, normalized) || Object.hasOwn(sectionRoutes, normalized)) ? normalized : null;
}
