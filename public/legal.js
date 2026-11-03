document.querySelectorAll('[data-legal-section]').forEach(button=>button.addEventListener('click',()=>{
  const section=document.getElementById(`legal-${button.dataset.legalSection}`);
  if(!section)return;
  section.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  const heading=section.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
  document.querySelectorAll('[data-legal-section]').forEach(item=>{if(item===button)item.setAttribute('aria-current','location');else item.removeAttribute('aria-current');});
}));
document.querySelector('[data-print-legal]')?.addEventListener('click',()=>window.print());
