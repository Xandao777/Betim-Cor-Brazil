'use strict';

var pgStore = require('../server/pg-store.cjs');

describe('pg-store seed', function () {
  test('grava array vazio quando uma chave não existe nos defaults', async function () {
    var calls = [];
    var client = {
      query: jest.fn(async function (sql, params) {
        calls.push({ sql: sql, params: params });
        return { rows: [] };
      }),
      release: jest.fn()
    };
    var pool = { connect: jest.fn(async function () { return client; }) };

    await pgStore.seed(pool, ['admin_audit_log'], {});

    var insert = calls.find(function (call) {
      return call.sql.indexOf('INSERT INTO app_state') !== -1;
    });
    expect(insert.params).toEqual(['admin_audit_log', '[]']);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
