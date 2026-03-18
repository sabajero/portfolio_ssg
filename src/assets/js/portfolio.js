/**
 * portfolio.js — Three-pane portfolio view interactions
 *
 * Left panel items:
 *   .pv-project-item [data-slug]         → hover loads project into middle
 *   .pv-section-heading.pv-page-item     → hover loads CV/Diary/About into middle
 *   #pv-works-toggle                     → click collapses/expands project list
 *   #pv-name                             → hover shows default portrait in middle
 *
 * Middle panel:
 *   img hover → right panel zoom
 */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────
  const panelMiddle  = document.getElementById('pv-middle');
  const introBlock   = document.getElementById('pv-intro');
  const defaultView  = document.getElementById('pv-default');
  const projectView  = document.getElementById('pv-project-view');
  const zoomImage    = document.getElementById('pv-zoom-image');
  const zoomImg      = document.getElementById('pv-zoom-img');
  const rightDefault = document.getElementById('pv-right-default');
  const nameEl       = document.getElementById('pv-name');
  const worksToggle  = document.getElementById('pv-works-toggle');
  const worksList    = document.getElementById('pv-works-list');

  // ── Parse data ──────────────────────────────────────────
  const projectDataEl = document.getElementById('pv-project-data');
  const pageDataEl    = document.getElementById('pv-page-data');

  let projects = [];
  let pages    = {};

  try { projects = JSON.parse(projectDataEl.textContent); }
  catch (e) { console.error('[portfolio.js] Failed to parse project data:', e.message); }

  try { pages = JSON.parse(pageDataEl.textContent); }
  catch (e) { console.error('[portfolio.js] Failed to parse page data:', e.message); }

  // ── State ────────────────────────────────────────────────
  let activeSlug = null;
  let activePage = null;

  // ── Works dropdown toggle ────────────────────────────────
  if (worksToggle && worksList) {
    worksToggle.addEventListener('click', () => {
      const isOpen = worksToggle.classList.contains('is-open');
      if (isOpen) {
        worksToggle.classList.remove('is-open');
        worksToggle.setAttribute('aria-expanded', 'false');
        worksList.classList.add('is-collapsed');
      } else {
        worksToggle.classList.add('is-open');
        worksToggle.setAttribute('aria-expanded', 'true');
        worksList.classList.remove('is-collapsed');
      }
    });

    worksToggle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        worksToggle.click();
      }
    });
  }

  // ── Sticky offset ────────────────────────────────────────
  function computeStickyOffsets() {
    const introH = introBlock ? introBlock.getBoundingClientRect().height : 0;
    document.querySelectorAll('.pv-section-heading').forEach(h => {
      h.style.setProperty('--pv-sticky-top', introH + 'px');
    });
  }
  if (introBlock) {
    requestAnimationFrame(computeStickyOffsets);
    window.addEventListener('resize', computeStickyOffsets, { passive: true });
  }

  // ── Middle panel helpers ─────────────────────────────────
  function showMiddle({ yearType = '', title = '', description = '', content = '', images = [], url = '', isPage = false }) {
    document.getElementById('pv-proj-year-type').textContent  = yearType;
    document.getElementById('pv-proj-title').textContent      = title;
    document.getElementById('pv-proj-description').textContent = description;
    document.getElementById('pv-proj-body').innerHTML         = content;

    const gallery = document.getElementById('pv-proj-images');
    gallery.innerHTML = '';
    if (images && images.length) {
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src; img.alt = title; img.loading = 'lazy';
        gallery.appendChild(img);
      });
    }

    const link = document.getElementById('pv-proj-link');
    if (url && !isPage) { link.href = url; link.style.display = ''; }
    else { link.style.display = 'none'; }

    bindImageZoom(document.getElementById('pv-proj-body'));
    bindImageZoom(gallery);

    defaultView.style.display  = 'none';
    projectView.style.display  = 'block';
    projectView.classList.add('is-visible');

    // Force restart animation
    projectView.style.animation = 'none';
    projectView.offsetHeight; // reflow
    projectView.style.animation = '';

    panelMiddle.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showDefault() {
    projectView.classList.remove('is-visible');
    projectView.style.display = 'none';
    defaultView.style.display = 'flex';
    clearActive();
    clearZoom();
  }

  // ── Zoom helpers ─────────────────────────────────────────
  function showZoom(src, alt) {
    zoomImg.src = src; zoomImg.alt = alt || '';
    zoomImage.classList.add('is-visible');
    if (rightDefault) rightDefault.style.opacity = '0';
  }

  function clearZoom() {
    zoomImage.classList.remove('is-visible');
    if (rightDefault) rightDefault.style.opacity = '';
    // Reset zoom origin to center so the next image starts centered
    zoomImage.style.setProperty('--zoom-x', '50%');
    zoomImage.style.setProperty('--zoom-y', '50%');
    setTimeout(() => { if (!zoomImage.classList.contains('is-visible')) zoomImg.src = ''; }, 300);
  }

  function bindImageZoom(container) {
    if (!container) return;
    container.querySelectorAll('img').forEach(img => {
      img.addEventListener('mouseenter', () => showZoom(img.src, img.alt));
      
      // Calculate and apply mouse position as CSS variables
      img.addEventListener('mousemove', (e) => {
        const rect = img.getBoundingClientRect();
        
        // Calculate raw percentages based on cursor position inside the element
        let xPos = ((e.clientX - rect.left) / rect.width) * 100;
        let yPos = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Bound the percentages so panning doesn't jump off edges
        xPos = Math.max(0, Math.min(100, xPos));
        yPos = Math.max(0, Math.min(100, yPos));
        
        zoomImage.style.setProperty('--zoom-x', `${xPos}%`);
        zoomImage.style.setProperty('--zoom-y', `${yPos}%`);
      });

      img.addEventListener('mouseleave', clearZoom);
    });
  }

  // Bind zoom to the default portrait initially
  if (defaultView) {
    bindImageZoom(defaultView);
  }

  function clearActive() {
    document.querySelectorAll('.pv-project-item').forEach(el => el.classList.remove('is-active'));
    document.querySelectorAll('.pv-section-heading.pv-page-item').forEach(el => el.classList.remove('is-active'));
    activeSlug = null;
    activePage = null;
  }

  // ── Name hover → show default portrait ───────────────────
  if (nameEl) {
    nameEl.style.cursor = 'default';
    nameEl.addEventListener('mouseenter', () => {
      clearActive();
      showDefault();
    });
  }

  // ── Project item hovers ──────────────────────────────────
  document.querySelectorAll('.pv-project-item').forEach(item => {
    const slug = item.dataset.slug;

    item.addEventListener('mouseenter', () => {
      if (activeSlug === slug) return;
      clearActive();
      item.classList.add('is-active');
      activeSlug = slug;

      const proj = projects.find(p => p.slug === slug);
      if (!proj) return;

      showMiddle({
        yearType:    [proj.year, proj.type, proj.category].filter(Boolean).join(' · ').toUpperCase(),
        title:       proj.title,
        description: proj.description || '',
        content:     proj.content || '',
        images:      proj.images,
        url:         proj.url,
        isPage:      false
      });
    });

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
  });

  // ── Page item (CV / Diary / About) interactions ──────────
  document.querySelectorAll('.pv-section-heading.pv-page-item').forEach(item => {
    const pageKey = item.dataset.page;

    item.addEventListener('mouseenter', () => {
      if (activePage === pageKey) return;
      clearActive();
      item.classList.add('is-active');
      activePage = pageKey;

      const page = pages[pageKey];
      if (!page) return;

      showMiddle({
        yearType:    '',
        title:       page.title,
        description: '',
        content:     page.content || '',
        images:      [],
        url:         '',
        isPage:      true
      });
    });

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
  });

})();
