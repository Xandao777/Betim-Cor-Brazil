#!/usr/bin/env node
'use strict';

/**
 * Verifica variáveis recomendadas para produção.
 * Uso: NODE_ENV=production node scripts/check-production-env.cjs
 *      ou: CHECK_PRODUCTION=1 node scripts/check-production-env.cjs
 */
require('dotenv').config();

var isProd =
  process.env.CHECK_PRODUCTION === '1' ||
  process.env.NODE_ENV === 'production' ||
  !!process.env.RAILWAY_ENVIRONMENT;

if (!isProd) {
  console.log('Ambiente não é produção — use CHECK_PRODUCTION=1 para forçar a verificação.');
  process.exit(0);
}

var required = [
  { key: 'DATABASE_URL', ok: !!(process.env.DATABASE_URL || '').trim() },
  {
    key: 'JWT_SECRET',
    ok:
      (process.env.JWT_SECRET || '').length >= 16 &&
      process.env.JWT_SECRET !== 'dev-jwt-secret-altere-em-producao'
  },
  { key: 'NODE_ENV', ok: process.env.NODE_ENV === 'production' }
];

var recommended = [
  { key: 'SITE_PUBLIC_URL', ok: !!(process.env.SITE_PUBLIC_URL || '').trim() },
  {
    key: 'SMTP (HOST+USER+PASS)',
    ok:
      !!(process.env.SMTP_HOST || '').trim() &&
      !!(process.env.SMTP_USER || '').trim() &&
      !!process.env.SMTP_PASS
  },
  {
    key: 'Uploads S3 ou volume',
    ok:
      !!(process.env.S3_BUCKET || '').trim() ||
      process.env.UPLOADS_USE_VOLUME === '1'
  }
];

var warnings = [];
if (process.env.ALLOW_DEMO_SEED === '1') {
  warnings.push('ALLOW_DEMO_SEED=1 em produção — desative após criar contas reais.');
}
if (!(process.env.SMTP_NOTIFY_TO || '').trim()) {
  warnings.push('SMTP_NOTIFY_TO vazio — use e-mail institucional no painel como fallback.');
}

var failed = required.filter(function (r) {
  return !r.ok;
});
var missingRec = recommended.filter(function (r) {
  return !r.ok;
});

console.log('=== Verificação produção — Betim Cor Brazil ===\n');
required.forEach(function (r) {
  console.log((r.ok ? '[OK]' : '[FALTA]') + ' ' + r.key);
});
console.log('\nRecomendado:');
recommended.forEach(function (r) {
  console.log((r.ok ? '[OK]' : '[—]' ) + ' ' + r.key);
});
if (warnings.length) {
  console.log('\nAvisos:');
  warnings.forEach(function (w) {
    console.log('  ! ' + w);
  });
}

if (failed.length) {
  console.log('\nCorrija as variáveis obrigatórias antes do deploy.');
  process.exit(1);
}
if (missingRec.length) {
  console.log('\nAlgumas recomendações em falta — o site pode funcionar com limitações.');
  process.exit(2);
}
console.log('\nConfiguração mínima OK.');
process.exit(0);
