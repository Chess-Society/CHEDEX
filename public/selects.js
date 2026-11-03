// Select-only comboboxes keep the native fields as the source of form values.
const controls = new WeakMap();
let active = null, sequence = 0;

function close() {
  if (!active) return;
  active.list.hidden = true;
  active.button.setAttribute('aria-expanded', 'false');
  active.button.removeAttribute('aria-activedescendant');
  active.wrapper.classList.remove('is-open');
  active = null;
}

export function syncSelects(root = document) {
  root.querySelectorAll('select').forEach(select => controls.get(select)?.sync());
}

export function enhanceSelects(root = document) {
  root.querySelectorAll('select').forEach(select => {
    if (controls.has(select)) return;
    const label = select.closest('label');
    if (!label) return;
    const id = `chedex-select-${++sequence}`;
    const caption = document.createElement('span');
    caption.id = `${id}-label`;
    caption.textContent = [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()).filter(Boolean).join(' ');
    [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
    label.prepend(caption);
    const wrapper = document.createElement('div'); wrapper.className = 'styled-select';
    select.before(wrapper); wrapper.append(select);
    select.classList.add('native-select'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'select-trigger';
    button.setAttribute('role', 'combobox'); button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-labelledby', caption.id);
    button.setAttribute('aria-required', String(select.required));
    button.setAttribute('aria-controls', `${id}-options`);
    const value = document.createElement('span'); button.append(value);
    const chevron = document.createElement('span'); chevron.className = 'select-chevron'; chevron.setAttribute('aria-hidden', 'true'); button.append(chevron);
    const list = document.createElement('ul');
    list.className = 'select-options'; list.id = `${id}-options`; list.hidden = true;
    list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', caption.id);
    wrapper.append(button, list);
    caption.addEventListener('click', event => { event.preventDefault(); button.focus(); });
    let index = select.selectedIndex, prefix = '', typedAt = 0;
    const items = [...select.options].map((option, position) => {
      const item = document.createElement('li'); item.id = `${id}-${position}`;
      item.setAttribute('role', 'option'); item.textContent = option.textContent; item.dataset.index = String(position);
      if (option.disabled) item.setAttribute('aria-disabled', 'true');
      list.append(item); return item;
    });
    const control = { wrapper, button, list, sync: () => {
      value.textContent = select.selectedOptions[0]?.textContent || 'Elige una opción';
      button.disabled = select.disabled;
      items.forEach((item, position) => item.setAttribute('aria-selected', String(position === select.selectedIndex)));
    } };
    controls.set(select, control);
    function highlight(position) {
      index = Math.max(0, Math.min(items.length - 1, position));
      items.forEach((item, i) => item.classList.toggle('is-active', i === index));
      button.setAttribute('aria-activedescendant', items[index].id);
      items[index].scrollIntoView({ block: 'nearest' });
    }
    function open(position = select.selectedIndex) {
      close(); active = control;
      const bounds = wrapper.getBoundingClientRect();
      const boundary = wrapper.closest('dialog')?.getBoundingClientRect() || { top: 0, bottom: innerHeight };
      wrapper.classList.toggle('opens-up', boundary.bottom - bounds.bottom < 215 && bounds.top - boundary.top > boundary.bottom - bounds.bottom);
      list.hidden = false; wrapper.classList.add('is-open'); button.setAttribute('aria-expanded', 'true');
      highlight(Math.max(0, position));
    }
    function choose(position) {
      if (select.options[position].disabled) return;
      select.selectedIndex = position; control.sync(); close(); button.focus({ preventScroll: true });
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    button.addEventListener('click', event => { event.preventDefault(); active === control ? close() : open(); });
    list.addEventListener('pointerdown', event => event.preventDefault());
    list.addEventListener('click', event => {
      const item = event.target.closest('[role="option"]');
      if (item) { event.preventDefault(); choose(Number(item.dataset.index)); }
    });
    button.addEventListener('keydown', event => {
      const opened = active === control;
      if (event.key === 'Escape' && opened) { event.preventDefault(); event.stopPropagation(); close(); }
      else if (event.key === 'Tab' && opened) choose(index);
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1);
        if (!opened) open(event.key === 'Home' || event.key === 'End' ? next : select.selectedIndex);
        else highlight(next);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); opened ? choose(index) : open();
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (Date.now() - typedAt > 700) prefix = '';
        typedAt = Date.now(); prefix += event.key.toLocaleLowerCase('es');
        const match = [...select.options].findIndex(option => !option.disabled && option.textContent.toLocaleLowerCase('es').startsWith(prefix));
        if (match >= 0) { event.preventDefault(); opened ? highlight(match) : choose(match); }
      }
    });
    select.addEventListener('change', control.sync);
    select.addEventListener('invalid', event => { event.preventDefault(); button.focus(); });
    control.sync();
  });
}

document.addEventListener('pointerdown', event => { if (active && !active.wrapper.contains(event.target)) close(); });
document.addEventListener('focusin', event => { if (active && !active.wrapper.contains(event.target)) close(); });
document.addEventListener('close', close, true);
document.addEventListener('cancel', event => { if (active) { event.preventDefault(); close(); } }, true);
