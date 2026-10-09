/**
 * Web Vitals Tracking Script
 * Measures Core Web Vitals (LCP, FID/INP, CLS) and sends to GA4
 * @version 1.0.0
 */

(function() {
  'use strict';

  // GA4 Property ID (will be injected via HTML data attribute or gtag)
  const ga4PropertyId = 'G-MYYW7108EZ';

  // Store vitals data
  const vitalsData = {
    lcp: null,    // Largest Contentful Paint (ms)
    fid: null,    // First Input Delay (ms)
    inp: null,    // Interaction to Next Paint (ms)
    cls: null     // Cumulative Layout Shift (unitless 0-1)
  };

  /**
   * Log to console with [Web Vitals] prefix
   */
  function logVital(name, value, unit = '') {
    const msg = `[Web Vitals] ${name}: ${value}${unit}`;
    console.log('%c' + msg, 'color: #0066cc; font-weight: bold;');
  }

  /**
   * Send data to GA4 via gtag
   */
  function sendToGA4() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        'web_vitals_lcp': vitalsData.lcp,
        'web_vitals_fid': vitalsData.fid,
        'web_vitals_inp': vitalsData.inp,
        'web_vitals_cls': vitalsData.cls ? (vitalsData.cls * 1000).toFixed(2) : null
      });
    }
  }

  /**
   * Measure LCP (Largest Contentful Paint)
   */
  function measureLCP() {
    try {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitalsData.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
          logVital('LCP', vitalsData.lcp, 'ms');
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'], buffered: true });
      }
    } catch (e) {
      console.error('[Web Vitals] LCP measurement error:', e);
    }
  }

  /**
   * Measure FID (First Input Delay) / INP (Interaction to Next Paint)
   */
  function measureFID() {
    try {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-input') {
              vitalsData.fid = Math.round(entry.processingDuration);
              logVital('FID', vitalsData.fid, 'ms');
            }
            // INP (newer metric replacing FID)
            if (entry.interactionId !== undefined) {
              vitalsData.inp = Math.round(entry.duration);
              logVital('INP', vitalsData.inp, 'ms');
            }
          });
        });
        observer.observe({ entryTypes: ['first-input', 'interaction'], buffered: true });
      }
    } catch (e) {
      console.error('[Web Vitals] FID/INP measurement error:', e);
    }
  }

  /**
   * Measure CLS (Cumulative Layout Shift)
   */
  function measureCLS() {
    try {
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              vitalsData.cls = parseFloat(clsValue.toFixed(3));
              logVital('CLS', vitalsData.cls);
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'], buffered: true });
      }
    } catch (e) {
      console.error('[Web Vitals] CLS measurement error:', e);
    }
  }

  /**
   * Initialize all measurements on page load
   */
  function init() {
    // Start measuring immediately
    measureLCP();
    measureFID();
    measureCLS();

    // Send data to GA4 on page unload
    window.addEventListener('unload', () => {
      sendToGA4();
    });

    // Also send data when page visibility changes (tab closed/hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendToGA4();
      }
    });

    logVital('Tracking Initialized', 'LCP/FID/INP/CLS measuring...');
  }

  // Start tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for debugging
  window.vitalsData = vitalsData;
})();
