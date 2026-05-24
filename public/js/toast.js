/**
 * Mensagens temporárias acessíveis (substitui alert() em fluxos públicos).
 */
(function (window) {
  'use strict';

  var container;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'site-toast-container';
    container.className = 'site-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(container);
    return container;
  }

  function show(message, type) {
    if (!message) return;
    var root = ensureContainer();
    var el = document.createElement('div');
    el.className = 'site-toast site-toast--' + (type || 'info');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = message;
    root.appendChild(el);
    window.setTimeout(function () {
      el.classList.add('site-toast--saindo');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }, type === 'error' ? 7000 : 5000);
  }

  window.SiteToast = {
    show: show,
    success: function (msg) {
      show(msg, 'success');
    },
    error: function (msg) {
      show(msg, 'error');
    },
    info: function (msg) {
      show(msg, 'info');
    }
  };
})(window);
