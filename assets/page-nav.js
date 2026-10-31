/* ============================================================
   Terra & Form — Transitions entre les pages internes
   (styles dans page-nav.css)
   Chargé de façon bloquante dans le <head> : il doit agir avant le
   premier affichage de la page.
   ============================================================ */
(function () {
  'use strict';
  var d = document, r = d.documentElement, KEY = 'tfMorph';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function clean(u) {   // adresse comparable : sans #ancre, ?paramètres, index.html ni / final
    try { var x = new URL(u, location.href); return x.origin + x.pathname.replace(/index\.html$/, '').replace(/\/$/, ''); }
    catch (e) { return ''; }
  }
  function lang(u) { try { return new URL(u, location.href).pathname.split('/')[1] || ''; } catch (e) { return ''; } }

  // ---------- 3) Arrivée par un lien interne : bannière dévoilée + cascade ----------
  var navType = '', ref = '';
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    navType = nav ? nav.type : '';
    ref = d.referrer;
    var internal = ref && new URL(ref).origin === location.origin && clean(ref) !== clean(location.href);
    // tf-arrive : arrivée depuis la landing, déjà gérée par page-transition.js
    if (internal && navType !== 'reload' && !r.classList.contains('tf-arrive')) {
      r.classList.add('tf-nav');   // reste posée : remplace le fondu d'origine de la page
      if (navType !== 'back_forward') {   // au retour, la page revient telle qu'on l'a laissée
        r.classList.add('tf-in');
        requestAnimationFrame(function () {
          setTimeout(function () { r.classList.remove('tf-in'); }, 2000);
        });
      }
    }
  } catch (e) {}

  // ---------- 1) et 2) Passage d'une page à l'autre (View Transitions) ----------
  var lastClick = null;   // Safari ne donne pas l'adresse de destination : on retient le dernier lien cliqué
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    // menu : lien du menu mobile ou du menu de langue (le header change d'aspect en partant)
    if (a) lastClick = { url: a.href, t: Date.now(), menu: !!a.closest('#mobileMenu, .lang-dd') };
  }, true);

  function visible(el) {
    if (!el) return false;
    var b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && b.bottom > 0 && b.right > 0 && b.top < innerHeight && b.left < innerWidth;
  }
  function hero() { return d.getElementById('aImg') || d.getElementById('pImg'); }
  // Carte de cette page qui mène à « url » (Journal, « à lire aussi », autres réalisations, mosaïque du Studio)
  function cardFor(url) {
    var want = clean(url), links = d.querySelectorAll('a.post-card, a.proj-mosaic-link');
    for (var i = 0; i < links.length; i++) {
      if (clean(links[i].href) !== want) continue;
      var pic = links[i].querySelector(links[i].classList.contains('post-card') ? 'img' : '.proj-mosaic-img');
      if (visible(pic)) return pic;
    }
    return null;
  }
  function tag(el, name, vt) {
    if (!el) return;
    el.style.viewTransitionName = name;
    vt.finished.finally(function () { el.style.viewTransitionName = ''; });
  }
  function isBack(act) {
    try { return act.navigationType === 'traverse' && act.entry.index < act.from.index; } catch (e) { return false; }
  }
  function addType(vt, t) { try { vt.types && vt.types.add(t); } catch (e) {} }

  // Page de départ : juste avant la capture de son image
  window.addEventListener('pageswap', function (e) {
    // Position de lecture, pour la retrouver dès le premier affichage en cas de retour
    try { sessionStorage.setItem('tfY:' + clean(location.href), String(Math.round(scrollY))); } catch (x) {}
    var vt = e.viewTransition;
    if (!vt) return;
    var act = e.activation, click = lastClick && Date.now() - lastClick.t < 5000 ? lastClick : null;
    var to = act && act.entry ? act.entry.url : (click ? click.url : '');
    if (act && isBack(act)) addType(vt, 'tf-back');
    if (!to) return;
    // La carte cliquée part vers la page ouverte ; sinon l'image principale de cette
    // page repartira vers sa carte, si la page suivante en a une à l'écran.
    var kind = 'card', el = cardFor(to);
    if (!el) { kind = 'hero'; el = hero(); if (!visible(el)) { kind = ''; el = null; } }
    if (el) tag(el, 'tf-hero', vt);
    // Ce que la page suivante doit savoir de ce départ
    var menu = !!(click && click.menu && clean(click.url) === clean(to));
    try { sessionStorage.setItem(KEY, JSON.stringify({ kind: kind, menu: menu, from: clean(location.href), to: clean(to), t: Date.now() })); } catch (x) {}
  });

  // Nouvelle page : juste avant son premier affichage
  window.addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition;
    var m = null;
    try { m = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (x) {}
    if (!vt) return;
    r.classList.add('tf-nav');   // la transition fait déjà apparaître la page : pas de second fondu
    var act = window.navigation && navigation.activation;
    if (act && act.from && isBack(act)) addType(vt, 'tf-back');
    try {
      if (act ? act.navigationType === 'traverse' : navType === 'back_forward') {
        // Retour / avance dans l'historique : le navigateur ne replace la page qu'après la
        // capture de la transition ; on la replace tout de suite là où on l'avait laissée.
        var y = sessionStorage.getItem('tfY:' + clean(location.href));
        if (y !== null && Math.abs(scrollY - y) > 2) scrollTo({ top: +y, left: 0, behavior: 'instant' });
      } else if (sessionStorage.getItem('tfSkipHero') === '1' && !location.hash) {
        // Arrivée par le menu mobile : script.js ouvre la page juste sous sa bannière ;
        // on le fait dès maintenant pour que la page arrive déjà à sa place.
        var hh = d.querySelector('#siteMain .page-hero-header'), hd = d.getElementById('siteGlobalHeader'), top = 0;
        if (hd && /sticky|fixed/.test(getComputedStyle(hd).position)) top = hd.getBoundingClientRect().height;
        if (hh) scrollTo({ top: Math.max(0, Math.round(scrollY + hh.getBoundingClientRect().bottom - top)), left: 0, behavior: 'instant' });
      }
    } catch (x) {}
    if (m && (m.to !== clean(location.href) || Date.now() - m.t > 6000)) m = null;
    // Header différent à l'arrivée (autre langue, ou départ depuis un menu ouvert) : fondu entre les deux
    var from = act && act.from ? act.from.url : (m ? m.from : ref);
    if ((from && lang(from) !== lang(location.href)) || (m && m.menu)) addType(vt, 'tf-swap');

    if (!m || !m.kind) return;
    var el = m.kind === 'card' ? hero() : cardFor(m.from);
    if (!visible(el)) return;
    r.classList.add('tf-morph');
    tag(el, 'tf-hero', vt);
    // Le bloc qui reçoit l'image ne participe pas à la cascade : l'image s'y pose
    var block = el;
    while (block.parentElement && !(block.parentElement.classList && block.parentElement.classList.contains('page'))) block = block.parentElement;
    if (block.parentElement && block !== el) block.classList.add('tf-still');
    // Carte du Journal : déjà visible (sinon elle attendrait son apparition au défilement)
    var card = el.closest('.post-card');
    if (card && !card.classList.contains('reveal')) card.classList.add('reveal', 'is-visible');
    // Page projet : dégradé et titre se posent par-dessus la photo arrivée
    var ph = el.id === 'pImg' && el.closest('.project-hero');
    if (ph) { tag(ph.querySelector('.overlay'), 'tf-hero-ov', vt); tag(ph.querySelector('.info'), 'tf-hero-tx', vt); }
  });
})();
