import { icon } from './icons.js';
import { phaseOf } from './services-data.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const renderPrice = value => {
  const [amount, ...conditions] = String(value).split(' · ');
  return `<span class="service-price">${escape(amount)}${conditions.length ? `<small>${escape(conditions.join(' · '))}</small>` : ''}</span>`;
};
const graphics = {
  support: '<circle cx="195" cy="106" r="82" fill="#f18b4211"/><path d="m93 135 102-65 102 65" fill="none" stroke="#f18b42" stroke-width="3" stroke-dasharray="5 7"/><circle cx="93" cy="124" r="18" fill="#d9dde5"/><circle cx="195" cy="59" r="18" fill="#f18b42"/><circle cx="297" cy="124" r="18" fill="#d9dde5"/><path d="M63 165c0-33 60-33 60 0Zm102-65c0-33 60-33 60 0Zm102 65c0-33 60-33 60 0Z" fill="#292e38" stroke="#5c6472" stroke-width="2"/><path d="m184 139 8 8 18-20" fill="none" stroke="#f18b42" stroke-width="4"/>',
  school: '<circle cx="270" cy="90" r="72" fill="#f18b4212"/><path d="m122 78 70-45 70 45v96H122Z" fill="#262a32" stroke="#555b68"/><path d="m105 81 87-57 87 57" fill="none" stroke="#f18b42" stroke-width="4"/><rect x="175" y="129" width="34" height="45" rx="3" fill="#f18b42"/><path d="M143 94h17v17h-17Zm80 0h17v17h-17ZM143 131h17v17h-17Zm80 0h17v17h-17Z" fill="#c6ccd6"/><path d="M85 174h213" stroke="#737c8c" stroke-width="2"/><circle cx="192" cy="72" r="13" fill="#13171d" stroke="#f18b42"/><path d="M192 64v9h7" stroke="#f18b42" fill="none" stroke-width="2"/>',
  travel: '<circle cx="260" cy="105" r="75" fill="#f18b4214"/><path d="M55 145C135 40 230 190 335 65" fill="none" stroke="#f18b42" stroke-width="2" stroke-dasharray="5 7"/><circle cx="55" cy="145" r="7" fill="#f18b42"/><circle cx="335" cy="65" r="7" fill="#f18b42"/><path d="m173 87 43 25-43 25 8-25Z" fill="#ecece8"/><rect x="254" y="132" width="78" height="40" rx="8" fill="#24272f" stroke="#444752"/><path d="M273 145h40m-40 11h25" stroke="#b3b7c4" stroke-width="2"/>',
  career: '<circle cx="180" cy="106" r="83" fill="#f18b4211"/><path d="M90 160V125h40v35m15 0V95h40v65m15 0V65h40v95m15 0V35h40v125" fill="#292d36" stroke="#414651"/><path d="m94 96 62-24 46 7 89-55m-26 1h28v27" fill="none" stroke="#f18b42" stroke-width="3"/><circle cx="87" cy="43" r="14" fill="#eaeae5"/><path d="m77 59-13 36h47L98 59m-36 38h51v9H62" fill="#eaeae5"/>',
  content: '<rect x="73" y="37" width="154" height="141" rx="12" fill="#20232a" stroke="#454952" transform="rotate(-7 150 100)"/><rect x="158" y="30" width="133" height="154" rx="11" fill="#292c34" stroke="#50545f"/><rect x="175" y="47" width="98" height="49" rx="5" fill="#f18b4225"/><circle cx="223" cy="71" r="14" fill="#f18b42"/><path d="M176 115h96m-96 15h77m-77 15h89m-89 15h53" stroke="#b0b5c2" stroke-width="3"/>',
};

const phases = [
  { id: 'consultoria', number: 'Fase 1', title: 'Consultoría Chedex', text: 'Primero entendemos tu proyecto y definimos el camino. Asesoramiento accesible para el sector.', action: 'Ver servicio completo' },
  { id: 'marca-personal', number: 'Fase 2', title: 'Marca personal con La Chulapa', text: 'Cuando el proyecto está claro, damos el siguiente paso: asesoramiento y edición de vídeo para tu marca personal.', action: 'Ver paquete completo' },
];

const renderCard = (service, action) => `<article class="bundle-card${service.featured ? ' featured' : ''}">
    <div class="bundle-visual"><span class="bundle-label">${escape(service.label)}</span><svg viewBox="0 0 390 205" aria-hidden="true">${graphics[service.graphic] || graphics.content}</svg><span class="bundle-watermark">CHEDEX / A TU MEDIDA</span></div>
    <div class="bundle-copy"><h3>${escape(service.title)}</h3><p>${escape(service.description)}</p><div class="bundle-bottom">${service.priceText ? renderPrice(service.priceText) : ''}<a href="/servicios" class="button" aria-label="Ver detalles de ${escape(service.title)}">${action} <span aria-hidden="true">${icon('external')}</span></a></div></div>
  </article>`;

export function renderServices(container, services) {
  if (!services.length) {
    container.innerHTML = '<p>Estamos preparando nuevas propuestas. Mientras tanto, cuéntanos qué necesitas.</p>';
    return;
  }
  container.innerHTML = phases.map(phase => {
    const group = services.filter(service => phaseOf(service) === phase.id);
    if (!group.length) return '';
    return `<section class="phase-group phase-group--${phase.id}" aria-labelledby="phase-${phase.id}"><div class="phase-heading"><span class="phase-number">${phase.number}</span><div><h3 id="phase-${phase.id}">${phase.title}</h3><p>${phase.text}</p></div></div><div class="phase-cards">${group.map(service => renderCard(service, phase.action)).join('')}</div></section>`;
  }).join('');
}

export async function loadServices(container) {
  container.textContent = 'Cargando servicios…';
  try {
    const response = await fetch('/api/services', { cache: 'no-store' });
    if (!response.ok) throw new Error('CATALOG_UNAVAILABLE');
    const data = await response.json();
    if (!Array.isArray(data.services)) throw new Error('CATALOG_INVALID');
    renderServices(container, data.services);
  } catch {
    container.textContent = 'No se han podido cargar los servicios. Actualiza la página o contacta con el equipo.';
  }
}
