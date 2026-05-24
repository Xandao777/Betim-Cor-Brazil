(function () {
  'use strict';

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
      fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usuario: usuario, senha: senha })
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || 'Falha no login');
            return data;
          });
        })
        .then(function (data) {
          sessionStorage.setItem('site_admin_profile', JSON.stringify({
            nome: data.nome,
            perfil: data.perfil,
            usuario: data.usuario
          }));
          window.location.href = 'painel.html';
        })
        .catch(function (err) {
          mostrarErro(err.message || 'Usuário ou senha incorretos.');
        });
    });
  }
})();
