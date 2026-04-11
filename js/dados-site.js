/**
 * Camada de dados — servidor (Supabase ou arquivo via API Express).
 * Cache local após GET /api/public ou /api/full ou /api/member-bootstrap.
 */
(function (window) {
  'use strict';

  var KEYS = ['events', 'news', 'blog', 'gallery', 'members', 'sponsors', 'documents', 'institutional', 'admin_users', 'inscricoes'];
  var cache = {};
  var readyResolve;
  var ready = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  function applyPublic(pub) {
    cache.events = pub.events || [];
    cache.news = pub.news || [];
    cache.blog = pub.blog || [];
    cache.gallery = pub.gallery || [];
    cache.sponsors = pub.sponsors || [];
    cache.institutional = pub.institutional || {};
  }

  function applyFull(full) {
    KEYS.forEach(function (k) {
      if (full[k] !== undefined) cache[k] = full[k];
    });
  }

  function authHeaderAdmin() {
    var t = sessionStorage.getItem('site_admin_jwt');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  function authHeaderMember() {
    var t = sessionStorage.getItem('site_member_jwt');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  async function bootstrap() {
    var r = await fetch('/api/public');
    if (!r.ok) throw new Error('Falha ao carregar dados públicos');
    var pub = await r.json();
    applyPublic(pub);

    var adminT = sessionStorage.getItem('site_admin_jwt');
    var memT = sessionStorage.getItem('site_member_jwt');
    if (adminT) {
      var r2 = await fetch('/api/full', { headers: { Authorization: 'Bearer ' + adminT } });
      if (r2.ok) {
        applyFull(await r2.json());
      }
    } else if (memT) {
      var r3 = await fetch('/api/member-bootstrap', { headers: { Authorization: 'Bearer ' + memT } });
      if (r3.ok) {
        applyFull(await r3.json());
      }
    }
  }

  function init() {
    bootstrap()
      .then(function () {
        readyResolve();
      })
      .catch(function (e) {
        console.error(e);
        readyResolve();
      });
  }

  init();

  function putKey(key, body) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, authHeaderAdmin());
    return fetch('/api/state/' + key, {
      method: 'PUT',
      headers: h,
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
      cache[key] = body;
    });
  }

  window.DadosSite = {
    ready: ready,
    refresh: function () {
      return bootstrap();
    },
    get: function (entidade) {
      var map = {
        events: 'events',
        news: 'news',
        blog: 'blog',
        gallery: 'gallery',
        members: 'members',
        sponsors: 'sponsors',
        institutional: 'institutional',
        documents: 'documents',
        adminUsers: 'admin_users',
        inscricoes: 'inscricoes'
      };
      var k = map[entidade];
      return k ? cache[k] : null;
    },
    getEvents: function () { return cache.events || []; },
    setEvents: function (arr) { return putKey('events', arr); },
    getNews: function () { return cache.news || []; },
    setNews: function (arr) { return putKey('news', arr); },
    getBlog: function () { return cache.blog || []; },
    setBlog: function (arr) { return putKey('blog', arr); },
    getGallery: function () { return cache.gallery || []; },
    setGallery: function (arr) { return putKey('gallery', arr); },
    getMembers: function () { return cache.members || []; },
    setMembers: function (arr) { return putKey('members', arr); },
    getSponsors: function () { return cache.sponsors || []; },
    setSponsors: function (arr) { return putKey('sponsors', arr); },
    getInstitutional: function () { return cache.institutional || {}; },
    setInstitutional: function (obj) { return putKey('institutional', obj); },
    getDocuments: function () { return cache.documents || []; },
    setDocuments: function (arr) { return putKey('documents', arr); },
    getAdminUsers: function () { return cache.admin_users || []; },
    getInscricoes: function () { return cache.inscricoes || []; },
    setInscricoes: function (arr) { return putKey('inscricoes', arr); },

    addInscricaoPublica: function (item) {
      return fetch('/api/inscricao/publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    },

    addInscricaoMembro: function (item) {
      return fetch('/api/inscricao/membro', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaderMember()),
        body: JSON.stringify(item)
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    },

    removeInscricaoMembro: function (eventoId) {
      return fetch('/api/inscricao/membro/' + encodeURIComponent(eventoId), {
        method: 'DELETE',
        headers: authHeaderMember()
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    },

    salvarPerfilMembro: function (nome, email, telefone) {
      return fetch('/api/member/perfil', {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaderMember()),
        body: JSON.stringify({ nome: nome, email: email, telefone: telefone })
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    }
  };
})(window);
