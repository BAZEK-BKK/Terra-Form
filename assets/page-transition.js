/* ============================================================
   Terra & Form — Transition « landing → page Services »
   « Lever de feuille »

   Au clic sur « Entrer sur le site », la landing se soulève comme une
   feuille (la photo bouge plus lentement : effet de parallaxe) et découvre
   en dessous la page Services elle-même : son contenu, pré-chargé, est
   placé sous la feuille exactement comme sur la page et entre en cascade
   pendant le lever. La vraie page Services s'ouvre ensuite dans le même
   état visuel, sans aucun saut (voir aussi page-transition.css).

   Désactivé si l'utilisateur a demandé moins d'animations, ou pour un
   clic modifié (Ctrl/Cmd/Maj, clic molette) : le lien fonctionne alors
   normalement.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var ARRIVE_KEY = 'tfArrive';      // drapeau lu par le <head> de la page Services
  var GEOM_KEY = 'tfSvcBanner';     // géométrie réelle de la bannière (mise en cache)
  var LIFT_MS = 950;                // durée du lever de feuille (voir page-transition.css)
  var scriptSrc = (doc.currentScript && doc.currentScript.src) || '';
  var assetBase = scriptSrc ? scriptSrc.replace(/[^\/]*$/, '') : '/assets/';

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function readGeom() {
    try {
      var g = JSON.parse(localStorage.getItem(GEOM_KEY) || 'null');
      if (g && isFinite(g.off) && isFinite(g.h) && g.h > 100 && g.h < 1200) return g;
    } catch (e) {}
    return { off: -90, h: 390 }; // valeurs actuelles du CSS (bannière Services)
  }

  function scrollbarWidth() {
    var probe = doc.createElement('div');
    probe.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:120px;height:120px;overflow:scroll;visibility:hidden;';
    try { probe.style.scrollbarWidth = getComputedStyle(root).scrollbarWidth || ''; } catch (e) {}
    doc.body.appendChild(probe);
    var w = probe.offsetWidth - probe.clientWidth;
    probe.parentNode.removeChild(probe);
    return w > 0 && w < 40 ? w : 0;
  }

  function loadImage(src) {
    var img = new Image();
    img.decoding = 'async';
    img.src = src;
    return img;
  }

  // Rectangle « cover » d'une image (iw×ih) dans une boîte
  function cover(iw, ih, bx, by, bw, bh) {
    var s = Math.max(bw / iw, bh / ih);
    return { x: bx + (bw - iw * s) / 2, y: by + (bh - ih * s) / 2, w: iw * s, h: ih * s };
  }

  // ============================================================
  // 1) LANDING
  // ============================================================
  function initLanding(btn, hero) {
    var href = btn.href;
    if (!/\/services\/?(\?|#|$)/.test(href)) return;

    var busy = false, warmed = false, cleanup = [], timers = [];
    var bannerSources = null; // [{media, src}] lus dans la page Services
    var bannerImgs = {};      // préchargements par URL
    var svcSectionHTML = '';  // contenu de la page Services (pré-lu)
    var shell = hero.closest('.ll-shell') || hero.parentNode;

    // URL de repli si la page Services n'a pas pu être pré-lue
    function fallbackBannerSources() {
      return [
        { media: '(max-width:440px)', src: assetBase + 'images/id-services-banner-img-47f7f1c4ce-m.webp' },
        { media: '', src: assetBase + 'images/id-services-banner-img-47f7f1c4ce.webp' }
      ];
    }
    function currentBannerSrc() {
      var list = bannerSources || fallbackBannerSources();
      for (var i = 0; i < list.length; i++) {
        if (!list[i].media || window.matchMedia(list[i].media).matches) return list[i].src;
      }
      return list[list.length - 1].src;
    }
    function preloadBanner() {
      var src = currentBannerSrc();
      if (!bannerImgs[src]) bannerImgs[src] = loadImage(src);
      return bannerImgs[src];
    }

    // Pré-lecture de la page Services (cache HTTP chaud => navigation quasi instantanée)
    function warm() {
      if (warmed) return;
      warmed = true;
      preloadBanner();
      if (!window.fetch || !window.DOMParser) return;
      fetch(href, { credentials: 'same-origin' }).then(function (r) {
        return r.ok ? r.text() : '';
      }).then(function (html) {
        if (!html) return;
        var d = new DOMParser().parseFromString(html, 'text/html');
        var img = d.getElementById('services-banner-img');
        if (!img) return;
        var list = [];
        var pic = img.parentNode && img.parentNode.tagName === 'PICTURE' ? img.parentNode : null;
        if (pic) {
          Array.prototype.forEach.call(pic.querySelectorAll('source'), function (s) {
            var set = (s.getAttribute('srcset') || '').split(',')[0].trim().split(/\s+/)[0];
            if (set) list.push({ media: s.getAttribute('media') || '', src: new URL(set, href).href });
          });
        }
        list.push({ media: '', src: new URL(img.getAttribute('src'), href).href });
        bannerSources = list;
        preloadBanner();
        var section = d.getElementById('page-services');
        if (section) {
          // Les chemins relatifs (../../assets/…) sont rendus absolus pour la landing
          Array.prototype.forEach.call(section.querySelectorAll('[src],[srcset],[href]'), function (el) {
            ['src', 'href'].forEach(function (a) {
              var v = el.getAttribute(a);
              if (v && !/^(#|mailto:|tel:|data:|https?:)/.test(v)) el.setAttribute(a, new URL(v, href).href);
            });
            var ss = el.getAttribute('srcset');
            if (ss) el.setAttribute('srcset', ss.split(',').map(function (part) {
              var bits = part.trim().split(/\s+/);
              bits[0] = new URL(bits[0], href).href;
              return bits.join(' ');
            }).join(', '));
          });
          svcSectionHTML = section.outerHTML;
          // Images visibles en haut de la page Services : préchargées
          Array.prototype.slice.call(section.querySelectorAll('.svc-split-img img'), 0, 4).forEach(function (im) {
            loadImage(im.getAttribute('src'));
          });
        }
      }).catch(function () {});
    }

    // Polices du header (masqué sur la landing) : chargées à l'avance pour
    // que le menu découvert sous la feuille soit déjà dans sa vraie police.
    var PAGE_FONTS = ['700 17px "Archivo Expanded"', '400 12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"',
      '600 12px "IBM Plex Mono"', '700 12px "IBM Plex Mono"', '300 16px "Fraunces"', '400 16px "Fraunces"'];
    if (root.lang === 'th') PAGE_FONTS.push('400 16px "Noto Serif Thai"', '500 12px "IBM Plex Sans Thai"', '700 12px "IBM Plex Sans Thai"');
    function loadHeaderFonts() {
      if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
      var sample = root.lang === 'th' ? 'บริการ Terra & Form' : 'Terra & Form';
      return Promise.all(PAGE_FONTS.map(function (f) { return doc.fonts.load(f, sample); }));
    }
    function headerFontsReady() {
      var wait = new Promise(function (res) { setTimeout(res, 450); });
      return Promise.race([loadHeaderFonts(), wait]).catch(function () {});
    }

    window.addEventListener('load', function () {
      loadHeaderFonts().catch(function () {});
      setTimeout(warm, 900);
    });
    ['pointerenter', 'touchstart', 'focus'].forEach(function (ev) {
      btn.addEventListener(ev, warm, { passive: true, once: true });
    });

    btn.addEventListener('click', function (e) {
      if (busy || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (prefersReduced() || !('onanimationend' in window)) return;
      e.preventDefault();
      busy = true;
      headerFontsReady().then(function () {
        try { run(); } catch (err) { go(); }
      });
    });

    var arriveMode = 'c'; // 's' : contenu déjà affiché sous la feuille ; 'c' : cascade à l'arrivée
    function go() {
      try { sessionStorage.setItem(ARRIVE_KEY, arriveMode + ':' + Date.now()); } catch (e) {}
      if (window.__tfHoldTransition) return; // crochet de test
      window.location.assign(href);
    }

    function run() {
      warm();
      root.classList.add('tf-busy');

      var header = doc.getElementById('siteGlobalHeader');
      var vw = root.clientWidth;
      var hasScrollbar = window.innerWidth - root.clientWidth > 0;
      var W1 = hasScrollbar ? vw : vw - scrollbarWidth(); // largeur utile de la page Services
      var geom = readGeom();

      // --- Sous la feuille : le vrai header du site, à sa place définitive ---
      header.classList.remove('is-hidden-landing');
      header.style.width = W1 < vw ? W1 + 'px' : '';
      header.style.zIndex = '6';           // sous la landing (z-index 10) pendant le lever
      var hH = header.getBoundingClientRect().height;
      cleanup.push(function () {
        header.classList.add('is-hidden-landing');
        header.style.width = '';
        header.style.zIndex = '';
      });

      var banner = preloadBanner();
      var minWait = 0;
      if (svcSectionHTML) {
        // --- Sous la feuille : la page Services elle-même, à sa place exacte ---
        var main = doc.getElementById('siteMain');
        var pageIndex = doc.getElementById('page-index');
        var holder = doc.createElement('div');
        holder.innerHTML = svcSectionHTML;
        var section = holder.firstElementChild;
        section.style.animation = 'none';
        section.setAttribute('aria-hidden', 'true');
        root.style.overflow = 'hidden';          // pas de barre de défilement pendant le lever
        if (pageIndex) pageIndex.style.display = 'contents';
        main.style.width = W1 < vw ? W1 + 'px' : '';
        main.style.setProperty('--tf-d0', '.3s');
        main.classList.add('tf-cascade');        // le contenu entre en cascade sous la feuille
        main.appendChild(section);
        arriveMode = 's';
        minWait = 1450;                          // la cascade est terminée avant d'ouvrir la vraie page
        cleanup.push(function () {
          if (section.parentNode) section.parentNode.removeChild(section);
          if (pageIndex) pageIndex.style.display = '';
          main.style.width = '';
          main.style.removeProperty('--tf-d0');
          main.classList.remove('tf-cascade');
          root.style.overflow = '';
        });
      } else {
        // --- Repli : seule la bannière Services est placée sous la feuille ---
        var bTop = hH + geom.off;               // haut de l'image (en partie sous le header)
        var bH = geom.h;
        var bX = (W1 - window.innerWidth) / 2;  // bannière centrée sur 100vw (demi-barre de défilement)
        var winBottom = bTop + bH;              // bas de la partie visible
        var under = doc.createElement('div');
        under.className = 'tf-under';
        under.setAttribute('aria-hidden', 'true');
        under.style.cssText = 'top:' + hH + 'px;height:' + Math.max(0, winBottom - hH) + 'px;width:' + Math.max(0, bX + W1) + 'px;';
        var img = doc.createElement('div');
        var nb = banner.naturalWidth
          ? cover(banner.naturalWidth, banner.naturalHeight, bX, bTop, W1, bH)
          : { x: bX, y: bTop, w: W1, h: bH };
        img.style.cssText = 'left:' + nb.x + 'px;top:' + (nb.y - hH) + 'px;width:' + nb.w + 'px;height:' + nb.h +
          'px;background-image:url("' + banner.src + '");' +
          (banner.naturalWidth ? '' : 'background-size:cover;background-position:center;');
        under.appendChild(img);
        doc.body.appendChild(under);
        arriveMode = 'c';
        cleanup.push(function () { if (under.parentNode) under.parentNode.removeChild(under); });
      }

      // --- Le lever de feuille (animations CSS, voir page-transition.css) ---
      shell.classList.add('tf-lift');
      cleanup.push(function () { shell.classList.remove('tf-lift'); });

      var lifted = new Promise(function (res) {
        function done(e) {
          if (e && (e.target !== shell || e.animationName !== 'tfLift')) return;
          shell.removeEventListener('animationend', done);
          res();
        }
        shell.addEventListener('animationend', done);
        timers.push(setTimeout(done, LIFT_MS + 400)); // filet de sécurité
      });
      var bannerReady = Promise.race([
        (banner.decode ? banner.decode() : Promise.resolve()).catch(function () {}),
        new Promise(function (res) { timers.push(setTimeout(res, LIFT_MS + 300)); })
      ]);
      var cascadeDone = new Promise(function (res) { timers.push(setTimeout(res, minWait)); });
      Promise.all([lifted, bannerReady, cascadeDone]).then(go, go);
    }

    // Retour arrière (cache bfcache) : la landing doit retrouver son état initial
    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
      cleanup = [];
      root.classList.remove('tf-busy');
      busy = false;
      try { btn.blur(); } catch (e) {}
    }
    window.addEventListener('pageshow', function (e) {
      if (e.persisted && busy) reset();
    });
    window.__tfResetTransition = reset; // crochet de test
  }

  // ============================================================
  // 2) PAGE SERVICES
  // ============================================================
  function initServices(page) {
    // Mémorise la géométrie réelle de la bannière pour les prochaines transitions
    function saveGeom() {
      var header = doc.getElementById('siteGlobalHeader');
      var banner = page.querySelector('.page-hero-header');
      if (!header || !banner || doc.body.style.position === 'fixed') return;
      var off = banner.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
      var h = banner.getBoundingClientRect().height;
      try { localStorage.setItem(GEOM_KEY, JSON.stringify({ off: Math.round(off), h: Math.round(h) })); } catch (e) {}
    }
    if (doc.readyState === 'complete') saveGeom();
    else window.addEventListener('load', saveGeom, { once: true });

    if (root.classList.contains('tf-arrive')) {
      // Fin de la cascade d'entrée : on rend la page à son comportement normal
      setTimeout(function () { root.classList.remove('tf-arrive', 'tf-cascade'); }, 2400);
    }
  }

  var btn = doc.getElementById('llDiscoverBtn');
  var hero = doc.getElementById('llHero');
  if (btn && hero) initLanding(btn, hero);

  var svc = doc.getElementById('page-services');
  if (svc) initServices(svc);
})();
