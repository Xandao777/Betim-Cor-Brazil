'use strict';

const fil = require('../server/filiacao-validacao.cjs');

describe('filiacao-validacao', function () {
  var base = {
    nomeCompleto: 'Maria Silva',
    email: 'maria@exemplo.org',
    whatsapp: '(31) 99999-1234',
    dataNascimento: '1990-05-15',
    bairroCidade: 'Centro, Betim',
    interesseMilitante: true,
    historico: 'Quero participar ativamente das reuniões e projetos da associação.'
  };

  test('aceita ficha válida', function () {
    var r = fil.parseFiliacaoBody(base);
    expect(r.ok).toBe(true);
    expect(r.item.nomeCompleto).toBe('Maria Silva');
    expect(r.item.whatsappLink).toMatch(/^https:\/\/wa\.me\/55/);
    expect(r.item.interesses.militante).toBe(true);
  });

  test('exige ao menos um interesse', function () {
    var r = fil.parseFiliacaoBody(
      Object.assign({}, base, {
        interesseMilitante: false,
        interesseVoluntario: false,
        interesseApoio: false
      })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/participação/i);
  });

  test('exige área profissional quando voluntário', function () {
    var r = fil.parseFiliacaoBody(
      Object.assign({}, base, {
        interesseMilitante: false,
        interesseVoluntario: true,
        areaProfissional: ''
      })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/área profissional/i);
  });

  test('whatsappWaLink formata número brasileiro', function () {
    expect(fil.whatsappWaLink('31999887766')).toBe('https://wa.me/5531999887766');
  });

  test('formatInteressesLabels', function () {
    var t = fil.formatInteressesLabels({
      interesses: { militante: true, voluntarioProfissional: true, apoioNoticias: false },
      areaProfissional: 'pedagogia'
    });
    expect(t).toMatch(/Militante/);
    expect(t).toMatch(/pedagogia/);
  });
});
