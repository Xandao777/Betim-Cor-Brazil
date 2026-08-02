'use strict';

function clampStr(v, max) {
  if (v === undefined || v === null) return '';
  var s = String(v).trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function whatsappDigits(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (digits.charAt(0) === '0') digits = digits.slice(1);
  if (digits.length >= 10 && digits.length <= 11 && digits.indexOf('55') !== 0) {
    digits = '55' + digits;
  }
  return digits;
}

function whatsappWaLink(phone) {
  var d = whatsappDigits(phone);
  return d.length >= 12 ? 'https://wa.me/' + d : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDateYmd(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var d = new Date(s + 'T12:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function formatInteressesLabels(item) {
  var i = (item && item.interesses) || {};
  var parts = [];
  if (i.militante) parts.push('Militante/membro ativo');
  if (i.voluntarioProfissional) {
    var label = 'Voluntário na área profissional';
    if (item.areaProfissional) label += ' (' + item.areaProfissional + ')';
    parts.push(label);
  }
  if (i.apoioNoticias) parts.push('Apoio e notícias');
  return parts.join(' · ') || '—';
}

/**
 * Valida corpo do formulário de filiação.
 * @param {object} b
 * @param {function} clampFn
 */
function parseFiliacaoBody(b, clampFn) {
  var clamp = clampFn || clampStr;
  var nomeCompleto = clamp(b.nomeCompleto || b.nome, 200);
  var email = clamp(b.email, 200);
  var whatsapp = clamp(b.whatsapp, 30);
  var dataNascimento = clamp(b.dataNascimento, 10);
  var bairroCidade = clamp(b.bairroCidade, 200);
  var historico = clamp(b.historico, 8000);

  var militante = !!(b.interesseMilitante || b.militante);
  var voluntarioProfissional = !!(b.interesseVoluntario || b.voluntarioProfissional);
  var apoioNoticias = !!(b.interesseApoio || b.apoioNoticias);
  var areaProfissional = clamp(b.areaProfissional, 120);

  if (!nomeCompleto) return { ok: false, error: 'Informe o nome completo.' };
  if (!email || !isValidEmail(email)) return { ok: false, error: 'Informe um e-mail válido.' };
  if (whatsappDigits(whatsapp).length < 10) return { ok: false, error: 'Informe um WhatsApp válido com DDD.' };
  if (!isValidDateYmd(dataNascimento)) return { ok: false, error: 'Informe a data de nascimento.' };
  if (!bairroCidade) return { ok: false, error: 'Informe bairro e cidade.' };
  if (!militante && !voluntarioProfissional && !apoioNoticias) {
    return { ok: false, error: 'Selecione ao menos uma forma de participação.' };
  }
  if (voluntarioProfissional && !areaProfissional) {
    return { ok: false, error: 'Informe sua área profissional.' };
  }
  if (!historico || historico.length < 20) {
    return { ok: false, error: 'Conte um pouco sobre você (mínimo 20 caracteres).' };
  }

  return {
    ok: true,
    item: {
      nomeCompleto: nomeCompleto,
      email: email,
      whatsapp: whatsapp,
      whatsappLink: whatsappWaLink(whatsapp),
      dataNascimento: dataNascimento,
      bairroCidade: bairroCidade,
      interesses: {
        militante: militante,
        voluntarioProfissional: voluntarioProfissional,
        apoioNoticias: apoioNoticias
      },
      areaProfissional: voluntarioProfissional ? areaProfissional : '',
      historico: historico
    }
  };
}

module.exports = {
  parseFiliacaoBody: parseFiliacaoBody,
  whatsappWaLink: whatsappWaLink,
  whatsappDigits: whatsappDigits,
  formatInteressesLabels: formatInteressesLabels
};
