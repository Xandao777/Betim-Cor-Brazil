'use strict';

var deployStatus = require('../server/deploy-status.cjs');

describe('deploy-status', function () {
  test('institutionalChecklist detecta campos em falta', function () {
    var r = deployStatus.institutionalChecklist({
      email: 'contato@associacao.org.br',
      telefone: '(00) 0000-0000',
      pixChave: ''
    });
    expect(r.complete).toBe(false);
    expect(r.missingIds).toContain('email');
    expect(r.missingIds).toContain('pixChave');
  });

  test('institutionalChecklist ok com dados reais', function () {
    var r = deployStatus.institutionalChecklist({
      email: 'diretoria@betimcor.org',
      telefone: '(31) 3333-4444',
      pixChave: 'diretoria@betimcor.org',
      facebook: 'https://facebook.com/x'
    });
    expect(r.complete).toBe(true);
  });
});
