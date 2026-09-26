'use strict';

var institutionalValidate = require('../server/institutional-validate.cjs');

describe('institutional-validate', function () {
  test('bloqueia javascript: em URL do banner', function () {
    var out = institutionalValidate.normalizeInstitutional({
      homepage: { imagemFundo: 'javascript:alert(1)' }
    });
    expect(out.homepage.imagemFundo).toBe('');
  });

  test('aceita caminho relativo do site', function () {
    var out = institutionalValidate.normalizeInstitutional({
      homepage: { btn1Url: 'index.html#nos' }
    });
    expect(out.homepage.btn1Url).toBe('index.html#nos');
  });

  test('redes sociais aceitam apenas HTTP(S) e e-mail inválido é removido', function () {
    var out = institutionalValidate.normalizeInstitutional({
      email: 'invalido',
      facebook: 'javascript:alert(1)',
      instagram: 'https://instagram.com/betimcor'
    });
    expect(out.email).toBe('');
    expect(out.facebook).toBe('');
    expect(out.instagram).toBe('https://instagram.com/betimcor');
  });

  test('isAssuntoPermitido valida lista configurada', function () {
    var inst = {
      contato: {
        assuntos: [{ value: 'duvida', label: 'Dúvida' }]
      }
    };
    expect(institutionalValidate.isAssuntoPermitido(inst, 'duvida')).toBe(true);
    expect(institutionalValidate.isAssuntoPermitido(inst, 'outro')).toBe(false);
  });
});
