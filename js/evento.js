(function () {
  'use strict';

  var D = window.DadosSite;
  if (!D) return;

  D.ready.then(function () {

  function getParam(name) {
    var p = new URLSearchParams(window.location.search);
    return p.get(name);
  }

  function formatarData(str) {
    if (!str) return '';
    var d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function renderEvento() {
    var id = getParam('id');
    var sec = document.getElementById('evento-detalhe');
    if (!sec) return;
    var eventos = D.getEvents ? D.getEvents() : [];
    var ev = eventos.find(function (e) { return (e.id || '') === id; });

    if (!ev) {
      sec.innerHTML = '<p class="admin-aviso">Evento não encontrado. Volte à página de <a href="eventos.html">eventos</a>.</p>';
      var form = document.getElementById('evento-inscricao');
      if (form) form.style.display = 'none';
      return;
    }

    var partes = [];
    if (ev.data) partes.push(formatarData(ev.data));
    if (ev.hora) partes.push('às ' + ev.hora);
    if (ev.local) partes.push(ev.local);

    var metaHtml = partes.length ? '<p class="detalhe-evento-meta">' + partes.join(' · ') + '</p>' : '';
    var vagasHtml = ev.vagas ? '<p class="detalhe-evento-vagas">Vagas: ' + ev.vagas + (ev.inscricoesAtivas ? ' (inscrições abertas)' : ' (inscrições encerradas)') + '</p>' : '';

    var gratuitoHtml = '<p class="detalhe-evento-preco">Evento gratuito</p>';

    sec.innerHTML =
      '<section class="evento-hero">' +
        '<div class="evento-hero-info">' +
          '<p class="evento-hero-voltar"><a href="eventos.html">← Voltar para todos os eventos</a></p>' +
          '<h1>' + (ev.titulo || 'Evento') + '</h1>' +
          metaHtml +
          '<ul class="evento-hero-lista">' +
            (ev.local ? '<li><strong>Local:</strong> ' + ev.local + '</li>' : '') +
            (ev.vagas ? '<li><strong>Vagas:</strong> ' + ev.vagas + '</li>' : '') +
          '</ul>' +
          gratuitoHtml +
          (ev.inscricoesAtivas === false
            ? '<p class="admin-aviso">Inscrições encerradas para este evento.</p>'
            : '<button type="button" class="btn btn-primary btn-hero-inscricao">Inscrever-se</button>') +
        '</div>' +
        '<div class="evento-hero-media">' +
          '<div class="evento-hero-banner">' +
            '<span class="evento-hero-label">Evento da associação</span>' +
            '<span class="evento-hero-titulo">' + (ev.titulo || 'Evento') + '</span>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="evento-layout">' +
        '<div class="evento-descricao">' +
          '<h2>Descrição do evento</h2>' +
          '<p class="detalhe-evento-desc">' + (ev.descricao || '') + '</p>' +
        '</div>' +
        '<aside class="evento-lateral">' +
          '<div class="evento-lateral-card">' +
            '<h3>Informações rápidas</h3>' +
            metaHtml +
            vagasHtml +
            (ev.inscricoesAtivas === false
              ? '<p class="admin-aviso">Inscrições encerradas.</p>'
              : '<button type="button" class="btn btn-primary btn-lateral-inscricao">Inscrever-se</button>') +
          '</div>' +
        '</aside>' +
      '</section>';

    var resumo = document.getElementById('evento-resumo');
    var hidId = document.getElementById('evento-id');
    if (resumo) resumo.value = (ev.titulo || '') + (ev.data ? ' – ' + formatarData(ev.data) : '');
    if (hidId) hidId.value = ev.id || '';

    // Botões do hero e da lateral abrem o modal de inscrição
    if (ev.inscricoesAtivas !== false) {
      var btnHero = document.querySelector('.btn-hero-inscricao');
      var btnLateral = document.querySelector('.btn-lateral-inscricao');
      var secInscricao = document.getElementById('evento-inscricao');
      var boxInscricao = secInscricao && secInscricao.querySelector('.inscricao-box');
      function abrirInscricao() {
        if (secInscricao) secInscricao.classList.add('aberto');
        if (boxInscricao) boxInscricao.style.display = 'block';
      }
      if (btnHero) btnHero.addEventListener('click', abrirInscricao);
      if (btnLateral) btnLateral.addEventListener('click', abrirInscricao);
    } else {
      var formSec = document.getElementById('evento-inscricao');
      if (formSec) {
        var aviso = document.createElement('p');
        aviso.className = 'admin-aviso';
        aviso.textContent = 'As inscrições para este evento estão encerradas.';
        formSec.appendChild(aviso);
        var form = document.getElementById('form-inscricao');
        var box = formSec.querySelector('.inscricao-box');
        if (form) form.style.display = 'none';
        if (box) box.style.display = 'none';
      }
    }
  }

  function initInscricao() {
    var form = document.getElementById('form-inscricao');
    var comprovante = document.getElementById('comprovante-inscricao');
    var dados = document.getElementById('comprovante-dados');
    var btnNova = document.getElementById('btn-nova-inscricao');
    var modal = document.getElementById('evento-inscricao');
    var btnFechar = document.getElementById('btn-fechar-inscricao');

    function mostrarComprovante(info) {
      if (!comprovante || !dados) return;
      dados.innerHTML =
        '<dt>Evento</dt><dd>' + (info.eventoTitulo || '') + '</dd>' +
        '<dt>Data</dt><dd>' + formatarData(info.eventoData) + (info.eventoHora ? ' às ' + info.eventoHora : '') + '</dd>' +
        (info.eventoLocal ? '<dt>Local</dt><dd>' + info.eventoLocal + '</dd>' : '') +
        '<dt>Inscrito</dt><dd>' + (info.nome || '') + '</dd>' +
        '<dt>E-mail</dt><dd>' + (info.email || '') + '</dd>' +
        (info.telefone ? '<dt>Telefone</dt><dd>' + info.telefone + '</dd>' : '') +
        '<dt>Data da inscrição</dt><dd>' + formatarData(info.dataInscricao) + '</dd>';
      form.style.display = 'none';
      comprovante.style.display = 'block';
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = document.getElementById('nome-insc').value.trim();
        var email = document.getElementById('email-insc').value.trim();
        var telefone = (document.getElementById('telefone-insc') && document.getElementById('telefone-insc').value.trim()) || '';
        if (!nome || !email) { alert('Preencha nome e e-mail.'); return; }
        var eventoId = document.getElementById('evento-id').value;
        var eventos = D.getEvents ? D.getEvents() : [];
        var ev = eventos.find(function (e2) { return (e2.id || '') === eventoId; }) || {};
        var hoje = new Date().toISOString().slice(0, 10);
        var payload = {
          eventoId: eventoId,
          eventoTitulo: ev.titulo || '',
          eventoData: ev.data || '',
          eventoHora: ev.hora || '',
          eventoLocal: ev.local || '',
          nome: nome,
          email: email,
          telefone: telefone,
          dataInscricao: hoje
        };
        var p = D.addInscricaoPublica ? D.addInscricaoPublica(payload) : Promise.reject();
        p.then(function () {
          mostrarComprovante({
          eventoTitulo: ev.titulo || '',
          eventoData: ev.data || '',
          eventoHora: ev.hora || '',
          eventoLocal: ev.local || '',
          nome: nome,
          email: email,
          telefone: telefone,
          dataInscricao: hoje
        });
        }).catch(function (err) {
          alert(err.message || 'Não foi possível registrar a inscrição.');
        });
      });
    }

    if (btnNova && form && comprovante) {
      btnNova.addEventListener('click', function () {
        comprovante.style.display = 'none';
        form.style.display = 'block';
        form.reset();
        if (modal) modal.classList.remove('aberto');
      });
    }

    if (btnFechar && modal && form) {
      btnFechar.addEventListener('click', function () {
        modal.classList.remove('aberto');
        comprovante && (comprovante.style.display = 'none');
        form.style.display = 'block';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderEvento();
      initInscricao();
    });
  } else {
    renderEvento();
    initInscricao();
  }

  }); // D.ready
})();

