'use strict';

/**
 * Limites por IP (com trust proxy no Express em produção).
 * Variáveis opcionais: RATE_LIMIT_API_MAX, RATE_LIMIT_PUBLIC_GET_MAX,
 * RATE_LIMIT_LOGIN_MAX, RATE_LIMIT_LOGIN_WINDOW_MS, RATE_LIMIT_INSCRICAO_PUBLICA_MAX.
 */
const rateLimit = require('express-rate-limit');

function intEnv(name, def) {
  var v = process.env[name];
  if (v === undefined || v === '') return def;
  var n = parseInt(v, 10);
  return isNaN(n) || n < 1 ? def : n;
}

function json429(msg) {
  return function (req, res) {
    res.status(429).json({ error: msg });
  };
}

function createLimiters() {
  var apiGlobal = rateLimit({
    windowMs: 60 * 1000,
    max: intEnv('RATE_LIMIT_API_MAX', 300),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Demasiados pedidos. Tente daqui a pouco.')
  });

  var publicGet = rateLimit({
    windowMs: 60 * 1000,
    max: intEnv('RATE_LIMIT_PUBLIC_GET_MAX', 120),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Demasiados pedidos a dados públicos. Tente daqui a pouco.')
  });

  var login = rateLimit({
    windowMs: intEnv('RATE_LIMIT_LOGIN_WINDOW_MS', 15 * 60 * 1000),
    max: intEnv('RATE_LIMIT_LOGIN_MAX', 10),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: json429('Demasiadas tentativas de login. Aguarde alguns minutos.')
  });

  var inscricaoPublica = rateLimit({
    windowMs: 60 * 1000,
    max: intEnv('RATE_LIMIT_INSCRICAO_PUBLICA_MAX', 25),
    standardHeaders: true,
    legacyHeaders: false,
    handler: json429('Demasiadas inscrições a partir deste endereço. Tente mais tarde.')
  });

  return {
    apiGlobal: apiGlobal,
    publicGet: publicGet,
    login: login,
    inscricaoPublica: inscricaoPublica
  };
}

module.exports = { createLimiters };
