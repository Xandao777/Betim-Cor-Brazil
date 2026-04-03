/**
 * Área pública: preenche eventos, notícias, blog, galeria e patrocinadores
 * a partir do localStorage (dados editados pelo admin).
 * Incluir após dados-site.js nas páginas que precisam exibir esse conteúdo.
 */
(function () {
  'use strict';
  var D = window.DadosSite;
  if (!D) return;

  function formatarData(str) {
    if (!str) return { dia: '-', mes: '-', ano: '' };
    var d = new Date(str + 'T12:00:00');
    var mes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][d.getMonth()];
    return { dia: d.getDate(), mes: mes, ano: d.getFullYear() };
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
    var container = document.querySelector('.pagina-interna .lista-posts');
    if (!container || window.location.href.indexOf('blog') === -1) return;
    var list = (D.getBlog() || []).filter(function (b) { return b.publicado !== false; });
    if (list.length === 0) return;
    container.innerHTML = list.map(function (b) {
      return '<article class="post-card"><div class="post-card-img" aria-hidden="true"></div><div><span class="tag">' + (b.categoria || '') + '</span><h3>' + (b.titulo || '') + '</h3><p class="meta">' + (b.dataPublicacao || '') + '</p><p>' + (b.resumo || '') + '</p><a href="#" class="link-cta">Ler e comentar</a></div></article>';
    }).join('');
  })();

  // ---- Galeria ----
  (function () {
    var container = document.querySelector('.galeria-full');
    if (!container) return;
    var list = D.getGallery() || [];
    if (list.length === 0) {
      container.innerHTML = '<p class="galeria-vazio">Nenhuma mídia na galeria no momento.</p>';
      return;
    }
    container.innerHTML = list.map(function (g) {
      var inner;
      if (g.tipo === 'video' && g.url) {
        inner = '<video src="' + g.url + '" controls playsinline preload="metadata" title="' + (g.titulo || '') + '"></video>';
      } else if (g.url) {
        inner = '<img src="' + g.url + '" alt="' + (g.titulo || '') + '">';
      } else {
        inner = '<div class="galeria-placeholder">' + (g.titulo || '') + '</div>';
      }
      var wrap = g.tipo === 'video' && g.url
        ? '<div class="galeria-item galeria-item-video">' + inner + '</div>'
        : '<a href="' + (g.url || '#') + '" class="galeria-item">' + inner + '</a>';
      var legParts = [g.categoria, g.titulo].filter(Boolean);
      var leg = legParts.length ? '<figcaption>' + legParts.join(' · ') + '</figcaption>' : '';
      return '<figure class="galeria-figure">' + wrap + leg + '</figure>';
    }).join('');
  })();

  // ---- Patrocinadores (home) ----
  (function () {
    var container = document.querySelector('.patrocinadores-grid');
    if (!container) return;
    var list = D.getSponsors() || [];
    if (list.length === 0) {
      container.innerHTML = '<div class="patrocinador-item">Nenhum patrocinador cadastrado no momento.</div>';
      return;
    }
    container.innerHTML = list.map(function (p) {
      if (p.logo) return '<div class="patrocinador-item"><img src="' + p.logo + '" alt="' + (p.nome || '') + '" style="max-height:60px;max-width:120px;"></div>';
      return '<div class="patrocinador-item">' + (p.nome || '') + '</div>';
    }).join('');
  })();

  // ---- Conteúdo institucional: elementos com data-institucional ----
  (function () {
    var inst = D.getInstitutional() || {};
    document.querySelectorAll('[data-institucional]').forEach(function (el) {
      var key = el.getAttribute('data-institucional');
      var val = inst[key];
      if (val === undefined) return;
      if (key === 'objetivos' && Array.isArray(val)) {
        el.innerHTML = '<ul><li>' + val.join('</li><li>') + '</li></ul>';
      } else if (typeof val === 'string') {
        el.textContent = val;
      }
    });
  })();
})();
