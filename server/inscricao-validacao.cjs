'use strict';

function clampStr(v, max) {
  if (v === undefined || v === null) return '';
  var s = String(v).trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function findEvento(events, eventoId) {
  return (events || []).find(function (e) {
    return String(e.id) === String(eventoId);
  });
}

function countInscricoesPorEvento(list, eventoId) {
  return (list || []).filter(function (i) {
    return String(i.eventoId) === String(eventoId);
  }).length;
}

function validateEventoParaInscricao(state, eventoId) {
  if (!eventoId) {
    return { ok: false, status: 400, error: 'eventoId obrigatório' };
  }
  var ev = findEvento(state.events, eventoId);
  if (!ev) {
    return { ok: false, status: 404, error: 'Evento não encontrado.' };
  }
  if (ev.publicado === false) {
    return { ok: false, status: 400, error: 'Evento não disponível para inscrição.' };
  }
  if (ev.inscricoesAtivas === false) {
    return { ok: false, status: 400, error: 'Inscrições encerradas para este evento.' };
  }
  if (ev.data) {
    var hoje = new Date().toISOString().slice(0, 10);
    if (String(ev.data) < hoje) {
      return { ok: false, status: 400, error: 'Este evento já ocorreu.' };
    }
  }
  return { ok: true, evento: ev };
}

function assertVagasDisponiveis(ev, list, eventoId) {
  var vagas = parseInt(ev.vagas, 10);
  if (!isFinite(vagas) || vagas <= 0) return null;
  if (countInscricoesPorEvento(list, eventoId) >= vagas) {
    return { ok: false, status: 409, error: 'Não há vagas disponíveis para este evento.' };
  }
  return null;
}

function hasPrivacyConsent(b) {
  var c = b && b.consentimento;
  return c === true || c === 'true' || c === '1' || c === 'on';
}

function validateInscricaoPublica(state, body) {
  if (body && body.website) {
    return { ok: false, status: 400, error: 'Pedido inválido.' };
  }
  if (!hasPrivacyConsent(body)) {
    return { ok: false, status: 400, error: 'Aceite a política de privacidade para se inscrever.' };
  }
  var eventoId = body && body.eventoId;
  var evCheck = validateEventoParaInscricao(state, eventoId);
  if (!evCheck.ok) return evCheck;
  var ev = evCheck.evento;

  var nome = clampStr(body.nome, 200);
  var email = clampStr(body.email, 200);
  var telefone = clampStr(body.telefone, 40);
  if (!nome || !email) {
    return { ok: false, status: 400, error: 'Preencha nome e e-mail.' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'E-mail inválido.' };
  }

  var list = state.inscricoes || [];
  var emailNorm = normalizeEmail(email);
  var dup = list.some(function (i) {
    return String(i.eventoId) === String(eventoId) && normalizeEmail(i.email) === emailNorm;
  });
  if (dup) {
    return { ok: false, status: 409, error: 'Já existe inscrição com este e-mail neste evento.' };
  }

  var lotacao = assertVagasDisponiveis(ev, list, eventoId);
  if (lotacao) return lotacao;

  return {
    ok: true,
    evento: ev,
    nome: nome,
    email: email,
    telefone: telefone
  };
}

function validateInscricaoMembro(state, body, membroUsuario) {
  if (body && body.website) {
    return { ok: false, status: 400, error: 'Pedido inválido.' };
  }
  var eventoId = body && body.eventoId;
  var evCheck = validateEventoParaInscricao(state, eventoId);
  if (!evCheck.ok) return evCheck;
  var ev = evCheck.evento;

  var list = state.inscricoes || [];
  var jaInscrito = list.some(function (i) {
    return (
      String(i.eventoId) === String(eventoId) &&
      i.membroUsuario &&
      i.membroUsuario === membroUsuario
    );
  });
  if (jaInscrito) {
    return { ok: false, status: 409, error: 'Você já está inscrito neste evento.' };
  }

  var lotacao = assertVagasDisponiveis(ev, list, eventoId);
  if (lotacao) return lotacao;

  return { ok: true, evento: ev };
}

module.exports = {
  validateInscricaoPublica: validateInscricaoPublica,
  validateInscricaoMembro: validateInscricaoMembro
};
