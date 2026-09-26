'use strict';

/**
 * Complementa o limite por IP com um limite por utilizador. Assim, tentativas
 * distribuídas por vários endereços não conseguem atacar a mesma conta sem
 * encontrar o mesmo bloqueio.
 */
function intEnv(name, fallback) {
  var value = parseInt(process.env[name] || '', 10);
  return isNaN(value) || value < 1 ? fallback : value;
}

function createLoginUserGuard(options) {
  options = options || {};
  var max = options.max || intEnv('RATE_LIMIT_LOGIN_USER_MAX', 8);
  var windowMs = options.windowMs || intEnv('RATE_LIMIT_LOGIN_WINDOW_MS', 15 * 60 * 1000);
  var attempts = new Map();

  return function loginUserGuard(req, res, next) {
    var username = String((req.body && req.body.usuario) || '').trim().toLowerCase();
    if (!username) return next();
    var scope = req.path && req.path.indexOf('member') !== -1 ? 'member' : 'admin';
    var key = scope + ':' + username;
    var now = Date.now();
    var current = attempts.get(key);
    if (current && current.resetAt <= now) {
      attempts.delete(key);
      current = null;
    }
    if (current && current.count >= max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
      return res.status(429).json({
        error: 'Muitas tentativas para este utilizador. Aguarde alguns minutos.'
      });
    }

    res.once('finish', function () {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        attempts.delete(key);
        return;
      }
      if (res.statusCode !== 401) return;
      var item = attempts.get(key);
      if (!item || item.resetAt <= Date.now()) {
        attempts.set(key, { count: 1, resetAt: Date.now() + windowMs });
      } else {
        item.count += 1;
      }
    });
    next();
  };
}

module.exports = { createLoginUserGuard: createLoginUserGuard };
