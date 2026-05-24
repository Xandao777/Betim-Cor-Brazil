/**
 * Cloudflare Turnstile nos formulários públicos (se o servidor expuser site key).
 */
(function () {
  'use strict';

  var siteKey = null;
  var widgets = [];

  function loadScript() {
    return new Promise(function (resolve, reject) {
      if (window.turnstile) return resolve();
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('CAPTCHA')); };
      document.head.appendChild(s);
    });
  }

  function mountAll() {
    if (!siteKey || !window.turnstile) return;
    document.querySelectorAll('[data-turnstile]').forEach(function (el) {
      if (el.getAttribute('data-turnstile-mounted')) return;
      el.setAttribute('data-turnstile-mounted', '1');
      var id = window.turnstile.render(el, { sitekey: siteKey, theme: 'light' });
      widgets.push({ el: el, id: id });
    });
  }

  window.TurnstileForms = {
    ready: fetch('/api/config', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        siteKey = cfg.turnstileSiteKey || null;
        if (!siteKey) return;
        return loadScript().then(mountAll);
      })
      .catch(function () {}),

    getToken: function () {
      if (!siteKey || !window.turnstile) return '';
      for (var i = 0; i < widgets.length; i++) {
        var w = widgets[i];
        try {
          var t = window.turnstile.getResponse(w.id);
          if (t) return t;
        } catch (e) {}
      }
      var first = document.querySelector('[data-turnstile]');
      if (first && window.turnstile) {
        try {
          return window.turnstile.getResponse(first) || '';
        } catch (e2) {}
      }
      return '';
    },

    reset: function () {
      if (!window.turnstile) return;
      widgets.forEach(function (w) {
        try { window.turnstile.reset(w.id); } catch (e) {}
      });
    },

    isRequired: function () {
      return !!siteKey;
    }
  };
})();
