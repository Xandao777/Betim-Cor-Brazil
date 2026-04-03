/**
 * Área de membros: navegação, dashboard, perfil, documentos, relatórios, eventos, notícias, voluntariado, suporte.
 */
(function () {
  'use strict';

  var D = window.DadosSite;
  var CHAVE_USUARIO = 'membroUsuario';

  function getUsuarioLogado() {
    var user = sessionStorage.getItem(CHAVE_USUARIO);
    if (!user || !D) return null;
    var list = D.getMembers() || [];
    return list.find(function (m) { return m.usuario === user && m.ativo !== false; }) || null;
  }

  function formatarData(str) {
    if (!str) return { dia: '-', mes: '-', ano: '' };
    var d = new Date(str + 'T12:00:00');
    var mes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][d.getMonth()];
    return { dia: d.getDate(), mes: mes, ano: d.getFullYear() };
  }

  function mostrarSecao(id) {
    document.querySelectorAll('.membro-secao').forEach(function (s) { s.classList.remove('ativo'); });
    document.querySelectorAll('.membro-sidebar a[data-secao]').forEach(function (a) { a.classList.remove('ativo'); });
    var secao = document.getElementById('secao-' + id);
    var link = document.querySelector('.membro-sidebar a[data-secao="' + id + '"]');
    if (secao) secao.classList.add('ativo');
    if (link) link.classList.add('ativo');
    if (id === 'inicio') preencherDashboard();
    if (id === 'perfil') preencherPerfil();
    if (id === 'documentos') preencherDocumentos();
    if (id === 'relatorios') preencherRelatorios();
    if (id === 'eventos') preencherEventos();
    if (id === 'noticias') preencherNoticiasInternas();
  }

  function preencherDashboard() {
    var eventos = (D && D.getEvents()) ? D.getEvents() : [];
    var proximos = eventos.filter(function (e) { return e.publicado !== false && (e.data || '') >= new Date().toISOString().slice(0, 10); }).sort(function (a, b) { return (a.data || '').localeCompare(b.data); }).slice(0, 3);
    var el = document.getElementById('lista-dashboard-eventos');
    if (el) {
      if (proximos.length === 0) el.innerHTML = '<p class="admin-aviso">Nenhum evento próximo no momento.</p>';
      else el.innerHTML = proximos.map(function (e) {
        var fd = formatarData(e.data);
        return '<p><strong>' + (e.titulo || '') + '</strong> – ' + fd.dia + ' ' + fd.mes + ' ' + fd.ano + (e.local ? ' · ' + e.local : '') + '</p>';
      }).join('');
    }
    var inscricoes = (D && D.getInscricoes()) ? D.getInscricoes() : [];
    var user = sessionStorage.getItem(CHAVE_USUARIO);
    var minhas = inscricoes.filter(function (i) { return i.membroUsuario === user; });
    var elIns = document.getElementById('lista-dashboard-inscricoes');
    if (elIns) {
      if (minhas.length === 0) elIns.innerHTML = '<p class="admin-aviso">Você ainda não se inscreveu em nenhum evento.</p>';
      else elIns.innerHTML = '<ul class="lista-recursos">' + minhas.map(function (i) { return '<li><span class="doc-icon">📅</span> ' + (i.eventoTitulo || 'Evento') + ' – ' + (i.eventoData || '') + '</li>'; }).join('') + '</ul>';
    }
    var docs = (D && D.getDocuments()) ? D.getDocuments() : [];
    var visiveis = docs.filter(function (d) { return d.visivel !== false && d.categoria !== 'relatorio'; }).slice(0, 5);
    var elDocs = document.getElementById('lista-dashboard-docs');
    if (elDocs) {
      elDocs.innerHTML = visiveis.map(function (d) {
        var link = d.arquivo ? '<a href="' + d.arquivo + '" target="_blank" rel="noopener">' + (d.titulo || '') + '</a>' : (d.titulo || '');
        return '<li><span class="doc-icon">📄</span> ' + link + '</li>';
      }).join('');
      if (visiveis.length === 0) elDocs.innerHTML = '<li class="admin-aviso">Nenhum documento recente.</li>';
    }
  }

  function preencherPerfil() {
    var m = getUsuarioLogado();
    if (!m) return;
    var nome = document.getElementById('perfil-nome');
    var email = document.getElementById('perfil-email');
    var telefone = document.getElementById('perfil-telefone');
    var tipo = document.getElementById('perfil-tipo');
    if (nome) nome.value = m.nome || '';
    if (email) email.value = m.email || '';
    if (telefone) telefone.value = m.telefone || '';
    if (tipo) tipo.value = m.tipoAssociado || 'Associado';
  }

  function salvarPerfil() {
    var m = getUsuarioLogado();
    if (!m || !D) return;
    var list = D.getMembers() || [];
    var idx = list.findIndex(function (x) { return x.id === m.id; });
    if (idx < 0) return;
    list[idx] = Object.assign({}, list[idx], {
      nome: document.getElementById('perfil-nome').value.trim(),
      email: document.getElementById('perfil-email').value.trim(),
      telefone: document.getElementById('perfil-telefone').value.trim()
    });
    D.setMembers(list);
    sessionStorage.setItem('membroNome', list[idx].nome);
    var nomeHeader = document.getElementById('nome-membro');
    if (nomeHeader) nomeHeader.textContent = list[idx].nome;
  }

  function preencherDocumentos(categoria) {
    var docs = (D && D.getDocuments()) ? D.getDocuments() : [];
    var visiveis = docs.filter(function (d) {
      if (d.visivel === false || d.categoria === 'relatorio') return false;
      if (categoria) return d.categoria === categoria;
      return true;
    });
    var ul = document.getElementById('lista-documentos-membro');
    var vazio = document.getElementById('documentos-vazio');
    if (!ul) return;
    ul.innerHTML = visiveis.map(function (d) {
      var link = d.arquivo ? '<a href="' + d.arquivo + '" target="_blank" rel="noopener">' + (d.titulo || '') + '</a>' : (d.titulo || '');
      return '<li><span class="doc-icon">📄</span> ' + link + '</li>';
    }).join('');
    if (vazio) vazio.style.display = visiveis.length === 0 ? 'block' : 'none';
  }

  function preencherRelatorios() {
    var docs = (D && D.getDocuments()) ? D.getDocuments() : [];
    var relatorios = docs.filter(function (d) { return d.visivel !== false && d.categoria === 'relatorio'; });
    var ul = document.getElementById('lista-relatorios-membro');
    var vazio = document.getElementById('relatorios-vazio');
    if (!ul) return;
    ul.innerHTML = relatorios.map(function (d) {
      var link = d.arquivo ? '<a href="' + d.arquivo + '" target="_blank" rel="noopener">' + (d.titulo || '') + '</a>' : (d.titulo || '');
      return '<li><span class="doc-icon">📊</span> ' + link + '</li>';
    }).join('');
    if (vazio) vazio.style.display = relatorios.length === 0 ? 'block' : 'none';
  }

  function preencherEventos() {
    var eventos = (D && D.getEvents()) ? D.getEvents() : [];
    var publicados = eventos.filter(function (e) { return e.publicado !== false; }).sort(function (a, b) { return (a.data || '').localeCompare(b.data); });
    var user = sessionStorage.getItem(CHAVE_USUARIO);
    var inscricoes = (D && D.getInscricoes()) ? D.getInscricoes() : [];
    var minhas = inscricoes.filter(function (i) { return i.membroUsuario === user; });

    var ulIns = document.getElementById('lista-minhas-inscricoes');
    var insVazio = document.getElementById('inscricoes-vazio');
    if (ulIns) {
      ulIns.innerHTML = minhas.map(function (i) {
        return '<li><span class="doc-icon">📅</span> ' + (i.eventoTitulo || '') + ' – ' + (i.eventoData || '') + ' <button type="button" class="btn btn-outline btn-cancelar-inscricao" data-evento-id="' + i.eventoId + '">Cancelar</button></li>';
      }).join('');
      if (insVazio) insVazio.style.display = minhas.length === 0 ? 'block' : 'none';
    }
    ulIns && ulIns.querySelectorAll('.btn-cancelar-inscricao').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Cancelar esta inscrição?')) return;
        var id = this.getAttribute('data-evento-id');
        var list = (D.getInscricoes() || []).filter(function (i) { return !(i.membroUsuario === user && i.eventoId === id); });
        D.setInscricoes(list);
        preencherEventos();
        preencherDashboard();
      });
    });

    var container = document.getElementById('lista-eventos-membro');
    if (!container) return;
    container.innerHTML = publicados.map(function (e) {
      var fd = formatarData(e.data);
      var jaInscrito = minhas.some(function (i) { return i.eventoId === e.id; });
      var meta = [fd.dia + ' ' + fd.mes + ' ' + fd.ano];
      if (e.hora) meta.push('às ' + e.hora);
      if (e.local) meta.push(e.local);
      var btn = !jaInscrito && e.inscricoesAtivas
        ? '<button type="button" class="btn btn-primary btn-inscrever" data-evento-id="' + e.id + '" data-evento-titulo="' + (e.titulo || '').replace(/"/g, '&quot;') + '" data-evento-data="' + (e.data || '') + '" data-evento-hora="' + (e.hora || '') + '" data-evento-local="' + (e.local || '').replace(/"/g, '&quot;') + '">Inscrever-se</button>'
        : (jaInscrito ? '<span class="badge badge-ok">Inscrição confirmada</span>' : '');
      return '<article class="evento-card-membro"><div class="evento-card-data"><span class="dia">' + fd.dia + '</span><span class="mes">' + fd.mes + '</span></div><div class="evento-card-body"><h4>' + (e.titulo || '') + '</h4><p class="evento-card-meta">' + meta.join(' · ') + '</p><p class="evento-card-desc">' + (e.descricao || '') + '</p>' + (e.vagas ? '<p class="evento-card-vagas">Vagas limitadas: ' + e.vagas + '</p>' : '') + '<div class="evento-card-acoes">' + btn + '</div></div></article>';
    }).join('');

    container.querySelectorAll('.btn-inscrever').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var titulo = this.getAttribute('data-evento-titulo');
        var data = this.getAttribute('data-evento-data');
        var hora = this.getAttribute('data-evento-hora');
        var local = this.getAttribute('data-evento-local');
        var msg = 'Confirmar inscrição no evento "' + titulo + '"?\n\nData: ' + data + (hora ? ' às ' + hora : '') + (local ? '\nLocal: ' + local : '');
        if (!confirm(msg)) return;
        var list = D.getInscricoes() || [];
        list.push({
          eventoId: this.getAttribute('data-evento-id'),
          eventoTitulo: titulo,
          eventoData: data,
          eventoHora: hora || '',
          eventoLocal: local || '',
          membroUsuario: user,
          dataInscricao: new Date().toISOString().slice(0, 10)
        });
        D.setInscricoes(list);
        preencherEventos();
        preencherDashboard();
        alert('Inscrição confirmada com sucesso! Você está inscrito(a) no evento. Acompanhe em "Minhas inscrições".');
      });
    });
  }

  function preencherNoticiasInternas() {
    var news = (D && D.getNews()) ? D.getNews() : [];
    var internas = news.filter(function (n) { return n.publicado !== false && n.exclusivoMembros; });
    var container = document.getElementById('lista-noticias-internas');
    var vazio = document.getElementById('noticias-internas-vazio');
    if (!container) return;
    if (internas.length === 0) {
      container.innerHTML = '';
      if (vazio) vazio.style.display = 'block';
      return;
    }
    if (vazio) vazio.style.display = 'none';
    container.innerHTML = internas.map(function (n) {
      return '<div class="membro-card"><h4>' + (n.titulo || '') + '</h4><p class="meta">' + (n.dataPublicacao || '') + (n.categoria ? ' · ' + n.categoria : '') + '</p><p>' + (n.resumo || '') + '</p>' + (n.conteudo ? '<p>' + n.conteudo + '</p>' : '') + '</div>';
    }).join('');
  }

  function init() {
    var dashboard = document.getElementById('bloco-dashboard');
    if (!dashboard || dashboard.style.display === 'none') return;

    document.querySelectorAll('.membro-sidebar a[data-secao]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        mostrarSecao(this.getAttribute('data-secao'));
      });
    });
    var linkSair = document.getElementById('link-sair');
    if (linkSair) linkSair.addEventListener('click', function (e) { e.preventDefault(); document.getElementById('btn-sair') && document.getElementById('btn-sair').click(); });

    document.getElementById('filtro-documentos') && document.getElementById('filtro-documentos').addEventListener('change', function () {
      preencherDocumentos(this.value || undefined);
    });

    var formPerfil = document.getElementById('form-perfil');
    if (formPerfil) formPerfil.addEventListener('submit', function (e) { e.preventDefault(); salvarPerfil(); alert('Perfil atualizado.'); });

    var formVol = document.getElementById('form-voluntariado');
    if (formVol) formVol.addEventListener('submit', function (e) { e.preventDefault(); alert('Obrigado! Sua manifestação de interesse foi registrada. A associação entrará em contato.'); formVol.reset(); });

    var formSup = document.getElementById('form-suporte');
    if (formSup) formSup.addEventListener('submit', function (e) { e.preventDefault(); alert('Mensagem enviada. A diretoria responderá em breve.'); formSup.reset(); });

    preencherDashboard();
    preencherDocumentos();
    preencherRelatorios();
  }

  window.refreshAreaMembros = function () {
    preencherDashboard();
    preencherDocumentos(document.getElementById('filtro-documentos') && document.getElementById('filtro-documentos').value || undefined);
    preencherRelatorios();
    preencherEventos();
    preencherNoticiasInternas();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
