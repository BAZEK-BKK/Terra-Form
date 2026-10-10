/**
 * Web Vitals Tracking Script
 * Mesure et envoie les Core Web Vitals à Google Analytics 4
 * Métriques : LCP, FID/INP, CLS
 */

(function() {
  'use strict';

  // Données Web Vitals
  const vitalsData = {
    lcp: null,
    fid: null,
    cls: null
  };

  // 1. Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitalsData.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
        console.log('[Web Vitals] LCP:', vitalsData.lcp + 'ms');
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('[Web Vitals] LCP Observer error:', e);
    }
  }

  // 2. First Input Delay (FID) - ou INP pour les navigateurs modernes
  let fidValue = null;
  if ('PerformanceObserver' in window) {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!fidValue || entry.processingDuration < fidValue) {
            fidValue = Math.round(entry.processingDuration);
            vitalsData.fid = fidValue;
            console.log('[Web Vitals] FID:', vitalsData.fid + 'ms');
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('[Web Vitals] FID Observer error:', e);
    }
  }

  // 3. Cumulative Layout Shift (CLS)
  let clsValue = 0;
  if ('PerformanceObserver' in window) {
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            vitalsData.cls = Math.round(clsValue * 1000) / 1000;
            console.log('[Web Vitals] CLS:', vitalsData.cls);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('[Web Vitals] CLS Observer error:', e);
    }
  }

  // Envoyer les données à GA4 au déchargement de la page
  window.addEventListener('beforeunload', () => {
    if (window.gtag) {
      const eventData = {
        'event_category': 'web_vitals',
        'value': 0
      };

      // Ajouter les métriques disponibles
      if (vitalsData.lcp !== null) {
        eventData['web_vitals_lcp'] = vitalsData.lcp;
      }
      if (vitalsData.fid !== null) {
        eventData['web_vitals_fid'] = vitalsData.fid;
      }
      if (vitalsData.cls !== null) {
        eventData['web_vitals_cls'] = vitalsData.cls;
      }

      // Envoyer à GA4
      gtag('event', 'web_vitals', eventData);
      console.log('[Web Vitals] Envoyé à GA4:', eventData);
    }
  });

  // Exposition globale des données
  window.vitalsData = vitalsData;
})();
