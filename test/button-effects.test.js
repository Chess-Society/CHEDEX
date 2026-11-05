import test from 'node:test';
import assert from 'node:assert/strict';
import { buttonMotion, initButtonEffects } from '../public/button-effects.js';

function fixture({ auth = false } = {}) {
  const events = new Map(), windowEvents = new Map(), frames = new Map(), properties = new Map();
  let nextFrame = 0, reads = 0, disabled = false;
  const media = { matches: true, addEventListener: (_, callback) => { media.change = callback; } };
  const button = {
    isConnected: true,
    style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
    closest: () => button,
    matches: selector => disabled || (auth && selector.includes('[href^="/auth/"]')),
    contains: target => target === button,
    getBoundingClientRect: () => { reads++; return { left: 10, top: 20, width: 100, height: 50 }; },
    setAttribute: () => { button.hover = true; },
    removeAttribute: () => { button.hover = false; },
  };
  const view = {
    matchMedia: () => media,
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (name, callback) => windowEvents.set(name, callback),
  };
  initButtonEffects({ defaultView: view, addEventListener: (name, callback) => events.set(name, callback) });
  return {
    button, properties, media, events, windowEvents,
    get reads() { return reads; },
    disable() { disabled = true; },
    dispatch(name, extra = {}) { events.get(name)({ target: button, pointerType: 'mouse', buttons: 0, clientX: 60, clientY: 45, ...extra }); },
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
  };
}

test('el movimiento cambia de dirección y permanece limitado a los bordes del botón', () => {
  const bounds = { left: 10, top: 20, width: 100, height: 50 };
  assert.equal(buttonMotion(10, 20, bounds)['--button-tilt-y'], '-4.00deg');
  assert.equal(buttonMotion(110, 70, bounds)['--button-tilt-y'], '4.00deg');
  assert.equal(buttonMotion(60, 45, bounds)['--button-pointer-x'], '0.00px');
  assert.equal(buttonMotion(1000, -1000, bounds)['--button-pointer-x'], '2.00px');
  assert.equal(buttonMotion(1000, -1000, bounds)['--button-tilt-x'], '4.00deg');
});

test('los movimientos se agrupan y el botón permanece estable hasta su clic nativo', () => {
  const f = fixture();
  f.dispatch('pointerover', { clientX: 10 });
  f.dispatch('pointermove', { clientX: 110 });
  f.flush();
  assert.equal(f.reads, 1);
  assert.equal(f.properties.get('--button-tilt-y'), '4.00deg');
  assert.equal(f.button.hover, true);
  f.dispatch('pointerout', { relatedTarget: f.button });
  assert.equal(f.button.hover, true);
  f.dispatch('pointerdown');
  f.dispatch('pointermove', { clientX: 10, buttons: 1 });
  f.flush();
  assert.equal(f.properties.get('--button-tilt-y'), '4.00deg');
  assert.equal(f.button.hover, true);
  f.dispatch('pointerout', { relatedTarget: null });
  assert.equal(f.button.hover, true);
  f.dispatch('pointerup');
  f.dispatch('click');
  assert.equal(f.properties.size, 0);
  assert.equal(f.button.hover, false);
  f.dispatch('pointermove');
  f.dispatch('pointerout', { relatedTarget: null });
  f.flush();
  assert.equal(f.button.hover, false);
});

test('táctil, movimiento reducido y botones deshabilitados mantienen el botón estable', () => {
  const f = fixture();
  f.dispatch('pointermove', { pointerType: 'touch' });
  f.flush();
  assert.equal(f.button.hover, undefined);
  f.dispatch('pointermove'); f.flush();
  f.media.matches = false; f.media.change();
  assert.equal(f.button.hover, false);
  f.dispatch('pointermove'); f.flush();
  assert.equal(f.properties.size, 0);
  f.media.matches = true; f.disable();
  f.dispatch('pointermove'); f.flush();
  assert.equal(f.properties.size, 0);
});

test('el enlace de autenticación conserva su posición y su navegación nativa', () => {
  const f = fixture({ auth: true });
  f.dispatch('pointerover');
  f.dispatch('pointermove');
  f.flush();
  assert.equal(f.properties.size, 0);
  assert.equal(f.button.hover, undefined);
  const click = { target: f.button, preventDefault() { assert.fail('No se debe interceptar el enlace.'); } };
  f.events.get('click')(click);
  assert.equal(f.properties.size, 0);
});
