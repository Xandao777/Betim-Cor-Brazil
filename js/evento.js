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

  function esc(s) {
    return D.escapeHtml ? D.escapeHtml(s) : String(s == null ? '' : s);
  }

  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  function heroMediaHtml(ev) {
    var capa = (ev.imagemCapa || '').trim();
    if (capa) {
      return (
        '<div class="evento-hero-media evento-hero-media--foto">' +
        '<img class="evento-hero-img" src="' +
        escAttr(capa) +
        '" alt="' +
        escAttr(ev.titulo || 'Capa do evento') +
        '" loading="eager">' +
        '</div>'
      );
    }
    return (
      '<div class="evento-hero-media">' +
      '<div class="evento-hero-banner">' +
      '<span class="evento-hero-label">Evento da associação</span>' +
      '<span class="evento-hero-titulo">' +
      esc(ev.titulo || 'Evento') +
      '</span>' +
      '</div>' +
      '</div>'
    );
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

    var metaHtml = partes.length ? '<p class="detalhe-evento-meta">' + esc(partes.join(' · ')) + '</p>' : '';
    var vagasHtml = ev.vagas
      ? '<p class="detalhe-evento-vagas">Vagas: ' + esc(String(ev.vagas)) + (ev.inscricoesAtivas ? ' (inscrições abertas)' : ' (inscrições encerradas)') + '</p>'
      : '';

    var gratuitoHtml = '<p class="detalhe-evento-preco">Evento gratuito</p>';

    var pageUrl = 'evento.html?id=' + encodeURIComponent(ev.id || '');
    if (window.SiteSeo) {
      window.SiteSeo.apply({
        title: (ev.titulo || 'Evento') + ' | Associação',
        description: (ev.descricao || '').slice(0, 200) || 'Evento da associação.',
        ogTitle: ev.titulo || 'Evento',
        image: ev.imagemCapa || '',
        url: pageUrl,
        ogType: 'article'
      });
    } else {
      document.title = (ev.titulo || 'Evento') + ' | Associação';
    }

    sec.innerHTML =
      '<section class="evento-hero">' +
        '<div class="evento-hero-info">' +
          '<p class="evento-hero-voltar"><a href="eventos.html">← Voltar para todos os eventos</a></p>' +
          '<h1>' + esc(ev.titulo || 'Evento') + '</h1>' +
          metaHtml +
          '<ul class="evento-hero-lista">' +
            (ev.local ? '<li><strong>Local:</strong> ' + esc(ev.local) + '</li>' : '') +
            (ev.vagas ? '<li><strong>Vagas:</strong> ' + esc(String(ev.vagas)) + '</li>' : '') +
          '</ul>' +
          gratuitoHtml +
          (ev.inscricoesAtivas === false
            ? '<p class="admin-aviso">Inscrições encerradas para este evento.</p>'
            : '<button type="button" class="btn btn-primary btn-hero-inscricao">Inscrever-se</button>') +
        '</div>' +
        heroMediaHtml(ev) +
      '</section>' +
      '<section class="evento-layout">' +
        '<div class="evento-descricao">' +
          '<h2>Descrição do evento</h2>' +
          '<p class="detalhe-evento-desc">' + esc(ev.descricao || '') + '</p>' +
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
      var focusBeforeModal = null;
      function abrirInscricao() {
        if (secInscricao) {
          focusBeforeModal = document.activeElement;
          secInscricao.classList.add('aberto');
          secInscricao.setAttribute('aria-hidden', 'false');
        }
        if (boxInscricao) {
          boxInscricao.style.display = 'block';
          var first = boxInscricao.querySelector('input:not([type="hidden"]):not([readonly]), textarea, button');
          if (first) first.focus();
        }
      }
      window._eventoFocusBeforeModal = function () {
        return focusBeforeModal;
      };
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
    var boxInscricao = modal && modal.querySelector('.inscricao-box');
    var btnFechar = document.getElementById('btn-fechar-inscricao');

    function mostrarComprovante(info) {
      if (!comprovante || !dados) return;
      dados.innerHTML =
        '<dt>Evento</dt><dd>' + esc(info.eventoTitulo || '') + '</dd>' +
        '<dt>Data</dt><dd>' + esc(formatarData(info.eventoData) + (info.eventoHora ? ' às ' + info.eventoHora : '')) + '</dd>' +
        (info.eventoLocal ? '<dt>Local</dt><dd>' + esc(info.eventoLocal) + '</dd>' : '') +
        '<dt>Inscrito</dt><dd>' + esc(info.nome || '') + '</dd>' +
        '<dt>E-mail</dt><dd>' + esc(info.email || '') + '</dd>' +
        (info.telefone ? '<dt>Telefone</dt><dd>' + esc(info.telefone) + '</dd>' : '') +
        '<dt>Data da inscrição</dt><dd>' + esc(formatarData(info.dataInscricao)) + '</dd>';
      form.style.display = 'none';
      comprovante.style.display = 'block';
      var btnPrint = document.getElementById('btn-imprimir-comprovante');
      if (btnPrint) btnPrint.style.display = 'inline-block';
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = document.getElementById('nome-insc').value.trim();
        var email = document.getElementById('email-insc').value.trim();
        var telefone = (document.getElementById('telefone-insc') && document.getElementById('telefone-insc').value.trim()) || '';
        if (!nome || !email) {
          if (window.SiteToast) window.SiteToast.error('Preencha nome e e-mail.');
          else alert('Preencha nome e e-mail.');
          return;
        }
        var consent = document.getElementById('consent-insc');
        if (consent && !consent.checked) {
          if (window.SiteToast) window.SiteToast.error('Aceite a política de privacidade.');
          else alert('Aceite a política de privacidade.');
          return;
        }
        var eventoId = document.getElementById('evento-id').value;
        var eventos = D.getEvents ? D.getEvents() : [];
        var ev = eventos.find(function (e2) { return (e2.id || '') === eventoId; }) || {};
        var hoje = new Date().toISOString().slice(0, 10);
        var hp = document.getElementById('website-insc');
        var payload = {
          eventoId: eventoId,
          eventoTitulo: ev.titulo || '',
          eventoData: ev.data || '',
          eventoHora: ev.hora || '',
          eventoLocal: ev.local || '',
          nome: nome,
          email: email,
          telefone: telefone,
          dataInscricao: hoje,
          website: hp ? hp.value : '',
          consentimento: true
        };
        var prep =
          window.TurnstileForms && window.TurnstileForms.ready
            ? window.TurnstileForms.ready
            : Promise.resolve();
        prep
          .then(function () {
            if (window.TurnstileForms && window.TurnstileForms.isRequired()) {
              var tok = window.TurnstileForms.getToken();
              if (!tok) throw new Error('Confirme a verificação de segurança (CAPTCHA).');
              payload.turnstileToken = tok;
            }
            return D.addInscricaoPublica ? D.addInscricaoPublica(payload) : Promise.reject();
          })
          .then(function () {
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
          if (window.TurnstileForms) window.TurnstileForms.reset();
        })
          .catch(function (err) {
            if (window.SiteToast) window.SiteToast.error(err.message || 'Não foi possível registrar a inscrição.');
            else alert(err.message || 'Não foi possível registrar a inscrição.');
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
      function fecharModal() {
        modal.classList.remove('aberto');
        modal.setAttribute('aria-hidden', 'true');
        if (comprovante) comprovante.style.display = 'none';
        form.style.display = 'block';
        var bp = document.getElementById('btn-imprimir-comprovante');
        if (bp) bp.style.display = 'none';
        var prev = window._eventoFocusBeforeModal && window._eventoFocusBeforeModal();
        if (prev && typeof prev.focus === 'function') prev.focus();
      }
      btnFechar.addEventListener('click', fecharModal);
      modal.addEventListener('click', function (evClick) {
        if (evClick.target === modal) fecharModal();
      });
      document.addEventListener('keydown', function (evKey) {
        if (evKey.key === 'Escape' && modal.classList.contains('aberto')) fecharModal();
        if (evKey.key === 'Tab' && modal.classList.contains('aberto') && boxInscricao) {
          var focusable = boxInscricao.querySelectorAll(
            'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href]'
          );
          if (focusable.length < 2) return;
          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          if (evKey.shiftKey && document.activeElement === first) {
            evKey.preventDefault();
            last.focus();
          } else if (!evKey.shiftKey && document.activeElement === last) {
            evKey.preventDefault();
            first.focus();
          }
        }
      });
    }

    var btnPrint = document.getElementById('btn-imprimir-comprovante');
    if (btnPrint) {
      btnPrint.addEventListener('click', function () {
        window.print();
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

