const cardSelector = '.bundle-card, .service-detail, .service-project';
const lineSelector = '.bundle-visual svg path[stroke], .service-art svg path[stroke], .service-project-art svg path[stroke]';

function preserveAttributes(elements, attributes) {
  const originals = elements.map(element => [element, attributes.map(name => [name, element.getAttribute(name)])]);
  return () => {
    for (const [element, values] of originals) {
      for (const [name, value] of values) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }
  };
}

export function mountSiteAnimations(root, { animate, createTimeline, stagger, svg }) {
  const view = root.defaultView;
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map(), seen = new WeakSet();
  let observer, stopped = preference.matches;
  const finish = animation => {
    animation.revert();
    active.get(animation)?.();
    active.delete(animation);
  };
  const stop = () => {
    stopped = true;
    observer?.disconnect();
    for (const animation of [...active.keys()]) finish(animation);
    preference.removeEventListener('change', onPreference);
    view.removeEventListener('pagehide', stop);
  };
  const onPreference = () => { if (preference.matches) stop(); };
  const play = (targets, parameters, restore) => {
    try {
      const animation = animate(targets, { ...parameters, onComplete: finish });
      active.set(animation, restore);
    } catch {
      restore();
      stop();
    }
  };
  const drawLines = card => {
    if (stopped) return;
    const paths = [...card.querySelectorAll(lineSelector)];
    if (!paths.length) return;
    const restore = preserveAttributes(paths, ['style', 'pathLength', 'draw', 'stroke-dasharray', 'stroke-dashoffset']);
    try {
      play(svg.createDrawable(paths), { draw: ['0 0', '0 1'], duration: 850, delay: stagger(65), ease: 'outCubic' }, restore);
    } catch {
      restore();
      stop();
    }
  };
  const refresh = () => {
    if (stopped || !observer) return;
    for (const card of root.querySelectorAll(cardSelector)) if (!seen.has(card)) observer.observe(card);
  };

  if (stopped) return { refresh, stop };
  preference.addEventListener('change', onPreference);
  view.addEventListener('pagehide', stop);
  if (view.IntersectionObserver) {
    observer = new view.IntersectionObserver(entries => {
      if (stopped) return;
      const cards = entries.filter(entry => entry.isIntersecting && !seen.has(entry.target)).map(entry => entry.target);
      for (const card of cards) { seen.add(card); observer.unobserve(card); }
      const unfocused = cards.filter(card => !card.contains(root.activeElement));
      if (unfocused.length) play(unfocused, { opacity: [0.55, 1], y: [14, 0], duration: 520, delay: stagger(85), ease: 'outCubic' }, preserveAttributes(unfocused, ['style']));
      for (const card of cards) drawLines(card);
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    refresh();
  }

  const hero = view.location.pathname === '/' ? root.querySelector('.hero-copy') : null;
  if (hero) {
    const title = [...hero.querySelectorAll('h1')];
    const description = [...hero.querySelectorAll('.hero-positioning, .hero-description')];
    const actions = [...hero.querySelectorAll('.button, .quiet-link')];
    const restore = preserveAttributes([...title, ...description, ...actions], ['style']);
    try {
      const timeline = createTimeline({ defaults: { ease: 'outCubic' }, onComplete: finish });
      active.set(timeline, restore);
      if (title.length) timeline.add(title, { opacity: [0.65, 1], y: [16, 0], duration: 500 }, 0);
      if (description.length) timeline.add(description, { opacity: [0.6, 1], y: [10, 0], duration: 460, delay: stagger(70) }, 100);
      // Animate opacity only: button hover and native clicks keep their own transforms.
      if (actions.length) timeline.add(actions, { opacity: [0.6, 1], duration: 350, delay: stagger(70) }, 250);
    } catch {
      restore();
      stop();
    }
  }
  return { refresh, stop };
}

export async function initSiteAnimations(root = document, servicesReady = Promise.resolve()) {
  if (root.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!root.querySelector(`${cardSelector}, .hero-copy, #services-catalog`)) return;
  try {
    const anime = await import('./vendor/animejs.js');
    const controller = mountSiteAnimations(root, anime);
    servicesReady.then(controller.refresh, controller.stop);
    return controller;
  } catch {
    // Decoration is optional; content and navigation never depend on this bundle.
  }
}
