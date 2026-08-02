/**
 * Formulário público de filiação (filiacao.html).
 */
(function () {
  'use strict';

  function toastOk(msg) {
    if (window.SiteToast) window.SiteToast.success(msg);
    else alert(msg);
  }
  function toastErr(msg) {
    if (window.SiteToast) window.SiteToast.error(msg);
    else alert(msg);
  }

  function turnstileReady() {
    if (window.TurnstileForms && window.TurnstileForms.ready) return window.TurnstileForms.ready;
    return Promise.resolve();
  }
  function appendTurnstile(payload) {
    if (window.TurnstileForms && window.TurnstileForms.appendToken) {
      return window.TurnstileForms.appendToken(payload);
    }
    return Promise.resolve(payload);
  }

  var form = document.getElementById('form-filiacao');
  if (!form) return;

  var chkVoluntario = document.getElementById('filiacao-voluntario');
  var grupoArea = document.getElementById('grupo-area-profissional');
  var inputArea = document.getElementById('filiacao-area');

  function toggleAreaProfissional() {
    var show = chkVoluntario && chkVoluntario.checked;
    if (grupoArea) grupoArea.style.display = show ? 'block' : 'none';
    if (inputArea) {
      inputArea.required = !!show;
      if (!show) inputArea.value = '';
    }
  }
  if (chkVoluntario) chkVoluntario.addEventListener('change', toggleAreaProfissional);
  toggleAreaProfissional();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var consent = document.getElementById('consent-filiacao');
    if (consent && !consent.checked) {
      toastErr('Aceite a política de privacidade.');
      return;
    }

    var militante = document.getElementById('filiacao-militante');
    var apoio = document.getElementById('filiacao-apoio');
    if (
      !(militante && militante.checked) &&
      !(chkVoluntario && chkVoluntario.checked) &&
      !(apoio && apoio.checked)
    ) {
      toastErr('Selecione ao menos uma forma de participação.');
      return;
    }
    if (chkVoluntario && chkVoluntario.checked && inputArea && !inputArea.value.trim()) {
      toastErr('Informe sua área profissional.');
      return;
    }

    var historico = document.getElementById('filiacao-historico');
    if (historico && historico.value.trim().length < 20) {
      toastErr('Conte um pouco sobre você (mínimo 20 caracteres).');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    var hp = document.getElementById('website-filiacao');

    turnstileReady()
      .then(function () {
        return appendTurnstile({
          nomeCompleto: document.getElementById('filiacao-nome').value,
          email: document.getElementById('filiacao-email').value,
          whatsapp: document.getElementById('filiacao-whatsapp').value,
          dataNascimento: document.getElementById('filiacao-nascimento').value,
          bairroCidade: document.getElementById('filiacao-cidade').value,
          interesseMilitante: !!(militante && militante.checked),
          interesseVoluntario: !!(chkVoluntario && chkVoluntario.checked),
          interesseApoio: !!(apoio && apoio.checked),
          areaProfissional: inputArea ? inputArea.value : '',
          historico: historico ? historico.value : '',
          consentimento: true,
          website: hp ? hp.value : ''
        });
      })
      .then(function (payload) {
        return fetch('/api/form/filiacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
      })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || 'Falha ao enviar');
          return data;
        });
      })
      .then(function () {
        toastOk('Ficha enviada com sucesso! Entraremos em contato em breve.');
        form.reset();
        toggleAreaProfissional();
        if (window.TurnstileForms) window.TurnstileForms.reset();
      })
      .catch(function (err) {
        toastErr(err.message || 'Não foi possível enviar. Tente novamente.');
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
