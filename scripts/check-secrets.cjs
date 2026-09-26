#!/usr/bin/env node
'use strict';

var childProcess = require('child_process');
var fs = require('fs');

var tracked = childProcess.execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
var forbiddenFiles = /(^|\/)(\.env|id_rsa|id_ed25519|.*\.(?:p12|pfx|pem|key))$/i;
var patterns = [
  { label: 'chave privada', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'token GitHub', regex: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { label: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'Stripe secret key', regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { label: 'SendGrid API key', regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ }
];
var failures = [];

tracked.forEach(function (file) {
  var normalized = file.replace(/\\/g, '/');
  if (forbiddenFiles.test(normalized) && !/\.example$/i.test(normalized)) {
    failures.push(normalized + ': arquivo sensível não deve ser versionado');
    return;
  }
  var stat;
  try { stat = fs.statSync(file); } catch (_error) { return; }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return;
  var content;
  try { content = fs.readFileSync(file, 'utf8'); } catch (_error2) { return; }
  patterns.forEach(function (pattern) {
    if (pattern.regex.test(content)) failures.push(normalized + ': possível ' + pattern.label);
  });
});

if (failures.length) {
  console.error('Verificação de segredos falhou:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Verificação de segredos aprovada em ' + tracked.length + ' arquivos versionados.');
