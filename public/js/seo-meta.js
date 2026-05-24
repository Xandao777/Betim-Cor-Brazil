/**
 * Atualiza title, description, Open Graph e canonical (partilha WhatsApp / SEO).
 */
(function () {
  'use strict';

  function setMetaName(name, content) {
    if (!content) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setMetaProperty(prop, content) {
    if (!content) return;
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setCanonical(href) {
    if (!href) return;
    var el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function absUrl(pathOrUrl) {
    var u = (pathOrUrl || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    try {
      return new URL(u.replace(/^\//, ''), window.location.origin + '/').href;
    } catch (e) {
      return u;
    }
  }

  window.SiteSeo = {
    apply: function (opts) {
      opts = opts || {};
      var title = opts.title || '';
      var desc = opts.description || opts.desc || '';
      var img = absUrl(opts.image || opts.ogImage || '');
      var url = absUrl(opts.url || opts.canonical || window.location.href);

      if (title) document.title = title;
      if (desc) setMetaName('description', desc);
      if (title) setMetaProperty('og:title', opts.ogTitle || title);
      if (desc) setMetaProperty('og:description', desc);
      setMetaProperty('og:type', opts.ogType || 'article');
      if (url) {
        setMetaProperty('og:url', url);
        setCanonical(url);
      }
      if (img) setMetaProperty('og:image', img);
      else {
        var ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg && !ogImg.getAttribute('content')) ogImg.remove();
      }
    }
  };
})();
