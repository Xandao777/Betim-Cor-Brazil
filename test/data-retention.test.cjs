'use strict';

var retention = require('../public/admin/js/data-retention.js');

describe('retenção de dados pessoais', function () {
  var now = new Date('2026-09-26T12:00:00.000Z');

  test('remove somente registros lidos anteriores ao prazo', function () {
    var result = retention.purgeReadOlderThan({
      contato: [
        { id: 'antigo-lido', lida: true, criadoEm: '2026-01-01T00:00:00.000Z' },
        { id: 'antigo-pendente', lida: false, criadoEm: '2026-01-01T00:00:00.000Z' },
        { id: 'recente-lido', lida: true, criadoEm: '2026-09-01T00:00:00.000Z' }
      ]
    }, 90, now);
    expect(result.totalRemoved).toBe(1);
    expect(result.collections.contato.map(function (item) { return item.id; })).toEqual([
      'antigo-pendente', 'recente-lido'
    ]);
  });

  test('preserva registros com data ausente ou inválida', function () {
    var result = retention.purgeReadOlderThan({ contato: [
      { id: 'sem-data', lida: true },
      { id: 'data-invalida', lida: true, criadoEm: 'ontem' }
    ] }, 90, now);
    expect(result.totalRemoved).toBe(0);
    expect(result.collections.contato).toHaveLength(2);
  });

  test('rejeita prazo inválido', function () {
    expect(function () { retention.purgeReadOlderThan({}, 0, now); }).toThrow(/inválido/i);
  });
});
