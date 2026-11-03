import { api, reviewCards } from './workspace-ui.js';
const container = document.querySelector('#public-reviews');
api('/api/reviews').then(data=>{container.innerHTML=reviewCards(data.reviews);}).catch(()=>{container.textContent='No se han podido cargar las opiniones. Vuelve a intentarlo más tarde.';});
