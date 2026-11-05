import './button-effects.js';
const menu = document.querySelector('#main-nav'), button = document.querySelector('.menu-button');
button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');menu.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.classList.remove('open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menú');}});
