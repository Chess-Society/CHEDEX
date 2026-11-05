import { randomUUID } from 'node:crypto';

// Never log request URLs, error messages, tokens, headers or user content.
export function reportIncident(error, component) {
  const incident = randomUUID();
  const known = ['DATABASE_UNCONFIGURED', 'DATABASE_URL', 'DATABASE_UNAVAILABLE', 'DATABASE_QUERY'];
  console.error(JSON.stringify({ event: 'chedex_error', incident, component,
    code: known.includes(error?.message) ? error.message : error?.name === 'TimeoutError' ? 'TIMEOUT' : 'UNEXPECTED' }));
  return incident;
}

export function securityHeaders({ secure = false, privatePage = false } = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
    'Content-Security-Policy': `default-src 'self'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self'${privatePage ? '' : " 'unsafe-inline'"}; font-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'`,
    ...(privatePage ? { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } : {}),
  };
}
