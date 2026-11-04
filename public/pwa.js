const standalone = matchMedia('(display-mode: standalone)');
const installed = () => standalone.matches || navigator.standalone === true;
let installPrompt = null, busy = false;
const buttons = [];

function refresh() { buttons.forEach(button => { button.hidden = installed(); }); }
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; refresh();
});
window.addEventListener('appinstalled', () => { installPrompt = null; buttons.forEach(button => { button.hidden = true; }); });
standalone.addEventListener('change', refresh);

const dialog = document.createElement('dialog');
dialog.className = 'pwa-install-dialog';
dialog.setAttribute('aria-labelledby', 'pwa-install-title');
dialog.innerHTML = `<p class="eyebrow">Chedex en tu ordenador</p><h2 id="pwa-install-title">Tu espacio, a un clic.</h2><p>Instala Chedex para abrirlo desde el escritorio o el menú de aplicaciones, en su propia ventana.</p><p>En Chrome o Edge, abre el menú del navegador y busca la opción de instalar esta página como aplicación. En Safari para Mac, usa Archivo → Añadir al Dock.</p><p class="pwa-install-note">Necesitas Internet para entrar y consultar tus proyectos. Tus datos privados no se guardan para usarlos sin conexión.</p><button type="button" class="button" data-close-install>Entendido</button>`;
document.body.append(dialog);
dialog.querySelector('[data-close-install]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

for (const footer of document.querySelectorAll('.legal-links')) {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = 'Instalar Chedex';
  button.addEventListener('click', async () => {
    if (busy) return;
    if (!installPrompt) { dialog.showModal(); return; }
    busy = true; button.disabled = true;
    const prompt = installPrompt; installPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { dialog.showModal(); }
    finally { busy = false; button.disabled = false; }
  });
  footer.append(button); buttons.push(button);
}
refresh();

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .catch(() => { /* The website and browser-managed installation remain usable. */ });
}
