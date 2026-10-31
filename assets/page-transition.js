/* ============================================================
   Terra & Form — Transition « landing → page Services »
   « Le rideau »

   Au clic sur « Entrer sur le site », deux rideaux à bord arrondi
   (terracotta puis encre) montent sur la landing et portent le titre de
   la page d'arrivée, dans sa langue (« Nos services », « Our services »,
   « บริการของเรา »). Derrière le rideau, la page Services elle-même
   (pré-chargée) est mise en place ; le rideau repart vers le haut, le
   contenu entre en cascade, puis la vraie page Services s'ouvre dans le
   même état visuel, sans aucun saut (styles : page-transition.css).

   Désactivé si l'utilisateur a demandé moins d'animations, ou pour un
   clic modifié (Ctrl/Cmd/Maj, clic molette) : le lien fonctionne alors
   normalement.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var ARRIVE_KEY = 'tfArrive';      // drapeau lu par le <head> de la page Services

  // Rythme du rideau (ms, compté depuis le clic)
  var RISE = 640;      // montée d'un rideau
  var LAG = 85;        // décalage du rideau encre derrière le rideau terracotta
  var HOLD = 1220;     // départ du retrait (au plus tôt)
  var EXIT = 640;      // retrait d'un rideau
  var EXIT_LAG = 120;  // le terracotta repart après l'encre
  var DEADLINE = 2600; // au-delà, on ouvre la page Services sans attendre
  var E_IN = 'cubic-bezier(.7,0,.25,1)';
  var E_OUT = 'cubic-bezier(.22,1,.36,1)';
  var E_EXIT = 'cubic-bezier(.75,0,.2,1)';

  // Titre porté par le rideau : [mot, mis en valeur ?], par langue de la page d'arrivée
  var TITLES = {
    fr: [['Nos', 0], ['services', 1]],
    en: [['Our', 0], ['services', 1]],
    th: [['บริการ', 1], ['ของเรา', 0]]
  };

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

  // Langue de la page d'arrivée : celle de son adresse (/fr/, /en/, /th/), sinon celle de la landing
  function langOf(url) {
    var m = null;
    try { m = new URL(url, location.href).pathname.match(/^\/(fr|en|th)(\/|$)/); } catch (e) {}
    var l = m ? m[1] : (root.lang || '').toLowerCase().slice(0, 2);
    return TITLES[l] ? l : 'en';
  }

  // Découpe d'un mot en caractères affichables (les voyelles et tons thaïs restent
  // attachés à leur consonne). Sans Intl.Segmenter, un mot thaï s'anime d'un bloc.
  function pieces(word, lang) {
    try {
      if (window.Intl && Intl.Segmenter) {
        return Array.from(new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(word), function (s) { return s.segment; });
      }
    } catch (e) {}
    return lang === 'th' ? [word] : word.split('');
  }

  function buildTitle(lang) {
    var wrap = doc.createElement('div');
    wrap.className = 'tf-ctitle';
    wrap.setAttribute('aria-hidden', 'true');
    var eb = doc.createElement('div');
    eb.className = 'tf-ctitle-eb';
    eb.textContent = 'Terra & Form';
    var h = doc.createElement('div');
    h.className = 'tf-ctitle-h';
    h.lang = lang;
    var chars = [];
    TITLES[lang].forEach(function (w, i) {
      if (i && lang !== 'th') h.appendChild(doc.createTextNode(' '));
      var word = doc.createElement(w[1] ? 'em' : 'span');
      word.className = 'tf-ctitle-w';
      pieces(w[0], lang).forEach(function (p) {
        var s = doc.createElement('span');
        s.textContent = p;
        word.appendChild(s);
        chars.push(s);
      });
      h.appendChild(word);
    });
    wrap.appendChild(eb);
    wrap.appendChild(h);
    return { el: wrap, eb: eb, chars: chars };
  }

  // ============================================================
  // 1) LANDING
  // ============================================================
  function initLanding(btn, hero) {
    var href = btn.href;
    if (!/\/services\/?(\?|#|$)/.test(href)) return;

    var lang = langOf(href);
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

    // Polices de la page Services (header, contenu) et du titre du rideau :
    // chargées à l'avance pour que tout s'affiche directement dans sa vraie police.
    var PAGE_FONTS = ['700 17px "Archivo Expanded"', '400 12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"',
      '600 12px "IBM Plex Mono"', '700 12px "IBM Plex Mono"', '300 16px "Fraunces"', '400 16px "Fraunces"'];
    if (root.lang === 'th' || lang === 'th') PAGE_FONTS.push('400 16px "Noto Serif Thai"', '500 12px "IBM Plex Sans Thai"', '700 12px "IBM Plex Sans Thai"');
    var SAMPLE = TITLES[lang].map(function (w) { return w[0]; }).join(' ') + ' Terra & Form';
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
      try { run(); } catch (err) { arriveMode = 'c'; go(); }
    });

    var arriveMode = 'c'; // 's' : contenu déjà affiché par la transition ; 'c' : cascade à l'arrivée
    function go() {
      try { sessionStorage.setItem(ARRIVE_KEY, arriveMode + ':' + Date.now()); } catch (e) {}
      if (window.__tfHoldTransition) return; // crochet de test
      window.location.assign(href);
    }

    function run() {
      warm();
      root.classList.add('tf-busy');
      var t0 = performance.now();
      function since() { return performance.now() - t0; }
      var H = window.innerHeight;
      var CV = Math.round(Math.min(170, H * 0.19)); // hauteur de la courbe du rideau
      var anims = [], layers = [];
      function A(node, kf, o) {
        var a = node.animate(kf, Object.assign({ fill: 'both' }, o));
        anims.push(a);
        return a;
      }
      function layer(cls, css) {
        var e = doc.createElement('div');
        e.className = cls;
        e.setAttribute('aria-hidden', 'true');
        if (css) e.style.cssText = css;
        doc.body.appendChild(e);
        layers.push(e);
        return e;
      }
      cleanup.push(function () {
        anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        layers.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
      });

      // --- 1) La landing s'assombrit et remonte légèrement sous le rideau ---
      var dim = layer('tf-dim');
      A(dim, [{ opacity: 0 }, { opacity: 0.6 }], { duration: RISE + LAG, easing: E_IN });
      A(shell, [{ transform: 'translateY(0)' }, { transform: 'translateY(-90px)' }], { duration: RISE + LAG, easing: E_IN });

      // --- 2) Les deux rideaux montent : terracotta, puis encre ---
      var clay = layer('tf-curtain tf-curtain--clay', 'height:' + (H + CV) + 'px;');
      var ink = layer('tf-curtain tf-curtain--ink', 'height:' + (H + CV) + 'px;');
      function rise(c, delay) {
        return A(c, [
          { transform: 'translateY(' + (H + 10) + 'px)', borderRadius: '50% 50% 0 0 / ' + CV + 'px ' + CV + 'px 0 0' },
          { transform: 'translateY(0px)', borderRadius: '50% 50% 0 0 / 0px 0px 0 0' }
        ], { duration: RISE, delay: delay, easing: E_IN });
      }
      rise(clay, 0);
      var inkUp = rise(ink, LAG);

      // --- 3) Le titre de la page d'arrivée, dans sa langue ---
      var title = null;
      fontsReady(400).then(function () {
        if (!busy) return;
        title = buildTitle(lang);
        doc.body.appendChild(title.el);
        layers.push(title.el);
        title.chars.forEach(function (s, k) {
          A(s, [{ transform: 'translateY(135%)' }, { transform: 'translateY(0)' }],
            { duration: 600, delay: Math.max(0, 470 + k * 24 - since()), easing: E_OUT });
        });
        A(title.eb, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 500, delay: Math.max(0, 520 - since()), easing: E_OUT });
      });

      // --- 4) Derrière le rideau fermé : la page Services, à sa place exacte ---
      var sectionReady = Promise.race([warm(), wait(DEADLINE - 600 - since())]);
      Promise.all([inkUp.finished, sectionReady]).then(function () {
        if (!busy) return;
        if (!svcSectionHTML) { arriveMode = 'c'; go(); return; } // repli : la page Services fera sa propre entrée
        var s = placeServices();
        layers.splice(layers.indexOf(dim), 1);
        if (dim.parentNode) dim.parentNode.removeChild(dim);
        var bannerImg = s.section.querySelector('#services-banner-img');
        var ready = Promise.all([
          fontsReady(DEADLINE),
          bannerImg && bannerImg.decode ? bannerImg.decode().catch(function () {}) : Promise.resolve()
        ]);
        return Promise.race([ready, wait(DEADLINE - since())]).then(function () {
          if (busy) open(s, bannerImg);
        });
      }).catch(function () { if (busy) { arriveMode = 'c'; go(); } });

      function placeServices() {
        var header = doc.getElementById('siteGlobalHeader');
        var main = doc.getElementById('siteMain');
        var pageIndex = doc.getElementById('page-index');
        var vw = root.clientWidth;
        var hasScrollbar = window.innerWidth - root.clientWidth > 0;
        var W1 = hasScrollbar ? vw : vw - scrollbarWidth(); // largeur utile de la page Services

        header.classList.remove('is-hidden-landing');
        header.style.width = W1 < vw ? W1 + 'px' : '';
        shell.style.visibility = 'hidden';
        var holder = doc.createElement('div');
        holder.innerHTML = svcSectionHTML;
        var section = holder.firstElementChild;
        section.style.animation = 'none';
        section.setAttribute('aria-hidden', 'true');
        root.style.overflow = 'hidden';
        if (pageIndex) pageIndex.style.display = 'contents';
        main.style.width = W1 < vw ? W1 + 'px' : '';
        main.appendChild(section);
        cleanup.push(function () {
          if (section.parentNode) section.parentNode.removeChild(section);
          if (pageIndex) pageIndex.style.display = '';
          main.style.width = '';
          main.style.removeProperty('--tf-d0');
          main.classList.remove('tf-cascade');
          root.style.overflow = '';
          shell.style.visibility = '';
          header.classList.add('is-hidden-landing');
          header.style.width = '';
        });
        return { main: main, section: section };
      }

      // --- 5) Le rideau se retire vers le haut, le contenu entre en cascade ---
      function open(s, bannerImg) {
        var d = Math.max(0, HOLD - since());
        var site = doc.getElementById('site') || s.main;
        s.main.style.setProperty('--tf-d0', (d / 1000 + 0.1).toFixed(3) + 's');
        s.main.classList.add('tf-cascade');
        A(site, [{ transform: 'translateY(120px)' }, { transform: 'translateY(0)' }],
          { duration: 900, delay: d + 60, easing: E_OUT, fill: 'backwards' });
        if (bannerImg) A(bannerImg, [{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }],
          { duration: 1400, delay: d, easing: E_OUT, fill: 'backwards' });
        if (title) A(title.el, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-160px)' }],
          { duration: 380, delay: d + 20, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
        var H2 = H + CV;
        function leave(c, delay) {
          return A(c, [
            { transform: 'translateY(0px)', borderRadius: '0 0 50% 50% / 0 0 0px 0px' },
            { transform: 'translateY(' + (-H2 - 20) + 'px)', borderRadius: '0 0 50% 50% / 0 0 ' + CV + 'px ' + CV + 'px' }
          ], { duration: EXIT, delay: delay, easing: E_EXIT, fill: 'forwards' });
        }
        leave(ink, d);
        leave(clay, d + EXIT_LAG);
        arriveMode = 's';
        // La cascade est terminée avant d'ouvrir la vraie page (même état visuel)
        timers.push(setTimeout(go, d + 1500));
      }
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
