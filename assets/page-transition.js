/* ============================================================
   Terra & Form — Transition « landing → page Services »
   « Signature »

   Au clic sur « Entrer sur le site », le carré terracotta du logo se
   détache et s'agrandit jusqu'à remplir l'écran : la page Services
   (pré-chargée, dans la langue choisie) apparaît à l'intérieur pendant
   que la landing s'assombrit autour. En même temps, le logo file se poser
   à sa place dans le header. Le contenu entre en cascade, puis la vraie
   page Services s'ouvre dans le même état visuel, sans aucun saut
   (styles : page-transition.css).

   Désactivé si l'utilisateur a demandé moins d'animations, ou pour un
   clic modifié (Ctrl/Cmd/Maj, clic molette) : le lien fonctionne alors
   normalement.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var ARRIVE_KEY = 'tfArrive';      // drapeau lu par le <head> de la page Services

  // Rythme (ms, compté depuis le départ de l'animation)
  var OPEN_AT = 80;    // le carré commence à s'ouvrir
  var OPEN = 1000;     // ouverture du carré jusqu'aux bords de l'écran
  var FLY_AT = 90;     // le logo part vers le header
  var FLY = 950;       // vol du logo
  var SWAP_AT = 930;   // fondu entre le logo volant et celui du header
  var D0 = 0.45;       // départ de la cascade du contenu (s)
  var DONE = 1850;     // tout est en place : ouverture de la vraie page
  var MAX_WAIT = 500;  // attente maximale de la page Services pré-chargée après le clic
  var E_OPEN = 'cubic-bezier(.72,0,.16,1)';
  var E_FLY = 'cubic-bezier(.65,0,.35,1)';
  var E_OUT = 'cubic-bezier(.22,1,.36,1)';
  // Position du carré dans l'image du logo de la landing (img-9712dfbb58.webp, 204×142)
  var SQ = { x: 89 / 204, y: 17 / 142, w: 112 / 204, h: 111 / 142 };

  var scriptSrc = (doc.currentScript && doc.currentScript.src) || '';
  var assetBase = scriptSrc ? scriptSrc.replace(/[^\/]*$/, '') : '/assets/';

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, Math.max(0, ms)); }); }

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

  // ============================================================
  // 1) LANDING
  // ============================================================
  function initLanding(btn, hero) {
    var href = btn.href;
    if (!/\/services\/?(\?|#|$)/.test(href)) return;

    var busy = false, cleanup = [], timers = [];
    var warmP = null;
    var bannerSources = null; // [{media, src}] lus dans la page Services
    var bannerImgs = {};      // préchargements par URL
    var svcSectionHTML = '';  // contenu de la page Services (pré-lu)
    var shell = hero.closest('.ll-shell') || hero.parentNode;

    function currentBannerSrc() {
      var list = bannerSources || [
        { media: '(max-width:440px)', src: assetBase + 'images/id-services-banner-img-47f7f1c4ce-m.webp' },
        { media: '', src: assetBase + 'images/id-services-banner-img-47f7f1c4ce.webp' }
      ];
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
      if (warmP) return warmP;
      preloadBanner();
      if (!window.fetch || !window.DOMParser) return (warmP = Promise.resolve());
      warmP = fetch(href, { credentials: 'same-origin' }).then(function (r) {
        return r.ok ? r.text() : '';
      }).then(function (html) {
        if (!html) return;
        var d = new DOMParser().parseFromString(html, 'text/html');
        var img = d.getElementById('services-banner-img');
        if (img) {
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
        }
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
      return warmP;
    }

    // Polices de la page Services (header, contenu) : chargées à l'avance pour
    // que la page découverte dans le carré soit déjà dans sa vraie police.
    var PAGE_FONTS = ['700 17px "Archivo Expanded"', '400 12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"',
      '600 12px "IBM Plex Mono"', '700 12px "IBM Plex Mono"', '300 16px "Fraunces"', '400 16px "Fraunces"'];
    var TH = /\/th(\/|$)/.test(new URL(href, location.href).pathname) || root.lang === 'th';
    if (TH) PAGE_FONTS.push('400 16px "Noto Serif Thai"', '500 12px "IBM Plex Sans Thai"', '700 12px "IBM Plex Sans Thai"');
    var SAMPLE = TH ? 'บริการ Terra & Form' : 'Terra & Form';
    function loadFonts() {
      if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
      return Promise.all(PAGE_FONTS.map(function (f) { return doc.fonts.load(f, SAMPLE); }));
    }
    function fontsReady(ms) { return Promise.race([loadFonts(), wait(ms)]).catch(function () {}); }

    window.addEventListener('load', function () {
      loadFonts().catch(function () {});
      setTimeout(warm, 900);
    });
    ['pointerenter', 'touchstart', 'focus'].forEach(function (ev) {
      btn.addEventListener(ev, warm, { passive: true, once: true });
    });

    btn.addEventListener('click', function (e) {
      if (busy || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (prefersReduced() || typeof Element.prototype.animate !== 'function') return;
      e.preventDefault();
      busy = true;
      // La page Services doit être prête à apparaître dans le carré : on l'attend
      // un court instant (en général elle est déjà pré-lue), sinon on l'ouvre directement.
      var t = performance.now();
      Promise.race([Promise.all([warm(), fontsReady(MAX_WAIT)]), wait(MAX_WAIT)]).then(function () {
        if (!busy) return;
        if (!svcSectionHTML) { arriveMode = 'c'; go(); return; }
        var b = preloadBanner();
        var left = MAX_WAIT - (performance.now() - t);
        return Promise.race([b.decode ? b.decode().catch(function () {}) : Promise.resolve(), wait(left)]).then(function () {
          if (!busy) return;
          try { run(); } catch (err) { reset(); busy = true; arriveMode = 'c'; go(); }
        });
      });
    });

    var arriveMode = 'c'; // 's' : contenu déjà affiché par la transition ; 'c' : cascade à l'arrivée
    function go() {
      try { sessionStorage.setItem(ARRIVE_KEY, arriveMode + ':' + Date.now()); } catch (e) {}
      if (window.__tfHoldTransition) return; // crochet de test
      window.location.assign(href);
    }

    function run() {
      root.classList.add('tf-busy');
      var anims = [], layers = [];
      function A(node, kf, o) {
        var a = node.animate(kf, Object.assign({ fill: 'both' }, o));
        anims.push(a);
        return a;
      }
      function layer(cls, parent) {
        var e = doc.createElement('div');
        e.className = cls;
        e.setAttribute('aria-hidden', 'true');
        (parent || doc.body).appendChild(e);
        layers.push(e);
        return e;
      }
      cleanup.push(function () {
        anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        layers.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
      });

      var W = root.clientWidth, H = window.innerHeight;
      var brand = hero.querySelector('.ll-hero2-brand');
      var mark = brand && brand.querySelector('.ll-hero2-brand-mark');
      var word = brand && brand.querySelector('.ll-hero2-brand-word-img');
      var m = mark.getBoundingClientRect(), w = word.getBoundingClientRect();

      // --- 1) Sous la landing : la page Services, à sa place exacte ---
      var header = doc.getElementById('siteGlobalHeader');
      var main = doc.getElementById('siteMain');
      var pageIndex = doc.getElementById('page-index');
      var vw = root.clientWidth;
      var hasScrollbar = window.innerWidth - root.clientWidth > 0;
      var W1 = hasScrollbar ? vw : vw - scrollbarWidth(); // largeur utile de la page Services
      header.classList.remove('is-hidden-landing');
      header.style.width = W1 < vw ? W1 + 'px' : '';
      header.style.zIndex = '6';               // sous la landing (z-index 10)
      var holder = doc.createElement('div');
      holder.innerHTML = svcSectionHTML;
      var section = holder.firstElementChild;
      section.style.animation = 'none';
      section.setAttribute('aria-hidden', 'true');
      root.style.overflow = 'hidden';
      if (pageIndex) pageIndex.style.display = 'contents';
      main.style.width = W1 < vw ? W1 + 'px' : '';
      main.style.setProperty('--tf-d0', D0 + 's');
      main.classList.add('tf-cascade');        // le contenu entre en cascade dans le carré
      main.appendChild(section);
      brand.style.visibility = 'hidden';       // remplacé par le logo volant
      cleanup.push(function () {
        if (section.parentNode) section.parentNode.removeChild(section);
        if (pageIndex) pageIndex.style.display = '';
        main.style.width = '';
        main.style.removeProperty('--tf-d0');
        main.classList.remove('tf-cascade');
        root.style.overflow = '';
        header.classList.add('is-hidden-landing');
        header.style.width = '';
        header.style.zIndex = '';
        brand.style.visibility = '';
        shell.style.visibility = '';
      });

      // --- 2) Le carré du logo s'ouvre : un trou dans la landing, jusqu'aux bords ---
      var sx = m.left + m.width * SQ.x, sy = m.top + m.height * SQ.y;
      var sw = m.width * SQ.w, sh = m.height * SQ.h;
      // Contour de l'écran puis contour du carré (règle evenodd : le carré est un trou)
      function hole(x, y, ww, hh) {
        var x2 = x + ww, y2 = y + hh;
        return 'polygon(evenodd, ' + x + 'px 0px, ' + W + 'px 0px, ' + W + 'px ' + H + 'px, 0px ' + H + 'px, 0px 0px, ' +
          x + 'px 0px, ' + x + 'px ' + y + 'px, ' + x2 + 'px ' + y + 'px, ' + x2 + 'px ' + y2 + 'px, ' + x + 'px ' + y2 + 'px, ' + x + 'px ' + y + 'px)';
      }
      var opening = A(shell, [{ clipPath: hole(sx, sy, sw, sh) }, { clipPath: hole(-2, -2, W + 4, H + 4) }],
        { duration: OPEN, delay: OPEN_AT, easing: E_OPEN });
      opening.finished.then(function () { shell.style.visibility = 'hidden'; }, function () {});
      // La landing recule et s'assombrit autour du carré
      var dim = layer('tf-sig-dim', shell);
      A(dim, [{ opacity: 0 }, { opacity: 0.58 }], { duration: OPEN + OPEN_AT, easing: 'cubic-bezier(.4,0,.2,1)' });
      var hr = hero.getBoundingClientRect();
      A(hero, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], {
        duration: OPEN + OPEN_AT, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards'
      });
      hero.style.transformOrigin = (sx + sw / 2 - hr.left) + 'px ' + (sy + sh / 2 - hr.top) + 'px';
      cleanup.push(function () { hero.style.transformOrigin = ''; });
      // Le bord du carré, en terracotta
      var frame = layer('tf-sig-frame');
      A(frame, [
        { left: sx + 'px', top: sy + 'px', width: sw + 'px', height: sh + 'px' },
        { left: '-1px', top: '-1px', width: (W + 2) + 'px', height: (H + 2) + 'px' }
      ], { duration: OPEN, delay: OPEN_AT, easing: E_OPEN });
      A(frame, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: OPEN_AT + OPEN - 200, fill: 'forwards' });

      // --- 3) Le logo file se poser à sa place dans le header ---
      var hLogo = header.querySelector('.logo');
      var tm = header.querySelector('.logo .mark').getBoundingClientRect();
      var tw = header.querySelector('.logo .word').getBoundingClientRect();
      // Le symbole et le mot volent chacun vers leur place exacte dans le header
      function flyTo(img, from, to, k) {
        var f = layer('tf-sig-logo');
        f.style.cssText = 'left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px;';
        var im = doc.createElement('img');
        im.alt = '';
        im.src = img.currentSrc || img.src;
        f.appendChild(im);
        var tx = to.left - from.left, ty = to.top + to.height / 2 - from.top - k * from.height / 2;
        A(f, [{ transform: 'translate(0px,0px) scale(1)' }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')' }],
          { duration: FLY, delay: FLY_AT, easing: E_FLY });
        A(f, [{ opacity: 1 }, { opacity: 0 }], { duration: 170, delay: SWAP_AT + 10, fill: 'forwards' });
      }
      flyTo(mark, m, tm, tm.height / m.height);
      flyTo(word, w, tw, tw.width / w.width);
      if (hLogo) A(hLogo, [{ opacity: 0 }, { opacity: 1 }], { duration: 170, delay: SWAP_AT });

      // --- 4) La bannière Services se pose dans le carré ---
      var bannerImg = section.querySelector('#services-banner-img');
      if (bannerImg) A(bannerImg, [{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }],
        { duration: 1700, delay: OPEN_AT, easing: E_OUT, fill: 'backwards' });

      // Tout est en place (cascade comprise) : la vraie page s'ouvre dans le même état
      arriveMode = 's';
      timers.push(setTimeout(go, DONE));
    }

    // Retour arrière (cache bfcache) : la landing doit retrouver son état initial
    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      busy = false;
      cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
      cleanup = [];
      root.classList.remove('tf-busy');
      try { btn.blur(); } catch (e) {}
    }
    window.addEventListener('pageshow', function (e) {
      if (e.persisted && (busy || cleanup.length)) reset();
    });
    window.__tfResetTransition = reset; // crochet de test
  }

  // ============================================================
  // 2) PAGE SERVICES
  // ============================================================
  function initServices() {
    if (root.classList.contains('tf-cascade')) {
      // Fin de la cascade d'entrée : on retire ses animations (sinon elles bloqueraient
      // les effets de survol). La classe tf-arrive, elle, reste en place : la retirer
      // relancerait l'animation d'apparition de la page (fadeIn) et la ferait clignoter.
      setTimeout(function () { root.classList.remove('tf-cascade'); }, 2400);
    }
  }

  var btn = doc.getElementById('llDiscoverBtn');
  var hero = doc.getElementById('llHero');
  if (btn && hero) initLanding(btn, hero);

  if (doc.getElementById('page-services')) initServices();
})();
