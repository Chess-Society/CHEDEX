import test from 'node:test';
import assert from 'node:assert/strict';
import { initSiteAnimations, mountSiteAnimations } from '../public/site-animations.js';

function element(attributes = {}) {
  const values = new Map(Object.entries(attributes));
  return {
    getAttribute: name => values.get(name) ?? null,
    setAttribute: (name, value) => values.set(name, value),
    removeAttribute: name => values.delete(name),
    contains: () => false,
    querySelectorAll: () => [],
  };
}

function fixture({ reduced = false, hero = false, failDraw = false } = {}) {
  const mediaListeners = new Map(), viewListeners = new Map();
  const media = { matches: reduced, addEventListener: (name, callback) => mediaListeners.set(name, callback), removeEventListener: name => mediaListeners.delete(name) };
  const observers = [], animations = [], timelines = [];
  const line = element({ 'stroke-dasharray': '5 7', style: 'stroke: orange;' });
  const card = element(); card.querySelectorAll = () => [line];
  const cards = [card], title = element({ style: 'color: orange;' }), description = element(), action = element();
  const heroElement = { querySelectorAll: selector => selector === 'h1' ? [title] : selector.includes('hero-positioning') ? [description] : [action] };
  const view = {
    location: { pathname: hero ? '/' : '/servicios' },
    matchMedia: () => media,
    addEventListener: (name, callback) => viewListeners.set(name, callback),
    removeEventListener: name => viewListeners.delete(name),
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; this.observed = new Set(); observers.push(this); }
      observe(node) { this.observed.add(node); }
      unobserve(node) { this.observed.delete(node); }
      disconnect() { this.disconnected = true; this.observed.clear(); }
    },
  };
  const root = { defaultView: view, activeElement: null, querySelectorAll: () => cards, querySelector: () => hero ? heroElement : null };
  const anime = {
    stagger: spacing => spacing,
    animate(targets, parameters) {
      for (const node of targets) node.setAttribute('style', 'opacity: .55;');
      if (failDraw && parameters.draw) throw new Error('Animation unavailable');
      const animation = { targets, parameters, revert() { this.reverted = true; } };
      animations.push(animation); return animation;
    },
    createTimeline(parameters) {
      const timeline = { parameters, entries: [], add(targets, options, position) { for (const node of targets) node.setAttribute('style', 'opacity: .6;'); this.entries.push({ targets, options, position }); return this; }, revert() { this.reverted = true; } };
      timelines.push(timeline); return timeline;
    },
    svg: { createDrawable(paths) { for (const node of paths) { node.setAttribute('pathLength', '100'); node.setAttribute('draw', '0 0'); node.setAttribute('stroke-dasharray', '0 100'); } return paths; } },
  };
  return { root, anime, cards, card, line, observers, animations, timelines, media, mediaListeners, title, description, action };
}

test('movimiento reducido evita cargar la biblioteca y no altera el contenido', async () => {
  const f = fixture({ reduced: true });
  assert.equal(await initSiteAnimations(f.root), undefined);
  mountSiteAnimations(f.root, f.anime);
  assert.equal(f.observers.length, 0);
  assert.equal(f.animations.length, 0);
  assert.equal(f.card.getAttribute('style'), null);
});

test('las tarjetas se animan una vez, admiten el catálogo tardío y recuperan los trazos originales', () => {
  const f = fixture();
  const controller = mountSiteAnimations(f.root, f.anime), observer = f.observers[0];
  observer.callback([{ target: f.card, isIntersecting: true }]);
  assert.equal(f.animations.length, 2);
  assert.equal(f.animations[0].parameters.delay, 85);
  for (const animation of f.animations) animation.parameters.onComplete(animation);
  assert.equal(f.card.getAttribute('style'), null);
  assert.equal(f.line.getAttribute('stroke-dasharray'), '5 7');
  assert.equal(f.line.getAttribute('style'), 'stroke: orange;');
  assert.equal(f.line.getAttribute('pathLength'), null);
  observer.callback([{ target: f.card, isIntersecting: true }]);
  assert.equal(f.animations.length, 2);
  const lateCard = element(); f.cards.push(lateCard); controller.refresh();
  assert.ok(observer.observed.has(lateCard));
});

test('activar movimiento reducido durante la reproducción restaura tarjetas y SVG', () => {
  const f = fixture(); mountSiteAnimations(f.root, f.anime);
  f.observers[0].callback([{ target: f.card, isIntersecting: true }]);
  f.media.matches = true; f.mediaListeners.get('change')();
  assert.equal(f.card.getAttribute('style'), null);
  assert.equal(f.line.getAttribute('stroke-dasharray'), '5 7');
  assert.equal(f.line.getAttribute('draw'), null);
  assert.ok(f.animations.every(animation => animation.reverted));
  assert.ok(f.observers[0].disconnected);
});

test('la secuencia de portada no anima las transformaciones de los botones', () => {
  const f = fixture({ hero: true }); mountSiteAnimations(f.root, f.anime);
  const timeline = f.timelines[0];
  assert.equal(timeline.entries.length, 3);
  assert.equal(timeline.entries[2].targets[0], f.action);
  assert.equal(timeline.entries[2].options.y, undefined);
  assert.equal(timeline.entries[2].options.transform, undefined);
  timeline.parameters.onComplete(timeline);
  assert.equal(f.title.getAttribute('style'), 'color: orange;');
  assert.equal(f.action.getAttribute('style'), null);
});

test('un fallo al dibujar no deja ocultos los trazos ni las tarjetas', () => {
  const f = fixture({ failDraw: true }); mountSiteAnimations(f.root, f.anime);
  f.observers[0].callback([{ target: f.card, isIntersecting: true }]);
  assert.equal(f.card.getAttribute('style'), null);
  assert.equal(f.line.getAttribute('stroke-dasharray'), '5 7');
  assert.equal(f.line.getAttribute('style'), 'stroke: orange;');
  assert.ok(f.observers[0].disconnected);
});
