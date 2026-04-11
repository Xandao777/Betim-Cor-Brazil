'use strict';

/**
 * Executado antes de carregar os ficheiros de teste — define env antes de require('server.cjs').
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const worker = process.env.JEST_WORKER_ID || '0';
const tmp = path.join(os.tmpdir(), 'betim-site-test-w' + worker + '.json');

process.env.JWT_SECRET = 'jest-jwt-secret-fixture-do-not-use-in-production';
process.env.SITE_DATA_FILE = tmp;
delete process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';

process.env.RATE_LIMIT_API_MAX = '999999';
process.env.RATE_LIMIT_PUBLIC_GET_MAX = '999999';
process.env.RATE_LIMIT_LOGIN_MAX = '999999';
process.env.RATE_LIMIT_LOGIN_WINDOW_MS = '60000';
process.env.RATE_LIMIT_INSCRICAO_PUBLICA_MAX = '999999';

try {
  fs.unlinkSync(tmp);
} catch (e) {
  /* ficheiro ainda não existia */
}
