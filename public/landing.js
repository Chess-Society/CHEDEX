const sample={name:'TopChess',club:'',theme:'midnight',role:'',avatar:'/favicon.svg',fideStandard:'',fideRapid:'',fideBlitz:''};
let observer;
let destroyCardMotion=()=>{};

function preview(step,icon){
  if(step===0)return `<div class="home-preview-heading"><span class="home-mini-icon">${icon('card')}</span><span>Una identidad propia</span></div><div class="home-person"><img src="/favicon.svg" alt=""><div><strong>TopChess</strong><span>Tu comunidad de ajedrez</span></div><span class="home-small-tag">Ejemplo</span></div><div class="home-data-line"><span>Identidad</span><strong>TopChess</strong></div><div class="home-data-line"><span>Tu información</span><strong>Tú decides qué contar</strong></div><div class="home-biography">Un lugar para construir y compartir nuestra historia en el ajedrez.</div><span class="home-preview-note">Con o sin Elo. Con tu nombre o tu alias.</span>`;
  if(step===1)return `<div class="home-preview-heading"><span class="home-mini-icon">${icon('trophy')}</span><span>Mi historial</span><span class="home-small-tag">Torneos</span></div><div class="home-tournament"><span class="home-date"><strong>18</strong>OCT</span><div><strong>Abierto de otoño</strong><span>Madrid · Clásicas · 7 rondas</span><span class="home-small-tag">Declarado</span></div><strong class="home-score">5 <small>/ 7</small></strong></div><div class="home-tournament"><span class="home-date"><strong>12</strong>SEP</span><div><strong>Memorial del club</strong><span>Madrid · Rápidas · 9 rondas</span><span class="home-small-tag">Declarado</span></div><strong class="home-score">6 <small>/ 9</small></strong></div><div class="home-stat-chips"><span>${icon('trophy')}2 torneos</span><span>${icon('chart')}11 / 16 puntos</span></div><span class="home-preview-note">Solo se cuenta la actividad que hayas registrado.</span>`;
  if(step===2)return `<div class="home-preview-heading"><span class="home-mini-icon">${icon('medal')}</span><span>Momentos que se quedan</span></div><div class="home-achievement"><div class="home-achievement-icon">${icon('medal')}</div><span class="home-small-tag">MI PRIMER PODIO</span><strong>Hay primeras veces<br>que no se olvidan.</strong><span>3.º de mi categoría · Memorial del club</span><span class="home-small-tag">Declarado por el jugador</span></div><span class="home-preview-note">Un premio, un campeonato o un hito personal.</span>`;
  return `<div class="home-preview-heading"><span class="home-mini-icon">${icon('share')}</span><span>Tú eliges qué compartir</span></div><div class="home-sharing-profile"><img src="/favicon.svg" alt=""><div><strong>TopChess</strong><span>Su historia, a un escaneo.</span></div><span class="home-small-tag">Ejemplo</span></div><div class="home-visibility"><span>${icon('check')}Tarjeta e identidad</span><span>Visible</span></div><div class="home-visibility"><span>${icon('check')}Torneos y logros</span><span>Visible</span></div><div class="home-visibility"><span>${icon('lock')}Datos de contacto</span><span>Ocultos</span></div><div class="home-illustration-link">${icon('link')}Un enlace que acompaña tu historia.</div><span class="home-preview-note">Puedes volver a privado cuando quieras.</span>`;
}
export function renderLanding({brand,icon,card,btn,loggedIn,demoEnabled}){
  const destination=loggedIn?'/app':'/auth/lichess';
  const cta=(label='Crear mi Chedex',className='')=>`<a class="btn primary home-cta ${className}" href="${destination}">${label}${icon('arrow')}</a>`;
  const steps=[
    ['01','Tu ajedrez tiene nombre propio.','Empieza con tu cuenta de Lichess. Elige tu nombre o alias, añade lo que quieras contar y crea tu tarjeta Chedex. No necesitas Elo ni estar federado.'],
    ['02','Cada torneo suma a tu historia.','Ese abierto, la liga del club o tu primera competición. Registra dónde jugaste, cuándo y cómo te fue. Lo esencial, sin formularios interminables.'],
    ['03','Guarda lo que para ti importa.','Un podio, un reconocimiento o ese pequeño gran paso. Tu trayectoria también está hecha de momentos que una cifra de Elo no puede contar.'],
    ['04','Un encuentro. Una tarjeta.','Activa tu perfil público cuando quieras y comparte tu enlace o QR. Quien lo abra verá únicamente las secciones que hayas decidido mostrar.']
  ];
  const questions=[
    ['¿Necesito Elo o estar federado?','No. Chedex está pensado para cualquier ajedrecista: aficionado o federado, con club o sin él. El Elo, los títulos y el resto de tu trayectoria son opcionales.'],
    ['¿Cómo creo mi Chedex?','Accedes con tu propia cuenta de Lichess, confirmas tu nombre o alias y ya tienes una tarjeta. No necesitas crear una contraseña adicional para Chedex.'],
    ['¿Quién puede ver mi perfil?','Tu perfil es privado por defecto. Si decides hacerlo público, eliges qué secciones mostrar. Los datos de contacto empiezan ocultos y puedes volver a privado o cambiar el enlace.'],
    ['¿Los resultados y títulos están verificados?','Los datos que añades se muestran como declarados. Si incluyes un enlace, aparecen con fuente; eso no significa que estén verificados. La verificación oficial todavía no está disponible.'],
    ['¿Tengo que instalar una aplicación?','No. Chedex funciona desde el navegador de tu móvil, tableta u ordenador. Tu cuenta conserva la información para recuperarla cuando cambies de dispositivo.'],
    ['¿Puedo llevar la tarjeta en Apple Wallet?','Estamos preparando Apple Wallet. Por ahora aparece como próximo y no emite pases. Ya puedes compartir tu enlace y QR o descargar la tarjeta como imagen cuando tu perfil sea público.'],
    ['¿Es gratuito?','Sí. La versión actual de Chedex es gratuita. Puedes crear tu perfil y registrar y compartir tu trayectoria. Los colores y diseños adicionales están previstos como una futura opción de pago.'],
    ['¿Podré personalizar los colores de mi tarjeta?','Los colores y diseños adicionales están previstos para una futura opción de pago. Todavía no están disponibles y no hay precios ni planes anunciados. El diseño Chedex forma parte de la versión gratuita.'],
    ['¿Pueden publicar perfiles los menores?','En esta primera versión, publicar un perfil requiere confirmar la mayoría de edad. El procedimiento de autorización y los controles específicos para menores todavía están pendientes.']
  ];
  return `<div class="home">
    <header class="home-header"><div class="home-header-inner">${brand()}<nav aria-label="Navegación pública"><a href="/" data-action="home-scroll" data-target="como-funciona">Cómo funciona</a><a href="/" data-action="home-scroll" data-target="tu-privacidad">Tu privacidad</a><a href="/" data-action="home-scroll" data-target="preguntas">Preguntas</a><a class="home-enter" href="${destination}">${loggedIn?'Mi espacio':'Entrar'}</a>${cta(loggedIn?'Mi Chedex':'Crear mi Chedex','home-header-cta')}</nav></div></header>
    <main id="main">
      <section class="home-hero" aria-labelledby="home-title"><div class="home-hero-copy"><div class="home-eyebrow"><span></span>Tu pasaporte ajedrecístico</div><h1 id="home-title">Tu historia.<br><span>Siempre<br class="home-mobile-break"> contigo.</span></h1><p>Tu primera competición. Tu club de siempre. Lo que aún está por llegar. Un lugar para guardar tu camino en el ajedrez y una tarjeta para llevarlo contigo.</p><div class="home-hero-actions">${cta(loggedIn?'Ir a mi Chedex':'Crear mi Chedex')}<a class="btn home-secondary" href="/" data-action="home-scroll" data-target="como-funciona">Descubrir Chedex ${icon('arrow')}</a></div><div class="home-reassurance"><span>${icon('check')}Gratuito</span><span>${icon('check')}Sin Elo mínimo</span><span>${icon('lock')}Privado por defecto</span></div><a class="home-scroll" href="/" data-action="home-scroll" data-target="como-funciona">Prueba la tarjeta. Después, baja.${icon('download')}</a></div>
      <div class="home-hero-demo" aria-label="Demostración de una tarjeta Chedex"><div class="home-demo-top"><span class="home-live-dot"></span>Una tarjeta. Toda una historia.<span class="home-example">EJEMPLO</span></div><div id="home-card-preview">${card(sample,'EJEMPLO1-CHEDEx',false)}</div><div id="home-card-back" class="home-card-back" hidden><img src="/landing-qr.svg" alt="QR de demostración que abre la portada de Chedex"><strong>Tu historia, a un escaneo.</strong><p>El QR de tu tarjeta abrirá tu perfil público.<br>Este ejemplo abre la portada de Chedex.</p></div><div class="home-demo-controls"><span class="home-card-design-label">Diseño Chedex</span><button class="home-turn" data-action="home-turn" aria-pressed="false">${icon('qr')}Ver el QR</button></div><div class="home-demo-caption">Mueve el cursor sobre la tarjeta o consulta su reverso.</div><div class="home-moment"><span>${icon('trophy')}</span><div><strong>Un nuevo capítulo.</strong><small>Tu primer torneo ya tiene su lugar.</small></div>${icon('check')}</div><p class="home-example-note">Tarjeta y recorrido ilustrativos. Sin datos de usuarios reales.</p></div>
      </section>
      <div class="home-everyone"><span>EL AJEDREZ ES DE TODOS.</span><p>Tu historia también tiene sitio.</p><div><span>${icon('chess')}Aficionados y federados</span><span>${icon('users')}Entrenadores</span><span>${icon('shield')}Clubes y escuelas</span><span>${icon('trophy')}Organizadores</span></div></div>
      <section class="home-journey" id="como-funciona" aria-labelledby="home-journey-title"><div class="home-section-intro"><span class="home-eyebrow">DE LA PRIMERA PARTIDA A TODO LO QUE VIENE</span><h2 id="home-journey-title">Lo que juegas pasa.<br><span>Tu historia se queda.</span></h2><p>No hace falta tener una gran trayectoria para empezar a guardarla.</p></div><div class="home-walkthrough"><div class="home-story-steps">${steps.map(([num,title,description],i)=>`<article class="home-story-step ${i===0?'is-active':''}" data-home-step="${i}"><span class="home-step-number">${num} <span>/</span> TU HISTORIA</span><h3>${title}</h3><p>${description}</p><div class="home-step-mobile home-story-preview">${preview(i,icon)}<span class="home-sample-label">Ejemplo ilustrativo</span></div></article>`).join('')}</div><div class="home-story-stage"><div class="home-stage-shell"><div class="home-stage-bar"><span>ASÍ SE VE EN CHEDEX</span><span class="home-example">EJEMPLO</span></div>${steps.map((_,i)=>`<div class="home-stage-view home-story-preview" data-home-view="${i}" ${i?'hidden':''}>${preview(i,icon)}</div>`).join('')}<div class="home-stage-progress" aria-label="Explorar el recorrido">${steps.map(([num,,],i)=>`<button data-action="home-step" data-step="${i}" class="${i===0?'selected':''}" aria-label="Ver paso ${i+1}" aria-pressed="${i===0?'true':'false'}">${num}</button>`).join('')}</div></div><p class="home-stage-caption">Tu identidad. Tus torneos. Tus logros. A tu manera.</p></div></div></section>
      <section class="home-privacy" id="tu-privacidad" aria-labelledby="home-privacy-title"><div class="home-privacy-copy"><span class="home-eyebrow">TÚ DECIDES</span><h2 id="home-privacy-title">Tu historia es tuya.<br><span>También el control.</span></h2><p>Guardar tu trayectoria no significa hacerla pública. Empieza en privado y comparte solo cuando tú quieras.</p><a href="${destination}" class="home-inline-link">${loggedIn?'Ir a mi espacio':'Crear mi tarjeta privada'} ${icon('arrow')}</a></div><div class="home-privacy-points">${[['lock','Privado desde el primer día.','Tu historial no se comparte hasta que tú lo activas.'],['settings','Lo visible lo eliges tú.','Controla tus secciones y mantén el contacto oculto.'],['download','Tus datos, contigo.','Puedes exportar tu información o eliminar tu cuenta.']].map(([i,title,description])=>`<div><span class="home-mini-icon">${icon(i)}</span><div><h3>${title}</h3><p>${description}</p></div></div>`).join('')}</div></section>
      <section class="home-manifesto"><span class="home-mini-icon">${icon('chess')}</span><p>Chedex no mide lo bueno que eres.<br><strong>Conserva la historia que estás construyendo.</strong></p><span>Sin seguidores, publicaciones ni mensajes privados.</span></section>
      <section class="home-faq" id="preguntas" aria-labelledby="home-faq-title"><div><span class="home-eyebrow">POR SI TE LO ESTABAS PREGUNTANDO</span><h2 id="home-faq-title">Antes de tu<br><span>primer movimiento.</span></h2><p>Lo esencial, sin letra pequeña en el tablero.</p></div><div class="home-faq-list">${questions.map(([question,answer])=>`<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</div></section>
      <section class="home-final"><img src="/favicon.svg" alt="" width="64" height="64"><span class="home-eyebrow">TU SIGUIENTE CAPÍTULO</span><h2>Tu historia ya ha empezado.<br><span>Dale un lugar.</span></h2><p>Entra con Lichess. Crea tu tarjeta. Sigue construyendo.</p><div>${cta(loggedIn?'Volver a mi Chedex':'Crear mi Chedex')}${demoEnabled?btn('Explorar demo local','demo','','home-secondary'):''}</div><small>Gratuito. Desde el navegador. Siempre a tu manera.</small></section>
    </main>
    <footer class="home-footer"><div class="home-footer-top"><div>${brand()}<p>Tu historia en el ajedrez,<br>siempre contigo.</p><span>Impulsado por <strong>TopChess</strong></span></div><div><strong>Descubre Chedex</strong><a href="/" data-action="home-scroll" data-target="como-funciona">Cómo funciona</a><a href="/" data-action="home-scroll" data-target="tu-privacidad">Tu privacidad</a><a href="/" data-action="home-scroll" data-target="preguntas">Preguntas frecuentes</a></div><div><strong>Tu historia</strong><a href="${destination}">${loggedIn?'Mi tarjeta':'Crear mi Chedex'}</a><button data-action="lookup">Consultar un perfil</button><a href="${destination}">${loggedIn?'Mi espacio':'Acceder con Lichess'}</a></div></div><div class="home-footer-bottom"><span>© 2026 Chedex · Un proyecto de TopChess.</span><span>El jugador es propietario y responsable de su historial.</span></div></footer>
  </div>`;
}
function activate(step){
  document.querySelectorAll('[data-home-view]').forEach(el=>el.hidden=Number(el.dataset.homeView)!==step);
  document.querySelectorAll('[data-home-step]').forEach(el=>el.classList.toggle('is-active',Number(el.dataset.homeStep)===step));
  document.querySelectorAll('[data-action="home-step"]').forEach(el=>{const selected=Number(el.dataset.step)===step;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});
}
function setupCardMotion(){
  const card=document.querySelector('#home-card-preview .chess-card');
  if(!card || typeof card.animate!=='function')return ()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
  let floating,tilt,frame=0,pointer,hovering=false,visible=true;
  const sync=()=>{
    floating?.cancel();floating=undefined;tilt?.cancel();tilt=undefined;cancelAnimationFrame(frame);frame=0;
    if(reduced.matches)return;
    floating=card.animate([
      {transform:'perspective(1100px) rotateX(3deg) rotateY(-5deg) translateY(0px)'},
      {transform:'perspective(1100px) rotateX(-2deg) rotateY(4deg) translateY(-8px)'},
      {transform:'perspective(1100px) rotateX(3deg) rotateY(-5deg) translateY(0px)'}
    ],{duration:7600,iterations:Infinity,easing:'ease-in-out'});
    if(!visible)floating.pause();
  };
  const move=event=>{
    if(reduced.matches||!fine.matches||event.pointerType==='touch')return;
    pointer={x:event.clientX,y:event.clientY};hovering=true;floating?.pause();
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;const rect=card.getBoundingClientRect();
      const x=Math.max(-1,Math.min(1,(pointer.x-rect.left)/rect.width*2-1));
      const y=Math.max(-1,Math.min(1,(pointer.y-rect.top)/rect.height*2-1));
      tilt?.cancel();
      tilt=card.animate([{transform:`perspective(1100px) rotateX(${-y*6}deg) rotateY(${x*8}deg) translateY(-4px)`}],{duration:240,fill:'forwards',easing:'ease-out'});
    });
  };
  const leave=()=>{hovering=false;cancelAnimationFrame(frame);frame=0;tilt?.cancel();if(visible&&!reduced.matches)floating?.play();};
  const visibility=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible&&!hovering&&!reduced.matches)floating?.play();else floating?.pause();
  });
  visibility?.observe(card);card.addEventListener('pointermove',move);card.addEventListener('pointerleave',leave);reduced.addEventListener('change',sync);sync();
  return ()=>{floating?.cancel();tilt?.cancel();cancelAnimationFrame(frame);visibility?.disconnect();card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',leave);reduced.removeEventListener('change',sync);};
}
export function mountLanding(){
  observer?.disconnect();
  destroyCardMotion();
  destroyCardMotion=setupCardMotion();
  if(location.hash){
    const target=document.getElementById(location.hash.slice(1));
    history.replaceState({},'',location.pathname+location.search);
    target?.scrollIntoView({block:'start',behavior:'instant'});
  }
  if(typeof IntersectionObserver==='undefined')return;
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)activate(Number(entry.target.dataset.homeStep));},{rootMargin:'-25% 0px -40% 0px',threshold:0});
  document.querySelectorAll('[data-home-step]').forEach(el=>observer.observe(el));
}
export function handleLandingAction(action,el){
  if(action==='home-scroll'){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(el.dataset.target)?.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
  }
  if(action==='home-turn'){
    const showing=el.getAttribute('aria-pressed')!=='true';el.setAttribute('aria-pressed',String(showing));el.lastChild.textContent=showing?'Ver la tarjeta':'Ver el QR';
    document.querySelector('#home-card-preview').hidden=showing;document.querySelector('#home-card-back').hidden=!showing;
  }
  if(action==='home-step'){
    const step=Number(el.dataset.step);activate(step);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector(`[data-home-step="${step}"]`)?.scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
  }
}
