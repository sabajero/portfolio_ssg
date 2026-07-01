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
  const panelMiddle = document.getElementById('pv-middle');
  const introBlock = document.getElementById('pv-intro');
  const defaultView = document.getElementById('pv-default');
  const projectView = document.getElementById('pv-project-view');
  const zoomImage = document.getElementById('pv-zoom-image');
  const zoomImg = document.getElementById('pv-zoom-img');
  const rightDefault = document.getElementById('pv-right-default');
  const nameEl = document.getElementById('pv-name');
  const worksToggle = document.getElementById('pv-works-toggle');
  const worksList = document.getElementById('pv-works-list');

  // Full Screen Gallery Overlay Refs
  const overlay = document.getElementById('pv-gallery-overlay');
  const overlayImg = document.getElementById('pv-gallery-overlay-img');
  const overlayClose = document.getElementById('pv-gallery-overlay-close');
  const overlayPrev = document.getElementById('pv-gallery-overlay-prev');
  const overlayNext = document.getElementById('pv-gallery-overlay-next');

  document.addEventListener('DOMContentLoaded', () => {
    const galleryDataEl = document.getElementById('pv-gallery-data');
    window.pvGalleryImages = galleryDataEl ? galleryDataEl.innerHTML.split('|pv|').map(s => s.trim()).filter(Boolean) : [];
  });

  // ── Parse data ──────────────────────────────────────────
  const projectDataEl = document.getElementById('pv-project-data');
  const pageDataEl = document.getElementById('pv-page-data');

  let projects = [];
  let pages = {};

  try { 
    projects = JSON.parse(projectDataEl.textContent); 
    
    // Pre-extract all images gracefully upon initialization
    projects.forEach(p => {
      let imgs = [];
      if (p.images && p.images.length > 0) {
        imgs = [...p.images];
      }
      if (p.content) {
         const htmlRegex = /<img[^>]+src=["']([^"']+)["']/gi;
         let htmlMatch;
         while ((htmlMatch = htmlRegex.exec(p.content)) !== null) {
            let url = htmlMatch[1];
            if (url && !url.includes('soundcloud')) imgs.push(url.trim());
         }
      }
      p.extractedImages = [...new Set(imgs)];
    });
  }
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
  function showMiddle({ categoriesHtml = '', title = '', description = '', content = '', images = [], url = '', isPage = false }) {
    const catContainer = document.getElementById('pv-proj-categories');
    if (catContainer) {
      catContainer.innerHTML = categoriesHtml;
      catContainer.style.display = categoriesHtml ? '' : 'none';
    }

    const titleEl = document.getElementById('pv-proj-title');
    if (title) {
      titleEl.textContent = title;
      titleEl.style.display = '';
    } else {
      titleEl.textContent = '';
      titleEl.style.display = 'none';
    }

    const descEl = document.getElementById('pv-proj-description');
    if (descEl) {
      if (description) {
        // Convert [Text](url) into clickable Hyperlinks securely
        const safeDesc = description
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            let href = url.trim();
            // Prefix https:// if it is a standard domain without a protocol
            if (!href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
              href = 'https://' + href;
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--pv-accent); text-decoration: underline;">${text}</a>`;
          });
        descEl.innerHTML = safeDesc;
        descEl.style.display = '';
      } else {
        descEl.innerHTML = '';
        descEl.style.display = 'none';
      }
    }
    document.getElementById('pv-proj-body').innerHTML = content;

    const gallery = document.getElementById('pv-proj-images');
    gallery.innerHTML = '';
    if (images && images.length) {
      images.forEach(src => {
        const img = document.createElement('img');
        img.src = src; img.alt = title; img.loading = 'lazy';
        gallery.appendChild(img);
      });
    }

    // Link has been removed per user request, so omitted.

    bindImageZoom(document.getElementById('pv-proj-body'));
    bindImageZoom(gallery);

    if (typeof initCarousels === 'function') initCarousels();

    const randomView = document.getElementById('pv-random-view');

    defaultView.style.display = 'none';
    if (randomView) randomView.style.display = 'none';
    projectView.style.display = 'block';
    projectView.classList.add('is-visible');

    // Force restart animation
    projectView.style.animation = 'none';
    projectView.offsetHeight; // reflow
    projectView.style.animation = '';

    panelMiddle.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showDefault() {
    const randomView = document.getElementById('pv-random-view');
    projectView.classList.remove('is-visible');
    projectView.style.display = 'none';
    if (randomView) randomView.style.display = 'none';
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
      let isHovering = false;
      let targetX = 50;
      let targetY = 50;
      let ticking = false;

      img.addEventListener('mouseenter', () => {
        isHovering = true;
        showZoom(img.src, img.alt);
      });

      const updateZoom = () => {
        if (!isHovering) return;
        zoomImage.style.setProperty('--zoom-x', `${targetX}%`);
        zoomImage.style.setProperty('--zoom-y', `${targetY}%`);
        ticking = false;
      };

      // Calculate and apply mouse position as CSS variables
      img.addEventListener('mousemove', (e) => {
        const rect = img.getBoundingClientRect();

        // Calculate raw percentages based on cursor position inside the element
        let xPos = ((e.clientX - rect.left) / rect.width) * 100;
        let yPos = ((e.clientY - rect.top) / rect.height) * 100;

        // Bound the percentages so panning doesn't jump off edges
        targetX = Math.max(0, Math.min(100, xPos));
        targetY = Math.max(0, Math.min(100, yPos));

        if (!ticking) {
          requestAnimationFrame(updateZoom);
          ticking = true;
        }
      });

      img.addEventListener('mouseleave', () => {
        isHovering = false;
        clearZoom();
      });

      // Click event for Full Screen Gallery Overlay
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFullscreenGallery(img.src);
      });
    });
  }

  // ── Full Screen Gallery Overlay Slideshow Logic ───────────
  let activeProjectImages = [];
  let currentOverlayIndex = -1;

  function openFullscreenGallery(clickedSrc) {
    if (!overlay || !overlayImg) return;
    
    // Find all images within the active project display area
    const pView = document.getElementById('pv-project-view');
    if (!pView) return;

    const visibleImages = Array.from(pView.querySelectorAll('.pv-proj-body img, .pv-proj-images img'));
    activeProjectImages = visibleImages.map(img => img.src);
    currentOverlayIndex = activeProjectImages.indexOf(clickedSrc);
    
    if (currentOverlayIndex === -1) {
      activeProjectImages = [clickedSrc];
      currentOverlayIndex = 0;
    }

    updateOverlayImage();
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock background scroll
  }

  function closeFullscreenGallery() {
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function nextOverlayImage() {
    if (activeProjectImages.length <= 1) return;
    currentOverlayIndex = (currentOverlayIndex + 1) % activeProjectImages.length;
    updateOverlayImage();
  }

  function prevOverlayImage() {
    if (activeProjectImages.length <= 1) return;
    currentOverlayIndex = (currentOverlayIndex - 1 + activeProjectImages.length) % activeProjectImages.length;
    updateOverlayImage();
  }

  function updateOverlayImage() {
    if (overlayImg && activeProjectImages[currentOverlayIndex]) {
      overlayImg.src = activeProjectImages[currentOverlayIndex];
    }
  }

  // Bind Overlay Events
  if (overlayClose) {
    overlayClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFullscreenGallery();
    });
  }
  if (overlayPrev) {
    overlayPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      prevOverlayImage();
    });
  }
  if (overlayNext) {
    overlayNext.addEventListener('click', (e) => {
      e.stopPropagation();
      nextOverlayImage();
    });
  }
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === document.querySelector('.pv-gallery-overlay-content')) {
        closeFullscreenGallery();
      }
    });
  }

  // Keyboard navigation support
  document.addEventListener('keydown', (e) => {
    if (overlay && overlay.style.display === 'flex') {
      if (e.key === 'Escape') closeFullscreenGallery();
      if (e.key === 'ArrowRight') nextOverlayImage();
      if (e.key === 'ArrowLeft') prevOverlayImage();
    }
  });

  // ── Inline Artbook Carousel Logic ─────────────────────────
  function initCarousels() {
    const carousels = document.querySelectorAll('.pv-artbook-carousel');
    carousels.forEach(carousel => {
      if (carousel.dataset.bound) return;
      carousel.dataset.bound = "true";

      const slides = Array.from(carousel.querySelectorAll('.pv-artbook-slide'));
      const btnPrev = carousel.querySelector('.pv-gallery-ctrl.prev');
      const btnNext = carousel.querySelector('.pv-gallery-ctrl.next');
      if (!slides.length) return;
      
      let currentIndex = 0;
      let hasActive = false;
      slides.forEach((slide, idx) => {
         if (slide.classList.contains('is-active')) {
            currentIndex = idx;
            hasActive = true;
         }
      });
      // Safety fallback: if no slide was marked active in HTML, force the first one to be active!
      if (!hasActive && slides.length > 0) {
         slides[0].classList.add('is-active');
      }

      function showSlide(index) {
        slides.forEach(s => s.classList.remove('is-active'));
        slides[index].classList.add('is-active');
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentIndex = (currentIndex > 0) ? currentIndex - 1 : slides.length - 1;
          showSlide(currentIndex);
        });
      }
      
      if (btnNext) {
        btnNext.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentIndex = (currentIndex < slides.length - 1) ? currentIndex + 1 : 0;
          showSlide(currentIndex);
        });
      }
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

  // ── Global locked state ──────────────────────────────────
  let lockedSlug = null;

  const leftPanel = document.getElementById('pv-left');
  if (leftPanel) {
    leftPanel.addEventListener('mouseleave', () => {
      if (window.innerWidth <= 900) return;
      if (lockedSlug) {
        const lockedItem = document.querySelector(`.pv-project-item[data-slug="${lockedSlug}"]`);
        if (lockedItem && activeSlug !== lockedSlug) {
           lockedItem.dispatchEvent(new MouseEvent('mouseenter'));
        }
      }
    });
  }

  // Clear lock on outside click
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) return;
    const projView = document.getElementById('pv-project-view');
    if (lockedSlug && leftPanel && !leftPanel.contains(e.target) && projView && !projView.contains(e.target)) {
       lockedSlug = null;
       document.querySelectorAll('.pv-project-item').forEach(el => el.classList.remove('is-locked'));
       clearActive();
       showDefault();
    }
  });

  // ── Works title hover → show random project image ─────────
  let randomImagePool = [];

  function repopulateImagePool() {
    randomImagePool = [];
    projects.forEach(p => {
       if (p.extractedImages && p.extractedImages.length > 0) {
         const randImg = p.extractedImages[Math.floor(Math.random() * p.extractedImages.length)];
         randomImagePool.push(randImg);
       }
    });
    // Fisher-Yates shuffle
    for (let i = randomImagePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomImagePool[i], randomImagePool[j]] = [randomImagePool[j], randomImagePool[i]];
    }
  }

  if (worksToggle) {
    worksToggle.addEventListener('mouseenter', () => {
      clearActive();
      const randomView = document.getElementById('pv-random-view');
      const randomImg = document.getElementById('pv-random-img');
      
      if (randomView && randomImg && projects.length > 0) {
        if (randomImagePool.length === 0) {
          repopulateImagePool();
        }
        
        if (randomImagePool.length > 0) {
          projectView.classList.remove('is-visible');
          projectView.style.display = 'none';
          defaultView.style.display = 'none';
          
          randomImg.src = randomImagePool.pop();
          randomView.style.display = 'flex';
        }
      }
    });
  }

  // ── Project item hovers ──────────────────────────────────
  document.querySelectorAll('.pv-project-item').forEach(item => {
    const slug = item.dataset.slug;

    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) return; // Desktop only logic
      if (lockedSlug === slug) {
         lockedSlug = null;
         item.classList.remove('is-locked');
      } else {
         document.querySelectorAll('.pv-project-item').forEach(el => el.classList.remove('is-locked'));
         lockedSlug = slug;
         item.classList.add('is-locked');
         if (activeSlug !== slug) {
            item.dispatchEvent(new MouseEvent('mouseenter'));
         }
      }
    });

    item.addEventListener('mouseenter', () => {
      if (activeSlug === slug) return;
      clearActive();
      item.classList.add('is-active');
      activeSlug = slug;

      const proj = projects.find(p => p.slug === slug);
      if (!proj) return;

      const finalCats = (proj.categories || []).slice(0, 5);
      const catHtml = finalCats.map(c => {
        // ✅ Define your custom HEX colors per category here:
        const customColors = {
          "Design": "#1255ffff",
          "Art": "#8153ff",
          "Freelance": "#8bb9f9ff",
          "Personal": "#7d763fff",
          "Research": "#f9731fff",
        };

        let bg = customColors[c];

        if (!bg) {
          // Default dynamic gray for unexpected categories
          let hash = 0;
          for (let i = 0; i < c.length; i++) hash += c.charCodeAt(i);
          const val = 80 + (hash % 100);
          bg = `rgb(${val},${val},${val})`;
        }

        return `<span class="cat-pill" style="--cat-bg: ${bg}">
          <span class="cat-pill-icon">${c.charAt(0)}</span>
          <span class="cat-pill-text">${c.slice(1)}</span>
        </span>`;
      }).join('');

      showMiddle({
        categoriesHtml: catHtml,
        title: proj.title,
        description: proj.description || '',
        content: proj.content || '',
        images: proj.images,
        url: '', // removed project link
        isPage: false
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
        yearType: '',
        title: page.title,
        description: '',
        content: page.content || '',
        images: [],
        url: '',
        isPage: true
      });
    });

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
  });

  // ── Mobile UX (Burger + Slider) ──────────────────────────
  const burger = document.getElementById('pv-burger');
  const sections = document.querySelector('.pv-sections');
  
  if (burger && sections) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-active');
      sections.classList.toggle('is-open');
    });

    // Close sidebar on item click (mobile)
    document.querySelectorAll('.pv-project-item, .pv-section-heading.pv-page-item').forEach(el => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          burger.classList.remove('is-active');
          sections.classList.remove('is-open');
        }
      });
    });
  }



})();
