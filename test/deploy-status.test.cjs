'use strict';

var deployStatus = require('../server/deploy-status.cjs');

describe('deploy-status', function () {
  var oldVolume;

  beforeEach(function () {
    oldVolume = process.env.UPLOADS_USE_VOLUME;
  });

  afterEach(function () {
    if (oldVolume === undefined) delete process.env.UPLOADS_USE_VOLUME;
    else process.env.UPLOADS_USE_VOLUME = oldVolume;
  });

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
      facebook: 'https://facebook.com/x',
      homepage: { titulo: 'Betim Cor Brazil — Associação Cultural' }
    });
    expect(r.complete).toBe(true);
  });

  test('reconhece volume Railway como armazenamento persistente', function () {
    process.env.UPLOADS_USE_VOLUME = '1';
    var status = deployStatus.buildDeployStatus();
    expect(status.uploads).toBe('volume');
    expect(status.uploadsPersistent).toBe(true);
  });
});
