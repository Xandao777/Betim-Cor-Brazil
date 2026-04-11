(function () {
  'use strict';

  // Ano no footer
  var anoEl = document.getElementById('ano');
  if (anoEl) anoEl.textContent = new Date().getFullYear();

  // Menu mobile: toggle
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('active');
      menuToggle.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
    });
    // Fechar ao clicar em um link (mobile)
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menuToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  // Formulário de contato
  var formContato = document.getElementById('form-contato');
  if (formContato) {
    formContato.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
      formContato.reset();
    });
  }

  // Área de membros: login via API (dados globais no servidor)
  (function () {
    var CHAVE_SESSAO = 'membroLogado';
    var CHAVE_USUARIO = 'membroUsuario';
    var CHAVE_NOME = 'membroNome';
    var DS = window.DadosSite;

    var blocoLogin = document.getElementById('bloco-login');
    var blocoDashboard = document.getElementById('bloco-dashboard');
    var formLogin = document.getElementById('form-login');
    var loginErro = document.getElementById('login-erro');
    var nomeMembro = document.getElementById('nome-membro');
    var btnSair = document.getElementById('btn-sair');

    function mostrarErro(msg) {
      if (loginErro) {
        loginErro.textContent = msg;
        loginErro.style.display = msg ? 'block' : 'none';
      }
    }

    function atualizarTela() {
      var logado = !!(DS && typeof DS.isMemberSession === 'function' && DS.isMemberSession());
      if (blocoLogin) blocoLogin.style.display = logado ? 'none' : 'block';
      if (blocoDashboard) blocoDashboard.style.display = logado ? 'block' : 'none';
      if (logado && nomeMembro) {
        var nome = sessionStorage.getItem(CHAVE_NOME);
        if (!nome && DS.getMembers) {
          var u = sessionStorage.getItem(CHAVE_USUARIO);
          var mm = (DS.getMembers() || []).find(function (m) { return m.usuario === u; });
          nome = mm ? mm.nome : '';
        }
        nomeMembro.textContent = nome || 'Membro';
      }
      if (logado && typeof window.refreshAreaMembros === 'function') window.refreshAreaMembros();
    }

    if (formLogin) {
      formLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        mostrarErro('');
        var user = document.getElementById('login-email').value.trim();
        var senha = document.getElementById('login-senha').value;
        fetch('/api/auth/member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ usuario: user, senha: senha })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (!r.ok) throw new Error(data.error || 'Falha no login');
              return data;
            });
          })
          .then(function (data) {
            sessionStorage.setItem(CHAVE_SESSAO, 'true');
            sessionStorage.setItem(CHAVE_USUARIO, data.usuario);
            sessionStorage.setItem(CHAVE_NOME, data.nome);
            formLogin.reset();
            return DS && DS.refresh ? DS.refresh() : Promise.resolve();
          })
          .then(function () {
            atualizarTela();
          })
          .catch(function (err) {
            mostrarErro(err.message || 'Usuário ou senha incorretos. Tente novamente.');
          });
      });
    }

    if (btnSair) {
      btnSair.addEventListener('click', function () {
        fetch('/api/auth/logout-member', { method: 'POST', credentials: 'include' }).then(function () {
          sessionStorage.removeItem(CHAVE_SESSAO);
          sessionStorage.removeItem(CHAVE_USUARIO);
          sessionStorage.removeItem(CHAVE_NOME);
          atualizarTela();
        });
      });
    }

    if (blocoLogin && blocoDashboard && DS) {
      DS.ready.then(function () {
        atualizarTela();
      });
    }
  })();

  // Formulário de doação: mostrar campo "Outro" quando selecionado
  var formDoacao = document.getElementById('form-doacao');
  var grupoOutro = document.getElementById('grupo-outro');
  var radiosValor = formDoacao && formDoacao.querySelectorAll('input[name="valor"]');
  if (formDoacao && grupoOutro && radiosValor.length) {
    radiosValor.forEach(function (radio) {
      radio.addEventListener('change', function () {
        grupoOutro.style.display = this.value === 'outro' ? 'block' : 'none';
        if (this.value !== 'outro') document.getElementById('valor-outro').value = '';
      });
    });
    formDoacao.addEventListener('submit', function (e) {
      e.preventDefault();
      var valorOutro = document.getElementById('valor-outro');
      var selected = formDoacao.querySelector('input[name="valor"]:checked');
      if (selected && selected.value === 'outro' && (!valorOutro.value || valorOutro.value <= 0)) {
        alert('Informe o valor da doação.');
        return;
      }
      alert('Obrigado pela sua doação! Em produção, você será redirecionado ao pagamento. Verifique seu e-mail para instruções.');
      formDoacao.reset();
      grupoOutro.style.display = 'none';
    });
  }

  // Botões anterior/próximo do calendário (eventos) - apenas visual
  var btnAnt = document.getElementById('btn-ant');
  var btnProx = document.getElementById('btn-prox');
  var mesAtual = document.getElementById('mes-atual');
  if (mesAtual) {
    var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var agora = new Date();
    var indice = agora.getMonth();
    var ano = agora.getFullYear();
    function atualizarMes() {
      mesAtual.textContent = meses[indice] + ' ' + ano;
      if (window.renderEventosPorMes) {
        window.renderEventosPorMes(indice, ano);
      }
    }
    var bootMes = function () { atualizarMes(); };
    if (window.DadosSite && window.DadosSite.ready) {
      window.DadosSite.ready.then(bootMes);
    } else {
      atualizarMes();
    }
    if (btnAnt) btnAnt.addEventListener('click', function () {
      indice--;
      if (indice < 0) { indice = 11; ano--; }
      atualizarMes();
    });
    if (btnProx) btnProx.addEventListener('click', function () {
      indice++;
      if (indice > 11) { indice = 0; ano++; }
      atualizarMes();
    });
  }
})();
