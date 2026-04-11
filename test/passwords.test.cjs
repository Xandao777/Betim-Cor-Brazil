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

  test('hashPasswordsInArray hasheia apenas texto plano', function () {
    var plain = pwd.hashPassword('x');
    var arr = pwd.hashPasswordsInArray([
      { id: '1', senha: 'plain' },
      { id: '2', senha: plain }
    ]);
    expect(pwd.isBcryptHash(arr[0].senha)).toBe(true);
    expect(arr[1].senha).toBe(plain);
  });
});
