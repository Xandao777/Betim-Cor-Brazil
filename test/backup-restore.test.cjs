'use strict';

var backupRestore = require('../server/backup-restore.cjs');

function mergeDefaults(state) {
  return Object.assign({ events: [], members: [], admin_users: [], institutional: {} }, state);
}

describe('backup-restore', function () {
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
