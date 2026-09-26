'use strict';

const audit = require('../server/audit-log.cjs');

describe('audit-log', function () {
  test('resume inclusão e remoção sem copiar dados pessoais', function () {
    var summary = audit.changeSummary([{ id: '1', nome: 'Pessoa A' }], [{ id: '2', nome: 'Pessoa B' }]);
    expect(summary).toEqual({ tipo: 'lista', antes: 1, depois: 1, adicionados: ['2'], removidos: ['1'] });
    expect(JSON.stringify(summary)).not.toContain('Pessoa');
  });

  test('lista campos alterados de um objeto', function () {
    var summary = audit.changeSummary({ titulo: 'A', contato: { email: 'a@x.test' } }, { titulo: 'B', contato: { email: 'a@x.test' } });
    expect(summary).toEqual({ tipo: 'objeto', camposAlterados: ['titulo'] });
  });
});
