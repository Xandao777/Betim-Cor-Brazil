'use strict';

var backupRestore = require('../server/backup-restore.cjs');

function mergeDefaults(state) {
  return Object.assign({ events: [], members: [], admin_users: [], institutional: {} }, state);
}

describe('backup-restore', function () {
  test('cria e verifica backup com checksum SHA-256', function () {
    var state = {
      events: [],
      institutional: { historia: 'Teste' },
      members: [],
      admin_users: [{ id: 'a1', usuario: 'admin', perfil: 'admin', senha: '$hash' }]
    };
    var backup = backupRestore.createBackup(state, function (value) {
      return JSON.parse(JSON.stringify(value));
    });
    expect(backup.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(backupRestore.verifyBackup(backup).checksumVerified).toBe(true);
  });

  test('rejeita backup alterado depois da exportação', function () {
    var state = {
      events: [],
      institutional: { historia: 'Original' },
      members: [],
      admin_users: []
    };
    var backup = backupRestore.createBackup(state, function (value) { return value; });
    backup.data.institutional.historia = 'Alterado';
    expect(function () { backupRestore.verifyBackup(backup); }).toThrow(/checksum inválido/i);
  });

  test('aceita formato legado e preserva hashes atuais', function () {
    var current = {
      members: [{ id: 'm1', usuario: 'membro', senha: '$hash-member' }],
      admin_users: [{ id: 'a1', usuario: 'admin', perfil: 'admin', senha: '$hash-admin' }]
    };
    var input = {
      events: [],
      institutional: { historia: 'Teste' },
      members: [{ id: 'm1', usuario: 'membro', senha: '' }],
      admin_users: [{ id: 'a1', usuario: 'admin', perfil: 'admin', senha: '' }]
    };
    var result = backupRestore.prepareRestore(
      input,
      current,
      ['events', 'institutional', 'members', 'admin_users'],
      mergeDefaults
    );
    expect(result.state.members[0].senha).toBe('$hash-member');
    expect(result.state.admin_users[0].senha).toBe('$hash-admin');
  });

  test('rejeita backup incompleto', function () {
    expect(function () {
      backupRestore.prepareRestore({}, { members: [], admin_users: [] }, [], mergeDefaults);
    }).toThrow(/incompleto/i);
  });
});
