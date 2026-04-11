/**
 * Área pública: preenche eventos, notícias, blog, galeria e patrocinadores
 * a partir da API (/api/public), alimentada pelo painel admin.
 * Incluir após dados-site.js nas páginas que precisam exibir esse conteúdo.
 */
(function () {
  'use strict';
  var D = window.DadosSite;
  if (!D) return;

  D.ready.then(function () {

  function formatarData(str) {
    if (!str) return { dia: '-', mes: '-', ano: '' };
    var d = new Date(str + 'T12:00:00');
    var mes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][d.getMonth()];
    return { dia: d.getDate(), mes: mes, ano: d.getFullYear() };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- Página de eventos: listar eventos publicados (com filtro de mês) ----
  (function () {
    var container = document.querySelector('.lista-eventos');
    if (!container) return;
    var titulo = container.querySelector('h2');
    var todosEventos = (D.getEvents() || []).filter(function (e) { return e.publicado !== false; }).sort(function (a, b) { return (a.data || '').localeCompare(b.data || ''); });

    function renderEventosPorMes(indiceMes, ano) {
      var artigosEavisos = container.querySelectorAll('article.item-evento, p.evento-mes-vazio');
      artigosEavisos.forEach(function (el) { el.remove(); });

      var lista = todosEventos;
      if (typeof indiceMes === 'number' && !isNaN(indiceMes) && typeof ano === 'number') {
        lista = todosEventos.filter(function (e) {
          if (!e.data) return false;
          var d = new Date(e.data + 'T12:00:00');
          return d.getMonth() === indiceMes && d.getFullYear() === ano;
        });
      }

      if (lista.length === 0) {
        var aviso = document.createElement('p');
        aviso.className = 'admin-aviso evento-mes-vazio';
        aviso.textContent = 'Nenhum evento encontrado para este mês.';
        container.appendChild(aviso);
        return;
      }

      lista.forEach(function (e) {
        var fd = formatarData(e.data);
        var meta = [];
        if (e.data) meta.push(fd.dia + ' ' + fd.mes + ' ' + fd.ano);
        if (e.hora) meta.push(e.hora);
        if (e.local) meta.push(e.local);
        var art = document.createElement('article');
        art.className = 'item-evento';
        var href = 'evento.html?id=' + encodeURIComponent(e.id || '');
        art.innerHTML =
          '<a href=\"' + href + '\" class=\"item-evento-link-externo\" aria-label=\"Ver página do evento ' + (e.titulo || '') + '\">' +
            '<div class=\"item-evento-data\"><span class=\"dia\">' + fd.dia + '</span><span class=\"mes\">' + fd.mes + '</span></div>' +
            '<div>' +
              '<h3>' + (e.titulo || '') + '</h3>' +
              (meta.length ? '<p class=\"item-evento-meta\">' + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</p>' : '') +
              '<p>' + (e.descricao || '') + '</p>' +
              '<span class=\"link-cta\">Ver detalhes do evento</span>' +
            '</div>' +
          '</a>';
        if (titulo && titulo.nextSibling) container.insertBefore(art, titulo.nextSibling);
        else container.appendChild(art);
      });
    }

    // expõe função para o controle dos botões de mês em main.js
    window.renderEventosPorMes = renderEventosPorMes;
    // render inicial: todos os eventos
    renderEventosPorMes();
  })();

  // ---- Home: eventos em destaque (até 3, cada card leva para evento.html?id=...) ----
  (function () {
    var container = document.querySelector('.eventos-cards');
    if (!container) return;
    var list = (D.getEvents() || []).filter(function (e) { return e.publicado !== false && e.destaque; }).sort(function (a, b) { return (a.data || '').localeCompare(b.data || ''); }).slice(0, 3);
    if (list.length === 0) return;
    var html = list.map(function (e) {
      var fd = formatarData(e.data);
      var href = 'evento.html?id=' + encodeURIComponent(e.id || '');
      return '<article class="card card-evento"><div class="card-evento-data"><span class="dia">' + fd.dia + '</span><span class="mes">' + fd.mes + '</span></div><h3>' + (e.titulo || '') + '</h3><p>' + (e.descricao || '') + '</p><a href="' + href + '" class="link-cta">Ver página do evento</a></article>';
    }).join('');
    container.innerHTML = html;
  })();

  // ---- Home: notícias em destaque ----
  (function () {
    var container = document.querySelector('.noticias-grid');
    if (!container) return;
    var list = (D.getNews() || []).filter(function (n) { return n.publicado !== false; }).slice(0, 6);
    if (list.length === 0) return;
    container.innerHTML = list.map(function (n) {
      return '<article class="card card-noticia"><div class="card-noticia-img" style="background: linear-gradient(135deg, var(--vermelho), var(--amarelo-verde));"></div><div class="card-noticia-body"><span class="tag">' + (n.categoria || '') + '</span><h3>' + (n.titulo || '') + '</h3><p>' + (n.resumo || '') + '</p><a href="noticias.html" class="link-cta">Ler mais</a></div></article>';
    }).join('');
  })();

  // ---- Página notícias: lista de notícias ----
  (function () {
    var container = document.querySelector('.pagina-interna .lista-posts');
    if (!container || window.location.href.indexOf('noticias') === -1) return;
    var list = (D.getNews() || []).filter(function (n) { return n.publicado !== false; });
    if (list.length === 0) return;
    container.innerHTML = list.map(function (n) {
      return '<article class="post-card"><div class="post-card-img" aria-hidden="true"></div><div><span class="tag">' + (n.categoria || '') + '</span><h3>' + (n.titulo || '') + '</h3><p class="meta">' + (n.dataPublicacao || '') + '</p><p>' + (n.resumo || '') + '</p><a href="#" class="link-cta">Ler mais</a></div></article>';
    }).join('');
  })();

  // ---- Página blog: lista de postagens ----
  (function () {
    var path = (window.location.pathname || '').replace(/\\/g, '/');
    if (!/blog\.html$/i.test(path)) return;
    var container = document.querySelector('.pagina-interna .lista-posts');
    if (!container) return;
    var list = (D.getBlog() || []).filter(function (b) { return b.publicado !== false; }).sort(function (a, b) {
      return (b.dataPublicacao || '').localeCompare(a.dataPublicacao || '');
    });
    if (list.length === 0) {
      container.innerHTML = '<p class="galeria-vazio">Nenhuma postagem publicada no momento.</p>';
      return;
    }
    container.innerHTML = list.map(function (b) {
      var fd = formatarData(b.dataPublicacao);
      var meta = fd.dia + ' ' + fd.mes + ' ' + fd.ano;
      var href = 'blog-post.html?id=' + encodeURIComponent(String(b.id));
      return '<article class="post-card"><div class="post-card-img" aria-hidden="true"></div><div><span class="tag">' + escapeHtml(b.categoria || '') + '</span><h3>' + escapeHtml(b.titulo || '') + '</h3><p class="meta">' + escapeHtml(meta) + '</p><p>' + escapeHtml(b.resumo || '') + '</p><a href="' + href + '" class="link-cta">Ler postagem</a></div></article>';
    }).join('');
  })();

  // ---- Página artigo do blog (blog-post.html?id=) ----
  (function () {
    var path = (window.location.pathname || '').replace(/\\/g, '/');
    if (!/blog-post\.html$/i.test(path)) return;
    var root = document.getElementById('blog-post-artigo');
    if (!root) return;
    var params = new URLSearchParams(window.location.search);
    var pid = params.get('id');
    if (!pid) {
      root.innerHTML = '<p class="galeria-vazio">Nenhum post indicado.</p>';
      return;
    }
    var list = D.getBlog() || [];
    var b = list.find(function (x) { return String(x.id) === String(pid); });
    if (!b || b.publicado === false) {
      root.innerHTML = '<p class="galeria-vazio">Post não encontrado ou não publicado.</p>';
      return;
    }
    var fd = formatarData(b.dataPublicacao);
    var meta = (b.categoria ? escapeHtml(b.categoria) + ' · ' : '') + escapeHtml(String(fd.dia) + ' ' + fd.mes + ' ' + fd.ano);
    var raw = (b.conteudo || '').trim();
    var conteudo;
    if (raw) {
      conteudo = escapeHtml(raw).replace(/\r\n/g, '\n').split(/\n\n+/).map(function (block) {
        return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
      }).join('');
    } else {
      conteudo = '<p class="intro">' + escapeHtml(b.resumo || '') + '</p>';
    }
    root.innerHTML =
      '<header class="blog-post-cabecalho"><p class="tag">' + escapeHtml(b.categoria || '') + '</p><h1>' + escapeHtml(b.titulo || '') + '</h1><p class="meta blog-post-meta">' + meta + '</p></header>' +
      '<div class="blog-post-texto">' + conteudo + '</div>' +
      '<p class="section-cta"><a href="blog.html" class="btn btn-outline">← Voltar ao blog</a></p>';
    try {
      document.title = (b.titulo || 'Post') + ' | Blog | Associação';
    } catch (e) {}
  })();

  // ---- Galeria ----
  (function () {
    var container = document.querySelector('.galeria-full');
    if (!container) return;
    function escapeAttr(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    var list = D.getGallery() || [];
    if (list.length === 0) {
      container.innerHTML = '<p class="galeria-vazio">Nenhuma mídia na galeria no momento.</p>';
      return;
    }
    container.innerHTML = list.map(function (g) {
      var u = g.url || '';
      var inner;
      if (g.tipo === 'video' && u) {
        inner = '<video src="' + escapeAttr(u) + '" controls playsinline preload="metadata" title="' + escapeAttr(g.titulo || '') + '"></video>';
      } else if (u) {
        inner = '<img src="' + escapeAttr(u) + '" alt="' + escapeAttr(g.titulo || '') + '" loading="lazy">';
      } else {
        inner = '<div class="galeria-placeholder">' + escapeHtml(g.titulo || '') + '</div>';
      }
      var wrap = g.tipo === 'video' && u
        ? '<div class="galeria-item galeria-item-video">' + inner + '</div>'
        : '<a href="' + escapeAttr(u || '#') + '" class="galeria-item">' + inner + '</a>';
      var legParts = [g.categoria, g.titulo].filter(Boolean);
      var leg = legParts.length ? '<figcaption>' + legParts.map(function (x) { return escapeHtml(x); }).join(' · ') + '</figcaption>' : '';
      return '<figure class="galeria-figure">' + wrap + leg + '</figure>';
    }).join('');
  })();

  // ---- Patrocinadores (home) ----
  (function () {
    var container = document.querySelector('.patrocinadores-grid');
    if (!container) return;
    function escapeAttr(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function normalizePatrocUrl(s) {
      s = (s || '').trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      return 'https://' + s;
    }
    var list = D.getSponsors() || [];
    if (list.length === 0) {
      container.innerHTML = '<p class="patrocinadores-vazio">Nenhum patrocinador cadastrado no momento.</p>';
      return;
    }
    container.innerHTML = list.map(function (p) {
      var url = normalizePatrocUrl(p.url);
      var desc = (p.descricao || '').trim();
      var titleAttr = desc ? ' title="' + escapeAttr(desc) + '"' : '';
      var inner;
      if (p.logo && String(p.logo).trim()) {
        inner = '<img src="' + escapeAttr(p.logo) + '" alt="' + escapeAttr(p.nome || '') + '" loading="lazy" style="max-height:60px;max-width:120px;">';
      } else {
        inner = escapeHtml(p.nome || '');
      }
      if (url) {
        return '<a class="patrocinador-item patrocinador-item--link"' + titleAttr + ' href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
      }
      return '<div class="patrocinador-item"' + titleAttr + '>' + inner + '</div>';
    }).join('');
  })();

  // ---- Conteúdo institucional: textos (data-institucional) + redes (data-inst-href) ----
  (function () {
    var inst = D.getInstitutional() || {};

    function normalizeSocialUrl(s) {
      s = (s || '').trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      return 'https://' + s;
    }

    document.querySelectorAll('[data-institucional]').forEach(function (el) {
      var key = el.getAttribute('data-institucional');
      var val = inst[key];
      if (val === undefined || val === null) return;
      if (key === 'objetivos' && Array.isArray(val)) {
        el.innerHTML = '<ul><li>' + val.map(function (x) { return String(x).replace(/</g, '&lt;'); }).join('</li><li>') + '</li></ul>';
      } else if (typeof val === 'string') {
        el.textContent = val;
      }
    });

    document.querySelectorAll('a[data-inst-href]').forEach(function (a) {
      var key = a.getAttribute('data-inst-href');
      if (!key || ['facebook', 'instagram', 'youtube'].indexOf(key) === -1) return;
      var url = normalizeSocialUrl(inst[key]);
      if (url) {
        a.href = url;
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.classList.remove('social-link-desativado');
        a.removeAttribute('aria-disabled');
      } else {
        a.href = '#';
        a.removeAttribute('target');
        a.setAttribute('rel', 'nofollow');
        a.classList.add('social-link-desativado');
        a.setAttribute('aria-disabled', 'true');
      }
    });

    document.querySelectorAll('a[data-inst-mailto]').forEach(function (a) {
      var em = (inst.email || '').trim();
      if (em) {
        a.href = 'mailto:' + em;
        if (!a.textContent.replace(/\s/g, '')) a.textContent = em;
      }
    });
  })();

  }); // D.ready
})();
