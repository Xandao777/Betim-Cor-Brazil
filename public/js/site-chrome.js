/**
 * Carrega cabeçalho e rodapé partilhados a partir de /partials/.
 * Expõe window.SiteChromeReady (Promise) para outros scripts.
 */
(function () {
  'use strict';

  function initMobileNav() {
    var menuToggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav');
    if (!menuToggle || !nav) return;
    menuToggle.addEventListener('click', function () {
      var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      nav.classList.toggle('active');
      menuToggle.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menuToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  function markCurrentNav() {
    var path = (window.location.pathname || '').replace(/\\/g, '/');
    var page = path.split('/').pop() || 'index.html';
    if (page === '') page = 'index.html';
    var detail = '';
    if (/^evento\.html$/i.test(page)) detail = 'eventos';
    if (/^noticia\.html$/i.test(page)) detail = 'noticias';
    if (/^blog-post\.html$/i.test(page)) detail = 'blog';
    document.querySelectorAll('.nav-list a[data-nav]').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      var match = key === page.replace('.html', '') || (detail && key === detail);
      if (page === 'index.html' && key === 'index') match = true;
      if (match) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  function loadPartial(el) {
    var kind = el.getAttribute('data-site-chrome');
    if (!kind) return Promise.resolve();
    return fetch('/partials/site-' + kind + '.html', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('Partial ' + kind);
        return r.text();
      })
      .then(function (html) {
        el.outerHTML = html;
      });
  }

  var mounts = Array.prototype.slice.call(document.querySelectorAll('[data-site-chrome]'));
  window.SiteChromeReady = Promise.all(mounts.map(loadPartial))
    .then(function () {
      initMobileNav();
      markCurrentNav();
      var anoEl = document.getElementById('ano');
      if (anoEl) anoEl.textContent = new Date().getFullYear();
    })
    .catch(function (err) {
      console.error('[site-chrome]', err);
    });
})();
