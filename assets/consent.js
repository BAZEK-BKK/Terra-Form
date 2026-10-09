/*
 * Cookie consent gate for Google Analytics (GA4), built for Thailand's PDPA:
 * GA4 is never loaded until the visitor explicitly accepts. The choice is
 * remembered in localStorage; a "manage cookies" link (injected into the
 * footer) lets the visitor reopen the banner and change their mind later.
 */
(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-MYYW7108EZ";
  var STORAGE_KEY = "tf_consent";

  var siteEl = document.getElementById("site");
  var LANG = (siteEl && siteEl.getAttribute("data-lang")) || "fr";

  var STRINGS = {
    fr: {
      text: "Nous utilisons Google Analytics pour mesurer l’audience de ce site. Vos données ne sont utilisées qu’avec votre accord, conformément à la PDPA.",
      more: "En savoir plus",
      accept: "Accepter",
      decline: "Refuser",
      manage: "Gérer les cookies",
    },
    en: {
      text: "We use Google Analytics to measure this site’s audience. Your data is only used with your consent, in line with the PDPA.",
      more: "Learn more",
      accept: "Accept",
      decline: "Decline",
      manage: "Manage cookies",
    },
    th: {
      text: "เราใช้ Google Analytics เพื่อวัดผลผู้เข้าชมเว็บไซต์นี้ ข้อมูลของท่านจะถูกใช้ก็ต่อเมื่อท่านให้ความยินยอมเท่านั้น ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
      more: "เรียนรู้เพิ่มเติม",
      accept: "ยอมรับ",
      decline: "ปฏิเสธ",
      manage: "จัดการคุกกี้",
    },
  };

  var S = STRINGS[LANG] || STRINGS.fr;
  var PRIVACY_HREF = "/" + LANG + "/politique-de-confidentialite/";

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeConsent(status) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ status: status, ts: Date.now() }));
    } catch (e) {
      /* ignore (private browsing, storage disabled, etc.) */
    }
  }

  function loadGA() {
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.indexOf("XXXX") !== -1) return;
    if (window.__tfGaLoaded) return;
    window.__tfGaLoaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  // Suivi des clics (GA4) : e-mail, LINE, réseaux sociaux, boutons vers la page
  // Contact. Écouteur délégué : il ne fait rien tant que gtag n'existe pas, donc
  // aucun événement n'est envoyé sans consentement analytique.
  function tfTrackClicks() {
    if (window.__tfClickTracking) return;
    window.__tfClickTracking = true;

    var networks = [
      ["instagram.com", "instagram"],
      ["pinterest.", "pinterest"],
      ["facebook.com", "facebook"]
    ];

    function place(a) {
      if (a.closest("footer")) return "footer";
      if (a.closest("nav, .site-nav, .nav, .lang-select")) return "nav";
      if (a.closest(".page-hero-header, .hero-contact-cta")) return "banner";
      return "content";
    }

    document.addEventListener("click", function (e) {
      if (typeof window.gtag !== "function") return;
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var siteEl = document.getElementById("site");
      var base = {
        link_url: a.href,
        page_path: location.pathname,
        language: (siteEl && siteEl.getAttribute("data-lang")) || document.documentElement.lang || "",
        transport_type: "beacon"
      };
      var name = null;
      var extra = {};

      if (href.indexOf("mailto:") === 0) {
        name = "email_click";
      } else if (href.indexOf("line.me") !== -1) {
        name = "line_click";
      } else {
        for (var i = 0; i < networks.length; i++) {
          if (href.indexOf(networks[i][0]) !== -1) {
            name = "social_click";
            extra.network = networks[i][1];
            break;
          }
        }
        if (!name && /\/contact\/?(\?|#|$)/.test(href)) {
          name = "contact_cta_click";
          extra.location = place(a);
          extra.link_text = (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
        }
      }
      if (!name) return;
      if (name === "email_click" || name === "line_click") extra.location = place(a);
      for (var k in extra) base[k] = extra[k];
      window.gtag("event", name, base);
    }, true);
  }
  tfTrackClicks();

  // Fenêtre modale centrée (fond assombri) plutôt qu'un simple bandeau : on
  // verrouille donc le scroll de la page pendant qu'elle est ouverte. Ce
  // fichier est chargé séparément du menu burger/langue, donc ce verrou est
  // volontairement autonome plutôt que de dépendre de leurs fonctions internes.
  var lockedScrollY = 0;

  function lockScroll() {
    // Réutilise la classe "ll-lock" déjà posée par le menu burger/langue
    // (voir script.js) : elle fixe html/body en height:100% + overflow:hidden,
    // sans quoi certaines sections de la page (notamment l'accueil) qui
    // dépendent de la hauteur du document s'effondrent une fois le body
    // passé en position:fixed.
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add("ll-lock");
    document.body.classList.add("ll-lock");
    document.body.style.position = "fixed";
    document.body.style.top = -lockedScrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.documentElement.classList.remove("ll-lock");
    document.body.classList.remove("ll-lock");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo({ top: lockedScrollY, left: 0, behavior: "instant" });
  }

  function blockTouchMove(e) {
    if (document.querySelector(".consent-overlay")) e.preventDefault();
  }
  document.addEventListener("touchmove", blockTouchMove, { passive: false });

  function closeBanner(banner, overlay) {
    if (!banner) return;
    banner.classList.remove("is-visible");
    if (overlay) overlay.classList.remove("is-visible");
    unlockScroll();
    window.setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }

  function buildBanner() {
    var overlay = document.createElement("div");
    overlay.className = "consent-overlay";

    var banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "true");
    banner.setAttribute("aria-label", S.manage);
    banner.innerHTML =
      '<div class="consent-banner-inner">' +
      '<p class="consent-banner-text">' +
      S.text +
      ' <a href="' +
      PRIVACY_HREF +
      '">' +
      S.more +
      "</a></p>" +
      '<div class="consent-banner-actions">' +
      '<button type="button" class="consent-btn consent-btn-decline" data-action="decline">' +
      S.decline +
      "</button>" +
      '<button type="button" class="consent-btn consent-btn-accept" data-action="accept">' +
      S.accept +
      "</button>" +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);
    document.body.appendChild(banner);
    lockScroll();
    window.requestAnimationFrame(function () {
      overlay.classList.add("is-visible");
      banner.classList.add("is-visible");
    });

    banner.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action === "accept") {
        writeConsent("granted");
        loadGA();
      } else {
        writeConsent("denied");
      }
      closeBanner(banner, overlay);
    });

    return banner;
  }

  function openBanner() {
    var existing = document.querySelector(".consent-banner");
    if (existing) return;
    buildBanner();
  }

  function injectManageLink() {
    var nav = document.querySelector(".footer-legal");
    if (!nav || nav.querySelector(".footer-cookie-link")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "footer-cookie-link";
    btn.textContent = S.manage;
    btn.addEventListener("click", openBanner);
    nav.appendChild(btn);
  }

  function init() {
    injectManageLink();
    var consent = readConsent();
    if (!consent) {
      openBanner();
      return;
    }
    if (consent.status === "granted") {
      loadGA();
    }
  }

  window.TFConsent = { open: openBanner };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
