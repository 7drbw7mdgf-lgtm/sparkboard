// Lightweight, local-only landing-page interactions. No saved board or account state is touched.
const tour = document.getElementById('start-features');
if (tour) {
  const rail = tour.querySelector('.tour-track');
  const slides = [...tour.querySelectorAll('.tour-slide')];
  const tabs = [...tour.querySelectorAll('.tour-tabs button')];
  const dots = [...tour.querySelectorAll('.tour-dots button')];
  const previous = tour.querySelector('[data-tour-prev]');
  const next = tour.querySelector('[data-tour-next]');
  const counter = tour.querySelector('[data-tour-counter]');
  let active = 0;
  let frame = 0;

  function setActive(index, scroll = true) {
    active = Math.max(0, Math.min(slides.length - 1, index));
    tabs.forEach((tab, i) => tab.setAttribute('aria-current', String(i === active)));
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
    counter.textContent = (active + 1) + ' / ' + slides.length;
    if (scroll) rail.scrollTo({
      left: slides[active].offsetLeft - slides[0].offsetLeft,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }

  [...tabs, ...dots].forEach((button) => button.addEventListener('click', () => {
    setActive(Number(button.dataset.slide));
  }));
  previous.addEventListener('click', () => setActive(active - 1));
  next.addEventListener('click', () => setActive(active + 1));
  rail.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      let closest = 0;
      let distance = Infinity;
      slides.forEach((slide, i) => {
        const d = Math.abs(slide.offsetLeft - slides[0].offsetLeft - rail.scrollLeft);
        if (d < distance) { distance = d; closest = i; }
      });
      if (closest !== active) setActive(closest, false);
    });
  }, { passive: true });
  rail.addEventListener('keydown', (event) => {
    if (event.target !== rail) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); setActive(active + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(active - 1); }
  });
  setActive(0, false);

  // Drag sample sticky by pointer; coordinate calculation stays local to the preview.
  const sticky = tour.querySelector('[data-demo-sticky]');
  const board = tour.querySelector('[data-demo-board]');
  const stickyReset = tour.querySelector('[data-demo-sticky-reset]');
  const stickyInitial = { left: 20, top: 33 };
  let stickyDrag = null;
  function placeSticky(left, top) {
    sticky.style.left = left + '%';
    sticky.style.top = top + '%';
  }
  sticky.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const rect = board.getBoundingClientRect();
    stickyDrag = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      left: sticky.offsetLeft, top: sticky.offsetTop, width: rect.width, height: rect.height };
    sticky.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  sticky.addEventListener('pointermove', (event) => {
    if (!stickyDrag || stickyDrag.id !== event.pointerId) return;
    const maxX = Math.max(0, board.clientWidth - sticky.offsetWidth);
    const maxY = Math.max(0, board.clientHeight - sticky.offsetHeight);
    const x = Math.max(0, Math.min(maxX, stickyDrag.left + event.clientX - stickyDrag.startX));
    const y = Math.max(0, Math.min(maxY, stickyDrag.top + event.clientY - stickyDrag.startY));
    placeSticky(100 * x / Math.max(1, board.clientWidth), 100 * y / Math.max(1, board.clientHeight));
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    sticky.addEventListener(name, () => { stickyDrag = null; });
  }
  stickyReset.addEventListener('click', () => placeSticky(stickyInitial.left, stickyInitial.top));

  const branchList = tour.querySelector('[data-demo-branches]');
  const addBranch = tour.querySelector('[data-demo-branch-add]');
  const resetBranches = tour.querySelector('[data-demo-branch-reset]');
  function resetTree() {
    branchList.replaceChildren();
    ['Research', 'Ideas'].forEach((name) => {
      const branch = document.createElement('div');
      branch.className = 'tour-tree-node';
      branch.textContent = name;
      branchList.append(branch);
    });
  }
  addBranch.addEventListener('click', () => {
    if (branchList.children.length >= 7) return;
    const branch = document.createElement('div');
    branch.className = 'tour-tree-node is-new';
    branch.textContent = 'New branch ' + (branchList.children.length - 1);
    branchList.append(branch);
    branch.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  resetBranches.addEventListener('click', resetTree);
  resetTree();

  const routeButton = tour.querySelector('[data-demo-route]');
  const links = [...tour.querySelectorAll('.tour-flow-link')];
  let elbow = false;
  routeButton.addEventListener('click', () => {
    elbow = !elbow;
    links.forEach((link) => link.classList.toggle('is-elbow', elbow));
    routeButton.textContent = elbow ? 'Use straight connectors' : 'Try elbow connectors';
    routeButton.setAttribute('aria-pressed', String(elbow));
  });

  // Miniature timeline drag changes presentation only, not Benchline project data.
  const bars = [...tour.querySelectorAll('.tour-plan-bar')];
  for (const bar of bars) {
    let drag = null;
    bar.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const track = bar.parentElement;
      drag = { id: event.pointerId, x: event.clientX, start: bar.offsetLeft };
      bar.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    bar.addEventListener('pointermove', (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const track = bar.parentElement;
      const max = Math.max(0, track.clientWidth - bar.offsetWidth);
      const left = Math.max(0, Math.min(max, drag.start + event.clientX - drag.x));
      bar.style.left = (left / Math.max(1, track.clientWidth) * 100) + '%';
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      bar.addEventListener(name, () => { drag = null; });
    }
  }
  tour.querySelector('[data-demo-plan-reset]').addEventListener('click', () => {
    bars.forEach((bar, i) => { bar.style.left = [12, 34, 18][i] + '%'; });
  });
}
