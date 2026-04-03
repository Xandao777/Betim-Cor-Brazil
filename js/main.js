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

  // Área de membros: login funcional (usa DadosSite.getMembers se disponível)
  (function () {
    var CHAVE_SESSAO = 'membroLogado';
    var CHAVE_USUARIO = 'membroUsuario';
    var CHAVE_NOME = 'membroNome';
    function getUsuarios() {
      if (window.DadosSite && typeof window.DadosSite.getMembers === 'function') {
        var list = window.DadosSite.getMembers() || [];
        return list.filter(function (u) { return u.ativo !== false; });
      }
      return [
        { usuario: 'membro', senha: 'demo123', nome: 'Membro' },
        { usuario: 'admin', senha: 'admin123', nome: 'Administrador' }
      ];
    }

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
      var logado = sessionStorage.getItem(CHAVE_SESSAO) === 'true';
      if (blocoLogin) blocoLogin.style.display = logado ? 'none' : 'block';
      if (blocoDashboard) blocoDashboard.style.display = logado ? 'block' : 'none';
      if (logado && nomeMembro) nomeMembro.textContent = sessionStorage.getItem(CHAVE_NOME) || 'Membro';
      if (logado && typeof window.refreshAreaMembros === 'function') window.refreshAreaMembros();
    }

    if (formLogin) {
      formLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        mostrarErro('');
        var user = document.getElementById('login-email').value.trim();
        var senha = document.getElementById('login-senha').value;
        var encontrado = getUsuarios().find(function (u) {
          return (u.usuario.toLowerCase() === user.toLowerCase()) && (u.senha === senha);
        });
        if (encontrado) {
          sessionStorage.setItem(CHAVE_SESSAO, 'true');
          sessionStorage.setItem(CHAVE_USUARIO, encontrado.usuario);
          sessionStorage.setItem(CHAVE_NOME, encontrado.nome);
          formLogin.reset();
          atualizarTela();
        } else {
          mostrarErro('Usuário ou senha incorretos. Tente novamente.');
        }
      });
    }

    if (btnSair) {
      btnSair.addEventListener('click', function () {
        sessionStorage.removeItem(CHAVE_SESSAO);
        sessionStorage.removeItem(CHAVE_USUARIO);
        sessionStorage.removeItem(CHAVE_NOME);
        atualizarTela();
      });
    }

    if (blocoLogin && blocoDashboard) {
      atualizarTela();
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
    var indice = 2; // Março
    var ano = 2025;
    function atualizarMes() {
      mesAtual.textContent = meses[indice] + ' ' + ano;
      if (window.renderEventosPorMes) {
        window.renderEventosPorMes(indice, ano);
      }
    }
    // inicializa texto e filtro
    atualizarMes();
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
