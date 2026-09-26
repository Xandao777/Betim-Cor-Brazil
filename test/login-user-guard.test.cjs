'use strict';

var EventEmitter = require('events');
var createGuard = require('../server/login-user-guard.cjs').createLoginUserGuard;

function attempt(guard, username, status) {
  return new Promise(function (resolve) {
    var req = { body: { usuario: username }, path: '/auth/admin' };
    var res = new EventEmitter();
    res.statusCode = status;
    res.headers = {};
    res.setHeader = function (name, value) { res.headers[name] = value; };
    res.status = function (code) { res.statusCode = code; return res; };
    res.json = function (body) { resolve({ blocked: true, status: res.statusCode, body: body }); };
    guard(req, res, function () {
      res.emit('finish');
      resolve({ blocked: false, status: status });
    });
  });
}

describe('login-user-guard', function () {
  test('bloqueia tentativas distribuídas contra o mesmo utilizador', async function () {
    var guard = createGuard({ max: 2, windowMs: 60000 });
    expect((await attempt(guard, 'Alvo', 401)).blocked).toBe(false);
    expect((await attempt(guard, 'alvo', 401)).blocked).toBe(false);
    var blocked = await attempt(guard, 'ALVO', 401);
    expect(blocked.status).toBe(429);
  });

  test('login bem-sucedido limpa as falhas anteriores', async function () {
    var guard = createGuard({ max: 2, windowMs: 60000 });
    await attempt(guard, 'pessoa', 401);
    await attempt(guard, 'pessoa', 200);
    expect((await attempt(guard, 'pessoa', 401)).blocked).toBe(false);
    expect((await attempt(guard, 'pessoa', 401)).blocked).toBe(false);
  });
});
