const controls = document.querySelector<HTMLElement>('[data-solution-filters]');
const results = document.querySelector<HTMLElement>('#solution-results');
const status = controls?.querySelector<HTMLElement>('[data-filter-status]');

if (controls && results && status) {
  const buttons = Array.from(controls.querySelectorAll<HTMLButtonElement>('[data-sector-filter]'));
  const sectors = Array.from(results.querySelectorAll<HTMLElement>('[data-sector]'));
  const allCards = results.querySelectorAll('.solution-card').length;
  const fromHash = () => {
    const id = window.location.hash.slice(1);
    return sectors.some(sector => sector.dataset.sector === id) ? id : 'all';
  };
  const show = (selected: string) => {
    for (const sector of sectors) sector.hidden = selected !== 'all' && sector.dataset.sector !== selected;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.sectorFilter === selected));
    if (selected === 'all') {
      status.textContent = `Showing all ${allCards} solutions across ${sectors.length} industries.`;
    } else {
      const sector = sectors.find(item => item.dataset.sector === selected)!;
      const count = sector.querySelectorAll('.solution-card').length;
      status.textContent = `Showing ${count} ${count === 1 ? 'solution' : 'solutions'} for ${sector.dataset.sectorName}.`;
    }
  };
  for (const button of buttons) button.addEventListener('click', () => {
    const selected = button.dataset.sectorFilter!;
    show(selected);
    const hash = selected === 'all' ? '#all-industries' : `#${selected}`;
    if (window.location.hash !== hash) {
      // Keep the filter in view and preserve campaign query parameters.
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    }
  });
  window.addEventListener('popstate', () => show(fromHash()));
  window.addEventListener('hashchange', () => show(fromHash()));
  show(fromHash());
  controls.hidden = false;
}
