import { icon } from './icons.js';
const shapes = {
  pawn: '<circle cx="32" cy="17" r="9"/><path d="M26 26h12l-2 7 8 21H20l8-21ZM18 54h28v7H18Z"/>',
  rook: '<path d="M17 10h7v8h5v-8h6v8h5v-8h7v18l-8 5 3 20H22l3-20-8-5ZM19 53h26l4 8H15Z"/><path d="M24 26h16M27 36h10" fill="none"/>',
  bishop: '<path d="M32 7c-4 7-14 12-14 22 0 7 6 11 14 11s14-4 14-11C46 19 36 14 32 7ZM27 40h10l5 13H22ZM19 53h26l4 8H15Z"/><path d="m35 18-9 13" fill="none"/>',
  queen: '<path d="m15 20 9 7 8-11 8 11 9-7-7 22H22ZM25 42h14l3 11H22ZM19 53h26l4 8H15Z"/><circle cx="13" cy="17" r="3"/><circle cx="24" cy="13" r="3"/><circle cx="32" cy="9" r="3"/><circle cx="40" cy="13" r="3"/><circle cx="51" cy="17" r="3"/><path d="M23 35h18" fill="none"/>',
  king: '<path d="M28 5h8v7h7v7h-7v8h-8v-8h-7v-7h7ZM18 28c0-6 9-9 14-3 5-6 14-3 14 3l-6 14H24ZM25 42h14l3 11H22ZM19 53h26l4 8H15Z"/><path d="M24 35h16" fill="none"/>',
  knight: '<path d="m20 52 8-17-12 5-5-8 14-19 5-7 3 9 10-3-2 10c16 9 14 21 3 30ZM18 53h29l3 8H14Z"/><path d="m39 23 6 9M25 27h3" fill="none"/>',
};
const pieces = [
  ['rook',0,0,'dark'], ['queen',3,0,'dark'], ['king',5,0,'dark'],
  ['pawn',1,2,'dark'], ['bishop',4,2,'dark'], ['knight',7,2,'dark'],
  ['knight',2,4,'light'], ['pawn',5,4,'light'], ['queen',7,5,'light'],
  ['pawn',0,6,'light'], ['king',4,6,'light'], ['rook',6,7,'light'],
];

export function initChessScene(container) {
  if (!container) return;
  const cells = Array.from({ length: 64 }, (_, index) => `<span class="chess-square ${((index % 8) + Math.floor(index / 8)) % 2 ? 'dark' : 'light'}"></span>`).join('');
  const figures = pieces.map(([kind, file, rank, tone], index) => `<div class="chess-position" style="--file:${file};--rank:${rank};--delay:${-index * .73}s"><span class="chess-piece-shadow"></span><span class="chess-billboard"><span class="chess-piece-float"><svg class="chess-piece ${tone}" viewBox="0 0 64 70" aria-hidden="true">${shapes[kind]}</svg></span></span></div>`).join('');
  container.innerHTML = `<div class="chess-stage" role="img" aria-label="Tablero de ajedrez en perspectiva 3D, con casillas en gris y antracita y piezas delineadas en naranja."><div class="chess-orbit"><div class="chess-plane"><div class="chess-slab"></div><div class="chess-grid">${cells}</div><div class="chess-coordinates" aria-hidden="true">${'abcdefgh'.split('').map(letter => `<span>${letter}</span>`).join('')}</div>${figures}</div></div></div><button class="chess-motion-toggle" type="button" aria-pressed="false">Pausar movimiento <span aria-hidden="true">${icon('pause')}</span></button>`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const stage = container.querySelector('.chess-stage');
  const toggle = container.querySelector('.chess-motion-toggle');
  let paused = reduce.matches, frame = null;
  function resetTilt() { container.style.setProperty('--pointer-x', '0deg'); container.style.setProperty('--pointer-y', '0deg'); }
  function sync() {
    container.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.firstChild.textContent = paused ? 'Activar movimiento ' : 'Pausar movimiento ';
    toggle.lastElementChild.innerHTML = icon(paused ? 'play' : 'pause');
    if (paused) resetTilt();
  }
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  reduce.addEventListener('change', () => { paused = reduce.matches; sync(); });
  stage.addEventListener('pointermove', event => {
    if (paused || !finePointer.matches) return;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (paused) { frame = null; return; }
      const bounds = stage.getBoundingClientRect();
      container.style.setProperty('--pointer-x', `${((event.clientY - bounds.top) / bounds.height - .5) * -6}deg`);
      container.style.setProperty('--pointer-y', `${((event.clientX - bounds.left) / bounds.width - .5) * 8}deg`);
      frame = null;
    });
  });
  stage.addEventListener('pointerleave', () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; resetTilt(); });
  sync();
}
