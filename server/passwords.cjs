'use strict';

var bcrypt = require('bcryptjs');
var SALT_ROUNDS = 10;

function isBcryptHash(s) {
  return typeof s === 'string' && /^\$2[aby]\$/.test(s);
}

function hashPassword(plain) {
  if (plain === undefined || plain === null) return '';
  return bcrypt.hashSync(String(plain), SALT_ROUNDS);
}

/** Aceita hash bcrypt ou legado em texto plano (migração). */
function verifyPassword(plain, stored) {
  if (plain === undefined || plain === null || stored === undefined || stored === null) return false;
  var p = String(plain);
  var st = String(stored);
  if (isBcryptHash(st)) {
    return bcrypt.compareSync(p, st);
  }
  return p === st;
}

function hashPasswordsInArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(function (u) {
    var o = Object.assign({}, u);
    if (o.senha !== undefined && o.senha !== null && o.senha !== '' && !isBcryptHash(o.senha)) {
      o.senha = hashPassword(o.senha);
    }
    return o;
  });
}

/**
 * Resposta ao painel: nunca envia hash ao navegador.
 */
function stripPasswordsFromState(state) {
  var s = JSON.parse(JSON.stringify(state));
  if (Array.isArray(s.members)) {
    s.members = s.members.map(function (m) {
      var o = Object.assign({}, m);
      o.senha = '';
      return o;
    });
  }
  if (Array.isArray(s.admin_users)) {
    s.admin_users = s.admin_users.map(function (u) {
      var o = Object.assign({}, u);
      o.senha = '';
      return o;
    });
  }
  return s;
}

function mergeMembersSave(state, incoming) {
  var prevList = state.members || [];
  if (!Array.isArray(incoming)) throw new Error('Payload inválido');
  return incoming.map(function (m) {
    var prev = prevList.find(function (x) { return String(x.id) === String(m.id); });
    var senhaIn = m.senha;
    var out = Object.assign({}, m);
    if (!prev) {
      if (!senhaIn || String(senhaIn).trim() === '') {
        throw new Error('Senha obrigatória para novo membro');
      }
      out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
      return out;
    }
    if (senhaIn === undefined || senhaIn === null || String(senhaIn).trim() === '') {
      out.senha = prev.senha;
      return out;
    }
    out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
    return out;
  });
}

function mergeAdminUsersSave(state, incoming) {
  var prevList = state.admin_users || [];
  if (!Array.isArray(incoming)) throw new Error('Payload inválido');
  return incoming.map(function (u) {
    var prev = prevList.find(function (x) { return String(x.id) === String(u.id); });
    var senhaIn = u.senha;
    var out = Object.assign({}, u);
    if (!prev) {
      if (!senhaIn || String(senhaIn).trim() === '') {
        throw new Error('Senha obrigatória para novo usuário admin');
      }
      out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
      return out;
    }
    if (senhaIn === undefined || senhaIn === null || String(senhaIn).trim() === '') {
      out.senha = prev.senha;
      return out;
    }
    out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
    return out;
  });
}

module.exports = {
  isBcryptHash: isBcryptHash,
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  hashPasswordsInArray: hashPasswordsInArray,
  stripPasswordsFromState: stripPasswordsFromState,
  mergeMembersSave: mergeMembersSave,
  mergeAdminUsersSave: mergeAdminUsersSave
};
