'use strict';

var seed = require('./seed.cjs');
var turnstile = require('./turnstile.cjs');
var s3Storage = require('./s3-storage.cjs');

var DEMO_ADMIN_USERS = ['admin', 'editor'];

function envFlag(name) {
  return process.env[name] === '1' || process.env[name] === 'true';
}

function smtpConfigured() {
  return !!(
    (process.env.SMTP_HOST || '').trim() &&
    (process.env.SMTP_USER || '').trim() &&
    process.env.SMTP_PASS
  );
}

function institutionalChecklist(inst) {
  inst = inst || {};
  var items = [
    {
      id: 'email',
      label: 'E-mail de contacto',
      ok: !!(inst.email || '').trim() && !/associacao\.org/i.test(String(inst.email))
    },
    {
      id: 'telefone',
      label: 'Telefone',
      ok: !!(inst.telefone || '').trim() && !/\(00\)\s*0000/i.test(String(inst.telefone))
    },
    {
      id: 'pixChave',
      label: 'Chave PIX',
      ok: !!(inst.pixChave || '').trim()
    },
    {
      id: 'redes',
      label: 'Pelo menos uma rede social',
      ok: !!(
        (inst.facebook || '').trim() ||
        (inst.instagram || '').trim() ||
        (inst.youtube || '').trim()
      )
    }
  ];
  var missing = items.filter(function (i) {
    return !i.ok;
  });
  return {
    complete: missing.length === 0,
    items: items,
    missingIds: missing.map(function (m) {
      return m.id;
    })
  };
}

function hasDemoAdminUsers(adminUsers) {
  return (adminUsers || []).some(function (u) {
    return DEMO_ADMIN_USERS.indexOf(u.usuario) !== -1;
  });
}

/**
 * Estado de deploy para admin/health (sem segredos).
 * @param {object} [state] — estado completo (opcional, para checklist institucional)
 */
function buildDeployStatus(state) {
  var isProd = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  var uploadsMode = s3Storage.isConfigured() ? 's3' : 'disk';
  var status = {
    production: isProd,
    backend: process.env.DATABASE_URL ? 'postgres' : 'file',
    siteUrl: (process.env.SITE_PUBLIC_URL || '').trim() || null,
    smtp: smtpConfigured(),
    smtpAutoReply: {
      contato: envFlag('SMTP_AUTO_REPLY_CONTATO'),
      doacao: envFlag('SMTP_AUTO_REPLY_DOACAO'),
      inscricao: envFlag('SMTP_AUTO_REPLY_INSCRICAO')
    },
    turnstile: turnstile.isEnabled(),
    turnstileSiteKey: !!turnstile.siteKey(),
    uploads: uploadsMode,
    uploadsPersistent: uploadsMode === 's3',
    demoSeedAllowed: seed.allowDemoSeed(),
    warnings: []
  };

  if (isProd && !status.siteUrl) {
    status.warnings.push('Defina SITE_PUBLIC_URL no Railway (links em e-mails de membros).');
  }
  if (isProd && !status.smtp) {
    status.warnings.push('SMTP não configurado: formulários gravam mas não enviam e-mail.');
  }
  if (isProd && uploadsMode === 'disk') {
    status.warnings.push(
      'Uploads no disco do contentor: monte volume /uploads no Railway ou configure S3/R2.'
    );
  }
  if (isProd && seed.allowDemoSeed()) {
    status.warnings.push('ALLOW_DEMO_SEED está ativo em produção — desative após criar contas reais.');
  }

  if (state) {
    status.institutional = institutionalChecklist(state.institutional);
    if (isProd && hasDemoAdminUsers(state.admin_users)) {
      status.warnings.push(
        'Existem utilizadores admin demo (admin/editor) — altere senhas ou remova contas de teste.'
      );
      status.demoAdminUsersPresent = true;
    } else {
      status.demoAdminUsersPresent = false;
    }
  }

  return status;
}

module.exports = {
  buildDeployStatus: buildDeployStatus,
  smtpConfigured: smtpConfigured,
  institutionalChecklist: institutionalChecklist
};
