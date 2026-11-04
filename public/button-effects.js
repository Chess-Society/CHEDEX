const motionProperties = ['--button-pointer-x', '--button-pointer-y', '--button-tilt-x', '--button-tilt-y'];
const staticButton = ':disabled, [aria-disabled="true"], .is-pending, [href^="/auth/"]';

export function buttonMotion(clientX, clientY, bounds) {
  const normalize = (position, start, size) => Math.max(-1, Math.min(1, ((position - start) / Math.max(size, 1)) * 2 - 1));
  const x = normalize(clientX, bounds.left, bounds.width);
  const y = normalize(clientY, bounds.top, bounds.height);
  return {
    '--button-pointer-x': `${(x * 2).toFixed(2)}px`,
    '--button-pointer-y': `${(y * 1.5).toFixed(2)}px`,
    '--button-tilt-x': `${(-y * 4).toFixed(2)}deg`,
    '--button-tilt-y': `${(x * 4).toFixed(2)}deg`,
  };
}

export function initButtonEffects(root = document) {
  const view = root.defaultView;
  const motion = view.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let active, bounds, point, frame, pressed = false;

  const reset = () => {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
    if (active) {
      active.removeAttribute('data-pointer-hover');
      for (const property of motionProperties) active.style.removeProperty(property);
    }
    active = undefined;
    pressed = false;
  };

  const move = event => {
    if (pressed) return;
    if (!motion.matches || event.pointerType !== 'mouse' || event.buttons) return reset();
    const button = event.target.closest?.('.button, .header-contact');
    if (!button || button.matches(staticButton)) return reset();
    if (active !== button) {
      reset();
      active = button;
      // Keep the untransformed bounds stable while the pointer moves.
      bounds = button.getBoundingClientRect();
    }
    point = { x: event.clientX, y: event.clientY };
    if (frame !== undefined) return;
    frame = view.requestAnimationFrame(() => {
      frame = undefined;
      if (!active?.isConnected || active.matches(staticButton)) return reset();
      for (const [property, value] of Object.entries(buttonMotion(point.x, point.y, bounds))) active.style.setProperty(property, value);
      active.setAttribute('data-pointer-hover', '');
    });
  };

  root.addEventListener('pointerover', move, { passive: true });
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerout', event => {
    if (!pressed && active && !active.contains(event.relatedTarget)) reset();
  }, { passive: true });
  root.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || !active?.contains(event.target)) return reset();
    // Keep the target in place until its native click has been dispatched.
    pressed = true;
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
  }, { passive: true });
  root.addEventListener('pointerup', event => {
    pressed = false;
    if (active && !active.contains(event.target)) reset();
  }, { passive: true });
  root.addEventListener('click', reset, { passive: true });
  root.addEventListener('pointercancel', reset, { passive: true });
  root.addEventListener('keydown', reset);
  view.addEventListener('blur', reset);
  view.addEventListener('resize', reset);
  view.addEventListener('scroll', reset, { passive: true });
  motion.addEventListener('change', reset);
}

if (typeof document !== 'undefined') initButtonEffects();
