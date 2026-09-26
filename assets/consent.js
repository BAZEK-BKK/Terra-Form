/*
 * Cookie consent gate for Google Analytics (GA4), built for Thailand's PDPA:
 * GA4 is never loaded until the visitor explicitly accepts. The choice is
 * remembered in localStorage; a "manage cookies" link (injected into the
 * footer) lets the visitor reopen the banner and change their mind later.
 *
 * TODO: replace GA_MEASUREMENT_ID with the real GA4 "G-XXXXXXXXXX" id
 * from Admin > Data Streams > Web in Google Analytics.
 */
(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-XXXXXXXXXX";
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

  function raiseLineFloat(px) {
    var line = document.querySelector(".line-float");
    if (line) line.style.bottom = px ? px + 24 + "px" : "";
  }

  function closeBanner(banner) {
    if (!banner) return;
    banner.classList.remove("is-visible");
    raiseLineFloat(0);
    window.setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 300);
  }

  function buildBanner() {
    var banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.setAttribute("role", "dialog");
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

    document.body.appendChild(banner);
    window.requestAnimationFrame(function () {
      banner.classList.add("is-visible");
      raiseLineFloat(banner.offsetHeight);
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
      closeBanner(banner);
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
