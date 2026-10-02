/* =====================================================================
   Terra & Form — « La Galerie » (version épurée) : exposition 3D
   parcourue au défilement (page Studio, section Projets)
   ---------------------------------------------------------------------
   - Le logo Terra & Form apparaît au premier plan dans un léger éclat.
   - Au défilement, la caméra glisse de gauche à droite le long du mur,
     à distance constante : ni zoom, ni avancée en profondeur, ni rotation.
   - Les photos s'allument doucement, comme sous un projecteur ; le parcours
     se termine sur le logo et l'invitation à prendre contact.
   ---------------------------------------------------------------------
   - Amélioration progressive : le carrousel HTML d'origine reste dans la
     page (liens explorables par Google / moteurs IA, lecteurs d'écran).
   - three.js (auto-hébergé : assets/vendor/three.min.js) est chargé
     après le chargement de la page, sans bloquer l'affichage.
   - Repli automatique sur le carrousel classique si WebGL est absent,
     si le visiteur préfère réduire les animations ou en cas d'erreur.
   ===================================================================== */
(function () {
  'use strict';

  var section = document.querySelector('.proj-showcase');
  if (!section) return;
  var mosaic = section.querySelector('#projMosaic');
  var carousel = section.querySelector('.proj-carousel');
  if (!mosaic || !carousel) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  (function () { // WebGL disponible ?
    try { var c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw 0; }
    catch (e) { section = null; }
  })();
  if (!section) return;

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  var THREE_URL = SCRIPT_SRC ? SCRIPT_SRC.replace(/proj-gallery-s\.js(\?.*)?$/, 'vendor/three.min.js') : 'vendor/three.min.js';

  /* ---------- Textes ---------- */
  var lang = (document.documentElement.getAttribute('lang') || 'fr').slice(0, 2).toLowerCase();
  var I18N = {
    fr: { eyebrow: 'Galerie · Projets', enter: 'Faites défiler vers le bas<br class="pg-br"> pour entrer', outro: 'Le prochain lieu<br>sera <em>le vôtre</em>.', skip: 'Passer la galerie',
          open: 'Entrer', see: 'Voir le projet', closer: 'Approcher', back: 'Reculer', label: 'Galerie des projets' },
    en: { eyebrow: 'Gallery · Projects', enter: 'Scroll down to enter', outro: 'The next place<br>could be <em>yours</em>.', skip: 'Skip the gallery',
          open: 'Enter', see: 'View project', closer: 'Look closer', back: 'Step back', label: 'Project gallery' },
    th: { eyebrow: 'แกลเลอรี · โครงการ', enter: 'เลื่อนลงเพื่อเข้าชม', outro: 'สถานที่ถัดไป<br>อาจเป็น<em>ของคุณ</em>', skip: 'ข้ามแกลเลอรี',
          open: 'เข้าชม', see: 'ดูโครงการ', closer: 'ดูใกล้ขึ้น', back: 'ถอยกลับ', label: 'แกลเลอรีโครงการ' }
  };
  var T = I18N[lang] || I18N.fr;

  /* ---------- Projets lus depuis le HTML ---------- */
  var items = [].slice.call(mosaic.querySelectorAll('.proj-mosaic-item')).map(function (el) {
    var a = el.querySelector('a[href]'), img = el.querySelector('img');
    if (!img || !img.getAttribute('src')) return null;
    var alt = img.getAttribute('alt') || '';
    var title = (a && a.getAttribute('aria-label')) || alt.split(/\s[—–-]\s/)[0] || '';
    var loc = el.querySelector('.proj-mosaic-loc');
    return { href: a ? a.href : null, src: img.src, title: title.trim(), cat: loc ? loc.textContent.replace(/\s+/g, ' ').trim() : '' };
  }).filter(Boolean);
  var N = items.length;
  if (N < 2) return;

  /* ---------- Structure DOM ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var head = section.querySelector('.proj-showcase-head');
  var h2 = head && head.querySelector('h2');
  var cta = head && head.querySelector('.proj-showcase-link');

  var pg = document.createElement('div');
  pg.className = 'pg';
  pg.setAttribute('role', 'region');
  pg.setAttribute('aria-label', T.label);
  var rail = '';
  for (var r = 0; r < N; r++) rail += '<button type="button" class="pg-tick" data-i="' + r + '" aria-label="' + esc(items[r].title) + '"><span>' + pad(r + 1) + '</span></button>';
  pg.innerHTML =
    '<div class="pg-sticky">' +
      '<div class="pg-mount"></div>' +
      '<div class="pg-vignette" aria-hidden="true"></div>' +
      '<div class="pg-intro">' +
        '<div class="pg-intro-text" aria-hidden="true"><p class="pg-eyebrow">' + T.eyebrow + '</p>' +
        '<p class="pg-intro-title">' + (h2 ? h2.innerHTML : '') + '</p></div>' +
        '<button type="button" class="pg-enter"><span class="pg-enter-ico" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M6 13l6 6 6-6"/></svg>' +
        '</span><span class="pg-enter-t">' + T.enter + '</span></button>' +
      '</div>' +
      '<div class="pg-card">' +
        '<p class="pg-num"><span class="pg-num-mask"><span class="pg-num-cur">01</span></span><span class="pg-num-tot">/ ' + pad(N) + '</span></p>' +
        '<p class="pg-cat"><span class="pg-cat-line" aria-hidden="true"></span><span class="pg-cat-t"></span></p>' +
        '<p class="pg-title" aria-live="polite"></p>' +   // nom du projet : lu par les lecteurs d'écran, non affiché
      '</div>' +
      '<div class="pg-outro"><p class="pg-outro-title">' + T.outro + '</p></div>' +
      '<nav class="pg-rail" aria-label="' + T.label + '"><span class="pg-rail-line"><i></i></span>' + rail + '</nav>' +
      '<button type="button" class="pg-skip">' + T.skip + ' <span aria-hidden="true">↓</span></button>' +
      '<div class="pg-veil" aria-hidden="true"></div>' +
      '<div class="pg-loader" aria-hidden="true"><span></span></div>' +
    '</div>';
  if (cta) {
    var ctaClone = cta.cloneNode(true);
    ctaClone.removeAttribute('data-t');
    ctaClone.classList.add('pg-cta');
    pg.querySelector('.pg-outro').appendChild(ctaClone);
  }
  var $ = function (s) { return pg.querySelector(s); };
  var elSticky = $('.pg-sticky'), elMount = $('.pg-mount'), elIntro = $('.pg-intro'), elCard = $('.pg-card'),
      elTitle = $('.pg-title'), elCat = $('.pg-cat-t'), elNum = $('.pg-num-cur'),
      elOutro = $('.pg-outro'), elRailFill = $('.pg-rail-line i'), elVeil = $('.pg-veil'),
      ticks = [].slice.call(pg.querySelectorAll('.pg-tick'));

  var SEG_VH = 1.25; // hauteur de défilement par étape (en hauteurs d'écran)
  function sizeSection() { pg.style.height = Math.round((N + 1) * SEG_VH * window.innerHeight + window.innerHeight) + 'px'; }

  var dead = false, mounted = false, onMount = null;
  function mount() {
    if (mounted || dead) return;
    mounted = true;
    carousel.parentNode.insertBefore(pg, carousel);
    section.classList.add('pg-on');
    sizeSection();
    if (onMount) onMount();
  }
  // Feuille de style dédiée, chargée avant l'insertion (pas de flash de contenu non stylé)
  if (document.querySelector('style[data-pg], link[data-pg]')) mount();
  else {
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.setAttribute('data-pg', '');
    css.href = SCRIPT_SRC ? SCRIPT_SRC.replace(/proj-gallery-s\.js(\?.*)?$/, 'proj-gallery-s.css') : 'proj-gallery-s.css';
    css.onload = mount;
    css.onerror = function () { dead = true; };
    document.head.appendChild(css);
  }

  function fallback() {
    if (dead) return;
    dead = true;
    if (pg.parentNode) pg.parentNode.removeChild(pg);
    section.classList.remove('pg-on');
  }

  /* ---------- Chargement de three.js (après la page) ---------- */
  function loadThree(cb) {
    if (window.THREE) return cb();
    var s = document.createElement('script');
    s.src = THREE_URL; s.async = true;
    s.onload = function () { window.THREE ? cb() : fallback(); };
    s.onerror = fallback;
    document.head.appendChild(s);
  }
  function boot() {
    loadThree(function () {
      var go = function () { try { init(); } catch (e) { if (window.console) console.error(e); fallback(); } };
      if (mounted) go(); else onMount = go;
    });
  }
  if (document.readyState === 'complete') setTimeout(boot, 50);
  else window.addEventListener('load', function () { setTimeout(boot, 50); });

  /* =================================================================== */
  function init() {
    var THREE = window.THREE;
    var mobile = window.innerWidth < 760;
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.setClearColor(0x0f0c09, 1);
    elMount.appendChild(renderer.domElement);
    renderer.domElement.className = 'pg-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback(); });

    var scene = new THREE.Scene();
    var FOG = new THREE.Color(0x0f0c09), FOG_D = 0.045;
    // décentrement vertical (comme un objectif à bascule d'architecte) : l'image monte un peu,
    // les verticales restent droites et les textes du bas respirent
    var SHIFT = 0.07;
    scene.fog = new THREE.FogExp2(FOG, FOG_D);
    var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 140);

    /* ----- Mise en page : la caméra glisse de gauche à droite, toujours à la même distance du mur ----- */
    var aspect0 = Math.max(0.3, elSticky.clientWidth / Math.max(1, elSticky.clientHeight));
    var tanV = Math.tan(23 * Math.PI / 180), tanH = tanV * aspect0;
    var FW = mobile ? 2.3 : 2.9, FH = FW / 1.42, Y_C = 1.75;      // œuvres centrées à hauteur des yeux
    var D = Math.max(4.6, FW / ((aspect0 < 1 ? 0.72 : 0.44) * 2 * tanH));   // l'œuvre occupe ~44 % (72 % sur mobile) de la largeur
    var halfW = tanH * D;                                           // demi-largeur visible sur le mur
    var GAP_X = FW * (aspect0 < 1 ? 1.12 : 1.5);                    // les œuvres voisines dépassent légèrement des bords
    var frames = [], photos = [];

    /* ----- Photos : rendu net, sans déformation ----- */
    var VS = 'varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }';
    var FS = [
      'uniform sampler2D uTex; uniform vec2 uImg; uniform vec2 uSize; uniform float uFocus; uniform float uOn; uniform float uOpacity;',
      'uniform vec3 uFogColor; uniform float uFogDensity;',
      'varying vec2 vUv; varying float vDepth;',
      'void main(){',
      '  float A = uSize.x / uSize.y, I = uImg.x / uImg.y;',
      '  vec2 sc = vec2(min(A / I, 1.0), min(I / A, 1.0));',
      '  vec2 t = (vUv - 0.5) / (1.015 + 0.035 * (1.0 - uOn)) * sc + 0.5;',   // l'image se pose très légèrement
      '  vec3 col = texture2D(uTex, t).rgb;',
      '  float g = dot(col, vec3(0.299, 0.587, 0.114));',
      '  col = mix(vec3(g) * vec3(1.03, 0.98, 0.92), col, 0.5 + 0.5 * uFocus);',
      '  col *= 0.72 + 0.28 * uFocus;',
      '  vec2 q = vUv - 0.5; col *= 1.0 - dot(q, q) * 0.3;',
      '  col = mix(vec3(0.05, 0.043, 0.036), col, uOn);',                    // le projecteur s'allume
      '  float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);',
      '  gl_FragColor = vec4(mix(col, uFogColor, clamp(f, 0.0, 1.0)), uOpacity);',
      '}'
    ].join('\n');

    function radialTex(inner, outer) {
      var cv = document.createElement('canvas'); cv.width = cv.height = 128;
      var cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, inner); gr.addColorStop(1, outer);
      cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    }
    var warmPool = radialTex('rgba(255,214,170,0.55)', 'rgba(255,214,170,0)');
    function coneMaterial() {
      return new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(0xffd2a0) }, uStrength: { value: 0 } },
        vertexShader: 'varying float vY; varying float vF; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying float vY; varying float vF; void main(){ float a = pow(vY, 1.6) * pow(vF, 2.2) * uStrength; gl_FragColor = vec4(uColor * a, a); }'
      });
    }

    /* ----- Logo Terra & Form au premier plan, posé devant le début du mur ----- */
    // Proportions identiques au logo du site (SVG 90 × 62 : cercle r29, carré 46)
    var U = 0.05, LOGO_Z = 0.35, START_D = D - LOGO_Z;
    var ringR = 29 * U, ringX = (34 - 45) * U, sqS = 46 * U, sqX = (65 - 45) * U, TH = 0.06;
    var WORD_Y = -(ringR + 0.68), WORD_W = 4.4, WORD_H = WORD_W * 0.12;
    var COMP_H = ringR + (-WORD_Y + WORD_H / 2), COMP_CY = (ringR + WORD_Y - WORD_H / 2) / 2;
    var visH = 2 * tanV * START_D, visW = visH * aspect0;
    // le logo occupe le cadre sans le saturer, ni toucher l'en-tête ni le texte du bas
    var stH = Math.max(1, elSticky.clientHeight), introTop = elIntro.getBoundingClientRect().top - elSticky.getBoundingClientRect().top;
    var fracMax = Math.min(aspect0 < 1.45 ? 0.5 : 0.56, 2 * ((introTop - 22) / stH - (0.5 - SHIFT)), 2 * ((0.5 - SHIFT) - 84 / stH));
    var LS = Math.min(Math.max(0.3, fracMax) * visH / COMP_H, 0.78 * visW / WORD_W);
    var LOGO_Y = Y_C - COMP_CY * LS;                                 // logo + nom centrés à hauteur des yeux
    function flat(color) { return new THREE.MeshBasicMaterial({ color: color, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }); }
    // Nom « TERRA & FORM » sous le monogramme (même typographie que l'en-tête)
    var wcv = document.createElement('canvas'); wcv.width = 2048; wcv.height = Math.round(2048 * 0.12);
    (function (cx) {
      var txt = 'TERRA & FORM', fs = 150, sp = fs * 0.2;
      cx.font = '700 ' + fs + "px 'Archivo Expanded', 'Archivo', 'Helvetica Neue', Arial, sans-serif";
      cx.textBaseline = 'middle';
      var w = 0, ws = [];
      for (var c = 0; c < txt.length; c++) { ws[c] = cx.measureText(txt[c]).width; w += ws[c] + (c < txt.length - 1 ? sp : 0); }
      var k = Math.min(1, (wcv.width - 40) / w);
      cx.setTransform(k, 0, 0, 1, wcv.width / 2 - w * k / 2, wcv.height / 2 + 6);
      var x = 0;
      for (c = 0; c < txt.length; c++) { cx.fillStyle = txt[c] === '&' ? '#E35336' : '#F3ECDD'; cx.fillText(txt[c], x, 0); x += ws[c] + sp; }
    })(wcv.getContext('2d'));
    var wordTex = new THREE.CanvasTexture(wcv);
    wordTex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    var wordGeo = new THREE.PlaneGeometry(WORD_W, WORD_H);
    var markCX = ((ringX - ringR) + (sqX + sqS / 2)) / 2;

    // Construit un logo complet (cercle, carré, nom), dessiné ensuite trait par trait
    function buildLogo() {
      var g = new THREE.Group(), rm = flat(0xf3ecdd), sm = flat(0xe35336);
      var r = new THREE.Mesh(new THREE.RingGeometry(ringR - TH, ringR + TH, 180, 1, Math.PI / 2, 0.0001), rm);
      r.position.x = ringX; g.add(r);
      var bs = [[sqX, sqS / 2, 1], [sqX + sqS / 2, 0, 0], [sqX, -sqS / 2, 1], [sqX - sqS / 2, 0, 0]].map(function (b) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(b[2] ? sqS + TH * 2 : TH * 2, b[2] ? TH * 2 : sqS + TH * 2), sm);
        m.position.set(b[0], b[1], 0.005); m.userData.h = !!b[2];
        if (b[2]) m.scale.x = 0.0001; else m.scale.y = 0.0001;
        g.add(m); return m;
      });
      var wm = new THREE.MeshBasicMaterial({ map: wordTex, transparent: true, depthWrite: false, fog: false, opacity: 0 });
      var w = new THREE.Mesh(wordGeo, wm); w.position.set(markCX, WORD_Y, 0); g.add(w);
      g.traverse(function (o) { if (o.isMesh) o.renderOrder = 10; });   // dessiné après le sol transparent : reste net
      scene.add(g);
      return { g: g, ring: r, ringMat: rm, sqMat: sm, bars: bs, word: w, wordMat: wm, p: -1 };
    }
    function drawLogo(L, t) {                                     // t : secondes depuis le début du tracé
      var rp = sine(t / 1.6);                                     // le cercle se trace d'un seul geste
      if (rp !== L.p) {
        L.p = rp; L.ring.geometry.dispose();
        L.ring.geometry = new THREE.RingGeometry(ringR - TH, ringR + TH, 180, 1, Math.PI / 2, Math.max(0.0001, rp * Math.PI * 2));
      }
      L.bars.forEach(function (b, j) {                            // puis le carré, côté par côté
        var q = Math.max(0.0001, sine((t - 0.8 - j * 0.2) / 0.6));
        if (b.userData.h) b.scale.x = q; else b.scale.y = q;
      });
      var wp = sine((t - 1.9) / 1.1);                             // enfin le nom
      L.word.position.y = WORD_Y - 0.12 * (1 - wp);
      return wp;
    }

    var L0 = buildLogo();
    L0.g.position.set(-markCX * LS, LOGO_Y, LOGO_Z); L0.g.scale.setScalar(LS);
    var glowMat = new THREE.MeshBasicMaterial({ map: warmPool, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 });
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(8, 7), glowMat); glow.position.set(markCX, COMP_CY, -0.6); glow.renderOrder = 9; L0.g.add(glow);
    // le logo d'accueil est complet dès le départ : il apparaît d'un coup, porté par un éclat
    L0.ring.geometry.dispose(); L0.ring.geometry = new THREE.RingGeometry(ringR - TH, ringR + TH, 180);
    L0.bars.forEach(function (b) { b.scale.set(1, 1, 1); });
    L0.ringMat.opacity = L0.sqMat.opacity = 0;

    /* ----- Éclat d'apparition : halo blanc et terracotta + particules ----- */
    function flash(rgb, a) {
      var m = new THREE.MeshBasicMaterial({ map: radialTex('rgba(' + rgb + ',' + a + ')', 'rgba(' + rgb + ',0)'), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 });
      var f = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), m); f.position.set(markCX, 0, -0.25); f.renderOrder = 9; L0.g.add(f);
      return f;
    }
    var flashW = flash('255,247,234', 1), flashC = flash('236,88,46', 0.9);
    // ondes de choc : un anneau blanc puis un anneau terracotta qui s'élargissent
    function shock(color) {
      var m = new THREE.MeshBasicMaterial({ color: color, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide });
      var r = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 160), m); r.position.set(markCX, 0, 0.03); r.renderOrder = 11; L0.g.add(r);
      return r;
    }
    var shockW = shock(0xfff4e4), shockC = shock(0xe8582e);
    var BN = mobile ? 300 : 520;
    var bPos = new Float32Array(BN * 3), bVel = new Float32Array(BN * 3), bCol = new Float32Array(BN * 3),
        bLife = new Float32Array(BN), bSize = new Float32Array(BN), bDelay = new Float32Array(BN);
    var CREAM = [0.953, 0.925, 0.867], CLAY = [0.89, 0.325, 0.212], WHITE = [1, 0.98, 0.95];
    for (var n = 0; n < BN; n++) {
      var onRing = n % 2 === 0, px, py, nx, ny, a;
      if (onRing) {                                               // points pris sur le cercle…
        a = Math.random() * Math.PI * 2;
        px = ringX + Math.cos(a) * ringR; py = Math.sin(a) * ringR; nx = Math.cos(a); ny = Math.sin(a);
      } else {                                                    // … et sur le carré
        var e = Math.floor(Math.random() * 4), u = Math.random() * 2 - 1;
        nx = e === 0 ? 0 : e === 1 ? 1 : e === 2 ? 0 : -1; ny = e === 0 ? 1 : e === 2 ? -1 : 0;
        px = sqX + (nx ? nx * sqS / 2 : u * sqS / 2); py = ny ? ny * sqS / 2 : u * sqS / 2;
        if (Math.random() < 0.5) { nx = -nx; ny = -ny; }          // vers l'extérieur ou l'intérieur du carré
      }
      var sp = 0.45 + Math.pow(Math.random(), 2.2) * 2.2, jx = (Math.random() - 0.5) * 0.9, jy = (Math.random() - 0.5) * 0.9;
      bPos.set([px, py, 0.02], n * 3);
      bVel.set([(nx + jx) * sp, (ny + jy) * sp + 0.15, (Math.random() - 0.35) * 1.4], n * 3);
      var r = Math.random(), col = onRing ? (r < 0.72 ? CREAM : r < 0.9 ? CLAY : WHITE) : (r < 0.72 ? CLAY : r < 0.9 ? CREAM : WHITE);
      bCol.set(col, n * 3);
      var big = Math.random() < 0.05;
      bSize[n] = (big ? 0.09 + Math.random() * 0.05 : 0.015 + Math.random() * 0.032) * LS;
      bLife[n] = big ? 1.0 + Math.random() * 0.8 : 1.2 + Math.random() * 1.6;
      bDelay[n] = Math.random() * 0.16;
    }
    var bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    bGeo.setAttribute('aVel', new THREE.BufferAttribute(bVel, 3));
    bGeo.setAttribute('aCol', new THREE.BufferAttribute(bCol, 3));
    bGeo.setAttribute('aLife', new THREE.BufferAttribute(bLife, 1));
    bGeo.setAttribute('aSize', new THREE.BufferAttribute(bSize, 1));
    bGeo.setAttribute('aDelay', new THREE.BufferAttribute(bDelay, 1));
    var burstMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uOpacity: { value: 1 } },
      vertexShader: [
        'uniform float uTime; uniform float uScale;',
        'attribute vec3 aVel; attribute vec3 aCol; attribute float aLife; attribute float aSize; attribute float aDelay;',
        'varying vec3 vCol; varying float vA;',
        'void main(){',
        '  float t = max(uTime - aDelay, 0.0), k = 2.2;',
        '  vec3 p = position + aVel * (1.0 - exp(-k * t)) / k;',      // éclat freiné, sans à-coup
        '  float l = clamp(t / aLife, 0.0, 1.0);',
        '  vA = smoothstep(0.0, 0.05, t) * (1.0 - l) * (1.0 - l) * step(0.0001, uTime);',
        '  vCol = aCol;',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_PointSize = max(1.0, aSize * uScale * (1.0 - 0.45 * l) / -mv.z);',
        '  gl_Position = projectionMatrix * mv;',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float uOpacity; varying vec3 vCol; varying float vA;',
        'void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);',
        '  float a = smoothstep(0.25, 0.0, d) * vA * uOpacity;',
        '  gl_FragColor = vec4(vCol, a); }'].join('\n')
    });
    var burst = new THREE.Points(bGeo, burstMat); burst.renderOrder = 11; burst.frustumCulled = false; burst.visible = false;
    L0.g.add(burst);

    /* ----- Positions le long du mur : logo → œuvres → logo final ----- */
    var X1 = halfW + FW / 2 + 0.3;                                  // la 1re œuvre attend juste hors cadre
    var xs = [0];
    for (var q = 0; q < N; q++) xs.push(X1 + q * GAP_X);
    var X_END = xs[N] + halfW + FW / 2 + 0.3;                       // la dernière sort du cadre à la fin
    xs.push(X_END);
    var X_MIN = -halfW - 8, X_MAX = X_END + halfW + 8;

    /* ----- Mur, sol, plinthe ----- */
    var wall = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN, 14), new THREE.MeshBasicMaterial({ color: 0x120e0b }));
    wall.position.set((X_MIN + X_MAX) / 2, 7, 0); scene.add(wall);
    var plinth = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN, 0.09), new THREE.MeshBasicMaterial({ color: 0x0c0907 }));
    plinth.position.set((X_MIN + X_MAX) / 2, 0.045, 0.01); scene.add(plinth);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN, D + 12),
      new THREE.MeshBasicMaterial({ color: 0x110e0a, transparent: true, opacity: 0.86, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((X_MIN + X_MAX) / 2, 0, (D + 12) / 2); floor.renderOrder = 2;
    scene.add(floor);
    // lumière d'accueil sur le mur, derrière le logo
    var startWash = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ map: warmPool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.18 }));
    startWash.position.set(0, Y_C, 0.02); scene.add(startWash);

    /* ----- Logo signature en fin de parcours, au-dessus du message final ----- */
    var dE = D - 0.3, visHe = 2 * tanV * dE, visWe = visHe * aspect0;
    var ELS = Math.min(0.32 * visHe / COMP_H, 0.6 * visWe / WORD_W);
    var L1 = buildLogo();
    L1.g.scale.setScalar(ELS);
    L1.g.position.set(X_END - markCX * ELS, Y_C + (0.5 - (0.335 + SHIFT)) * visHe - COMP_CY * ELS, 0.3);
    L1.g.visible = false;
    var endPool = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshBasicMaterial({ map: warmPool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    endPool.position.set(X_END, L1.g.position.y + COMP_CY * ELS - 0.3, 0.02); scene.add(endPool);

    /* ----- Œuvres accrochées au mur ----- */
    var loader = new THREE.TextureLoader();
    var maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    var loaded = 0;
    items.forEach(function (it, i) {
      var g = new THREE.Group();
      var fx = xs[i + 1];
      g.position.set(fx, 0, 0);
      scene.add(g);
      var u = {
        uTex: { value: null }, uImg: { value: new THREE.Vector2(4, 3) }, uSize: { value: new THREE.Vector2(FW, FH) },
        uFocus: { value: 0 }, uOn: { value: 0 }, uOpacity: { value: 1 }, uFogColor: { value: FOG }, uFogDensity: { value: FOG_D }
      };
      var geo = new THREE.PlaneGeometry(FW, FH);
      var photo = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS }));
      photo.position.set(0, Y_C, 0.08); photo.userData.i = i; g.add(photo);
      var back = new THREE.Mesh(new THREE.BoxGeometry(FW + 0.1, FH + 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0x080605 }));
      back.position.set(0, Y_C, 0.04); g.add(back);
      var rU = {}; for (var k in u) rU[k] = u[k];
      rU.uOpacity = { value: 0.14 };
      var refl = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: rU, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false }));
      refl.position.set(0, -Y_C, 0.08); refl.scale.y = -1; refl.renderOrder = 1; g.add(refl);
      // lumière : faisceau venu du plafond, halo chaud sur le mur, reflet au sol
      var coneM = coneMaterial();
      var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 1.25, 3.6, 40, 1, true), coneM);
      cone.position.set(0, Y_C + FH / 2 + 1.55, 0.55); g.add(cone);
      var washM = new THREE.MeshBasicMaterial({ map: warmPool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
      var wash = new THREE.Mesh(new THREE.PlaneGeometry(FW * 2.3, FH * 2.6), washM);
      wash.position.set(0, Y_C + 0.25, 0.02); g.add(wash);
      var poolM = new THREE.MeshBasicMaterial({ map: warmPool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
      var pool = new THREE.Mesh(new THREE.PlaneGeometry(FW * 1.5, 2.4), poolM);
      pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.012, 1.1); pool.renderOrder = 4; g.add(pool);

      frames.push({ photo: photo, u: u, cone: coneM, wash: washM, pool: poolM, x: fx, onAt: 0, item: it });
      photos.push(photo);
      loader.load(it.src, function (tex) {
        tex.anisotropy = maxAniso; tex.minFilter = THREE.LinearMipmapLinearFilter;
        u.uTex.value = tex;
        u.uImg.value.set(tex.image.naturalWidth || tex.image.width, tex.image.naturalHeight || tex.image.height);
        it.ready = true;
        if (++loaded === N) pg.classList.add('pg-loaded');
      }, undefined, function () { fallback(); });
    });

    /* ----- État & interactions ----- */
    var st = { s: 0, sT: 0, mx: 0.5, my: 0.5, leaving: false, leaveAt: 0, card: -1, visible: false, last: 0, logoAt: 0, endAt: 0 };
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

    function metrics() { var rect = pg.getBoundingClientRect(); return { rect: rect, total: pg.offsetHeight - window.innerHeight, top: rect.top + window.pageYOffset }; }
    function scrollToStation(i) { var m = metrics(); window.scrollTo({ top: m.top + (i / (N + 1)) * m.total + 2, behavior: 'smooth' }); }
    ticks.forEach(function (t) { t.addEventListener('click', function () { scrollToStation(+t.dataset.i + 1); }); });
    $('.pg-enter').addEventListener('click', function () { scrollToStation(1); });   // entrer : première œuvre
    $('.pg-skip').addEventListener('click', function () { var m = metrics(); window.scrollTo({ top: m.top + pg.offsetHeight + 1, behavior: 'smooth' }); });

    // glisser à gauche / à droite : pavé tactile (défilement horizontal) et balayage au doigt
    elSticky.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1) { e.preventDefault(); window.scrollBy(0, e.deltaX * 1.6); }
    }, { passive: false });
    var touch = null;
    elSticky.addEventListener('touchstart', function (e) { var t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
    elSticky.addEventListener('touchend', function (e) {
      if (!touch) return;
      var t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) scrollToStation(clamp(Math.round(st.sT) + (dx < 0 ? 1 : -1), 0, N + 1));
    }, { passive: true });

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    function dwell(s) { var i = Math.floor(s), f = s - i; return i + f - Math.sin(2 * Math.PI * f) / (2 * Math.PI); }
    function sine(t) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1)); }
    function camX(s) {                                              // position le long du mur, avec pause devant chaque œuvre
      var se = dwell(clamp(s, 0, N + 1)), i = Math.min(N, Math.floor(se));
      return xs[i] + (xs[Math.min(N + 1, i + 1)] - xs[i]) * (se - i);
    }

    function showCard(i) {
      if (i === st.card) return;
      st.card = i;
      pg.classList.remove('pg-card-on');
      if (i < 0) return;
      var it = items[i];
      elTitle.textContent = it.title; elNum.textContent = pad(i + 1);
      // « Résidentiel · Bangkok » : le point médian passe en terracotta
      elCat.innerHTML = it.cat.split(/\s*[·•|]\s*/).map(esc).join('<i>·</i>');
      void pg.offsetWidth;
      pg.classList.add('pg-card-on');
    }
    function openFrame(i) {                                         // ouverture du projet : simple fondu, sans zoom
      var it = items[i];
      if (!it.href || st.leaving) return;
      st.leaving = true; st.leaveAt = performance.now(); pg.classList.add('pg-leaving');
      setTimeout(function () { window.location.href = it.href; }, 650);
    }
    window.addEventListener('pageshow', function () { st.leaving = false; pg.classList.remove('pg-leaving'); });

    var cv = renderer.domElement, down = null;
    function setPointer(e) { var r = elSticky.getBoundingClientRect(); st.mx = (e.clientX - r.left) / r.width; st.my = (e.clientY - r.top) / r.height; }
    function pick() {
      ndc.set(st.mx * 2 - 1, -(st.my * 2 - 1)); ray.setFromCamera(ndc, camera);
      var h = ray.intersectObjects(photos, false)[0];
      return h ? frames[h.object.userData.i] : null;
    }
    cv.addEventListener('pointermove', function (e) {
      setPointer(e);
      if (fine) { var f = pick(); cv.style.cursor = f ? 'pointer' : ''; }
    });
    cv.addEventListener('pointerdown', function (e) { setPointer(e); down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    cv.addEventListener('pointerup', function (e) {
      if (!down) return;
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y), quick = performance.now() - down.t < 450;
      down = null;
      if (moved > 8 || !quick || st.leaving) return;
      setPointer(e);
      var f = pick();
      if (!f) return;
      var i = f.photo.userData.i;
      if (Math.abs(st.s - (i + 1)) < 0.3) openFrame(i); else scrollToStation(i + 1);
    });

    function resize() {
      var w = elSticky.clientWidth, h = elSticky.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      camera.setViewOffset(w, h, 0, Math.round(h * SHIFT), w, h);
      burstMat.uniforms.uScale.value = h * renderer.getPixelRatio() / (2 * tanV);
      camera.updateProjectionMatrix();
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(elSticky);
    var lastIH = window.innerHeight;
    window.addEventListener('resize', function () { if (Math.abs(window.innerHeight - lastIH) > 120 || !mobile) { lastIH = window.innerHeight; sizeSection(); } });

    /* ----- Boucle ----- */
    function frame(now) {
      if (dead) return;
      var dt = st.last ? Math.min(64, now - st.last) : 16.7; st.last = now;
      var k = function (x) { return 1 - Math.pow(1 - x, dt / 16.67); };

      var m = metrics();
      var prog = clamp(-m.rect.top / Math.max(1, m.total), 0, 1);
      st.sT = prog * (N + 1);
      st.s += (st.sT - st.s) * k(0.06);                         // inertie douce, sans à-coup

      var enter = clamp((window.innerHeight - m.rect.top) / (window.innerHeight * 0.9), 0, 1);
      elVeil.style.opacity = st.leaving ? clamp((performance.now() - st.leaveAt) / 550, 0, 1) : (1 - enter);
      if (!st.logoAt && m.rect.top < window.innerHeight * 0.2) st.logoAt = now;

      // Caméra : simple translation latérale, regard droit devant (ni zoom, ni rotation)
      var cx = camX(st.s);
      camera.position.set(cx, Y_C, D);
      camera.lookAt(cx, Y_C, 0);

      // Logo d'accueil : léger éclat blanc et terracotta, le logo apparaît au cœur de la lumière
      var lt = st.logoAt ? (now - st.logoAt) / 1000 : 0;
      var et = lt / 2.1;                                         // temps de l'explosion : ralenti, pour qu'elle se déploie
      var grow = 1 - Math.pow(1 - clamp(et / 1.1, 0, 1), 3);
      L0.g.scale.setScalar(LS * (0.94 + 0.06 * grow));
      L0.g.position.x = -markCX * L0.g.scale.x;
      L0.ringMat.opacity = L0.sqMat.opacity = smooth(0.02, 0.22, et);
      var wp = sine((lt - 1.5) / 1.3);                           // le nom arrive quand l'éclat retombe
      L0.word.position.y = WORD_Y - 0.12 * (1 - wp);
      L0.wordMat.opacity = wp;
      var fl = et > 0 ? smooth(0, 0.07, et) : 0;
      flashW.material.opacity = 0.4 * fl * Math.exp(-et * 3.0); flashW.scale.setScalar(0.45 + 0.75 * grow);
      flashC.material.opacity = 0.26 * fl * Math.exp(-et * 1.8); flashC.scale.setScalar(0.8 + 0.9 * grow);
      var w1 = clamp(et / 1.0, 0, 1), w2 = clamp((et - 0.12) / 1.3, 0, 1);       // ondes de choc
      shockW.scale.setScalar(0.4 + 1.9 * (1 - Math.pow(1 - w1, 3))); shockW.material.opacity = et > 0 ? 0.26 * (1 - w1) * (1 - w1) : 0;
      shockC.scale.setScalar(0.4 + 2.4 * (1 - Math.pow(1 - w2, 3))); shockC.material.opacity = et > 0.12 ? 0.2 * (1 - w2) * (1 - w2) : 0;
      glowMat.opacity = sine((lt - 0.6) / 2.2) * 0.22;
      burst.visible = et > 0 && et < 3.4;
      shockW.visible = shockC.visible = et > 0 && et < 1.5;
      burstMat.uniforms.uTime.value = et;
      L0.g.visible = cx < halfW + 6;

      // Œuvres : le projecteur s'allume quand l'œuvre entre dans le cadre, l'image reste immobile
      var nearest = 0, nearD = 99;
      frames.forEach(function (f, i) {
        var d = Math.abs(st.s - (i + 1));
        if (d < nearD) { nearD = d; nearest = i; }
        if (!f.onAt && st.s > i + 0.3 && f.item.ready) f.onAt = now;
        var on = f.onAt ? sine((now - f.onAt) / 1800) : 0;
        f.u.uOn.value = on;
        f.u.uFocus.value = 1 - smooth(0.15, 0.7, d);
        f.cone.uniforms.uStrength.value = 0.13 * on;
        f.wash.opacity = 0.26 * on;
        f.pool.opacity = 0.7 * on;
      });
      showCard(nearD < 0.3 && !st.leaving ? nearest : -1);

      // Interface
      var introA = 1 - smooth(0.04, 0.4, st.s);
      elIntro.style.opacity = introA; elIntro.style.visibility = introA < 0.01 ? 'hidden' : 'visible';
      var outA = smooth(N + 0.5, N + 0.95, st.s);
      elOutro.style.opacity = outA; elOutro.style.visibility = outA < 0.01 ? 'hidden' : 'visible';
      pg.classList.toggle('pg-outro-on', outA > 0.6);
      // le logo se dessine sur le mur quand le message final apparaît
      if (!st.endAt && outA > 0.5) st.endAt = now;
      var ewp = drawLogo(L1, st.endAt ? (now - st.endAt) / 1000 : 0);
      L1.ringMat.opacity = L1.sqMat.opacity = outA;
      L1.wordMat.opacity = ewp * outA;
      L1.g.visible = outA > 0.001;
      elRailFill.style.transform = 'scaleY(' + prog + ')';
      ticks.forEach(function (t, i) { t.classList.toggle('is-on', i === nearest && nearD < 0.5); });
      pg.classList.toggle('pg-in-gallery', st.s > 0.6 && st.s < N + 0.6);
      pg.classList.toggle('pg-logo-in', lt > 0.8);

      renderer.render(scene, camera);
      if (st.visible) requestAnimationFrame(frame);
    }
    function start() { if (st.visible || dead) return; st.visible = true; st.last = 0; requestAnimationFrame(frame); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) start(); else st.visible = false; }); }, { rootMargin: '300px 0px' }).observe(pg);
    } else start();
    pg.classList.add('pg-ready');
  }
})();
