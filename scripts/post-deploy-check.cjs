'use strict';

var base = String(process.env.SITE_PUBLIC_URL || process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//i.test(base)) {
  console.error('Uso: node scripts/post-deploy-check.cjs https://seu-dominio');
  process.exit(1);
}

var checks = [
  { path: '/api/health', json: true, validate: function (body) { return body.ok && body.database === 'ok'; } },
  { path: '/api/config', json: true, validate: function (body) { return Object.prototype.hasOwnProperty.call(body, 'turnstileSiteKey'); } },
  { path: '/api/public', json: true, validate: function (body) { return Array.isArray(body.events) && !!body.institutional; } },
  { path: '/', text: /<html/i },
  { path: '/contato.html', text: /form-contato/i },
  { path: '/admin/', text: /form-admin-login/i }
];

async function run() {
  var failed = 0;
  for (var i = 0; i < checks.length; i++) {
    var check = checks[i];
    try {
      var response = await fetch(base + check.path, {
        redirect: 'follow',
        signal: globalThis.AbortSignal.timeout(15000)
      });
      var ok = response.ok;
      if (check.json) {
        var body = await response.json();
        ok = ok && check.validate(body);
      } else {
        var text = await response.text();
        ok = ok && check.text.test(text);
      }
      console.log((ok ? '[OK] ' : '[FALHA] ') + check.path + ' HTTP ' + response.status);
      if (!ok) failed += 1;
    } catch (error) {
      failed += 1;
      console.error('[FALHA] ' + check.path + ' ' + error.message);
    }
  }
  if (failed) process.exit(1);
  console.log('Checklist pós-deploy aprovado em ' + base);
}

run();
