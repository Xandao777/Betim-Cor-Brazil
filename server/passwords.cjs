'use strict';

var bcrypt = require('bcryptjs');
var SALT_ROUNDS = 10;
var MIN_PASSWORD_LENGTH = 8;

function validationError(message) {
  var err = new Error(message);
  err.status = 400;
  return err;
}

function assertPasswordPolicy(plain) {
  var p = plain === undefined || plain === null ? '' : String(plain);
  if (p.length < MIN_PASSWORD_LENGTH) {
    throw validationError('A senha deve ter pelo menos ' + MIN_PASSWORD_LENGTH + ' caracteres.');
  }
  return p;
}

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
      delete o.resetTokenHash;
      delete o.resetExpires;
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
      assertPasswordPolicy(senhaIn);
      out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
      return out;
    }
    if (senhaIn === undefined || senhaIn === null || String(senhaIn).trim() === '') {
      out.senha = prev.senha;
      return out;
    }
    assertPasswordPolicy(senhaIn);
    out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
    return out;
  });
}

function mergeAdminUsersSave(state, incoming) {
  var prevList = state.admin_users || [];
  if (!Array.isArray(incoming)) throw validationError('Payload invalido');
  var seen = {};
  incoming = incoming.map(function (u) {
    var out = Object.assign({}, u);
    out.usuario = String(out.usuario || '').trim();
    out.nome = String(out.nome || '').trim();
    out.perfil = out.perfil === 'admin' ? 'admin' : 'editor';
    if (!out.usuario || !out.nome) {
      throw validationError('Utilizador e nome sao obrigatorios');
    }
    var userKey = out.usuario.toLowerCase();
    if (seen[userKey]) throw validationError('Ja existe utilizador com este login');
    seen[userKey] = true;
    return out;
  });
  var adminCount = incoming.filter(function (u) {
    return (u.perfil || 'editor') === 'admin';
  }).length;
  if (adminCount < 1) throw validationError('Mantenha pelo menos um utilizador com perfil admin');
  return incoming.map(function (u) {
    var prev = prevList.find(function (x) { return String(x.id) === String(u.id); });
    var senhaIn = u.senha;
    var out = Object.assign({}, u);
    if (!prev) {
      if (!senhaIn || String(senhaIn).trim() === '') {
        throw new Error('Senha obrigatória para novo usuário admin');
      }
      assertPasswordPolicy(senhaIn);
      out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
      return out;
    }
    if (senhaIn === undefined || senhaIn === null || String(senhaIn).trim() === '') {
      out.senha = prev.senha;
      return out;
    }
    assertPasswordPolicy(senhaIn);
    out.senha = isBcryptHash(senhaIn) ? senhaIn : hashPassword(senhaIn);
    return out;
  });
}

module.exports = {
  MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH,
  assertPasswordPolicy: assertPasswordPolicy,
  isBcryptHash: isBcryptHash,
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  hashPasswordsInArray: hashPasswordsInArray,
  stripPasswordsFromState: stripPasswordsFromState,
  mergeMembersSave: mergeMembersSave,
  mergeAdminUsersSave: mergeAdminUsersSave
};
