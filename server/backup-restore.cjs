'use strict';

var crypto = require('crypto');

function validationError(message) {
  var error = new Error(message);
  error.status = 400;
  return error;
}

function backupData(input) {
  var data = input && input.data && typeof input.data === 'object' ? input.data : input;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw validationError('Backup inválido.');
  }
  if (!Array.isArray(data.events) || !Array.isArray(data.admin_users)) {
    throw validationError('Backup incompleto: eventos e utilizadores administrativos são obrigatórios.');
  }
  if (!data.institutional || typeof data.institutional !== 'object') {
    throw validationError('Backup incompleto: dados institucionais ausentes.');
  }
  return data;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + canonicalJson(value[key]);
    }).join(',') + '}';
  }
  return JSON.stringify(value);
}

function dataChecksum(data) {
  var jsonCompatible = JSON.parse(JSON.stringify(data));
  return crypto.createHash('sha256').update(canonicalJson(jsonCompatible), 'utf8').digest('hex');
}

function verifyBackup(input) {
  var data = backupData(input);
  if (input && input.format === 'betim-cor-backup') {
    if (input.version !== 1) throw validationError('Versão de backup não suportada.');
    if (input.checksum) {
      var expected = String(input.checksum).replace(/^sha256:/, '').toLowerCase();
      var actual = dataChecksum(data);
      if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actual) {
        throw validationError('Backup corrompido ou alterado: checksum inválido.');
      }
    }
  }
  return { data: data, checksumVerified: !!(input && input.checksum) };
}

function restorePasswords(current, incoming, kind) {
  var previous = Array.isArray(current) ? current : [];
  var skipped = 0;
  var restored = (Array.isArray(incoming) ? incoming : []).map(function (item) {
    var out = Object.assign({}, item || {});
    var existing = previous.find(function (candidate) {
      return (
        (out.id != null && String(candidate.id) === String(out.id)) ||
        (out.usuario && String(candidate.usuario).toLowerCase() === String(out.usuario).toLowerCase())
      );
    });
    if (!out.senha && existing && existing.senha) {
      out.senha = existing.senha;
      out.sessionVersion = existing.sessionVersion;
    }
    if (!out.senha) {
      skipped += 1;
      return null;
    }
    return out;
  }).filter(Boolean);

  if (kind === 'admin_users' && !restored.some(function (u) { return u.perfil === 'admin'; })) {
    throw validationError('A restauração precisa manter pelo menos um administrador com credenciais válidas.');
  }
  return { list: restored, skipped: skipped };
}

function prepareRestore(input, current, keys, mergeDefaults) {
  var verification = verifyBackup(input);
  var data = verification.data;
  var selected = {};
  keys.forEach(function (key) {
    if (data[key] !== undefined) selected[key] = data[key];
  });
  var state = mergeDefaults(selected);
  var admins = restorePasswords(current.admin_users, state.admin_users, 'admin_users');
  var members = restorePasswords(current.members, state.members, 'members');
  state.admin_users = admins.list;
  state.members = members.list;
  return {
    state: state,
    warnings: {
      adminUsersWithoutCredentials: admins.skipped,
      membersWithoutCredentials: members.skipped,
      checksumVerified: verification.checksumVerified
    }
  };
}

function createBackup(state, stripPasswords) {
  var data = stripPasswords(state);
  return {
    format: 'betim-cor-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    credentialsIncluded: false,
    checksum: 'sha256:' + dataChecksum(data),
    data: data
  };
}

module.exports = {
  createBackup: createBackup,
  prepareRestore: prepareRestore,
  verifyBackup: verifyBackup
};
