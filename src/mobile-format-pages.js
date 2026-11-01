/** Mobile Format navigation is paged, not a stack of expanding accordions. */
export const FORMAT_PAGE_ORDER = ['Appearance', 'Text', 'Layout', 'Arrange', 'Actions'];

export function resolveFormatPage(pages, preferred = 'Appearance') {
  return pages.includes(preferred) ? preferred : pages[0] || '';
}

export function stepFormatPage(pages, selected, step) {
  const index = pages.indexOf(selected);
  if (index < 0) return pages[0] || '';
  return pages[Math.min(pages.length - 1, Math.max(0, index + step))];
}

export function showFormatPage(body, page) {
  const sections = [...body.querySelectorAll('[data-format-section]')];
  const names = sections.map((panel) => panel.dataset.formatSection);
  const current = resolveFormatPage(names, page);
  if (!current) return '';
  for (const panel of sections) panel.hidden = panel.dataset.formatSection !== current;
  for (const tab of body.querySelectorAll('[data-format-page]')) {
    const selected = tab.dataset.formatPage === current;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.classList.toggle('active', selected);
    if (selected) tab.scrollIntoView?.({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  }
  const index = names.indexOf(current);
  const counter = body.querySelector('[data-format-counter]');
  if (counter) counter.textContent = String(index + 1) + ' / ' + names.length;
  const back = body.querySelector('[data-format-step="-1"]');
  const forward = body.querySelector('[data-format-step="1"]');
  if (back) back.disabled = index <= 0;
  if (forward) forward.disabled = index === names.length - 1;
  body.dataset.activePage = current;
  return current;
}

export function stepVisibleFormatPage(body, direction) {
  const names = [...body.querySelectorAll('[data-format-section]')].map(
    (panel) => panel.dataset.formatSection,
  );
  return showFormatPage(body, stepFormatPage(names, body.dataset.activePage, direction));
}
