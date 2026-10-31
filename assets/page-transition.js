/* ============================================================
   Terra & Form — Transition « landing → page Services »

   Esprit Framer Motion (élément partagé + ressorts physiques), sans
   librairie : Web Animations API + courbes linear() calculées à partir
   d'un vrai ressort (même technique que Motion pour ses ressorts
   accélérés par le GPU).

   Côté landing  : au clic sur « Entrer sur le site », le panneau
   s'efface, la photo se rétracte en ressort jusqu'à l'emplacement exact
   de la bannière Services, le logo glisse jusqu'à sa place dans le header,
   puis la page Services s'ouvre dans le même état visuel.
   Côté Services : le contenu entre en cascade (voir page-transition.css).

   Désactivé si l'utilisateur a demandé moins d'animations, si le
   navigateur ne gère pas les animations Web, ou pour un clic modifié
   (Ctrl/Cmd/Maj, clic molette) : le lien fonctionne alors normalement.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var ARRIVE_KEY = 'tfArrive';      // drapeau lu par le <head> de la page Services
  var GEOM_KEY = 'tfSvcBanner';     // géométrie réelle de la bannière (mise en cache)
  var EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  var scriptSrc = (doc.currentScript && doc.currentScript.src) || '';
  var assetBase = scriptSrc ? scriptSrc.replace(/[^\/]*$/, '') : '/assets/';

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ---------- Ressort physique -> easing linear() ----------
  var supportsLinear = !!(window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)'));
  function spring(stiffness, damping) {
    var x = 0, v = 0, t = 0, dt = 1 / 600, samples = [0];
    while (t < 2) {
      var a = -stiffness * (x - 1) - damping * v;
      v += a * dt; x += v * dt; t += dt;
      samples.push(x);
      if (t > 0.25 && Math.abs(x - 1) < 0.0015 && Math.abs(v) < 0.015) break;
    }
    var duration = Math.round(t * 1000);
    if (!supportsLinear) return { easing: EASE_OUT, duration: Math.max(duration, 750) };
    var n = 56, pts = [];
    for (var i = 0; i <= n; i++) {
      var val = i === 0 ? 0 : i === n ? 1 : samples[Math.round(i / n * (samples.length - 1))];
      pts.push(+val.toFixed(4));
    }
    return { easing: 'linear(' + pts.join(', ') + ')', duration: duration };
  }

  function readGeom() {
    try {
      var g = JSON.parse(localStorage.getItem(GEOM_KEY) || 'null');
      if (g && isFinite(g.off) && isFinite(g.h) && g.h > 100 && g.h < 1200) return g;
    } catch (e) {}
    return { off: -90, h: 390 }; // valeurs actuelles du CSS (bannière Services)
  }

  function cssUrl(value) {
    var m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(value || '');
    return m ? m[1] : '';
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

  // ============================================================
  // 1) LANDING
  // ============================================================
  function initLanding(btn, hero) {
    var href = btn.href;
    if (!/\/services\/?(\?|#|$)/.test(href)) return;

    var busy = false, warmed = false, running = [], cleanup = [];
    var bannerSources = null; // [{media, src}] lus dans la page Services
    var bannerImgs = {};      // préchargements par URL
    var landingMobileImg = null;

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
      }).catch(function () {});
    }

    // Photo de la landing en version mobile (fond CSS) : on récupère ses dimensions
    function prepareMobilePhoto() {
      var src = cssUrl(getComputedStyle(hero, '::before').backgroundImage);
      if (src && (!landingMobileImg || landingMobileImg.src !== src)) landingMobileImg = loadImage(src);
    }

    // Polices du header (masqué sur la landing) : on les charge à l'avance pour
    // que le logo et le menu soient mesurés et affichés dans leur vraie police.
    var HEADER_FONTS = ['700 17px "Archivo Expanded"', '400 12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"', '700 12px "IBM Plex Mono"'];
    if (doc.documentElement.lang === 'th') HEADER_FONTS.push('500 12px "IBM Plex Sans Thai"');
    function loadHeaderFonts() {
      if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
      return Promise.all(HEADER_FONTS.map(function (f) { return doc.fonts.load(f); }));
    }
    function headerFontsReady() {
      var wait = new Promise(function (res) { setTimeout(res, 450); });
      return Promise.race([loadHeaderFonts(), wait]).catch(function () {});
    }

    window.addEventListener('load', function () {
      prepareMobilePhoto();
      loadHeaderFonts().catch(function () {});
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
      headerFontsReady().then(function () {
        try { run(); } catch (err) { go(); }
      });
    });

    function go() {
      try { sessionStorage.setItem(ARRIVE_KEY, String(Date.now())); } catch (e) {}
      if (window.__tfHoldTransition) return; // crochet de test
      window.location.assign(href);
    }

    function track(anim) { running.push(anim); return anim; }

    function run() {
      warm();
      prepareMobilePhoto();
      root.classList.add('tf-busy');

      var shell = hero.closest('.ll-shell') || hero.parentNode;
      var header = doc.getElementById('siteGlobalHeader');
      var heroR = hero.getBoundingClientRect();
      var vw = root.clientWidth;
      var hasScrollbar = window.innerWidth - root.clientWidth > 0;
      var W1 = hasScrollbar ? vw : vw - scrollbarWidth(); // largeur utile de la page Services
      var geom = readGeom();

      // --- Header réel du site : on le révèle (hors écran), on le mesure ---
      header.classList.remove('is-hidden-landing');
      header.style.width = W1 < vw ? W1 + 'px' : '';
      var logo = header.querySelector('.logo');
      var hH = header.getBoundingClientRect().height;
      var logoMark = logo.querySelector('.mark');
      var logoWord = logo.querySelector('.word');
      var markR = logoMark ? logoMark.getBoundingClientRect() : null;
      var wordR = logoWord ? logoWord.getBoundingClientRect() : null;
      logo.style.opacity = '0';
      cleanup.push(function () {
        header.classList.add('is-hidden-landing');
        header.style.width = '';
        logo.style.opacity = '';
      });

      // Géométrie finale = bannière de la page Services
      var bTop = hH + geom.off;          // haut de l'image (en partie sous le header)
      var bH = geom.h;
      var winBottom = bTop + bH;         // bas de la fenêtre visible
      // La bannière est centrée sur 100vw (margin-left: calc(-50vw + 50%)) :
      // avec une barre de défilement classique, elle est décalée d'une demi-barre.
      var bX = (W1 - window.innerWidth) / 2;

      // --- Photo de la landing (desktop : <img> ; mobile : fond CSS) ---
      var visual = hero.querySelector('.ll-hero2-visual');
      var vImg = visual && visual.querySelector('img');
      var useImg = visual && vImg && getComputedStyle(visual).display !== 'none' &&
        vImg.currentSrc && vImg.currentSrc.indexOf('data:') !== 0;
      var photo;
      if (useImg) {
        photo = {
          src: vImg.currentSrc,
          w: vImg.naturalWidth || +vImg.getAttribute('width') || 1920,
          h: vImg.naturalHeight || +vImg.getAttribute('height') || 1080,
          rect: visual.getBoundingClientRect(),
          filter: getComputedStyle(vImg).filter,
          shade: getComputedStyle(visual, '::after').backgroundImage
        };
      } else {
        var mSrc = cssUrl(getComputedStyle(hero, '::before').backgroundImage);
        if (!mSrc) { go(); return; }
        var known = !!(landingMobileImg && landingMobileImg.naturalWidth);
        photo = {
          src: mSrc,
          w: known ? landingMobileImg.naturalWidth : heroR.width,
          h: known ? landingMobileImg.naturalHeight : heroR.height,
          rect: heroR,
          filter: 'none',
          shade: getComputedStyle(hero, '::after').backgroundImage,
          fit: !known
        };
      }

      // Rectangle « cover » d'une image (w×h) dans une boîte
      function cover(iw, ih, bx, by, bw, bh) {
        var s = Math.max(bw / iw, bh / ih);
        return { x: bx + (bw - iw * s) / 2, y: by + (bh - ih * s) / 2, w: iw * s, h: ih * s };
      }
      var r = photo.rect;
      var from = cover(photo.w, photo.h, r.left - heroR.left, r.top - heroR.top, r.width, r.height);
      var to = cover(photo.w, photo.h, bX - heroR.left, bTop - heroR.top, W1, bH);
      var k = to.w / from.w;
      var dx = (to.x + to.w / 2) - (from.x + from.w / 2);
      var dy = (to.y + to.h / 2) - (from.y + from.h / 2);

      var morph = doc.createElement('div');
      morph.className = 'tf-morph';
      morph.setAttribute('aria-hidden', 'true');
      var mImg = doc.createElement('div');
      mImg.className = 'tf-morph-img';
      mImg.style.cssText = 'left:' + from.x + 'px;top:' + from.y + 'px;width:' + from.w + 'px;height:' + from.h +
        'px;background-image:url("' + photo.src + '");filter:' + (photo.filter || 'none') + ';' +
        (photo.fit ? 'background-size:cover;background-position:center;' : '');
      var mShade = doc.createElement('div');
      mShade.className = 'tf-morph-shade';
      if (photo.shade && photo.shade !== 'none') mShade.style.backgroundImage = photo.shade;

      // Image de la bannière Services, à sa position exacte (fondu en fin de course)
      var banner = preloadBanner();
      var mNext = doc.createElement('div');
      mNext.className = 'tf-morph-next';
      var nb = banner.naturalWidth
        ? cover(banner.naturalWidth, banner.naturalHeight, bX - heroR.left, bTop - heroR.top, W1, bH)
        : { x: bX - heroR.left, y: bTop - heroR.top, w: W1, h: bH };
      mNext.style.cssText = 'left:' + nb.x + 'px;top:' + nb.y + 'px;width:' + nb.w + 'px;height:' + nb.h +
        'px;background-image:url("' + banner.src + '");' + (banner.naturalWidth ? '' : 'background-size:cover;background-position:center;');

      morph.appendChild(mImg);
      morph.appendChild(mNext);
      morph.appendChild(mShade);
      hero.appendChild(morph);
      hero.classList.add('tf-morphing');
      cleanup.push(function () {
        if (morph.parentNode) morph.parentNode.removeChild(morph);
        hero.classList.remove('tf-morphing');
      });

      // --- Logo : le symbole et le logotype de la landing volent chacun
      //     jusqu'à leur équivalent exact dans le header ---
      var P = spring(85, 14);    // photo : ressort souple, léger rebond
      var L = spring(150, 19);   // logo  : un peu plus vif
      var brand = hero.querySelector('.ll-hero2-brand');
      var flyers = [], flyAnims = [];
      if (brand) {
        [
          [brand.querySelector('.ll-hero2-brand-mark'), markR, 'fit', 70],
          [brand.querySelector('.ll-hero2-brand-word-img'), wordR, 'width', 110]
        ].forEach(function (pair) {
          var src = pair[0], dst = pair[1];
          if (!src || !dst || !dst.width) return;
          var sr = src.getBoundingClientRect();
          if (!sr.width || !sr.height) return;
          var s = pair[2] === 'fit' ? Math.min(dst.width / sr.width, dst.height / sr.height) : dst.width / sr.width;
          var tx = (dst.left + dst.width / 2 - s * sr.width / 2) - sr.left;
          var ty = (dst.top + dst.height / 2 - s * sr.height / 2) - sr.top;
          var f = src.cloneNode(true);
          f.removeAttribute('id');
          f.setAttribute('alt', '');
          f.setAttribute('aria-hidden', 'true');
          f.classList.add('tf-fly');
          f.style.left = sr.left + 'px';
          f.style.top = sr.top + 'px';
          f.style.width = sr.width + 'px';
          f.style.height = sr.height + 'px';
          doc.body.appendChild(f);
          flyers.push(f);
          flyAnims.push(track(f.animate(
            [{ transform: 'translate(0px, 0px) scale(1)' }, { transform: 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')' }],
            { duration: L.duration, delay: pair[3], easing: L.easing, fill: 'forwards' }
          )));
        });
        brand.style.visibility = 'hidden';
        cleanup.push(function () {
          flyers.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
          flyers = [];
          brand.style.visibility = '';
        });
      }

      // --- Chorégraphie ---
      var panel = hero.querySelector('.ll-hero2-panel');
      if (panel) {
        // Du bas vers le haut : ce que la photo découvre en premier s'efface en premier
        var bits = panel.querySelectorAll('.ll-hero2-copy > *, .ll-hero2-bottom, .ll-hero2-follow');
        Array.prototype.forEach.call(bits, function (el, i) {
          track(el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }],
            { duration: 200, delay: (bits.length - 1 - i) * 25, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
        });
        track(panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-36px)' }],
          { duration: 340, delay: 60, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }));
      }
      Array.prototype.forEach.call(doc.querySelectorAll('.ll-hero2-langbar, .ll-grain'), function (el) {
        track(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }));
      });

      var paper = (getComputedStyle(root).getPropertyValue('--paper') || '').trim() || '#F7F4EC';
      track(shell.animate([{ backgroundColor: getComputedStyle(shell).backgroundColor }, { backgroundColor: paper }],
        { duration: 160, easing: 'ease-out', fill: 'forwards' }));

      var right = Math.max(0, heroR.width - (bX + W1 - heroR.left));
      var bottom = Math.max(0, heroR.height - (winBottom - heroR.top));
      var photoOpts = { duration: P.duration, delay: 110, easing: P.easing, fill: 'forwards' };
      var photoAnim = track(morph.animate(
        [{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: 'inset(0px ' + right + 'px ' + bottom + 'px 0px)' }], photoOpts));
      track(mImg.animate(
        [{ transform: 'translate(0px, 0px) scale(1)' }, { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + k + ')' }], photoOpts));
      track(mShade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, delay: 110, easing: 'ease-out', fill: 'forwards' }));
      track(mNext.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: Math.round(P.duration * 0.5), delay: 110 + Math.round(P.duration * 0.4), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }));

      track(header.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }],
        { duration: 640, delay: 150, easing: EASE_OUT, fill: 'both' }));
      var navBits = header.querySelectorAll('.nav-links li, .bar-right > *');
      Array.prototype.forEach.call(navBits, function (el, i) {
        track(el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 460, delay: 360 + i * 35, easing: EASE_OUT, fill: 'both' }));
      });

      // Le logo volant se fond dans le vrai logo du header
      var logoDone = Promise.all(flyAnims.map(function (a) { return a.finished; })).then(function () {
        var fades = flyers.map(function (f) {
          return track(f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' })).finished;
        });
        fades.push(track(logo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out', fill: 'forwards' })).finished);
        return Promise.all(fades);
      });

      var bannerReady = (banner.decode ? banner.decode() : Promise.resolve()).catch(function () {});
      var guard = new Promise(function (res) { setTimeout(res, 2600); });
      Promise.race([
        Promise.all([photoAnim.finished, logoDone, Promise.race([bannerReady, new Promise(function (res) {
          setTimeout(res, P.duration + 450);
        })])]),
        guard
      ]).then(go, go);
    }

    // Retour arrière (cache bfcache) : la landing doit retrouver son état initial
    function reset() {
      running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      running = [];
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
      setTimeout(function () { root.classList.remove('tf-arrive'); }, 2400);
    }
  }

  var btn = doc.getElementById('llDiscoverBtn');
  var hero = doc.getElementById('llHero');
  if (btn && hero) initLanding(btn, hero);

  var svc = doc.getElementById('page-services');
  if (svc) initServices(svc);
})();
