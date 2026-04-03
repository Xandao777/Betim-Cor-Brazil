(function () {
  'use strict';

  var CHAVE = 'adminSession';
  var form = document.getElementById('form-admin-login');
  var erroEl = document.getElementById('admin-login-erro');

  function mostrarErro(msg) {
    if (erroEl) {
      erroEl.textContent = msg || '';
      erroEl.style.display = msg ? 'block' : 'none';
    }
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      mostrarErro('');
      var usuario = document.getElementById('admin-usuario').value.trim();
      var senha = document.getElementById('admin-senha').value;
      var users = window.DadosSite && window.DadosSite.getAdminUsers ? window.DadosSite.getAdminUsers() : [];
      var encontrado = users.find(function (u) {
        return u.usuario.toLowerCase() === usuario.toLowerCase() && u.senha === senha;
      });
      if (encontrado) {
        var sessao = {
          id: encontrado.id,
          usuario: encontrado.usuario,
          nome: encontrado.nome,
          perfil: encontrado.perfil || 'editor',
          loginEm: new Date().toISOString()
        };
        sessionStorage.setItem(CHAVE, JSON.stringify(sessao));
        window.location.href = 'painel.html';
      } else {
        mostrarErro('Usuário ou senha incorretos.');
      }
    });
  }
})();
