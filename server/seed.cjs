'use strict';

/**
 * Seed inicial: utilizadores demo só quando ALLOW_DEMO_SEED=1 ou ambiente de desenvolvimento.
 */
function allowDemoSeed() {
  if (process.env.ALLOW_DEMO_SEED === '1') return true;
  if (process.env.ALLOW_DEMO_SEED === '0') return false;
  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) return false;
  return true;
}

function getSeedDefaults(DEFAULTS) {
  if (allowDemoSeed()) return DEFAULTS;
  var copy = JSON.parse(JSON.stringify(DEFAULTS));
  copy.admin_users = [];
  copy.members = [];
  return copy;
}

function assertProductionConfig() {
  var isProd = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
  if (!isProd) return;
  var secret = process.env.JWT_SECRET || '';
  if (!secret || secret.length < 16 || secret === 'dev-jwt-secret-altere-em-producao') {
    console.error(
      '[startup] Produção: defina JWT_SECRET nas variáveis (string longa aleatória, mín. 16 caracteres).'
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('[startup] Produção: defina DATABASE_URL (PostgreSQL no Railway).');
    process.exit(1);
  }
}

module.exports = {
  allowDemoSeed: allowDemoSeed,
  getSeedDefaults: getSeedDefaults,
  assertProductionConfig: assertProductionConfig
};
