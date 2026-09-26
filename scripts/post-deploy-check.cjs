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
  var publicBody = null;
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
        if (check.path === '/api/public') publicBody = body;
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
  var advanced = [
    {
      label: 'headers de segurança',
      run: async function () {
        var response = await fetch(base + '/');
        return response.headers.get('x-content-type-options') === 'nosniff' &&
          !!response.headers.get('content-security-policy');
      }
    },
    {
      label: 'cache de assets',
      run: async function () {
        var response = await fetch(base + '/css/style.css');
        return response.ok && /max-age=86400/.test(response.headers.get('cache-control') || '');
      }
    },
    {
      label: 'sitemap absoluto',
      run: async function () {
        var response = await fetch(base + '/sitemap.xml');
        var xml = await response.text();
        return response.ok && xml.indexOf('<loc>' + base + '/') !== -1;
      }
    }
  ];
  if (publicBody && publicBody.events && publicBody.events[0]) {
    advanced.push({
      label: 'SEO de detalhe no servidor',
      run: async function () {
        var detail = '/evento.html?id=' + encodeURIComponent(publicBody.events[0].id);
        var response = await fetch(base + detail);
        var html = await response.text();
        return response.ok && /application\/ld\+json/.test(html) && /rel="canonical"/.test(html);
      }
    });
  }
  for (var j = 0; j < advanced.length; j++) {
    try {
      var advancedOk = await advanced[j].run();
      console.log((advancedOk ? '[OK] ' : '[FALHA] ') + advanced[j].label);
      if (!advancedOk) failed += 1;
    } catch (advancedError) {
      failed += 1;
      console.error('[FALHA] ' + advanced[j].label + ' ' + advancedError.message);
    }
  }
  if (failed) process.exit(1);
  console.log('Checklist pós-deploy aprovado em ' + base);
}

run();
