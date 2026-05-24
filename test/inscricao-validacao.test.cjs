'use strict';

const insc = require('../server/inscricao-validacao.cjs');
const DEFAULTS = require('../server/site-defaults.cjs');

describe('inscricao-validacao', function () {
  var state;

  beforeEach(function () {
    state = {
      events: DEFAULTS.events,
      inscricoes: []
    };
  });

  test('rejeita evento inexistente', function () {
    var r = insc.validateInscricaoPublica(state, {
      eventoId: '999',
      nome: 'A',
      email: 'a@b.co'
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
  });

  test('rejeita inscrições encerradas', function () {
    var r = insc.validateInscricaoPublica(state, {
      eventoId: '3',
      nome: 'A',
      email: 'a@b.co'
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/encerradas/i);
  });

  test('rejeita quando vagas esgotadas', function () {
    state.inscricoes = [{ eventoId: '2', email: 'x@y.z', nome: 'X' }];
    var ev = state.events.find(function (e) {
      return e.id === '2';
    });
    ev.data = '2028-01-15';
    ev.vagas = 1;
    var r = insc.validateInscricaoPublica(state, {
      eventoId: '2',
      nome: 'B',
      email: 'b@y.z'
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(409);
  });
});
