'use strict';

const pwd = require('../server/passwords.cjs');

describe('server/passwords.cjs', function () {
  test('hashPassword gera string bcrypt', function () {
    var h = pwd.hashPassword('segredo');
    expect(pwd.isBcryptHash(h)).toBe(true);
    expect(h.length).toBeGreaterThan(20);
  });

  test('verifyPassword aceita hash bcrypt', function () {
    var h = pwd.hashPassword('xpto');
    expect(pwd.verifyPassword('xpto', h)).toBe(true);
    expect(pwd.verifyPassword('errado', h)).toBe(false);
  });

  test('verifyPassword aceita legado em texto plano', function () {
    expect(pwd.verifyPassword('abc', 'abc')).toBe(true);
    expect(pwd.verifyPassword('abc', 'xyz')).toBe(false);
  });

  test('stripPasswordsFromState remove hashes da resposta', function () {
    var state = {
      members: [{ id: '1', usuario: 'a', senha: pwd.hashPassword('p') }],
      admin_users: [{ id: '1', usuario: 'adm', senha: '$2a$10$xxx' }],
      events: []
    };
    var s = pwd.stripPasswordsFromState(state);
    expect(s.members[0].senha).toBe('');
    expect(s.admin_users[0].senha).toBe('');
    expect(state.members[0].senha).not.toBe('');
  });

  test('mergeMembersSave mantém senha anterior quando vazia', function () {
    var prevHash = pwd.hashPassword('old');
    var state = {
      members: [{ id: '1', usuario: 'u', senha: prevHash, nome: 'N', ativo: true }]
    };
    var incoming = [{ id: '1', usuario: 'u', senha: '', nome: 'Novo', ativo: true }];
    var out = pwd.mergeMembersSave(state, incoming);
    expect(out[0].senha).toBe(prevHash);
  });

  test('mergeMembersSave exige senha para membro novo', function () {
    expect(function () {
      pwd.mergeMembersSave({ members: [] }, [{ id: '99', usuario: 'x', senha: '', nome: 'Y' }]);
    }).toThrow(/Senha obrigatória/);
  });

  test('mergeAdminUsersSave mantém senha quando vazia', function () {
    var h = pwd.hashPassword('adm');
    var state = { admin_users: [{ id: '1', usuario: 'a', senha: h, perfil: 'admin' }] };
    var out = pwd.mergeAdminUsersSave(state, [{ id: '1', usuario: 'a', senha: '', nome: 'A', perfil: 'admin' }]);
    expect(out[0].senha).toBe(h);
  });

  test('mergeAdminUsersSave exige pelo menos um admin', function () {
    var h = pwd.hashPassword('adm');
    var state = { admin_users: [{ id: '1', usuario: 'a', senha: h, nome: 'A', perfil: 'admin' }] };
    expect(function () {
      pwd.mergeAdminUsersSave(state, [{ id: '1', usuario: 'a', senha: '', nome: 'A', perfil: 'editor' }]);
    }).toThrow(/pelo menos um utilizador/);
  });

  test('mergeAdminUsersSave rejeita utilizador duplicado', function () {
    expect(function () {
      pwd.mergeAdminUsersSave(
        { admin_users: [] },
        [
          { id: '1', usuario: 'admin', senha: 'senha1234', nome: 'A', perfil: 'admin' },
          { id: '2', usuario: 'ADMIN', senha: 'senha5678', nome: 'B', perfil: 'editor' }
        ]
      );
    }).toThrow(/login/);
  });

  test('assertPasswordPolicy exige mínimo 8 caracteres', function () {
    expect(function () {
      pwd.assertPasswordPolicy('abc');
    }).toThrow(/8/);
    expect(pwd.assertPasswordPolicy('senha1234')).toBe('senha1234');
  });

  test('hashPasswordsInArray hasheia apenas texto plano', function () {
    var plain = pwd.hashPassword('x');
    var arr = pwd.hashPasswordsInArray([
      { id: '1', senha: 'plain' },
      { id: '2', senha: plain }
    ]);
    expect(pwd.isBcryptHash(arr[0].senha)).toBe(true);
    expect(arr[1].senha).toBe(plain);
  });

  test('mergeMembersSave incrementa versão ao desativar membro', function () {
    var hash = pwd.hashPassword('senha1234');
    var state = {
      members: [
        { id: '1', usuario: 'membro', senha: hash, nome: 'Membro', ativo: true, sessionVersion: 3 }
      ]
    };
    var out = pwd.mergeMembersSave(state, [
      { id: '1', usuario: 'membro', senha: '', nome: 'Membro', ativo: false, sessionVersion: 999 }
    ]);
    expect(out[0].sessionVersion).toBe(4);
    expect(out[0].senha).toBe(hash);
  });

  test('mergeAdminUsersSave incrementa versão ao alterar perfil', function () {
    var hash = pwd.hashPassword('senha1234');
    var state = {
      admin_users: [
        { id: '1', usuario: 'admin', senha: hash, nome: 'Admin', perfil: 'admin', sessionVersion: 2 },
        { id: '2', usuario: 'admin2', senha: hash, nome: 'Admin 2', perfil: 'admin', sessionVersion: 1 }
      ]
    };
    var out = pwd.mergeAdminUsersSave(state, [
      { id: '1', usuario: 'admin', senha: '', nome: 'Admin', perfil: 'editor', sessionVersion: 999 },
      { id: '2', usuario: 'admin2', senha: '', nome: 'Admin 2', perfil: 'admin', sessionVersion: 1 }
    ]);
    expect(out[0].sessionVersion).toBe(3);
    expect(out[1].sessionVersion).toBe(1);
  });
});
