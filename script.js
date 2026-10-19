(() => {
  'use strict';
  const projects = window.portfolioProjects;
  const grid = document.querySelector('#project-grid');
  const dialog = document.querySelector('#project-dialog');
  const content = document.querySelector('#dialog-content');
  let lastTrigger = null;
  let previousHash = '#work';
  let currentPage = null;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const assetURL = path => path.split('/').map(encodeURIComponent).join('/');
  function artwork(project) {
    return `<div class="artwork actual-artwork" style="--cover-ratio:${project.coverWidth}/${project.coverHeight}"><img src="${assetURL(project.image)}" alt="${escape(project.alt)}" width="${project.coverWidth}" height="${project.coverHeight}" loading="lazy" decoding="async"></div>`;
  }
  grid.innerHTML = projects.map(p => `<a class="project-card" href="#project/${escape(p.id)}" data-category="${escape(p.category)}" data-project="${escape(p.id)}">${artwork(p)}<div class="card-info"><div><h3>${escape(p.title)}</h3><p>${escape(p.subtitle)}</p></div><span class="project-number">${escape(p.number)}</span></div></a>`).join('');
  let layoutFrame = 0;
  function updateImageHover(frame) {
    const image = frame.querySelector('img');
    if (!image) return;
    const longestEdge = Math.max(image.clientWidth, image.clientHeight);
    if (longestEdge) frame.style.setProperty('--hover-zoom', String(1 + Math.min(.055, 24 / longestEdge)));
  }
  function layoutWork() {
    const width = grid.clientWidth;
    if (!width) return;
    const columns = parseInt(getComputedStyle(grid).getPropertyValue('--work-columns'), 10) || 3;
    const gap = parseFloat(getComputedStyle(grid).getPropertyValue('--work-column-gap')) || 28;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const heights = Array(columns).fill(0);
    grid.classList.add('masonry-ready');
    const cards = [...grid.querySelectorAll('.project-card')].filter(card => !card.hidden);
    cards.forEach(card => { card.style.width = `${cardWidth}px`; });
    cards.forEach(card => updateImageHover(card.querySelector('.actual-artwork')));
    cards.forEach(card => {
      const column = heights.indexOf(Math.min(...heights));
      card.style.left = `${column * (cardWidth + gap)}px`;
      card.style.top = `${heights[column]}px`;
      heights[column] += card.getBoundingClientRect().height + 24;
    });
    grid.style.height = `${Math.max(0, ...heights) - (cards.length ? 24 : 0)}px`;
  }
  function requestWorkLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(layoutWork);
  }
  let observedWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== observedWidth) { observedWidth = width; requestWorkLayout(); }
  }).observe(grid);
  grid.querySelectorAll('img').forEach(image => image.addEventListener('load', requestWorkLayout));
  if (document.fonts) document.fonts.ready.then(requestWorkLayout);
  window.addEventListener('resize', requestWorkLayout);
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let count = 0;
    grid.querySelectorAll('.project-card').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
      if (!card.hidden) count++;
    });
    document.querySelector('#filter-status').textContent = `${count}개의 작업 모음을 표시합니다.`;
    requestWorkLayout();
    });
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#project/"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!projects.some(project => link.hash === `#project/${project.id}`)) return;
    event.preventDefault();
    if (!dialog.open) {
      lastTrigger = link;
      previousHash = location.hash || '#work';
    }
    history.pushState({ portfolioPage: currentPage || 'work', returnHash: previousHash }, '', link.hash);
    syncRoute();
  });
  function stopVideos() {
    content.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
  }
  let galleryFrame = 0;
  function layoutGallery() {
    if (!dialog.open) return;
    content.querySelectorAll('.gallery-collection, .gallery-pairs, .thumbnail-grid').forEach(gallery => {
      const width = gallery.clientWidth;
      if (!width) return;
      const style = getComputedStyle(gallery);
      const columns = style.gridTemplateColumns.split(/\s+/).length;
      const columnGap = parseFloat(style.columnGap) || 0;
      const rowGap = parseFloat(style.rowGap) || 0;
      const itemWidth = (width - columnGap * (columns - 1)) / columns;
      const heights = Array(columns).fill(0);
      const items = [...gallery.children];
      gallery.classList.add('gallery-masonry');
      items.forEach(item => { item.style.width = `${itemWidth}px`; });
      items.forEach(item => {
        const column = heights.indexOf(Math.min(...heights));
        item.style.left = `${column * (itemWidth + columnGap)}px`;
        item.style.top = `${heights[column]}px`;
        heights[column] += item.getBoundingClientRect().height + rowGap;
      });
      gallery.style.height = `${Math.max(0, ...heights) - (items.length ? rowGap : 0)}px`;
    });
    content.querySelectorAll('.media-link').forEach(link => {
      if (!link.closest('.gallery-continuous')) updateImageHover(link);
    });
  }
  function requestGalleryLayout() {
    cancelAnimationFrame(galleryFrame);
    galleryFrame = requestAnimationFrame(layoutGallery);
  }
  let galleryObservedWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== galleryObservedWidth) {
      galleryObservedWidth = width;
      requestGalleryLayout();
    }
  }).observe(content);
  content.addEventListener('load', requestGalleryLayout, true);
  window.addEventListener('resize', requestGalleryLayout);
  if (document.fonts) document.fonts.ready.then(requestGalleryLayout);
  function renderGallery(project) {
    const continuous = project.layout === 'continuous';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderImage = (item, index, caption) => {
      const useOriginal = continuous || project.layout === 'pages' || project.id === 'promotion-pages';
      const src = useOriginal ? item.animated && reduceMotion ? item.preview : item.src : item.preview;
      const title = caption || (project.videos.length ? item.alt : `${String(index + 1).padStart(2, '0')} / ${item.alt}`);
      return `<figure class="media-unit"><a class="media-link" href="${assetURL(item.src)}" target="_blank" rel="noopener" aria-label="${escape(title)} 원본 이미지 새 창에서 보기"><img src="${assetURL(src)}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async"></a>${continuous ? '' : `<figcaption><span>${escape(title)}</span></figcaption>`}</figure>`;
    };
    if (project.groups?.length) {
      const bySource = new Map(project.gallery.map(item => [item.src, item]));
      return `<div class="grouped-gallery">${project.groups.map((group, groupIndex) => `<section class="media-group" aria-labelledby="media-group-${groupIndex}"><h3 id="media-group-${groupIndex}">${escape(group.title)}</h3><div class="${group.kind === 'series' ? 'series-grid' : 'gallery-collection'}">${group.items.map((src, index) => renderImage(bySource.get(src), index, group.kind === 'series' ? `${group.title} · ${String(index + 1).padStart(2, '0')}` : bySource.get(src).alt)).join('')}</div></section>`).join('')}</div>`;
    }
    const images = project.gallery.map((item, index) => renderImage(item, index)).join('');
    const videos = project.videos.length ? `<section class="video-section" aria-labelledby="videos-title"><h3 id="videos-title">영상 <span>${project.videos.length}</span></h3><div class="video-grid">${project.videos.map(video => `<figure><video controls playsinline preload="none" src="${assetURL(video.src)}"${video.poster ? ` poster="${assetURL(video.poster)}"` : ''} aria-label="${escape(video.title)}">이 브라우저는 동영상 재생을 지원하지 않습니다. <a href="${assetURL(video.src)}">영상 파일 열기</a></video><figcaption>${escape(video.title)}</figcaption></figure>`).join('')}</div></section>` : '';
    const gallery = project.videos.length
      ? `<section class="thumbnail-section" aria-labelledby="thumbnails-title"><h3 id="thumbnails-title">썸네일 <span>${project.gallery.length}</span></h3><div class="thumbnail-grid">${images}</div></section>`
      : `<div class="media-gallery gallery-${escape(project.layout)}">${images}</div>`;
    return `${videos}${gallery}`;
  }
  function openProject(project) {
    stopVideos();
    dialog.querySelector('[data-dialog-label]').textContent = `${project.label} / ${project.number}`;
    const index = projects.indexOf(project);
    const next = projects[(index + 1) % projects.length];
    content.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${escape(project.title)}</h2><p>${escape(project.description)}</p><p class="project-detail-count">이미지 ${project.gallery.length}개${project.videos.length ? ` · 영상 ${project.videos.length}개` : ''}${project.contribution ? ` · ${escape(project.contribution)}` : ''}</p></div><div class="dialog-meta"><div><span class="small-label">COLLECTION</span><p>${escape(project.subtitle)}</p></div><div><span class="small-label">CONTENTS</span><p>${escape(project.focus)}</p></div></div>${renderGallery(project)}<div class="dialog-project-nav"><a href="#project/${escape(next.id)}"><strong>${escape(next.title)} →</strong></a></div>`;
    if (!dialog.open) dialog.showModal();
    requestGalleryLayout();
    dialog.scrollTop = 0;
    document.body.classList.add('modal-open');
  }
  function syncRoute() {
    const hash = location.hash;
    const project = projects.find(p => `#project/${p.id}` === hash);
    const page = project ? history.state?.portfolioPage || currentPage || 'work' : hash === '#about' || hash === '#contact' ? 'about' : 'work';
    if (project && history.state?.returnHash) previousHash = history.state.returnHash;
    const pageChanged = currentPage !== page;
    if (dialog.open && !project) dialog.close();
    document.querySelectorAll('[data-page]').forEach(view => {
      view.hidden = view.dataset.page !== page;
    });
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${page === 'work' ? 'Work' : 'About'} — 이혜림 포트폴리오`;
    document.querySelector('#back-to-top').href = `#${page}`;
    if (!hash || hash === '#home' || (!project && !['#about', '#work', '#contact'].includes(hash))) {
      history.replaceState(null, '', `#${page}`);
    }
    currentPage = page;
    if (page === 'work') requestWorkLayout();
    if (pageChanged) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (!project) document.querySelector(page === 'work' ? '#work-title' : '#hero-title').focus({ preventScroll: true });
    }
    if (hash === '#contact') document.querySelector('#contact').scrollIntoView();
    if (project) openProject(project);
  }
  function closeProject() {
    if (location.hash.startsWith('#project/')) {
      // Replace avoids adding another modal entry to browser history.
      history.replaceState(null, '', previousHash);
    }
    if (dialog.open) dialog.close();
  }
  document.querySelector('.dialog-close').addEventListener('click', closeProject);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProject();
  });
  dialog.addEventListener('close', () => {
    stopVideos();
    document.body.classList.remove('modal-open');
    if (lastTrigger && !lastTrigger.closest('[hidden]')) lastTrigger.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-nav], #back-to-top, .wordmark').forEach(link => {
    link.addEventListener('click', () => {
      if (link.getAttribute('href') === `#${currentPage}`) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  window.addEventListener('hashchange', syncRoute);
  syncRoute();
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
