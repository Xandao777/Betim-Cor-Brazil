'use strict';

var fs = require('fs');
var path = require('path');
var backupRestore = require('../server/backup-restore.cjs');

var filename = process.argv[2];
if (!filename) {
  console.error('Uso: node scripts/verify-backup.cjs caminho-do-backup.json');
  process.exit(2);
}

try {
  var absolute = path.resolve(filename);
  var input = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  var result = backupRestore.verifyBackup(input);
  var collections = Object.keys(result.data).length;
  console.log('Backup válido: ' + path.basename(absolute));
  console.log('Integridade SHA-256: ' + (result.checksumVerified ? 'confirmada' : 'não disponível (backup legado)'));
  console.log('Coleções encontradas: ' + collections);
} catch (error) {
  console.error('Backup inválido: ' + error.message);
  process.exit(1);
}
