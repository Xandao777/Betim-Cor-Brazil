/**
 * Camada de dados — API Express (PostgreSQL no Railway ou arquivo local).
 * Cache em memória após GET /api/public ou /api/full ou /api/member-bootstrap.
 */
(function (window) {
  'use strict';

  var KEYS = [
    'events',
    'news',
    'blog',
    'gallery',
    'members',
    'sponsors',
    'documents',
    'institutional',
    'admin_users',
    'inscricoes',
    'mensagens_contato',
    'pedidos_doacao',
    'mensagens_membros'
  ];
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

  var sessionKind = null;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showLoadError() {
    if (document.getElementById('site-dados-erro')) return;
    var el = document.createElement('div');
    el.id = 'site-dados-erro';
    el.className = 'site-dados-erro admin-aviso';
    el.setAttribute('role', 'alert');
    el.textContent =
      'Não foi possível carregar o conteúdo do site. Verifique a ligação e atualize a página.';
    var main = document.getElementById('main') || document.body;
    if (main.firstChild) main.insertBefore(el, main.firstChild);
    else main.appendChild(el);
  }

  async function bootstrap() {
    try {
      sessionStorage.removeItem('site_admin_jwt');
      sessionStorage.removeItem('site_member_jwt');
      sessionStorage.removeItem('membroLogado');
      sessionStorage.removeItem('membroUsuario');
      sessionStorage.removeItem('membroNome');
    } catch (e) {}
    sessionKind = null;
    var r = await fetch('/api/public');
    if (!r.ok) throw new Error('Falha ao carregar dados públicos');
    var pub = await r.json();
    applyPublic(pub);

    var rs = await fetch('/api/auth/status', { credentials: 'include' });
    if (!rs.ok) return;
    var status = await rs.json();
    if (status.kind === 'admin') {
      var r2 = await fetch('/api/full', { credentials: 'include' });
      if (r2.ok) {
        applyFull(await r2.json());
        sessionKind = 'admin';
      }
      return;
    }
    if (status.kind === 'member') {
      var r3 = await fetch('/api/member-bootstrap', { credentials: 'include' });
      if (r3.ok) {
        applyFull(await r3.json());
        sessionKind = 'member';
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
        showLoadError();
        readyResolve();
      });
  }

  init();

  function putKey(key, body) {
    return fetch('/api/state/' + key, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
      cache[key] = body;
    });
  }

  window.DadosSite = {
    ready: ready,
    escapeHtml: escapeHtml,
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
    getMensagensContato: function () { return cache.mensagens_contato || []; },
    setMensagensContato: function (arr) { return putKey('mensagens_contato', arr); },
    getPedidosDoacao: function () { return cache.pedidos_doacao || []; },
    setPedidosDoacao: function (arr) { return putKey('pedidos_doacao', arr); },
    getMensagensMembros: function () { return cache.mensagens_membros || []; },
    setMensagensMembros: function (arr) { return putKey('mensagens_membros', arr); },

    sessionKind: function () {
      return sessionKind;
    },
    isMemberSession: function () {
      return sessionKind === 'member';
    },

    addInscricaoPublica: function (item) {
      return fetch('/api/inscricao/publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item)
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    },

    addInscricaoMembro: function (item) {
      return fetch('/api/inscricao/membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item)
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    },

    removeInscricaoMembro: function (eventoId) {
      return fetch('/api/inscricao/membro/' + encodeURIComponent(eventoId), {
        method: 'DELETE',
        credentials: 'include'
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    },

    salvarPerfilMembro: function (nome, email, telefone) {
      return fetch('/api/member/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nome: nome, email: email, telefone: telefone })
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || res.statusText); });
        return window.DadosSite.refresh();
      });
    }
  };
})(window);
