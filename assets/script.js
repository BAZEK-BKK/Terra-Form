
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const siteGlobalHeaderEl = document.getElementById('siteGlobalHeader');
  function syncMobileMenuTop() {
    if (!siteGlobalHeaderEl) return;
    var h = siteGlobalHeaderEl.getBoundingClientRect().height;
    if (h > 0) document.documentElement.style.setProperty('--mm-top', h + 'px');
  }
  syncMobileMenuTop();
  window.addEventListener('resize', syncMobileMenuTop);
  window.addEventListener('orientationchange', syncMobileMenuTop);
  burger.addEventListener('click', () => {
    syncMobileMenuTop();
    const isOpen = mobileMenu.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    mobileMenu.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Fermer le menu mobile quand on clique sur un lien
  document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });

  // ===== Sélecteur de langue : remplace le <select> natif par un menu déroulant
  // personnalisé pour éviter le picker/scroll natif du mobile (iOS/Android). =====
  document.querySelectorAll('select.lang-select').forEach(function (select) {
    var options = Array.prototype.slice.call(select.options).filter(function (o) { return o.value; });
    if (!options.length) return;

    var current = options.filter(function (o) { return o.selected; })[0] || options[0];

    var wrapper = document.createElement('div');
    wrapper.className = 'lang-dd';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lang-dd-toggle';
    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');
    var ariaLabel = select.getAttribute('aria-label');
    if (ariaLabel) toggle.setAttribute('aria-label', ariaLabel);

    var labelSpan = document.createElement('span');
    labelSpan.className = 'lang-dd-label';
    labelSpan.textContent = current.textContent;
    toggle.appendChild(labelSpan);

    var chevron = document.createElement('span');
    chevron.className = 'lang-dd-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    toggle.appendChild(chevron);

    var menu = document.createElement('ul');
    menu.className = 'lang-dd-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    options.forEach(function (opt) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      var a = document.createElement('a');
      a.href = opt.value;
      a.textContent = opt.textContent;
      if (opt.selected) {
        li.setAttribute('aria-selected', 'true');
        a.setAttribute('aria-current', 'true');
      } else {
        li.setAttribute('aria-selected', 'false');
      }
      li.appendChild(a);
      menu.appendChild(li);
    });

    wrapper.appendChild(toggle);
    wrapper.appendChild(menu);
    select.insertAdjacentElement('afterend', wrapper);
    select.style.display = 'none';
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    function closeMenu() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      wrapper.classList.remove('open');
    }
    function openMenu() {
      document.querySelectorAll('.lang-dd.open').forEach(function (el) {
        if (el !== wrapper) el.classList.remove('open');
        var m = el.querySelector('.lang-dd-menu');
        if (m) m.hidden = true;
        var t = el.querySelector('.lang-dd-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      wrapper.classList.add('open');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) openMenu(); else closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) closeMenu();
    });

    wrapper.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeMenu(); toggle.focus(); }
    });
  });



  // ===== PROJECTS DATA + CARD RENDERING (executé avant la traduction pour que data-t soit pris en compte) =====
  const PROJECTS = [{"slug": "residence-bangkok", "catkey": "residentiel", "img": "/assets/images/proj-residence-bangkok-5f47b02615.webp", "lensClass": "lens circle", "lensStyle": "width:58%;height:80%;top:10%;left:5%;"}, {"slug": "villa-ladprao", "catkey": "residentiel", "img": "/assets/images/proj-villa-ladprao-870220c12c.webp", "lensClass": "lens circle", "lensStyle": "width:56%;height:78%;top:11%;left:6%;"}, {"slug": "villa-phromphong", "catkey": "residentiel", "img": "/assets/images/proj-villa-phromphong-432e64648b.webp", "lensClass": "lens", "lensStyle": "width:54%;height:74%;top:13%;right:7%;"}];
  const FEATURED_SLUGS = ['residence-bangkok', 'villa-ladprao', 'villa-phromphong'];

  function cardHTML(p){
    const lensCls = p.lensClass;
    return `<div class="card" data-cat="${p.catkey}">
      <div class="frame">
        <img src="${p.img}" alt="">
        <div class="${lensCls}" style="${p.lensStyle}"></div>
        <span class="tag" data-t="p_${p.slug}_cat"></span>
      </div>
      <div class="card-title" data-t="p_${p.slug}_title"></div>
      <div class="card-meta" data-t="loc_bangkok"></div>
    </div>`;
  }

  const homeFeaturedGrid = document.getElementById('homeFeaturedGrid');
  if (homeFeaturedGrid) {
    homeFeaturedGrid.innerHTML = FEATURED_SLUGS.map(slug => cardHTML(PROJECTS.find(p => p.slug === slug))).join('');
  }
  const projetsGrid = document.getElementById('grid');
  if (projetsGrid) {
    projetsGrid.innerHTML = PROJECTS.map(cardHTML).join('');
  }

  // ===== PROJETS VIEWER PAR CATEGORIE (une ligne par categorie, fleche independante) =====
  const CATEGORIES = ['residentiel', 'commercial'];
  const viewerState = {};
  CATEGORIES.forEach(cat => {
    viewerState[cat] = { list: PROJECTS.filter(p => p.catkey === cat), index: 0 };
  });

  function renderCatRow(cat){
    const row = document.querySelector('.cat-row[data-cat="' + cat + '"]');
    if (!row) return;
    const state = viewerState[cat];
    if (state.list.length === 0) { row.style.display = 'none'; return; }
    row.style.display = '';
    const lang = document.getElementById('site').getAttribute('data-lang');
    const dict = T[lang];
    const p = state.list[state.index];
    row.querySelector('.v-img').src = p.img;
    const lens = row.querySelector('.v-lens');
    lens.className = 'v-lens lens ' + (p.lensClass.indexOf('circle') > -1 ? 'circle' : '');
    lens.setAttribute('style', p.lensStyle);
    row.querySelector('.v-tag').textContent = dict['p_' + p.slug + '_cat'];
    row.querySelector('.v-title').textContent = dict['p_' + p.slug + '_title'];
    row.querySelector('.v-desc').textContent = dict['p_' + p.slug + '_desc'];
    row.querySelector('.v-meta').textContent = dict.loc_bangkok + ' \u00b7 ' + (state.index + 1) + ' / ' + state.list.length;
  }

  function renderAllCatRows(){ CATEGORIES.forEach(renderCatRow); }

  document.querySelectorAll('.cat-row .v-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.cat-row');
      const cat = row.getAttribute('data-cat');
      const state = viewerState[cat];
      if (state.list.length === 0) return;
      state.index = (state.index + 1) % state.list.length;
      renderCatRow(cat);
    });
  });

  window.__langChangeCallbacks = window.__langChangeCallbacks || [];
  window.__langChangeCallbacks.push(function(){ renderAllCatRows(); });

  // ===== SERVICES PAGE: photo Residentiel reutilisee du portfolio =====
  const svcResImgEl = document.getElementById('svcResImg');
  if (svcResImgEl) {
    const resProject = PROJECTS.find(p => p.slug === 'residence-bangkok');
    if (resProject) svcResImgEl.src = resProject.img;
  }

  // ===== ARTICLE DETAIL RENDERING =====
  const ARTICLE_IMAGES = {
    'j12_img1': '/assets/images/img-0da514b329.webp',
    'j12_img2': '/assets/images/img-811c9da98d.webp',
    'j11_img1': '/assets/images/img-6ee184e7f0.webp',
    'j11_img2': '/assets/images/img-8e781f4377.webp',
    'j10_img1': '/assets/images/img-9f0f7bf899.webp',
    'j10_img2': '/assets/images/img-9c9d212a9f.webp',
    'j9_img1': '/assets/images/img-30230cc39d.webp',
    'j9_img2': '/assets/images/img-b43183cc3a.webp',
    'j4_img2': '/assets/images/img-6665887889.webp',
    'j4_img3': '/assets/images/img-3ac64d9a70.webp',
    'j5_img1': '/assets/images/img-f3c6fdf6f3.webp',
    'j5_img3': '/assets/images/img-3a9c2d7190.webp',
    'j6_img1': '/assets/images/img-5cb8e1926d.webp',
    'j6_img2': '/assets/images/img-acb2327d68.webp',
    'j7_img1': '/assets/images/img-53ba31191e.webp',
    'j7_img2': '/assets/images/img-c3d1289329.webp',
    'j8_img1': '/assets/images/img-5900c5351c.webp',
    'j8_img2': '/assets/images/img-dc250821c4.webp',
    'j8_img3': '/assets/images/img-ca5d89fcdc.webp'
  };

  const ARTICLE_SLUG_TO_KEY = {
    'architecture-souterraine-verticalite-inversee': 'j12',
    'tradition-modernisme-tropical': 'j4',
    'architecture-bien-etre-biophilique': 'j5',
    'impression-3d-robotique-chantier': 'j6',
    'architecture-resiliente-flottante': 'j7',
    'architecture-securite-alimentaire': 'j8',
    'vernaculaire-2-0': 'j9',
    'mass-timber-architecture': 'j10',
    'architecture-regenerative': 'j11'
  };
  function renderArticleDetail(slug){
    const lang = document.getElementById('site').getAttribute('data-lang');
    const dict = T[lang];
    const key = ARTICLE_SLUG_TO_KEY[slug];
    const cardImg = document.querySelector('a.post-card[href="#article/' + slug + '"] img');
    const contentEl = document.getElementById('articleContent');
    const notFoundEl = document.getElementById('articleNotFound');
    if (!cardImg || !key || dict[key + '_body'] === undefined) {
      contentEl.style.display = 'none';
      notFoundEl.style.display = 'block';
      return;
    }
    contentEl.style.display = '';
    notFoundEl.style.display = 'none';
    document.getElementById('aImg').src = cardImg.src;
    document.getElementById('aTitle').textContent = dict[key + '_t'];
    document.getElementById('aBody').innerHTML = dict[key + '_body'];
    document.querySelectorAll('#aBody img[data-img-key]').forEach(img => {
      const src = ARTICLE_IMAGES[img.getAttribute('data-img-key')];
      if (src) img.src = src;
    });
    document.title = dict[key + '_t'] + ' \u2014 Terra & Form';
  }

  // ===== PROJECT DETAIL RENDERING =====
  function renderProjectDetail(slug){
    const lang = document.getElementById('site').getAttribute('data-lang');
    const dict = T[lang];
    const p = PROJECTS.find(pr => pr.slug === slug);
    const contentEl = document.getElementById('projectContent');
    const notFoundEl = document.getElementById('notFound');
    if (!p || dict['p_' + slug + '_title'] === undefined) {
      contentEl.style.display = 'none';
      notFoundEl.style.display = 'block';
      return;
    }
    contentEl.style.display = '';
    notFoundEl.style.display = 'none';
    document.getElementById('pImg').src = p.img;
    document.getElementById('pTag').textContent = dict['p_' + slug + '_cat'] + ' \u00b7 ' + dict.loc_bangkok;
    document.getElementById('pTitle').textContent = dict['p_' + slug + '_title'];
    document.getElementById('pDesc').textContent = dict['p_' + slug + '_desc'];
    document.title = dict['p_' + slug + '_title'] + ' \u2014 Terra & Form';
  }



  (function(){
    var track = document.getElementById('projMosaic');
    var prevBtn = document.querySelector('.proj-carousel-prev');
    var nextBtn = document.querySelector('.proj-carousel-next');
    if (!track || !prevBtn || !nextBtn) return;
    function cardStep(){
      var card = track.querySelector('.proj-mosaic-item');
      return card ? card.getBoundingClientRect().width + 22 : track.clientWidth;
    }
    prevBtn.addEventListener('click', function(){ track.scrollBy({left: -cardStep(), behavior: 'smooth'}); });
    nextBtn.addEventListener('click', function(){ track.scrollBy({left: cardStep(), behavior: 'smooth'}); });
    function updateArrows(){
      var max = track.scrollWidth - track.clientWidth - 2;
      prevBtn.disabled = track.scrollLeft <= 2;
      nextBtn.disabled = max <= 2 || track.scrollLeft >= max;
    }
    track.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
    window.updateProjCarouselArrows = updateArrows;
    updateArrows();
  })();
  // Gestion des filtres de projets
  (function(){
    var filterBtns = document.querySelectorAll('.proj-filter-btn');
    var projItems = document.querySelectorAll('.proj-mosaic-item');
    filterBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        filterBtns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        // Animation de transition
        projItems.forEach(function(item, i){
          item.style.opacity = '0.3';
          setTimeout(function(){
            item.style.opacity = '1';
          }, 50 + i * 30);
        });
      });
    });
  })();



  document.querySelectorAll('.acc-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.acc-header').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });



  // ===== LANDING HOME (index) interactions =====
  (function(){
    const header = document.getElementById('llHeader');

    if (header) {
      setTimeout(function(){ header.classList.add('ll-header--visible'); }, 650);
    }
  })();



/* ============================================================
   UX IMPROVEMENTS — PREVIEW (additive, does not touch existing
   router/accordion/render code above).
   ============================================================ */
(function(){
  // ---- 1) Scroll reveal ----
  var REVEAL_SELECTOR = '#grid .card, #homeFeaturedGrid .card, .journal-grid .post-card, .acc-item, .steps .step, .principle';
  var revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:.15, rootMargin:'0px 0px -60px 0px'}) : null;

  function markReveal(el){
    if (el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    if (!revealObserver){ el.classList.add('is-visible'); return; }
    var parent = el.parentElement;
    var siblings = parent ? Array.prototype.filter.call(parent.children, function(s){ return s.matches && s.matches(REVEAL_SELECTOR); }) : [el];
    var idx = Math.max(siblings.indexOf(el), 0);
    el.style.transitionDelay = Math.min(idx * 90, 720) + 'ms';
    revealObserver.observe(el);
  }

  function scanReveals(){
    document.querySelectorAll(REVEAL_SELECTOR).forEach(markReveal);
  }
  scanReveals();

  var scanTimer = null;
  var mo = new MutationObserver(function(){
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanReveals, 60);
  });
  mo.observe(document.body, {childList:true, subtree:true});

  // ---- 2C) Ripple on buttons ----
  document.addEventListener('click', function(e){
    var target = e.target.closest('.btn, .svc-split-cta');
    if (!target) return;
    var rect = target.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (e.clientX - rect.left - size / 2) + 'px';
    span.style.top = (e.clientY - rect.top - size / 2) + 'px';
    target.appendChild(span);
    span.addEventListener('animationend', function(){ span.remove(); });
  });

  // ---- 3) Loading bar on page change ----
  var bar = document.createElement('div');
  bar.id = 'pageLoaderBar';
  document.body.appendChild(bar);
  var hideTimer, resetTimer;
  function showLoader(){
    clearTimeout(hideTimer); clearTimeout(resetTimer);
    bar.style.width = '0%';
    bar.classList.add('is-active');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ bar.style.width = '78%'; });
    });
  }
  function hideLoader(){
    bar.style.width = '100%';
    hideTimer = setTimeout(function(){
      bar.classList.remove('is-active');
      resetTimer = setTimeout(function(){ bar.style.width = '0%'; }, 250);
    }, 180);
  }
  window.addEventListener('hashchange', function(){
    showLoader();
    setTimeout(hideLoader, 620);
  });
})();
